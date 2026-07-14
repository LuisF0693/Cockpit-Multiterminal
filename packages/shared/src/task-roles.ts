import type { SessionRecord } from './ipc';

/**
 * classifyTaskRoles (Story 7.1, FR16) — ÚNICA implementação da regra de
 * "modo three-brain", consumida por Main (7.2: quando rotear revisão
 * automática) e UI (7.3: o que exibir no painel de revisão). Vive em
 * @cockpit/shared porque é o único pacote que ambos os lados já importam
 * (core não deve depender de ui nem vice-versa) — lição da 5.4 aplicada
 * desde o início, em vez de duplicar depois.
 */

export interface TaskRoles {
  writer: SessionRecord | null;
  reviewers: SessionRecord[];
  /** Exatamente 1 writer + 2 ou mais reviewers vinculados à tarefa (AC2 da 7.1). */
  isThreeBrain: boolean;
}

export function classifyTaskRoles(sessions: SessionRecord[], taskId: string): TaskRoles {
  const linked = sessions.filter((s) => s.taskId === taskId);
  const writers = linked.filter((s) => s.taskRole === 'writer');
  const reviewers = linked.filter((s) => s.taskRole === 'reviewer');
  return {
    writer: writers[0] ?? null,
    reviewers,
    isThreeBrain: writers.length === 1 && reviewers.length >= 2
  };
}
