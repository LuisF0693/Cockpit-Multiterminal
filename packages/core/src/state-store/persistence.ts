import type { LayoutTile, SessionEvent } from '@cockpit/shared';
import { ulid } from '../ulid';
import type { SessionRegistry } from '../session-registry';
import type { StateStore } from './types';
import type { WriteQueue } from './write-queue';

/**
 * PersistenceManager — liga SessionRegistry + layout ao StateStore via
 * WriteQueue (persistência contínua, AC1) e planeja o restore do boot (AC2).
 * Regras: closed → arquivar (não volta no boot); exited → status persiste
 * mas a sessão É restaurada (novo shell no mesmo cwd); nada é destruído.
 */
export class PersistenceManager {
  constructor(
    private readonly store: StateStore,
    private readonly queue: WriteQueue
  ) {}

  /** Persiste eventos de domínio do registry (chamar uma vez no boot). */
  wire(registry: SessionRegistry): () => void {
    return registry.onEvent((event: SessionEvent) => {
      const s = event.session;
      this.queue.push(() => {
        switch (event.type) {
          case 'created':
            this.store.upsertTerminal({
              id: s.id,
              name: s.name,
              cwd: s.cwd,
              status: s.status,
              tile: null,
              createdAt: s.createdAt,
              archivedAt: null
            });
            break;
          case 'renamed':
            this.store.upsertTerminal({
              id: s.id,
              name: s.name,
              cwd: s.cwd,
              status: s.status,
              tile: null,
              createdAt: s.createdAt,
              archivedAt: null
            });
            break;
          case 'exited':
            this.store.setTerminalStatus(s.id, 'exited');
            break;
          case 'closed':
            this.store.archiveTerminal(s.id, Date.now());
            break;
        }
        this.store.appendEvent({
          id: ulid(),
          ts: Date.now(),
          origin: 'system',
          type: `terminal.${event.type}`,
          terminalId: s.id,
          payload: { name: s.name, cwd: s.cwd }
        });
      });
    });
  }

  /** Layout do canvas (debounced no renderer) → tiles persistidos. */
  persistLayout(tiles: LayoutTile[]): void {
    this.queue.push(() => {
      for (const tile of tiles) this.store.updateTile(tile.id, tile);
    });
  }

  savedLayout(): LayoutTile[] {
    return this.store
      .listActiveTerminals()
      .flatMap((t) => (t.tile ? [{ ...t.tile, id: t.id }] : []));
  }

  /**
   * Restore do boot (AC2): relança cada terminal ativo no mesmo cwd com o
   * mesmo id/nome. Falhas individuais arquivam a sessão (nunca destroem) e
   * não derrubam o restante.
   */
  async restore(registry: SessionRegistry): Promise<{ restored: number; archived: number }> {
    let restored = 0;
    let archived = 0;
    for (const t of this.store.listActiveTerminals()) {
      try {
        await registry.create({
          id: t.id,
          name: t.name,
          cwd: t.cwd,
          cols: 80,
          rows: 24,
          restore: true
        });
        restored++;
      } catch {
        this.queue.push(() => this.store.archiveTerminal(t.id, Date.now()));
        archived++;
      }
    }
    return { restored, archived };
  }

  /** clean_shutdown (FR12): '0' no boot; '1' somente no exit gracioso. */
  markBootStart(): { cleanShutdown: boolean } {
    const prev = this.store.getMeta('clean_shutdown');
    this.store.setMeta('clean_shutdown', '0');
    return { cleanShutdown: prev !== '0' };
  }

  markCleanShutdown(): void {
    this.queue.flush();
    this.store.setMeta('clean_shutdown', '1');
  }
}
