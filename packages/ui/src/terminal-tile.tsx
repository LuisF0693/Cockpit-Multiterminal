import { useEffect, useRef, useState } from 'react';
import type { SessionRecord } from '@cockpit/shared';
import { TerminalView } from './terminal-view';
import { statusColor, statusLabel } from './status-colors';
import { adapterColor } from './adapter-colors';
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
      if (drag.kind === 'move') {
        propsRef.current.onMove(
          drag.originX + (e.clientX - drag.startX),
          drag.originY + (e.clientY - drag.startY)
        );
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
    dragRef.current = {
      kind: 'move',
      startX: e.clientX,
      startY: e.clientY,
      originX: layout.x,
      originY: layout.y
    };
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
        border: waiting
          ? `1px solid ${dotColor}`
          : focused
            ? '1px solid #22D3EE'
            : '1px solid #1F2937',
        borderRadius: 8,
        boxShadow: waiting
          ? undefined
          : focused
            ? '0 0 0 1px #22D3EE55, 0 8px 24px #00000066'
            : '0 4px 16px #00000044',
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
            borderRadius: 8,
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
          gap: 8,
          padding: '6px 10px',
          background: focused ? '#111827' : '#0D131B',
          borderBottom: '1px solid #1F2937',
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
            borderRadius: 2,
            background: adapterColor(session.adapterId),
            flexShrink: 0
          }}
        />
        <span
          title={`${session.adapterId} · ${statusLabel(session.agentStatus)}`}
          style={{
            fontSize: waiting ? 14 : 11,
            color: exited ? '#F87171' : dotColor,
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
              background: '#0B0F14',
              color: '#E5E7EB',
              border: '1px solid #22D3EE',
              borderRadius: 4,
              padding: '1px 6px',
              fontSize: 12,
              fontFamily: 'inherit'
            }}
          />
        ) : (
          <span
            title="Duplo-clique para renomear"
            style={{
              flex: 1,
              fontSize: 12,
              fontWeight: 600,
              color: '#E5E7EB',
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
          onPointerDown={(e) => {
            // Alça DEDICADA de vínculo (Story 12.2, AC4) — stopPropagation
            // evita disparar o startMove do header; nunca move o tile.
            e.stopPropagation();
            props.onStartLink();
          }}
          title="Arrastar para vincular a outro terminal"
          style={{
            background: 'transparent',
            color: '#9CA3AF',
            border: 'none',
            borderRadius: 4,
            width: 20,
            height: 20,
            lineHeight: '18px',
            cursor: 'crosshair',
            fontSize: 13
          }}
        >
          ⇢
        </button>
        <button
          onClick={props.onClose}
          onPointerDown={(e) => e.stopPropagation()}
          title="Fechar terminal (Ctrl+W)"
          style={{
            background: 'transparent',
            color: '#9CA3AF',
            border: 'none',
            borderRadius: 4,
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
          <p style={{ fontSize: 12, color: '#6B7280', padding: 8, fontFamily: 'monospace' }}>
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
