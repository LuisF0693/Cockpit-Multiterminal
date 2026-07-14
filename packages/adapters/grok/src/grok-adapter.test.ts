import { describe, expect, it } from 'vitest';
import type { AgentStatus } from '@cockpit/shared';
import { GrokAdapter, type GrokPtyLike, type GrokSpawnFn } from './grok-adapter';

function makeFakePty(pid = 999_950): GrokPtyLike & {
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

function makeHarness(which: string | null = 'C:/npm/grok.ps1'): {
  adapter: GrokAdapter;
  ptys: Array<ReturnType<typeof makeFakePty>>;
} {
  const ptys: Array<ReturnType<typeof makeFakePty>> = [];
  const spawnFn: GrokSpawnFn = () => {
    const fake = makeFakePty();
    ptys.push(fake);
    return fake;
  };
  return { adapter: new GrokAdapter(spawnFn, () => which, 'grok.cmd', 10), ptys };
}

const CONFIG = { cwd: 'C:/work', cols: 80, rows: 24 };

describe('GrokAdapter (Story 2.4)', () => {
  it('identidade output-parsing + availability com razão clara', async () => {
    const { adapter } = makeHarness();
    expect(adapter.id).toBe('grok');
    expect(adapter.statusStrategy).toBe('output-parsing');
    await expect(adapter.detectAvailability()).resolves.toMatchObject({ available: true });

    const missing = makeHarness(null);
    const result = await missing.adapter.detectAvailability();
    expect(result.available).toBe(false);
    expect(result.reason).toMatch(/distribuição/);
  });

  it('heurística de input: Enter → working (com dedupe)', async () => {
    const { adapter } = makeHarness();
    const session = await adapter.spawn(CONFIG);
    const seen: AgentStatus[] = [];
    session.onStatus((s) => seen.push(s));

    session.write('analise o repo');
    session.write('\r');
    session.write('outra\r');
    expect(seen).toEqual(['working']);
  });

  it('exit mapeia done/error', async () => {
    const a = makeHarness();
    const b = makeHarness();
    const sa = await a.adapter.spawn(CONFIG);
    const sb = await b.adapter.spawn(CONFIG);
    const seenA: AgentStatus[] = [];
    const seenB: AgentStatus[] = [];
    sa.onStatus((s) => seenA.push(s));
    sb.onStatus((s) => seenB.push(s));

    a.ptys[0]!.emitExit(0);
    b.ptys[0]!.emitExit(3);
    expect(seenA).toContain('done');
    expect(seenB).toContain('error');
  });

  it('dispose mata e resolve', async () => {
    const { adapter, ptys } = makeHarness();
    const session = await adapter.spawn(CONFIG);
    await expect(session.dispose()).resolves.toBeUndefined();
    expect(ptys[0]!.killed).toBe(true);
  });
});
