import { describe, expect, it } from 'vitest';
import { assertTransition, canTransition } from './task-lifecycle';

describe('task-lifecycle (Story 5.1, FR13)', () => {
  it('permite a sequência canônica planejada → execução → decisão → revisada → concluída', () => {
    expect(canTransition('planned', 'in_progress')).toBe(true);
    expect(canTransition('in_progress', 'awaiting_decision')).toBe(true);
    expect(canTransition('awaiting_decision', 'reviewed')).toBe(true);
    expect(canTransition('reviewed', 'done')).toBe(true);
  });

  it('permite rejeitar (awaiting_decision → in_progress) e retrabalho (reviewed → in_progress)', () => {
    expect(canTransition('awaiting_decision', 'in_progress')).toBe(true);
    expect(canTransition('reviewed', 'in_progress')).toBe(true);
  });

  it('rejeita saltos e retrocessos inválidos', () => {
    expect(canTransition('planned', 'done')).toBe(false);
    expect(canTransition('planned', 'awaiting_decision')).toBe(false);
    expect(canTransition('done', 'planned')).toBe(false);
    expect(canTransition('done', 'in_progress')).toBe(false);
  });

  it('assertTransition lança com mensagem clara em transição inválida (AC1)', () => {
    expect(() => assertTransition('planned', 'done')).toThrow(/planned.*done/);
    expect(() => assertTransition('in_progress', 'planned')).toThrow();
  });

  it('done não tem transições de saída (estado terminal)', () => {
    expect(canTransition('done', 'reviewed')).toBe(false);
  });
});
