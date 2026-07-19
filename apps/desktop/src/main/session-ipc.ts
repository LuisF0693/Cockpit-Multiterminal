import { BrowserWindow, dialog, ipcMain, safeStorage } from 'electron';
import { readdir, readFile as fsReadFile, stat as fsStat } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { z } from 'zod';
import {
  PersistenceManager,
  SessionRegistry,
  TaskManager,
  TerminalLinkManager,
  WriteQueue,
  planSdcReviewRouting,
  planSdcCorrectionRouting,
  planSdcRedirect,
  planTerminalLinkRouting,
  planExternalAdoption,
  ALWAYS_HIDDEN_NAMES,
  isGitignored,
  isPathWithin,
  parseGitHead,
  parseGitdirPointer,
  parseGitignorePatterns,
  ulid,
  type StateStore
} from '@cockpit/core';
import {
  AdapterCheckCommandRequestSchema,
  AgentStatusSchema,
  ApiProviderCreateRequestSchema,
  ApiProviderRemoveRequestSchema,
  AppSettingsSchema,
  IpcChannels,
  SettingsUpdateRequestSchema,
  type ApiProvider,
  type AppSettings,
  LayoutUpdateRequestSchema,
  TimelineGetRequestSchema,
  RecoveryResolveRequestSchema,
  SessionCloseRequestSchema,
  SessionCreateRequestSchema,
  SessionRenameRequestSchema,
  SessionReportRequestSchema,
  SessionResizeRequestSchema,
  SdcTranscriptTailRequestSchema,
  classifyTaskRoles,
  TaskCreateRequestSchema,
  TaskDecisionRequestSchema,
  TaskLinkRequestSchema,
  TaskUpdateStateRequestSchema,
  WorkspaceCreateRequestSchema,
  WorkspaceRenameRequestSchema,
  WorkspaceSetActiveRequestSchema,
  ProjectCreateRequestSchema,
  ProjectUpdateRequestSchema,
  ProjectRemoveRequestSchema,
  ProjectSetActiveRequestSchema,
  ProjectGitBranchRequestSchema,
  ProjectReadDirRequestSchema,
  ProjectReadFileRequestSchema,
  TerminalLinkCreateRequestSchema,
  TerminalLinkRemoveRequestSchema,
  TerminalLinkSetModeRequestSchema,
  type ProjectDirEntry,
  type SessionEvent,
  type TaskEvent,
  type TerminalLinkEvent
} from '@cockpit/shared';
import { readScrollbackTail, type DaemonSessionInfo } from '@cockpit/pty-host';

/**
 * Cola entre SessionRegistry (fonte de verdade, @cockpit/core) e o mundo:
 * canais IPC de sessão e layout + eventos de domínio via push + persistência
 * contínua (Story 1.4: StateStore + WriteQueue — o input nunca espera I/O).
 */

/**
 * Backend de PTY (Story 6.3) — satisfeito estruturalmente pelo
 * PtyHostManager (utilityProcess) e pelo DaemonManager (named pipe).
 * listSessions/adoptPty só existem no daemon: habilitam a adoção no boot.
 */
export interface PtyBackend {
  createPty(opts: {
    sessionId: string;
    cols: number;
    rows: number;
    cwd?: string;
    adapterId?: string;
    restore?: boolean;
  }): Promise<{ ptyId: string; pid: number; rendererPort: Electron.MessagePortMain }>;
  closePty(ptyId: string): Promise<{ orphan: boolean }>;
  resizePty(ptyId: string, cols: number, rows: number): void;
  listAdapters(): Promise<Array<{ id: string; displayName: string }>>;
  onSessionExit(cb: (ptyId: string, exitCode: number) => void): void;
  onSessionStatus(cb: (ptyId: string, status: string) => void): void;
  onHostExit(cb: () => void): void;
  listSessions?(): Promise<DaemonSessionInfo[]>;
  adoptPty?(sessionId: string): Promise<{ pid: number; rendererPort: Electron.MessagePortMain }>;
}

export interface SessionIpcHandle {
  registry: SessionRegistry;
  persistence: PersistenceManager;
  queue: WriteQueue;
  /** true se o boot anterior não fechou graciosamente (Story 4.3, FR12). */
  crashDetected: boolean;
  /**
   * Restore do boot (AC2 da 1.4) — chamar após registrar tudo. Quando
   * `crashDetected` é true, NÃO chamar automaticamente: a Recovery Screen
   * (4.3) resolve via IPC (`recovery.resolve`), que roda este MESMO caminho.
   */
  restore(): Promise<{ restored: number; archived: number; adopted: number; elapsedMs: number }>;
}

export function registerSessionIpc(
  ptyHost: PtyBackend,
  store: StateStore,
  applyBatch: (batch: Array<() => void>) => void,
  /** Story 7.3: diretório de scrollback (mesma config de 1.4/6.x) — leitura passiva de trecho recente. */
  opts?: { scrollbackDir?: string }
): SessionIpcHandle {
  // Porta de cada createPty fica estacionada até o registry devolver o session id.
  const parkedPorts = new Map<string, Electron.MessagePortMain>();

  const registry = new SessionRegistry({
    createPty: async ({ sessionId, cols, rows, cwd, adapterId, restore }) => {
      const created = await ptyHost.createPty({
        sessionId,
        cols,
        rows,
        ...(cwd !== undefined ? { cwd } : {}),
        ...(adapterId !== undefined ? { adapterId } : {}),
        ...(restore !== undefined ? { restore } : {})
      });
      parkedPorts.set(sessionId, created.rendererPort);
      return { ptyId: created.ptyId, pid: created.pid };
    },
    closePty: (ptyId) => ptyHost.closePty(ptyId),
    resizePty: (ptyId, cols, rows) => ptyHost.resizePty(ptyId, cols, rows)
  });

  const queue = new WriteQueue(applyBatch);
  const persistence = new PersistenceManager(store, queue);
  persistence.wire(registry);

  // Tarefas (Story 5.1, FR13) — independentes do daemon/crash-recovery de
  // sessões; carregadas direto no wiring (AC3: sobrevivem a restart).
  const taskManager = new TaskManager(store, queue);
  taskManager.load();
  taskManager.onEvent((event: TaskEvent) => {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send(IpcChannels.taskEvent, event);
    }
  });

  // Vínculo terminal-a-terminal (Épico 9, FR25) — mesmo padrão do TaskManager.
  const terminalLinkManager = new TerminalLinkManager(store, queue);
  terminalLinkManager.load();
  terminalLinkManager.onEvent((event: TerminalLinkEvent) => {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send(IpcChannels.terminalLinkEvent, event);
    }
  });

  // Antecipado (Story 4.3): precisa estar resolvido ANTES do primeiro IPC
  // para o handle já nascer sabendo se há uma Recovery Screen a resolver.
  const { cleanShutdown } = persistence.markBootStart();
  const crashDetected = !cleanShutdown;
  let recoveryResolved = !crashDetected;

  // Projetos (Story 8.1, FR21): primeiro boot cria o "Padrão" apontando pro
  // MESMO cwd que sessões sem projeto já usavam (session-registry.ts,
  // `opts.cwd ?? process.cwd()`) — zero regressão no comportamento atual.
  persistence.ensureDefaultProject(process.cwd());

  // Exit espontâneo do shell → registro reflete (exitCode → relatório 3.5);
  // host caiu → todas exited.
  ptyHost.onSessionExit((ptyId, exitCode) => registry.markExited(ptyId, exitCode));
  // Status do agente (FR5 — Story 2.1): adapter → host → registry → UI.
  ptyHost.onSessionStatus((ptyId, status) => {
    const parsed = AgentStatusSchema.safeParse(status);
    if (parsed.success) registry.markAgentStatus(ptyId, parsed.data);
  });
  ptyHost.onHostExit(() => {
    for (const record of registry.list()) {
      if (record.status === 'running') registry.markExited(registry.ptyIdOf(record.id));
    }
  });

  // Push de eventos de domínio para todas as janelas; porta segue junto
  // (o renderer pode ainda não existir no restore — enviar na criação da janela).
  registry.onEvent((event: SessionEvent) => {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send(IpcChannels.sessionEvent, event);
    }
  });

  // Roteamento automático escritor → revisores (Story 7.2, FR17). AC4
  // (idempotência) é DE GRAÇA: markAgentStatus só emite 'status' quando o
  // valor REALMENTE muda (guard desde a 2.1) — este listener só roda em
  // transições reais, nunca em toda checagem de status. `emit()` do
  // registry não isola exceções entre listeners — try/catch obrigatório
  // para não derrubar a persistência/espelho da UI que também escutam.
  registry.onEvent((event: SessionEvent) => {
    if (event.type !== 'status') return;
    try {
      const s = event.session;
      const task = s.taskId ? taskManager.find(s.taskId) : null;
      const routing = planSdcReviewRouting(s, task, registry.list());
      if (!routing) return;

      taskManager.updateState(routing.taskId, 'awaiting_decision', 'system');
      for (const reviewerId of routing.reviewerIds) {
        persistence.recordSdcReviewRequest(reviewerId, { taskId: routing.taskId, writerId: routing.writerId });
      }
      for (const win of BrowserWindow.getAllWindows()) {
        win.webContents.send(IpcChannels.sdcReviewRequested, routing);
      }
    } catch (err) {
      console.error('[sdc] roteamento automático de revisão falhou:', err);
    }
  });

  // Vínculo terminal-a-terminal (Story 9.1, AC3): remove todo vínculo que
  // referencia um terminal fechado (não em 'exited' — o processo pode
  // relançar no restore/adoção; 'closed' é a exclusão definitiva).
  registry.onEvent((event: SessionEvent) => {
    if (event.type !== 'closed') return;
    try {
      terminalLinkManager.removeForTerminal(event.session.id);
    } catch (err) {
      console.error('[terminalLink] limpeza pós-fechamento falhou:', err);
    }
  });

  // Roteamento automático de vínculo terminal-a-terminal (Story 9.2, FR26) —
  // mesmo padrão do roteamento SDC (7.2): função pura decide, este listener
  // só executa os efeitos colaterais quando o retorno não é null.
  registry.onEvent((event: SessionEvent) => {
    if (event.type !== 'status') return;
    try {
      const routing = planTerminalLinkRouting(event.session, terminalLinkManager.list());
      if (!routing) return;

      for (const targetId of routing.targetIds) {
        persistence.recordTerminalLinkRouting(targetId, { sourceId: routing.sourceId });
      }
      for (const win of BrowserWindow.getAllWindows()) {
        win.webContents.send(IpcChannels.terminalLinkRouted, routing);
      }
    } catch (err) {
      console.error('[terminalLink] roteamento automático falhou:', err);
    }
  });

  const deliverPort = (sessionId: string, target: Electron.WebContents): boolean => {
    const port = parkedPorts.get(sessionId);
    if (!port) return false;
    parkedPorts.delete(sessionId);
    target.postMessage(IpcChannels.terminalPort, { id: sessionId }, [port]);
    return true;
  };

  ipcMain.handle(IpcChannels.sessionCreate, async (event, raw: unknown) => {
    const req = SessionCreateRequestSchema.parse(raw);
    // Projeto de destino (Story 8.2/8.3): ativo por padrão, ou um id
    // específico (AC3 — atalho a partir da barra lateral, sem trocar o
    // ativo). rootPath vira o cwd default quando o chamador não passa cwd.
    const { projects, activeId } = persistence.projects();
    const projectId = req.projectId ?? activeId;
    const project = projects.find((p) => p.id === projectId);
    const record = await registry.create({
      ...req,
      projectId,
      cwd: req.cwd ?? project?.rootPath
    });
    deliverPort(record.id, event.sender);
    return record;
  });

  ipcMain.handle(IpcChannels.sessionRename, (_event, raw: unknown) => {
    const req = SessionRenameRequestSchema.parse(raw);
    return registry.rename(req.id, req.name);
  });

  ipcMain.handle(IpcChannels.sessionClose, async (_event, raw: unknown) => {
    const req = SessionCloseRequestSchema.parse(raw);
    return await registry.close(req.id);
  });

  ipcMain.handle(IpcChannels.sessionResize, (_event, raw: unknown) => {
    const req = SessionResizeRequestSchema.parse(raw);
    registry.resize(req.id, req.cols, req.rows);
  });

  // Sessões restauradas no boot têm portas estacionadas: o renderer chama
  // session.list ao montar — é o momento de entregá-las.
  ipcMain.handle(IpcChannels.sessionList, (event) => {
    const records = registry.list();
    for (const record of records) deliverPort(record.id, event.sender);
    return records;
  });

  ipcMain.handle(IpcChannels.sessionInstructed, (_event, raw: unknown) => {
    const req = z.object({ id: z.string().min(1), text: z.string() }).parse(raw);
    persistence.recordInstruction(req.id, req.text);
  });

  ipcMain.handle(IpcChannels.sessionLinkTask, (_event, raw: unknown) => {
    const req = TaskLinkRequestSchema.parse(raw);
    return registry.linkTask(req.terminalId, req.taskId, req.role);
  });

  ipcMain.handle(IpcChannels.sessionReport, (_event, raw: unknown) => {
    const req = SessionReportRequestSchema.parse(raw);
    return persistence.sessionReport(req.id);
  });

  // Workspaces (Story 3.6)
  ipcMain.handle(IpcChannels.workspaceList, () => persistence.workspaces());
  ipcMain.handle(IpcChannels.workspaceCreate, (_event, raw: unknown) => {
    const req = WorkspaceCreateRequestSchema.parse(raw);
    return persistence.createWorkspace(req.name);
  });
  ipcMain.handle(IpcChannels.workspaceRename, (_event, raw: unknown) => {
    const req = WorkspaceRenameRequestSchema.parse(raw);
    return persistence.renameWorkspace(registry, req.from, req.to);
  });
  ipcMain.handle(IpcChannels.workspaceSetActive, (_event, raw: unknown) => {
    const req = WorkspaceSetActiveRequestSchema.parse(raw);
    return persistence.setActiveWorkspace(req.name);
  });

  // Projetos (Story 8.1, FR21)
  ipcMain.handle(IpcChannels.projectList, () => persistence.projects());
  ipcMain.handle(IpcChannels.projectCreate, (_event, raw: unknown) => {
    const req = ProjectCreateRequestSchema.parse(raw);
    return persistence.createProject(req);
  });
  ipcMain.handle(IpcChannels.projectUpdate, (_event, raw: unknown) => {
    const req = ProjectUpdateRequestSchema.parse(raw);
    return persistence.updateProject({
      id: req.id,
      ...(req.name !== undefined ? { name: req.name } : {}),
      ...(req.color !== undefined ? { color: req.color } : {}),
      ...(req.rootPath !== undefined ? { rootPath: req.rootPath } : {})
    });
  });
  ipcMain.handle(IpcChannels.projectRemove, async (_event, raw: unknown) => {
    const req = ProjectRemoveRequestSchema.parse(raw);
    // Story 16.1: valida ANTES de fechar terminais — remover o último projeto
    // é rejeitado sem efeito colateral nenhum (mesma regra do persistence).
    if (persistence.projects().projects.length <= 1) {
      throw new Error('não é possível remover o último projeto restante');
    }
    // Fecha os terminais do projeto antes de remover (decisão do fundador,
    // 16.1): exclusão definitiva, sem sessões órfãs; vínculos caem via o
    // listener de 'closed' já existente (9.1 AC3).
    for (const s of registry.list()) {
      if (s.projectId === req.id) await registry.close(s.id);
    }
    return persistence.removeProject(req.id);
  });
  ipcMain.handle(IpcChannels.projectSetActive, (_event, raw: unknown) => {
    const req = ProjectSetActiveRequestSchema.parse(raw);
    return persistence.setActiveProject(req.id);
  });
  // Diálogo nativo de pasta (Story 8.2, AC4) — null se o usuário cancelar.
  ipcMain.handle(IpcChannels.projectPickFolder, async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const result = win
      ? await dialog.showOpenDialog(win, { properties: ['openDirectory'] })
      : await dialog.showOpenDialog({ properties: ['openDirectory'] });
    return result.canceled || result.filePaths.length === 0 ? null : result.filePaths[0];
  });

  // Explorador de arquivos (Story 8.4, FR23) — leitura no Main (node:fs),
  // nunca no renderer (AC4). Contenção de caminho (isPathWithin) é defesa
  // em profundidade — o renderer só navega o que o Main já devolveu.
  const loadGitignore = async (rootPath: string): Promise<string[]> => {
    try {
      const content = await fsReadFile(join(rootPath, '.gitignore'), 'utf-8');
      return parseGitignorePatterns(content);
    } catch {
      return [];
    }
  };

  ipcMain.handle(IpcChannels.projectReadDir, async (_event, raw: unknown) => {
    const req = ProjectReadDirRequestSchema.parse(raw);
    const { projects, activeId } = persistence.projects();
    const project = projects.find((p) => p.id === (req.projectId ?? activeId));
    if (!project) return [];

    const root = resolve(project.rootPath);
    const target = resolve(req.dirPath ?? project.rootPath);
    if (!isPathWithin(root, target)) return [];

    const patterns = await loadGitignore(root);
    let dirents;
    try {
      dirents = await readdir(target, { withFileTypes: true });
    } catch {
      return [];
    }

    const entries: ProjectDirEntry[] = [];
    for (const entry of dirents) {
      if (ALWAYS_HIDDEN_NAMES.has(entry.name)) continue;
      const fullPath = join(target, entry.name);
      const relPath = relative(root, fullPath).split('\\').join('/');
      const isDirectory = entry.isDirectory();
      if (isGitignored(relPath, isDirectory, patterns)) continue;
      entries.push({ name: entry.name, path: fullPath, isDirectory });
    }
    return entries.sort((a, b) =>
      a.isDirectory === b.isDirectory ? a.name.localeCompare(b.name) : a.isDirectory ? -1 : 1
    );
  });

  // Configurações do app (Story 13.5, FR46) — JSON único em app_meta;
  // parsing tolerante: JSON quebrado ou valores inválidos degradam pros
  // defaults (o schema tem catch/default por campo), nunca erro.
  const readSettings = (): AppSettings => {
    let parsed: unknown = {};
    try {
      parsed = JSON.parse(persistence.appSettingsRaw() ?? '{}');
    } catch {
      parsed = {};
    }
    return AppSettingsSchema.parse(typeof parsed === 'object' && parsed !== null ? parsed : {});
  };
  ipcMain.handle(IpcChannels.settingsGet, () => readSettings());
  ipcMain.handle(IpcChannels.settingsUpdate, (_event, raw: unknown) => {
    const req = SettingsUpdateRequestSchema.parse(raw);
    const next = { ...readSettings(), ...req };
    persistence.setAppSettingsRaw(JSON.stringify(next));
    return next;
  });

  // Central de API (Story 15.4, FR56) — a chave chega em texto plano SÓ no
  // trajeto IPC local cadastro→Main, é criptografada via safeStorage
  // (keychain/DPAPI do SO) e persiste como ciphertext base64; NENHUM canal
  // devolve a chave (nem cifrada) ao renderer, e não existe decrypt hoje
  // (nenhum consumidor — decisão consciente do fundador).
  interface StoredApiProvider extends ApiProvider {
    keyCipher: string;
  }
  const readApiProviders = (): StoredApiProvider[] => {
    try {
      const parsed: unknown = JSON.parse(persistence.apiProvidersRaw() ?? '[]');
      return Array.isArray(parsed) ? (parsed as StoredApiProvider[]) : [];
    } catch {
      return [];
    }
  };
  const publicApiProviders = (list: StoredApiProvider[]): ApiProvider[] =>
    list.map(({ id, type, name, baseUrl, defaultModel }) => ({
      id,
      type,
      name,
      baseUrl,
      ...(defaultModel !== undefined ? { defaultModel } : {})
    }));

  ipcMain.handle(IpcChannels.apiProviderList, () => publicApiProviders(readApiProviders()));
  ipcMain.handle(IpcChannels.apiProviderCreate, (_event, raw: unknown) => {
    const req = ApiProviderCreateRequestSchema.parse(raw);
    if (!safeStorage.isEncryptionAvailable()) {
      // NUNCA texto plano (FR56): sem keychain disponível, cadastro recusado.
      throw new Error('keychain do sistema indisponível — cadastro recusado (a chave nunca é gravada em texto plano)');
    }
    const keyCipher = safeStorage.encryptString(req.apiKey).toString('base64');
    const entry: StoredApiProvider = {
      id: ulid(),
      type: req.type,
      name: req.name,
      baseUrl: req.baseUrl,
      ...(req.defaultModel !== undefined && req.defaultModel !== '' ? { defaultModel: req.defaultModel } : {}),
      keyCipher
    };
    const next = [...readApiProviders(), entry];
    persistence.setApiProvidersRaw(JSON.stringify(next));
    return publicApiProviders(next);
  });
  ipcMain.handle(IpcChannels.apiProviderRemove, (_event, raw: unknown) => {
    const req = ApiProviderRemoveRequestSchema.parse(raw);
    const next = readApiProviders().filter((p) => p.id !== req.id);
    persistence.setApiProvidersRaw(JSON.stringify(next));
    return publicApiProviders(next);
  });

  // Branch git do projeto (Story 13.3, FR44) — lê .git/HEAD direto (sem
  // spawnar git: mais barato, sem dependência de PATH). `.git` como ARQUIVO
  // (worktree/submódulo) é seguido via gitdir. Qualquer falha = null (projeto
  // sem repositório mostra estado neutro, nunca erro).
  ipcMain.handle(IpcChannels.projectGitBranch, async (_event, raw: unknown) => {
    const req = ProjectGitBranchRequestSchema.parse(raw);
    const { projects, activeId } = persistence.projects();
    const project = projects.find((p) => p.id === (req.projectId ?? activeId));
    if (!project) return null;
    try {
      const root = resolve(project.rootPath);
      let gitDir = join(root, '.git');
      if ((await fsStat(gitDir)).isFile()) {
        const pointer = parseGitdirPointer(await fsReadFile(gitDir, 'utf-8'));
        if (!pointer) return null;
        gitDir = resolve(root, pointer);
      }
      return parseGitHead(await fsReadFile(join(gitDir, 'HEAD'), 'utf-8'));
    } catch {
      return null;
    }
  });

  ipcMain.handle(IpcChannels.projectReadFile, async (_event, raw: unknown) => {
    const req = ProjectReadFileRequestSchema.parse(raw);
    const { projects } = persistence.projects();
    const target = resolve(req.path);
    if (!projects.some((p) => isPathWithin(resolve(p.rootPath), target))) return null;

    try {
      const buf = await fsReadFile(target);
      // Heurística simples de binário: byte nulo nos primeiros 8000 bytes.
      if (buf.subarray(0, 8000).includes(0)) return null;
      return {
        content: buf.subarray(0, req.maxBytes).toString('utf-8'),
        truncated: buf.byteLength > req.maxBytes
      };
    } catch {
      return null;
    }
  });

  // Vínculo terminal-a-terminal (Épico 9, Story 9.1, FR25) — origem e alvo
  // precisam existir e pertencer ao MESMO projeto (AC4); a mensagem exata
  // de erro fica visível ao chamador (Promise rejeitada no renderer).
  ipcMain.handle(IpcChannels.terminalLinkCreate, (_event, raw: unknown) => {
    const req = TerminalLinkCreateRequestSchema.parse(raw);
    const sessions = registry.list();
    const source = sessions.find((s) => s.id === req.sourceId);
    const target = sessions.find((s) => s.id === req.targetId);
    if (!source || !target) throw new Error('terminal de origem/alvo não encontrado');
    if (source.projectId !== target.projectId) {
      throw new Error('vínculo só é permitido entre terminais do mesmo projeto');
    }
    return terminalLinkManager.create({
      sourceId: req.sourceId,
      targetId: req.targetId,
      mode: req.mode,
      projectId: source.projectId
    });
  });
  ipcMain.handle(IpcChannels.terminalLinkRemove, (_event, raw: unknown) => {
    const req = TerminalLinkRemoveRequestSchema.parse(raw);
    terminalLinkManager.remove(req.id);
  });
  // Troca de modo direto no canvas (Story 16.2) — o push ('updated') espelha na UI.
  ipcMain.handle(IpcChannels.terminalLinkSetMode, (_event, raw: unknown) => {
    const req = TerminalLinkSetModeRequestSchema.parse(raw);
    return terminalLinkManager.setMode(req.id, req.mode);
  });
  ipcMain.handle(IpcChannels.terminalLinkList, () => terminalLinkManager.list());

  // Tarefas (Story 5.1)
  ipcMain.handle(IpcChannels.taskCreate, (_event, raw: unknown) => {
    const req = TaskCreateRequestSchema.parse(raw);
    // Projeto ativo (Story 8.2, FR22) — toda tarefa nova nasce nele.
    const { activeId } = persistence.projects();
    return taskManager.create({
      title: req.title,
      projectId: activeId,
      ...(req.description !== undefined ? { description: req.description } : {})
    });
  });
  ipcMain.handle(IpcChannels.taskUpdateState, (_event, raw: unknown) => {
    const req = TaskUpdateStateRequestSchema.parse(raw);
    return taskManager.updateState(req.id, req.state);
  });
  ipcMain.handle(IpcChannels.taskList, () => taskManager.list());

  // Decisao humana (Story 5.3): estado da tarefa (TaskManager) +, no
  // redirect, transferencia do vinculo (SessionRegistry) — so o Main enxerga
  // os dois lados. registry.list() e a fonte VIVA (nao o store). Story 7.4
  // estende os dois ramos p/ preservar (redirect) e alimentar (reject) o
  // modo three-brain — papeis ANTES da decisao, pois reject nao muda vinculo
  // mas redirect precisa saber quem era o escritor antigo.
  ipcMain.handle(IpcChannels.taskDecide, (_event, raw: unknown) => {
    const req = TaskDecisionRequestSchema.parse(raw);
    const sessionsBefore = registry.list();
    const rolesBefore = classifyTaskRoles(sessionsBefore, req.taskId);
    const updated = taskManager.decide(req.taskId, req.action, req.justification);

    if (req.action === 'redirect' && req.redirectTo) {
      const allLinkedIds = sessionsBefore.filter((s) => s.taskId === req.taskId).map((s) => s.id);
      const plan = planSdcRedirect(rolesBefore, allLinkedIds, req.redirectTo);
      for (const id of plan.unlinkIds) registry.linkTask(id, null);
      registry.linkTask(plan.link.id, req.taskId, plan.link.role);
    }

    if (req.action === 'reject') {
      try {
        const transcripts: Record<string, string> = {};
        if (opts?.scrollbackDir) {
          for (const r of rolesBefore.reviewers) {
            const file = join(opts.scrollbackDir, `${r.id}.log`);
            transcripts[r.id] = new TextDecoder().decode(readScrollbackTail(file, 4096));
          }
        }
        const correction = planSdcCorrectionRouting(
          req.taskId,
          updated.title,
          rolesBefore,
          transcripts,
          req.justification
        );
        if (correction) {
          persistence.recordSdcCorrectionRequest(correction.writerId, {
            taskId: correction.taskId,
            reviewerIds: correction.reviewerIds
          });
          for (const win of BrowserWindow.getAllWindows()) {
            win.webContents.send(IpcChannels.sdcCorrectionRequested, correction);
          }
        }
      } catch (err) {
        console.error('[sdc] correção agregada falhou:', err);
      }
    }

    return updated;
  });

  // Painel de revisão (Story 7.3, AC1): trecho recente do scrollback
  // PERSISTIDO (mesmo arquivo da 1.4/6.2) — leitura passiva, nunca abre uma
  // segunda MessagePort concorrente com o tile real (decisão crítica 4).
  ipcMain.handle(IpcChannels.sdcTranscriptTail, (_event, raw: unknown) => {
    const req = SdcTranscriptTailRequestSchema.parse(raw);
    if (!opts?.scrollbackDir) return '';
    const file = join(opts.scrollbackDir, `${req.terminalId}.log`);
    return new TextDecoder().decode(readScrollbackTail(file, req.maxBytes));
  });

  ipcMain.handle(IpcChannels.adapterList, () => ptyHost.listAdapters());

  // Disponibilidade de comando no PATH (Story 13.4, FR45) — scan manual de
  // fs.access (nada é executado; `where` spawnaria um processo por checagem).
  // O schema já rejeita separadores de caminho — só nome de arquivo simples.
  ipcMain.handle(IpcChannels.adapterCheckCommand, async (_event, raw: unknown) => {
    const req = AdapterCheckCommandRequestSchema.parse(raw);
    const dirs = (process.env.PATH ?? '').split(';').filter(Boolean);
    for (const dir of dirs) {
      const candidate = join(dir, req.command);
      try {
        if ((await fsStat(candidate)).isFile()) return candidate;
      } catch {
        // não existe neste diretório — segue
      }
    }
    return null;
  });

  ipcMain.handle(IpcChannels.timelineGet, (_event, raw: unknown) => {
    const req = TimelineGetRequestSchema.parse(raw ?? {});
    return persistence.timeline({
      limit: req.limit,
      ...(req.terminalId !== undefined ? { terminalId: req.terminalId } : {}),
      ...(req.type !== undefined ? { type: req.type } : {})
    });
  });

  ipcMain.handle(IpcChannels.layoutGet, () => persistence.savedLayout());

  ipcMain.handle(IpcChannels.layoutUpdate, (_event, raw: unknown) => {
    const req = LayoutUpdateRequestSchema.parse(raw);
    persistence.persistLayout(req.tiles);
  });

  // Adoção (6.3): sessões vivas no daemon casadas com os terminais
  // persistidos — adota (attach+replay) ANTES do relaunch da 1.4.
  const adoptFromDaemon = async (): Promise<number> => {
    if (!ptyHost.listSessions || !ptyHost.adoptPty) return 0;
    let alive: Map<string, DaemonSessionInfo>;
    try {
      alive = new Map((await ptyHost.listSessions()).map((s) => [s.id, s]));
    } catch {
      return 0; // sem daemon utilizável → restore clássico cuida de tudo
    }
    let adopted = 0;
    for (const t of store.listActiveTerminals()) {
      const live = alive.get(t.id);
      if (!live) continue;
      try {
        const { rendererPort } = await ptyHost.adoptPty(t.id);
        parkedPorts.set(t.id, rendererPort);
        registry.adopt({
          id: t.id,
          name: t.name,
          cwd: t.cwd,
          adapterId: t.adapterId,
          workspace: t.workspace,
          taskId: t.taskId,
          taskRole: t.taskRole,
          projectId: t.projectId,
          pid: live.pid,
          createdAt: t.createdAt
        });
        persistence.recordAdoption(t.id, { name: t.name, adapterId: t.adapterId, pid: live.pid });
        adopted++;
      } catch (err) {
        console.error(`[daemon] adoção falhou p/ ${t.id} — cai no relaunch:`, err);
      }
    }
    return adopted;
  };

  // Time-to-resume (AC1 da 4.2): adoção + relaunch clássico, do primeiro I/O
  // até a última sessão relançada — não inclui createWindow()/boot do
  // Electron (constantes de plataforma fora do controle desta lógica).
  // Caminho ÚNICO: usado tanto pelo boot automático quanto pela resolução
  // da Recovery Screen (4.3) — nenhuma lógica duplicada entre os dois.
  const performResume = async (): Promise<{ restored: number; archived: number; adopted: number; elapsedMs: number }> => {
    const startedAt = Date.now();
    const adopted = await adoptFromDaemon();
    const { restored, archived } = await persistence.restore(registry);
    resumeDone = true; // libera a adoção AO VIVO (16.3) — só depois do boot completo
    return { restored, archived, adopted, elapsedMs: Date.now() - startedAt };
  };

  // Adoção AO VIVO de sessões externas (Story 16.3, Épico 16): sessões
  // criadas por clientes externos do daemon (ex.: agente orquestrador via
  // pipe) viram tile na hora, sem relançar o app. Poll leve (4s); knownIds
  // inclui parkedPorts pra fechar o race com creates do próprio app (o id
  // entra em parkedPorts ANTES de registry.create resolver).
  let resumeDone = false;
  let adoptingExternal = false;
  const adoptExternalSessions = async (): Promise<void> => {
    if (!resumeDone || adoptingExternal || !ptyHost.listSessions || !ptyHost.adoptPty) return;
    adoptingExternal = true;
    try {
      const live = await ptyHost.listSessions();
      const known = new Set([...registry.list().map((s) => s.id), ...parkedPorts.keys()]);
      const { projects } = persistence.projects();
      const workspace = persistence.workspaces().active;
      for (const plan of planExternalAdoption(live, known, projects)) {
        try {
          const { rendererPort } = await ptyHost.adoptPty(plan.id);
          parkedPorts.set(plan.id, rendererPort);
          // 'created' emitido aqui: persistência upserta e o renderer cria o tile.
          registry.adopt({
            id: plan.id,
            name: plan.name,
            cwd: plan.cwd,
            adapterId: plan.adapterId,
            workspace,
            projectId: plan.projectId,
            pid: plan.pid,
            createdAt: plan.createdAt
          });
          persistence.recordAdoption(plan.id, { name: plan.name, adapterId: plan.adapterId, pid: plan.pid });
          // Vínculo automático worker→chefe (Story 17.2, AC1/AC3): o término
          // do worker dispara a instrução no chefe (FR26). Mesma regra do
          // vínculo manual: só entre terminais do MESMO projeto — violação
          // não bloqueia a adoção, só loga.
          if (plan.dispatchedBy !== null) {
            const chefe = registry.list().find((s) => s.id === plan.dispatchedBy);
            if (chefe === undefined) {
              console.warn(`[daemon] vínculo do despacho ignorado: chefe ${plan.dispatchedBy} não existe no registry`);
            } else if (chefe.projectId !== plan.projectId) {
              console.warn(
                `[daemon] vínculo do despacho ignorado: chefe (${chefe.projectId}) e worker (${plan.projectId}) em projetos diferentes`
              );
            } else {
              terminalLinkManager.create({
                sourceId: plan.id,
                targetId: chefe.id,
                mode: 'auto',
                projectId: plan.projectId
              });
            }
          }
          for (const win of BrowserWindow.getAllWindows()) {
            if (deliverPort(plan.id, win.webContents)) break;
          }
        } catch (err) {
          console.error(`[daemon] adoção externa falhou p/ ${plan.id}:`, err);
        }
      }
    } catch {
      // daemon fora do ar — próximo tick tenta de novo
    } finally {
      adoptingExternal = false;
    }
  };
  setInterval(() => void adoptExternalSessions(), 4000).unref();

  // Recuperação pós-crash (Story 4.3)
  ipcMain.handle(IpcChannels.recoverySummary, () => {
    if (!crashDetected || recoveryResolved) return null;
    return persistence.crashSummary();
  });

  ipcMain.handle(IpcChannels.recoveryResolve, async (_event, raw: unknown) => {
    const req = RecoveryResolveRequestSchema.parse(raw);
    if (req.choice === 'clean') {
      for (const t of store.listActiveTerminals()) persistence.archiveForCrash(t.id);
    } else if (req.choice === 'selective') {
      const keep = new Set(req.keepIds ?? []);
      for (const t of store.listActiveTerminals()) {
        if (!keep.has(t.id)) persistence.archiveForCrash(t.id);
      }
    }
    queue.flush(); // arquivamentos visíveis para o performResume() a seguir
    const { restored, archived, adopted } = await performResume();
    persistence.recordCrashRecovery(req.choice, { restored, archived, adopted });
    recoveryResolved = true;
    return { restored, archived, adopted };
  });

  return {
    registry,
    persistence,
    queue,
    crashDetected,
    restore: performResume
  };
}
