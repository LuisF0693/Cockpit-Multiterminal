import { ulid } from './ulid';
import type { PersistedTerminalLink, StateStore, TerminalLinkMode } from './state-store/types';
import type { WriteQueue } from './state-store/write-queue';

export type TerminalLink = PersistedTerminalLink;

export type TerminalLinkEvent =
  | { type: 'created'; link: TerminalLink }
  | { type: 'removed'; link: TerminalLink }
  | { type: 'updated'; link: TerminalLink };

export type TerminalLinkListener = (event: TerminalLinkEvent) => void;

/**
 * TerminalLinkManager (Épico 9, FR25) — vínculo direto entre dois terminais,
 * independente de tarefa. Mesmo princípio do TaskManager (5.1): estado vivo
 * + persistência juntos, sem recurso externo (PTY) a orquestrar.
 */
export class TerminalLinkManager {
  private readonly links = new Map<string, TerminalLink>();
  private readonly listeners = new Set<TerminalLinkListener>();

  constructor(
    private readonly store: StateStore,
    private readonly queue: WriteQueue
  ) {}

  /** Carrega vínculos persistidos (chamar uma vez no boot). */
  load(): void {
    for (const l of this.store.listTerminalLinks()) this.links.set(l.id, l);
  }

  /**
   * Cria um vínculo (AC1/AC2 da 9.1) — múltiplos vínculos de saída/entrada
   * por terminal são permitidos (sem checagem de duplicidade/unicidade).
   */
  create(opts: {
    sourceId: string;
    targetId: string;
    mode: TerminalLinkMode;
    projectId: string | null;
  }): TerminalLink {
    if (opts.sourceId === opts.targetId) {
      throw new Error('um terminal não pode se vincular a si mesmo');
    }
    const record: TerminalLink = { id: ulid(), createdAt: Date.now(), ...opts };
    this.links.set(record.id, record);
    this.queue.push(() => this.store.createTerminalLink(record));
    this.emit({ type: 'created', link: record });
    return record;
  }

  remove(id: string): void {
    const link = this.links.get(id);
    if (!link) return;
    this.links.delete(id);
    this.queue.push(() => this.store.removeTerminalLink(id));
    this.emit({ type: 'removed', link });
  }

  /** Troca manual↔auto (Story 16.2) — id inexistente é no-op silencioso. */
  setMode(id: string, mode: TerminalLinkMode): TerminalLink | null {
    const link = this.links.get(id);
    if (!link || link.mode === mode) return link ?? null;
    const updated: TerminalLink = { ...link, mode };
    this.links.set(id, updated);
    this.queue.push(() => this.store.updateTerminalLinkMode(id, mode));
    this.emit({ type: 'updated', link: updated });
    return updated;
  }

  /** Remove todo vínculo que referencia um terminal fechado/excluído (AC3 da 9.1). */
  removeForTerminal(terminalId: string): TerminalLink[] {
    const affected = [...this.links.values()].filter(
      (l) => l.sourceId === terminalId || l.targetId === terminalId
    );
    for (const l of affected) this.remove(l.id);
    return affected;
  }

  list(): TerminalLink[] {
    return [...this.links.values()].sort((a, b) => a.createdAt - b.createdAt);
  }

  onEvent(listener: TerminalLinkListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: TerminalLinkEvent): void {
    for (const listener of this.listeners) listener(event);
  }
}
