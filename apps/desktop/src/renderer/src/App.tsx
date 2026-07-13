import { useEffect, useRef, useState } from 'react';
import {
  TERMINAL_PORT_MESSAGE,
  type AppInfo,
  type CockpitApi,
  type TerminalPortMessage
} from '@cockpit/shared';
import { TerminalView } from '@cockpit/ui';

declare global {
  interface Window {
    cockpit: CockpitApi;
  }
}

interface ActiveTerminal {
  id: string;
  pid: number;
  port: MessagePort;
}

/**
 * Story 1.2: a canary page dá lugar a 1 terminal PTY real.
 * Header preserva nome/versão (AC da 1.1); grid de múltiplos terminais é a 1.3.
 */
export function App(): JSX.Element {
  const [info, setInfo] = useState<AppInfo | null>(null);
  const [terminal, setTerminal] = useState<ActiveTerminal | null>(null);
  const [error, setError] = useState<string | null>(null);

  // A porta pode chegar via window message ANTES do invoke resolver —
  // guardar dos dois lados e casar por id.
  const portsRef = useRef(new Map<string, MessagePort>());
  const createdRef = useRef<{ id: string; pid: number } | null>(null);

  useEffect(() => {
    let disposed = false;
    let ownedId: string | null = null;

    const tryActivate = (): void => {
      const created = createdRef.current;
      if (disposed || !created) return;
      const port = portsRef.current.get(created.id);
      if (!port) return;
      portsRef.current.delete(created.id);
      setTerminal({ id: created.id, pid: created.pid, port });
    };

    const onWindowMessage = (event: MessageEvent): void => {
      const data = event.data as Partial<TerminalPortMessage> | undefined;
      if (event.source !== window || data?.type !== TERMINAL_PORT_MESSAGE || !data.id) return;
      const port = event.ports[0];
      if (!port) return;
      portsRef.current.set(data.id, port);
      tryActivate();
    };
    window.addEventListener('message', onWindowMessage);

    window.cockpit
      .getAppInfo()
      .then(setInfo)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));

    window.cockpit.terminal
      .create({ cols: 80, rows: 24 })
      .then((created) => {
        // StrictMode (dev) roda o efeito 2x: se ESTE efeito já foi limpo,
        // fechar imediatamente o PTY que ele criou (evita sessão fantasma).
        if (disposed) {
          void window.cockpit.terminal.close({ id: created.id });
          return;
        }
        ownedId = created.id;
        createdRef.current = created;
        tryActivate();
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));

    return () => {
      disposed = true;
      window.removeEventListener('message', onWindowMessage);
      if (ownedId) void window.cockpit.terminal.close({ id: ownedId });
    };
  }, []);

  return (
    <main
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#0B0F14',
        color: '#E5E7EB',
        fontFamily: 'Inter, system-ui, sans-serif'
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
            v{info.version} · {info.platform}
            {terminal && ` · pty pid ${terminal.pid}`}
          </span>
        )}
      </header>

      <section style={{ flex: 1, minHeight: 0, padding: 8 }}>
        {terminal ? (
          <TerminalView
            port={terminal.port}
            onResize={({ cols, rows }) =>
              void window.cockpit.terminal.resize({ id: terminal.id, cols, rows })
            }
          />
        ) : error ? (
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#F87171' }}>
            Falha ao criar terminal: {error}
          </p>
        ) : (
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#6B7280' }}>
            Iniciando terminal…
          </p>
        )}
      </section>
    </main>
  );
}
