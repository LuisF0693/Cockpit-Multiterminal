import type { SessionRecord } from '@cockpit/shared';
import { adapterColor } from './adapter-colors';
import { formatDuration } from './format-duration';
import { statusColor, statusLabel } from './status-colors';
import { theme } from './theme';

const collapseButtonStyle: React.CSSProperties = {
  border: 'none',
  background: 'transparent',
  color: theme.text.faint,
  cursor: 'pointer',
  fontSize: 11,
  padding: 0,
  lineHeight: 1
};

/**
 * SessionCardsBar (Story 14.2, FR48) — rodapé de 88px do mockup (linhas
 * 278-293): um card por sessão ATIVA com dot de status, nome, cwd e tempo
 * no status (SEM custo — não existe rastreio; decisão "só dados reais").
 * Clicar foca o terminal no canvas — substitui a antiga sidebar de sessões.
 */

export interface SessionCardsBarProps {
  sessions: SessionRecord[];
  focusedId: string | null;
  onFocusSession: (id: string) => void;
  /** Colapsado (Story 15.5, FR58) — vira uma linha fina; canvas ganha a altura. */
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export function SessionCardsBar({
  sessions,
  focusedId,
  onFocusSession,
  collapsed,
  onToggleCollapsed
}: SessionCardsBarProps): JSX.Element {
  const active = sessions.filter((s) => s.status === 'running');

  if (collapsed) {
    return (
      <footer
        style={{
          height: 22,
          minHeight: 22,
          background: theme.surface.app,
          borderTop: `1px solid ${theme.border.default}`,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0 14px',
          fontFamily: theme.font.ui
        }}
      >
        <span style={{ fontSize: 10, color: theme.text.faint, letterSpacing: 0.6 }}>
          SESSÕES · {active.length} ativa{active.length === 1 ? '' : 's'}
        </span>
        <div style={{ flex: 1 }} />
        <button onClick={onToggleCollapsed} title="Expandir rodapé de sessões" style={collapseButtonStyle}>
          ▴
        </button>
      </footer>
    );
  }

  return (
    <footer
      style={{
        height: 88,
        minHeight: 88,
        background: theme.surface.app,
        borderTop: `1px solid ${theme.border.default}`,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '0 14px',
        overflowX: 'auto',
        fontFamily: theme.font.ui
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, marginRight: 4 }}>
        <span style={{ fontSize: 10, color: theme.text.faint, letterSpacing: 0.6, whiteSpace: 'nowrap' }}>
          SESSÕES · {active.length} ativa{active.length === 1 ? '' : 's'}
        </span>
        <button onClick={onToggleCollapsed} title="Recolher rodapé (canvas maior)" style={collapseButtonStyle}>
          ▾
        </button>
      </div>
      {active.length === 0 && (
        <span style={{ fontSize: theme.font.size.xs, color: theme.text.faint }}>Ctrl+N para criar a primeira.</span>
      )}
      {active.map((s) => (
        <button
          key={s.id}
          onClick={() => onFocusSession(s.id)}
          title={`${s.name} · ${statusLabel(s.agentStatus)} — clique para focar no canvas`}
          style={{
            minWidth: 190,
            maxWidth: 240,
            background: theme.surface.raised,
            border: `1px solid ${focusedId === s.id ? theme.accent.ring : theme.border.strong}`,
            borderRadius: theme.radius.md,
            padding: '8px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
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
          <span style={{ fontSize: 10, color: theme.text.faint, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {s.cwd}
          </span>
          <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: theme.text.muted }}>
            <span>{formatDuration(Date.now() - s.lastStatusChangeAt)}</span>
            <span style={{ color: adapterColor(s.adapterId) }}>{s.adapterId}</span>
          </span>
        </button>
      ))}
    </footer>
  );
}
