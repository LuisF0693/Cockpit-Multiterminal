import type { SessionReport, TimelineEvent } from '@cockpit/shared';
import { formatDuration } from './format-duration';
import { theme } from './theme';

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
        <p style={{ fontFamily: theme.font.mono, fontSize: theme.font.size.md, color: theme.text.muted, marginTop: 16 }}>
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
    ['recuperações (relançada)', String(report.recoveries)],
    ['adoções (retomada sem perda)', String(report.adoptions)],
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
      <p style={{ fontSize: theme.font.size.sm, color: theme.text.muted, margin: '0 0 20px', fontFamily: theme.font.mono }}>{report.cwd}</p>

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
            style={{ padding: '10px 14px', background: theme.surface.panel, border: `1px solid ${theme.border.default}`, borderRadius: theme.radius.md }}
          >
            <div style={{ fontSize: theme.font.size.xs, color: theme.text.muted, marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 14, color: theme.text.primary, fontFamily: theme.font.mono }}>{value}</div>
          </div>
        ))}
      </div>

      <h3 style={{ fontSize: theme.font.size.md, color: theme.text.muted, margin: '0 0 8px' }}>Últimos eventos</h3>
      {events.length === 0 && (
        <p style={{ fontFamily: theme.font.mono, fontSize: theme.font.size.md, color: theme.text.muted }}>Sem eventos registrados.</p>
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
              background: theme.surface.panel,
              border: `1px solid ${theme.border.default}`,
              borderRadius: 6,
              fontSize: theme.font.size.sm
            }}
          >
            <span style={{ color: theme.text.faint, fontFamily: theme.font.mono }}>
              {new Date(e.ts).toLocaleTimeString('pt-BR')} · {new Date(e.ts).toLocaleDateString('pt-BR')}
            </span>
            <span title={e.origin}>{ORIGIN_ICON[e.origin]}</span>
            <span style={{ color: theme.text.primary, fontFamily: theme.font.mono }}>{e.type}</span>
            <span
              style={{ color: theme.text.faint, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
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
  background: theme.surface.raised,
  color: theme.text.primary,
  border: `1px solid ${theme.border.default}`,
  borderRadius: 6,
  padding: '4px 10px',
  fontSize: theme.font.size.sm,
  cursor: 'pointer',
  whiteSpace: 'nowrap'
};
