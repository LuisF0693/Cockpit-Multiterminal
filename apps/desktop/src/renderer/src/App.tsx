import { useEffect, useRef, useState } from 'react';
import {
  TERMINAL_PORT_MESSAGE,
  classifyTaskRoles,
  type AdapterInfo,
  type AppInfo,
  type CockpitApi,
  type TerminalPortMessage
} from '@cockpit/shared';
import {
  ADAPTER_CATALOG,
  AgentCatalog,
  AppSidebar,
  BrowserPreviewTile,
  CanvasMinimap,
  FilePreviewPanel,
  LearningsView,
  LifecycleBoard,
  MasterDashboard,
  PromptModal,
  RecoveryScreen,
  ReviewPanel,
  SessionCardsBar,
  SessionReportView,
  SettingsView,
  StatusPulseStyles,
  TasksPanel,
  PROJECT_PALETTE,
  TelemetryPanel,
  TerminalTile,
  TimelineView,
  canvasBackground,
  matchShortcut,
  statusColor,
  theme,
  type MinimapTile,
  type PreviewFile
} from '@cockpit/ui';
import type {
  AppSettings,
  CrashSummary,
  DaemonStatus,
  ProjectDirEntry,
  Learning,
  Project,
  SessionReport,
  Task,
  TaskRole,
  TaskState,
  TerminalLink,
  TerminalLinkMode,
  TimelineEvent,
  WorkspaceList
} from '@cockpit/shared';
import { useCockpitStore } from './cockpit-store';

declare global {
  interface Window {
    cockpit: CockpitApi;
  }
}

/**
 * Story 1.3: canvas com liberdade de arranjo — múltiplos terminais em tiles
 * móveis/redimensionáveis + sidebar em árvore + atalhos centrais.
 * A UI reflete eventos do SessionRegistry (Main); nunca é dona das sessões.
 */
export function App(): JSX.Element {
  const [info, setInfo] = useState<AppInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adapters, setAdapters] = useState<AdapterInfo[]>([]);
  // Adapter default do "+ novo terminal"/Ctrl+N — a criação por adapter
  // específico vive na sidebar (NOVO AGENTE, 14.2) e no catálogo (13.4).
  const selectedAdapter = 'shell';
  // Modelo do Ollama (Story 12.6) — só relevante quando o adapter selecionado
  // é 'ollama'; ollama exige `run <modelo>` por sessão, não é fixo no adapter.
  const [ollamaModel, setOllamaModel] = useState('llama3');
  // Configurações (Story 13.5, FR46) — carregadas no boot e APLICADAS de
  // verdade: modelo default do Ollama, intervalo do preview, zoom inicial.
  // Declarado AQUI (antes dos efeitos que dependem de `settings`) — o array
  // de dependências avalia durante o render, TDZ derrubaria o boot.
  const [settings, setSettings] = useState<AppSettings | null>(null);
  useEffect(() => {
    void window.cockpit.settings
      .get()
      .then((s) => {
        setSettings(s);
        setOllamaModel(s.ollamaDefaultModel);
        setCanvasZoom(clampZoom(s.canvasDefaultZoom));
      })
      .catch(() => void 0);
  }, []);

  const saveSettings = (next: AppSettings): void => {
    void window.cockpit.settings
      .update(next)
      .then((s) => {
        setSettings(s);
        setOllamaModel(s.ollamaDefaultModel);
      })
      .catch((e: unknown) => setError(String(e instanceof Error ? e.message : e)));
  };
  // Master é a tela inicial (Story 3.1, AC4); o canvas fica montado escondido.
  // 'recovery' (4.3) precede tudo quando o boot anterior não fechou gracioso.
  const [view, setView] = useState<
    | 'master'
    | 'canvas'
    | 'timeline'
    | 'report'
    | 'recovery'
    | 'tasks'
    | 'board'
    | 'review'
    | 'learnings'
    | 'agents'
    | 'settings'
  >('master');
  const viewRef = useRef(view);
  viewRef.current = view;
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  // Relatório de sessão (Story 3.5): id alvo + dados carregados.
  const [reportId, setReportId] = useState<string | null>(null);
  const [report, setReport] = useState<SessionReport | null>(null);
  const [reportEvents, setReportEvents] = useState<TimelineEvent[]>([]);
  // Workspaces (Story 3.6): lista + ativo persistidos no state store.
  const [workspaces, setWorkspaces] = useState<WorkspaceList>({ names: ['Geral'], active: 'Geral' });
  const workspacesRef = useRef(workspaces);
  workspacesRef.current = workspaces;
  // Projetos (Story 8.2): caminho raiz real no disco — DIFERENTE de workspace
  // (agrupamento de tiles dentro de um projeto). Escopa canvas/master/tarefas.
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>('');
  // Vínculo com o daemon (6.4): 'connected' default — modo utilityProcess
  // nunca emite e o badge fica oculto.
  const [daemonState, setDaemonState] = useState<DaemonStatus['state']>('connected');
  // Recuperação pós-crash (Story 4.3): resumo não-nulo bloqueia o boot normal.
  const [crashSummary, setCrashSummary] = useState<CrashSummary | null>(null);
  // Tarefas (Story 5.1): lista espelhada via push (mesmo padrão de sessões).
  const [tasks, setTasks] = useState<Task[]>([]);
  // Vínculos terminal-a-terminal (Épico 9): lista espelhada via push.
  const [terminalLinks, setTerminalLinks] = useState<TerminalLink[]>([]);
  // Arraste de vínculo por gesture no canvas (Story 12.2) — linha de preview
  // segue o cursor (AC2); nulo quando nenhum arraste está em curso.
  const [linkDrag, setLinkDrag] = useState<{ sourceId: string; x: number; y: number } | null>(null);
  const linkDragRef = useRef(linkDrag);
  linkDragRef.current = linkDrag;
  const canvasSectionRef = useRef<HTMLElement | null>(null);
  // Learnings globais (Épico 11): lista espelhada via push — NUNCA escopada
  // ao projeto ativo (Story 11.3, AC2 — "banco separado dos projetos").
  const [learnings, setLearnings] = useState<Learning[]>([]);
  const bootRef = useRef(false);

  const refreshTimeline = (): void => {
    void window.cockpit.timeline
      .get({ limit: 200 })
      .then(setTimelineEvents)
      .catch(() => void 0);
  };

  // Timeline ativa: refresh na entrada + a cada 5s (Story 3.3).
  useEffect(() => {
    if (view !== 'timeline') return;
    refreshTimeline();
    const timer = setInterval(refreshTimeline, 5000);
    return () => clearInterval(timer);
  }, [view]);

  const refreshReport = (id: string): void => {
    void window.cockpit.session.report({ id }).then(setReport).catch(() => setReport(null));
    void window.cockpit.timeline
      .get({ limit: 20, terminalId: id })
      .then(setReportEvents)
      .catch(() => setReportEvents([]));
  };

  // Relatório ativo (Story 3.5): refresh na entrada + a cada 5s.
  useEffect(() => {
    if (view !== 'report' || !reportId) return;
    refreshReport(reportId);
    const timer = setInterval(() => refreshReport(reportId), 5000);
    return () => clearInterval(timer);
  }, [view, reportId]);

  // Painel de revisão (Story 7.3): escritor + tarefa em modo three-brain.
  const [reviewTaskId, setReviewTaskId] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<Record<string, string>>({});

  const refreshTranscripts = (taskId: string): void => {
    const roles = classifyTaskRoles(useCockpitStore.getState().sessions, taskId);
    const ids = (roles.writer ? [roles.writer, ...roles.reviewers] : roles.reviewers).map((s) => s.id);
    void Promise.all(
      ids.map((id) =>
        window.cockpit.sdc
          .transcriptTail({ terminalId: id, maxBytes: 4096 })
          .then((text): [string, string] => [id, text])
      )
    )
      .then((pairs) => setTranscripts(Object.fromEntries(pairs)))
      .catch(() => void 0);
  };

  // Revisão ativa (Story 7.3): mesmo padrão de refresh-na-entrada + 5s.
  useEffect(() => {
    if (view !== 'review' || !reviewTaskId) return;
    refreshTranscripts(reviewTaskId);
    const timer = setInterval(() => refreshTranscripts(reviewTaskId), 5000);
    return () => clearInterval(timer);
  }, [view, reviewTaskId]);

  const goToReview = (taskId: string): void => {
    setReviewTaskId(taskId);
    setView('review');
  };

  const sessions = useCockpitStore((s) => s.sessions);
  const layout = useCockpitStore((s) => s.layout);
  const focusedId = useCockpitStore((s) => s.focusedId);
  const ports = useCockpitStore((s) => s.ports);
  const browserTiles = useCockpitStore((s) => s.browserTiles);
  // Escopo por projeto ativo (Story 8.2, AC2) — sidebar/master/tasks/board
  // só veem o projeto ativo; o canvas (tiles) usa filtro por CSS (abaixo),
  // nunca desmonta (matar xterm/porta é o gotcha da 1.3/3.6).
  const projectSessions = sessions.filter((s) => !activeProjectId || s.projectId === activeProjectId);
  const projectTasks = tasks.filter((t) => !activeProjectId || t.projectId === activeProjectId);
  const projectTerminalLinks = terminalLinks.filter((l) => !activeProjectId || l.projectId === activeProjectId);
  const projectBrowserTiles = browserTiles.filter((t) => !activeProjectId || t.projectId === activeProjectId);

  // Preview de browser (Story 10.1): screenshot da mesma página Playwright
  // do Main, atualizado por poll enquanto o canvas está ativo (mesmo
  // princípio de refresh periódico já usado em timeline/relatório/revisão —
  // não há canal de streaming, seria over-engineering criar um só p/ isto).
  const [browserScreenshots, setBrowserScreenshots] = useState<Record<string, string | null>>({});
  useEffect(() => {
    if (view !== 'canvas' || projectBrowserTiles.length === 0) return;
    const refresh = (): void => {
      for (const tile of projectBrowserTiles) {
        void window.cockpit.browser
          .screenshot({ id: tile.id })
          .then((shot) => setBrowserScreenshots((prev) => ({ ...prev, [tile.id]: shot })))
          .catch(() => void 0);
      }
    };
    refresh();
    // Intervalo configurável (Story 13.5, FR46) — default preserva os 1.5s da 10.1.
    const timer = setInterval(refresh, settings?.browserPreviewIntervalMs ?? 1500);
    return () => clearInterval(timer);
  }, [view, projectBrowserTiles, settings?.browserPreviewIntervalMs]);

  useEffect(() => {
    void window.cockpit
      .getAppInfo()
      .then(setInfo)
      .catch((e: unknown) => setError(String(e instanceof Error ? e.message : e)));

    void window.cockpit.adapter
      .list()
      .then(setAdapters)
      .catch(() => setAdapters([{ id: 'shell', displayName: 'Shell' }]));

    void window.cockpit.workspace
      .list()
      .then(setWorkspaces)
      .catch(() => void 0);

    void window.cockpit.project
      .list()
      .then((list) => {
        setProjects(list.projects);
        setActiveProjectId(list.activeId);
      })
      .catch(() => void 0);

    const unsubDaemon = window.cockpit.daemon.onStatus((s) => setDaemonState(s.state));

    void window.cockpit.task
      .list()
      .then(setTasks)
      .catch(() => void 0);

    // Espelho por push (mesmo padrão de sessões) — upsert por id.
    const unsubTasks = window.cockpit.task.onEvent((event) => {
      setTasks((prev) => {
        const idx = prev.findIndex((t) => t.id === event.task.id);
        if (idx === -1) return [...prev, event.task];
        const next = [...prev];
        next[idx] = event.task;
        return next;
      });
    });

    void window.cockpit.terminalLink
      .list()
      .then(setTerminalLinks)
      .catch(() => void 0);

    // Espelho por push (Épico 9) — created adiciona, removed tira da lista.
    const unsubTerminalLinks = window.cockpit.terminalLink.onEvent((event) => {
      setTerminalLinks((prev) =>
        event.type === 'created' ? [...prev, event.link] : prev.filter((l) => l.id !== event.link.id)
      );
    });

    void window.cockpit.learning
      .list()
      .then(setLearnings)
      .catch(() => void 0);

    // Espelho por push (Épico 11) — upsert por id (mesmo padrão de tasks).
    const unsubLearnings = window.cockpit.learning.onEvent((event) => {
      setLearnings((prev) => {
        const idx = prev.findIndex((l) => l.id === event.learning.id);
        if (idx === -1) return [event.learning, ...prev];
        const next = [...prev];
        next[idx] = event.learning;
        return next;
      });
    });

    // Roteamento automático de revisão (Story 7.2, FR17) — o Main decide
    // QUANDO rotear; só o renderer escreve na PTY (decisão crítica 4), daí
    // instructAgent aqui em vez de no Main.
    const unsubSdc = window.cockpit.sdc.onReviewRequested((event) => {
      for (const reviewerId of event.reviewerIds) instructAgent(reviewerId, event.message);
    });

    // Correção agregada automática ao escritor após rejeição (Story 7.4,
    // FR19) — mesmo motivo do onReviewRequested: só o renderer escreve PTY.
    const unsubSdcCorrection = window.cockpit.sdc.onCorrectionRequested((event) => {
      instructAgent(event.writerId, event.message);
    });

    // Roteamento automático de vínculo terminal-a-terminal (Story 9.2,
    // FR26) — mesmo motivo do onReviewRequested: só o renderer escreve PTY.
    const unsubTerminalLinkRouted = window.cockpit.terminalLink.onRouted((event) => {
      for (const targetId of event.targetIds) instructAgent(targetId, event.message);
    });

    // Portas binárias chegam via window message (tag = session id).
    const onWindowMessage = (event: MessageEvent): void => {
      const data = event.data as Partial<TerminalPortMessage> | undefined;
      if (event.source !== window || data?.type !== TERMINAL_PORT_MESSAGE || !data.id) return;
      const port = event.ports[0];
      if (port) useCockpitStore.getState().attachPort(data.id, port);
    };
    window.addEventListener('message', onWindowMessage);

    // Eventos de domínio → espelho no store.
    const unsubscribe = window.cockpit.session.onEvent((event) => {
      const st = useCockpitStore.getState();
      if (event.type === 'closed') st.removeSession(event.session.id);
      else st.upsertSession(event.session);
    });

    // Tiles de preview de browser (Épico 10) — mesmo padrão de espelho por push.
    const unsubBrowserTiles = window.cockpit.browser.onEvent((event) => {
      const st = useCockpitStore.getState();
      if (event.type === 'removed') st.removeBrowserTile(event.tile.id);
      else st.upsertBrowserTile(event.tile);
    });

    // Recuperação pós-crash (Story 4.3, AC1): se há resumo pendente, a
    // Recovery Screen decide ANTES — sem seed nem terminal automático.
    void window.cockpit.recovery
      .summary()
      .then((summary) => {
        if (summary) {
          setCrashSummary(summary);
          setView('recovery');
        } else {
          seedFromMain();
        }
      })
      .catch(() => seedFromMain()); // falha na checagem não deve travar o boot normal

    // Persistência contínua do layout (debounced — NFR8).
    let persistTimer: ReturnType<typeof setTimeout> | null = null;
    const unsubLayout = useCockpitStore.subscribe((state, prev) => {
      if (state.layout === prev.layout) return;
      if (persistTimer !== null) clearTimeout(persistTimer);
      persistTimer = setTimeout(() => {
        void window.cockpit.layout.update({ tiles: useCockpitStore.getState().layout.tiles });
      }, 300);
    });

    // Atalhos: registro central (Ctrl+N / Ctrl+1..9 / Ctrl+W).
    const onKeyDown = (e: KeyboardEvent): void => {
      const action = matchShortcut(e);
      if (!action) return;
      e.preventDefault();
      if (viewRef.current === 'recovery') return; // 4.3: sem atalhos até resolver
      const st = useCockpitStore.getState();
      if (action.type === 'new-terminal') void newTerminal();
      if (action.type === 'focus-terminal') {
        const target = st.sessions[action.index];
        if (target) {
          st.focus(target.id);
          setView('canvas');
        }
      }
      if (action.type === 'close-terminal' && st.focusedId) void closeSession(st.focusedId);
      if (action.type === 'toggle-master') setView(viewRef.current === 'master' ? 'canvas' : 'master');
      if (action.type === 'toggle-timeline')
        setView(viewRef.current === 'timeline' ? 'canvas' : 'timeline');
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('message', onWindowMessage);
      window.removeEventListener('keydown', onKeyDown);
      if (persistTimer !== null) clearTimeout(persistTimer);
      unsubLayout();
      unsubscribe();
      unsubDaemon();
      unsubTasks();
      unsubSdc();
      unsubSdcCorrection();
      unsubTerminalLinkRouted();
      unsubTerminalLinks();
      unsubBrowserTiles();
      unsubLearnings();
    };
  }, []);

  /**
   * Seed (sessões restauradas/adotadas + layout salvo — Story 1.4) + primeiro
   * terminal se vazio. Guardado por bootRef (uma vez, mesmo sob StrictMode);
   * chamado no mount SE não há crash pendente, ou após resolver a Recovery
   * Screen (4.3) — mesmo caminho nos dois casos, sem duplicar lógica.
   */
  const seedFromMain = (): void => {
    if (bootRef.current) return;
    bootRef.current = true;
    void Promise.all([window.cockpit.session.list(), window.cockpit.layout.get(), window.cockpit.browser.list()])
      .then(([list, savedTiles, browserList]) => {
        useCockpitStore.getState().seedSessions(list, savedTiles);
        useCockpitStore.getState().seedBrowserTiles(browserList, savedTiles);
        if (list.length === 0) return newTerminal();
        return undefined;
      })
      .catch((e: unknown) => setError(String(e instanceof Error ? e.message : e)));
  };

  /** Resolve a Recovery Screen (Story 4.3) e então semeia normalmente. */
  const resolveRecovery = (choice: 'all' | 'selective' | 'clean', keepIds?: string[]): void => {
    void window.cockpit.recovery
      .resolve({ choice, ...(keepIds ? { keepIds } : {}) })
      .then(() => {
        setCrashSummary(null);
        setView('master');
        seedFromMain();
      })
      .catch((e: unknown) => setError(String(e instanceof Error ? e.message : e)));
  };

  const newTerminal = async (adapterId?: string, opts?: { projectId?: string }): Promise<void> => {
    const effectiveAdapter = adapterId ?? selectedAdapter;
    try {
      await window.cockpit.session.create({
        cols: 80,
        rows: 24,
        adapterId: effectiveAdapter,
        // Novo terminal nasce no workspace ativo (3.6); ref evita stale closure
        // no atalho Ctrl+N registrado no mount.
        workspace: workspacesRef.current.active,
        // Projeto de destino (Story 8.3, AC3) — omitido = projeto ativo (Main decide).
        ...(opts?.projectId !== undefined ? { projectId: opts.projectId } : {}),
        // Ollama exige o modelo por sessão, não fixo por adapter (Story 12.6).
        ...(effectiveAdapter === 'ollama' ? { args: ['run', ollamaModel.trim() || 'llama3'] } : {})
      });
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    }
  };

  /** Atalho da barra lateral (Story 8.3, AC3): cria SEM trocar o projeto ativo. */
  const newTerminalInProject = (projectId: string): void => {
    void newTerminal(undefined, { projectId });
  };

  /**
   * `window.prompt` NÃO é implementado pelo Electron no renderer (retorna
   * `null` sempre, sem mostrar nada — limitação documentada do Chromium
   * fora de um browser completo). `promptText` substitui as 3 chamadas que
   * dependiam disso por um modal React controlado (`PromptModal`).
   */
  const [promptState, setPromptState] = useState<{
    message: string;
    defaultValue: string;
    resolve: (value: string | null) => void;
  } | null>(null);
  const promptText = (message: string, defaultValue = ''): Promise<string | null> =>
    new Promise((resolve) => setPromptState({ message, defaultValue, resolve }));

  /** Workspaces (3.6): operações sempre re-sincronizam a lista do Main. */
  const switchWorkspace = (name: string): void => {
    void window.cockpit.workspace.setActive({ name }).then(setWorkspaces).catch(() => void 0);
  };

  const createWorkspace = (): void => {
    void promptText('Nome do novo workspace:').then((raw) => {
      const name = raw?.trim();
      if (!name) return;
      void window.cockpit.workspace
        .create({ name })
        .then((list) => window.cockpit.workspace.setActive({ name }).catch(() => list))
        .then(setWorkspaces)
        .catch((e: unknown) => setError(String(e instanceof Error ? e.message : e)));
    });
  };

  const renameWorkspace = (): void => {
    const from = workspacesRef.current.active;
    void promptText(`Renomear workspace "${from}" para:`, from).then((raw) => {
      const to = raw?.trim();
      if (!to || to === from) return;
      void window.cockpit.workspace
        .rename({ from, to })
        .then(setWorkspaces)
        .catch((e: unknown) => setError(String(e instanceof Error ? e.message : e)));
    });
  };

  /** Projetos (Story 8.2): operações sempre re-sincronizam a lista do Main. */
  const switchProject = (id: string): void => {
    void window.cockpit.project
      .setActive({ id })
      .then((list) => {
        setProjects(list.projects);
        setActiveProjectId(list.activeId);
      })
      .catch(() => void 0);
  };

  /**
   * Abre o seletor de pasta direto — o nome do projeto vem do nome da pasta
   * (sem pedir texto antes, fluxo de 1 passo pedido pelo fundador na
   * validação visual do Épico 12).
   */
  const createProject = (): void => {
    void window.cockpit.project
      .pickFolder()
      .then((rootPath) => {
        if (!rootPath) return null;
        const name = rootPath.split(/[\\/]/).filter(Boolean).pop() ?? 'Projeto';
        const color = PROJECT_COLORS[projects.length % PROJECT_COLORS.length]!;
        return window.cockpit.project.create({ name, color, rootPath });
      })
      .then((list) => {
        if (!list) return null;
        const created = list.projects[list.projects.length - 1]!;
        return window.cockpit.project.setActive({ id: created.id }).catch(() => list);
      })
      .then((list) => {
        if (!list) return;
        setProjects(list.projects);
        setActiveProjectId(list.activeId);
      })
      .catch((e: unknown) => setError(String(e instanceof Error ? e.message : e)));
  };

  /** Tarefas (Story 5.1) — o push (task.onEvent) já atualiza a lista. */
  const createTask = (title: string): void => {
    void window.cockpit.task.create({ title }).catch((e: unknown) => setError(String(e instanceof Error ? e.message : e)));
  };

  const transitionTask = (id: string, to: TaskState): void => {
    void window.cockpit.task
      .updateState({ id, state: to })
      .catch((e: unknown) => setError(String(e instanceof Error ? e.message : e)));
  };

  const goToTerminal = (id: string): void => {
    useCockpitStore.getState().focus(id);
    setView('canvas');
  };

  /** Story 3.2: instrução via master — mesma porta binária do tile (FR7). */
  const instructAgent = (id: string, text: string): boolean => {
    const st = useCockpitStore.getState();
    const session = st.sessions.find((s) => s.id === id);
    const port = st.ports.get(id);
    if (!session || !port) return false;
    if (
      (session.agentStatus === 'error' || session.agentStatus === 'done') &&
      !window.confirm(`"${session.name}" está em estado ${session.agentStatus}. Enviar mesmo assim?`)
    ) {
      return false;
    }
    port.postMessage(new TextEncoder().encode(`${text}\r`));
    void window.cockpit.session.instructed({ id, text }); // trilha (AC3)
    return true;
  };

  /**
   * Vincula/desvincula tarefa a um terminal (Story 5.2, AC1) — o push
   * (session.onEvent) atualiza a UI. Papel opcional (Story 7.1, FR16).
   */
  const linkTask = (terminalId: string, taskId: string | null, role?: TaskRole | null): void => {
    void window.cockpit.session
      .linkTask({ terminalId, taskId, ...(role !== undefined && role !== null ? { role } : {}) })
      .catch((e: unknown) => setError(String(e instanceof Error ? e.message : e)));
  };

  /** Instrui TODOS os terminais vinculados à tarefa (Story 5.2, AC3) — reusa instructAgent. */
  const instructTaskAgents = (taskId: string, text: string): void => {
    for (const s of useCockpitStore.getState().sessions) {
      if (s.taskId === taskId) instructAgent(s.id, text);
    }
  };

  /** Vínculo terminal-a-terminal (Épico 9, Story 9.3) — o push (onEvent) já atualiza a lista. */
  const createTerminalLink = (sourceId: string, targetId: string, mode: TerminalLinkMode): void => {
    void window.cockpit.terminalLink
      .create({ sourceId, targetId, mode })
      .catch((e: unknown) => setError(String(e instanceof Error ? e.message : e)));
  };

  const removeTerminalLink = (id: string): void => {
    void window.cockpit.terminalLink.remove({ id }).catch(() => void 0);
  };

  /** Cor do projeto dono de um tile (Story 12.3, AC1/AC2) — null = sem projeto, visual neutro. */
  const projectColorOf = (projectId: string | null): string | null =>
    projects.find((p) => p.id === projectId)?.color ?? null;

  // Zoom do canvas (pedido do fundador na validação visual) — escala visual
  // via CSS transform num wrapper interno; deltas de arraste (mover/
  // redimensionar tile, arraste de vínculo) são divididos por `canvasZoom`
  // pros gestos continuarem 1:1 com o cursor em qualquer nível de zoom.
  const [canvasZoom, setCanvasZoom] = useState(1);
  const canvasZoomRef = useRef(canvasZoom);
  canvasZoomRef.current = canvasZoom;
  // Faixa do mock Multerminal (14.3): 35%–160%.
  const clampZoom = (z: number): number => Math.min(1.6, Math.max(0.35, z));

  // Painel de preview de arquivo (Story 14.5, FR51) — efêmero por design.
  const [previewFile, setPreviewFile] = useState<PreviewFile | null>(null);

  // Árvore de arquivos da sidebar (Story 14.2) — raiz recarrega na troca de
  // projeto (mesmo comportamento do ProjectFilesSidebar da 12.1, agora no App).
  const [rootEntries, setRootEntries] = useState<ProjectDirEntry[] | null>(null);
  useEffect(() => {
    setRootEntries(null);
    setPreviewFile(null);
    void window.cockpit.project
      .readDir(activeProjectId ? { projectId: activeProjectId } : {})
      .then(setRootEntries)
      .catch(() => setRootEntries([]));
  }, [activeProjectId]);

  /** Abre um arquivo da árvore no painel de preview (Story 14.5, FR51). */
  const openFilePreview = (entry: ProjectDirEntry): void => {
    void window.cockpit.project
      .readFile({ path: entry.path, maxBytes: 262144 })
      .then((res) =>
        setPreviewFile(
          res
            ? { name: entry.name, path: entry.path, content: res.content, truncated: res.truncated }
            : { name: entry.name, path: entry.path, content: '(arquivo binário ou ilegível)', truncated: false }
        )
      )
      .catch(() => void 0);
  };

  // Eventos pro painel de telemetria (Story 14.2, FR48) — poll leve SEMPRE
  // ativo (independente da view timeline, que mantém o poll próprio de 5s).
  const [telemetryEvents, setTelemetryEvents] = useState<TimelineEvent[]>([]);
  useEffect(() => {
    const refresh = (): void => {
      void window.cockpit.timeline
        .get({ limit: 30 })
        .then(setTelemetryEvents)
        .catch(() => void 0);
    };
    refresh();
    const timer = setInterval(refresh, 10000);
    return () => clearInterval(timer);
  }, []);

  // Catálogo de agentes (Story 13.4, FR45) — disponibilidade no PATH checada
  // no Main ao ENTRAR na view (não no boot: 8 stats de fs sem ninguém olhando).
  const [adapterAvailability, setAdapterAvailability] = useState<Record<string, string | null | undefined>>({});
  useEffect(() => {
    if (view !== 'agents') return;
    for (const a of adapters) {
      const command = ADAPTER_CATALOG[a.id]?.command;
      if (!command) {
        setAdapterAvailability((prev) => ({ ...prev, [a.id]: null }));
        continue;
      }
      void window.cockpit.adapter
        .checkCommand({ command })
        .then((path) => setAdapterAvailability((prev) => ({ ...prev, [a.id]: path })))
        .catch(() => setAdapterAvailability((prev) => ({ ...prev, [a.id]: null })));
    }
  }, [view, adapters]);

  // Branch git do projeto ativo (Story 13.3, FR44) — lida no Main; refresh
  // na troca de projeto + poll de 5s (mesmo padrão de timeline/relatório).
  const [gitBranch, setGitBranch] = useState<string | null>(null);
  useEffect(() => {
    const refresh = (): void => {
      void window.cockpit.project
        .gitBranch(activeProjectId ? { projectId: activeProjectId } : {})
        .then(setGitBranch)
        .catch(() => setGitBranch(null));
    };
    refresh();
    const timer = setInterval(refresh, 5000);
    return () => clearInterval(timer);
  }, [activeProjectId]);

  // Canvas INFINITO (Story 14.3, FR49) — navegação por PAN (arrastar o
  // fundo) + zoom, mundo transformado por translate+scale; substitui o
  // scroll da 12.6. Pan vive em ref durante o gesto (sem re-render por
  // pixel) e em estado pro render.
  const [canvasPan, setCanvasPan] = useState({ x: 60, y: 40 });
  const canvasPanRef = useRef(canvasPan);
  canvasPanRef.current = canvasPan;
  const panGestureRef = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);

  const startCanvasPan = (e: React.PointerEvent): void => {
    // Só o FUNDO faz pan — tiles/minimapa têm gestos próprios.
    if ((e.target as Element).closest('[data-tile-id], [data-no-pan]')) return;
    panGestureRef.current = { sx: e.clientX, sy: e.clientY, ox: canvasPanRef.current.x, oy: canvasPanRef.current.y };
  };
  useEffect(() => {
    const onMove = (e: PointerEvent): void => {
      const g = panGestureRef.current;
      if (!g) return;
      setCanvasPan({ x: g.ox + (e.clientX - g.sx), y: g.oy + (e.clientY - g.sy) });
    };
    const onUp = (): void => {
      panGestureRef.current = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, []);

  // Viewport do minimapa (12.5, adaptado ao pan da 14.3): deriva de pan/zoom
  // + tamanho do section (ResizeObserver).
  const [canvasViewport, setCanvasViewport] = useState({ x: 0, y: 0, width: 0, height: 0 });
  useEffect(() => {
    const el = canvasSectionRef.current;
    if (!el) return;
    const update = (): void =>
      setCanvasViewport({
        x: -canvasPan.x / canvasZoom,
        y: -canvasPan.y / canvasZoom,
        width: el.clientWidth / canvasZoom,
        height: el.clientHeight / canvasZoom
      });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [canvasZoom, canvasPan]);

  /** Foca o tile e CENTRALIZA o pan nele (Story 12.5 AC2, adaptado à 14.3). */
  const focusAndScrollTo = (id: string): void => {
    useCockpitStore.getState().focus(id);
    const tile = layout.tiles.find((t) => t.id === id);
    const el = canvasSectionRef.current;
    if (tile && el) {
      setCanvasPan({
        x: el.clientWidth / 2 - (tile.x + tile.width / 2) * canvasZoom,
        y: el.clientHeight / 2 - (tile.y + tile.height / 2) * canvasZoom
      });
    }
  };

  /** Converte coordenadas de ponteiro (viewport) pro espaço LÓGICO do mundo (pan+zoom-aware, 14.3). */
  const pointerToCanvasCoords = (e: PointerEvent): { x: number; y: number } | null => {
    const el = canvasSectionRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const zoom = canvasZoomRef.current;
    const pan = canvasPanRef.current;
    return { x: (e.clientX - rect.left - pan.x) / zoom, y: (e.clientY - rect.top - pan.y) / zoom };
  };

  const startTerminalLinkDrag = (sourceId: string, originX: number, originY: number): void => {
    setLinkDrag({ sourceId, x: originX, y: originY });
  };

  /**
   * Maximizar/restaurar tile (Story 14.4) — guarda o retângulo anterior num
   * ref (não persiste: restaurar após relaunch volta ao layout salvo normal)
   * e ocupa o viewport ATUAL do canvas (pan+zoom-aware).
   */
  const maximizedPrevRef = useRef(new Map<string, { x: number; y: number; width: number; height: number }>());
  const toggleMaximizeTile = (id: string): void => {
    const st = useCockpitStore.getState();
    const tile = st.layout.tiles.find((t) => t.id === id);
    const el = canvasSectionRef.current;
    if (!tile || !el) return;
    const prev = maximizedPrevRef.current.get(id);
    if (prev) {
      maximizedPrevRef.current.delete(id);
      st.moveTileTo(id, prev.x, prev.y);
      st.resizeTileTo(id, prev.width, prev.height);
    } else {
      maximizedPrevRef.current.set(id, { x: tile.x, y: tile.y, width: tile.width, height: tile.height });
      const zoom = canvasZoomRef.current;
      const pan = canvasPanRef.current;
      st.moveTileTo(id, -pan.x / zoom + 40, -pan.y / zoom + 20);
      st.resizeTileTo(id, el.clientWidth / zoom - 80, el.clientHeight / zoom - 60);
    }
    st.snapTile(id);
    st.focus(id);
  };

  // Listeners globais do arraste de vínculo (Story 12.2) — registrados uma
  // vez só, lêem o estado mais recente via ref (mesmo gotcha de closure
  // obsoleta já resolvido no TerminalTile pra move/resize).
  useEffect(() => {
    const onPointerMove = (e: PointerEvent): void => {
      if (!linkDragRef.current) return;
      const coords = pointerToCanvasCoords(e);
      if (!coords) return;
      setLinkDrag((prev) => (prev ? { ...prev, ...coords } : prev));
    };
    const onPointerUp = (e: PointerEvent): void => {
      const drag = linkDragRef.current;
      if (!drag) return;
      setLinkDrag(null);
      const targetEl = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-tile-id]');
      const targetId = targetEl?.getAttribute('data-tile-id');
      if (targetId && targetId !== drag.sourceId) {
        createTerminalLink(drag.sourceId, targetId, 'manual');
      }
    };
    // Esc cancela o arraste de vínculo (mock, linha 349).
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && linkDragRef.current) setLinkDrag(null);
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  /** Envio manual (AC2 da 9.3) — mesma redação-base do roteamento automático (9.2), disparada sob demanda. */
  const sendTerminalLink = (link: TerminalLink): void => {
    const source = useCockpitStore.getState().sessions.find((s) => s.id === link.sourceId);
    const message =
      `Instrução manual (vínculo terminal-a-terminal): avalie o trabalho mais recente do ` +
      `terminal "${source?.name ?? link.sourceId}" (${source?.adapterId ?? '—'}) e aja sobre o resultado.`;
    instructAgent(link.targetId, message);
  };

  /** Captura rápida de learning (Épico 11, Story 11.1, AC2) — o push (onEvent) já atualiza a lista. */
  const createLearning = (text: string, category: string): void => {
    void window.cockpit.learning.create({ text, category }).catch((e: unknown) => setError(String(e instanceof Error ? e.message : e)));
  };

  /** Qualificação (Story 11.2, FR32) — decisão humana explícita. */
  const updateLearningStatus = (id: string, status: Learning['status']): void => {
    void window.cockpit.learning
      .updateStatus({ id, status })
      .catch((e: unknown) => setError(String(e instanceof Error ? e.message : e)));
  };

  /**
   * Decisão humana (Story 5.3, FR15) — aprovar/rejeitar/redirecionar. O
   * redirect bem-sucedido dispara a instrução inicial no NOVO agente (AC4);
   * o Main nunca escreve PTY diretamente (decisão crítica 4), por isso o
   * envio acontece aqui via instructAgent, já existente da 3.2.
   */
  const decideTask = (
    taskId: string,
    action: 'approve' | 'reject' | 'redirect',
    opts?: { justification?: string; redirectTo?: string }
  ): void => {
    const task = tasks.find((t) => t.id === taskId);
    void window.cockpit.task
      .decide({
        taskId,
        action,
        ...(opts?.justification !== undefined ? { justification: opts.justification } : {}),
        ...(opts?.redirectTo !== undefined ? { redirectTo: opts.redirectTo } : {})
      })
      .then(() => {
        if (action === 'redirect' && opts?.redirectTo) {
          const intro = `Você foi designado para a tarefa: "${task?.title ?? taskId}".`;
          instructAgent(opts.redirectTo, opts.justification ? `${intro} ${opts.justification}` : intro);
        }
      })
      .catch((e: unknown) => setError(String(e instanceof Error ? e.message : e)));
  };

  const closeSession = async (id: string): Promise<void> => {
    const session = useCockpitStore.getState().sessions.find((s) => s.id === id);
    if (!session) return;
    if (
      session.status === 'running' &&
      !window.confirm(`Encerrar "${session.name}"? O processo ativo será finalizado.`)
    ) {
      return;
    }
    try {
      await window.cockpit.session.close({ id });
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    }
  };

  /** Preview de browser (Story 10.1) — o push (browser.onEvent) já atualiza o store. */
  const createBrowserTile = (): void => {
    void window.cockpit.browser.create({ url: 'about:blank' }).catch((e: unknown) => setError(String(e instanceof Error ? e.message : e)));
  };

  const closeBrowserTile = (id: string): void => {
    void window.cockpit.browser.remove({ id }).catch(() => void 0);
  };

  const navigateBrowserTile = (id: string, url: string): void => {
    void window.cockpit.browser.navigate({ id, url }).catch((e: unknown) => setError(String(e instanceof Error ? e.message : e)));
  };

  const browserTileAction = (action: 'back' | 'forward' | 'reload') => (id: string): void => {
    void window.cockpit.browser[action]({ id }).catch(() => void 0);
  };

  /** Automação manual (Story 10.2, AC1/AC2) — mesma página do tile visível. */
  const clickBrowserTile = (id: string, selector: string): Promise<void> =>
    window.cockpit.browser.click({ id, selector });

  const readTextBrowserTile = (id: string, selector: string): Promise<string | null> =>
    window.cockpit.browser.readText(selector ? { id, selector } : { id });

  // Fila unificada (Story 5.3, AC3): agentes waiting-input + tarefas em
  // awaiting_decision — badge do header + card da telemetria (14.2).
  const pendingDecisionCount =
    projectSessions.filter((s) => s.agentStatus === 'waiting-input' && s.status === 'running').length +
    projectTasks.filter((t) => t.state === 'awaiting_decision').length;

  // Mundo do canvas infinito (14.3) — tamanho explícito cobre o extent real
  // dos tiles (mínimo 2600×1800 como o mock); a navegação é por pan, o
  // tamanho só garante que zonas/SVG cubram tudo.
  const canvasContentWidth = Math.max(2600, ...layout.tiles.map((t) => t.x + t.width + 200));
  const canvasContentHeight = Math.max(1800, ...layout.tiles.map((t) => t.y + t.height + 200));

  // Visibilidade no canvas (14.3, FR49): TODOS os projetos aparecem (zonas
  // dão o agrupamento); workspace (3.6) continua filtrando. O projeto ativo
  // é destaque/escopo de criação, não filtro.
  const canvasVisibleSessions = sessions.filter((s) => s.workspace === workspaces.active);

  const minimapTiles: MinimapTile[] = [
    ...canvasVisibleSessions
      .map((s): MinimapTile | null => {
        const t = layout.tiles.find((lt) => lt.id === s.id);
        if (!t) return null;
        return { id: s.id, x: t.x, y: t.y, width: t.width, height: t.height, color: projectColorOf(s.projectId), focused: focusedId === s.id };
      })
      .filter((t): t is MinimapTile => t !== null),
    ...browserTiles
      .map((b): MinimapTile | null => {
        const t = layout.tiles.find((lt) => lt.id === b.id);
        if (!t) return null;
        return { id: b.id, x: t.x, y: t.y, width: t.width, height: t.height, color: projectColorOf(b.projectId), focused: focusedId === b.id };
      })
      .filter((t): t is MinimapTile => t !== null)
  ];

  // Zonas de projeto (14.3, FR49) — bounding box dos tiles de cada projeto
  // + padding, com etiqueta pill (mock linhas 631-645). Projeto ativo =
  // zona/etiqueta mais fortes.
  const ZONE_PAD = 24;
  const ZONE_TOP = 30;
  const zoneViews = projects
    .map((p) => {
      const own = [
        ...canvasVisibleSessions.filter((s) => s.projectId === p.id).map((s) => layout.tiles.find((t) => t.id === s.id)),
        ...browserTiles.filter((b) => b.projectId === p.id).map((b) => layout.tiles.find((t) => t.id === b.id))
      ].filter((t): t is NonNullable<typeof t> => !!t);
      if (own.length === 0) return null;
      const minX = Math.min(...own.map((t) => t.x)) - ZONE_PAD;
      const minY = Math.min(...own.map((t) => t.y)) - ZONE_PAD - ZONE_TOP;
      const maxX = Math.max(...own.map((t) => t.x + t.width)) + ZONE_PAD;
      const maxY = Math.max(...own.map((t) => t.y + t.height)) + ZONE_PAD;
      const isActive = p.id === activeProjectId;
      return { id: p.id, name: p.name, color: p.color, count: own.length, minX, minY, maxX, maxY, isActive };
    })
    .filter((z): z is NonNullable<typeof z> => z !== null);

  return (
    <main
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: theme.surface.app,
        color: theme.text.primary,
        fontFamily: theme.font.ui,
        overflow: 'hidden'
      }}
    >
      <StatusPulseStyles />
      <header
        style={{
          height: 42,
          minHeight: 42,
          display: 'flex',
          alignItems: 'center',
          gap: theme.space.md,
          padding: `0 ${theme.space.lg}px`,
          background: theme.surface.app,
          borderBottom: `1px solid ${theme.border.default}`,
          flexShrink: 0
        }}
      >
        <h1 style={{ fontSize: theme.font.size.lg, fontWeight: 700, letterSpacing: 0.3, margin: 0, color: theme.text.bright, whiteSpace: 'nowrap' }}>
          MEU <span style={{ color: theme.accent.primary }}>COCKPIT</span>
        </h1>
        {/* Workspaces (Story 3.6): troca rápida + criar/renomear */}
        <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <select
            value={workspaces.active}
            onChange={(e) => switchWorkspace(e.target.value)}
            title="Workspace ativo (filtra o canvas)"
            style={{
              background: theme.surface.raised,
              color: theme.text.primary,
              border: `1px solid ${theme.border.default}`,
              borderRadius: 6,
              padding: '4px 8px',
              fontSize: theme.font.size.sm
            }}
          >
            {workspaces.names.map((w) => (
              <option key={w} value={w}>
                📁 {w}
              </option>
            ))}
          </select>
          <button onClick={createWorkspace} title="Novo workspace" style={wsButtonStyle}>
            +
          </button>
          <button onClick={renameWorkspace} title="Renomear workspace ativo" style={wsButtonStyle}>
            ✎
          </button>
        </span>
        {/* Abas de view principais — estilo aba do mock (linhas 28-32);
            views secundárias (Timeline/Learnings/Agentes/Configurações)
            moram na sidebar em APP & SISTEMA (Story 14.2). */}
        <nav style={{ display: 'flex', gap: 2 }}>
          {(
            [
              ['master', 'master', 'Sessão Master (Ctrl+M)'],
              ['canvas', 'canvas', 'Canvas de terminais'],
              ['tasks', 'tarefas', 'Tarefas com lifecycle (Story 5.1)'],
              ['board', 'board', 'Lifecycle Board (Story 5.4)']
            ] as const
          ).map(([v, label, title]) => (
            <button
              key={v}
              onClick={() => setView(v)}
              title={title}
              style={{
                background: view === v ? theme.surface.raised : 'transparent',
                color: view === v ? theme.text.bright : theme.text.secondary,
                border: 'none',
                borderRadius: 5,
                padding: '6px 8px',
                fontSize: theme.font.size.xs + 1,
                fontFamily: theme.font.ui,
                cursor: 'pointer'
              }}
            >
              {label}
            </button>
          ))}
        </nav>
        <span style={{ flex: 1 }} />
        {info && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: theme.font.size.xs + 1, color: theme.text.muted, whiteSpace: 'nowrap' }}>
            <span>v{info.version}</span>
            <span style={{ color: theme.border.strong }}>·</span>
            <span>
              {projectSessions.length} {projectSessions.length === 1 ? 'sessão' : 'sessões'}
            </span>
            <span style={{ color: theme.border.strong }}>·</span>
            <span
              title="Estado do daemon de terminais"
              style={{
                color:
                  daemonState === 'connected'
                    ? theme.accent.ok
                    : daemonState === 'disconnected'
                      ? theme.accent.danger
                      : theme.accent.warn
              }}
            >
              ● daemon
            </span>
          </span>
        )}
        {(() => {
          // Badge unificado (Story 5.3, AC3) — mesma contagem da status bar (13.3).
          const waiting = pendingDecisionCount;
          if (waiting === 0) return null;
          return (
            <button
              onClick={() => setView('master')}
              title="Ir à fila de decisões pendentes"
              style={{
                background: statusColor('waiting-input'),
                color: theme.text.inverse,
                fontWeight: 700,
                fontSize: theme.font.size.sm,
                border: 'none',
                borderRadius: theme.radius.pill,
                padding: '3px 10px',
                cursor: 'pointer'
              }}
            >
              {waiting} aguardando você
            </button>
          );
        })()}
        {/* Pill de zoom do mock (linhas 41-45) — só com o canvas ativo. */}
        {view === 'canvas' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: theme.surface.raised,
              border: `1px solid ${theme.border.strong}`,
              borderRadius: 6,
              padding: 2
            }}
          >
            <button onClick={() => setCanvasZoom((z) => clampZoom(z - 0.1))} title="Diminuir zoom (Ctrl+scroll)" style={zoomBtnStyle}>
              −
            </button>
            <button
              onClick={() => setCanvasZoom(1)}
              title="Redefinir zoom para 100%"
              style={{ ...zoomBtnStyle, width: 38, fontSize: theme.font.size.xs }}
            >
              {Math.round(canvasZoom * 100)}%
            </button>
            <button onClick={() => setCanvasZoom((z) => clampZoom(z + 0.1))} title="Aumentar zoom (Ctrl+scroll)" style={zoomBtnStyle}>
              +
            </button>
          </div>
        )}
        <button
          onClick={() => void newTerminal()}
          disabled={view === 'recovery'}
          title={`Novo terminal ${selectedAdapter} (Ctrl+N)`}
          style={{
            background: theme.surface.raised,
            color: view === 'recovery' ? theme.text.faint : theme.text.primary,
            border: `1px solid ${theme.border.default}`,
            borderRadius: 6,
            padding: '4px 12px',
            fontSize: theme.font.size.sm,
            cursor: view === 'recovery' ? 'not-allowed' : 'pointer'
          }}
        >
          + novo terminal
        </button>
        <button
          onClick={createBrowserTile}
          disabled={view === 'recovery'}
          title="Novo preview de browser (Playwright)"
          style={{
            background: theme.surface.raised,
            color: view === 'recovery' ? theme.text.faint : theme.text.primary,
            border: `1px solid ${theme.border.default}`,
            borderRadius: 6,
            padding: '4px 12px',
            fontSize: theme.font.size.sm,
            cursor: view === 'recovery' ? 'not-allowed' : 'pointer'
          }}
        >
          + browser
        </button>
        {error && (
          <span style={{ fontFamily: theme.font.mono, fontSize: theme.font.size.sm, color: theme.accent.danger }}>{error}</span>
        )}
      </header>

      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <AppSidebar
          projects={projects}
          activeProjectId={activeProjectId}
          gitBranch={gitBranch}
          onSelectProject={switchProject}
          onCreateProject={createProject}
          onCreateTerminalIn={newTerminalInProject}
          adapters={adapters}
          onCreateTerminal={(adapterId) => {
            if (view !== 'recovery') void newTerminal(adapterId);
          }}
          rootEntries={rootEntries}
          onReadDir={(dirPath) =>
            window.cockpit.project.readDir({
              ...(activeProjectId ? { projectId: activeProjectId } : {}),
              ...(dirPath !== undefined ? { dirPath } : {})
            })
          }
          onSelectFile={openFilePreview}
          selectedFilePath={previewFile?.path ?? null}
          systemEntries={[
            { icon: '≡', label: 'Timeline', active: view === 'timeline', onClick: () => setView('timeline') },
            { icon: '🎓', label: 'Learnings', active: view === 'learnings', onClick: () => setView('learnings') },
            { icon: '🤖', label: 'Agentes', active: view === 'agents', onClick: () => setView('agents') },
            { icon: '⚙', label: 'Configurações', active: view === 'settings', onClick: () => setView('settings') }
          ]}
          appVersion={info?.version ?? '—'}
        />

        {view === 'recovery' && crashSummary && (
          <RecoveryScreen summary={crashSummary} onResolve={resolveRecovery} />
        )}

        {view === 'master' && (
          <MasterDashboard
            sessions={projectSessions}
            tasks={projectTasks}
            onGoToTerminal={goToTerminal}
            onInstruct={instructAgent}
            onOpenReport={(id) => {
              setReportId(id);
              setView('report');
            }}
            onLinkTask={linkTask}
            onDecide={decideTask}
            onOpenReview={goToReview}
            terminalLinks={projectTerminalLinks}
            onCreateLink={createTerminalLink}
            onRemoveLink={removeTerminalLink}
            onSendLink={sendTerminalLink}
            onCreateLearning={createLearning}
            learnings={learnings}
            onUpdateLearningStatus={updateLearningStatus}
            onPromptText={promptText}
          />
        )}

        {view === 'review' && (
          <ReviewPanel
            task={tasks.find((t) => t.id === reviewTaskId) ?? null}
            sessions={sessions}
            transcripts={transcripts}
            onBack={() => setView('master')}
            onRefresh={() => reviewTaskId && refreshTranscripts(reviewTaskId)}
          />
        )}

        {view === 'report' && (
          <SessionReportView
            report={report}
            events={reportEvents}
            onBack={() => setView('master')}
            onRefresh={() => reportId && refreshReport(reportId)}
          />
        )}

        {view === 'timeline' && (
          <TimelineView events={timelineEvents} sessions={sessions} onRefresh={refreshTimeline} />
        )}

        {view === 'tasks' && (
          <TasksPanel
            tasks={projectTasks}
            sessions={projectSessions}
            onCreate={createTask}
            onTransition={transitionTask}
            onUnlink={(terminalId) => linkTask(terminalId, null)}
            onInstruct={instructTaskAgents}
            onOpenReview={goToReview}
          />
        )}

        {view === 'board' && (
          <LifecycleBoard
            tasks={projectTasks}
            sessions={projectSessions}
            onCreate={createTask}
            onMove={transitionTask}
            onOpenReview={goToReview}
          />
        )}

        {view === 'learnings' && <LearningsView learnings={learnings} projects={projects} />}

        {view === 'agents' && (
          <AgentCatalog
            adapters={adapters}
            availability={adapterAvailability}
            onCreateTerminal={(adapterId) => void newTerminal(adapterId)}
            ollamaModel={ollamaModel}
            onOllamaModelChange={setOllamaModel}
          />
        )}

        {view === 'settings' && settings && <SettingsView settings={settings} onSave={saveSettings} />}

        <section
          ref={canvasSectionRef}
          onPointerDown={startCanvasPan}
          onWheel={(e) => {
            // Zoom no scroll (mock) — sobre um TILE, só com Ctrl (wheel puro
            // ali pertence ao scrollback do xterm); no fundo, wheel puro zooma.
            const overTile = (e.target as Element).closest('[data-tile-id]');
            if (overTile && !e.ctrlKey) return;
            e.preventDefault();
            setCanvasZoom((z) => clampZoom(z - e.deltaY * 0.001));
          }}
          style={{
            flex: 1,
            position: 'relative',
            overflow: 'hidden',
            minWidth: 0,
            // Canvas fica MONTADO quando o master está ativo (desmontar
            // mataria xterm/portas) — apenas escondido.
            display: view === 'canvas' ? 'block' : 'none',
            cursor: panGestureRef.current ? 'grabbing' : 'default',
            // Chão neutro do mock (zonas dão a cor por projeto — 14.3
            // substitui a lavagem por-projeto-ativo da 12.6).
            ...canvasBackground(null)
          }}
        >
          {/* Mundo do canvas infinito (14.3): translate(pan) + scale(zoom),
              origin 0 0 — coordenadas de layout.x/y continuam batendo. */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: canvasContentWidth,
              height: canvasContentHeight,
              transform: `translate(${canvasPan.x}px, ${canvasPan.y}px) scale(${canvasZoom})`,
              transformOrigin: '0 0'
            }}
          >
          {/* Zonas de projeto (14.3, FR49) — atrás de tudo, pointer-events
              none; etiqueta pill com dot+nome+contagem (mock 631-645). */}
          {zoneViews.map((z) => (
            <div key={z.id}>
              <div
                style={{
                  position: 'absolute',
                  left: z.minX,
                  top: z.minY,
                  width: z.maxX - z.minX,
                  height: z.maxY - z.minY,
                  border: `1.5px solid ${z.color}${z.isActive ? '66' : '44'}`,
                  borderRadius: theme.radius.xl,
                  background: `${z.color}${z.isActive ? '1A' : '12'}`,
                  zIndex: 0,
                  pointerEvents: 'none'
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: z.minX + 14,
                  top: z.minY + 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  fontSize: theme.font.size.sm + 1,
                  fontWeight: 600,
                  color: z.color,
                  background: `${z.color}22`,
                  border: `1px solid ${z.color}66`,
                  padding: '3px 10px',
                  borderRadius: 7,
                  zIndex: 1,
                  pointerEvents: 'none'
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: 2, background: z.color }} />
                {z.name} <span style={{ opacity: 0.65 }}>· {z.count}</span>
              </div>
            </div>
          ))}
          {/* Indicação visual de vínculos (Épico 9, Story 9.3, AC1) — SVG
              atrás dos tiles (ordem no DOM), pointer-events:none pra não
              atrapalhar arrastar/redimensionar. */}
          {/* Vínculos como bezier tracejado ANIMADO com etiqueta e remoção
              (Story 14.4, FR50; mock linhas 132-147 e 647-669). Com as
              zonas da 14.3, TODOS os vínculos aparecem (não só do projeto
              ativo). Âncoras nas laterais a y+15 (altura da barra). */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }}>
            {terminalLinks.map((l, i) => {
              const source = layout.tiles.find((t) => t.id === l.sourceId);
              const target = layout.tiles.find((t) => t.id === l.targetId);
              if (!source || !target) return null;
              const goRight = source.x < target.x;
              const p1 = goRight
                ? { x: source.x + source.width, y: source.y + 15 }
                : { x: source.x, y: source.y + 15 };
              const p2 = goRight ? { x: target.x, y: target.y + 15 } : { x: target.x + target.width, y: target.y + 15 };
              const midx = (p1.x + p2.x) / 2;
              const midy = (p1.y + p2.y) / 2;
              const d = `M ${p1.x} ${p1.y} C ${midx} ${p1.y}, ${midx} ${p2.y}, ${p2.x} ${p2.y}`;
              const color = LINK_PALETTE[i % LINK_PALETTE.length]!;
              const label = l.mode;
              const labelW = label.length * 5.5 + 12;
              const labelX = midx - labelW / 2 - 14;
              const labelY = midy - 8;
              return (
                <g key={l.id}>
                  <path
                    d={d}
                    fill="none"
                    stroke={color}
                    strokeWidth={1.5}
                    strokeDasharray="5 5"
                    style={{ animation: 'cockpit-dashflow 0.8s linear infinite' }}
                  />
                  <circle
                    r={3.5}
                    fill={color}
                    style={{ offsetPath: `path('${d}')`, animation: 'cockpit-flowmove 2.4s linear infinite' }}
                  />
                  <rect x={labelX} y={labelY} width={labelW} height={16} rx={3} fill={theme.surface.header} stroke={color} strokeWidth={1} />
                  <text x={labelX + 6} y={labelY + 11.5} fill={color} fontSize={9.5} fontFamily={theme.font.mono}>
                    {label}
                  </text>
                  <circle
                    data-no-pan
                    cx={midx}
                    cy={midy}
                    r={8}
                    fill="#1A1010"
                    stroke={theme.accent.danger}
                    strokeWidth={1}
                    style={{ pointerEvents: 'all', cursor: 'pointer' }}
                    onClick={() => removeTerminalLink(l.id)}
                  >
                    <title>remover vínculo</title>
                  </circle>
                  <text
                    x={midx}
                    y={midy + 4}
                    fill={theme.accent.danger}
                    fontSize={11}
                    fontWeight={700}
                    textAnchor="middle"
                    fontFamily={theme.font.mono}
                    style={{ pointerEvents: 'none' }}
                  >
                    ×
                  </text>
                </g>
              );
            })}
            {/* Linha de preview do arraste de vínculo em curso (12.2/14.4). */}
            {linkDrag &&
              (() => {
                const source = layout.tiles.find((t) => t.id === linkDrag.sourceId);
                if (!source) return null;
                return (
                  <line
                    x1={source.x + source.width / 2}
                    y1={source.y + source.height / 2}
                    x2={linkDrag.x}
                    y2={linkDrag.y}
                    stroke={theme.accent.bright}
                    strokeWidth={1.5}
                    strokeDasharray="5 5"
                  />
                );
              })()}
          </svg>
          {sessions.map((session) => {
            const tile = layout.tiles.find((t) => t.id === session.id);
            if (!tile) return null;
            // Canvas filtra só por workspace (3.6) — projetos aparecem TODOS
            // com zonas (14.3, FR49); tiles fora do escopo ficam MONTADOS
            // (desmontar mataria xterm/portas, gotcha da 1.3), só escondidos.
            const inActive = session.workspace === workspaces.active;
            return (
              <div key={session.id} style={{ display: inActive ? 'contents' : 'none' }}>
                <TerminalTile
                session={session}
                layout={tile}
                focused={focusedId === session.id}
                port={ports.get(session.id) ?? null}
                onFocus={() => useCockpitStore.getState().focus(session.id)}
                onClose={() => void closeSession(session.id)}
                onRename={(name) => void window.cockpit.session.rename({ id: session.id, name })}
                onMove={(x, y) => useCockpitStore.getState().moveTileTo(session.id, x, y)}
                onMoveEnd={() => useCockpitStore.getState().snapTile(session.id)}
                onResizeTile={(w, h) => useCockpitStore.getState().resizeTileTo(session.id, w, h)}
                onResizePty={({ cols, rows }) =>
                  void window.cockpit.session.resize({ id: session.id, cols, rows })
                }
                onStartLink={() => startTerminalLinkDrag(session.id, tile.x + tile.width / 2, tile.y + tile.height / 2)}
                onMaximize={() => toggleMaximizeTile(session.id)}
                linking={linkDrag?.sourceId === session.id}
                projectColor={projectColorOf(session.projectId)}
                zoom={canvasZoom}
              />
              </div>
            );
          })}
          {browserTiles.map((bTile) => {
            const tile = layout.tiles.find((t) => t.id === bTile.id);
            if (!tile) return null;
            // Preview de browser não tem workspace (10.1, AC4) — com as
            // zonas da 14.3, todos os projetos são visíveis: sempre ativo.
            const inActive = true;
            return (
              <div key={bTile.id} style={{ display: inActive ? 'contents' : 'none' }}>
                <BrowserPreviewTile
                  tile={bTile}
                  layout={tile}
                  focused={focusedId === bTile.id}
                  screenshot={browserScreenshots[bTile.id] ?? null}
                  onFocus={() => useCockpitStore.getState().focus(bTile.id)}
                  onClose={() => closeBrowserTile(bTile.id)}
                  onNavigate={(url) => navigateBrowserTile(bTile.id, url)}
                  onBack={() => browserTileAction('back')(bTile.id)}
                  onForward={() => browserTileAction('forward')(bTile.id)}
                  onReload={() => browserTileAction('reload')(bTile.id)}
                  onClick={(selector) => clickBrowserTile(bTile.id, selector)}
                  onReadText={(selector) => readTextBrowserTile(bTile.id, selector)}
                  onMove={(x, y) => useCockpitStore.getState().moveTileTo(bTile.id, x, y)}
                  onMoveEnd={() => useCockpitStore.getState().snapTile(bTile.id)}
                  onResizeTile={(w, h) => useCockpitStore.getState().resizeTileTo(bTile.id, w, h)}
                  projectColor={projectColorOf(bTile.projectId)}
                  zoom={canvasZoom}
                />
              </div>
            );
          })}
          {canvasVisibleSessions.length === 0 && (
            <p
              style={{
                position: 'absolute',
                inset: 0,
                display: 'grid',
                placeItems: 'center',
                color: theme.text.muted,
                fontFamily: theme.font.mono,
                fontSize: theme.font.size.md
              }}
            >
              Ctrl+N ou "+ novo terminal" para começar
            </p>
          )}
          </div>
          {/* Minimapa (Story 12.5, AC4) — FORA do wrapper escalado (posição
              fixa no canto, nunca deve encolher/crescer com o zoom); só
              MONTA quando o canvas está realmente ativo, ao contrário dos
              tiles (que ficam montados escondidos por causa do xterm/
              portas) — o minimapa não tem nenhum estado de I/O persistente,
              então desmontar é seguro. */}
          {/* Hint do arraste de vínculo (14.4; mock linhas 200-202). */}
          {linkDrag && (
            <div
              style={{
                position: 'absolute',
                top: 10,
                left: 10,
                background: '#0D1F22',
                border: '1px solid #164E52',
                color: theme.accent.bright,
                fontSize: theme.font.size.xs + 1,
                padding: '6px 10px',
                borderRadius: 6,
                pointerEvents: 'none',
                zIndex: 200
              }}
            >
              Solte sobre outro terminal para conectar · esc cancela
            </div>
          )}
          {view === 'canvas' && (
            <div data-no-pan>
              <CanvasMinimap tiles={minimapTiles} viewport={canvasViewport} onFocusTile={focusAndScrollTo} />
            </div>
          )}
        </section>

        {/* Painel de preview de arquivo (Story 14.5, FR51) — entre o canvas
            e a telemetria, como no mock (linhas 205-259). */}
        {previewFile && <FilePreviewPanel file={previewFile} onClose={() => setPreviewFile(null)} />}

        {/* Painel direito de telemetria (Story 14.2, FR48) — decisões
            pendentes reais + eventos da timeline (mock linhas 261-275). */}
        <TelemetryPanel
          pendingDecisionCount={pendingDecisionCount}
          onOpenDecisions={() => setView('master')}
          events={telemetryEvents}
          sessions={sessions}
        />
      </div>

      {/* Rodapé de cards de sessões (Story 14.2, FR48) — substitui a antiga
          sidebar de sessões E a status bar da 13.3 (informação preservada:
          daemon no header, branch/projeto na sidebar, decisões na telemetria). */}
      <SessionCardsBar sessions={sessions} focusedId={focusedId} onFocusSession={goToTerminal} />
      {promptState && (
        <PromptModal
          message={promptState.message}
          defaultValue={promptState.defaultValue}
          onConfirm={(value) => {
            promptState.resolve(value || null);
            setPromptState(null);
          }}
          onCancel={() => {
            promptState.resolve(null);
            setPromptState(null);
          }}
        />
      )}
    </main>
  );
}

const wsButtonStyle: React.CSSProperties = {
  background: 'transparent',
  color: theme.text.muted,
  border: `1px solid ${theme.border.default}`,
  borderRadius: theme.radius.sm,
  width: 24,
  height: 24,
  cursor: 'pointer',
  fontSize: theme.font.size.sm
};

/** Botões do pill de zoom do header (mock, linhas 41-45). */
const zoomBtnStyle: React.CSSProperties = {
  width: 22,
  height: 22,
  border: 'none',
  background: 'transparent',
  color: theme.text.secondary,
  cursor: 'pointer',
  fontSize: theme.font.size.lg,
  lineHeight: '20px',
  borderRadius: theme.radius.sm,
  padding: 0,
  fontFamily: theme.font.ui
};

/** Paleta cíclica p/ cor de novo projeto (Story 8.2) — promovida ao tema (13.1). */
const PROJECT_COLORS = PROJECT_PALETTE;

/** Paleta cíclica dos vínculos no canvas (Story 14.4, mock linha 399). */
const LINK_PALETTE = ['#22D3EE', '#F472B6', '#A78BFA', '#4ADE80', '#FBBF24'] as const;
