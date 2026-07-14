import type { TaskState } from '@cockpit/shared';

/**
 * Espelho leve de packages/core/src/task-lifecycle.ts (Story 5.1 Dev Notes:
 * "se crescer, o Board é o ponto natural para centralizar" — 5.4 cumpre
 * isso). A UI não depende de @cockpit/core (fronteira de pacotes); esta é a
 * ÚNICA cópia na UI — TasksPanel e LifecycleBoard importam daqui.
 */

export const TASK_STATE_LABEL: Record<TaskState, string> = {
  planned: 'planejada',
  in_progress: 'em execução',
  awaiting_decision: 'aguardando decisão',
  reviewed: 'revisada',
  done: 'concluída'
};

export const TASK_STATE_ORDER: TaskState[] = [
  'planned',
  'in_progress',
  'awaiting_decision',
  'reviewed',
  'done'
];

export const TASK_NEXT_STATES: Record<TaskState, TaskState[]> = {
  planned: ['in_progress'],
  in_progress: ['awaiting_decision'],
  awaiting_decision: ['in_progress', 'reviewed'],
  reviewed: ['done', 'in_progress'],
  done: []
};

export function canTransitionTask(from: TaskState, to: TaskState): boolean {
  return TASK_NEXT_STATES[from].includes(to);
}
