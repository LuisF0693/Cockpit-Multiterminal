import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { isIdleAgentStatus, type AgentStatus } from '@cockpit/shared';
import { startDaemon } from './daemon-entry';
import { DaemonClient } from './daemon-client';

/**
 * SMOKE de entrega em tile Codex JÁ ABERTO (Onda 1, item 1 do fundador) —
 * daemon real, PTY real, `codex` real, rede real, tokens reais.
 *
 * ── Por que este arquivo existe ────────────────────────────────────────────
 * `task-delivery.integration.test.ts` prova o CONTRATO do daemon com adapter
 * FAKE: quem recebe agora, quem espera, que bytes o PTY vê. O que ele NÃO
 * consegue provar é a única coisa que o fundador pediu — que a instrução vire
 * um TURNO SUBMETIDO num CLI de IA de verdade. Adapter fake não tem TUI
 * nativo, não tem boot, não tem composer: `session.writes` conter `tarefa\r`
 * prova que o daemon escreveu, não que o agente recebeu. Foi exatamente essa
 * distância que escondeu o bug do `initialInstruction` até o fundador tropeçar
 * nele à mão.
 *
 * ── Por que NÃO está na suíte padrão ───────────────────────────────────────
 * Depende de `codex` no PATH, de login válido e de rede, e cada execução
 * QUEIMA TOKENS do fundador. `pnpm -w test` num runner limpo não pode nem
 * falhar nem cobrar por isso. Daí o sufixo `.smoke.ts`: fica FORA do `include`
 * padrão do vitest (que só pega `*.{test,spec}.*`) e roda só por pedido:
 *
 *     pnpm --filter @cockpit/pty-host smoke:codex
 *
 * Sem o binário no PATH os casos PULAM com mensagem clara, em vez de falhar.
 *
 * ── Custo ──────────────────────────────────────────────────────────────────
 * 2 turnos reais de Codex por execução hoje (o turno de boot de cada caso).
 * Os prompts são aritmética trivial de propósito: resposta curta, inequívoca,
 * e que NÃO aparece no enunciado — se o needle estivesse no prompt, o eco do
 * composer faria o teste passar sem o modelo ter respondido coisa alguma.
 */

const REPO_ROOT = fileURLToPath(new URL('../../..', import.meta.url));

/** Boot do Codex (config + MCP servers) + primeiro turno. Folga generosa. */
const FIRST_TURN_TIMEOUT_MS = 240_000;
/** Turno seguinte não paga o boot, mas o modelo pode pensar. Idem. */
const SECOND_TURN_TIMEOUT_MS = 180_000;

function codexOnPath(): boolean {
  try {
    execFileSync('where', ['codex'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const HAS_CODEX = codexOnPath();
if (!HAS_CODEX) {
  console.warn(
    '[smoke:codex] PULADO — `codex` não está no PATH. Este smoke exige o CLI instalado, ' +
      'autenticado e com rede (npm i -g @openai/codex). A suíte padrão (`pnpm -w test`) não depende dele.'
  );
}

const uniquePipe = (): string =>
  `\\\\.\\pipe\\cockpit-codex-smoke-${process.pid}-${Math.random().toString(36).slice(2)}`;

/**
 * O Codex é TUI de tela cheia: a saída vem encharcada de escapes de cursor,
 * OSC de título e spinner. Sem limpar, procurar o needle vira loteria — o
 * `12321` pode chegar picotado entre dois reposicionamentos de cursor.
 *
 * `no-control-regex` fica desligado aqui porque casar caractere de controle é
 * literalmente o trabalho desta função: ESC (0x1b) e BEL (0x07) são os
 * delimitadores das sequências que queremos remover.
 */
/* eslint-disable no-control-regex */
const stripAnsi = (s: string): string =>
  s
    .replace(/\u001b\][^\u0007\u001b]*(?:\u0007|\u001b\\)/g, '') // OSC (título da janela)
    .replace(/\u001b\[[0-9;?]*[ -/]*[@-~]/g, '') // CSI (cursor, cor, limpeza de tela)
    .replace(/\u001b[()][AB012]/g, '') // seleção de charset
    .replace(/\u001b[=>]/g, ''); // modo keypad
/* eslint-enable no-control-regex */

interface CodexTile {
  client: DaemonClient;
  id: string;
  /** Saída acumulada do PTY, já sem escapes. */
  screen: () => string;
  /** Último status que o DAEMON conhece — é ele que decide entregar ou enfileirar. */
  status: () => AgentStatus;
  waitFor: (needle: string, timeoutMs: number) => Promise<boolean>;
  dispose: () => Promise<void>;
}

/**
 * Sobe um tile Codex de verdade e só devolve depois que o PRIMEIRO turno foi
 * respondido — esse é o estado que o fundador chama de "tile já aberto e
 * ocioso": CLI bootado, MCP servers no ar, composer vazio, esperando ordem.
 * Condição DIFERENTE do boot, que é justamente a hipótese sob julgamento.
 */
async function openIdleCodexTile(firstNeedle: string, firstPrompt: string): Promise<CodexTile> {
  const pipe = uniquePipe();
  const server = await startDaemon(pipe);
  const client = new DaemonClient();
  await client.connect(pipe);

  let lastStatus: AgentStatus = 'working'; // mesmo seed que o daemon usa no create
  client.onSessionStatus((_id, status) => {
    lastStatus = status as AgentStatus;
  });

  let raw = '';
  const screen = (): string => stripAnsi(raw);
  const { id } = await client.createSession({
    tag: 'codex-smoke',
    cols: 120,
    rows: 40,
    adapterId: 'codex',
    cwd: REPO_ROOT,
    // read-only + never: o smoke não pode ser interrompido por prompt de
    // aprovação nem escrever no repo do fundador.
    args: ['-s', 'read-only', '-a', 'never'],
    initialInstruction: firstPrompt
  });
  client.onData(id, (bytes) => {
    raw += Buffer.from(bytes).toString('utf8');
  });

  const waitFor = async (needle: string, timeoutMs: number): Promise<boolean> => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (screen().includes(needle)) return true;
      await new Promise((r) => setTimeout(r, 250));
    }
    return false;
  };

  const bootOk = await waitFor(firstNeedle, FIRST_TURN_TIMEOUT_MS);
  expect(bootOk, `Codex não respondeu ao turno de boot (needle ${firstNeedle}). Tela:\n${screen().slice(-2000)}`).toBe(
    true
  );
  // Folga para o adapter drenar o notify e o status assentar antes de medirmos.
  await new Promise((r) => setTimeout(r, 8_000));

  return {
    client,
    id,
    screen,
    status: () => lastStatus,
    waitFor,
    dispose: async () => {
      await client.closeSession(id).catch(() => void 0);
      await server.shutdown();
      client.disconnect();
    }
  };
}

describe.skipIf(!HAS_CODEX)('deliver-task num tile Codex REAL já aberto (Onda 1 — risco central)', () => {
  it('o alvo ocioso é reconhecido como entregável e o turno entregue é SUBMETIDO', { timeout: 600_000 }, async () => {
    const tile = await openIdleCodexTile('12321', 'Escreva apenas o resultado de 111 vezes 111, sem mais nada.');
    try {
      // (1) O daemon precisa ENXERGAR o tile como ocioso. Se ele achar que o
      // alvo está ocupado, `deliver-task` enfileira — e a fila só drena numa
      // transição para status ocioso que, se este expect falha, nunca vem.
      expect(
        isIdleAgentStatus(tile.status()),
        `o daemon vê o tile como "${tile.status()}" depois do turno respondido — ` +
          'para ele o alvo está OCUPADO, então deliver-task vai enfileirar em vez de entregar'
      ).toBe(true);

      // (2) O ack. Sozinho não prova nada (o bug do boot também "escrevia" com
      // sucesso) — é só o pré-requisito do (3), que é a prova de verdade.
      const ack = await tile.client.deliverTask(tile.id, 'Escreva apenas o resultado de 222 vezes 222, sem mais nada.');
      expect(ack.outcome, `ack inesperado: ${ack.reason}`).toBe('delivered');

      // (3) A PROVA: o turno foi criado e o Codex respondeu. É isto que separa
      // "os bytes foram escritos" de "o agente recebeu a tarefa".
      const answered = await tile.waitFor('49284', SECOND_TURN_TIMEOUT_MS);
      expect(
        answered,
        'o Codex NÃO respondeu à tarefa entregue — os bytes foram escritos mas nenhum turno foi ' +
          `submetido. Tela final:\n${tile.screen().slice(-2000)}`
      ).toBe(true);
    } finally {
      await tile.dispose();
    }
  });

  it('o payload de writeTaskLine (texto + CR num único write) submete o turno', { timeout: 600_000 }, async () => {
    // Microscópio no MECANISMO, não no contrato: escreve no PTY exatamente os
    // bytes que `DaemonServer.writeTaskLine` produz, pulando o portão de
    // status. Serve para separar duas causas que o caso acima confunde —
    // "o daemon não deixou entregar" de "o TUI não submeteu o que recebeu".
    const tile = await openIdleCodexTile('16641', 'Escreva apenas o resultado de 129 vezes 129, sem mais nada.');
    try {
      const line = 'Escreva apenas o resultado de 222 vezes 222, sem mais nada.\r';
      tile.client.write(tile.id, new TextEncoder().encode(line));

      const answered = await tile.waitFor('49284', SECOND_TURN_TIMEOUT_MS);
      expect(
        answered,
        'o CR no MESMO write do texto não submeteu o turno: o texto fica parado no composer do ' +
          `Codex esperando um enter humano. Tela final:\n${tile.screen().slice(-2000)}`
      ).toBe(true);
    } finally {
      await tile.dispose();
    }
  });
});
