import { useMemo, useState } from 'react';
import { classifyTaskRoles, type SessionRecord, type Task, type TaskState } from '@cockpit/shared';
import { TASK_NEXT_STATES, TASK_STATE_LABEL } from './task-lifecycle-ui';
import { theme } from './theme';

const ROLE_ICON: Record<'writer' | 'reviewer', string> = { writer: '✍', reviewer: '👁' };

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
  /** Abre o painel de revisão lado a lado (Story 7.3) — só faz sentido em modo three-brain. */
  onOpenReview: (taskId: string) => void;
}

export function TasksPanel({
  tasks,
  sessions,
  onCreate,
  onTransition,
  onUnlink,
  onInstruct,
  onOpenReview
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
      <p style={{ fontSize: theme.font.size.sm, color: theme.text.muted, margin: '0 0 20px' }}>
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
            background: theme.surface.raised,
            color: theme.text.primary,
            border: `1px solid ${theme.border.default}`,
            borderRadius: 6,
            padding: '6px 10px',
            fontSize: theme.font.size.md
          }}
        />
        <button onClick={submit} style={buttonStyle}>
          + criar
        </button>
      </div>

      {tasks.length === 0 && (
        <p style={{ fontFamily: theme.font.mono, fontSize: theme.font.size.md, color: theme.text.muted }}>Nenhuma tarefa ainda.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {tasks.map((t) => {
          const linked = linkedByTask.get(t.id) ?? [];
          const isThreeBrain = classifyTaskRoles(sessions, t.id).isThreeBrain;
          return (
            <article
              key={t.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                padding: '10px 14px',
                background: theme.surface.panel,
                border: `1px solid ${theme.border.default}`,
                borderRadius: theme.radius.md,
                fontSize: theme.font.size.md
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <strong style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.title}
                </strong>
                {isThreeBrain && (
                  <>
                    <span title="Modo three-brain (Story 7.1): 1 escritor + 2+ revisores" style={{ fontSize: 12 }}>
                      🧠
                    </span>
                    <button
                      onClick={() => onOpenReview(t.id)}
                      style={buttonStyle}
                      title="painel de revisão lado a lado (Story 7.3)"
                    >
                      revisão
                    </button>
                  </>
                )}
                <span style={{ color: theme.text.muted, fontSize: theme.font.size.sm }}>{TASK_STATE_LABEL[t.state]}</span>
                <span style={{ display: 'flex', gap: 6 }}>
                  {TASK_NEXT_STATES[t.state].map((next) => (
                    <button key={next} onClick={() => onTransition(t.id, next)} style={buttonStyle}>
                      → {TASK_STATE_LABEL[next]}
                    </button>
                  ))}
                </span>
              </div>

              {/* Vínculo com terminais/agentes (Story 5.2, AC1/AC2) */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                {linked.length === 0 ? (
                  <span style={{ fontSize: theme.font.size.xs, color: theme.text.faint }}>
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
                        background: theme.surface.raised,
                        border: `1px solid ${theme.border.default}`,
                        borderRadius: theme.radius.pill,
                        padding: '2px 4px 2px 10px',
                        fontSize: theme.font.size.xs
                      }}
                    >
                      {s.taskRole && <span title={s.taskRole === 'writer' ? 'escritor' : 'revisor'}>{ROLE_ICON[s.taskRole]}</span>}
                      {s.name}
                      <button
                        onClick={() => onUnlink(s.id)}
                        title="desvincular"
                        style={{
                          background: 'transparent',
                          color: theme.text.muted,
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: theme.font.size.sm,
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
                      background: theme.surface.raised,
                      color: theme.text.primary,
                      border: `1px solid ${theme.border.default}`,
                      borderRadius: 6,
                      padding: '5px 10px',
                      fontSize: theme.font.size.sm
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
  background: theme.surface.raised,
  color: theme.text.primary,
  border: `1px solid ${theme.border.default}`,
  borderRadius: 6,
  padding: '5px 12px',
  fontSize: theme.font.size.sm,
  cursor: 'pointer',
  whiteSpace: 'nowrap'
};
