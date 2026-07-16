import type { SessionRecord, TimelineEvent } from '@cockpit/shared';
import { PanelResizeHandle } from './panel-resize-handle';
import { theme } from './theme';

/**
 * TelemetryPanel (Story 14.2, FR48) — painel direito de 230px do mockup
 * (linhas 261-275): "TELEMETRIA + STATUS" com o card de decisões pendentes
 * (contagem REAL da fila unificada 5.3) e "EVENTOS" (timeline real, 3.3,
 * resumida). Componente de exibição puro; polling no dono.
 */

export interface TelemetryPanelProps {
  pendingDecisionCount: number;
  onOpenDecisions: () => void;
  events: TimelineEvent[];
  sessions: SessionRecord[];
  /** Largura atual (Story 15.1, FR52) — redimensionável por arraste. */
  width: number;
  onResize: (width: number) => void;
  onResizeEnd: (width: number) => void;
}

/** Cor por tipo de evento — mapa simples inspirado no mock (cyan/verde/âmbar/neutro). */
function eventColor(type: string): string {
  if (type.includes('decision')) return theme.accent.warn;
  if (type.includes('instruction') || type.includes('link') || type.includes('review')) return theme.accent.bright;
  if (type.includes('adopted') || type.includes('created')) return theme.accent.ok;
  if (type.includes('status')) return theme.text.secondary;
  return theme.text.secondary;
}

export function TelemetryPanel({
  pendingDecisionCount,
  onOpenDecisions,
  events,
  sessions,
  width,
  onResize,
  onResizeEnd
}: TelemetryPanelProps): JSX.Element {
  const nameOf = (id?: string): string => {
    if (!id) return '';
    return sessions.find((s) => s.id === id)?.name ?? id.slice(0, 6);
  };

  return (
    <aside
      style={{
        position: 'relative',
        width,
        minWidth: width,
        background: theme.surface.panel,
        borderLeft: `1px solid ${theme.border.subtle}`,
        padding: '12px 10px',
        overflowY: 'auto',
        fontSize: theme.font.size.sm + 0.5,
        fontFamily: theme.font.ui
      }}
    >
      <PanelResizeHandle side="left" width={width} min={200} max={400} onResize={onResize} onResizeEnd={onResizeEnd} />
      <div style={sectionTitleStyle}>TELEMETRIA + STATUS</div>

      <button
        onClick={onOpenDecisions}
        disabled={pendingDecisionCount === 0}
        title={pendingDecisionCount > 0 ? 'Ir à fila de decisões (master)' : 'Nenhuma decisão pendente'}
        style={{
          width: '100%',
          background: theme.surface.header,
          border: `1px solid ${theme.border.default}`,
          borderRadius: theme.radius.md,
          padding: '8px 10px',
          marginBottom: 10,
          cursor: pendingDecisionCount > 0 ? 'pointer' : 'default',
          fontFamily: theme.font.ui
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', color: theme.text.secondary, fontSize: theme.font.size.xs + 0.5 }}>
          <span>Decisões</span>
          <span style={{ color: pendingDecisionCount > 0 ? theme.accent.warn : theme.text.faint }}>
            {pendingDecisionCount} pendente{pendingDecisionCount === 1 ? '' : 's'}
          </span>
        </div>
      </button>

      <div style={{ ...sectionTitleStyle, margin: '12px 0 6px' }}>EVENTOS</div>
      {events.length === 0 && <p style={{ fontSize: theme.font.size.xs, color: theme.text.faint, margin: 0 }}>sem eventos ainda.</p>}
      {events.map((e) => (
        <div key={e.id} style={{ display: 'flex', gap: 6, padding: '4px 0', borderBottom: `1px solid ${theme.border.subtle}` }}>
          <span style={{ color: theme.text.faint, fontSize: 10, whiteSpace: 'nowrap' }}>
            {new Date(e.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <span
            title={JSON.stringify(e.payload)}
            style={{ color: eventColor(e.type), fontSize: theme.font.size.xs + 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {e.terminalId ? `${nameOf(e.terminalId)}: ` : ''}
            {e.type}
          </span>
        </div>
      ))}
    </aside>
  );
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: 0.8,
  color: theme.text.faint,
  marginBottom: 8,
  fontWeight: 600
};
