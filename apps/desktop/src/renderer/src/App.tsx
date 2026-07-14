import { useEffect, useRef, useState } from 'react';
import {
  TERMINAL_PORT_MESSAGE,
  type AdapterInfo,
  type AppInfo,
  type CockpitApi,
  type TerminalPortMessage
} from '@cockpit/shared';
import {
  MasterDashboard,
  SessionReportView,
  Sidebar,
  StatusPulseStyles,
  TerminalTile,
  TimelineView,
  matchShortcut,
  statusColor
} from '@cockpit/ui';
import type { SessionReport, TimelineEvent, WorkspaceList } from '@cockpit/shared';
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
  const [selectedAdapter, setSelectedAdapter] = useState('shell');
  // Master é a tela inicial (Story 3.1, AC4); o canvas fica montado escondido.
  const [view, setView] = useState<'master' | 'canvas' | 'timeline' | 'report'>('master');
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

  const sessions = useCockpitStore((s) => s.sessions);
  const layout = useCockpitStore((s) => s.layout);
  const focusedId = useCockpitStore((s) => s.focusedId);
  const ports = useCockpitStore((s) => s.ports);

  useEffect(() => {
    const store = useCockpitStore.getState();

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

    // Seed (sessões restauradas + layout salvo — Story 1.4) + primeiro
    // terminal se vazio (uma vez, mesmo sob StrictMode).
    if (!bootRef.current) {
      bootRef.current = true;
      void Promise.all([window.cockpit.session.list(), window.cockpit.layout.get()])
        .then(([list, savedTiles]) => {
          store.seedSessions(list, savedTiles);
          if (list.length === 0) return newTerminal();
          return undefined;
        })
        .catch((e: unknown) => setError(String(e instanceof Error ? e.message : e)));
    }

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
    };
  }, []);

  const newTerminal = async (adapterId?: string): Promise<void> => {
    try {
      await window.cockpit.session.create({
        cols: 80,
        rows: 24,
        adapterId: adapterId ?? selectedAdapter,
        // Novo terminal nasce no workspace ativo (3.6); ref evita stale closure
        // no atalho Ctrl+N registrado no mount.
        workspace: workspacesRef.current.active
      });
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    }
  };

  /** Workspaces (3.6): operações sempre re-sincronizam a lista do Main. */
  const switchWorkspace = (name: string): void => {
    void window.cockpit.workspace.setActive({ name }).then(setWorkspaces).catch(() => void 0);
  };

  const createWorkspace = (): void => {
    const name = window.prompt('Nome do novo workspace:')?.trim();
    if (!name) return;
    void window.cockpit.workspace
      .create({ name })
      .then((list) => window.cockpit.workspace.setActive({ name }).catch(() => list))
      .then(setWorkspaces)
      .catch((e: unknown) => setError(String(e instanceof Error ? e.message : e)));
  };

  const renameWorkspace = (): void => {
    const from = workspacesRef.current.active;
    const to = window.prompt(`Renomear workspace "${from}" para:`, from)?.trim();
    if (!to || to === from) return;
    void window.cockpit.workspace
      .rename({ from, to })
      .then(setWorkspaces)
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

  return (
    <main
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#0B0F14',
        color: '#E5E7EB',
        fontFamily: 'Inter, system-ui, sans-serif',
        overflow: 'hidden'
      }}
    >
      <StatusPulseStyles />
      <header
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 12,
          padding: '10px 16px',
          borderBottom: '1px solid #1F2937',
          flexShrink: 0
        }}
      >
        <h1 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>🛰️ Meu Cockpit</h1>
        {/* Workspaces (Story 3.6): troca rápida + criar/renomear */}
        <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <select
            value={workspaces.active}
            onChange={(e) => switchWorkspace(e.target.value)}
            title="Workspace ativo (filtra o canvas)"
            style={{
              background: '#111827',
              color: '#E5E7EB',
              border: '1px solid #1F2937',
              borderRadius: 6,
              padding: '4px 8px',
              fontSize: 12
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
        <nav style={{ display: 'flex', gap: 4 }}>
          {(
            [
              ['master', 'Master', 'Sessão Master (Ctrl+M)'],
              ['canvas', 'Canvas', 'Canvas de terminais'],
              ['timeline', 'Timeline', 'Trilha de eventos (Ctrl+T)']
            ] as const
          ).map(([v, label, title]) => (
            <button
              key={v}
              onClick={() => setView(v)}
              title={title}
              style={{
                background: view === v ? '#1F2937' : 'transparent',
                color: view === v ? '#E5E7EB' : '#9CA3AF',
                border: '1px solid #1F2937',
                borderRadius: 6,
                padding: '3px 10px',
                fontSize: 12,
                cursor: 'pointer'
              }}
            >
              {label}
            </button>
          ))}
        </nav>
        {info && (
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#9CA3AF' }}>
            v{info.version} · {info.platform} · {sessions.length}{' '}
            {sessions.length === 1 ? 'sessão' : 'sessões'}
          </span>
        )}
        <span style={{ flex: 1 }} />
        {(() => {
          const waiting = sessions.filter(
            (s) => s.agentStatus === 'waiting-input' && s.status === 'running'
          ).length;
          if (waiting === 0) return null;
          return (
            <button
              onClick={() => setView('master')}
              title="Ir à fila de decisões pendentes"
              style={{
                background: statusColor('waiting-input'),
                color: '#0B0F14',
                fontWeight: 700,
                fontSize: 12,
                border: 'none',
                borderRadius: 12,
                padding: '3px 10px',
                cursor: 'pointer'
              }}
            >
              {waiting} aguardando você
            </button>
          );
        })()}
        {adapters.length > 1 && (
          <select
            value={selectedAdapter}
            onChange={(e) => setSelectedAdapter(e.target.value)}
            title="Adapter do novo terminal"
            style={{
              background: '#111827',
              color: '#E5E7EB',
              border: '1px solid #1F2937',
              borderRadius: 6,
              padding: '4px 8px',
              fontSize: 12
            }}
          >
            {adapters.map((a) => (
              <option key={a.id} value={a.id}>
                {a.displayName}
              </option>
            ))}
          </select>
        )}
        <button
          onClick={() => void newTerminal()}
          title={`Novo terminal ${selectedAdapter} (Ctrl+N)`}
          style={{
            background: '#111827',
            color: '#E5E7EB',
            border: '1px solid #1F2937',
            borderRadius: 6,
            padding: '4px 12px',
            fontSize: 12,
            cursor: 'pointer'
          }}
        >
          + novo terminal
        </button>
        {error && (
          <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#F87171' }}>{error}</span>
        )}
      </header>

      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <Sidebar
          sessions={sessions}
          focusedId={focusedId}
          onSelect={(id) => goToTerminal(id)}
          onNewTerminal={() => void newTerminal()}
        />

        {view === 'master' && (
          <MasterDashboard
            sessions={sessions}
            onGoToTerminal={goToTerminal}
            onInstruct={instructAgent}
            onOpenReport={(id) => {
              setReportId(id);
              setView('report');
            }}
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

        <section
          style={{
            flex: 1,
            position: 'relative',
            overflow: 'auto',
            minWidth: 0,
            // Canvas fica MONTADO quando o master está ativo (desmontar
            // mataria xterm/portas) — apenas escondido.
            display: view === 'canvas' ? 'block' : 'none'
          }}
        >
          {sessions.map((session) => {
            const tile = layout.tiles.find((t) => t.id === session.id);
            if (!tile) return null;
            // Canvas filtra por workspace (3.6, AC2) — tiles de outros
            // workspaces ficam MONTADOS (desmontar mataria xterm/portas,
            // gotcha da 1.3), apenas escondidos pelo wrapper.
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
              />
              </div>
            );
          })}
          {sessions.length === 0 && (
            <p
              style={{
                position: 'absolute',
                inset: 0,
                display: 'grid',
                placeItems: 'center',
                color: '#6B7280',
                fontFamily: 'monospace',
                fontSize: 13
              }}
            >
              Ctrl+N ou "+ novo terminal" para começar
            </p>
          )}
        </section>
      </div>
    </main>
  );
}

const wsButtonStyle: React.CSSProperties = {
  background: 'transparent',
  color: '#9CA3AF',
  border: '1px solid #1F2937',
  borderRadius: 4,
  width: 24,
  height: 24,
  cursor: 'pointer',
  fontSize: 12
};
