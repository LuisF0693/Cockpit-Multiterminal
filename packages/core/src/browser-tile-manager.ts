import { ulid } from './ulid';
import type { PersistedBrowserTile, StateStore } from './state-store/types';
import type { WriteQueue } from './state-store/write-queue';

export type BrowserTile = PersistedBrowserTile;

export type BrowserTileEvent =
  | { type: 'created'; tile: BrowserTile }
  | { type: 'updated'; tile: BrowserTile }
  | { type: 'removed'; tile: BrowserTile };

export type BrowserTileListener = (event: BrowserTileEvent) => void;

/**
 * BrowserTileManager (Épico 10, FR28) — entidade do tile de preview de
 * browser (URL atual + projeto). Mesmo princípio do TaskManager/
 * TerminalLinkManager: estado vivo + persistência juntos. A POSIÇÃO/tamanho
 * no canvas usa o `LayoutTile`/`persistLayout` já existente (id genérico) —
 * este manager não sabe de x/y/width/height.
 */
export class BrowserTileManager {
  private readonly tiles = new Map<string, BrowserTile>();
  private readonly listeners = new Set<BrowserTileListener>();

  constructor(
    private readonly store: StateStore,
    private readonly queue: WriteQueue
  ) {}

  /** Carrega tiles persistidos (chamar uma vez no boot). */
  load(): void {
    for (const t of this.store.listBrowserTiles()) this.tiles.set(t.id, t);
  }

  create(opts: { url: string; projectId: string | null }): BrowserTile {
    const record: BrowserTile = { id: ulid(), createdAt: Date.now(), ...opts };
    this.tiles.set(record.id, record);
    this.queue.push(() => this.store.createBrowserTile(record));
    this.emit({ type: 'created', tile: record });
    return record;
  }

  updateUrl(id: string, url: string): BrowserTile | null {
    const tile = this.tiles.get(id);
    if (!tile) return null;
    const updated: BrowserTile = { ...tile, url };
    this.tiles.set(id, updated);
    this.queue.push(() => this.store.updateBrowserTileUrl(id, url));
    this.emit({ type: 'updated', tile: updated });
    return updated;
  }

  remove(id: string): void {
    const tile = this.tiles.get(id);
    if (!tile) return;
    this.tiles.delete(id);
    this.queue.push(() => this.store.removeBrowserTile(id));
    this.emit({ type: 'removed', tile });
  }

  get(id: string): BrowserTile | null {
    return this.tiles.get(id) ?? null;
  }

  list(): BrowserTile[] {
    return [...this.tiles.values()].sort((a, b) => a.createdAt - b.createdAt);
  }

  onEvent(listener: BrowserTileListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: BrowserTileEvent): void {
    for (const listener of this.listeners) listener(event);
  }
}
