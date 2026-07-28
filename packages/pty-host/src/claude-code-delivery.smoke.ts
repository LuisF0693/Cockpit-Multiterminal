import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { isIdleAgentStatus, type AgentStatus } from '@cockpit/shared';
import { startDaemon } from './daemon-entry';
import { DaemonClient } from './daemon-client';

/**
 * SMOKE de entrega em tile Claude Code JÁ ABERTO — daemon real, PTY real,
 * `claude` real, rede real, tokens reais. Gêmeo do `codex-delivery.smoke.ts`,
 * para o adapter que é a PRIMEIRA escolha em `development`.
 *
 * ── O que este arquivo prova ───────────────────────────────────────────────
 * Duas coisas que nenhum teste com adapter fake alcança:
 *  (a) a instrução inicial vira TURNO SUBMETIDO (Defeito 1 — antes o texto
 *      ficava parado no composer do Ink e o tile nunca saía de `starting`);
 *  (b) o status volta a `idle` SOZINHO no fim do turno (Defeito 2 — antes o
 *      comando do hook era mutilado pelo Git Bash, o arquivo de status só
 *      recebia lixo e o adapter degradava para process-only, deixando o tile
 *      travado em `working` para sempre).
 *
 * ── Higiene de ambiente: OBRIGATÓRIA ───────────────────────────────────────
 * Este smoke costuma rodar de dentro de uma sessão do próprio Claude Code, e
 * aí o processo do vitest herda um punhado de `CLAUDE*` (CLAUDECODE,
 * CLAUDE_CODE_SESSION_ID, CLAUDE_CODE_ENTRYPOINT, ...) que contaminam a
 * sessão FILHA — ela passa a se achar aninhada na sessão do pai. Um teste já
 * "passou" por esse motivo e depois reprovou com o ambiente limpo. Como o
 * `SpawnConfig.env` só SOMA variáveis (nunca remove) e o daemon roda
 * in-process, a limpeza é feita aqui, no `process.env` do runner, ANTES de
 * qualquer spawn. Em produção o Cockpit não tem essas variáveis.
 *
 * ── Por que NÃO está na suíte padrão ───────────────────────────────────────
 * Depende de `claude` no PATH, de login válido e de rede, e cada execução
 * QUEIMA TOKENS do fundador. O sufixo `.smoke.ts` deixa o arquivo FORA do
 * `include` padrão do vitest (`*.{test,spec}.*`); roda só por pedido:
 *
 *     pnpm --filter @cockpit/pty-host smoke:claude
 *
 * Sem o binário no PATH os casos PULAM com mensagem clara, em vez de falhar.
 *
 * ── Custo ──────────────────────────────────────────────────────────────────
 * 4 turnos reais por execução (boot + tarefa, em cada um dos 2 casos), todos
 * em `--model haiku` e todos aritmética trivial. Os needles NÃO aparecem no
 * enunciado de propósito: se o needle estivesse no prompt, o eco do composer
 * faria o teste passar sem o modelo ter respondido nada.
 */

const REPO_ROOT = fileURLToPath(new URL('../../..', import.meta.url));

/** Boot do claude (settings + CLAUDE.md + MCP) + primeiro turno. Folga generosa. */
const FIRST_TURN_TIMEOUT_MS = 240_000;
/** Turno seguinte não paga o boot, mas o modelo pode pensar. Idem. */
const SECOND_TURN_TIMEOUT_MS = 180_000;
/** Depois da resposta, o hook `Stop` ainda precisa rodar e o watcher drenar. */
const IDLE_SETTLE_TIMEOUT_MS = 60_000;

/** Remove do runner TODA variável `CLAUDE*` herdada (ver cabeçalho). */
function scrubInheritedClaudeEnv(): string[] {
  const removed = Object.keys(process.env).filter((k) => /^CLAUDE/i.test(k));
  for (const key of removed) delete process.env[key];
  return removed;
}

const SCRUBBED = scrubInheritedClaudeEnv();
if (SCRUBBED.length > 0) {
  console.warn(`[smoke:claude] variáveis CLAUDE* herdadas REMOVIDAS do runner: ${SCRUBBED.join(', ')}`);
}

function claudeOnPath(): boolean {
  try {
    execFileSync('where', ['claude'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const HAS_CLAUDE = claudeOnPath();
if (!HAS_CLAUDE) {
  console.warn(
    '[smoke:claude] PULADO — `claude` não está no PATH. Este smoke exige o CLI instalado, ' +
      'autenticado e com rede (npm i -g @anthropic-ai/claude-code). A suíte padrão (`pnpm -w test`) não depende dele.'
  );
}

const uniquePipe = (): string =>
  `\\\\.\\pipe\\cockpit-claude-smoke-${process.pid}-${Math.random().toString(36).slice(2)}`;

/**
 * O Claude Code é TUI de tela cheia (Ink): a saída vem encharcada de escapes
 * de cursor, OSC de título e spinner. Sem limpar, procurar o needle vira
 * loteria — os dígitos chegam picotados entre reposicionamentos de cursor.
 *
 * `no-control-regex` fica desligado aqui porque casar caractere de controle é
 * literalmente o trabalho desta função: ESC (0x1b) e BEL (0x07) são os
 * delimitadores das sequências que queremos remover.
 */
/* eslint-disable no-control-regex */
const stripAnsi = (s: string): string =>
  s
    .replace(/\][^]*(?:|\\)/g, '') // OSC (título da janela)
    .replace(/\[[0-9;?]*[ -/]*[@-~]/g, '') // CSI (cursor, cor, limpeza de tela)
    .replace(/[()][AB012]/g, '') // seleção de charset
    .replace(/[=>]/g, ''); // modo keypad
/* eslint-enable no-control-regex */

/**
 * Separador de milhar é ruído, não resposta: o modelo respondeu `12.321` numa
 * das medições e `12321` na outra para o MESMO prompt. Comparar sem `.`, `,`
 * e espaços (inclusive o fino, U+00A0) evita reprovar por formatação.
 */
// NBSP e espaco fino vao como ESCAPE, nao literais: o lint proibe whitespace
// irregular no fonte (no-irregular-whitespace), e um U+00A0 cru aqui fica
// indistinguivel de um espaco comum na revisao.
const digitsOnly = (s: string): string => s.replace(/[.,\s\u00a0\u2009]/g, '');

interface ClaudeTile {
  client: DaemonClient;
  id: string;
  /** Saída acumulada do PTY, já sem escapes. */
  screen: () => string;
  /** Último status que o DAEMON conhece — é ele que decide entregar ou enfileirar. */
  status: () => AgentStatus;
  waitFor: (needle: string, timeoutMs: number) => Promise<boolean>;
  waitForIdle: (timeoutMs: number) => Promise<boolean>;
  dispose: () => Promise<void>;
}

/**
 * Sobe um tile Claude Code de verdade e só devolve depois que o PRIMEIRO
 * turno foi respondido — esse é o estado que o fundador chama de "tile já
 * aberto e ocioso": CLI bootado, composer vazio, esperando ordem.
 *
 * `--model haiku` não é detalhe de conveniência: o smoke gasta token do
 * fundador e nada aqui depende da capacidade do modelo (é multiplicação de
 * três dígitos). O cwd é o REPO porque ele já é diretório confiado — num
 * diretório novo o `claude` abre o diálogo "Is this a project you trust?" e
 * o tile fica preso no diálogo, não no composer.
 */
async function openIdleClaudeTile(firstNeedle: string, firstPrompt: string): Promise<ClaudeTile> {
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
    tag: 'claude-smoke',
    cols: 120,
    rows: 40,
    adapterId: 'claude-code',
    cwd: REPO_ROOT,
    args: ['--model', 'haiku'],
    initialInstruction: firstPrompt
  });
  client.onData(id, (bytes) => {
    raw += Buffer.from(bytes).toString('utf8');
  });

  const waitFor = async (needle: string, timeoutMs: number): Promise<boolean> => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (digitsOnly(screen()).includes(needle)) return true;
      await new Promise((r) => setTimeout(r, 250));
    }
    return false;
  };

  const waitForIdle = async (timeoutMs: number): Promise<boolean> => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (isIdleAgentStatus(lastStatus)) return true;
      await new Promise((r) => setTimeout(r, 250));
    }
    return false;
  };

  const bootOk = await waitFor(firstNeedle, FIRST_TURN_TIMEOUT_MS);
  expect(
    bootOk,
    'a instrução inicial NÃO virou turno submetido (Defeito 1). Se a tela mostra o enunciado parado ' +
      `no composer (\`❯ ${firstPrompt}\`), a instrução voltou a ser escrita no PTY durante o boot do ` +
      `Ink em vez de ir pelo argumento posicional. Tela:\n${screen().slice(-2000)}`
  ).toBe(true);

  return {
    client,
    id,
    screen,
    status: () => lastStatus,
    waitFor,
    waitForIdle,
    dispose: async () => {
      await client.closeSession(id).catch(() => void 0);
      await server.shutdown();
      client.disconnect();
    }
  };
}

describe.skipIf(!HAS_CLAUDE)('deliver-task num tile Claude Code REAL já aberto', () => {
  it('o alvo ocioso é reconhecido como entregável e o turno entregue é SUBMETIDO', { timeout: 600_000 }, async () => {
    const tile = await openIdleClaudeTile('12321', 'Escreva apenas o resultado de 111 vezes 111, sem mais nada.');
    try {
      // (1) Defeito 2: o hook `Stop` tem que levar o tile de volta a `idle`
      // SOZINHO. Enquanto o comando do hook era mutilado pelo shell, isto
      // ficava preso em `working` e o `deliver-task` enfileirava para sempre.
      const idleAfterBoot = await tile.waitForIdle(IDLE_SETTLE_TIMEOUT_MS);
      expect(
        idleAfterBoot,
        `o daemon vê o tile como "${tile.status()}" depois do turno respondido — para ele o alvo está ` +
          'OCUPADO, então deliver-task vai enfileirar em vez de entregar. Sintoma clássico de hook ' +
          'silencioso (o adapter degrada para process-only e crava `working`).'
      ).toBe(true);

      // (2) O ack. Sozinho não prova nada — é o pré-requisito do (3).
      const ack = await tile.client.deliverTask(tile.id, 'Escreva apenas o resultado de 222 vezes 222, sem mais nada.');
      expect(ack.outcome, `ack inesperado: ${ack.reason}`).toBe('delivered');

      // (3) A PROVA: o turno foi criado e o Claude respondeu. É isto que
      // separa "os bytes foram escritos" de "o agente recebeu a tarefa".
      const answered = await tile.waitFor('49284', SECOND_TURN_TIMEOUT_MS);
      expect(
        answered,
        'o Claude Code NÃO respondeu à tarefa entregue — os bytes foram escritos mas nenhum turno foi ' +
          `submetido. Tela final:\n${tile.screen().slice(-2000)}`
      ).toBe(true);

      // (4) E volta a ocioso de novo — o ciclo fecha, então a fila drena e o
      // orquestrador sabe que pode mandar a próxima.
      const idleAgain = await tile.waitForIdle(IDLE_SETTLE_TIMEOUT_MS);
      expect(idleAgain, `depois de responder a tarefa entregue o tile ficou em "${tile.status()}"`).toBe(true);
    } finally {
      await tile.dispose();
    }
  });

  it('o payload de writeTaskLine (texto + CR num único write) submete o turno', { timeout: 600_000 }, async () => {
    // Microscópio no MECANISMO, não no contrato: escreve no PTY exatamente os
    // bytes que `DaemonServer.writeTaskLine` produz, pulando o portão de
    // status. Separa "o daemon não deixou entregar" de "o TUI não submeteu o
    // que recebeu". No Codex este caso exigiu quebrar a linha em dois bursts
    // com gap; no composer do Ink o write único basta — é o que se trava aqui.
    const tile = await openIdleClaudeTile('16641', 'Escreva apenas o resultado de 129 vezes 129, sem mais nada.');
    try {
      await tile.waitForIdle(IDLE_SETTLE_TIMEOUT_MS);
      const line = 'Escreva apenas o resultado de 222 vezes 222, sem mais nada.\r';
      tile.client.write(tile.id, new TextEncoder().encode(line));

      const answered = await tile.waitFor('49284', SECOND_TURN_TIMEOUT_MS);
      expect(
        answered,
        'o CR no MESMO write do texto não submeteu o turno: o texto ficou parado no composer do ' +
          `Claude Code esperando um enter humano. Tela final:\n${tile.screen().slice(-2000)}`
      ).toBe(true);
    } finally {
      await tile.dispose();
    }
  });
});
