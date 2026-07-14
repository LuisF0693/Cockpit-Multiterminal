import type { LayoutTile, SessionEvent, SessionReport } from '@cockpit/shared';
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
          case 'renamed':
            this.store.upsertTerminal({
              id: s.id,
              name: s.name,
              cwd: s.cwd,
              status: s.status,
              adapterId: s.adapterId,
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
          case 'status':
            // agentStatus segue transiente na tabela terminals (Dev Notes 2.1);
            // a TRILHA registra a transição (relatório 3.5 + AC1 da 3.3).
            this.store.appendEvent({
              id: ulid(),
              ts: Date.now(),
              origin: 'agent',
              type: 'status.changed',
              terminalId: s.id,
              payload: { status: s.agentStatus }
            });
            return;
        }
        this.store.appendEvent({
          id: ulid(),
          ts: Date.now(),
          origin: 'system',
          type: `terminal.${event.type}`,
          terminalId: s.id,
          payload: {
            name: s.name,
            cwd: s.cwd,
            ...(event.type === 'exited' && s.exitCode !== undefined ? { exitCode: s.exitCode } : {})
          }
        });
      });
    });
  }

  /** Instrução enviada via master (Story 3.2, AC3) — trilha auditável. */
  recordInstruction(sessionId: string, text: string): void {
    this.queue.push(() =>
      this.store.appendEvent({
        id: ulid(),
        ts: Date.now(),
        origin: 'human',
        type: 'instruction.sent',
        terminalId: sessionId,
        payload: { text: text.slice(0, 500), via: 'master' }
      })
    );
  }

  /** Layout do canvas (debounced no renderer) → tiles persistidos. */
  persistLayout(tiles: LayoutTile[]): void {
    this.queue.push(() => {
      for (const tile of tiles) this.store.updateTile(tile.id, tile);
    });
  }

  /** Timeline (3.3): flush dos pendentes antes de ler (frescor). */
  timeline(opts: { limit: number; terminalId?: string; type?: string }): ReturnType<StateStore['listEvents']> {
    this.queue.flush();
    return this.store.listEvents(opts);
  }

  /**
   * Relatório de sessão (3.5): projeção da linha do terminal + contagens da
   * trilha — nenhuma tabela nova. Duração corre até agora enquanto viva.
   */
  sessionReport(terminalId: string): SessionReport | null {
    this.queue.flush();
    const t = this.store.getTerminal(terminalId);
    if (!t) return null;
    const exited = this.store.listEvents({ limit: 1, terminalId, type: 'terminal.exited' })[0];
    const exitCode = exited?.payload['exitCode'];
    return {
      terminalId: t.id,
      name: t.name,
      adapterId: t.adapterId,
      cwd: t.cwd,
      createdAt: t.createdAt,
      endedAt: t.archivedAt,
      durationMs: Math.max(0, (t.archivedAt ?? Date.now()) - t.createdAt),
      statusTransitions: this.store.countEvents({ terminalId, type: 'status.changed' }),
      instructions: this.store.countEvents({ terminalId, type: 'instruction.sent' }),
      recoveries: this.store.countEvents({ terminalId, type: 'session.recovered' }),
      exitCode: typeof exitCode === 'number' ? exitCode : null
    };
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
          adapterId: t.adapterId,
          cols: 80,
          rows: 24,
          restore: true
        });
        this.queue.push(() =>
          this.store.appendEvent({
            id: ulid(),
            ts: Date.now(),
            origin: 'system',
            type: 'session.recovered',
            terminalId: t.id,
            payload: { name: t.name, cwd: t.cwd, adapterId: t.adapterId }
          })
        );
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
