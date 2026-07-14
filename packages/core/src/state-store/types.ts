import type { LayoutTile } from '@cockpit/shared';

/**
 * State store (decisão crítica 2): SQLite WAL como verdade estrutural.
 * Interface SÍNCRONA — melhor-sqlite3 é sync; a assincronia fica na
 * WriteQueue (o chamador nunca espera I/O — NFR8).
 */

export interface PersistedTerminal {
  id: string;
  name: string;
  cwd: string;
  status: 'running' | 'exited';
  /** Adapter que hospeda a sessão (schema v2 — Story 2.1). */
  adapterId: string;
  tile: LayoutTile | null;
  createdAt: number;
  archivedAt: number | null;
}

export interface PersistedEvent {
  id: string;
  ts: number;
  origin: 'system' | 'agent' | 'human';
  type: string;
  terminalId?: string | undefined;
  payload: Record<string, unknown>;
}

export interface StateStore {
  /** Cria/migra o schema (app_meta.schema_version). */
  init(): void;
  upsertTerminal(terminal: PersistedTerminal): void;
  setTerminalStatus(id: string, status: PersistedTerminal['status']): void;
  archiveTerminal(id: string, at: number): void;
  updateTile(id: string, tile: LayoutTile): void;
  /** Terminais não arquivados — o plano de restore do próximo boot. */
  listActiveTerminals(): PersistedTerminal[];
  setMeta(key: string, value: string): void;
  getMeta(key: string): string | null;
  appendEvent(event: PersistedEvent): void;
  /** Timeline (Story 3.3): mais recentes primeiro, com filtros opcionais. */
  listEvents(opts: { limit: number; terminalId?: string; type?: string }): PersistedEvent[];
  close(): void;
}
