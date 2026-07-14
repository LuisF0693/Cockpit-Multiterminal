import type { LayoutTile, TaskRole } from '@cockpit/shared';

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
  /** Workspace/projeto (schema v3 — Story 3.6); default 'Geral'. */
  workspace: string;
  /** Tarefa vinculada (schema v5 — Story 5.2); null = sem vínculo. */
  taskId: string | null;
  /** Papel na tarefa (schema v6 — Story 7.1); null = vínculo neutro. */
  taskRole: TaskRole | null;
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

/** Lifecycle de tarefa (FR13 — Story 5.1): ordem canônica do fluxo. */
export type TaskState = 'planned' | 'in_progress' | 'awaiting_decision' | 'reviewed' | 'done';

export interface PersistedTask {
  id: string;
  title: string;
  description: string;
  state: TaskState;
  createdAt: number;
  updatedAt: number;
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
  /** Linha do terminal por id, arquivado ou não (relatório — Story 3.5). */
  getTerminal(id: string): PersistedTerminal | null;
  /** Contagem de eventos com filtros (métricas do relatório — Story 3.5). */
  countEvents(opts: { terminalId?: string; type?: string }): number;
  /** Renomeia workspace em TODAS as linhas, arquivadas inclusive (Story 3.6). */
  renameWorkspace(from: string, to: string): void;
  /**
   * Vincula/desvincula tarefa ao terminal (Story 5.2); null desvincula.
   * `role` (Story 7.1) só se aplica ao vincular — desvincular limpa o papel
   * implicitamente (papel sem tarefa não faz sentido).
   */
  setTerminalTask(id: string, taskId: string | null, role?: TaskRole | null): void;
  setMeta(key: string, value: string): void;
  getMeta(key: string): string | null;
  appendEvent(event: PersistedEvent): void;
  /** Timeline (Story 3.3): mais recentes primeiro, com filtros opcionais. */
  listEvents(opts: { limit: number; terminalId?: string; type?: string }): PersistedEvent[];
  /** Tarefas (Story 5.1, FR13). */
  createTask(task: PersistedTask): void;
  updateTask(id: string, patch: { title?: string; description?: string; state?: TaskState; updatedAt: number }): void;
  listTasks(): PersistedTask[];
  getTask(id: string): PersistedTask | null;
  close(): void;
}
