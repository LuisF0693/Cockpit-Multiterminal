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
  /** Vincula/desvincula tarefa a um terminal (Story 5.2). */
  sessionLinkTask: 'session.linkTask',
  /** Relatório de sessão (Story 3.5) — projeção da trilha de eventos. */
  sessionReport: 'session.report',
  adapterList: 'adapter.list',
  /** Disponibilidade de um comando no PATH (Story 13.4, FR45) — lookup no Main, sem executar nada. */
  adapterCheckCommand: 'adapter.checkCommand',
  timelineGet: 'timeline.get',
  /** Workspaces (Story 3.6). */
  workspaceList: 'workspace.list',
  workspaceCreate: 'workspace.create',
  workspaceRename: 'workspace.rename',
  workspaceSetActive: 'workspace.setActive',
  /** Projetos (Story 8.1) — caminho raiz real no disco, diferente de workspace. */
  projectList: 'project.list',
  projectCreate: 'project.create',
  projectUpdate: 'project.update',
  projectRemove: 'project.remove',
  projectSetActive: 'project.setActive',
  /** Diálogo nativo de seleção de pasta (Story 8.2, AC4). */
  projectPickFolder: 'project.pickFolder',
  /** Explorador de arquivos (Story 8.4) — leitura no Main (node:fs). */
  projectReadDir: 'project.readDir',
  projectReadFile: 'project.readFile',
  /** Branch git do projeto (Story 13.3, FR44) — lida de .git/HEAD no Main. */
  projectGitBranch: 'project.gitBranch',
  /** Configurações do app (Story 13.5, FR46) — app_meta.settings, JSON único. */
  settingsGet: 'settings.get',
  settingsUpdate: 'settings.update',
  /** Central de API (Story 15.4, FR56) — chaves criptografadas no keychain do SO. */
  apiProviderList: 'apiProvider.list',
  apiProviderCreate: 'apiProvider.create',
  apiProviderRemove: 'apiProvider.remove',
  /** Vínculo terminal-a-terminal (Épico 9, FR25). */
  terminalLinkCreate: 'terminalLink.create',
  terminalLinkRemove: 'terminalLink.remove',
  terminalLinkList: 'terminalLink.list',
  /** Troca de modo manual↔auto direto no canvas (Story 16.2). */
  terminalLinkSetMode: 'terminalLink.setMode',
  /** Push Main → renderer com eventos de domínio de vínculo. */
  terminalLinkEvent: 'terminalLink.event',
  /** Push Main → renderer: roteamento automático de vínculo (Story 9.2). */
  terminalLinkRouted: 'terminalLink.routed',
  /** Preview de browser via Playwright (Épico 10, FR28/FR29). */
  browserCreate: 'browser.create',
  browserRemove: 'browser.remove',
  browserList: 'browser.list',
  browserNavigate: 'browser.navigate',
  browserBack: 'browser.back',
  browserForward: 'browser.forward',
  browserReload: 'browser.reload',
  browserScreenshot: 'browser.screenshot',
  browserClick: 'browser.click',
  browserReadText: 'browser.readText',
  /** Push Main → renderer com eventos de domínio do tile de browser. */
  browserTileEvent: 'browser.tileEvent',
  /** Learnings globais (Épico 11, FR30-33). */
  learningCreate: 'learning.create',
  learningUpdateStatus: 'learning.updateStatus',
  learningList: 'learning.list',
  /** Push Main → renderer com eventos de domínio de learning. */
  learningEvent: 'learning.event',
  /** Recuperação pós-crash (Story 4.3). */
  recoverySummary: 'recovery.summary',
  recoveryResolve: 'recovery.resolve',
  /** Tarefas (Story 5.1, FR13). */
  taskCreate: 'task.create',
  taskUpdateState: 'task.updateState',
  taskList: 'task.list',
  /** Decisao humana em ponto de decisao (Story 5.3). */
  taskDecide: 'task.decide',
  /** Push Main → renderer com eventos de domínio de tarefa. */
  taskEvent: 'task.event',
  /** Push Main → renderer: roteamento automático escritor→revisores (Story 7.2). */
  sdcReviewRequested: 'sdc.reviewRequested',
  /** Trecho recente do scrollback persistido de um terminal (Story 7.3). */
  sdcTranscriptTail: 'sdc.transcriptTail',
  /** Push Main → renderer: correção agregada ao escritor após rejeição (Story 7.4). */
  sdcCorrectionRequested: 'sdc.correctionRequested',
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
 * Checagem de comando no PATH (Story 13.4, FR45) — nome de ARQUIVO simples
 * (com extensão), nunca um caminho: separadores são rejeitados no schema.
 */
export const AdapterCheckCommandRequestSchema = z.object({
  command: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[A-Za-z0-9_][A-Za-z0-9_.-]*$/, 'nome de comando simples, sem separadores de caminho')
});
export type AdapterCheckCommandRequest = z.infer<typeof AdapterCheckCommandRequestSchema>;

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
  workspace: z.string().min(1),
  /** Tarefa vinculada (Story 5.2) — null = sem vínculo; um terminal aponta p/ no máx. 1 tarefa. */
  taskId: z.string().min(1).nullable(),
  /** Papel na tarefa (Story 7.1, FR16) — null = vínculo neutro (sem three-brain). */
  taskRole: z.enum(['writer', 'reviewer']).nullable(),
  /** Projeto dono do terminal (Story 8.2, FR22) — null = sessão pré-Épico-8, herda o ativo. */
  projectId: z.string().min(1).nullable()
});
export type SessionRecord = z.infer<typeof SessionRecordSchema>;
export type TaskRole = NonNullable<SessionRecord['taskRole']>;

export const SessionCreateRequestSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  cols: z.number().int().min(2).max(500),
  rows: z.number().int().min(2).max(500),
  cwd: z.string().optional(),
  adapterId: z.string().min(1).optional(),
  /** Workspace de destino (Story 3.6) — default 'Geral'. */
  workspace: z.string().min(1).optional(),
  /**
   * Projeto de destino (Story 8.3, AC3) — default o projeto ATIVO. Passar um
   * id específico cria o terminal ali SEM trocar o ativo (atalho de
   * conveniência a partir da barra lateral). Determina o cwd default (AC1)
   * quando `cwd` não é passado explicitamente.
   */
  projectId: z.string().min(1).optional(),
  /** Argumentos extra de CLI (Story 12.6) — ex.: Ollama precisa do nome do modelo. */
  args: z.string().min(1).array().optional()
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
  type: z.enum(['created', 'renamed', 'closed', 'exited', 'status', 'task_linked']),
  session: SessionRecordSchema
});
export type SessionEvent = z.infer<typeof SessionEventSchema>;

/** Vincular/desvincular tarefa a um terminal (Story 5.2, AC1) — taskId=null desvincula. */
export const TaskLinkRequestSchema = z.object({
  terminalId: z.string().min(1),
  taskId: z.string().min(1).nullable(),
  /** Papel na tarefa (Story 7.1) — ignorado quando taskId=null (desvincular limpa o papel). */
  role: z.enum(['writer', 'reviewer']).optional()
});
export type TaskLinkRequest = z.infer<typeof TaskLinkRequestSchema>;

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
  /** Relançamentos clássicos (sessão reiniciada — perde o processo). */
  recoveries: z.number().int().nonnegative(),
  /** Adoções pelo daemon (Story 6.3/4.2) — retomada CONTÍNUA, sem perda. */
  adoptions: z.number().int().nonnegative(),
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

/**
 * Recuperação pós-crash (Story 4.3) — resumo mostrado antes de qualquer
 * adoção/relaunch automático. lastKnownStatus vem do último evento
 * status.changed da trilha (agentStatus é transiente — não há status "ao
 * vivo" antes de retomar); 'desconhecido' quando não há histórico.
 */
export const CrashTerminalInfoSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  adapterId: z.string().min(1),
  cwd: z.string().min(1),
  lastKnownStatus: z.string().min(1)
});
export type CrashTerminalInfo = z.infer<typeof CrashTerminalInfoSchema>;

export const CrashSummarySchema = z.object({
  terminals: CrashTerminalInfoSchema.array(),
  lastEvents: TimelineEventSchema.array()
});
export type CrashSummary = z.infer<typeof CrashSummarySchema>;

export const RecoveryResolveRequestSchema = z.object({
  choice: z.enum(['all', 'selective', 'clean']),
  /** Ids a manter quando choice='selective'; ignorado nas outras opções. */
  keepIds: z.string().min(1).array().optional()
});
export type RecoveryResolveRequest = z.infer<typeof RecoveryResolveRequestSchema>;

export const RecoveryResolveResponseSchema = z.object({
  restored: z.number().int().nonnegative(),
  archived: z.number().int().nonnegative(),
  adopted: z.number().int().nonnegative()
});
export type RecoveryResolveResponse = z.infer<typeof RecoveryResolveResponseSchema>;

/** Lifecycle de tarefa (FR13 — Story 5.1): ordem canônica do fluxo. */
export const TaskStateSchema = z.enum(['planned', 'in_progress', 'awaiting_decision', 'reviewed', 'done']);
export type TaskState = z.infer<typeof TaskStateSchema>;

export const TaskSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(120),
  description: z.string().max(2000),
  state: TaskStateSchema,
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
  /** Projeto dono da tarefa (Story 8.2, FR22) — null = tarefa pré-Épico-8, herda o ativo. */
  projectId: z.string().min(1).nullable()
});
export type Task = z.infer<typeof TaskSchema>;

export const TaskCreateRequestSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(2000).optional()
});
export type TaskCreateRequest = z.infer<typeof TaskCreateRequestSchema>;

export const TaskUpdateStateRequestSchema = z.object({
  id: z.string().min(1),
  state: TaskStateSchema
});
export type TaskUpdateStateRequest = z.infer<typeof TaskUpdateStateRequestSchema>;

/** Push Main → renderer (Story 5.1) — mesmo padrão do SessionEvent. */
export const TaskEventSchema = z.object({
  type: z.enum(['created', 'state_changed']),
  task: TaskSchema
});
export type TaskEvent = z.infer<typeof TaskEventSchema>;

/**
 * Decisao humana em ponto de decisao (Story 5.3, FR15). redirectTo
 * (terminalId de destino) e obrigatorio apenas quando action='redirect'.
 */
export const TaskDecisionRequestSchema = z
  .object({
    taskId: z.string().min(1),
    action: z.enum(['approve', 'reject', 'redirect']),
    justification: z.string().max(2000).optional(),
    redirectTo: z.string().min(1).optional()
  })
  .refine((v) => v.action !== 'redirect' || v.redirectTo !== undefined, {
    message: 'redirectTo obrigatorio quando action redirect'
  });
export type TaskDecisionRequest = z.infer<typeof TaskDecisionRequestSchema>;

/**
 * Push Main -> renderer (Story 7.2, FR17): roteamento automatico de revisao.
 * `message` ja vem pronta (montada no Main, unica fonte da redacao) - o
 * renderer so precisa chamar instructAgent por reviewerId (decisao critica 4:
 * so o renderer escreve na PTY).
 */
export const SdcReviewRequestedEventSchema = z.object({
  taskId: z.string().min(1),
  writerId: z.string().min(1),
  reviewerIds: z.string().min(1).array().min(1),
  message: z.string().min(1)
});
export type SdcReviewRequestedEvent = z.infer<typeof SdcReviewRequestedEventSchema>;

/**
 * Trecho recente do scrollback persistido de um terminal (Story 7.3, AC1) —
 * lê do ARQUIVO (mesma fonte da 1.4/6.2), nunca da PTY ao vivo. `maxBytes`
 * pequeno por padrão: é um TRECHO, não o scrollback inteiro.
 */
export const SdcTranscriptTailRequestSchema = z.object({
  terminalId: z.string().min(1),
  maxBytes: z.number().int().positive().max(65536).default(4096)
});
export type SdcTranscriptTailRequest = z.infer<typeof SdcTranscriptTailRequestSchema>;

/**
 * Push Main -> renderer (Story 7.4, FR19): correção agregada ao escritor
 * após rejeição numa tarefa three-brain. Mesmo padrão do 7.2: `message` já
 * vem pronta do Main; o renderer só chama instructAgent (decisão crítica 4).
 */
export const SdcCorrectionRequestedEventSchema = z.object({
  taskId: z.string().min(1),
  writerId: z.string().min(1),
  message: z.string().min(1)
});
export type SdcCorrectionRequestedEvent = z.infer<typeof SdcCorrectionRequestedEventSchema>;

/** Workspaces (Story 3.6) — nomes + ativo; 'Geral' é indelável. */
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

/**
 * Projeto (Story 8.1, FR21) — caminho raiz real no disco, diferente de
 * workspace (3.6, agrupamento livre de tiles DENTRO de um projeto). Um
 * projeto tem N workspaces; um workspace pertence a exatamente 1 projeto.
 */
export const ProjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(60),
  color: z.string().min(1),
  rootPath: z.string().min(1)
});
export type Project = z.infer<typeof ProjectSchema>;

/** Lista de projetos + ativo — sempre ao menos 1 projeto existe (FR21, AC2). */
export const ProjectListSchema = z.object({
  projects: ProjectSchema.array().min(1),
  activeId: z.string().min(1)
});
export type ProjectList = z.infer<typeof ProjectListSchema>;

export const ProjectCreateRequestSchema = z.object({
  name: z.string().min(1).max(60),
  color: z.string().min(1),
  rootPath: z.string().min(1)
});
export type ProjectCreateRequest = z.infer<typeof ProjectCreateRequestSchema>;

/** Update combinado (rename+recolor+reroot) — todos os campos opcionais. */
export const ProjectUpdateRequestSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(60).optional(),
  color: z.string().min(1).optional(),
  rootPath: z.string().min(1).optional()
});
export type ProjectUpdateRequest = z.infer<typeof ProjectUpdateRequestSchema>;

export const ProjectRemoveRequestSchema = z.object({ id: z.string().min(1) });
export type ProjectRemoveRequest = z.infer<typeof ProjectRemoveRequestSchema>;

export const ProjectSetActiveRequestSchema = z.object({ id: z.string().min(1) });
export type ProjectSetActiveRequest = z.infer<typeof ProjectSetActiveRequestSchema>;

/**
 * Explorador de arquivos (Story 8.4, FR23) — leitura acontece no Main
 * (node:fs); o renderer só navega a árvore e pede preview de texto (AC4).
 */
export const ProjectDirEntrySchema = z.object({
  name: z.string().min(1),
  path: z.string().min(1),
  isDirectory: z.boolean()
});
export type ProjectDirEntry = z.infer<typeof ProjectDirEntrySchema>;

export const ProjectReadDirRequestSchema = z.object({
  /** Projeto de origem — default o ativo. */
  projectId: z.string().min(1).optional(),
  /** Subpasta a listar — default a raiz do projeto (rootPath). */
  dirPath: z.string().min(1).optional()
});
export type ProjectReadDirRequest = z.infer<typeof ProjectReadDirRequestSchema>;

/** Branch git do projeto (Story 13.3, FR44) — projectId ausente = ativo. */
export const ProjectGitBranchRequestSchema = z.object({
  projectId: z.string().min(1).optional()
});
export type ProjectGitBranchRequest = z.infer<typeof ProjectGitBranchRequestSchema>;

/**
 * Configurações do app (Story 13.5, FR46) — os DEFAULTS preservam exatamente
 * o comportamento anterior à story (llama3 da 12.6, poll de 1.5s da 10.1,
 * zoom 100% da 12.6); valor ausente OU inválido degrada pro default (catch),
 * nunca erro — quem nunca abrir a tela de Configurações não muda nada.
 */
export const AppSettingsSchema = z.object({
  ollamaDefaultModel: z.string().min(1).max(64).catch('llama3').default('llama3'),
  browserPreviewIntervalMs: z.number().int().min(500).max(60000).catch(1500).default(1500),
  canvasDefaultZoom: z.number().min(0.15).max(2).catch(1).default(1),
  /** Larguras dos painéis (Story 15.1, FR52) — defaults do mock Multerminal. */
  sidebarWidth: z.number().int().min(200).max(400).catch(240).default(240),
  telemetryWidth: z.number().int().min(200).max(400).catch(230).default(230),
  previewWidth: z.number().int().min(380).max(800).catch(520).default(520),
  /** Painéis colapsáveis (Story 15.5, FR58) — canvas maior quando true. */
  sidebarCollapsed: z.boolean().catch(false).default(false),
  telemetryCollapsed: z.boolean().catch(false).default(false),
  sessionsBarCollapsed: z.boolean().catch(false).default(false),
  /** Tema vivo (Story 15.2, FR55) — preset + destaque + fontes. */
  themePreset: z.string().min(1).max(40).catch('multerminal-dark').default('multerminal-dark'),
  accentColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .catch('#22D3EE')
    .default('#22D3EE'),
  fontText: z.string().min(1).max(40).catch('JetBrains Mono').default('JetBrains Mono'),
  fontMono: z.string().min(1).max(40).catch('JetBrains Mono').default('JetBrains Mono')
});
export type AppSettings = z.infer<typeof AppSettingsSchema>;

export const SettingsUpdateRequestSchema = AppSettingsSchema.partial();
export type SettingsUpdateRequest = z.infer<typeof SettingsUpdateRequestSchema>;

/**
 * Central de API (Story 15.4, FR56) — o que o RENDERER vê de um provider
 * cadastrado: NUNCA inclui a chave (nem criptografada). A chave só existe
 * em texto plano no trajeto único cadastro→Main (IPC local) e é
 * criptografada via safeStorage antes de tocar o disco.
 */
export const ApiProviderSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1).max(40),
  name: z.string().min(1).max(60),
  baseUrl: z.string().min(1).max(200),
  defaultModel: z.string().max(80).optional()
});
export type ApiProvider = z.infer<typeof ApiProviderSchema>;

export const ApiProviderCreateRequestSchema = z.object({
  type: z.string().min(1).max(40),
  name: z.string().min(1).max(60),
  baseUrl: z.string().min(1).max(200),
  apiKey: z.string().min(1).max(500),
  defaultModel: z.string().max(80).optional()
});
export type ApiProviderCreateRequest = z.infer<typeof ApiProviderCreateRequestSchema>;

export const ApiProviderRemoveRequestSchema = z.object({ id: z.string().min(1) });
export type ApiProviderRemoveRequest = z.infer<typeof ApiProviderRemoveRequestSchema>;

export const ProjectReadFileRequestSchema = z.object({
  path: z.string().min(1),
  maxBytes: z.number().int().positive().max(1_048_576).default(262_144)
});
export type ProjectReadFileRequest = z.infer<typeof ProjectReadFileRequestSchema>;

export const ProjectReadFileResponseSchema = z.object({
  content: z.string(),
  truncated: z.boolean()
});
export type ProjectReadFileResponse = z.infer<typeof ProjectReadFileResponseSchema>;

/**
 * Vínculo terminal-a-terminal (Épico 9, FR25) — INDEPENDENTE de tarefa; um
 * agente na origem pode comandar o terminal alvo. `manual` só habilita o
 * botão de enviar (9.3); `auto` dispara sozinho no status da origem (9.2).
 */
export const TerminalLinkModeSchema = z.enum(['manual', 'auto']);
export type TerminalLinkMode = z.infer<typeof TerminalLinkModeSchema>;

export const TerminalLinkSchema = z.object({
  id: z.string().min(1),
  sourceId: z.string().min(1),
  targetId: z.string().min(1),
  mode: TerminalLinkModeSchema,
  /** Projeto dono do vínculo (AC4 da 9.1) — origem e alvo pertencem ao mesmo. */
  projectId: z.string().min(1).nullable(),
  createdAt: z.number().int().nonnegative()
});
export type TerminalLink = z.infer<typeof TerminalLinkSchema>;

export const TerminalLinkCreateRequestSchema = z.object({
  sourceId: z.string().min(1),
  targetId: z.string().min(1),
  mode: TerminalLinkModeSchema
});
export type TerminalLinkCreateRequest = z.infer<typeof TerminalLinkCreateRequestSchema>;

export const TerminalLinkRemoveRequestSchema = z.object({ id: z.string().min(1) });
export type TerminalLinkRemoveRequest = z.infer<typeof TerminalLinkRemoveRequestSchema>;

/** Troca de modo do vínculo (Story 16.2) — clicável na etiqueta do canvas. */
export const TerminalLinkSetModeRequestSchema = z.object({
  id: z.string().min(1),
  mode: TerminalLinkModeSchema
});
export type TerminalLinkSetModeRequest = z.infer<typeof TerminalLinkSetModeRequestSchema>;

/** Push Main → renderer (Épico 9) — mesmo padrão do TaskEvent. */
export const TerminalLinkEventSchema = z.object({
  type: z.enum(['created', 'removed', 'updated']),
  link: TerminalLinkSchema
});
export type TerminalLinkEvent = z.infer<typeof TerminalLinkEventSchema>;

/**
 * Push Main -> renderer (Story 9.2, FR26): roteamento automático de vínculo
 * terminal-a-terminal. Mesmo padrão do sdc.reviewRequested (7.2): `message`
 * já vem pronta do Main; o renderer só chama instructAgent por targetId
 * (decisão crítica 4: só o renderer escreve na PTY).
 */
export const TerminalLinkRoutedEventSchema = z.object({
  sourceId: z.string().min(1),
  targetIds: z.string().min(1).array().min(1),
  message: z.string().min(1)
});
export type TerminalLinkRoutedEvent = z.infer<typeof TerminalLinkRoutedEventSchema>;

/**
 * Tile de preview de browser (Épico 10, FR28) — a posição/tamanho no canvas
 * usa o `LayoutTile` já existente (Story 1.4); este schema só tem o que é
 * específico do preview (URL, projeto).
 */
export const BrowserTileSchema = z.object({
  id: z.string().min(1),
  url: z.string().min(1),
  projectId: z.string().min(1).nullable(),
  createdAt: z.number().int().nonnegative()
});
export type BrowserTile = z.infer<typeof BrowserTileSchema>;

export const BrowserTileCreateRequestSchema = z.object({
  url: z.string().min(1).default('about:blank')
});
export type BrowserTileCreateRequest = z.infer<typeof BrowserTileCreateRequestSchema>;

export const BrowserTileIdRequestSchema = z.object({ id: z.string().min(1) });
export type BrowserTileIdRequest = z.infer<typeof BrowserTileIdRequestSchema>;

export const BrowserNavigateRequestSchema = z.object({ id: z.string().min(1), url: z.string().min(1) });
export type BrowserNavigateRequest = z.infer<typeof BrowserNavigateRequestSchema>;

/** Push Main → renderer (Épico 10) — mesmo padrão do TerminalLinkEvent. */
export const BrowserTileEventSchema = z.object({
  type: z.enum(['created', 'updated', 'removed']),
  tile: BrowserTileSchema
});
export type BrowserTileEvent = z.infer<typeof BrowserTileEventSchema>;

/**
 * Automação via Playwright (Story 10.2, FR29) — opera sobre a MESMA
 * instância/página do tile visível (10.1), nunca uma sessão headless
 * paralela (decisão de design do épico).
 */
export const BrowserClickRequestSchema = z.object({ id: z.string().min(1), selector: z.string().min(1) });
export type BrowserClickRequest = z.infer<typeof BrowserClickRequestSchema>;

export const BrowserReadTextRequestSchema = z.object({
  id: z.string().min(1),
  /** Seletor opcional — ausente lê o `body` inteiro. */
  selector: z.string().min(1).optional()
});
export type BrowserReadTextRequest = z.infer<typeof BrowserReadTextRequestSchema>;

/**
 * Learning (Épico 11, FR30) — "banco separado dos projetos": `projectId` é
 * só rastreabilidade de ORIGEM, nunca escopo (a UI nunca filtra por projeto
 * ativo automaticamente — Story 11.3, AC2).
 */
export const LearningStatusSchema = z.enum(['draft', 'reviewed', 'reusable', 'discarded']);
export type LearningStatus = z.infer<typeof LearningStatusSchema>;

export const LearningSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1).max(2000),
  category: z.string().min(1).max(40),
  projectId: z.string().min(1).nullable(),
  status: LearningStatusSchema,
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative()
});
export type Learning = z.infer<typeof LearningSchema>;

export const LearningCreateRequestSchema = z.object({
  text: z.string().min(1).max(2000),
  category: z.string().min(1).max(40)
});
export type LearningCreateRequest = z.infer<typeof LearningCreateRequestSchema>;

export const LearningUpdateStatusRequestSchema = z.object({
  id: z.string().min(1),
  status: LearningStatusSchema
});
export type LearningUpdateStatusRequest = z.infer<typeof LearningUpdateStatusRequestSchema>;

/** Push Main → renderer (Épico 11) — mesmo padrão do TaskEvent. */
export const LearningEventSchema = z.object({
  type: z.enum(['created', 'status_changed']),
  learning: LearningSchema
});
export type LearningEvent = z.infer<typeof LearningEventSchema>;

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
    /** Vincula/desvincula tarefa (Story 5.2, AC1) — taskId=null desvincula. */
    linkTask(req: TaskLinkRequest): Promise<SessionRecord>;
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
    /** Caminho resolvido do comando no PATH, ou null se não instalado (Story 13.4, FR45). */
    checkCommand(req: AdapterCheckCommandRequest): Promise<string | null>;
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
  recovery: {
    /** Resumo do crash pendente (Story 4.3); null quando não há recuperação a resolver. */
    summary(): Promise<CrashSummary | null>;
    resolve(req: RecoveryResolveRequest): Promise<RecoveryResolveResponse>;
  };
  project: {
    /** Projetos conhecidos + ativo (Story 8.1, FR21) — sempre ao menos 1. */
    list(): Promise<ProjectList>;
    create(req: ProjectCreateRequest): Promise<ProjectList>;
    /** Rename/recolor/reroot combinado — campos ausentes não mudam. */
    update(req: ProjectUpdateRequest): Promise<ProjectList>;
    /** Rejeita remover o último projeto restante (AC4). */
    remove(req: ProjectRemoveRequest): Promise<ProjectList>;
    setActive(req: ProjectSetActiveRequest): Promise<ProjectList>;
    /** Diálogo nativo de pasta (Story 8.2, AC4) — null se o usuário cancelar. */
    pickFolder(): Promise<string | null>;
    /** Árvore de arquivos do projeto (Story 8.4, AC1/AC3) — respeita .gitignore. */
    readDir(req: ProjectReadDirRequest): Promise<ProjectDirEntry[]>;
    /** Preview de leitura de um arquivo de texto (Story 8.4, AC2) — null se binário/erro. */
    readFile(req: ProjectReadFileRequest): Promise<ProjectReadFileResponse | null>;
    /** Branch git atual do projeto (Story 13.3, FR44) — null se não for repositório. */
    gitBranch(req: ProjectGitBranchRequest): Promise<string | null>;
  };
  settings: {
    /** Configurações efetivas (defaults aplicados) — Story 13.5, FR46. */
    get(): Promise<AppSettings>;
    /** Merge parcial e persiste; retorna o estado completo resultante. */
    update(req: SettingsUpdateRequest): Promise<AppSettings>;
  };
  apiProvider: {
    /** Providers cadastrados (Story 15.4, FR56) — SEM chaves, nem cifradas. */
    list(): Promise<ApiProvider[]>;
    /** Cadastra: chave criptografada via safeStorage; recusa sem keychain. */
    create(req: ApiProviderCreateRequest): Promise<ApiProvider[]>;
    remove(req: ApiProviderRemoveRequest): Promise<ApiProvider[]>;
  };
  terminalLink: {
    /** Vincula um terminal a outro (Story 9.1, FR25) — só terminais do mesmo projeto. */
    create(req: TerminalLinkCreateRequest): Promise<TerminalLink>;
    remove(req: TerminalLinkRemoveRequest): Promise<void>;
    /** Troca manual↔auto direto no canvas (Story 16.2) — null se o vínculo não existe. */
    setMode(req: TerminalLinkSetModeRequest): Promise<TerminalLink | null>;
    list(): Promise<TerminalLink[]>;
    /** Assina eventos de domínio de vínculo; retorna unsubscribe. */
    onEvent(cb: (event: TerminalLinkEvent) => void): () => void;
    /** Roteamento automático de vínculo (Story 9.2, FR26); retorna unsubscribe. */
    onRouted(cb: (event: TerminalLinkRoutedEvent) => void): () => void;
  };
  browser: {
    /** Cria um tile de preview de browser (Story 10.1, AC1) — Chromium via Playwright no Main. */
    create(req: BrowserTileCreateRequest): Promise<BrowserTile>;
    remove(req: BrowserTileIdRequest): Promise<void>;
    list(): Promise<BrowserTile[]>;
    navigate(req: BrowserNavigateRequest): Promise<BrowserTile>;
    back(req: BrowserTileIdRequest): Promise<void>;
    forward(req: BrowserTileIdRequest): Promise<void>;
    reload(req: BrowserTileIdRequest): Promise<void>;
    /** Snapshot atual da página (data URL) — null se o tile não existe/falhou. */
    screenshot(req: BrowserTileIdRequest): Promise<string | null>;
    /** Automação (Story 10.2, FR29) — mesma página do tile visível. */
    click(req: BrowserClickRequest): Promise<void>;
    readText(req: BrowserReadTextRequest): Promise<string | null>;
    /** Assina eventos de domínio do tile; retorna unsubscribe. */
    onEvent(cb: (event: BrowserTileEvent) => void): () => void;
  };
  learning: {
    /** Registra um aprendizado (Story 11.1, FR30) — nasce em status `draft`. */
    create(req: LearningCreateRequest): Promise<Learning>;
    /** Qualificação (Story 11.2, FR32) — decisão humana, rejeita transição inválida. */
    updateStatus(req: LearningUpdateStatusRequest): Promise<Learning>;
    list(): Promise<Learning[]>;
    /** Assina eventos de domínio de learning; retorna unsubscribe. */
    onEvent(cb: (event: LearningEvent) => void): () => void;
  };
  task: {
    /** Tarefas com lifecycle (Story 5.1, FR13). */
    create(req: TaskCreateRequest): Promise<Task>;
    /** Transição validada pelo core — rejeita se inválida (AC1). */
    updateState(req: TaskUpdateStateRequest): Promise<Task>;
    list(): Promise<Task[]>;
    /** Assina eventos de domínio de tarefa; retorna unsubscribe. */
    onEvent(cb: (event: TaskEvent) => void): () => void;
    /** Decisão humana (Story 5.3, FR15) — aprovar/rejeitar/redirecionar. */
    decide(req: TaskDecisionRequest): Promise<Task>;
  };
  sdc: {
    /** Roteamento automático de revisão (Story 7.2, FR17); retorna unsubscribe. */
    onReviewRequested(cb: (event: SdcReviewRequestedEvent) => void): () => void;
    /** Trecho recente do scrollback persistido de um terminal (Story 7.3, AC1). */
    transcriptTail(req: SdcTranscriptTailRequest): Promise<string>;
    /** Correção agregada ao escritor após rejeição (Story 7.4, FR19); retorna unsubscribe. */
    onCorrectionRequested(cb: (event: SdcCorrectionRequestedEvent) => void): () => void;
  };
}
