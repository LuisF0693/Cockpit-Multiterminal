import type { SessionRecord, TimelineEvent } from '@cockpit/shared';
import { adapterColor } from './adapter-colors';
import { formatDuration } from './format-duration';
import { statusColor, statusLabel } from './status-colors';
import { theme } from './theme';

/**
 * StatusFooter — rodapé ÚNICO de "Telemetria + status" (mock linhas 282-335):
 * uma faixa horizontal na base da janela com 3 colunas (sessões | decisões |
 * eventos), substituindo o layout anterior que espalhava sessões no rodapé
 * e decisões/eventos numa coluna vertical à direita do canvas — desvio do
 * mock notado pelo fundador. Os toggles de colapso já existem na faixa de
 * comando (AppToolbar `⌄`/`⟩`); este componente não duplica esses controles.
 */

export interface DecisionItem {
  id: string;
  /** '⚠' = tarefa aguardando decisão, '◎' = agente aguardando instrução. */
  icon: string;
  text: string;
}

export interface StatusFooterProps {
  sessions: SessionRecord[];
  focusedId: string | null;
  onFocusSession: (id: string) => void;
  sessionsCollapsed: boolean;
  decisions: DecisionItem[];
  onOpenDecisions: () => void;
  events: TimelineEvent[];
  telemetryCollapsed: boolean;
}

/** Cor por tipo de evento — mapa simples inspirado no mock (cyan/verde/âmbar/neutro). */
function eventColor(type: string): string {
  if (type.includes('decision')) return theme.accent.warn;
  if (type.includes('instruction') || type.includes('link') || type.includes('review')) return theme.accent.bright;
  if (type.includes('adopted') || type.includes('created')) return theme.accent.ok;
  return theme.text.secondary;
}

const columnTitleStyle: React.CSSProperties = {
  fontSize: 9.5,
  letterSpacing: 0.6,
  color: theme.text.faint,
  marginBottom: 5,
  whiteSpace: 'nowrap'
};

export function StatusFooter({
  sessions,
  focusedId,
  onFocusSession,
  sessionsCollapsed,
  decisions,
  onOpenDecisions,
  events,
  telemetryCollapsed
}: StatusFooterProps): JSX.Element | null {
  const active = sessions.filter((s) => s.status === 'running');
  const showSessions = !sessionsCollapsed;
  const showTelemetry = !telemetryCollapsed;
  if (!showSessions && !showTelemetry) return null;

  const nameOf = (id?: string): string => {
    if (!id) return '';
    return sessions.find((s) => s.id === id)?.name ?? id.slice(0, 6);
  };

  return (
    <footer
      style={{
        height: 108,
        minHeight: 108,
        background: theme.surface.app,
        borderTop: `1px solid ${theme.border.default}`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: theme.font.ui
      }}
    >
      <div
        style={{
          height: 24,
          minHeight: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 14px',
          borderBottom: `1px solid ${theme.border.subtle}`
        }}
      >
        <span style={{ fontSize: 11, color: theme.accent.bright }}>▸</span>
        <span style={{ fontSize: 11, color: theme.text.bright, fontWeight: 600, letterSpacing: 0.3 }}>
          Telemetria + status
        </span>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {showSessions && (
          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              padding: '6px 12px',
              overflow: 'hidden',
              borderRight: showTelemetry ? `1px solid ${theme.border.subtle}` : 'none'
            }}
          >
            <div style={columnTitleStyle}>
              SESSÕES · {active.length} ativa{active.length === 1 ? '' : 's'}
            </div>
            <div style={{ flex: 1, display: 'flex', gap: 8, overflowX: 'auto', alignItems: 'stretch' }}>
              {active.length === 0 && (
                <span style={{ fontSize: theme.font.size.xs, color: theme.text.faint, alignSelf: 'center' }}>
                  Ctrl+N para criar a primeira.
                </span>
              )}
              {active.map((s) => (
                <button
                  key={s.id}
                  onClick={() => onFocusSession(s.id)}
                  title={`${s.name} · ${statusLabel(s.agentStatus)} — clique para focar no canvas`}
                  style={{
                    minWidth: 172,
                    maxWidth: 220,
                    background: theme.surface.raised,
                    border: `1px solid ${focusedId === s.id ? theme.accent.ring : theme.border.strong}`,
                    borderRadius: theme.radius.md,
                    padding: '7px 9px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: theme.font.ui,
                    flexShrink: 0
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 7, height: 7, borderRadius: theme.radius.pill, background: statusColor(s.agentStatus), flexShrink: 0 }} />
                    <span style={{ fontSize: theme.font.size.sm + 0.5, color: theme.text.primary, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.name}
                    </span>
                  </span>
                  <span style={{ fontSize: 9.5, color: theme.text.faint, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.cwd}
                  </span>
                  <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, color: theme.text.muted }}>
                    <span>{formatDuration(Date.now() - s.lastStatusChangeAt)}</span>
                    <span style={{ color: adapterColor(s.adapterId) }}>{s.adapterId}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {showTelemetry && (
          <>
            <div
              style={{
                width: 220,
                minWidth: 220,
                display: 'flex',
                flexDirection: 'column',
                padding: '6px 12px',
                overflow: 'hidden',
                borderRight: `1px solid ${theme.border.subtle}`
              }}
            >
              <button
                onClick={onOpenDecisions}
                disabled={decisions.length === 0}
                title={decisions.length > 0 ? 'Ir à fila de decisões (master)' : 'Nenhuma decisão pendente'}
                style={{
                  all: 'unset',
                  cursor: decisions.length > 0 ? 'pointer' : 'default',
                  ...columnTitleStyle,
                  marginBottom: 5
                }}
              >
                DECISÕES · <span style={{ color: decisions.length > 0 ? theme.accent.warn : theme.text.faint }}>{decisions.length} pendente{decisions.length === 1 ? '' : 's'}</span>
              </button>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {decisions.map((d) => (
                  <div key={d.id} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', padding: '3px 0' }}>
                    <span style={{ fontSize: 11, color: theme.accent.warn, flexShrink: 0 }}>{d.icon}</span>
                    <span style={{ fontSize: 10.5, color: theme.text.secondary, lineHeight: 1.4 }}>{d.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ width: 260, minWidth: 260, display: 'flex', flexDirection: 'column', padding: '6px 12px', overflow: 'hidden' }}>
              <div style={columnTitleStyle}>
                EVENTOS <span style={{ color: theme.text.faint }}>(sessões ativas)</span>
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {events.length === 0 && (
                  <p style={{ fontSize: theme.font.size.xs, color: theme.text.faint, margin: 0 }}>sem eventos ainda.</p>
                )}
                {events.map((e) => (
                  <div key={e.id} style={{ display: 'flex', gap: 6, padding: '2px 0' }}>
                    <span style={{ color: theme.text.faint, fontSize: 9.5, whiteSpace: 'nowrap' }}>
                      {new Date(e.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span
                      title={JSON.stringify(e.payload)}
                      style={{ color: eventColor(e.type), fontSize: 10.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {e.terminalId ? `${nameOf(e.terminalId)}: ` : ''}
                      {e.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </footer>
  );
}
