import { useEffect, useRef, useState } from 'react';
import type { BrowserTile } from '@cockpit/shared';
import type { TileLayout } from './layout';

/**
 * BrowserPreviewTile (Story 10.1) — mesmo esqueleto de drag/resize do
 * TerminalTile (cabeçalho arrasta, bordas/canto redimensionam), mas em vez
 * de um terminal PTY mostra um snapshot da página Playwright (screenshot
 * poll do App.tsx, prop `screenshot`) + barra de navegação (URL/voltar/
 * avançar/recarregar). WYSIWYG deliberado: nunca uma segunda instância
 * invisível — o que o agente automatiza (10.2) é o que aparece aqui.
 */

export interface BrowserPreviewTileProps {
  tile: BrowserTile;
  layout: TileLayout;
  focused: boolean;
  /** Data URL do snapshot mais recente (poll do App.tsx) — null enquanto carrega. */
  screenshot: string | null;
  onFocus: () => void;
  onClose: () => void;
  onNavigate: (url: string) => void;
  onBack: () => void;
  onForward: () => void;
  onReload: () => void;
  onMove: (x: number, y: number) => void;
  onMoveEnd: () => void;
  onResizeTile: (width: number, height: number) => void;
}

type DragState =
  | { kind: 'move'; startX: number; startY: number; originX: number; originY: number }
  | { kind: 'resize'; edge: 'e' | 's' | 'se'; startX: number; startY: number; originW: number; originH: number };

export function BrowserPreviewTile(props: BrowserPreviewTileProps): JSX.Element {
  const { tile, layout, focused, screenshot } = props;
  const [urlDraft, setUrlDraft] = useState(tile.url);
  const dragRef = useRef<DragState | null>(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  useEffect(() => setUrlDraft(tile.url), [tile.url]);

  useEffect(() => {
    const onPointerMove = (e: PointerEvent): void => {
      const drag = dragRef.current;
      if (!drag) return;
      if (drag.kind === 'move') {
        propsRef.current.onMove(drag.originX + (e.clientX - drag.startX), drag.originY + (e.clientY - drag.startY));
      } else {
        const dw = drag.edge !== 's' ? e.clientX - drag.startX : 0;
        const dh = drag.edge !== 'e' ? e.clientY - drag.startY : 0;
        propsRef.current.onResizeTile(drag.originW + dw, drag.originH + dh);
      }
    };
    const onPointerUp = (): void => {
      if (dragRef.current) {
        dragRef.current = null;
        propsRef.current.onMoveEnd();
      }
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, []);

  const startMove = (e: React.PointerEvent): void => {
    props.onFocus();
    dragRef.current = { kind: 'move', startX: e.clientX, startY: e.clientY, originX: layout.x, originY: layout.y };
  };

  const startResize = (edge: 'e' | 's' | 'se') => (e: React.PointerEvent): void => {
    e.stopPropagation();
    props.onFocus();
    dragRef.current = {
      kind: 'resize',
      edge,
      startX: e.clientX,
      startY: e.clientY,
      originW: layout.width,
      originH: layout.height
    };
  };

  const submitUrl = (): void => {
    const url = urlDraft.trim();
    if (url) props.onNavigate(url);
  };

  return (
    <section
      onPointerDown={props.onFocus}
      style={{
        position: 'absolute',
        left: layout.x,
        top: layout.y,
        width: layout.width,
        height: layout.height,
        zIndex: layout.zIndex,
        display: 'flex',
        flexDirection: 'column',
        background: '#0B0F14',
        border: focused ? '1px solid #22D3EE' : '1px solid #1F2937',
        borderRadius: 8,
        boxShadow: focused ? '0 0 0 1px #22D3EE55, 0 8px 24px #00000066' : '0 4px 16px #00000044',
        overflow: 'hidden'
      }}
    >
      <header
        onPointerDown={startMove}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 10px',
          background: focused ? '#111827' : '#0D131B',
          borderBottom: '1px solid #1F2937',
          cursor: 'grab',
          userSelect: 'none',
          flexShrink: 0
        }}
      >
        <span title="preview de browser (Playwright)" style={{ fontSize: 11 }}>
          🌐
        </span>
        <button onPointerDown={(e) => e.stopPropagation()} onClick={props.onBack} title="voltar" style={navButtonStyle}>
          ←
        </button>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={props.onForward}
          title="avançar"
          style={navButtonStyle}
        >
          →
        </button>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={props.onReload}
          title="recarregar"
          style={navButtonStyle}
        >
          ↻
        </button>
        <input
          value={urlDraft}
          onChange={(e) => setUrlDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submitUrl();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          placeholder="https://…"
          style={{
            flex: 1,
            minWidth: 0,
            background: '#0B0F14',
            color: '#E5E7EB',
            border: '1px solid #1F2937',
            borderRadius: 4,
            padding: '2px 8px',
            fontSize: 11,
            fontFamily: 'monospace'
          }}
        />
        <button
          onClick={props.onClose}
          onPointerDown={(e) => e.stopPropagation()}
          title="fechar preview"
          style={{ background: 'transparent', color: '#9CA3AF', border: 'none', cursor: 'pointer', fontSize: 14 }}
        >
          ×
        </button>
      </header>

      <div style={{ flex: 1, minHeight: 0, background: '#000', display: 'grid', placeItems: 'center' }}>
        {screenshot ? (
          <img
            src={screenshot}
            alt={tile.url}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
          />
        ) : (
          <p style={{ fontSize: 12, color: '#6B7280', fontFamily: 'monospace' }}>carregando preview…</p>
        )}
      </div>

      <div
        onPointerDown={startResize('e')}
        style={{ position: 'absolute', right: 0, top: 0, width: 6, height: '100%', cursor: 'ew-resize' }}
      />
      <div
        onPointerDown={startResize('s')}
        style={{ position: 'absolute', left: 0, bottom: 0, height: 6, width: '100%', cursor: 'ns-resize' }}
      />
      <div
        onPointerDown={startResize('se')}
        style={{ position: 'absolute', right: 0, bottom: 0, width: 14, height: 14, cursor: 'nwse-resize' }}
      />
    </section>
  );
}

const navButtonStyle: React.CSSProperties = {
  background: 'transparent',
  color: '#9CA3AF',
  border: '1px solid #1F2937',
  borderRadius: 4,
  width: 20,
  height: 20,
  lineHeight: '16px',
  cursor: 'pointer',
  fontSize: 12
};
