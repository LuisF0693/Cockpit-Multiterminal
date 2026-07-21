import { useState } from 'react';
import { renderMarkdownLite } from './markdown-lite';
import { PanelResizeHandle } from './panel-resize-handle';
import { theme } from './theme';

/**
 * FilePreviewPanel (Story 14.5, FR51) — painel de ~520px do mockup (linhas
 * 205-259): abre quando um arquivo é selecionado na árvore, com header de
 * aba (ícone+nome+fechar) e toggle Preview/Markdown para `.md` (reusa o
 * renderizador do FR35). Efêmero por design: fecha no × e não persiste.
 *
 * Múltiplas abas lado a lado (igual Cursor/VS Code) — cada arquivo aberto
 * ganha sua própria aba na faixa superior; clicar numa aba foca aquele
 * arquivo sem fechar os demais. Antes só existia 1 arquivo por vez: abrir
 * um novo substituía o anterior.
 */

export interface PreviewFile {
  name: string;
  path: string;
  content: string;
  truncated: boolean;
}

export interface FilePreviewPanelProps {
  files: PreviewFile[];
  activePath: string | null;
  onSelectTab: (path: string) => void;
  onCloseTab: (path: string) => void;
  /** Largura atual (Story 15.1, FR52) — redimensionável por arraste. */
  width: number;
  onResize: (width: number) => void;
  onResizeEnd: (width: number) => void;
}

const isMd = (name: string): boolean => /\.mdx?$/i.test(name);
const iconFor = (name: string): string => (isMd(name) ? '📘' : '📄');

export function FilePreviewPanel({
  files,
  activePath,
  onSelectTab,
  onCloseTab,
  width,
  onResize,
  onResizeEnd
}: FilePreviewPanelProps): JSX.Element | null {
  // Modo Preview/Markdown por aba (cada arquivo lembra sua própria escolha
  // ao trocar de aba) — só relevante pra `.md`, novas abas nascem em preview.
  const [modeByPath, setModeByPath] = useState<Record<string, 'preview' | 'code'>>({});

  const active = files.find((f) => f.path === activePath) ?? files[0] ?? null;
  if (!active) return null;

  const activeMd = isMd(active.name);
  const activeMode = modeByPath[active.path] ?? 'preview';
  const showRendered = activeMd && activeMode === 'preview';

  return (
    <div
      style={{
        position: 'relative',
        width,
        minWidth: width,
        display: 'flex',
        flexDirection: 'column',
        background: '#0D0D0F',
        borderLeft: `1px solid ${theme.border.subtle}`,
        overflow: 'hidden',
        fontFamily: theme.font.ui
      }}
    >
      <PanelResizeHandle side="left" width={width} min={380} max={800} onResize={onResize} onResizeEnd={onResizeEnd} />

      {/* Faixa de abas — uma por arquivo aberto, lado a lado (Cursor/VS Code). */}
      <div style={{ height: 36, minHeight: 36, display: 'flex', alignItems: 'stretch', background: theme.surface.panel, borderBottom: `1px solid ${theme.border.subtle}`, overflowX: 'auto' }}>
        {files.map((f) => {
          const isActive = f.path === active.path;
          return (
            <div
              key={f.path}
              onClick={() => onSelectTab(f.path)}
              title={f.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '0 10px',
                background: isActive ? '#0D0D0F' : 'transparent',
                borderRight: `1px solid ${theme.border.subtle}`,
                borderTop: isActive ? `1.5px solid ${theme.accent.bright}` : '1.5px solid transparent',
                cursor: 'pointer',
                flexShrink: 0,
                maxWidth: 180
              }}
            >
              <span style={{ fontSize: theme.font.size.sm + 1 }}>{iconFor(f.name)}</span>
              <span
                style={{
                  fontSize: theme.font.size.sm + 1,
                  color: isActive ? theme.text.primary : theme.text.secondary,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {f.name}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(f.path);
                }}
                title="fechar aba"
                style={{
                  width: 18,
                  height: 18,
                  border: 'none',
                  background: 'transparent',
                  color: theme.text.faint,
                  cursor: 'pointer',
                  fontSize: 13,
                  borderRadius: 3,
                  flexShrink: 0
                }}
              >
                ×
              </button>
            </div>
          );
        })}
        <div style={{ flex: 1 }} />
      </div>

      <div style={{ height: 34, minHeight: 34, display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px', borderBottom: `1px solid ${theme.border.subtle}` }}>
        <span style={{ fontSize: theme.font.size.sm + 0.5 }}>{iconFor(active.name)}</span>
        <span style={{ fontSize: theme.font.size.sm + 0.5, color: theme.text.secondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={active.path}>
          {active.name}
          {active.truncated ? ' · (truncado)' : ''}
        </span>
        <div style={{ flex: 1 }} />
        {activeMd && (
          <div style={{ display: 'flex', background: '#17171A', border: `1px solid ${theme.border.strong}`, borderRadius: 6, overflow: 'hidden' }}>
            <button
              onClick={() => setModeByPath((m) => ({ ...m, [active.path]: 'preview' }))}
              style={activeMode === 'preview' ? tabActiveStyle : tabIdleStyle}
            >
              Preview
            </button>
            <button
              onClick={() => setModeByPath((m) => ({ ...m, [active.path]: 'code' }))}
              style={activeMode === 'code' ? tabActiveStyle : tabIdleStyle}
            >
              Markdown
            </button>
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {showRendered ? (
          <div style={{ padding: '26px 34px', maxWidth: 760 }}>{renderMarkdownLite(active.content)}</div>
        ) : (
          <pre
            style={{
              margin: 0,
              padding: '16px 18px',
              fontSize: theme.font.size.sm + 1,
              lineHeight: 1.7,
              color: '#C4C4CB',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontFamily: theme.font.mono
            }}
          >
            {active.content}
          </pre>
        )}
      </div>
    </div>
  );
}

const tabBase: React.CSSProperties = {
  padding: '3px 12px',
  fontSize: theme.font.size.xs + 1,
  cursor: 'pointer',
  border: 'none',
  fontFamily: theme.font.ui
};

const tabActiveStyle: React.CSSProperties = {
  ...tabBase,
  color: theme.text.inverse,
  background: theme.accent.bright
};

const tabIdleStyle: React.CSSProperties = {
  ...tabBase,
  color: theme.text.secondary,
  background: 'transparent'
};
