import { useMemo, useState } from 'react';
import { classifyTaskRoles, type SessionRecord, type Task, type TaskState } from '@cockpit/shared';
import { statusColor, statusLabel } from './status-colors';
import { TASK_STATE_LABEL, TASK_STATE_ORDER, canTransitionTask } from './task-lifecycle-ui';
import { theme } from './theme';

const ROLE_ICON: Record<'writer' | 'reviewer', string> = { writer: '✍', reviewer: '👁' };

/**
 * LifecycleBoard (Story 5.4) — colunas por estado do lifecycle (AC1); mover
 * um card entre colunas (drag-and-drop NATIVO — HTML5 DnD, sem dependência
 * nova) executa a transição validada pelo core (AC2). Tempo real e
 * persistência vêm de graça: `tasks`/`sessions` já são espelhados por push
 * desde as Stories 5.1-5.3 (AC3).
 *
 * Mover aqui é a transição GENÉRICA (mesmo `task.updateState` da 5.1) — não
 * é um ponto de decisão auditado (FR15, Story 5.3); esses continuam no master.
 */

export interface LifecycleBoardProps {
  tasks: Task[];
  sessions: SessionRecord[];
  onCreate: (title: string) => void;
  /** Move a tarefa para o novo estado — só chamado quando a transição é válida (AC2). */
  onMove: (taskId: string, to: TaskState) => void;
  /** Abre o painel de revisão lado a lado (Story 7.3) — só faz sentido em modo three-brain. */
  onOpenReview: (taskId: string) => void;
}

export function LifecycleBoard({
  tasks,
  sessions,
  onCreate,
  onMove,
  onOpenReview
}: LifecycleBoardProps): JSX.Element {
  const [title, setTitle] = useState('');
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskState | null>(null);

  const linkedByTask = useMemo(() => {
    const map = new Map<string, SessionRecord[]>();
    for (const s of sessions) {
      if (!s.taskId) continue;
      map.set(s.taskId, [...(map.get(s.taskId) ?? []), s]);
    }
    return map;
  }, [sessions]);

  const draggingTask = draggingTaskId ? tasks.find((t) => t.id === draggingTaskId) : undefined;

  const submit = (): void => {
    const t = title.trim();
    if (!t) return;
    onCreate(t);
    setTitle('');
  };

  return (
    <section
      style={{ flex: 1, minWidth: 0, padding: 24, overflow: 'auto', display: 'flex', flexDirection: 'column' }}
    >
      <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>Lifecycle Board</h2>
      <p style={{ fontSize: theme.font.size.sm, color: theme.text.muted, margin: '0 0 16px' }}>
        arraste um card entre colunas para mudar o estado — só aceita transições válidas
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
          placeholder="Nova tarefa…"
          style={{
            flex: 1,
            maxWidth: 320,
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

      <div style={{ display: 'flex', gap: 12, flex: 1, overflowX: 'auto', alignItems: 'flex-start' }}>
        {TASK_STATE_ORDER.map((state) => {
          const columnTasks = tasks.filter((t) => t.state === state);
          const isDragOver = dragOverColumn === state;
          const dropValid = draggingTask ? canTransitionTask(draggingTask.state, state) : true;
          return (
            <div
              key={state}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverColumn(state);
              }}
              onDragLeave={() => setDragOverColumn((c) => (c === state ? null : c))}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverColumn(null);
                const taskId = draggingTaskId ?? e.dataTransfer.getData('text/plain');
                if (taskId && dropValid) onMove(taskId, state);
                setDraggingTaskId(null);
              }}
              style={{
                minWidth: 220,
                flex: '1 0 220px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                background: isDragOver
                  ? dropValid
                    ? `${theme.accent.ok}14`
                    : `${theme.accent.danger}14`
                  : theme.surface.panel,
                border: `1px solid ${isDragOver ? (dropValid ? theme.accent.ok : theme.accent.danger) : theme.border.default}`,
                borderRadius: theme.radius.md,
                padding: 10,
                minHeight: 200
              }}
            >
              <h3
                style={{
                  fontSize: theme.font.size.xs,
                  fontWeight: 700,
                  color: theme.text.muted,
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                  margin: '0 0 4px'
                }}
              >
                {TASK_STATE_LABEL[state]} ({columnTasks.length})
              </h3>
              {columnTasks.length === 0 && (
                <p style={{ fontSize: theme.font.size.xs, color: theme.text.faint, margin: 0 }}>vazio</p>
              )}
              {columnTasks.map((t) => {
                const linked = linkedByTask.get(t.id) ?? [];
                return (
                  <article
                    key={t.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', t.id);
                      setDraggingTaskId(t.id);
                    }}
                    onDragEnd={() => {
                      setDraggingTaskId(null);
                      setDragOverColumn(null);
                    }}
                    style={{
                      background: theme.surface.raised,
                      border: `1px solid ${theme.border.default}`,
                      borderRadius: 6,
                      padding: '8px 10px',
                      fontSize: theme.font.size.sm,
                      cursor: 'grab'
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: linked.length > 0 ? 4 : 0 }}>
                      <strong
                        style={{
                          display: 'block',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          flex: 1
                        }}
                      >
                        {t.title}
                      </strong>
                      {classifyTaskRoles(sessions, t.id).isThreeBrain && (
                        <button
                          onClick={() => onOpenReview(t.id)}
                          title="painel de revisão lado a lado (Story 7.3) — Modo three-brain: 1 escritor + 2+ revisores"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: 11,
                            padding: 0
                          }}
                        >
                          🧠
                        </button>
                      )}
                    </span>
                    {linked.length === 0 ? (
                      <span style={{ fontSize: theme.font.size.xs, color: theme.text.faint }}>sem agente vinculado</span>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {linked.map((s) => (
                          <span
                            key={s.id}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: theme.font.size.xs, color: theme.text.muted }}
                          >
                            <span style={{ color: statusColor(s.agentStatus) }}>●</span>
                            {s.taskRole && <span title={s.taskRole === 'writer' ? 'escritor' : 'revisor'}>{ROLE_ICON[s.taskRole]}</span>}
                            {s.name} · {statusLabel(s.agentStatus)}
                          </span>
                        ))}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
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
