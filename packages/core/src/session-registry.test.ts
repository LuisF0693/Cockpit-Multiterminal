import { describe, expect, it, vi } from 'vitest';
import type { SessionEvent } from '@cockpit/shared';
import { SessionRegistry, type PtyOps } from './session-registry';

function makeOps(): PtyOps & {
  created: string[];
  closed: string[];
  resizes: Array<[string, number, number]>;
} {
  let seq = 0;
  const state = {
    created: [] as string[],
    closed: [] as string[],
    resizes: [] as Array<[string, number, number]>,
    createPty: vi.fn(async () => {
      const ptyId = `pty-${++seq}`;
      state.created.push(ptyId);
      return { ptyId, pid: 1000 + seq };
    }),
    closePty: vi.fn(async (ptyId: string) => {
      state.closed.push(ptyId);
      return { orphan: false };
    }),
    resizePty: vi.fn((ptyId: string, cols: number, rows: number) => {
      state.resizes.push([ptyId, cols, rows]);
    })
  };
  return state;
}

describe('SessionRegistry', () => {
  it('create registra sessão com ulid único e nome default sequencial', async () => {
    const registry = new SessionRegistry(makeOps());
    const a = await registry.create({ cols: 80, rows: 24 });
    const b = await registry.create({ cols: 80, rows: 24 });

    expect(a.id).not.toBe(b.id);
    expect(a.id).toHaveLength(26);
    expect(a.name).toBe('Terminal 1');
    expect(b.name).toBe('Terminal 2');
    expect(a.status).toBe('running');
    expect(registry.list()).toHaveLength(2);
  });

  it('emite eventos de domínio created/renamed/closed', async () => {
    const registry = new SessionRegistry(makeOps());
    const events: SessionEvent[] = [];
    registry.onEvent((e) => events.push(e));

    const s = await registry.create({ cols: 80, rows: 24, name: 'Build' });
    registry.rename(s.id, 'Build & Test');
    await registry.close(s.id);

    expect(events.map((e) => e.type)).toEqual(['created', 'renamed', 'closed']);
    expect(events[1]!.session.name).toBe('Build & Test');
    expect(events[2]!.session.status).toBe('exited');
  });

  it('close fecha SOMENTE a sessão indicada (AC4)', async () => {
    const ops = makeOps();
    const registry = new SessionRegistry(ops);
    const a = await registry.create({ cols: 80, rows: 24 });
    const b = await registry.create({ cols: 80, rows: 24 });
    const c = await registry.create({ cols: 80, rows: 24 });

    await registry.close(b.id);

    expect(ops.closed).toEqual([registryPty(ops, 2)]);
    expect(registry.has(a.id)).toBe(true);
    expect(registry.has(b.id)).toBe(false);
    expect(registry.has(c.id)).toBe(true);
    expect(registry.list()).toHaveLength(2);
  });

  it('resize roteia para o ptyId da sessão', async () => {
    const ops = makeOps();
    const registry = new SessionRegistry(ops);
    const a = await registry.create({ cols: 80, rows: 24 });

    registry.resize(a.id, 120, 40);
    expect(ops.resizes).toEqual([[registry.ptyIdOf(a.id), 120, 40]]);
  });

  it('markExited marca sessão como exited e emite evento', async () => {
    const registry = new SessionRegistry(makeOps());
    const events: SessionEvent[] = [];
    const a = await registry.create({ cols: 80, rows: 24 });
    registry.onEvent((e) => events.push(e));

    registry.markExited(registry.ptyIdOf(a.id));

    expect(events).toHaveLength(1);
    expect(events[0]!.type).toBe('exited');
    expect(registry.list()[0]!.status).toBe('exited');
  });

  it('operações em sessão desconhecida lançam erro claro', async () => {
    const registry = new SessionRegistry(makeOps());
    expect(() => registry.rename('nope', 'x')).toThrow(/Sessão desconhecida/);
    await expect(registry.close('nope')).rejects.toThrow(/Sessão desconhecida/);
  });

  it('closeAll drena o registro', async () => {
    const ops = makeOps();
    const registry = new SessionRegistry(ops);
    await registry.create({ cols: 80, rows: 24 });
    await registry.create({ cols: 80, rows: 24 });

    await registry.closeAll();
    expect(registry.list()).toHaveLength(0);
    expect(ops.closed).toHaveLength(2);
  });
});

function registryPty(ops: { created: string[] }, n: number): string {
  return ops.created[n - 1]!;
}
