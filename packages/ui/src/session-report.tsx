import type { SessionReport, TimelineEvent } from '@cockpit/shared';
import { formatDuration } from './format-duration';

/**
 * SessionReportView (Story 3.5) — painel de detalhe da sessão: métricas
 * projetadas da trilha + últimos eventos. tokens/tools exibem "—" até os
 * adapters exporem números reais (base extensível — AC3).
 */

export interface SessionReportViewProps {
  report: SessionReport | null;
  /** Últimos eventos da sessão (timeline filtrada, mais recentes primeiro). */
  events: TimelineEvent[];
  onBack: () => void;
  onRefresh: () => void;
}

const ORIGIN_ICON: Record<TimelineEvent['origin'], string> = {
  system: '⚙️',
  agent: '🤖',
  human: '👤'
};

export function SessionReportView({ report, events, onBack, onRefresh }: SessionReportViewProps): JSX.Element {
  if (!report) {
    return (
      <section style={{ flex: 1, minWidth: 0, padding: 24 }}>
        <button onClick={onBack} style={buttonStyle}>
          ← voltar ao master
        </button>
        <p style={{ fontFamily: 'monospace', fontSize: 13, color: '#6B7280', marginTop: 16 }}>
          Sessão ainda não persistida — sem relatório.
        </p>
      </section>
    );
  }

  const metrics: Array<[string, string]> = [
    ['adapter', report.adapterId],
    ['criada em', `${new Date(report.createdAt).toLocaleDateString('pt-BR')} ${new Date(report.createdAt).toLocaleTimeString('pt-BR')}`],
    ['duração', formatDuration(report.durationMs) + (report.endedAt === null ? ' (ativa)' : '')],
    ['transições de status', String(report.statusTransitions)],
    ['instruções via master', String(report.instructions)],
    ['recuperações', String(report.recoveries)],
    ['exit code', report.exitCode === null ? '—' : String(report.exitCode)],
    ['tokens', report.tokens === undefined ? '—' : String(report.tokens)],
    ['tool calls', report.toolCalls === undefined ? '—' : String(report.toolCalls)]
  ];

  return (
    <section style={{ flex: 1, minWidth: 0, padding: 24, overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <button onClick={onBack} style={buttonStyle}>
          ← master
        </button>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, flex: 1 }}>Relatório · {report.name}</h2>
        <button onClick={onRefresh} style={buttonStyle}>
          ↻ atualizar
        </button>
      </div>
      <p style={{ fontSize: 12, color: '#6B7280', margin: '0 0 20px', fontFamily: 'monospace' }}>{report.cwd}</p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 10,
          marginBottom: 24
        }}
      >
        {metrics.map(([label, value]) => (
          <div
            key={label}
            style={{ padding: '10px 14px', background: '#0D131B', border: '1px solid #1F2937', borderRadius: 8 }}
          >
            <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 14, color: '#E5E7EB', fontFamily: 'monospace' }}>{value}</div>
          </div>
        ))}
      </div>

      <h3 style={{ fontSize: 13, color: '#9CA3AF', margin: '0 0 8px' }}>Últimos eventos</h3>
      {events.length === 0 && (
        <p style={{ fontFamily: 'monospace', fontSize: 13, color: '#6B7280' }}>Sem eventos registrados.</p>
      )}
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {events.map((e) => (
          <li
            key={e.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '150px 28px 1.2fr 2fr',
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

const buttonStyle: React.CSSProperties = {
  background: '#111827',
  color: '#E5E7EB',
  border: '1px solid #1F2937',
  borderRadius: 6,
  padding: '4px 10px',
  fontSize: 12,
  cursor: 'pointer',
  whiteSpace: 'nowrap'
};
