import type { LayoutTile } from '@cockpit/shared';
import type { PersistedEvent, PersistedTerminal, StateStore } from './types';

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

const SCHEMA_VERSION = '2';

interface TerminalRow {
  id: string;
  name: string;
  cwd: string;
  status: string;
  adapter_id: string;
  tile_json: string | null;
  created_at: number;
  archived_at: number | null;
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
      CREATE INDEX IF NOT EXISTS idx_terminals_active ON terminals (archived_at) WHERE archived_at IS NULL;
      CREATE INDEX IF NOT EXISTS idx_events_ts ON events (ts);
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
  }

  upsertTerminal(t: PersistedTerminal): void {
    this.db
      .prepare(
        `INSERT INTO terminals (id, name, cwd, status, adapter_id, tile_json, created_at, archived_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name, cwd = excluded.cwd, status = excluded.status,
           adapter_id = excluded.adapter_id,
           tile_json = COALESCE(excluded.tile_json, terminals.tile_json),
           archived_at = excluded.archived_at`
      )
      .run(
        t.id,
        t.name,
        t.cwd,
        t.status,
        t.adapterId,
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
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      cwd: r.cwd,
      status: r.status === 'exited' ? 'exited' : 'running',
      adapterId: r.adapter_id ?? 'shell',
      tile: r.tile_json ? (JSON.parse(r.tile_json) as LayoutTile) : null,
      createdAt: r.created_at,
      archivedAt: r.archived_at
    }));
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
