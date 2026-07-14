import { useState } from 'react';
import type { SessionRecord } from '@cockpit/shared';
import { statusColor, statusLabel } from './status-colors';

/**
 * Sidebar de navegação em árvore (escopo mínimo da 1.3: só sessões).
 * Colapsável; clique foca o tile correspondente. Tarefas/documentos
 * entram nos épicos 3/5.
 */

export interface SidebarProps {
  sessions: SessionRecord[];
  focusedId: string | null;
  onSelect: (id: string) => void;
  onNewTerminal: () => void;
}

export function Sidebar({ sessions, focusedId, onSelect, onNewTerminal }: SidebarProps): JSX.Element {
  const [collapsed, setCollapsed] = useState(false);

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
        <span style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', flex: 1, letterSpacing: 1 }}>
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
          <p style={{ fontSize: 12, color: '#6B7280', padding: '4px 12px' }}>
            Nenhuma sessão — Ctrl+N para criar.
          </p>
        )}
        {sessions.map((s, i) => (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              padding: '6px 12px',
              background: s.id === focusedId ? '#111827' : 'transparent',
              border: 'none',
              borderLeft: s.id === focusedId ? '2px solid #22D3EE' : '2px solid transparent',
              color: '#E5E7EB',
              fontSize: 12,
              textAlign: 'left',
              cursor: 'pointer'
            }}
          >
            <span
              title={statusLabel(s.agentStatus)}
              style={{
                fontSize: 10,
                color: s.status === 'exited' ? '#F87171' : statusColor(s.agentStatus)
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
                  color: '#0B0F14',
                  background: statusColor('waiting-input'),
                  borderRadius: 8,
                  padding: '0 6px'
                }}
              >
                !
              </span>
            )}
            {i < 9 && <kbd style={{ fontSize: 10, color: '#6B7280' }}>⌃{i + 1}</kbd>}
          </button>
        ))}
      </nav>
    </aside>
  );
}

const asideStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  background: '#0D131B',
  borderRight: '1px solid #1F2937',
  flexShrink: 0,
  transition: 'width 120ms ease'
};

const iconButtonStyle: React.CSSProperties = {
  background: 'transparent',
  color: '#9CA3AF',
  border: '1px solid #1F2937',
  borderRadius: 4,
  width: 22,
  height: 22,
  cursor: 'pointer',
  fontSize: 12,
  lineHeight: '18px'
};
