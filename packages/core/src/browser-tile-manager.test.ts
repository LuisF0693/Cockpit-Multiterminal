import { describe, expect, it } from 'vitest';
import { MemoryStateStore } from './state-store/memory-state-store';
import { WriteQueue } from './state-store/write-queue';
import { BrowserTileManager } from './browser-tile-manager';

function makeHarness(): { store: MemoryStateStore; queue: WriteQueue; manager: BrowserTileManager } {
  const store = new MemoryStateStore();
  store.init();
  const queue = new WriteQueue((batch) => batch.forEach((op) => op()), { flushMs: 5 });
  const manager = new BrowserTileManager(store, queue);
  return { store, queue, manager };
}

describe('BrowserTileManager (Épico 10, Story 10.1, FR28)', () => {
  it('create() persiste e emite created', () => {
    const { store, queue, manager } = makeHarness();
    const events: string[] = [];
    manager.onEvent((e) => events.push(e.type));

    const tile = manager.create({ url: 'https://example.com', projectId: 'p1' });
    queue.flush();

    expect(tile.url).toBe('https://example.com');
    expect(events).toEqual(['created']);
    expect(store.browserTiles.get(tile.id)).toMatchObject({ url: 'https://example.com', projectId: 'p1' });
  });

  it('updateUrl() persiste, emite updated e retorna o tile atualizado', () => {
    const { store, queue, manager } = makeHarness();
    const tile = manager.create({ url: 'about:blank', projectId: null });
    queue.flush();

    const events: string[] = [];
    manager.onEvent((e) => events.push(e.type));
    const updated = manager.updateUrl(tile.id, 'https://outro.com');
    queue.flush();

    expect(updated?.url).toBe('https://outro.com');
    expect(events).toEqual(['updated']);
    expect(store.browserTiles.get(tile.id)!.url).toBe('https://outro.com');
  });

  it('updateUrl() em id inexistente retorna null e não emite nada', () => {
    const { manager } = makeHarness();
    const events: string[] = [];
    manager.onEvent((e) => events.push(e.type));
    expect(manager.updateUrl('inexistente', 'https://x.com')).toBeNull();
    expect(events).toEqual([]);
  });

  it('remove() persiste e emite removed', () => {
    const { store, queue, manager } = makeHarness();
    const tile = manager.create({ url: 'about:blank', projectId: null });
    queue.flush();

    const events: string[] = [];
    manager.onEvent((e) => events.push(e.type));
    manager.remove(tile.id);
    queue.flush();

    expect(events).toEqual(['removed']);
    expect(store.browserTiles.has(tile.id)).toBe(false);
    expect(manager.list()).toHaveLength(0);
  });

  it('load() restaura tiles persistidos no boot', () => {
    const { store } = makeHarness();
    store.createBrowserTile({ id: 't1', url: 'https://example.com', projectId: 'p1', createdAt: 1 });

    const queue2 = new WriteQueue((batch) => batch.forEach((op) => op()), { flushMs: 5 });
    const manager2 = new BrowserTileManager(store, queue2);
    manager2.load();

    expect(manager2.list()).toHaveLength(1);
    expect(manager2.get('t1')).toMatchObject({ url: 'https://example.com' });
  });
});
