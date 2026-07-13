import { describe, expect, it, vi } from 'vitest';
import { PtySessionManager, type PtyLike, type PtySpawnOptions } from './session-manager';

/** Fake de PTY: registra chamadas e simula exit síncrono no kill. */
function makeFakePty(pid: number): PtyLike & {
  written: string[];
  resizes: Array<[number, number]>;
  killed: boolean;
  pausedCount: number;
  resumedCount: number;
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
    pausedCount: 0,
    resumedCount: 0,
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
    pause() {
      fake.pausedCount++;
    },
    resume() {
      fake.resumedCount++;
    },
    emitData: (d: string) => dataCbs.forEach((cb) => cb(d)),
    emitExit: (code: number) => exitCbs.forEach((cb) => cb({ exitCode: code }))
  };
  return fake;
}

function makeManager(): {
  manager: PtySessionManager;
  spawned: Array<ReturnType<typeof makeFakePty>>;
  spawnOpts: PtySpawnOptions[];
} {
  const spawned: Array<ReturnType<typeof makeFakePty>> = [];
  const spawnOpts: PtySpawnOptions[] = [];
  // pids fake fora do range de processos reais não são garantidos — o teste
  // de dispose usa um pid inexistente alto para isPidAlive === false.
  let nextPid = 999_990;
  const manager = new PtySessionManager((opts) => {
    spawnOpts.push(opts);
    const fake = makeFakePty(nextPid++);
    spawned.push(fake);
    return fake;
  }, 10 /* grace curto nos testes */);
  return { manager, spawned, spawnOpts };
}

describe('PtySessionManager', () => {
  it('create gera ids únicos e usa shell default com cols/rows pedidos', () => {
    const { manager, spawnOpts } = makeManager();
    const a = manager.create({ cols: 80, rows: 24 });
    const b = manager.create({ cols: 120, rows: 30 });

    expect(a.id).not.toBe(b.id);
    expect(spawnOpts[0]).toMatchObject({ shell: 'powershell.exe', cols: 80, rows: 24 });
    expect(spawnOpts[1]).toMatchObject({ cols: 120, rows: 30 });
  });

  it('write/resize/pause/resume roteiam para a sessão certa', () => {
    const { manager, spawned } = makeManager();
    const a = manager.create({ cols: 80, rows: 24 });
    const b = manager.create({ cols: 80, rows: 24 });

    manager.write(a.id, 'ls\r');
    manager.resize(b.id, 100, 40);
    manager.pause(a.id);
    manager.resume(a.id);

    expect(spawned[0]!.written).toEqual(['ls\r']);
    expect(spawned[1]!.written).toEqual([]);
    expect(spawned[1]!.resizes).toEqual([[100, 40]]);
    expect(spawned[0]!.pausedCount).toBe(1);
    expect(spawned[0]!.resumedCount).toBe(1);
  });

  it('onData entrega chunks da sessão', () => {
    const { manager, spawned } = makeManager();
    const a = manager.create({ cols: 80, rows: 24 });
    const received: string[] = [];
    manager.onData(a.id, (d) => received.push(d));

    spawned[0]!.emitData('hello');
    expect(received).toEqual(['hello']);
  });

  it('dispose mata o PTY e reporta orphan=false para pid morto', async () => {
    const { manager, spawned } = makeManager();
    const a = manager.create({ cols: 80, rows: 24 });

    const { orphan } = await manager.dispose(a.id);

    expect(spawned[0]!.killed).toBe(true);
    expect(orphan).toBe(false);
    expect(manager.has(a.id)).toBe(false);
  });

  it('dispose de sessão já encerrada (exit natural) não chama kill de novo', async () => {
    const { manager, spawned } = makeManager();
    const a = manager.create({ cols: 80, rows: 24 });
    spawned[0]!.emitExit(0); // shell saiu sozinho

    const killSpy = vi.spyOn(spawned[0]!, 'kill');
    await manager.dispose(a.id);
    expect(killSpy).not.toHaveBeenCalled();
  });

  it('dispose de id desconhecido é no-op seguro', async () => {
    const { manager } = makeManager();
    await expect(manager.dispose('pty-nope')).resolves.toEqual({ orphan: false });
  });

  it('operar sessão inexistente lança erro claro', () => {
    const { manager } = makeManager();
    expect(() => manager.write('pty-x', 'a')).toThrow(/Sessão PTY desconhecida/);
  });

  it('disposeAll encerra todas as sessões', async () => {
    const { manager, spawned } = makeManager();
    manager.create({ cols: 80, rows: 24 });
    manager.create({ cols: 80, rows: 24 });

    const { orphans } = await manager.disposeAll();

    expect(orphans).toEqual([]);
    expect(spawned.every((s) => s.killed)).toBe(true);
  });
});
