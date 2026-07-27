import { describe, expect, it } from 'vitest';
import type { AgentAdapter, AgentSession, Unsubscribe } from '@cockpit/adapter-contract';
import { IDLE_AGENT_STATUSES, isIdleAgentStatus, type AgentStatus } from '@cockpit/shared';
import { HOOK_STATUS_MAP } from '@cockpit/adapter-claude-code';
import { AdapterRegistry } from './adapter-registry';
import { DaemonServer } from './daemon-server';
import { DaemonClient } from './daemon-client';

/**
 * Contrato de "ocioso" entre adapter e daemon — reprodução DETERMINÍSTICA
 * (zero token, zero rede, milissegundos) do defeito que o smoke do Codex
 * encontra caro e devagar.
 *
 * O achado: `IDLE_AGENT_STATUSES` é `['waiting-input','done']` e exclui
 * `'idle'` de propósito (o comentário em `shared/src/ipc.ts` justifica: seria
 * "o estado do adapter antes do CLI ficar pronto"). Só que `'idle'` é
 * EXATAMENTE o status que os dois adapters de IA de verdade reportam quando
 * o turno TERMINA:
 *   - claude-code: hook `Stop` → 'idle' (`HOOK_STATUS_MAP`);
 *   - codex:       `notify` em agent-turn-complete → linha `idle`.
 * Nenhum dos dois emite 'waiting-input' ao devolver o turno, e 'done' só sai
 * no exit do processo — quando a sessão já morreu e não há mais onde entregar.
 *
 * Consequência: `deliver-task` num tile de IA vivo NUNCA vê o alvo como
 * ocioso; sempre enfileira, e `flushPendingTask` — que exige
 * `isIdleAgentStatus(lastStatus)` — nunca dispara. A tarefa fica na fila do
 * daemon até a sessão fechar.
 *
 * Por que este arquivo está fora da suíte padrão: ele afirma o comportamento
 * CORRETO, não o atual. Enquanto o defeito existir ele fica VERMELHO — de
 * propósito. Deixá-lo em `pnpm -w test` pintaria o CI de vermelho por um bug
 * conhecido; enterrá-lo num `expect(...).toBe(false)` maquiaria o defeito
 * como se fosse a especificação. Rode com:
 *
 *     pnpm --filter @cockpit/pty-host smoke
 */

const uniquePipe = (): string =>
  `\\\\.\\pipe\\cockpit-idle-contract-${process.pid}-${Math.random().toString(36).slice(2)}`;

/** Sessão que reporta os MESMOS status que os adapters reais reportam. */
class RealisticSession implements AgentSession {
  readonly terminalId = 'realistic';
  readonly pid = process.pid;
  readonly writes: string[] = [];
  private statusCb: ((status: AgentStatus, detail?: string) => void) | null = null;

  write(data: string): void {
    this.writes.push(data);
  }
  resize(): void {}
  async dispose(): Promise<void> {}
  onData(): Unsubscribe {
    return () => void 0;
  }
  onStatus(cb: (status: AgentStatus, detail?: string) => void): Unsubscribe {
    this.statusCb = cb;
    return () => void 0;
  }
  onExit(): Unsubscribe {
    return () => void 0;
  }
  emitStatus(status: AgentStatus): void {
    this.statusCb?.(status);
  }
}

class RealisticAdapter implements AgentAdapter {
  readonly id = 'ia-realista';
  readonly displayName = 'IA (status como os reais)';
  readonly statusStrategy = 'native-hooks' as const;
  readonly sessions: RealisticSession[] = [];

  async detectAvailability(): Promise<{ available: boolean }> {
    return { available: true };
  }
  async spawn(): Promise<AgentSession> {
    const session = new RealisticSession();
    this.sessions.push(session);
    return session;
  }
}

describe('contrato de "ocioso": o status de fim de turno dos CLIs reais é entregável?', () => {
  it("'idle' — o que claude-code e codex emitem ao TERMINAR o turno — conta como ocioso", () => {
    // Trava documental: se alguém trocar o mapa do hook, este teste avisa que
    // a premissa mudou antes de o caso abaixo virar falso-negativo.
    expect(HOOK_STATUS_MAP.Stop).toBe('idle');
    expect(
      isIdleAgentStatus('idle'),
      `IDLE_AGENT_STATUSES é [${IDLE_AGENT_STATUSES.join(', ')}] e não inclui 'idle', ` +
        'que é o status de fim de turno dos dois adapters de IA — nenhum tile vivo é entregável'
    ).toBe(true);
  });

  it("tile que terminou o turno ('idle') recebe a tarefa na hora, sem fila", async () => {
    const adapter = new RealisticAdapter();
    const registry = new AdapterRegistry();
    registry.register(adapter);
    const server = new DaemonServer(registry);
    const pipe = uniquePipe();
    await server.listen(pipe);
    const client = new DaemonClient();
    await client.connect(pipe);

    await client.createSession({ tag: 's1', cols: 80, rows: 24, adapterId: 'ia-realista' });
    const session = adapter.sessions[0]!;
    session.emitStatus('working'); // turno em curso
    session.emitStatus('idle'); // turno DEVOLVIDO — CLI parado no prompt

    const ack = await client.deliverTask('s1', 'nova tarefa do chefe');
    expect(ack.outcome, `ack: ${ack.reason}`).toBe('delivered');
    expect(session.writes).toHaveLength(1);

    client.disconnect();
    await server.shutdown();
  });

  it("fila enfileirada drena quando o alvo volta a 'idle'", async () => {
    const adapter = new RealisticAdapter();
    const registry = new AdapterRegistry();
    registry.register(adapter);
    const server = new DaemonServer(registry);
    const pipe = uniquePipe();
    await server.listen(pipe);
    const client = new DaemonClient();
    await client.connect(pipe);

    await client.createSession({ tag: 's1', cols: 80, rows: 24, adapterId: 'ia-realista' });
    const session = adapter.sessions[0]!;
    session.emitStatus('working');

    expect((await client.deliverTask('s1', 'tarefa-enfileirada')).outcome).toBe('queued');
    session.emitStatus('idle'); // fim do turno: é AQUI que a fila tem de sair
    expect(
      session.writes,
      'a tarefa ficou presa na fila: o daemon não reconhece a volta a idle como janela de entrega'
    ).toEqual(['tarefa-enfileirada\r']);

    client.disconnect();
    await server.shutdown();
  });
});
