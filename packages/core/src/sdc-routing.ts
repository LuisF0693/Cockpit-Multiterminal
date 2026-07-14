import { classifyTaskRoles, type SessionRecord } from '@cockpit/shared';
import type { TaskRecord } from './task-manager';

export interface SdcReviewRouting {
  taskId: string;
  writerId: string;
  reviewerIds: string[];
  message: string;
}

/**
 * Decide se uma transição de status do agente escritor deve disparar
 * roteamento automático de revisão (Story 7.2, FR17). Pura — sem I/O, sem
 * Electron — testável isoladamente. O chamador (Main, session-ipc.ts)
 * executa os efeitos colaterais (transição de estado, trilha, push ao
 * renderer) SOMENTE quando o retorno não é null.
 */
export function planSdcReviewRouting(
  writer: SessionRecord,
  task: TaskRecord | null,
  allSessions: SessionRecord[]
): SdcReviewRouting | null {
  if (writer.taskRole !== 'writer' || !writer.taskId) return null;
  if (writer.agentStatus !== 'done' && writer.agentStatus !== 'waiting-input') return null;
  if (!task || task.state !== 'in_progress') return null;

  const roles = classifyTaskRoles(allSessions, writer.taskId);
  if (!roles.isThreeBrain) return null;

  const message =
    `Revisão solicitada (three-brain, tarefa "${task.title}"): avalie o trabalho mais ` +
    `recente do agente escritor "${writer.name}" (${writer.adapterId}) nesta tarefa.` +
    (task.description ? ` ${task.description}` : '');

  return {
    taskId: writer.taskId,
    writerId: writer.id,
    reviewerIds: roles.reviewers.map((r) => r.id),
    message
  };
}
