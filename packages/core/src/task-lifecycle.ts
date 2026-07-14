import type { TaskState } from './state-store/types';

/**
 * Transições válidas do lifecycle de tarefa (FR13 — Story 5.1). Puro e sem
 * dependências: testável isoladamente, reusado pela UI (5.4) para desabilitar
 * movimentos inválidos no board sem duplicar a regra.
 */
const VALID_TRANSITIONS: Record<TaskState, TaskState[]> = {
  planned: ['in_progress'],
  in_progress: ['awaiting_decision'],
  // awaiting_decision → in_progress (rejeitar, volta com feedback — 5.3) ou
  // → reviewed (aprovar).
  awaiting_decision: ['in_progress', 'reviewed'],
  // reviewed → done (concluir) ou → in_progress (retrabalho).
  reviewed: ['done', 'in_progress'],
  done: []
};

export function canTransition(from: TaskState, to: TaskState): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

/** Lança com mensagem clara em transição inválida (AC1 da 5.1). */
export function assertTransition(from: TaskState, to: TaskState): void {
  if (!canTransition(from, to)) {
    throw new Error(`transição de tarefa inválida: ${from} → ${to}`);
  }
}
