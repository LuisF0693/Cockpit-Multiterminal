import { useEffect, useRef, useState } from 'react';
import type { SessionRecord } from '@cockpit/shared';
import { TerminalView } from './terminal-view';
import { statusColor, statusLabel } from './status-colors';
import { adapterColor } from './adapter-colors';
import { ICON_SIZE, Icon, Icons } from './icons';
import { theme } from './theme';
import { MIN_TILE_HEIGHT, MIN_TILE_WIDTH, terminalContentScale } from './layout';
import type { TileLayout } from './layout';

/**
 * TerminalTile — anatomia do mockup Multerminal (Story 14.4, FR50; mock
 * linhas 149-186 e 600-626): barra de título 30px (`>_`, dot de status
 * PULSANTE, nome editável, badge do papel REAL, chip do adapter, maximizar,
 * fechar), rodapé 24px com cwd, PONTOS DE CONEXÃO nas 4 bordas (arrastar
 * cria vínculo — Alt+drag continua como gesto alternativo) e 8 alças de
 * resize visíveis só no tile focado. Mutações de layout continuam
 * delegadas ao dono (App), que aplica clamp/snap via layout.ts.
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
  /** Inicia o arraste de vínculo terminal-a-terminal (12.2/14.4). */
  onStartLink: () => void;
  /** Alterna maximizar/restaurar (14.4) — o dono guarda o tamanho anterior. */
  onMaximize: () => void;
  /** Um arraste de vínculo partiu DESTE tile — borda ciana (mock). */
  linking?: boolean;
  /** Cor do projeto dono (Story 12.3, FR37) — null/undefined = sem projeto. */
  projectColor?: string | null;
  /** Zoom do canvas — deltas de arraste divididos por isso (12.6/14.3). */
  zoom: number;
  /**
   * Confirma colagem multi-linha no terminal (pedido do fundador: não
   * executar 30 comandos sem querer). Repassado ao TerminalView; o dono é
   * quem sabe abrir o modal temático.
   */
  onConfirmMultilinePaste?: (submits: number) => Promise<boolean>;
}

type ResizeEdges = { n?: boolean; e?: boolean; s?: boolean; w?: boolean };

type DragState =
  | { kind: 'move'; startX: number; startY: number; originX: number; originY: number }
  | {
      kind: 'resize';
      edges: ResizeEdges;
      startX: number;
      startY: number;
      originX: number;
      originY: number;
      originW: number;
      originH: number;
    };

/** Badge do papel REAL na tarefa (7.1) — cores do mock (violeta/laranja). */
const ROLE_BADGE: Record<'writer' | 'reviewer', { label: string; color: string }> = {
  writer: { label: 'ESCRITOR', color: '#A78BFA' },
  reviewer: { label: 'REVISOR', color: '#FB923C' }
};

export function TerminalTile(props: TerminalTileProps): JSX.Element {
  const { session, layout, focused, port } = props;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(session.name);
  const dragRef = useRef<DragState | null>(null);

  const propsRef = useRef(props);
  propsRef.current = props;

  useEffect(() => {
    const onPointerMove = (e: PointerEvent): void => {
      const drag = dragRef.current;
      if (!drag) return;
      const zoom = propsRef.current.zoom;
      const dx = (e.clientX - drag.startX) / zoom;
      const dy = (e.clientY - drag.startY) / zoom;
      if (drag.kind === 'move') {
        propsRef.current.onMove(drag.originX + dx, drag.originY + dy);
        return;
      }
      // Resize por 8 alças (14.4): n/w movem a origem junto — clamp LOCAL
      // nos mínimos pra origem não derivar quando o store clampar o tamanho.
      let nx = drag.originX;
      let ny = drag.originY;
      let nw = drag.originW;
      let nh = drag.originH;
      if (drag.edges.e) nw = Math.max(MIN_TILE_WIDTH, drag.originW + dx);
      if (drag.edges.s) nh = Math.max(MIN_TILE_HEIGHT, drag.originH + dy);
      if (drag.edges.w) {
        nw = Math.max(MIN_TILE_WIDTH, drag.originW - dx);
        nx = drag.originX + (drag.originW - nw);
      }
      if (drag.edges.n) {
        nh = Math.max(MIN_TILE_HEIGHT, drag.originH - dy);
        ny = drag.originY + (drag.originH - nh);
      }
      if (drag.edges.n || drag.edges.w) propsRef.current.onMove(nx, ny);
      propsRef.current.onResizeTile(nw, nh);
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

  // Alt+drag de qualquer parte inicia vínculo (12.6) — gesto alternativo aos
  // pontos de conexão das bordas (14.4, gesto primário do mock).
  const startMove = (e: React.PointerEvent): void => {
    e.stopPropagation();
    if (e.altKey) {
      props.onStartLink();
      return;
    }
    props.onFocus();
    dragRef.current = { kind: 'move', startX: e.clientX, startY: e.clientY, originX: layout.x, originY: layout.y };
  };

  const handleTilePointerDown = (e: React.PointerEvent): void => {
    e.stopPropagation();
    if (e.altKey) {
      props.onStartLink();
      return;
    }
    props.onFocus();
  };

  const startResize = (edges: ResizeEdges) => (e: React.PointerEvent): void => {
    e.stopPropagation();
    props.onFocus();
    dragRef.current = {
      kind: 'resize',
      edges,
      startX: e.clientX,
      startY: e.clientY,
      originX: layout.x,
      originY: layout.y,
      originW: layout.width,
      originH: layout.height
    };
  };

  const startConnect = (e: React.PointerEvent): void => {
    e.stopPropagation();
    props.onStartLink();
  };

  const commitRename = (): void => {
    setEditing(false);
    const name = draft.trim();
    if (name && name !== session.name) props.onRename(name);
    else setDraft(session.name);
  };

  // Fator que leva a caixa lógica do terminal ao espaço do MUNDO do canvas.
  // Como o mundo já aplica `scale(zoom)`, a escala efetiva do texto na tela é
  // `contentFactor * zoom` = `terminalContentScale(...)` — 1 quando há espaço,
  // menor só na miniatura de zoom extremo.
  const contentFactor = terminalContentScale(layout, props.zoom) / props.zoom;
  const exited = session.status === 'exited';
  const dotColor = statusColor(session.agentStatus);
  const waiting = session.agentStatus === 'waiting-input' && !exited;
  const role = session.taskRole ? ROLE_BADGE[session.taskRole] : null;

  const connectDotBase: React.CSSProperties = {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: theme.surface.tile,
    border: `1.5px solid ${theme.accent.primary}`,
    zIndex: 55,
    cursor: 'crosshair'
  };

  return (
    <section
      data-tile-id={session.id}
      onPointerDown={handleTilePointerDown}
      title="Arraste um ponto da borda (ou Alt+arraste) para vincular a outro terminal"
      style={{
        position: 'absolute',
        left: layout.x,
        top: layout.y,
        width: layout.width,
        height: layout.height,
        zIndex: layout.zIndex,
        overflow: 'visible'
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          background: theme.surface.tile,
          border: waiting
            ? `1px solid ${dotColor}`
            : props.linking
              ? `1px solid ${theme.accent.primary}`
              : `1px solid ${theme.border.strong}`,
          borderRadius: theme.radius.lg,
          boxShadow: waiting ? undefined : focused ? theme.shadow.tileFocused : theme.shadow.tile,
          animation: waiting ? 'cockpit-waiting-pulse 1.2s ease-in-out infinite' : undefined,
          overflow: 'hidden'
        }}
      >
        {/* Anel de identidade de projeto (12.3) — camada independente. */}
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
            height: 30,
            minHeight: 30,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '0 8px',
            background: theme.surface.header,
            borderBottom: `1px solid ${theme.border.default}`,
            cursor: 'grab',
            userSelect: 'none',
            flexShrink: 0
          }}
        >
          <span style={{ display: 'flex', color: theme.accent.bright }}>
            <Icon glyph={Icons.terminal} size={ICON_SIZE.sm} />
          </span>
          <span
            title={`${session.adapterId} · ${statusLabel(session.agentStatus)}`}
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: exited ? theme.accent.danger : dotColor,
              animation: exited ? undefined : 'cockpit-pulse-dot 2.2s ease-in-out infinite',
              flexShrink: 0
            }}
          />
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
                fontSize: theme.font.size.sm + 0.5,
                fontFamily: 'inherit'
              }}
            />
          ) : (
            <span
              title="Duplo-clique para renomear"
              style={{
                fontSize: theme.font.size.sm + 0.5,
                color: theme.text.primary,
                fontWeight: 500,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {session.name}
              {exited && '  (encerrado)'}
            </span>
          )}
          <div style={{ flex: 1 }} />
          {role && (
            <span
              title={`papel na tarefa: ${session.taskRole}`}
              style={{
                fontSize: 8.5,
                fontWeight: 700,
                letterSpacing: 0.4,
                color: role.color,
                background: `${role.color}22`,
                border: `1px solid ${role.color}55`,
                padding: '1px 5px',
                borderRadius: theme.radius.sm,
                flexShrink: 0
              }}
            >
              {role.label}
            </span>
          )}
          <span
            title={`agente: ${session.adapterId}`}
            style={{
              fontSize: 9.5,
              color: adapterColor(session.adapterId),
              background: theme.surface.raised,
              border: `1px solid ${theme.border.strong}`,
              borderRadius: theme.radius.sm,
              padding: '1px 5px',
              flexShrink: 0
            }}
          >
            {session.adapterId}
          </span>
          <button
            onClick={props.onMaximize}
            onPointerDown={(e) => e.stopPropagation()}
            title="Maximizar/restaurar"
            aria-label={`Maximizar ou restaurar ${session.name}`}
            style={headerButtonStyle}
          >
            <Icon glyph={Icons.maximize} size={ICON_SIZE.xs} />
          </button>
          <button
            onClick={props.onClose}
            onPointerDown={(e) => e.stopPropagation()}
            title="Fechar terminal (Ctrl+W)"
            aria-label={`Fechar ${session.name}`}
            style={headerButtonStyle}
          >
            <Icon glyph={Icons.close} size={ICON_SIZE.sm} />
          </button>
        </header>

        {/*
          O TERMINAL NUNCA ESCALA (decisão do fundador).

          O canvas continua com zoom — é como ele navega entre tiles — mas o
          mundo inteiro vinha com `scale(canvasZoom)` no wrapper do App, e o
          conteúdo do terminal ia junto: em qualquer zoom ≠ 100% o texto era
          um bitmap esticado/encolhido, e borrava.

          Aqui o conteúdo é CONTRA-ESCALADO: a caixa interna é dimensionada em
          `zoom × 100%` e recebe `scale(1/zoom)`. Composto com o `scale(zoom)`
          do mundo, a escala efetiva do texto é exatamente 1 — cada pixel CSS
          do xterm vira um pixel de tela, e o WebGL rasteriza nítido. É a mesma
          técnica de contra-escala que Figma/VS Code usam para conteúdo textual
          dentro de uma superfície com zoom.

          CONSEQUÊNCIA ACEITA: com a fonte fixa em 100%, a área útil passa a ser
          medida em pixels de TELA — logo cols/rows mudam com o zoom (zoom out =
          menos colunas). É o comportamento correto para texto: melhor reduzir a
          janela visível do que reduzir a legibilidade da fonte. O reflow real
          acontece no `TerminalView` (fit + resize da PTY), com debounce para
          não disparar um resize de PTY por quadro durante o gesto de zoom.

          PISO de tamanho: abaixo de MIN_CONTENT_*_PX a caixa PARA de encolher e
          passa a ser recortada pelo `overflow: hidden` do pai. Sem isso, um
          zoom de 15% (o mínimo da faixa) reflowaria todo terminal para ~8
          colunas e destruiria o layout de qualquer TUI rodando. Abaixo do piso
          o conteúdo volta a ser escalado por CSS — miniatura embaçada, porém
          COMPLETA e sem reflow, num nível de zoom em que ninguém está lendo
          texto, só navegando entre tiles.

          A caixa interna é sempre `100/fator %` do pai e leva `scale(fator)`,
          então ela preenche a área útil EXATAMENTE em qualquer zoom — nada de
          recorte nem de sobra.
        */}
        <div style={{ flex: 1, minHeight: 0, padding: 4, overflow: 'hidden' }}>
          {port ? (
            <div
              style={{
                width: `${100 / contentFactor}%`,
                height: `${100 / contentFactor}%`,
                transform: contentFactor === 1 ? undefined : `scale(${contentFactor})`,
                transformOrigin: '0 0'
              }}
            >
              <TerminalView
                port={port}
                focused={focused}
                onResize={props.onResizePty}
                {...(props.onConfirmMultilinePaste !== undefined
                  ? { onConfirmMultilinePaste: props.onConfirmMultilinePaste }
                  : {})}
              />
            </div>
          ) : (
            <p style={{ fontSize: theme.font.size.sm, color: theme.text.muted, padding: theme.space.sm, fontFamily: theme.font.mono }}>
              conectando PTY…
            </p>
          )}
        </div>

        {/* Rodapé do tile (mock, linha 169) — cwd real + adapter. */}
        <div
          style={{
            height: 24,
            minHeight: 24,
            borderTop: `1px solid ${theme.border.default}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            padding: '0 10px',
            fontSize: 10,
            color: theme.text.faint,
            flexShrink: 0
          }}
        >
          <span title={session.cwd} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {session.cwd}
          </span>
          <span style={{ flexShrink: 0 }}>{session.adapterId}</span>
        </div>
      </div>

      {/* Pontos de conexão nas 4 bordas (14.4, FR50) — arrastar cria vínculo. */}
      <div onPointerDown={startConnect} title="Arraste para vincular" style={{ ...connectDotBase, left: -5, top: 'calc(50% - 5px)' }} />
      <div onPointerDown={startConnect} title="Arraste para vincular" style={{ ...connectDotBase, right: -5, top: 'calc(50% - 5px)' }} />
      <div onPointerDown={startConnect} title="Arraste para vincular" style={{ ...connectDotBase, top: -5, left: 'calc(50% - 5px)' }} />
      {/* Cor alinhada aos outros 3 pontos (auditoria UX Don Norman, achado #4)
          — accent.warn colidia com o âmbar de STATUS_COLORS['waiting-input'],
          fazendo o usuário ler "aguardando decisão" onde não havia nenhuma. */}
      <div
        onPointerDown={startConnect}
        title="Arraste para vincular"
        style={{ ...connectDotBase, bottom: -5, left: 'calc(50% - 5px)' }}
      />

      {/* 8 alças de resize (14.4) — visíveis só no tile focado (mock 586-596). */}
      {focused &&
        RESIZE_HANDLES.map((h) => (
          <div key={h.key} onPointerDown={startResize(h.edges)} style={{ ...resizeHandleBase, ...h.style }} />
        ))}
    </section>
  );
}

const headerButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 18,
  height: 18,
  border: 'none',
  background: 'transparent',
  color: theme.text.faint,
  cursor: 'pointer',
  borderRadius: 3,
  lineHeight: 1,
  padding: 0,
  flexShrink: 0
};

const resizeHandleBase: React.CSSProperties = {
  position: 'absolute',
  width: 9,
  height: 9,
  background: theme.surface.tile,
  border: `1.5px solid ${theme.accent.bright}`,
  borderRadius: 2,
  zIndex: 60
};

const RESIZE_HANDLES: Array<{ key: string; edges: ResizeEdges; style: React.CSSProperties }> = [
  { key: 'nw', edges: { n: true, w: true }, style: { left: -5, top: -5, cursor: 'nwse-resize' } },
  { key: 'n', edges: { n: true }, style: { left: 'calc(50% - 4.5px)', top: -5, cursor: 'ns-resize' } },
  { key: 'ne', edges: { n: true, e: true }, style: { right: -5, top: -5, cursor: 'nesw-resize' } },
  { key: 'e', edges: { e: true }, style: { right: -5, top: 'calc(50% - 4.5px)', cursor: 'ew-resize' } },
  { key: 'se', edges: { s: true, e: true }, style: { right: -5, bottom: -5, cursor: 'nwse-resize' } },
  { key: 's', edges: { s: true }, style: { left: 'calc(50% - 4.5px)', bottom: -5, cursor: 'ns-resize' } },
  { key: 'sw', edges: { s: true, w: true }, style: { left: -5, bottom: -5, cursor: 'nesw-resize' } },
  { key: 'w', edges: { w: true }, style: { left: -5, top: 'calc(50% - 4.5px)', cursor: 'ew-resize' } }
];
