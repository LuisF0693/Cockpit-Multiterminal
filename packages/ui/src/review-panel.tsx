import { classifyTaskRoles, type SessionRecord, type Task } from '@cockpit/shared';
import { statusColor, statusLabel } from './status-colors';

/**
 * ReviewPanel (Story 7.3) — escritor + revisores lado a lado, com trecho
 * recente do scrollback de cada um (AC1). Read-only: instruir a partir
 * daqui não é escopo desta story (já existe via TasksPanel/master); o
 * ciclo de correção automático é a 7.4.
 *
 * App.tsx faz o polling (mesmo padrão de TimelineView/SessionReportView) —
 * este componente só exibe `transcripts`, não busca dados sozinho.
 */

export interface ReviewPanelProps {
  task: Task | null;
  sessions: SessionRecord[];
  /** Trecho recente de scrollback por terminalId (AC1). */
  transcripts: Record<string, string>;
  onBack: () => void;
  onRefresh: () => void;
}

export function ReviewPanel({ task, sessions, transcripts, onBack, onRefresh }: ReviewPanelProps): JSX.Element {
  if (!task) {
    return (
      <section style={{ flex: 1, minWidth: 0, padding: 24 }}>
        <button onClick={onBack} style={buttonStyle}>
          ← voltar
        </button>
        <p style={{ fontFamily: 'monospace', fontSize: 13, color: '#6B7280', marginTop: 16 }}>
          Tarefa não encontrada.
        </p>
      </section>
    );
  }

  const roles = classifyTaskRoles(sessions, task.id);

  return (
    <section style={{ flex: 1, minWidth: 0, padding: 24, overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <button onClick={onBack} style={buttonStyle}>
          ← voltar
        </button>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, flex: 1 }}>Revisão · {task.title}</h2>
        <button onClick={onRefresh} style={buttonStyle}>
          ↻ atualizar
        </button>
      </div>

      {!roles.isThreeBrain ? (
        <p style={{ fontFamily: 'monospace', fontSize: 13, color: '#6B7280', marginTop: 16 }}>
          Esta tarefa não está em modo three-brain (precisa de 1 escritor + 2+ revisores vinculados — Story 7.1).
        </p>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${1 + roles.reviewers.length}, minmax(260px, 1fr))`,
            gap: 12,
            marginTop: 20
          }}
        >
          <AgentColumn label="✍ escritor" session={roles.writer!} transcript={transcripts[roles.writer!.id] ?? ''} />
          {roles.reviewers.map((r) => (
            <AgentColumn key={r.id} label="👁 revisor" session={r} transcript={transcripts[r.id] ?? ''} />
          ))}
        </div>
      )}
    </section>
  );
}

function AgentColumn({
  label,
  session,
  transcript
}: {
  label: string;
  session: SessionRecord;
  transcript: string;
}): JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        background: '#0D131B',
        border: '1px solid #1F2937',
        borderRadius: 8,
        padding: 12,
        minHeight: 0
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
        <span>{label}</span>
        <strong style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {session.name}
        </strong>
        <span style={{ color: '#9CA3AF' }}>{session.adapterId}</span>
        <span style={{ color: statusColor(session.agentStatus) }}>●</span>
        <span style={{ color: statusColor(session.agentStatus) }}>{statusLabel(session.agentStatus)}</span>
      </div>
      <pre
        style={{
          margin: 0,
          background: '#0B0F14',
          border: '1px solid #1F2937',
          borderRadius: 6,
          padding: 10,
          fontSize: 11,
          fontFamily: 'JetBrains Mono, monospace',
          color: '#9CA3AF',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          maxHeight: 320,
          overflowY: 'auto'
        }}
      >
        {transcript || '(sem saída recente)'}
      </pre>
    </div>
  );
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
