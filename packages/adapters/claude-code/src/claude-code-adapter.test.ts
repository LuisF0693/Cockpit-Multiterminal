import { appendFileSync, existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { AgentStatus } from '@cockpit/shared';
import { ClaudeCodeAdapter, type ClaudePtyLike, type ClaudeSpawnFn } from './claude-code-adapter';
import { HOOK_STATUS_MAP, buildHookSettings } from './hook-settings';
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

describe('buildHookSettings', () => {
  it('gera hooks para os 4 eventos com append no arquivo de status', () => {
    const settings = buildHookSettings('C:\\tmp\\s.status') as {
      hooks: Record<string, Array<{ hooks: Array<{ type: string; command: string }> }>>;
    };
    expect(Object.keys(settings.hooks)).toEqual(Object.keys(HOOK_STATUS_MAP));
    const stop = settings.hooks['Stop']![0]!.hooks[0]!;
    expect(stop.type).toBe('command');
    expect(stop.command).toBe('cmd /c echo idle>> "C:\\tmp\\s.status"');
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
