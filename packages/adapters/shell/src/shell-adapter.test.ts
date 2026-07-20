import { describe, expect, it } from 'vitest';
import type { AgentStatus } from '@cockpit/shared';
import { ShellAdapter, type ShellPtyLike, type ShellSpawnFn } from './shell-adapter';

function makeFakePty(pid = 999_991): ShellPtyLike & {
  written: string[];
  resizes: Array<[number, number]>;
  killed: boolean;
  emitData: (d: string) => void;
  emitExit: (code: number) => void;
} {
  const dataCbs: Array<(d: string) => void> = [];
  const exitCbs: Array<(e: { exitCode: number }) => void> = [];
  const fake = {
    pid,
    written: [] as string[],
    resizes: [] as Array<[number, number]>,
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
    resize(cols: number, rows: number) {
      fake.resizes.push([cols, rows]);
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

function makeAdapter(shell = 'powershell.exe', id?: string, displayName?: string): {
  adapter: ShellAdapter;
  ptys: Array<ReturnType<typeof makeFakePty>>;
  spawnedShells: string[];
} {
  const ptys: Array<ReturnType<typeof makeFakePty>> = [];
  const spawnedShells: string[] = [];
  const spawnFn: ShellSpawnFn = (spawnedShell) => {
    spawnedShells.push(spawnedShell);
    const fake = makeFakePty(999_990 + ptys.length);
    ptys.push(fake);
    return fake;
  };
  return {
    adapter: new ShellAdapter({
      spawnFn,
      shell,
      graceMs: 10,
      ...(id !== undefined ? { id } : {}),
      ...(displayName !== undefined ? { displayName } : {})
    }),
    ptys,
    spawnedShells
  };
}

const CONFIG = { cwd: 'C:/work', cols: 80, rows: 24 };

describe('ShellAdapter (contrato — Story 2.1)', () => {
  it('expõe identidade e estratégia process-only do contrato', () => {
    const { adapter } = makeAdapter();
    expect(adapter.id).toBe('shell');
    expect(adapter.displayName).toBe('PowerShell');
    expect(adapter.statusStrategy).toBe('process-only');
  });

  it('variante CMD: id/displayName próprios e spawn do cmd.exe', async () => {
    const { adapter, spawnedShells } = makeAdapter('cmd.exe', 'cmd', 'CMD');
    expect(adapter.id).toBe('cmd');
    expect(adapter.displayName).toBe('CMD');
    await adapter.spawn(CONFIG);
    expect(spawnedShells).toEqual(['cmd.exe']);
    await expect(adapter.detectAvailability()).resolves.toMatchObject({ available: true });
  });

  it('detectAvailability aprova o shell default do Windows', async () => {
    const { adapter } = makeAdapter();
    await expect(adapter.detectAvailability()).resolves.toMatchObject({ available: true });
  });

  it('spawn devolve AgentSession com pid e emite working', async () => {
    const { adapter } = makeAdapter();
    const session = await adapter.spawn(CONFIG);
    const statuses: AgentStatus[] = [];
    session.onStatus((s) => statuses.push(s));

    await new Promise((r) => setTimeout(r, 0));
    expect(session.pid).toBe(999_990);
    expect(statuses).toEqual(['working']);
  });

  it('onData entrega chunks como Buffer; write/resize roteiam ao PTY', async () => {
    const { adapter, ptys } = makeAdapter();
    const session = await adapter.spawn(CONFIG);
    const chunks: Buffer[] = [];
    session.onData((c) => chunks.push(c));

    ptys[0]!.emitData('olá');
    session.write('ls\r');
    session.resize(100, 40);

    expect(chunks[0]).toBeInstanceOf(Buffer);
    expect(chunks[0]!.toString('utf8')).toBe('olá');
    expect(ptys[0]!.written).toEqual(['ls\r']);
    expect(ptys[0]!.resizes).toEqual([[100, 40]]);
  });

  it('status process-only: exit 0 → done; exit ≠ 0 → error', async () => {
    const { adapter, ptys } = makeAdapter();
    const a = await adapter.spawn(CONFIG);
    const b = await adapter.spawn(CONFIG);
    const statusesA: AgentStatus[] = [];
    const statusesB: AgentStatus[] = [];
    a.onStatus((s) => statusesA.push(s));
    b.onStatus((s) => statusesB.push(s));

    ptys[0]!.emitExit(0);
    ptys[1]!.emitExit(1);
    await new Promise((r) => setTimeout(r, 0));

    expect(statusesA).toContain('done');
    expect(statusesB).toContain('error');
  });

  it('initialInstruction é enviada no spawn (FR7)', async () => {
    const { adapter, ptys } = makeAdapter();
    await adapter.spawn({ ...CONFIG, initialInstruction: 'npm test' });
    expect(ptys[0]!.written).toEqual(['npm test\r']);
  });

  it('dispose mata o processo e resolve quando pid morre', async () => {
    const { adapter, ptys } = makeAdapter();
    const session = await adapter.spawn(CONFIG);
    await expect(session.dispose()).resolves.toBeUndefined();
    expect(ptys[0]!.killed).toBe(true);
  });

  it('onExit reporta o código de saída', async () => {
    const { adapter, ptys } = makeAdapter();
    const session = await adapter.spawn(CONFIG);
    const codes: Array<number | null> = [];
    session.onExit((c) => codes.push(c));
    ptys[0]!.emitExit(42);
    expect(codes).toEqual([42]);
  });
});

describe('ShellAdapter — args extras (Story 17.3)', () => {
  it('repassa config.args pro spawnFn (modelo/args por sessão)', async () => {
    const seen: string[][] = [];
    const spawnFn: ShellSpawnFn = (_shell, args) => {
      seen.push(args);
      return makeFakePty();
    };
    const adapter = new ShellAdapter({ spawnFn, graceMs: 10 });
    await adapter.spawn({ ...CONFIG, args: ['run', 'algum-comando'] });
    expect(seen).toEqual([['run', 'algum-comando']]);
  });

  it('sem config.args, spawnFn recebe array vazio', async () => {
    const seen: string[][] = [];
    const spawnFn: ShellSpawnFn = (_shell, args) => {
      seen.push(args);
      return makeFakePty();
    };
    const adapter = new ShellAdapter({ spawnFn, graceMs: 10 });
    await adapter.spawn(CONFIG);
    expect(seen).toEqual([[]]);
  });
});
