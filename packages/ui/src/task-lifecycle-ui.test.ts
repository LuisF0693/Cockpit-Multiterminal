import { describe, expect, it } from 'vitest';
import { TASK_STATE_LABEL, TASK_STATE_ORDER, canTransitionTask } from './task-lifecycle-ui';

/**
 * Espelho leve de packages/core/src/task-lifecycle.ts (Story 5.4) — as
 * asserções aqui reproduzem exatamente o comportamento do core para garantir
 * que a cópia local não diverge (mesmo espírito do teste de status-colors).
 */
describe('task-lifecycle-ui (Story 5.4 — espelho do core)', () => {
  it('permite a sequência canônica planejada → execução → decisão → revisada → concluída', () => {
    expect(canTransitionTask('planned', 'in_progress')).toBe(true);
    expect(canTransitionTask('in_progress', 'awaiting_decision')).toBe(true);
    expect(canTransitionTask('awaiting_decision', 'reviewed')).toBe(true);
    expect(canTransitionTask('reviewed', 'done')).toBe(true);
  });

  it('permite rejeitar (awaiting_decision → in_progress) e retrabalho (reviewed → in_progress)', () => {
    expect(canTransitionTask('awaiting_decision', 'in_progress')).toBe(true);
    expect(canTransitionTask('reviewed', 'in_progress')).toBe(true);
  });

  it('rejeita saltos e retrocessos inválidos', () => {
    expect(canTransitionTask('planned', 'done')).toBe(false);
    expect(canTransitionTask('planned', 'awaiting_decision')).toBe(false);
    expect(canTransitionTask('done', 'planned')).toBe(false);
  });

  it('done é estado terminal — sem transições de saída', () => {
    expect(canTransitionTask('done', 'reviewed')).toBe(false);
    expect(canTransitionTask('done', 'in_progress')).toBe(false);
  });

  it('TASK_STATE_ORDER e TASK_STATE_LABEL cobrem os 5 estados sem duplicar', () => {
    expect(TASK_STATE_ORDER).toHaveLength(5);
    expect(new Set(TASK_STATE_ORDER).size).toBe(5);
    for (const state of TASK_STATE_ORDER) {
      expect(TASK_STATE_LABEL[state]).toBeTruthy();
    }
  });
});
