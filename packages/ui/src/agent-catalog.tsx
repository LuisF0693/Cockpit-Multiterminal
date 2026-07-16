import type { AdapterInfo } from '@cockpit/shared';
import { adapterCatalogEntry } from './adapter-catalog';
import { adapterColor } from './adapter-colors';
import { theme } from './theme';

/**
 * AgentCatalog (Story 13.4, FR45) — catálogo dos adapters registrados:
 * identidade visual (12.4), descrição/comando (adapter-catalog.ts, fonte
 * única) e disponibilidade REAL no PATH (checada no Main). Ação direta de
 * criar terminal reusa o fluxo existente do dono (App), incluindo o campo
 * de modelo do Ollama (12.6).
 */

export interface AgentCatalogProps {
  adapters: AdapterInfo[];
  /** Caminho resolvido por adapterId; null = não encontrado; undefined = checando. */
  availability: Record<string, string | null | undefined>;
  onCreateTerminal: (adapterId: string) => void;
  /** Modelo do Ollama (estado do App — mesmo campo do header, 12.6). */
  ollamaModel: string;
  onOllamaModelChange: (model: string) => void;
}

export function AgentCatalog({
  adapters,
  availability,
  onCreateTerminal,
  ollamaModel,
  onOllamaModelChange
}: AgentCatalogProps): JSX.Element {
  return (
    <section style={{ flex: 1, minWidth: 0, padding: 24, overflowY: 'auto' }}>
      <h2 style={{ fontSize: theme.font.size.xl, fontWeight: 700, margin: '0 0 4px' }}>Agentes</h2>
      <p style={{ fontSize: theme.font.size.sm, color: theme.text.muted, margin: '0 0 20px' }}>
        {adapters.length} adapters registrados — disponibilidade verificada no PATH desta máquina
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: theme.space.md
        }}
      >
        {adapters.map((a) => {
          const meta = adapterCatalogEntry(a.id);
          const resolved = availability[a.id];
          const checking = resolved === undefined;
          const installed = typeof resolved === 'string';
          return (
            <article
              key={a.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: theme.space.sm,
                padding: '14px 16px',
                background: theme.surface.panel,
                border: `1px solid ${theme.border.default}`,
                borderRadius: theme.radius.lg,
                borderTop: `2px solid ${adapterColor(a.id)}`
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: theme.space.sm }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 3,
                    background: adapterColor(a.id),
                    boxShadow: `0 0 8px ${adapterColor(a.id)}66`,
                    flexShrink: 0
                  }}
                />
                <strong style={{ fontSize: theme.font.size.md, flex: 1 }}>{a.displayName}</strong>
                <span
                  title={installed ? `encontrado em: ${resolved}` : checking ? 'verificando…' : 'comando não encontrado no PATH'}
                  style={{
                    fontSize: theme.font.size.xs,
                    fontWeight: 700,
                    color: installed ? theme.text.inverse : checking ? theme.text.faint : theme.accent.danger,
                    background: installed ? theme.accent.ok : 'transparent',
                    border: installed ? 'none' : `1px solid ${checking ? theme.border.subtle : theme.accent.danger}`,
                    borderRadius: theme.radius.pill,
                    padding: '1px 8px'
                  }}
                >
                  {checking ? '…' : installed ? 'instalado' : 'não encontrado'}
                </span>
              </div>

              <p style={{ margin: 0, fontSize: theme.font.size.sm, color: theme.text.secondary, minHeight: 34 }}>
                {meta?.description ?? 'Adapter registrado dinamicamente.'}
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: theme.space.sm }}>
                <code
                  style={{
                    fontSize: theme.font.size.xs,
                    fontFamily: theme.font.mono,
                    color: theme.text.muted,
                    background: theme.surface.canvas,
                    border: `1px solid ${theme.border.subtle}`,
                    borderRadius: theme.radius.sm,
                    padding: '2px 8px',
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {meta ? [meta.command, ...(a.id === 'ollama' ? ['run', ollamaModel || 'llama3'] : (meta.defaultArgs ?? []))].join(' ') : '—'}
                </code>
                {a.id === 'ollama' && (
                  <input
                    value={ollamaModel}
                    onChange={(e) => onOllamaModelChange(e.target.value)}
                    placeholder="modelo"
                    title="Modelo do Ollama (por sessão)"
                    style={{
                      width: 90,
                      background: theme.surface.raised,
                      color: theme.text.primary,
                      border: `1px solid ${theme.border.default}`,
                      borderRadius: theme.radius.sm,
                      padding: '2px 8px',
                      fontSize: theme.font.size.xs,
                      fontFamily: theme.font.mono
                    }}
                  />
                )}
                <button
                  onClick={() => onCreateTerminal(a.id)}
                  disabled={!installed && !checking && a.id !== 'shell' && a.id !== 'cmd'}
                  title={installed || checking ? `Novo terminal ${a.displayName}` : 'Comando não encontrado no PATH'}
                  style={{
                    background: theme.surface.raised,
                    color: installed || checking ? theme.text.primary : theme.text.faint,
                    border: `1px solid ${theme.border.default}`,
                    borderRadius: 6,
                    padding: '4px 12px',
                    fontSize: theme.font.size.sm,
                    cursor: installed || checking ? 'pointer' : 'not-allowed',
                    whiteSpace: 'nowrap'
                  }}
                >
                  + terminal
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
