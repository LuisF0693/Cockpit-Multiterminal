import { appendFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import type { AgentStatus } from '@cockpit/shared';
import { CodexAdapter, buildNotifyOverride, type CodexPtyLike, type CodexSpawnFn } from './codex-adapter';

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
    adapter: new CodexAdapter(spawnFn, () => which, 'codex.cmd', 10, 30),
    ptys,
    lastArgs: () => args
  };
}

const CONFIG = { cwd: 'C:/work', cols: 80, rows: 24 };

describe('buildNotifyOverride', () => {
  it('gera TOML com literal strings (paths Windows sem escaping)', () => {
    expect(buildNotifyOverride('C:\\tmp\\s.status')).toBe(
      `notify=['cmd','/c','echo idle>> C:\\tmp\\s.status']`
    );
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

  it('spawn passa -c notify=... apontando pro arquivo de status', async () => {
    const { adapter, lastArgs } = makeHarness();
    const session = await adapter.spawn(CONFIG);
    cleanups.push(() => void session.dispose().catch(() => void 0));

    const args = lastArgs();
    expect(args[0]).toBe('-c');
    expect(args[1]).toMatch(/^notify=\['cmd','\/c','echo idle>> .+session\.status'\]$/);
  });

  it('repassa config.args após o notify (Story 17.3 — modelo por sessão)', async () => {
    const { adapter, lastArgs } = makeHarness();
    const session = await adapter.spawn({ ...CONFIG, args: ['--model', 'gpt-5.5-codex'] });
    cleanups.push(() => void session.dispose().catch(() => void 0));

    expect(lastArgs().slice(2)).toEqual(['--model', 'gpt-5.5-codex']);
  });

  it('notify appendado (com sufixo JSON do Codex) vira idle; dedupe', async () => {
    const { adapter, lastArgs } = makeHarness();
    const session = await adapter.spawn(CONFIG);
    cleanups.push(() => void session.dispose().catch(() => void 0));
    const statusPath = lastArgs()[1]!.match(/echo idle>> (.+session\.status)/)![1]!;

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
    const statusPath = lastArgs()[1]!.match(/echo idle>> (.+session\.status)/)![1]!;

    const seen: AgentStatus[] = [];
    session.onStatus((s) => seen.push(s));

    session.write('gere os testes');
    expect(seen).toEqual([]); // digitação não dispara
    session.write('\r');
    expect(seen).toEqual(['working']);
    expect(ptys[0]!.written).toEqual(['gere os testes', '\r']);

    appendFileSync(statusPath, 'idle {"json":1}\n');
    await new Promise((r) => setTimeout(r, 200));
    expect(seen).toEqual(['working', 'idle']);
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
