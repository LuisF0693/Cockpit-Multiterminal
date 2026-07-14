import type { LayoutTile } from '@cockpit/shared';
import type { PersistedEvent, PersistedTask, PersistedTerminal, StateStore, TaskState } from './types';

/**
 * Implementação em memória — testes vitest (Node) nunca importam
 * better-sqlite3 (rebuildado p/ ABI do Electron). Mesmo contrato.
 */
export class MemoryStateStore implements StateStore {
  readonly terminals = new Map<string, PersistedTerminal>();
  readonly meta = new Map<string, string>();
  readonly events: PersistedEvent[] = [];
  readonly tasks = new Map<string, PersistedTask>();

  init(): void {
    this.meta.set('schema_version', '1');
  }

  upsertTerminal(t: PersistedTerminal): void {
    const prev = this.terminals.get(t.id);
    this.terminals.set(t.id, {
      ...t,
      adapterId: t.adapterId || prev?.adapterId || 'shell',
      workspace: t.workspace || prev?.workspace || 'Geral',
      tile: t.tile ?? prev?.tile ?? null
    });
  }

  setTerminalStatus(id: string, status: PersistedTerminal['status']): void {
    const t = this.terminals.get(id);
    if (t) this.terminals.set(id, { ...t, status });
  }

  archiveTerminal(id: string, at: number): void {
    const t = this.terminals.get(id);
    if (t) this.terminals.set(id, { ...t, archivedAt: at });
  }

  updateTile(id: string, tile: LayoutTile): void {
    const t = this.terminals.get(id);
    if (t) this.terminals.set(id, { ...t, tile });
  }

  listActiveTerminals(): PersistedTerminal[] {
    return [...this.terminals.values()]
      .filter((t) => t.archivedAt === null)
      .sort((a, b) => a.createdAt - b.createdAt);
  }

  getTerminal(id: string): PersistedTerminal | null {
    return this.terminals.get(id) ?? null;
  }

  renameWorkspace(from: string, to: string): void {
    for (const [id, t] of this.terminals) {
      if (t.workspace === from) this.terminals.set(id, { ...t, workspace: to });
    }
  }

  countEvents(opts: { terminalId?: string; type?: string }): number {
    return this.events.filter(
      (e) => (!opts.terminalId || e.terminalId === opts.terminalId) && (!opts.type || e.type === opts.type)
    ).length;
  }

  setMeta(key: string, value: string): void {
    this.meta.set(key, value);
  }

  getMeta(key: string): string | null {
    return this.meta.get(key) ?? null;
  }

  appendEvent(event: PersistedEvent): void {
    this.events.push(event);
  }

  listEvents(opts: { limit: number; terminalId?: string; type?: string }): PersistedEvent[] {
    return this.events
      .filter((e) => (!opts.terminalId || e.terminalId === opts.terminalId) && (!opts.type || e.type === opts.type))
      .sort((a, b) => b.ts - a.ts)
      .slice(0, opts.limit);
  }

  createTask(t: PersistedTask): void {
    this.tasks.set(t.id, t);
  }

  updateTask(id: string, patch: { title?: string; description?: string; state?: TaskState; updatedAt: number }): void {
    const t = this.tasks.get(id);
    if (!t) return;
    this.tasks.set(id, {
      ...t,
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.state !== undefined ? { state: patch.state } : {}),
      updatedAt: patch.updatedAt
    });
  }

  listTasks(): PersistedTask[] {
    return [...this.tasks.values()].sort((a, b) => a.createdAt - b.createdAt);
  }

  getTask(id: string): PersistedTask | null {
    return this.tasks.get(id) ?? null;
  }

  close(): void {
    // nada a liberar em memória
  }
}
