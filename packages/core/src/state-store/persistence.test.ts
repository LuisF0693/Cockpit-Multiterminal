import { describe, expect, it } from 'vitest';
import { SessionRegistry, type PtyOps } from '../session-registry';
import { MemoryStateStore } from './memory-state-store';
import { PersistenceManager } from './persistence';
import { WriteQueue } from './write-queue';

function makeOps(failFor: Set<string> = new Set()): PtyOps & { createdTags: string[] } {
  let seq = 0;
  const state = {
    createdTags: [] as string[],
    createPty: async ({ sessionId }: { sessionId: string }) => {
      if (failFor.has(sessionId)) throw new Error('cwd inexistente');
      state.createdTags.push(sessionId);
      return { ptyId: `pty-${++seq}`, pid: 1000 + seq };
    },
    closePty: async () => ({ orphan: false }),
    resizePty: () => void 0
  };
  return state;
}

function makeHarness(ops: PtyOps = makeOps()): {
  store: MemoryStateStore;
  queue: WriteQueue;
  manager: PersistenceManager;
  registry: SessionRegistry;
} {
  const store = new MemoryStateStore();
  store.init();
  const queue = new WriteQueue((batch) => batch.forEach((op) => op()), { flushMs: 5 });
  const manager = new PersistenceManager(store, queue);
  const registry = new SessionRegistry(ops);
  manager.wire(registry);
  return { store, queue, manager, registry };
}

describe('PersistenceManager (Story 1.4)', () => {
  it('persiste created/renamed/closed com trilha de eventos', async () => {
    const { store, queue, registry } = makeHarness();

    const s = await registry.create({ cols: 80, rows: 24, name: 'Build', cwd: 'C:/work' });
    registry.rename(s.id, 'Build & Ship');
    await registry.close(s.id);
    queue.flush();

    const row = store.terminals.get(s.id)!;
    expect(row.name).toBe('Build & Ship');
    expect(row.cwd).toBe('C:/work');
    expect(row.archivedAt).not.toBeNull(); // closed → arquivada, não destruída
    expect(store.events.map((e) => e.type)).toEqual([
      'terminal.created',
      'terminal.renamed',
      'terminal.closed'
    ]);
  });

  it('exited persiste status mas mantém a sessão restaurável', async () => {
    const { store, queue, registry } = makeHarness();
    const s = await registry.create({ cols: 80, rows: 24 });
    registry.markExited(registry.ptyIdOf(s.id));
    queue.flush();

    expect(store.terminals.get(s.id)!.status).toBe('exited');
    expect(store.listActiveTerminals().map((t) => t.id)).toEqual([s.id]);
  });

  it('persistLayout grava tiles e savedLayout devolve só ativos', async () => {
    const { store, queue, manager, registry } = makeHarness();
    const a = await registry.create({ cols: 80, rows: 24 });
    const b = await registry.create({ cols: 80, rows: 24 });
    queue.flush();

    manager.persistLayout([
      { id: a.id, x: 8, y: 8, width: 640, height: 400, zIndex: 1 },
      { id: b.id, x: 700, y: 8, width: 480, height: 320, zIndex: 2 }
    ]);
    queue.flush();
    await registry.close(b.id);
    queue.flush();

    const saved = manager.savedLayout();
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ id: a.id, x: 8, width: 640 });
    expect(store.terminals.get(b.id)!.tile).not.toBeNull(); // arquivada preserva tile
  });

  it('restore relança ativos com MESMO id/nome/cwd e injeta scrollback', async () => {
    const first = makeHarness();
    const a = await first.registry.create({ cols: 80, rows: 24, name: 'API', cwd: 'C:/api' });
    const b = await first.registry.create({ cols: 80, rows: 24, name: 'Web', cwd: 'C:/web' });
    first.queue.flush();

    // "reboot": novo registry/ops sobre o MESMO store
    const ops2 = makeOps();
    const registry2 = new SessionRegistry(ops2);
    const manager2 = new PersistenceManager(first.store, first.queue);
    manager2.wire(registry2);

    const result = await manager2.restore(registry2);
    expect(result).toEqual({ restored: 2, archived: 0 });
    expect(ops2.createdTags).toEqual([a.id, b.id]); // ids preservados → scrollback certo
    const restored = registry2.list();
    expect(restored.map((r) => [r.id, r.name, r.cwd])).toEqual([
      [a.id, 'API', 'C:/api'],
      [b.id, 'Web', 'C:/web']
    ]);
  });

  it('restore arquiva (nunca destrói) sessão que falha ao subir', async () => {
    const first = makeHarness();
    const a = await first.registry.create({ cols: 80, rows: 24 });
    const b = await first.registry.create({ cols: 80, rows: 24 });
    first.queue.flush();

    const ops2 = makeOps(new Set([a.id]));
    const registry2 = new SessionRegistry(ops2);
    const manager2 = new PersistenceManager(first.store, first.queue);

    const result = await manager2.restore(registry2);
    first.queue.flush();

    expect(result).toEqual({ restored: 1, archived: 1 });
    expect(first.store.terminals.get(a.id)!.archivedAt).not.toBeNull();
    expect(registry2.list().map((r) => r.id)).toEqual([b.id]);
  });

  it('timeline lê eventos com filtros e flush prévio (Story 3.3)', async () => {
    const { manager, registry } = makeHarness();
    const a = await registry.create({ cols: 80, rows: 24, name: 'A' });
    const b = await registry.create({ cols: 80, rows: 24, name: 'B' });
    manager.recordInstruction(a.id, 'roda os testes');

    // flush interno do timeline() deve enxergar tudo, mesmo sem flush manual
    const all = manager.timeline({ limit: 100 });
    expect(all.map((e) => e.type)).toContain('instruction.sent');
    expect(all.map((e) => e.type).filter((t) => t === 'terminal.created')).toHaveLength(2);

    const onlyA = manager.timeline({ limit: 100, terminalId: a.id });
    expect(onlyA.every((e) => e.terminalId === a.id)).toBe(true);

    const onlyInstr = manager.timeline({ limit: 100, type: 'instruction.sent' });
    expect(onlyInstr).toHaveLength(1);
    expect(onlyInstr[0]!.origin).toBe('human');
    expect(onlyInstr[0]!.terminalId).toBe(a.id);
    expect(b.id).toBeTruthy();
  });

  it('restore registra session.recovered na trilha (Story 3.3)', async () => {
    const first = makeHarness();
    await first.registry.create({ cols: 80, rows: 24, name: 'API' });
    first.queue.flush();

    const registry2 = new SessionRegistry(makeOps());
    const manager2 = new PersistenceManager(first.store, first.queue);
    await manager2.restore(registry2);

    const recovered = manager2.timeline({ limit: 10, type: 'session.recovered' });
    expect(recovered).toHaveLength(1);
    expect(recovered[0]!.payload['name']).toBe('API');
  });

  it('clean_shutdown: boot marca 0, exit gracioso marca 1', () => {
    const { store, manager } = makeHarness();

    const boot1 = manager.markBootStart();
    expect(boot1.cleanShutdown).toBe(true); // primeira execução conta como limpa
    expect(store.getMeta('clean_shutdown')).toBe('0');

    const boot2 = manager.markBootStart(); // "crash": reabriu sem marcar 1
    expect(boot2.cleanShutdown).toBe(false);

    manager.markCleanShutdown();
    expect(store.getMeta('clean_shutdown')).toBe('1');
  });
});
