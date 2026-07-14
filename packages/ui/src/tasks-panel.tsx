import { useMemo, useState } from 'react';
import type { SessionRecord, Task, TaskState } from '@cockpit/shared';

/**
 * TasksPanel (Story 5.1) — superfície mínima do CRUD/lifecycle (AC1/2/3):
 * lista + criar + transicionar. O Board visual por colunas é a Story 5.4;
 * aqui só o necessário para exercitar a entidade.
 *
 * Story 5.2: cada card mostra os terminais vinculados (derivado de
 * sessions — sem round-trip extra) e um campo de instrução que direciona a
 * TODOS eles de uma vez (AC2/AC3). Vincular/desvincular em si acontece no
 * master (dropdown por linha) — aqui só se reflete e se desvincula.
 */

export interface TasksPanelProps {
  tasks: Task[];
  sessions: SessionRecord[];
  onCreate: (title: string) => void;
  onTransition: (id: string, to: TaskState) => void;
  /** Desvincula um terminal específico (Story 5.2, AC1). */
  onUnlink: (terminalId: string) => void;
  /** Envia a mesma instrução a todos os terminais vinculados (Story 5.2, AC3). */
  onInstruct: (taskId: string, text: string) => void;
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

export function TasksPanel({
  tasks,
  sessions,
  onCreate,
  onTransition,
  onUnlink,
  onInstruct
}: TasksPanelProps): JSX.Element {
  const [title, setTitle] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const linkedByTask = useMemo(() => {
    const map = new Map<string, SessionRecord[]>();
    for (const s of sessions) {
      if (!s.taskId) continue;
      map.set(s.taskId, [...(map.get(s.taskId) ?? []), s]);
    }
    return map;
  }, [sessions]);

  const submit = (): void => {
    const t = title.trim();
    if (!t) return;
    onCreate(t);
    setTitle('');
  };

  const submitInstruction = (taskId: string): void => {
    const text = (drafts[taskId] ?? '').trim();
    if (!text) return;
    onInstruct(taskId, text);
    setDrafts((d) => ({ ...d, [taskId]: '' }));
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
        {tasks.map((t) => {
          const linked = linkedByTask.get(t.id) ?? [];
          return (
            <article
              key={t.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                padding: '10px 14px',
                background: '#0D131B',
                border: '1px solid #1F2937',
                borderRadius: 8,
                fontSize: 13
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
              </div>

              {/* Vínculo com terminais/agentes (Story 5.2, AC1/AC2) */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                {linked.length === 0 ? (
                  <span style={{ fontSize: 11, color: '#4B5563' }}>
                    sem terminal vinculado — vincule pelo dropdown no master
                  </span>
                ) : (
                  linked.map((s) => (
                    <span
                      key={s.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        background: '#111827',
                        border: '1px solid #1F2937',
                        borderRadius: 12,
                        padding: '2px 4px 2px 10px',
                        fontSize: 11
                      }}
                    >
                      {s.name}
                      <button
                        onClick={() => onUnlink(s.id)}
                        title="desvincular"
                        style={{
                          background: 'transparent',
                          color: '#9CA3AF',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: 12,
                          padding: '0 4px'
                        }}
                      >
                        ×
                      </button>
                    </span>
                  ))
                )}
              </div>

              {/* Instrução a todos os vinculados (Story 5.2, AC3) */}
              {linked.length > 0 && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    value={drafts[t.id] ?? ''}
                    onChange={(e) => setDrafts((d) => ({ ...d, [t.id]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') submitInstruction(t.id);
                    }}
                    placeholder={`instrução p/ ${linked.length} agente(s) vinculado(s)…`}
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
                  <button onClick={() => submitInstruction(t.id)} style={buttonStyle}>
                    enviar
                  </button>
                </div>
              )}
            </article>
          );
        })}
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
