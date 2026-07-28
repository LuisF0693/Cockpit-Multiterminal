import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { AgentStatus } from '@cockpit/shared';
import { ClaudeCodeAdapter, buildClaudeArgs, type ClaudePtyLike, type ClaudeSpawnFn } from './claude-code-adapter';
import { HOOK_STATUS_MAP, buildHookScript, buildHookSettings } from './hook-settings';
import { StatusFileWatcher } from './status-file-watcher';

const cleanups: Array<() => void> = [];
afterEach(() => {
  for (const fn of cleanups.splice(0)) fn();
});

function makeFakePty(pid = 999_970): ClaudePtyLike & {
  args: string[][];
  written: string[];
  killed: boolean;
  emitData: (d: string) => void;
  emitExit: (code: number) => void;
} {
  const dataCbs: Array<(d: string) => void> = [];
  const exitCbs: Array<(e: { exitCode: number }) => void> = [];
  const fake = {
    pid,
    args: [] as string[][],
    written: [] as string[],
    killed: false,
    onData(cb: (d: string) => void) {
      dataCbs.push(cb);
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
    emitData: (d: string) => dataCbs.forEach((cb) => cb(d)),
    emitExit: (code: number) => exitCbs.forEach((cb) => cb({ exitCode: code }))
  };
  return fake;
}

interface Harness {
  adapter: ClaudeCodeAdapter;
  ptys: Array<ReturnType<typeof makeFakePty>>;
  lastSettingsPath: () => string;
}

function makeHarness(which: string | null = 'C:/npm/claude.ps1'): Harness {
  const ptys: Array<ReturnType<typeof makeFakePty>> = [];
  let settingsPath = '';
  const spawnFn: ClaudeSpawnFn = (_cmd, args) => {
    settingsPath = args[1]!;
    const fake = makeFakePty();
    ptys.push(fake);
    return fake;
  };
  const adapter = new ClaudeCodeAdapter(spawnFn, () => which, 'claude.cmd', 10, 200);
  return { adapter, ptys, lastSettingsPath: () => settingsPath };
}

const CONFIG = { cwd: 'C:/work', cols: 80, rows: 24 };

describe('ClaudeCodeAdapter — args extras (Story 17.3)', () => {
  it('repassa config.args após --settings (modelo por sessão)', async () => {
    let seen: string[] = [];
    const spawnFn: ClaudeSpawnFn = (_cmd, args) => {
      seen = args;
      return makeFakePty();
    };
    const adapter = new ClaudeCodeAdapter(spawnFn, () => 'C:/npm/claude.ps1', 'claude.cmd', 10, 200);
    const session = await adapter.spawn({ ...CONFIG, args: ['--model', 'haiku'] });
    cleanups.push(() => void session.dispose().catch(() => void 0));

    expect(seen[0]).toBe('--settings');
    expect(seen.slice(2)).toEqual(['--model', 'haiku']);
  });
});

describe('buildHookSettings', () => {
  it('gera hooks para os 4 eventos invocando o script de status por node', () => {
    const settings = buildHookSettings('C:\\tmp\\status-hook.cjs') as {
      hooks: Record<string, Array<{ hooks: Array<{ type: string; command: string }> }>>;
    };
    expect(Object.keys(settings.hooks)).toEqual(Object.keys(HOOK_STATUS_MAP));
    const stop = settings.hooks['Stop']![0]!.hooks[0]!;
    expect(stop.type).toBe('command');
    expect(stop.command).toBe('node "C:\\tmp\\status-hook.cjs" idle');
  });
});

/**
 * Regressão do Defeito 2 — os hooks nunca disparavam.
 *
 * O comando era `cmd /c echo <status>>> "<path>"`. O Claude Code roda o
 * comando do hook por um SHELL, e no Windows esse shell é o Git Bash: o MSYS
 * converte o argumento `/c` (que parece caminho POSIX) em `C:/`, o cmd.exe
 * sobe INTERATIVO, escreve o próprio banner no arquivo de status e ecoa o
 * payload JSON que chega no stdin. Nenhuma linha parseável → `sawAnyStatus`
 * false → degradação para process-only → tile travado em `working`.
 *
 * A trava aqui é sintática de propósito: qualquer volta a um comando que
 * dependa de interpretação de shell (redirecionamento, `/c`, `&&`) quebra.
 */
describe('comando do hook (Defeito 2 — mangling de shell)', () => {
  const settings = buildHookSettings('C:\\tmp dir\\status-hook.cjs') as {
    hooks: Record<string, Array<{ hooks: Array<{ command: string }> }>>;
  };
  const commands = Object.keys(HOOK_STATUS_MAP).map((e) => settings.hooks[e]![0]!.hooks[0]!.command);

  it('nenhum hook usa redirecionamento nem `cmd /c` (o que o Git Bash mutila)', () => {
    for (const command of commands) {
      expect(command, `comando de hook depende de shell: ${command}`).not.toMatch(/cmd\s+\/c|>>|>|&&|\|/);
    }
  });

  it('todo hook invoca node com o script entre aspas (path com espaço sobrevive)', () => {
    for (const command of commands) {
      expect(command).toMatch(/^node "C:\\tmp dir\\status-hook\.cjs" [a-z-]+$/);
    }
  });

  it('o script embute o path do status escapado e escreve só o argv', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'cockpit-hookscript-'));
    cleanups.push(() => rmSync(dir, { recursive: true, force: true }));
    const statusPath = join(dir, 'session.status');
    const scriptPath = join(dir, 'status-hook.cjs');
    writeFileSync(scriptPath, buildHookScript(statusPath));

    // Executa o script DE VERDADE, do mesmo jeito que o hook executa: node +
    // argv. Prova que o path do Windows embutido não quebra o require/append.
    execFileSync(process.execPath, [scriptPath, 'idle'], { stdio: 'pipe' });
    execFileSync(process.execPath, [scriptPath, 'working'], { stdio: 'pipe' });

    expect(readFileSync(statusPath, 'utf8')).toBe('idle\nworking\n');
  });

  it('o script não imprime nada (stdout de hook vira contexto do agente)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cockpit-hookquiet-'));
    cleanups.push(() => rmSync(dir, { recursive: true, force: true }));
    const scriptPath = join(dir, 'status-hook.cjs');
    writeFileSync(scriptPath, buildHookScript(join(dir, 'session.status')));

    const out = execFileSync(process.execPath, [scriptPath, 'idle'], { encoding: 'utf8' });
    expect(out).toBe('');
  });
});

/**
 * Regressão do Defeito 1 — o turno inicial não era submetido.
 *
 * `pty.write(`${instrução}\r`)` no construtor da sessão chega enquanto o Ink
 * ainda monta o composer: o texto entra, o Enter se perde, e o tile fica
 * parado com a tarefa digitada (statuses = ["starting"]). A instrução TEM que
 * ir pelo argumento posicional do CLI.
 */
describe('buildClaudeArgs (Defeito 1 — instrução inicial)', () => {
  it('instrução inicial vai como posicional atrás de `--`, nunca no PTY', () => {
    expect(buildClaudeArgs('C:\\tmp\\s.json', { initialInstruction: 'faça X' })).toEqual([
      '--settings',
      'C:\\tmp\\s.json',
      '--',
      'faça X'
    ]);
  });

  it('`--` protege instrução que começa com hífen de virar opção do CLI', () => {
    const args = buildClaudeArgs('S', { initialInstruction: '--model é o assunto' });
    expect(args.indexOf('--')).toBe(args.length - 2);
    expect(args.at(-1)).toBe('--model é o assunto');
  });

  it('sem instrução inicial não sobra `--` solto no argv', () => {
    expect(buildClaudeArgs('S', { args: ['--model', 'haiku'] })).toEqual(['--settings', 'S', '--model', 'haiku']);
  });

  it('args de sessão (17.3) vêm ANTES do posicional', () => {
    expect(buildClaudeArgs('S', { args: ['--model', 'haiku'], initialInstruction: 'oi' })).toEqual([
      '--settings',
      'S',
      '--model',
      'haiku',
      '--',
      'oi'
    ]);
  });

  it('a sessão NÃO escreve a instrução inicial no PTY', async () => {
    const ptys: Array<ReturnType<typeof makeFakePty>> = [];
    const spawnFn: ClaudeSpawnFn = () => {
      const fake = makeFakePty();
      ptys.push(fake);
      return fake;
    };
    const adapter = new ClaudeCodeAdapter(spawnFn, () => 'C:/npm/claude.ps1', 'claude.cmd', 10, 200);
    const session = await adapter.spawn({ ...CONFIG, initialInstruction: 'faça X' });
    cleanups.push(() => void session.dispose().catch(() => void 0));

    expect(ptys[0]!.written).toEqual([]);
  });
});

/**
 * O composer do Ink NÃO precisa do tratamento que o Codex precisa. Medido com
 * claude-code 2.1.220, tile bootado e composer vazio: `${texto}\r` num único
 * write submeteu o turno (resposta em 2,6s), e bracketed paste + Enter com gap
 * 0ms também (1,8s). Como não há gap a respeitar, `write()` repassa os bytes
 * INTACTOS — sem split, sem timer, sem backlog.
 */
describe('write() (contraste com o Codex — sem gap de submissão)', () => {
  it('repassa a linha submetida intacta, num único write', async () => {
    const ptys: Array<ReturnType<typeof makeFakePty>> = [];
    const spawnFn: ClaudeSpawnFn = () => {
      const fake = makeFakePty();
      ptys.push(fake);
      return fake;
    };
    const adapter = new ClaudeCodeAdapter(spawnFn, () => 'C:/npm/claude.ps1', 'claude.cmd', 10, 200);
    const session = await adapter.spawn(CONFIG);
    cleanups.push(() => void session.dispose().catch(() => void 0));

    session.write('quanto é 2+2\r');
    expect(ptys[0]!.written).toEqual(['quanto é 2+2\r']);
  });
});

describe('StatusFileWatcher', () => {
  it('emite mudanças de status appendadas, com dedupe e ignorando lixo', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'cockpit-watch-'));
    cleanups.push(() => rmSync(dir, { recursive: true, force: true }));
    const file = join(dir, 's.status');
    appendFileSync(file, '');

    const seen: AgentStatus[] = [];
    const watcher = new StatusFileWatcher(file, (s) => seen.push(s), 30);
    cleanups.push(() => watcher.stop());
    watcher.start();

    appendFileSync(file, 'working\n');
    appendFileSync(file, 'working\n'); // dedupe
    appendFileSync(file, 'banana\n'); // lixo ignorado
    appendFileSync(file, 'waiting-input\n');
    await new Promise((r) => setTimeout(r, 150));

    expect(seen).toEqual(['working', 'waiting-input']);
    expect(watcher.sawAnyStatus).toBe(true);
  });
});

describe('ClaudeCodeAdapter', () => {
  it('identidade native-hooks + availability pelo which', async () => {
    const { adapter } = makeHarness();
    expect(adapter.id).toBe('claude-code');
    expect(adapter.statusStrategy).toBe('native-hooks');
    await expect(adapter.detectAvailability()).resolves.toMatchObject({ available: true });

    const missing = makeHarness(null);
    const result = await missing.adapter.detectAvailability();
    expect(result.available).toBe(false);
    expect(result.reason).toMatch(/não encontrado/);
  });

  it('spawn passa --settings com hooks e status flui do arquivo p/ onStatus', async () => {
    const { adapter, lastSettingsPath } = makeHarness();
    const session = await adapter.spawn(CONFIG);
    cleanups.push(() => void session.dispose().catch(() => void 0));

    const settingsPath = lastSettingsPath();
    expect(existsSync(settingsPath)).toBe(true);
    const settings = JSON.parse(readFileSync(settingsPath, 'utf8')) as { hooks: unknown };
    expect(settings.hooks).toBeDefined();

    const statusPath = join(settingsPath, '..', 'session.status');
    const seen: AgentStatus[] = [];
    session.onStatus((s) => seen.push(s));

    appendFileSync(statusPath, 'working\n');
    await new Promise((r) => setTimeout(r, 700));
    appendFileSync(statusPath, 'idle\n');
    await new Promise((r) => setTimeout(r, 700));

    expect(seen).toEqual(['working', 'idle']);
  });

  it('exit mapeia done/error e limpa os arquivos temporários', async () => {
    const { adapter, ptys, lastSettingsPath } = makeHarness();
    const session = await adapter.spawn(CONFIG);
    const seen: AgentStatus[] = [];
    session.onStatus((s) => seen.push(s));

    const settingsPath = lastSettingsPath();
    ptys[0]!.emitExit(1);
    await new Promise((r) => setTimeout(r, 50));

    expect(seen).toContain('error');
    expect(existsSync(settingsPath)).toBe(false); // temp dir removido
  });

  it('degradação segura: sem hooks após timeout emite working (process-only)', async () => {
    const { adapter, ptys } = makeHarness();
    const session = await adapter.spawn(CONFIG);
    cleanups.push(() => void session.dispose().catch(() => void 0));
    const seen: Array<[AgentStatus, string | undefined]> = [];
    session.onStatus((s, d) => seen.push([s, d]));

    ptys[0]!.emitData('banner do claude'); // primeiro output arma o timer
    await new Promise((r) => setTimeout(r, 400)); // > hookTimeoutMs (200)

    expect(seen).toEqual([['working', 'degraded:process-only']]);
  });

  it('dispose mata o processo e resolve', async () => {
    const { adapter, ptys } = makeHarness();
    const session = await adapter.spawn(CONFIG);
    await expect(session.dispose()).resolves.toBeUndefined();
    expect(ptys[0]!.killed).toBe(true);
  });
});
