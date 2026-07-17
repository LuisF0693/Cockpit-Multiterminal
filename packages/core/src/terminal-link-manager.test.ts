import { describe, expect, it } from 'vitest';
import { MemoryStateStore } from './state-store/memory-state-store';
import { WriteQueue } from './state-store/write-queue';
import { TerminalLinkManager } from './terminal-link-manager';

function makeHarness(): { store: MemoryStateStore; queue: WriteQueue; manager: TerminalLinkManager } {
  const store = new MemoryStateStore();
  store.init();
  const queue = new WriteQueue((batch) => batch.forEach((op) => op()), { flushMs: 5 });
  const manager = new TerminalLinkManager(store, queue);
  return { store, queue, manager };
}

describe('TerminalLinkManager (Épico 9, Story 9.1, FR25)', () => {
  it('create() persiste e emite created (AC1)', () => {
    const { store, queue, manager } = makeHarness();
    const events: string[] = [];
    manager.onEvent((e) => events.push(e.type));

    const link = manager.create({ sourceId: 'a', targetId: 'b', mode: 'auto', projectId: 'p1' });
    queue.flush();

    expect(link.sourceId).toBe('a');
    expect(link.targetId).toBe('b');
    expect(link.mode).toBe('auto');
    expect(events).toEqual(['created']);
    expect(store.terminalLinks.get(link.id)).toMatchObject({ sourceId: 'a', targetId: 'b' });
  });

  it('rejeita vínculo de um terminal consigo mesmo', () => {
    const { manager } = makeHarness();
    expect(() => manager.create({ sourceId: 'a', targetId: 'a', mode: 'manual', projectId: null })).toThrow();
  });

  it('permite múltiplos vínculos de saída e de entrada para o mesmo terminal (AC2)', () => {
    const { manager } = makeHarness();
    manager.create({ sourceId: 'a', targetId: 'b', mode: 'manual', projectId: null });
    manager.create({ sourceId: 'a', targetId: 'c', mode: 'manual', projectId: null }); // 2 saídas de 'a'
    manager.create({ sourceId: 'd', targetId: 'b', mode: 'manual', projectId: null }); // 2 entradas em 'b'

    const links = manager.list();
    expect(links.filter((l) => l.sourceId === 'a')).toHaveLength(2);
    expect(links.filter((l) => l.targetId === 'b')).toHaveLength(2);
  });

  it('remove() persiste e emite removed', () => {
    const { store, queue, manager } = makeHarness();
    const link = manager.create({ sourceId: 'a', targetId: 'b', mode: 'manual', projectId: null });
    queue.flush();

    const events: string[] = [];
    manager.onEvent((e) => events.push(e.type));
    manager.remove(link.id);
    queue.flush();

    expect(events).toEqual(['removed']);
    expect(store.terminalLinks.has(link.id)).toBe(false);
    expect(manager.list()).toHaveLength(0);
  });

  it('removeForTerminal() remove todo vínculo que referencia o terminal, como source OU target (AC3)', () => {
    const { manager } = makeHarness();
    manager.create({ sourceId: 'a', targetId: 'b', mode: 'manual', projectId: null }); // a→b
    manager.create({ sourceId: 'c', targetId: 'a', mode: 'auto', projectId: null }); // c→a
    manager.create({ sourceId: 'x', targetId: 'y', mode: 'manual', projectId: null }); // não afetado

    const removed = manager.removeForTerminal('a');

    expect(removed).toHaveLength(2);
    expect(manager.list()).toHaveLength(1);
    expect(manager.list()[0]).toMatchObject({ sourceId: 'x', targetId: 'y' });
  });

  it('setMode() alterna manual↔auto, persiste e emite updated (Story 16.2)', () => {
    const { store, queue, manager } = makeHarness();
    const link = manager.create({ sourceId: 'a', targetId: 'b', mode: 'manual', projectId: null });
    queue.flush();

    const events: string[] = [];
    manager.onEvent((e) => events.push(e.type));
    const updated = manager.setMode(link.id, 'auto');
    queue.flush();

    expect(updated).toMatchObject({ id: link.id, mode: 'auto' });
    expect(events).toEqual(['updated']);
    expect(store.terminalLinks.get(link.id)?.mode).toBe('auto');
    expect(manager.list()[0]?.mode).toBe('auto');
  });

  it('setMode() é no-op silencioso em modo igual ou id inexistente (Story 16.2)', () => {
    const { manager } = makeHarness();
    const link = manager.create({ sourceId: 'a', targetId: 'b', mode: 'auto', projectId: null });

    const events: string[] = [];
    manager.onEvent((e) => events.push(e.type));

    expect(manager.setMode(link.id, 'auto')).toMatchObject({ id: link.id, mode: 'auto' });
    expect(manager.setMode('nao-existe', 'manual')).toBeNull();
    expect(events).toEqual([]);
  });

  it('load() restaura vínculos persistidos no boot', () => {
    const { store } = makeHarness();
    store.createTerminalLink({ id: 'l1', sourceId: 'a', targetId: 'b', mode: 'auto', projectId: 'p1', createdAt: 1 });

    const queue2 = new WriteQueue((batch) => batch.forEach((op) => op()), { flushMs: 5 });
    const manager2 = new TerminalLinkManager(store, queue2);
    manager2.load();

    expect(manager2.list()).toHaveLength(1);
    expect(manager2.list()[0]).toMatchObject({ id: 'l1', sourceId: 'a', targetId: 'b' });
  });
});
