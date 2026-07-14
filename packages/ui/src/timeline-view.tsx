import { useMemo, useState } from 'react';
import type { SessionRecord, TimelineEvent } from '@cockpit/shared';

/**
 * TimelineView (Story 3.3) — trilha auditável: timestamp, origem, tipo,
 * agente e payload resumido; filtros por agente e por tipo (AC3).
 */

export interface TimelineViewProps {
  events: TimelineEvent[];
  sessions: SessionRecord[];
  onRefresh: () => void;
}

const ORIGIN_ICON: Record<TimelineEvent['origin'], string> = {
  system: '⚙️',
  agent: '🤖',
  human: '👤'
};

export function TimelineView({ events, sessions, onRefresh }: TimelineViewProps): JSX.Element {
  const [agentFilter, setAgentFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const nameOf = useMemo(() => {
    const map = new Map(sessions.map((s) => [s.id, s.name]));
    return (id?: string): string => (id ? (map.get(id) ?? id.slice(0, 8)) : '—');
  }, [sessions]);

  const types = useMemo(() => [...new Set(events.map((e) => e.type))].sort(), [events]);
  const filtered = events.filter(
    (e) => (!agentFilter || e.terminalId === agentFilter) && (!typeFilter || e.type === typeFilter)
  );

  return (
    <section style={{ flex: 1, minWidth: 0, padding: 24, overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, flex: 1 }}>Timeline</h2>
        <select value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)} style={selectStyle}>
          <option value="">todos os agentes</option>
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={selectStyle}>
          <option value="">todos os tipos</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <button onClick={onRefresh} style={{ ...selectStyle, cursor: 'pointer' }}>
          ↻ atualizar
        </button>
      </div>

      {filtered.length === 0 && (
        <p style={{ fontFamily: 'monospace', fontSize: 13, color: '#6B7280' }}>Sem eventos para o filtro.</p>
      )}

      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {filtered.map((e) => (
          <li
            key={e.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '150px 28px 1.2fr 1fr 2fr',
              gap: 10,
              alignItems: 'baseline',
              padding: '7px 12px',
              background: '#0D131B',
              border: '1px solid #1F2937',
              borderRadius: 6,
              fontSize: 12
            }}
          >
            <span style={{ color: '#6B7280', fontFamily: 'monospace' }}>
              {new Date(e.ts).toLocaleTimeString('pt-BR')} · {new Date(e.ts).toLocaleDateString('pt-BR')}
            </span>
            <span title={e.origin}>{ORIGIN_ICON[e.origin]}</span>
            <span style={{ color: '#E5E7EB', fontFamily: 'monospace' }}>{e.type}</span>
            <span style={{ color: '#9CA3AF' }}>{nameOf(e.terminalId)}</span>
            <span
              style={{ color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              title={JSON.stringify(e.payload)}
            >
              {summarize(e.payload)}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function summarize(payload: Record<string, unknown>): string {
  const parts = Object.entries(payload)
    .slice(0, 3)
    .map(([k, v]) => `${k}: ${String(v).slice(0, 60)}`);
  return parts.join(' · ') || '—';
}

const selectStyle: React.CSSProperties = {
  background: '#111827',
  color: '#E5E7EB',
  border: '1px solid #1F2937',
  borderRadius: 6,
  padding: '4px 8px',
  fontSize: 12
};
