import { useState } from 'react';
import { renderMarkdownLite } from './markdown-lite';
import { PanelResizeHandle } from './panel-resize-handle';
import { theme } from './theme';

/**
 * FilePreviewPanel (Story 14.5, FR51) — painel de ~520px do mockup (linhas
 * 205-259): abre quando um arquivo é selecionado na árvore, com header de
 * aba (ícone+nome+fechar) e toggle Preview/Markdown para `.md` (reusa o
 * renderizador do FR35). Efêmero por design: fecha no × e não persiste.
 */

export interface PreviewFile {
  name: string;
  path: string;
  content: string;
  truncated: boolean;
}

export interface FilePreviewPanelProps {
  file: PreviewFile;
  onClose: () => void;
  /** Largura atual (Story 15.1, FR52) — redimensionável por arraste. */
  width: number;
  onResize: (width: number) => void;
  onResizeEnd: (width: number) => void;
}

export function FilePreviewPanel({ file, onClose, width, onResize, onResizeEnd }: FilePreviewPanelProps): JSX.Element {
  const isMd = /\.mdx?$/i.test(file.name);
  const [mode, setMode] = useState<'preview' | 'code'>('preview');
  const showRendered = isMd && mode === 'preview';
  const icon = isMd ? '📘' : '📄';

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
      <div style={{ height: 36, minHeight: 36, display: 'flex', alignItems: 'center', background: theme.surface.panel, borderBottom: `1px solid ${theme.border.subtle}` }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            height: '100%',
            padding: '0 12px',
            background: '#0D0D0F',
            borderRight: `1px solid ${theme.border.subtle}`,
            borderTop: `1.5px solid ${theme.accent.bright}`
          }}
        >
          <span style={{ fontSize: theme.font.size.sm + 1 }}>{icon}</span>
          <span style={{ fontSize: theme.font.size.sm + 1, color: theme.text.primary }}>{file.name}</span>
          <button
            onClick={onClose}
            title="fechar preview"
            style={{
              width: 18,
              height: 18,
              border: 'none',
              background: 'transparent',
              color: theme.text.faint,
              cursor: 'pointer',
              fontSize: 13,
              borderRadius: 3,
              marginLeft: 4
            }}
          >
            ×
          </button>
        </div>
        <div style={{ flex: 1 }} />
      </div>

      <div style={{ height: 34, minHeight: 34, display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px', borderBottom: `1px solid ${theme.border.subtle}` }}>
        <span style={{ fontSize: theme.font.size.sm + 0.5 }}>{icon}</span>
        <span style={{ fontSize: theme.font.size.sm + 0.5, color: theme.text.secondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={file.path}>
          {file.name}
          {file.truncated ? ' · (truncado)' : ''}
        </span>
        <div style={{ flex: 1 }} />
        {isMd && (
          <div style={{ display: 'flex', background: '#17171A', border: `1px solid ${theme.border.strong}`, borderRadius: 6, overflow: 'hidden' }}>
            <button onClick={() => setMode('preview')} style={mode === 'preview' ? tabActiveStyle : tabIdleStyle}>
              Preview
            </button>
            <button onClick={() => setMode('code')} style={mode === 'code' ? tabActiveStyle : tabIdleStyle}>
              Markdown
            </button>
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {showRendered ? (
          <div style={{ padding: '26px 34px', maxWidth: 760 }}>{renderMarkdownLite(file.content)}</div>
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
            {file.content}
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
