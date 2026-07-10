import { useEffect, useState } from 'react';
import type { AppInfo } from '@cockpit/shared';
import type { CockpitApi } from '../../preload/index';

declare global {
  interface Window {
    cockpit: CockpitApi;
  }
}

/**
 * Canary page (Story 1.1 AC2): nome + versão via IPC tipado.
 * Estilo inline temporário — tokens de design entram na Story 1.2 (*setup da Uma).
 */
export function App(): JSX.Element {
  const [info, setInfo] = useState<AppInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.cockpit
      .getAppInfo()
      .then(setInfo)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        background: '#0B0F14',
        color: '#E5E7EB',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}
    >
      <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>🛰️ Meu Cockpit</h1>
      {info && (
        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#9CA3AF' }}>
          v{info.version} · {info.platform} · canário operacional
        </p>
      )}
      {error && (
        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#F87171' }}>
          Falha no IPC app.info: {error}
        </p>
      )}
      <p style={{ fontSize: 13, color: '#6B7280' }}>
        Central de controle multiagente — fundação da Story 1.1
      </p>
    </main>
  );
}
