import type { LayoutTile, TaskRole } from '@cockpit/shared';
import type {
  PersistedBrowserTile,
  PersistedEvent,
  PersistedTask,
  PersistedTerminal,
  PersistedTerminalLink,
  StateStore,
  TaskState,
  TerminalLinkMode
} from './types';

/**
 * Implementação SQLite (better-sqlite3, WAL). O driver é INJETADO pelo Main:
 * better-sqlite3 é rebuildado para a ABI do Electron e não carrega sob Node
 * puro — este módulo nunca o importa (gotcha dual-ABI, Dev Notes da 1.4).
 */

/** Superfície mínima do better-sqlite3 usada aqui (evita a dependência de tipos). */
export interface SqliteDatabase {
  pragma(sql: string): unknown;
  exec(sql: string): unknown;
  prepare(sql: string): SqliteStatement;
  transaction(fn: () => void): () => void;
  close(): void;
}

export interface SqliteStatement {
  run(...params: unknown[]): unknown;
  get(...params: unknown[]): unknown;
  all(...params: unknown[]): unknown[];
}

const SCHEMA_VERSION = '9';

interface TerminalRow {
  id: string;
  name: string;
  cwd: string;
  status: string;
  adapter_id: string;
  workspace: string | null;
  task_id: string | null;
  task_role: string | null;
  project_id: string | null;
  tile_json: string | null;
  created_at: number;
  archived_at: number | null;
}

interface TaskRow {
  id: string;
  title: string;
  description: string;
  state: string;
  created_at: number;
  updated_at: number;
  project_id: string | null;
}

interface TerminalLinkRow {
  id: string;
  source_id: string;
  target_id: string;
  mode: string;
  project_id: string | null;
  created_at: number;
}

interface BrowserTileRow {
  id: string;
  url: string;
  project_id: string | null;
  created_at: number;
}

export class SqliteStateStore implements StateStore {
  constructor(private readonly db: SqliteDatabase) {}

  init(): void {
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('busy_timeout = 3000');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS app_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS terminals (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        cwd TEXT NOT NULL,
        status TEXT NOT NULL,
        tile_json TEXT,
        created_at INTEGER NOT NULL,
        archived_at INTEGER
      );
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        ts INTEGER NOT NULL,
        origin TEXT NOT NULL,
        type TEXT NOT NULL,
        terminal_id TEXT,
        payload_json TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        state TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS terminal_links (
        id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL,
        target_id TEXT NOT NULL,
        mode TEXT NOT NULL,
        project_id TEXT,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS browser_tiles (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        project_id TEXT,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_terminals_active ON terminals (archived_at) WHERE archived_at IS NULL;
      CREATE INDEX IF NOT EXISTS idx_terminal_links_source ON terminal_links (source_id);
      CREATE INDEX IF NOT EXISTS idx_terminal_links_target ON terminal_links (target_id);
      CREATE INDEX IF NOT EXISTS idx_events_ts ON events (ts);
      CREATE INDEX IF NOT EXISTS idx_events_terminal ON events (terminal_id, type);
    `);
    this.migrate();
    this.setMeta('schema_version', SCHEMA_VERSION);
  }

  /** Migrações incrementais guardadas por app_meta.schema_version. */
  private migrate(): void {
    const current = this.getMeta('schema_version');
    // v1 → v2 (Story 2.1): coluna adapter_id; instalações novas já nascem
    // com a coluna via ALTER idempotente (CREATE TABLE acima permanece v1
    // por compatibilidade de leitura — a coluna é o delta).
    const hasAdapterColumn = (
      this.db.prepare(`SELECT COUNT(*) AS n FROM pragma_table_info('terminals') WHERE name = 'adapter_id'`).get() as {
        n: number;
      }
    ).n;
    if (!hasAdapterColumn) {
      this.db.exec(`ALTER TABLE terminals ADD COLUMN adapter_id TEXT NOT NULL DEFAULT 'shell'`);
      if (current === '1') {
        console.log('[state] schema migrado v1 → v2 (adapter_id)');
      }
    }
    // v2 → v3 (Story 3.6): coluna workspace — mesmo padrão do ALTER idempotente.
    const hasWorkspaceColumn = (
      this.db.prepare(`SELECT COUNT(*) AS n FROM pragma_table_info('terminals') WHERE name = 'workspace'`).get() as {
        n: number;
      }
    ).n;
    if (!hasWorkspaceColumn) {
      this.db.exec(`ALTER TABLE terminals ADD COLUMN workspace TEXT NOT NULL DEFAULT 'Geral'`);
      if (current === '2') {
        console.log('[state] schema migrado v2 → v3 (workspace)');
      }
    }
    // v3 → v4 (Story 5.1): tabela tasks é NOVA — CREATE TABLE IF NOT EXISTS
    // acima já cobre instalações antigas e novas; nenhum ALTER necessário.
    // v4 → v5 (Story 5.2): coluna task_id — mesmo padrão do ALTER idempotente.
    const hasTaskIdColumn = (
      this.db.prepare(`SELECT COUNT(*) AS n FROM pragma_table_info('terminals') WHERE name = 'task_id'`).get() as {
        n: number;
      }
    ).n;
    if (!hasTaskIdColumn) {
      this.db.exec(`ALTER TABLE terminals ADD COLUMN task_id TEXT`);
      if (current === '4') {
        console.log('[state] schema migrado v4 → v5 (task_id)');
      }
    }
    // v5 → v6 (Story 7.1): coluna task_role — mesmo padrão do ALTER idempotente.
    const hasTaskRoleColumn = (
      this.db.prepare(`SELECT COUNT(*) AS n FROM pragma_table_info('terminals') WHERE name = 'task_role'`).get() as {
        n: number;
      }
    ).n;
    if (!hasTaskRoleColumn) {
      this.db.exec(`ALTER TABLE terminals ADD COLUMN task_role TEXT`);
      if (current === '5') {
        console.log('[state] schema migrado v5 → v6 (task_role)');
      }
    }
    // v6 → v7 (Story 8.2): coluna project_id em terminals E tasks — mesmo padrão do ALTER idempotente.
    const hasTerminalProjectIdColumn = (
      this.db.prepare(`SELECT COUNT(*) AS n FROM pragma_table_info('terminals') WHERE name = 'project_id'`).get() as {
        n: number;
      }
    ).n;
    if (!hasTerminalProjectIdColumn) {
      this.db.exec(`ALTER TABLE terminals ADD COLUMN project_id TEXT`);
      if (current === '6') {
        console.log('[state] schema migrado v6 → v7 (terminals.project_id)');
      }
    }
    const hasTaskProjectIdColumn = (
      this.db.prepare(`SELECT COUNT(*) AS n FROM pragma_table_info('tasks') WHERE name = 'project_id'`).get() as {
        n: number;
      }
    ).n;
    if (!hasTaskProjectIdColumn) {
      this.db.exec(`ALTER TABLE tasks ADD COLUMN project_id TEXT`);
      if (current === '6') {
        console.log('[state] schema migrado v6 → v7 (tasks.project_id)');
      }
    }
    // v7 → v8 (Épico 9): tabela terminal_links é NOVA — CREATE TABLE IF NOT
    // EXISTS acima já cobre instalações antigas e novas; nenhum ALTER necessário
    // (mesmo caso da tabela tasks na v3→v4).
    // v8 → v9 (Épico 10): tabela browser_tiles é NOVA — mesmo caso acima.
  }

  upsertTerminal(t: PersistedTerminal): void {
    this.db
      .prepare(
        `INSERT INTO terminals (id, name, cwd, status, adapter_id, workspace, task_id, task_role, project_id, tile_json, created_at, archived_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name, cwd = excluded.cwd, status = excluded.status,
           adapter_id = excluded.adapter_id, workspace = excluded.workspace,
           task_id = excluded.task_id, task_role = excluded.task_role,
           project_id = excluded.project_id,
           tile_json = COALESCE(excluded.tile_json, terminals.tile_json),
           archived_at = excluded.archived_at`
      )
      .run(
        t.id,
        t.name,
        t.cwd,
        t.status,
        t.adapterId,
        t.workspace,
        t.taskId,
        t.taskRole,
        t.projectId,
        t.tile ? JSON.stringify(t.tile) : null,
        t.createdAt,
        t.archivedAt
      );
  }

  setTerminalStatus(id: string, status: PersistedTerminal['status']): void {
    this.db.prepare('UPDATE terminals SET status = ? WHERE id = ?').run(status, id);
  }

  archiveTerminal(id: string, at: number): void {
    this.db.prepare('UPDATE terminals SET archived_at = ? WHERE id = ?').run(at, id);
  }

  updateTile(id: string, tile: LayoutTile): void {
    this.db.prepare('UPDATE terminals SET tile_json = ? WHERE id = ?').run(JSON.stringify(tile), id);
  }

  listActiveTerminals(): PersistedTerminal[] {
    const rows = this.db
      .prepare('SELECT * FROM terminals WHERE archived_at IS NULL ORDER BY created_at')
      .all() as TerminalRow[];
    return rows.map((r) => this.rowToTerminal(r));
  }

  private rowToTerminal(r: TerminalRow): PersistedTerminal {
    return {
      id: r.id,
      name: r.name,
      cwd: r.cwd,
      status: r.status === 'exited' ? 'exited' : 'running',
      adapterId: r.adapter_id ?? 'shell',
      workspace: r.workspace ?? 'Geral',
      taskId: r.task_id ?? null,
      taskRole: (r.task_role as TaskRole | null) ?? null,
      projectId: r.project_id ?? null,
      tile: r.tile_json ? (JSON.parse(r.tile_json) as LayoutTile) : null,
      createdAt: r.created_at,
      archivedAt: r.archived_at
    };
  }

  getTerminal(id: string): PersistedTerminal | null {
    const r = this.db.prepare('SELECT * FROM terminals WHERE id = ?').get(id) as TerminalRow | undefined;
    return r ? this.rowToTerminal(r) : null;
  }

  renameWorkspace(from: string, to: string): void {
    this.db.prepare('UPDATE terminals SET workspace = ? WHERE workspace = ?').run(to, from);
  }

  setTerminalTask(id: string, taskId: string | null, role?: TaskRole | null): void {
    // Desvincular (taskId=null) limpa o papel implicitamente — papel sem tarefa não faz sentido.
    this.db
      .prepare('UPDATE terminals SET task_id = ?, task_role = ? WHERE id = ?')
      .run(taskId, taskId === null ? null : (role ?? null), id);
  }

  backfillProjectId(projectId: string): void {
    this.db.prepare('UPDATE terminals SET project_id = ? WHERE project_id IS NULL').run(projectId);
    this.db.prepare('UPDATE tasks SET project_id = ? WHERE project_id IS NULL').run(projectId);
  }

  countEvents(opts: { terminalId?: string; type?: string }): number {
    const where: string[] = [];
    const params: unknown[] = [];
    if (opts.terminalId) {
      where.push('terminal_id = ?');
      params.push(opts.terminalId);
    }
    if (opts.type) {
      where.push('type = ?');
      params.push(opts.type);
    }
    const row = this.db
      .prepare(`SELECT COUNT(*) AS n FROM events ${where.length ? `WHERE ${where.join(' AND ')}` : ''}`)
      .get(...params) as { n: number };
    return row.n;
  }

  setMeta(key: string, value: string): void {
    this.db
      .prepare('INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
      .run(key, value);
  }

  getMeta(key: string): string | null {
    const row = this.db.prepare('SELECT value FROM app_meta WHERE key = ?').get(key) as
      | { value: string }
      | undefined;
    return row?.value ?? null;
  }

  appendEvent(e: PersistedEvent): void {
    this.db
      .prepare('INSERT INTO events (id, ts, origin, type, terminal_id, payload_json) VALUES (?, ?, ?, ?, ?, ?)')
      .run(e.id, e.ts, e.origin, e.type, e.terminalId ?? null, JSON.stringify(e.payload));
  }

  listEvents(opts: { limit: number; terminalId?: string; type?: string }): PersistedEvent[] {
    const where: string[] = [];
    const params: unknown[] = [];
    if (opts.terminalId) {
      where.push('terminal_id = ?');
      params.push(opts.terminalId);
    }
    if (opts.type) {
      where.push('type = ?');
      params.push(opts.type);
    }
    const rows = this.db
      .prepare(
        `SELECT * FROM events ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY ts DESC LIMIT ?`
      )
      .all(...params, opts.limit) as Array<{
      id: string;
      ts: number;
      origin: string;
      type: string;
      terminal_id: string | null;
      payload_json: string;
    }>;
    return rows.map((r) => ({
      id: r.id,
      ts: r.ts,
      origin: (['system', 'agent', 'human'].includes(r.origin) ? r.origin : 'system') as PersistedEvent['origin'],
      type: r.type,
      terminalId: r.terminal_id ?? undefined,
      payload: JSON.parse(r.payload_json) as Record<string, unknown>
    }));
  }

  createTask(t: PersistedTask): void {
    this.db
      .prepare(
        `INSERT INTO tasks (id, title, description, state, created_at, updated_at, project_id) VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(t.id, t.title, t.description, t.state, t.createdAt, t.updatedAt, t.projectId);
  }

  updateTask(id: string, patch: { title?: string; description?: string; state?: TaskState; updatedAt: number }): void {
    const sets: string[] = ['updated_at = ?'];
    const params: unknown[] = [patch.updatedAt];
    if (patch.title !== undefined) {
      sets.push('title = ?');
      params.push(patch.title);
    }
    if (patch.description !== undefined) {
      sets.push('description = ?');
      params.push(patch.description);
    }
    if (patch.state !== undefined) {
      sets.push('state = ?');
      params.push(patch.state);
    }
    params.push(id);
    this.db.prepare(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  }

  listTasks(): PersistedTask[] {
    const rows = this.db.prepare('SELECT * FROM tasks ORDER BY created_at').all() as TaskRow[];
    return rows.map((r) => this.rowToTask(r));
  }

  getTask(id: string): PersistedTask | null {
    const r = this.db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as TaskRow | undefined;
    return r ? this.rowToTask(r) : null;
  }

  private rowToTask(r: TaskRow): PersistedTask {
    return {
      id: r.id,
      title: r.title,
      description: r.description,
      state: r.state as TaskState,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      projectId: r.project_id ?? null
    };
  }

  createTerminalLink(l: PersistedTerminalLink): void {
    this.db
      .prepare(
        `INSERT INTO terminal_links (id, source_id, target_id, mode, project_id, created_at) VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(l.id, l.sourceId, l.targetId, l.mode, l.projectId, l.createdAt);
  }

  removeTerminalLink(id: string): void {
    this.db.prepare('DELETE FROM terminal_links WHERE id = ?').run(id);
  }

  listTerminalLinks(): PersistedTerminalLink[] {
    const rows = this.db.prepare('SELECT * FROM terminal_links ORDER BY created_at').all() as TerminalLinkRow[];
    return rows.map((r) => ({
      id: r.id,
      sourceId: r.source_id,
      targetId: r.target_id,
      mode: r.mode as TerminalLinkMode,
      projectId: r.project_id ?? null,
      createdAt: r.created_at
    }));
  }

  createBrowserTile(t: PersistedBrowserTile): void {
    this.db
      .prepare('INSERT INTO browser_tiles (id, url, project_id, created_at) VALUES (?, ?, ?, ?)')
      .run(t.id, t.url, t.projectId, t.createdAt);
  }

  updateBrowserTileUrl(id: string, url: string): void {
    this.db.prepare('UPDATE browser_tiles SET url = ? WHERE id = ?').run(url, id);
  }

  removeBrowserTile(id: string): void {
    this.db.prepare('DELETE FROM browser_tiles WHERE id = ?').run(id);
  }

  listBrowserTiles(): PersistedBrowserTile[] {
    const rows = this.db.prepare('SELECT * FROM browser_tiles ORDER BY created_at').all() as BrowserTileRow[];
    return rows.map((r) => ({ id: r.id, url: r.url, projectId: r.project_id ?? null, createdAt: r.created_at }));
  }

  /** Executa um batch da WriteQueue numa transação única (atomicidade — NFR5). */
  applyBatch(batch: Array<() => void>): void {
    this.db.transaction(() => {
      for (const op of batch) op();
    })();
  }

  close(): void {
    this.db.close();
  }
}
