import { describe, expect, it } from 'vitest';
import type { AgentAdapter, AgentSession, Unsubscribe } from '@cockpit/adapter-contract';
import type { AgentStatus } from '@cockpit/shared';
import { AdapterRegistry } from './adapter-registry';
import { DaemonServer } from './daemon-server';
import { DaemonClient } from './daemon-client';

/**
 * Entrega de tarefa em sessão JÁ VIVA (Onda 1, item 1 do fundador) — pipe
 * REAL, adapter FAKE. O adapter é fake de propósito: os reais de IA não estão
 * instalados no CI e o `shell` é `process-only` (nunca reporta
 * `waiting-input`/`done` enquanto vivo), então não haveria como exercitar a
 * transição ocupado→ocioso que dispara a fila. O que importa aqui é o
 * contrato do daemon: quem recebe agora, quem espera, e o que o PTY vê.
 */

const uniquePipe = (): string =>
  `\\\\.\\pipe\\cockpit-delivery-test-${process.pid}-${Math.random().toString(36).slice(2)}`;

/** Sessão controlável: registra tudo que foi escrito e emite status sob demanda. */
class FakeSession implements AgentSession {
  readonly terminalId = 'fake';
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

class FakeAdapter implements AgentAdapter {
  readonly id = 'fake-ia';
  readonly displayName = 'Fake IA';
  readonly statusStrategy = 'native-hooks' as const;
  readonly sessions: FakeSession[] = [];

  async detectAvailability(): Promise<{ available: boolean }> {
    return { available: true };
  }
  async spawn(): Promise<AgentSession> {
    const session = new FakeSession();
    this.sessions.push(session);
    return session;
  }
}

async function bootDaemon(): Promise<{
  server: DaemonServer;
  client: DaemonClient;
  adapter: FakeAdapter;
  pipe: string;
}> {
  const adapter = new FakeAdapter();
  const registry = new AdapterRegistry();
  registry.register(adapter);
  const server = new DaemonServer(registry);
  const pipe = uniquePipe();
  await server.listen(pipe);
  const client = new DaemonClient();
  await client.connect(pipe);
  return { server, client, adapter, pipe };
}

describe('deliver-task no daemon (Onda 1 — tarefa em tile já aberto)', () => {
  it('alvo OCIOSO recebe na hora, com \\r (é o que dispensa o enter do fundador)', async () => {
    const { server, client, adapter } = await bootDaemon();
    await client.createSession({ tag: 's1', cols: 80, rows: 24, adapterId: 'fake-ia' });
    const session = adapter.sessions[0]!;
    session.emitStatus('waiting-input');

    const ack = await client.deliverTask('s1', 'Você é o agente "@qa". Tarefa: revisar');
    expect(ack.outcome).toBe('delivered');
    expect(ack.queued).toBe(0);
    expect(session.writes).toEqual(['Você é o agente "@qa". Tarefa: revisar\r']);

    client.disconnect();
    await server.shutdown();
  });

  it('alvo OCUPADO enfileira e a tarefa sai sozinha quando ele fica ocioso', async () => {
    const { server, client, adapter } = await bootDaemon();
    await client.createSession({ tag: 's1', cols: 80, rows: 24, adapterId: 'fake-ia' });
    const session = adapter.sessions[0]!;
    session.emitStatus('working');

    const ack = await client.deliverTask('s1', 'tarefa-1');
    expect(ack.outcome).toBe('queued');
    expect(ack.queued).toBe(1);
    expect(session.writes).toEqual([]); // nada foi forçado no meio do turno

    session.emitStatus('done');
    expect(session.writes).toEqual(['tarefa-1\r']);

    client.disconnect();
    await server.shutdown();
  });

  it('fila drena UMA por vez, no ritmo do agente (não empilha no prompt)', async () => {
    const { server, client, adapter } = await bootDaemon();
    await client.createSession({ tag: 's1', cols: 80, rows: 24, adapterId: 'fake-ia' });
    const session = adapter.sessions[0]!;
    session.emitStatus('working');

    expect((await client.deliverTask('s1', 'tarefa-1')).queued).toBe(1);
    expect((await client.deliverTask('s1', 'tarefa-2')).queued).toBe(2);

    session.emitStatus('waiting-input');
    expect(session.writes).toEqual(['tarefa-1\r']);

    session.emitStatus('working');
    session.emitStatus('waiting-input');
    expect(session.writes).toEqual(['tarefa-1\r', 'tarefa-2\r']);

    client.disconnect();
    await server.shutdown();
  });

  it('sessão inexistente é RECUSADA (a CLI vira exit 1, não fica esperando)', async () => {
    const { server, client } = await bootDaemon();
    const ack = await client.deliverTask('nao-existe', 'tarefa');
    expect(ack.outcome).toBe('refused');
    expect(ack.reason).toContain('não existe');

    client.disconnect();
    await server.shutdown();
  });

  it('alvo em ERRO é recusado — enfileirar ali seria prometer entrega que nunca ocorre', async () => {
    const { server, client, adapter } = await bootDaemon();
    await client.createSession({ tag: 's1', cols: 80, rows: 24, adapterId: 'fake-ia' });
    adapter.sessions[0]!.emitStatus('error');

    const ack = await client.deliverTask('s1', 'tarefa');
    expect(ack.outcome).toBe('refused');
    expect(adapter.sessions[0]!.writes).toEqual([]);

    client.disconnect();
    await server.shutdown();
  });

  it('queueIfBusy=false recusa em vez de enfileirar', async () => {
    const { server, client, adapter } = await bootDaemon();
    await client.createSession({ tag: 's1', cols: 80, rows: 24, adapterId: 'fake-ia' });
    adapter.sessions[0]!.emitStatus('working');

    const ack = await client.deliverTask('s1', 'tarefa', { queueIfBusy: false });
    expect(ack.outcome).toBe('refused');
    expect(ack.reason).toContain('fila foi desligada');

    client.disconnect();
    await server.shutdown();
  });

  it('a fila sobrevive à saída do cliente que entregou (a CLI é efêmera)', async () => {
    const { server, client, adapter, pipe } = await bootDaemon();
    await client.createSession({ tag: 's1', cols: 80, rows: 24, adapterId: 'fake-ia' });
    const session = adapter.sessions[0]!;
    session.emitStatus('working');

    // Cliente "CLI": entrega e MORRE logo em seguida, como o processo real.
    const cli = new DaemonClient();
    await cli.connect(pipe);
    expect((await cli.deliverTask('s1', 'tarefa-da-cli')).outcome).toBe('queued');
    cli.disconnect();

    session.emitStatus('done');
    expect(session.writes).toEqual(['tarefa-da-cli\r']);

    client.disconnect();
    await server.shutdown();
  });
});
