import { useEffect, useRef, useState } from 'react';
import {
  TERMINAL_PORT_MESSAGE,
  type AppInfo,
  type CockpitApi,
  type TerminalPortMessage
} from '@cockpit/shared';
import { Sidebar, TerminalTile, matchShortcut } from '@cockpit/ui';
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
  const bootRef = useRef(false);

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

    // Seed + primeiro terminal (uma vez, mesmo sob StrictMode).
    if (!bootRef.current) {
      bootRef.current = true;
      void window.cockpit.session
        .list()
        .then((list) => {
          store.seedSessions(list);
          if (list.length === 0) return newTerminal();
          return undefined;
        })
        .catch((e: unknown) => setError(String(e instanceof Error ? e.message : e)));
    }

    // Atalhos: registro central (Ctrl+N / Ctrl+1..9 / Ctrl+W).
    const onKeyDown = (e: KeyboardEvent): void => {
      const action = matchShortcut(e);
      if (!action) return;
      e.preventDefault();
      const st = useCockpitStore.getState();
      if (action.type === 'new-terminal') void newTerminal();
      if (action.type === 'focus-terminal') {
        const target = st.sessions[action.index];
        if (target) st.focus(target.id);
      }
      if (action.type === 'close-terminal' && st.focusedId) void closeSession(st.focusedId);
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('message', onWindowMessage);
      window.removeEventListener('keydown', onKeyDown);
      unsubscribe();
    };
  }, []);

  const newTerminal = async (): Promise<void> => {
    try {
      await window.cockpit.session.create({ cols: 80, rows: 24 });
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    }
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
        {info && (
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#9CA3AF' }}>
            v{info.version} · {info.platform} · {sessions.length}{' '}
            {sessions.length === 1 ? 'sessão' : 'sessões'}
          </span>
        )}
        <span style={{ flex: 1 }} />
        <button
          onClick={() => void newTerminal()}
          title="Novo terminal (Ctrl+N)"
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
          onSelect={(id) => useCockpitStore.getState().focus(id)}
          onNewTerminal={() => void newTerminal()}
        />

        <section style={{ flex: 1, position: 'relative', overflow: 'auto', minWidth: 0 }}>
          {sessions.map((session) => {
            const tile = layout.tiles.find((t) => t.id === session.id);
            if (!tile) return null;
            return (
              <TerminalTile
                key={session.id}
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
