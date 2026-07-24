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
  /** Projeto dono do terminal (schema v7 — Story 8.2); null = pré-Épico-8. */
  projectId: string | null;
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
  /** Projeto dono da tarefa (schema v7 — Story 8.2); null = pré-Épico-8. */
  projectId: string | null;
}

/** Modo do vínculo terminal-a-terminal (Épico 9, FR25/FR26/P3). */
export type TerminalLinkMode = 'manual' | 'auto' | 'gate';

export interface PersistedTerminalLink {
  id: string;
  sourceId: string;
  targetId: string;
  mode: TerminalLinkMode;
  /** Projeto dono do vínculo (Story 9.1, AC4) — origem e alvo pertencem ao mesmo. */
  projectId: string | null;
  createdAt: number;
}

/**
 * Tile de preview de browser (Épico 10, FR28) — a POSIÇÃO/tamanho no canvas
 * usa o MESMO `LayoutTile`/`persistLayout` já existente (id genérico); esta
 * entidade só guarda o que é específico do preview (URL atual, projeto).
 */
export interface PersistedBrowserTile {
  id: string;
  url: string;
  projectId: string | null;
  createdAt: number;
}

/** Qualificação de learning (Épico 11, FR32) — decisão HUMANA, nunca automática. */
export type LearningStatus = 'draft' | 'reviewed' | 'reusable' | 'discarded';

/**
 * Learning (Épico 11, FR30) — "banco separado dos projetos": `projectId` é
 * só rastreabilidade de ORIGEM, nunca escopo (Story 11.3, AC2). Remover um
 * projeto (Épico 8) nunca cascade-deleta learnings associados (FR31).
 */
export interface PersistedLearning {
  id: string;
  text: string;
  category: string;
  projectId: string | null;
  status: LearningStatus;
  createdAt: number;
  updatedAt: number;
}

/** Desfecho de um worker despachado (Épico 18, FR62); null enquanto ainda roda. */
export type DispatchOutcome = 'done' | 'error' | 'closed';

/**
 * Histórico de despachos (Épico 18, Story 18.4) — trilha factual de quem
 * despachou quem, com que adapter/modelo, e qual foi o desfecho; consumida
 * futuramente pelo FR63 (Story 18.5) pra roteamento orientado a dado real em
 * vez de achismo. Só nasce pra despachos RASTREÁVEIS (`dispatchedBy`
 * resolvido na adoção externa, Story 17.2) — sem vínculo detectado, nenhum
 * registro é criado (AC4 da 18.4).
 */
export interface PersistedDispatchRecord {
  id: string;
  /** Sessão do chefe que despachou (Story 17.2). */
  dispatchedBy: string;
  /** Sessão do worker despachado — id da sessão externa adotada. */
  workerId: string;
  /** Nome/agente do worker (ex.: "@dev") — mesmo `label` da adoção externa. */
  label: string;
  adapterId: string;
  /** Modelo escolhido pro despacho (Story 17.3) — null quando não propagado até a adoção. */
  model: string | null;
  projectId: string | null;
  createdAt: number;
  /** null enquanto o worker ainda não atingiu um desfecho rastreável. */
  outcome: DispatchOutcome | null;
  outcomeAt: number | null;
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
  /**
   * Migração de compatibilidade (Story 8.2): terminais/tarefas persistidos
   * ANTES do Épico 8 têm project_id NULL — o primeiro projeto ("Padrão",
   * criado por `ensureDefaultProject`) os absorve, para não desaparecerem
   * de todo filtro por projeto.
   */
  backfillProjectId(projectId: string): void;
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
  /** Vínculos terminal-a-terminal (Épico 9, FR25). */
  createTerminalLink(link: PersistedTerminalLink): void;
  removeTerminalLink(id: string): void;
  /** Troca de modo manual↔auto (Story 16.2) — id inexistente é no-op. */
  updateTerminalLinkMode(id: string, mode: TerminalLinkMode): void;
  listTerminalLinks(): PersistedTerminalLink[];
  /** Tiles de preview de browser (Épico 10, FR28). */
  createBrowserTile(tile: PersistedBrowserTile): void;
  updateBrowserTileUrl(id: string, url: string): void;
  removeBrowserTile(id: string): void;
  listBrowserTiles(): PersistedBrowserTile[];
  /** Learnings globais (Épico 11, FR30/FR31) — independentes do projeto de origem. */
  createLearning(learning: PersistedLearning): void;
  updateLearningStatus(id: string, status: LearningStatus, updatedAt: number): void;
  listLearnings(): PersistedLearning[];
  /** Histórico de despachos (Épico 18, FR62) — trilha factual worker↔chefe. */
  createDispatchRecord(record: PersistedDispatchRecord): void;
  /** Atualiza pelo id do WORKER (não do registro) — no-op se não existir. */
  updateDispatchOutcome(workerId: string, outcome: DispatchOutcome, outcomeAt: number): void;
  listDispatchRecords(): PersistedDispatchRecord[];
  close(): void;
}
