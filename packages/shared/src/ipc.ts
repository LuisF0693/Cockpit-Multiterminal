import { z } from 'zod';

/**
 * Contratos IPC — validados com Zod na borda, nos dois sentidos.
 * Regra (coding standards): tipos SEMPRE inferidos do schema, nunca duplicados à mão.
 */

export const AppInfoSchema = z.object({
  name: z.literal('Meu Cockpit'),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'versão deve ser semver MAJOR.MINOR.PATCH'),
  platform: z.enum(['win32', 'darwin', 'linux'])
});

export type AppInfo = z.infer<typeof AppInfoSchema>;

/** Nomes canônicos dos canais IPC de controle (baixa frequência). */
export const IpcChannels = {
  appInfo: 'app.info',
  sessionCreate: 'session.create',
  sessionRename: 'session.rename',
  sessionClose: 'session.close',
  sessionResize: 'session.resize',
  sessionList: 'session.list',
  /** Registro de instrução enviada via master (trilha — Story 3.2). */
  sessionInstructed: 'session.instructed',
  /** Relatório de sessão (Story 3.5) — projeção da trilha de eventos. */
  sessionReport: 'session.report',
  adapterList: 'adapter.list',
  timelineGet: 'timeline.get',
  /** Workspaces (Story 3.6). */
  workspaceList: 'workspace.list',
  workspaceCreate: 'workspace.create',
  workspaceRename: 'workspace.rename',
  workspaceSetActive: 'workspace.setActive',
  /** Push Main → renderer com eventos de domínio de sessão. */
  sessionEvent: 'session.event',
  layoutGet: 'layout.get',
  layoutUpdate: 'layout.update',
  /** Push Main → renderer com o estado do vínculo com o daemon (Story 6.4). */
  daemonStatus: 'daemon.status',
  /** Evento Main → renderer que transfere a MessagePort de dados (tag = session id). */
  terminalPort: 'terminal.port'
} as const;

/** Estado do daemon de terminais (Story 6.4) — badge no header. */
export const DaemonStatusSchema = z.object({
  state: z.enum(['starting', 'connected', 'reconnecting', 'disconnected'])
});
export type DaemonStatus = z.infer<typeof DaemonStatusSchema>;

/**
 * Status de agente (data-models.md / FR5) — detectado pelo adapter.
 * Shell (process-only): working enquanto vivo, done/error no exit.
 */
export const AgentStatusSchema = z.enum(['idle', 'working', 'waiting-input', 'done', 'error']);
export type AgentStatus = z.infer<typeof AgentStatusSchema>;

/** Adapter disponível para hospedar terminais (Epic 2). */
export const AdapterInfoSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1)
});
export type AdapterInfo = z.infer<typeof AdapterInfoSchema>;

/**
 * Sessão de terminal (Story 1.3) — fonte de verdade no SessionRegistry (core,
 * Main process); a UI apenas reflete eventos (CQRS leve).
 */
export const SessionRecordSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(60),
  cwd: z.string().min(1),
  status: z.enum(['running', 'exited']),
  pid: z.number().int().positive(),
  createdAt: z.number().int().nonnegative(),
  /** Adapter que hospeda a sessão (Story 2.1); 'shell' é o default. */
  adapterId: z.string().min(1),
  /** Status do agente (transiente — não persiste). */
  agentStatus: AgentStatusSchema,
  /** Época da última mudança de agentStatus (tempo no status — Story 3.1). */
  lastStatusChangeAt: z.number().int().nonnegative(),
  /** Exit code do processo quando exited (Story 3.5) — ausente enquanto running. */
  exitCode: z.number().int().optional(),
  /** Workspace/projeto da sessão (Story 3.6) — default 'Geral'. */
  workspace: z.string().min(1)
});
export type SessionRecord = z.infer<typeof SessionRecordSchema>;

export const SessionCreateRequestSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  cols: z.number().int().min(2).max(500),
  rows: z.number().int().min(2).max(500),
  cwd: z.string().optional(),
  adapterId: z.string().min(1).optional(),
  /** Workspace de destino (Story 3.6) — default 'Geral'. */
  workspace: z.string().min(1).optional()
});
export type SessionCreateRequest = z.infer<typeof SessionCreateRequestSchema>;

export const SessionRenameRequestSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(60)
});
export type SessionRenameRequest = z.infer<typeof SessionRenameRequestSchema>;

export const SessionCloseRequestSchema = z.object({ id: z.string().min(1) });
export type SessionCloseRequest = z.infer<typeof SessionCloseRequestSchema>;

export const SessionCloseResponseSchema = z.object({
  id: z.string().min(1),
  orphan: z.boolean()
});
export type SessionCloseResponse = z.infer<typeof SessionCloseResponseSchema>;

export const SessionResizeRequestSchema = z.object({
  id: z.string().min(1),
  cols: z.number().int().min(2).max(500),
  rows: z.number().int().min(2).max(500)
});
export type SessionResizeRequest = z.infer<typeof SessionResizeRequestSchema>;

export const SessionEventSchema = z.object({
  type: z.enum(['created', 'renamed', 'closed', 'exited', 'status']),
  session: SessionRecordSchema
});
export type SessionEvent = z.infer<typeof SessionEventSchema>;

/** Evento da timeline (Story 3.3) — projeção da tabela events. */
export const TimelineEventSchema = z.object({
  id: z.string().min(1),
  ts: z.number().int().nonnegative(),
  origin: z.enum(['system', 'agent', 'human']),
  type: z.string().min(1),
  terminalId: z.string().optional(),
  payload: z.record(z.unknown())
});
export type TimelineEvent = z.infer<typeof TimelineEventSchema>;

/**
 * Relatório de sessão (Story 3.5) — métricas projetadas da tabela events +
 * linha do terminal. tokens/toolCalls são a base extensível (AC3): opcionais
 * até os adapters exporem números reais dos CLIs.
 */
export const SessionReportSchema = z.object({
  terminalId: z.string().min(1),
  name: z.string().min(1),
  adapterId: z.string().min(1),
  cwd: z.string().min(1),
  createdAt: z.number().int().nonnegative(),
  /** archivedAt quando fechada; null enquanto viva/restaurável. */
  endedAt: z.number().int().nullable(),
  durationMs: z.number().int().nonnegative(),
  statusTransitions: z.number().int().nonnegative(),
  instructions: z.number().int().nonnegative(),
  recoveries: z.number().int().nonnegative(),
  exitCode: z.number().int().nullable(),
  tokens: z.number().int().optional(),
  toolCalls: z.number().int().optional()
});
export type SessionReport = z.infer<typeof SessionReportSchema>;

export const SessionReportRequestSchema = z.object({ id: z.string().min(1) });
export type SessionReportRequest = z.infer<typeof SessionReportRequestSchema>;

export const TimelineGetRequestSchema = z.object({
  limit: z.number().int().min(1).max(500).default(100),
  terminalId: z.string().optional(),
  type: z.string().optional()
});
export type TimelineGetRequest = z.infer<typeof TimelineGetRequestSchema>;

/** Workspaces (Story 3.6) — nomes + ativo; 'Geral' é indelével. */
export const WorkspaceListSchema = z.object({
  names: z.string().min(1).array().min(1),
  active: z.string().min(1)
});
export type WorkspaceList = z.infer<typeof WorkspaceListSchema>;

export const WorkspaceCreateRequestSchema = z.object({ name: z.string().min(1).max(40) });
export type WorkspaceCreateRequest = z.infer<typeof WorkspaceCreateRequestSchema>;

export const WorkspaceRenameRequestSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1).max(40)
});
export type WorkspaceRenameRequest = z.infer<typeof WorkspaceRenameRequestSchema>;

export const WorkspaceSetActiveRequestSchema = z.object({ name: z.string().min(1) });
export type WorkspaceSetActiveRequest = z.infer<typeof WorkspaceSetActiveRequestSchema>;

/** Tile do canvas — espelho serializável do TileLayout da UI (Story 1.4). */
export const LayoutTileSchema = z.object({
  id: z.string().min(1),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  zIndex: z.number().int()
});
export type LayoutTile = z.infer<typeof LayoutTileSchema>;

export const LayoutUpdateRequestSchema = z.object({
  tiles: LayoutTileSchema.array()
});
export type LayoutUpdateRequest = z.infer<typeof LayoutUpdateRequestSchema>;

/**
 * Mensagem postada pelo preload na window do renderer transferindo a
 * MessagePort de dados do terminal (padrão Electron p/ sandbox+contextIsolation).
 */
export const TERMINAL_PORT_MESSAGE = 'cockpit:terminal-port' as const;

export interface TerminalPortMessage {
  type: typeof TERMINAL_PORT_MESSAGE;
  id: string;
}

/**
 * Contrato da bridge exposta pelo preload em window.cockpit.
 * Vive no shared para o renderer nunca importar tipos do processo preload/Electron.
 */
export interface CockpitApi {
  getAppInfo(): Promise<AppInfo>;
  session: {
    /** Cria a sessão; a MessagePort de dados chega via window message TERMINAL_PORT_MESSAGE (id = session id). */
    create(req: SessionCreateRequest): Promise<SessionRecord>;
    rename(req: SessionRenameRequest): Promise<SessionRecord>;
    close(req: SessionCloseRequest): Promise<SessionCloseResponse>;
    resize(req: SessionResizeRequest): Promise<void>;
    list(): Promise<SessionRecord[]>;
    /** Assina eventos de domínio; retorna unsubscribe. */
    onEvent(cb: (event: SessionEvent) => void): () => void;
    /** Registra na trilha uma instrução enviada via master (Story 3.2). */
    instructed(req: { id: string; text: string }): Promise<void>;
    /** Relatório da sessão (Story 3.5) — null se a sessão nunca persistiu. */
    report(req: SessionReportRequest): Promise<SessionReport | null>;
  };
  layout: {
    /** Layout salvo da última execução (vazio na primeira). */
    get(): Promise<LayoutTile[]>;
    /** Persistência contínua (chamar debounced — NFR8). */
    update(req: LayoutUpdateRequest): Promise<void>;
  };
  adapter: {
    /** Adapters registrados no PTY Host (Story 2.1+). */
    list(): Promise<AdapterInfo[]>;
  };
  timeline: {
    /** Eventos da trilha, mais recentes primeiro (Story 3.3). */
    get(req?: Partial<TimelineGetRequest>): Promise<TimelineEvent[]>;
  };
  daemon: {
    /** Estado do vínculo com o daemon (Story 6.4); retorna unsubscribe. */
    onStatus(cb: (status: DaemonStatus) => void): () => void;
  };
  workspace: {
    /** Workspaces conhecidos + ativo (Story 3.6). */
    list(): Promise<WorkspaceList>;
    create(req: WorkspaceCreateRequest): Promise<WorkspaceList>;
    /** Renomeia e propaga às sessões (vivas e persistidas). */
    rename(req: WorkspaceRenameRequest): Promise<WorkspaceList>;
    setActive(req: WorkspaceSetActiveRequest): Promise<WorkspaceList>;
  };
}
