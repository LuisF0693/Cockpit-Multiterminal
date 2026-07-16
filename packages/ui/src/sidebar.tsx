import { useState } from 'react';
import type { SessionRecord } from '@cockpit/shared';
import { statusColor, statusLabel } from './status-colors';
import { theme } from './theme';

/**
 * Sidebar de navegação em árvore (escopo mínimo da 1.3: só sessões).
 * Colapsável; clique foca o tile correspondente. Agrupada por workspace
 * quando há mais de um (Story 3.6). Tarefas/documentos entram no épico 5.
 */

export interface SidebarProps {
  sessions: SessionRecord[];
  focusedId: string | null;
  onSelect: (id: string) => void;
  onNewTerminal: () => void;
}

export function Sidebar({ sessions, focusedId, onSelect, onNewTerminal }: SidebarProps): JSX.Element {
  const [collapsed, setCollapsed] = useState(false);

  // Agrupamento por workspace (3.6): 'Geral' primeiro, demais em ordem
  // alfabética; índice original preservado para o atalho ⌃n.
  const groups = new Map<string, Array<{ s: SessionRecord; i: number }>>();
  sessions.forEach((s, i) => {
    const list = groups.get(s.workspace) ?? [];
    list.push({ s, i });
    groups.set(s.workspace, list);
  });
  const groupNames = [...groups.keys()].sort((a, b) =>
    a === 'Geral' ? -1 : b === 'Geral' ? 1 : a.localeCompare(b)
  );

  if (collapsed) {
    return (
      <aside style={{ ...asideStyle, width: 36, alignItems: 'center' }}>
        <button onClick={() => setCollapsed(false)} title="Expandir sidebar" style={iconButtonStyle}>
          »
        </button>
      </aside>
    );
  }

  return (
    <aside style={{ ...asideStyle, width: 220 }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '8px 10px', gap: 8 }}>
        <span style={{ fontSize: theme.font.size.xs, fontWeight: 700, color: theme.text.muted, flex: 1, letterSpacing: 1 }}>
          SESSÕES
        </span>
        <button onClick={onNewTerminal} title="Novo terminal (Ctrl+N)" style={iconButtonStyle}>
          +
        </button>
        <button onClick={() => setCollapsed(true)} title="Recolher sidebar" style={iconButtonStyle}>
          «
        </button>
      </div>
      <nav style={{ flex: 1, overflowY: 'auto' }}>
        {sessions.length === 0 && (
          <p style={{ fontSize: theme.font.size.sm, color: theme.text.muted, padding: '4px 12px' }}>
            Nenhuma sessão — Ctrl+N para criar.
          </p>
        )}
        {groupNames.map((ws) => (
          <div key={ws}>
            {groupNames.length > 1 && (
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: theme.text.faint,
                  letterSpacing: 1,
                  margin: '8px 0 2px',
                  padding: '0 12px',
                  textTransform: 'uppercase'
                }}
              >
                {ws}
              </p>
            )}
            {(groups.get(ws) ?? []).map(({ s, i }) => (
              <button
                key={s.id}
                onClick={() => onSelect(s.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              padding: '6px 12px',
              background: s.id === focusedId ? theme.surface.raised : 'transparent',
              border: 'none',
              borderLeft: s.id === focusedId ? `2px solid ${theme.accent.primary}` : '2px solid transparent',
              color: theme.text.primary,
              fontSize: theme.font.size.sm,
              textAlign: 'left',
              cursor: 'pointer'
            }}
          >
            <span
              title={statusLabel(s.agentStatus)}
              style={{
                fontSize: 10,
                color: s.status === 'exited' ? theme.accent.danger : statusColor(s.agentStatus)
              }}
            >
              ●
            </span>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {s.name}
            </span>
            {s.agentStatus === 'waiting-input' && s.status === 'running' && (
              <span
                title="aguardando você"
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: theme.text.inverse,
                  background: statusColor('waiting-input'),
                  borderRadius: 8,
                  padding: '0 6px'
                }}
              >
                !
              </span>
            )}
                {i < 9 && <kbd style={{ fontSize: 10, color: theme.text.faint }}>⌃{i + 1}</kbd>}
              </button>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}

const asideStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  background: theme.surface.panel,
  borderRight: `1px solid ${theme.border.default}`,
  flexShrink: 0,
  transition: 'width 120ms ease'
};

const iconButtonStyle: React.CSSProperties = {
  background: 'transparent',
  color: theme.text.muted,
  border: `1px solid ${theme.border.default}`,
  borderRadius: theme.radius.sm,
  width: 22,
  height: 22,
  cursor: 'pointer',
  fontSize: theme.font.size.sm,
  lineHeight: '18px'
};
