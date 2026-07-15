import type { LayoutTile, TaskRole } from '@cockpit/shared';
import type {
  PersistedBrowserTile,
  PersistedEvent,
  PersistedTask,
  PersistedTerminal,
  PersistedTerminalLink,
  StateStore,
  TaskState
} from './types';

/**
 * Implementação em memória — testes vitest (Node) nunca importam
 * better-sqlite3 (rebuildado p/ ABI do Electron). Mesmo contrato.
 */
export class MemoryStateStore implements StateStore {
  readonly terminals = new Map<string, PersistedTerminal>();
  readonly meta = new Map<string, string>();
  readonly events: PersistedEvent[] = [];
  readonly tasks = new Map<string, PersistedTask>();
  readonly terminalLinks = new Map<string, PersistedTerminalLink>();
  readonly browserTiles = new Map<string, PersistedBrowserTile>();

  init(): void {
    this.meta.set('schema_version', '1');
  }

  upsertTerminal(t: PersistedTerminal): void {
    const prev = this.terminals.get(t.id);
    this.terminals.set(t.id, {
      ...t,
      adapterId: t.adapterId || prev?.adapterId || 'shell',
      workspace: t.workspace || prev?.workspace || 'Geral',
      taskId: t.taskId ?? null,
      taskRole: t.taskRole ?? null,
      projectId: t.projectId ?? null,
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

  setTerminalTask(id: string, taskId: string | null, role?: TaskRole | null): void {
    const t = this.terminals.get(id);
    if (t) this.terminals.set(id, { ...t, taskId, taskRole: taskId === null ? null : (role ?? null) });
  }

  backfillProjectId(projectId: string): void {
    for (const [id, t] of this.terminals) {
      if (t.projectId === null) this.terminals.set(id, { ...t, projectId });
    }
    for (const [id, t] of this.tasks) {
      if (t.projectId === null) this.tasks.set(id, { ...t, projectId });
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

  createTerminalLink(l: PersistedTerminalLink): void {
    this.terminalLinks.set(l.id, l);
  }

  removeTerminalLink(id: string): void {
    this.terminalLinks.delete(id);
  }

  listTerminalLinks(): PersistedTerminalLink[] {
    return [...this.terminalLinks.values()].sort((a, b) => a.createdAt - b.createdAt);
  }

  createBrowserTile(t: PersistedBrowserTile): void {
    this.browserTiles.set(t.id, t);
  }

  updateBrowserTileUrl(id: string, url: string): void {
    const t = this.browserTiles.get(id);
    if (t) this.browserTiles.set(id, { ...t, url });
  }

  removeBrowserTile(id: string): void {
    this.browserTiles.delete(id);
  }

  listBrowserTiles(): PersistedBrowserTile[] {
    return [...this.browserTiles.values()].sort((a, b) => a.createdAt - b.createdAt);
  }

  close(): void {
    // nada a liberar em memória
  }
}
