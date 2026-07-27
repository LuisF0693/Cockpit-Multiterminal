import { execFileSync } from 'node:child_process';
import { appendFileSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { AgentStatus } from '@cockpit/shared';
import {
  CODEX_SUBMIT_GAP_MS,
  CodexAdapter,
  buildCodexArgs,
  buildNotifyOverride,
  buildNotifyScript,
  splitSubmittedLine,
  type CodexPtyLike,
  type CodexSpawnFn
} from './codex-adapter';

const ESC = String.fromCharCode(27);

const cleanups: Array<() => void> = [];
afterEach(() => {
  for (const fn of cleanups.splice(0)) fn();
});

function makeFakePty(pid = 999_960): CodexPtyLike & {
  written: string[];
  killed: boolean;
  emitExit: (code: number) => void;
} {
  const exitCbs: Array<(e: { exitCode: number }) => void> = [];
  const fake = {
    pid,
    written: [] as string[],
    killed: false,
    onData() {
      return { dispose: () => void 0 };
    },
    onExit(cb: (e: { exitCode: number }) => void) {
      exitCbs.push(cb);
      return { dispose: () => void 0 };
    },
    write(data: string) {
      fake.written.push(data);
    },
    resize() {
      /* noop */
    },
    kill() {
      fake.killed = true;
      fake.emitExit(0);
    },
    emitExit: (code: number) => exitCbs.forEach((cb) => cb({ exitCode: code }))
  };
  return fake;
}

function makeHarness(which: string | null = 'C:/npm/codex.ps1'): {
  adapter: CodexAdapter;
  ptys: Array<ReturnType<typeof makeFakePty>>;
  lastArgs: () => string[];
} {
  const ptys: Array<ReturnType<typeof makeFakePty>> = [];
  let args: string[] = [];
  const spawnFn: CodexSpawnFn = (_cmd, spawnArgs) => {
    args = spawnArgs;
    const fake = makeFakePty();
    ptys.push(fake);
    return fake;
  };
  return {
    // gap de 10ms: o teste prova a SEPARAÇÃO dos bursts, não os 250ms reais
    // (esses estão medidos e justificados na constante do adapter).
    adapter: new CodexAdapter(spawnFn, () => which, 'codex.cmd', 10, 30, 10),
    ptys,
    lastArgs: () => args
  };
}

const CONFIG = { cwd: 'C:/work', cols: 80, rows: 24 };

/** Extrai o path do script de notify do argv gerado. */
const notifyPathOf = (args: string[]): string => args[1]!.match(/notify=\['node','(.+)'\]/)![1]!;

describe('buildNotifyOverride', () => {
  it('gera TOML com literal strings (paths Windows sem escaping)', () => {
    expect(buildNotifyOverride('C:\\tmp\\notify.cjs')).toBe(`notify=['node','C:\\tmp\\notify.cjs']`);
  });
});

describe('buildCodexArgs', () => {
  it('sem instrução inicial: só notify + args de sessão', () => {
    expect(buildCodexArgs('C:\\tmp\\notify.cjs', { args: ['--model', 'gpt-5.5-codex'] })).toEqual([
      '-c',
      `notify=['node','C:\\tmp\\notify.cjs']`,
      '--model',
      'gpt-5.5-codex'
    ]);
  });

  it('instrução inicial vai como posicional após `--`, no FIM do argv', () => {
    expect(
      buildCodexArgs('C:\\tmp\\notify.cjs', {
        args: ['--model', 'gpt-5.5-codex'],
        initialInstruction: 'Você é o agente "@qa". Tarefa: revisar a story 17.1'
      })
    ).toEqual([
      '-c',
      `notify=['node','C:\\tmp\\notify.cjs']`,
      '--model',
      'gpt-5.5-codex',
      '--',
      'Você é o agente "@qa". Tarefa: revisar a story 17.1'
    ]);
  });
});

/**
 * Regressão da Causa B1. O notify anterior era `cmd /c echo idle>> <path>` e
 * o Codex ANEXA o payload do evento como argumento extra. Medido no
 * `cmd`: sem payload escrevia "idle"; com payload JSON saía com status 1
 * ("The filename, directory name, or volume label syntax is incorrect") e
 * NÃO escrevia nada — o arquivo de status nunca era alimentado e o daemon
 * ficava preso no seed 'working' até o exit (zero eventos em 3 sessões reais).
 *
 * Este teste invoca o programa de notify EXATAMENTE como o Codex invoca —
 * programa + payload JSON como argv extra — e exige a linha no arquivo.
 */
describe('buildNotifyScript (Causa B1 — notify imune ao payload do Codex)', () => {
  const payloads = [
    [] as string[],
    ['abc'],
    ['{"type":"agent-turn-complete","turn-id":"t1","last-assistant-message":"a > b & c | d"}']
  ];

  it.each(payloads)('escreve idle mesmo com o payload %#', (...payload: string[]) => {
    const dir = mkdtempSync(join(tmpdir(), 'cockpit-notify-test-'));
    const statusPath = join(dir, 'session.status');
    const scriptPath = join(dir, 'notify.cjs');
    writeFileSync(statusPath, '');
    writeFileSync(scriptPath, buildNotifyScript(statusPath));

    execFileSync('node', [scriptPath, ...payload], { stdio: 'ignore' });

    expect(readFileSync(statusPath, 'utf8')).toBe('idle\n');
  });

  it('sobrevive a path com espaço (o repo do fundador tem um)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cockpit notify espaço-'));
    const statusPath = join(dir, 'session.status');
    const scriptPath = join(dir, 'notify.cjs');
    writeFileSync(statusPath, '');
    writeFileSync(scriptPath, buildNotifyScript(statusPath));

    execFileSync('node', [scriptPath, '{"type":"agent-turn-complete"}'], { stdio: 'ignore' });

    expect(readFileSync(statusPath, 'utf8')).toBe('idle\n');
  });
});

/**
 * Regressão da Causa A. `${texto}\r` num único write NÃO submete turno no
 * Codex — o TUI trata o Enter colado ao bloco como nova linha do composer.
 * Estes casos travam a decisão PURA; o efeito (dois bursts separados no
 * tempo) está coberto no bloco do CodexAdapter, e a prova de que o Codex de
 * verdade submete está em `pty-host/src/codex-delivery.smoke.ts`.
 */
describe('splitSubmittedLine (Causa A — decisão pura)', () => {
  it('linha submetida vira bloco colado + Enter separado', () => {
    expect(splitSubmittedLine('faça a tarefa\r')).toEqual({
      paste: `${ESC}[200~faça a tarefa${ESC}[201~`,
      enter: '\r'
    });
  });

  it('instrução MULTI-LINHA vai inteira no bloco (o \\n interno não submete)', () => {
    const split = splitSubmittedLine('revise isto:\nlinha 2\nlinha 3\r');
    expect(split?.paste).toBe(`${ESC}[200~revise isto:\nlinha 2\nlinha 3${ESC}[201~`);
    expect(split?.enter).toBe('\r');
  });

  it('digitação humana passa intacta: tecla solta não termina em quebra', () => {
    expect(splitSubmittedLine('a')).toBeNull();
    expect(splitSubmittedLine('faça a tarefa')).toBeNull();
  });

  it('Enter puro do teclado passa intacto — corpo vazio não é linha submetida', () => {
    expect(splitSubmittedLine('\r')).toBeNull();
    expect(splitSubmittedLine('\r\n')).toBeNull();
    expect(splitSubmittedLine('\n')).toBeNull();
  });

  it('write que JÁ vem embrulhado (xterm com DEC 2004) passa intacto', () => {
    expect(splitSubmittedLine(`${ESC}[200~colado pelo humano${ESC}[201~\r`)).toBeNull();
  });
});

describe('CodexAdapter', () => {
  it('identidade output-parsing + availability pelo which', async () => {
    const { adapter } = makeHarness();
    expect(adapter.id).toBe('codex');
    expect(adapter.statusStrategy).toBe('output-parsing');
    await expect(adapter.detectAvailability()).resolves.toMatchObject({ available: true });
    const missing = makeHarness(null);
    await expect(missing.adapter.detectAvailability()).resolves.toMatchObject({ available: false });
  });

  it('spawn passa -c notify=... apontando pro script node da sessão', async () => {
    const { adapter, lastArgs } = makeHarness();
    const session = await adapter.spawn(CONFIG);
    cleanups.push(() => void session.dispose().catch(() => void 0));

    const args = lastArgs();
    expect(args[0]).toBe('-c');
    expect(args[1]).toMatch(/^notify=\['node','.+notify\.cjs'\]$/);
    // O script existe em disco e aponta para o status file irmão.
    const scriptPath = notifyPathOf(args);
    expect(readFileSync(scriptPath, 'utf8')).toContain('session.status');
  });

  it('repassa config.args após o notify (Story 17.3 — modelo por sessão)', async () => {
    const { adapter, lastArgs } = makeHarness();
    const session = await adapter.spawn({ ...CONFIG, args: ['--model', 'gpt-5.5-codex'] });
    cleanups.push(() => void session.dispose().catch(() => void 0));

    expect(lastArgs().slice(2)).toEqual(['--model', 'gpt-5.5-codex']);
  });

  // Regressão do bug do fundador ("chamo um agente com Codex e ele NÃO CRIA A
  // TAREFA"): a instrução ia por write() no PTY logo após o spawn e o TUI do
  // Codex, ainda no boot, engolia os bytes — composer vazio, turno nunca
  // submetido. Prova de que a entrega agora é por argv, sem tocar no PTY.
  it('initialInstruction vai no argv (posicional), NUNCA por write no PTY (FR7)', async () => {
    const { adapter, ptys, lastArgs } = makeHarness();
    const instruction = 'Você é o agente "@qa". Tarefa: revisar a story 17.1';
    const session = await adapter.spawn({ ...CONFIG, initialInstruction: instruction });
    cleanups.push(() => void session.dispose().catch(() => void 0));

    const args = lastArgs();
    expect(args.slice(-2)).toEqual(['--', instruction]);
    expect(ptys[0]!.written).toEqual([]);
  });

  it('sem initialInstruction o argv não ganha `--` sobrando', async () => {
    const { adapter, lastArgs } = makeHarness();
    const session = await adapter.spawn(CONFIG);
    cleanups.push(() => void session.dispose().catch(() => void 0));

    expect(lastArgs()).not.toContain('--');
  });

  it('notify appendado (com sufixo JSON do Codex) vira idle; dedupe', async () => {
    const { adapter, lastArgs } = makeHarness();
    const session = await adapter.spawn(CONFIG);
    cleanups.push(() => void session.dispose().catch(() => void 0));
    const statusPath = join(dirname(notifyPathOf(lastArgs())), 'session.status');

    const seen: AgentStatus[] = [];
    session.onStatus((s) => seen.push(s));

    appendFileSync(statusPath, 'idle {"type":"agent-turn-complete","turn-id":"t1"}\n');
    appendFileSync(statusPath, 'idle {"type":"agent-turn-complete","turn-id":"t2"}\n');
    await new Promise((r) => setTimeout(r, 200));

    expect(seen).toEqual(['idle']);
  });

  it('heurística de input: write com \\r emite working; alterna com notify', async () => {
    const { adapter, ptys, lastArgs } = makeHarness();
    const session = await adapter.spawn(CONFIG);
    cleanups.push(() => void session.dispose().catch(() => void 0));
    const statusPath = join(dirname(notifyPathOf(lastArgs())), 'session.status');

    const seen: AgentStatus[] = [];
    session.onStatus((s) => seen.push(s));

    session.write('gere os testes');
    expect(seen).toEqual([]); // digitação não dispara
    session.write('\r');
    expect(seen).toEqual(['working']);
    // Digitação humana continua SÍNCRONA e byte a byte — a quebra em dois
    // bursts é só da linha submetida programaticamente.
    expect(ptys[0]!.written).toEqual(['gere os testes', '\r']);

    appendFileSync(statusPath, 'idle {"json":1}\n');
    await new Promise((r) => setTimeout(r, 200));
    expect(seen).toEqual(['working', 'idle']);
  });

  /**
   * Regressão da Causa A no EFEITO: a linha submetida tem de sair em DOIS
   * writes separados no tempo. Um teste que só olhasse "os bytes chegaram"
   * passaria com o bug de pé — foi exatamente assim que ele sobreviveu ao
   * commit 5695b29 com a suíte inteira verde.
   */
  it('linha submetida sai em DOIS bursts: bloco colado agora, Enter depois', async () => {
    const { adapter, ptys } = makeHarness();
    const session = await adapter.spawn(CONFIG);
    cleanups.push(() => void session.dispose().catch(() => void 0));
    const pty = ptys[0]!;

    session.write('faça a tarefa\r');
    // Imediatamente: só o bloco colado. O Enter NÃO pode estar aqui.
    expect(pty.written).toEqual([`${ESC}[200~faça a tarefa${ESC}[201~`]);

    await new Promise((r) => setTimeout(r, 60)); // gap do harness = 10ms
    expect(pty.written).toEqual([`${ESC}[200~faça a tarefa${ESC}[201~`, '\r']);
  });

  it('write que chega durante a espera do Enter NÃO ultrapassa a fila', async () => {
    const { adapter, ptys } = makeHarness();
    const session = await adapter.spawn(CONFIG);
    cleanups.push(() => void session.dispose().catch(() => void 0));
    const pty = ptys[0]!;

    session.write('primeira\r');
    session.write('x'); // tecla digitada no meio da espera
    expect(pty.written).toEqual([`${ESC}[200~primeira${ESC}[201~`]);

    await new Promise((r) => setTimeout(r, 60));
    expect(pty.written).toEqual([`${ESC}[200~primeira${ESC}[201~`, '\r', 'x']);
  });

  it('o gap padrão é o medido no Codex real, não um valor de teste', () => {
    expect(CODEX_SUBMIT_GAP_MS).toBe(250);
  });

  it('exit mapeia done/error', async () => {
    const { adapter, ptys } = makeHarness();
    const session = await adapter.spawn(CONFIG);
    const seen: AgentStatus[] = [];
    session.onStatus((s) => seen.push(s));
    ptys[0]!.emitExit(2);
    expect(seen).toContain('error');
  });

  it('dispose mata e resolve', async () => {
    const { adapter, ptys } = makeHarness();
    const session = await adapter.spawn(CONFIG);
    await expect(session.dispose()).resolves.toBeUndefined();
    expect(ptys[0]!.killed).toBe(true);
  });
});
