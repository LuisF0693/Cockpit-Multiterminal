import { classifyTaskRoles, type SessionRecord, type TaskRole, type TaskRoles } from '@cockpit/shared';
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

export interface SdcCorrectionRouting {
  taskId: string;
  writerId: string;
  reviewerIds: string[];
  message: string;
}

/**
 * Decide a mensagem de correção agregada quando uma revisão é rejeitada
 * numa tarefa three-brain (Story 7.4, FR19). Pura — recebe os papéis JÁ
 * classificados e o trecho de transcript de cada revisor (lido pelo
 * chamador via readScrollbackTail, mesmo mecanismo da 7.3); decide e
 * redige, mas não lê arquivos nem escreve trilha/PTY.
 */
export function planSdcCorrectionRouting(
  taskId: string,
  taskTitle: string,
  roles: TaskRoles,
  transcripts: Record<string, string>,
  justification?: string
): SdcCorrectionRouting | null {
  if (!roles.isThreeBrain || !roles.writer) return null;

  const feedback = roles.reviewers
    .map((r) => `— ${r.name} (${r.adapterId}):\n${(transcripts[r.id] ?? '').trim() || '(sem saída recente)'}`)
    .join('\n\n');

  const message =
    `Revisão rejeitada (tarefa "${taskTitle}")` +
    (justification ? ` — motivo: ${justification}` : '') +
    `. Feedback agregado dos revisores:\n\n${feedback}`;

  return {
    taskId,
    writerId: roles.writer.id,
    reviewerIds: roles.reviewers.map((r) => r.id),
    message
  };
}

export interface SdcRedirectPlan {
  /** Ids a desvincular da tarefa antes do novo vínculo. */
  unlinkIds: string[];
  /** Novo vínculo — `role: 'writer'` preserva o modo three-brain (AC3 da 7.4). */
  link: { id: string; role: TaskRole | null };
}

/**
 * Decide o plano de vínculo de um redirect (Story 5.3) numa tarefa que
 * pode estar em modo three-brain (Story 7.4, AC3). Fora do three-brain,
 * comportamento idêntico ao pré-7.4 (desvincula todo mundo, vínculo
 * neutro). Em three-brain, troca SÓ o escritor — revisores preservados.
 */
export function planSdcRedirect(
  rolesBefore: TaskRoles,
  allLinkedIds: string[],
  redirectTo: string
): SdcRedirectPlan {
  if (rolesBefore.isThreeBrain && rolesBefore.writer) {
    return { unlinkIds: [rolesBefore.writer.id], link: { id: redirectTo, role: 'writer' } };
  }
  return {
    unlinkIds: allLinkedIds.filter((id) => id !== redirectTo),
    link: { id: redirectTo, role: null }
  };
}
