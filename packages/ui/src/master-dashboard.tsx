import { useEffect, useState } from 'react';
import type { SessionRecord } from '@cockpit/shared';
import { formatDuration } from './format-duration';
import { statusColor, statusLabel } from './status-colors';

const queueButtonStyle: React.CSSProperties = {
  background: '#111827',
  color: '#E5E7EB',
  border: '1px solid #1F2937',
  borderRadius: 6,
  padding: '3px 10px',
  fontSize: 12,
  cursor: 'pointer',
  whiteSpace: 'nowrap'
};

/**
 * MasterDashboard (Story 3.1) — o Conductor: visão agregada de todos os
 * agentes com envio de instruções por linha (Story 3.2). Tela inicial do app.
 * Coluna "tarefa" nasce com "—" (vínculo Task chega no E5).
 */

export interface MasterDashboardProps {
  sessions: SessionRecord[];
  onGoToTerminal: (id: string) => void;
  /**
   * Envia instrução ao agente (Story 3.2). Retorna false se o envio foi
   * cancelado (guarda de error/done) — usado no feedback visual.
   */
  onInstruct: (id: string, text: string) => boolean;
  /** Abre o relatório da sessão (Story 3.5). */
  onOpenReport: (id: string) => void;
}

export function MasterDashboard({
  sessions,
  onGoToTerminal,
  onInstruct,
  onOpenReport
}: MasterDashboardProps): JSX.Element {
  const [, setTick] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [sentAt, setSentAt] = useState<Record<string, number>>({});

  // Tempo no status precisa andar sozinho (tick 1s).
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const submit = (id: string): void => {
    const text = (drafts[id] ?? '').trim();
    if (!text) return;
    if (onInstruct(id, text)) {
      setDrafts((d) => ({ ...d, [id]: '' }));
      setSentAt((s) => ({ ...s, [id]: Date.now() }));
      setTimeout(() => setSentAt((s) => ({ ...s, [id]: 0 })), 2500);
    }
  };

  return (
    <section style={{ flex: 1, minWidth: 0, padding: 24, overflowY: 'auto' }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>Sessão Master</h2>
      <p style={{ fontSize: 12, color: '#6B7280', margin: '0 0 20px' }}>
        {sessions.length} {sessions.length === 1 ? 'agente' : 'agentes'} sob governança — Ctrl+M alterna com o canvas
      </p>

      {/* Fila de decisões pendentes (Story 3.4 / FR9) */}
      {(() => {
        const waitingList = sessions.filter(
          (s) => s.agentStatus === 'waiting-input' && s.status === 'running'
        );
        if (waitingList.length === 0) return null;
        return (
          <div
            style={{
              marginBottom: 20,
              padding: 14,
              background: '#1F1A0E',
              border: `1px solid ${statusColor('waiting-input')}`,
              borderRadius: 8
            }}
          >
            <h3 style={{ margin: '0 0 10px', fontSize: 13, color: statusColor('waiting-input') }}>
              ⏳ Decisões pendentes ({waitingList.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {waitingList.map((s) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12 }}>
                  <strong style={{ minWidth: 140 }}>{s.name}</strong>
                  <span style={{ color: '#9CA3AF' }}>tarefa: —</span>
                  <span style={{ color: statusColor('waiting-input'), fontFamily: 'monospace' }}>
                    aguarda há {formatDuration(Date.now() - s.lastStatusChangeAt)}
                  </span>
                  <span style={{ flex: 1 }} />
                  <button onClick={() => onGoToTerminal(s.id)} style={queueButtonStyle}>
                    ir ao terminal →
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {sessions.length === 0 && (
        <p style={{ fontFamily: 'monospace', fontSize: 13, color: '#6B7280' }}>
          Nenhum agente ativo — Ctrl+N para criar o primeiro.
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sessions.map((s) => {
          const waiting = s.agentStatus === 'waiting-input' && s.status === 'running';
          return (
            <article
              key={s.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '18px 1.4fr 0.8fr 1fr 0.8fr 0.6fr 2fr auto',
                alignItems: 'center',
                gap: 12,
                padding: '10px 14px',
                background: waiting ? '#1F1A0E' : '#0D131B',
                border: `1px solid ${waiting ? statusColor('waiting-input') : '#1F2937'}`,
                borderRadius: 8
              }}
            >
              <span style={{ color: statusColor(s.agentStatus), fontSize: 12 }}>●</span>
              <strong style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.name}
              </strong>
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>{s.adapterId}</span>
              <span style={{ fontSize: 12, color: statusColor(s.agentStatus) }}>
                {statusLabel(s.agentStatus)}
              </span>
              <span
                title="tempo no status atual"
                style={{ fontSize: 12, color: '#9CA3AF', fontFamily: 'monospace' }}
              >
                {formatDuration(Date.now() - s.lastStatusChangeAt)}
              </span>
              <span style={{ fontSize: 12, color: '#4B5563' }} title="tarefa vinculada (E5)">
                —
              </span>
              <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  value={drafts[s.id] ?? ''}
                  onChange={(e) => setDrafts((d) => ({ ...d, [s.id]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submit(s.id);
                  }}
                  placeholder="instrução para o agente…"
                  disabled={s.status === 'exited'}
                  style={{
                    flex: 1,
                    background: '#0B0F14',
                    color: '#E5E7EB',
                    border: '1px solid #1F2937',
                    borderRadius: 6,
                    padding: '5px 10px',
                    fontSize: 12
                  }}
                />
                {(sentAt[s.id] ?? 0) > 0 && (
                  <span style={{ color: '#34D399', fontSize: 12 }} title="instrução enviada">
                    ✓
                  </span>
                )}
              </span>
              <span style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => onOpenReport(s.id)}
                  title="relatório da sessão (Story 3.5)"
                  style={queueButtonStyle}
                >
                  relatório
                </button>
                <button
                  onClick={() => onGoToTerminal(s.id)}
                  style={{
                    background: '#111827',
                    color: '#E5E7EB',
                    border: '1px solid #1F2937',
                    borderRadius: 6,
                    padding: '5px 12px',
                    fontSize: 12,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  ir ao terminal →
                </button>
              </span>
            </article>
          );
        })}
      </div>
    </section>
  );
}
