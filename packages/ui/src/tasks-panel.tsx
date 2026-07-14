import { useState } from 'react';
import type { Task, TaskState } from '@cockpit/shared';

/**
 * TasksPanel (Story 5.1) — superfície mínima do CRUD/lifecycle (AC1/2/3):
 * lista + criar + transicionar. O Board visual por colunas é a Story 5.4;
 * aqui só o necessário para exercitar a entidade.
 */

export interface TasksPanelProps {
  tasks: Task[];
  onCreate: (title: string) => void;
  onTransition: (id: string, to: TaskState) => void;
}

const STATE_LABEL: Record<TaskState, string> = {
  planned: 'planejada',
  in_progress: 'em execução',
  awaiting_decision: 'aguardando decisão',
  reviewed: 'revisada',
  done: 'concluída'
};

/**
 * Espelho leve de packages/core/src/task-lifecycle.ts — a UI não depende de
 * @cockpit/core (fronteira do pacote); duplicação pequena e intencional.
 * Se crescer, o Board (5.4) é o ponto natural para centralizar.
 */
const NEXT_STATES: Record<TaskState, TaskState[]> = {
  planned: ['in_progress'],
  in_progress: ['awaiting_decision'],
  awaiting_decision: ['in_progress', 'reviewed'],
  reviewed: ['done', 'in_progress'],
  done: []
};

export function TasksPanel({ tasks, onCreate, onTransition }: TasksPanelProps): JSX.Element {
  const [title, setTitle] = useState('');

  const submit = (): void => {
    const t = title.trim();
    if (!t) return;
    onCreate(t);
    setTitle('');
  };

  return (
    <section style={{ flex: 1, minWidth: 0, padding: 24, overflowY: 'auto' }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>Tarefas</h2>
      <p style={{ fontSize: 12, color: '#6B7280', margin: '0 0 20px' }}>
        {tasks.length} {tasks.length === 1 ? 'tarefa' : 'tarefas'} — planejada → execução → decisão → revisada →
        concluída
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
          placeholder="Nova tarefa…"
          style={{
            flex: 1,
            background: '#0B0F14',
            color: '#E5E7EB',
            border: '1px solid #1F2937',
            borderRadius: 6,
            padding: '6px 10px',
            fontSize: 13
          }}
        />
        <button onClick={submit} style={buttonStyle}>
          + criar
        </button>
      </div>

      {tasks.length === 0 && (
        <p style={{ fontFamily: 'monospace', fontSize: 13, color: '#6B7280' }}>Nenhuma tarefa ainda.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {tasks.map((t) => (
          <article
            key={t.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 14px',
              background: '#0D131B',
              border: '1px solid #1F2937',
              borderRadius: 8,
              fontSize: 13
            }}
          >
            <strong style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {t.title}
            </strong>
            <span style={{ color: '#9CA3AF', fontSize: 12 }}>{STATE_LABEL[t.state]}</span>
            <span style={{ display: 'flex', gap: 6 }}>
              {NEXT_STATES[t.state].map((next) => (
                <button key={next} onClick={() => onTransition(t.id, next)} style={buttonStyle}>
                  → {STATE_LABEL[next]}
                </button>
              ))}
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}

const buttonStyle: React.CSSProperties = {
  background: '#111827',
  color: '#E5E7EB',
  border: '1px solid #1F2937',
  borderRadius: 6,
  padding: '5px 12px',
  fontSize: 12,
  cursor: 'pointer',
  whiteSpace: 'nowrap'
};
