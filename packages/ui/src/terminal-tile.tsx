import { useEffect, useRef, useState } from 'react';
import type { SessionRecord } from '@cockpit/shared';
import { TerminalView } from './terminal-view';
import { statusColor, statusLabel } from './status-colors';
import { adapterColor } from './adapter-colors';
import { theme } from './theme';
import type { TileLayout } from './layout';

/**
 * TerminalTile (front-end spec): cabeçalho sempre visível com nome editável
 * (duplo-clique), botão fechar e área xterm. Drag pelo cabeçalho, resize
 * pelas bordas/canto — as mutações de layout são delegadas ao dono (App),
 * que aplica clamp/snap via funções puras de layout.ts.
 */

export interface TerminalTileProps {
  session: SessionRecord;
  layout: TileLayout;
  focused: boolean;
  port: MessagePort | null;
  onFocus: () => void;
  onClose: () => void;
  onRename: (name: string) => void;
  onMove: (x: number, y: number) => void;
  onMoveEnd: () => void;
  onResizeTile: (width: number, height: number) => void;
  onResizePty: (size: { cols: number; rows: number }) => void;
  /** Inicia o arraste de vínculo terminal-a-terminal (Story 12.2, AC4) — alça própria, nunca o header. */
  onStartLink: () => void;
  /** Cor do projeto dono (Story 12.3, FR37) — null/undefined = sem projeto, visual neutro (AC2). */
  projectColor?: string | null;
  /** Zoom do canvas — deltas de arraste em pixels de tela são divididos por isso pra continuar 1:1 com o cursor. */
  zoom: number;
}

type DragState =
  | { kind: 'move'; startX: number; startY: number; originX: number; originY: number }
  | { kind: 'resize'; edge: 'e' | 's' | 'se'; startX: number; startY: number; originW: number; originH: number };

export function TerminalTile(props: TerminalTileProps): JSX.Element {
  const { session, layout, focused, port } = props;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(session.name);
  const dragRef = useRef<DragState | null>(null);

  // Callbacks mais recentes para os listeners de janela (drag/resize).
  const propsRef = useRef(props);
  propsRef.current = props;

  useEffect(() => {
    const onPointerMove = (e: PointerEvent): void => {
      const drag = dragRef.current;
      if (!drag) return;
      const zoom = propsRef.current.zoom;
      if (drag.kind === 'move') {
        propsRef.current.onMove(
          drag.originX + (e.clientX - drag.startX) / zoom,
          drag.originY + (e.clientY - drag.startY) / zoom
        );
      } else {
        const dw = drag.edge !== 's' ? (e.clientX - drag.startX) / zoom : 0;
        const dh = drag.edge !== 'e' ? (e.clientY - drag.startY) / zoom : 0;
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

  // Vínculo por arraste (Story 12.2, redesenhado): segurar Alt e arrastar de
  // QUALQUER parte do tile inicia o link em vez de mover — não precisa mais
  // caçar uma alça pequena escondida no cabeçalho (feedback do fundador na
  // validação visual). Sem Alt, comportamento de mover/focar continua 100%
  // igual — nenhuma regressão pro gesto padrão.
  const startMove = (e: React.PointerEvent): void => {
    if (e.altKey) {
      e.stopPropagation();
      props.onStartLink();
      return;
    }
    props.onFocus();
    dragRef.current = {
      kind: 'move',
      startX: e.clientX,
      startY: e.clientY,
      originX: layout.x,
      originY: layout.y
    };
  };

  const handleTilePointerDown = (e: React.PointerEvent): void => {
    if (e.altKey) {
      e.stopPropagation();
      props.onStartLink();
      return;
    }
    props.onFocus();
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

  const commitRename = (): void => {
    setEditing(false);
    const name = draft.trim();
    if (name && name !== session.name) props.onRename(name);
    else setDraft(session.name);
  };

  const exited = session.status === 'exited';
  const dotColor = statusColor(session.agentStatus);
  // Destaque proeminente de waiting-input (Story 2.5 / FR9): pulso âmbar
  // que vence o focus ring — visível mesmo em tile desfocado.
  const waiting = session.agentStatus === 'waiting-input' && !exited;

  return (
    <section
      data-tile-id={session.id}
      onPointerDown={handleTilePointerDown}
      title="Segure Alt e arraste pra vincular a outro terminal"
      style={{
        position: 'absolute',
        left: layout.x,
        top: layout.y,
        width: layout.width,
        height: layout.height,
        zIndex: layout.zIndex,
        display: 'flex',
        flexDirection: 'column',
        background: theme.surface.tile,
        border: waiting
          ? `1px solid ${dotColor}`
          : focused
            ? `1px solid ${theme.accent.primary}`
            : `1px solid ${theme.border.default}`,
        borderRadius: theme.radius.lg,
        boxShadow: waiting ? undefined : focused ? theme.shadow.tileFocused : theme.shadow.tile,
        animation: waiting ? 'cockpit-waiting-pulse 1.2s ease-in-out infinite' : undefined,
        overflow: 'hidden'
      }}
    >
      {/* Anel de identidade de projeto (Story 12.3, AC1/AC3) — camada
          independente do boxShadow de foco/waiting acima, nunca interfere
          na animação de pulso (que anima só o box-shadow do <section>). */}
      {props.projectColor && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: theme.radius.lg,
            boxShadow: `inset 0 0 0 2px ${props.projectColor}55`,
            pointerEvents: 'none'
          }}
        />
      )}
      <header
        onPointerDown={startMove}
        onDoubleClick={() => {
          setDraft(session.name);
          setEditing(true);
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: theme.space.sm,
          padding: `${theme.space.xs + 3}px ${theme.space.md}px`,
          background: focused ? theme.surface.header : theme.surface.panel,
          borderBottom: `1px solid ${theme.border.subtle}`,
          cursor: 'grab',
          userSelect: 'none',
          flexShrink: 0
        }}
      >
        {/* Identidade do adapter (Story 12.4, AC1) — swatch fixo por adapterId,
            independente do dot de status logo ao lado (agentStatus muda,
            adapterId não). */}
        <span
          title={`agente: ${session.adapterId}`}
          style={{
            width: 8,
            height: 8,
            borderRadius: theme.radius.sm / 2,
            background: adapterColor(session.adapterId),
            boxShadow: `0 0 6px ${adapterColor(session.adapterId)}66`,
            flexShrink: 0
          }}
        />
        <span
          title={`${session.adapterId} · ${statusLabel(session.agentStatus)}`}
          style={{
            fontSize: waiting ? 14 : theme.font.size.xs,
            color: exited ? theme.accent.danger : dotColor,
            transition: 'font-size 150ms'
          }}
        >
          ●
        </span>
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') {
                setDraft(session.name);
                setEditing(false);
              }
            }}
            onPointerDown={(e) => e.stopPropagation()}
            style={{
              flex: 1,
              background: theme.surface.tile,
              color: theme.text.primary,
              border: `1px solid ${theme.accent.primary}`,
              borderRadius: theme.radius.sm,
              padding: '1px 6px',
              fontSize: theme.font.size.sm,
              fontFamily: 'inherit'
            }}
          />
        ) : (
          <span
            title="Duplo-clique para renomear"
            style={{
              flex: 1,
              fontSize: theme.font.size.sm,
              fontWeight: 600,
              color: theme.text.primary,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {session.name}
            {exited && '  (encerrado)'}
          </span>
        )}
        <button
          onClick={props.onClose}
          onPointerDown={(e) => e.stopPropagation()}
          title="Fechar terminal (Ctrl+W)"
          style={{
            background: 'transparent',
            color: theme.text.muted,
            border: 'none',
            borderRadius: theme.radius.sm,
            width: 20,
            height: 20,
            lineHeight: '18px',
            cursor: 'pointer',
            fontSize: 14
          }}
        >
          ×
        </button>
      </header>

      <div style={{ flex: 1, minHeight: 0, padding: 4 }}>
        {port ? (
          <TerminalView port={port} focused={focused} onResize={props.onResizePty} />
        ) : (
          <p style={{ fontSize: theme.font.size.sm, color: theme.text.muted, padding: theme.space.sm, fontFamily: theme.font.mono }}>
            conectando PTY…
          </p>
        )}
      </div>

      {/* Alças de resize: borda direita, inferior e canto SE */}
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
