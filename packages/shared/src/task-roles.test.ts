import { describe, expect, it } from 'vitest';
import { classifyTaskRoles } from './task-roles';
import type { SessionRecord } from './ipc';

/**
 * classifyTaskRoles (Story 7.1, FR16) — única implementação da regra de
 * "modo three-brain", consumida por Main (7.2) e UI (7.3/7.4). Testes cobrem
 * os casos de contorno explicitamente listados na story (0 writer, 2
 * writers, 1 writer+1 reviewer, 1 writer+2 reviewers).
 */

function session(overrides: Partial<SessionRecord>): SessionRecord {
  return {
    id: overrides.id ?? 's1',
    name: overrides.name ?? 'Terminal',
    cwd: 'C:/work',
    status: 'running',
    pid: 1234,
    createdAt: Date.now(),
    adapterId: 'shell',
    agentStatus: 'working',
    lastStatusChangeAt: Date.now(),
    workspace: 'Geral',
    taskId: null,
    taskRole: null,
    ...overrides
  };
}

describe('classifyTaskRoles (Story 7.1, FR16)', () => {
  it('sem nenhum vínculo: writer null, reviewers vazio, não é three-brain', () => {
    const result = classifyTaskRoles([], 'task-1');
    expect(result).toEqual({ writer: null, reviewers: [], isThreeBrain: false });
  });

  it('só um writer (0 reviewers) não é three-brain', () => {
    const sessions = [session({ id: 'a', taskId: 'task-1', taskRole: 'writer' })];
    const result = classifyTaskRoles(sessions, 'task-1');
    expect(result.writer?.id).toBe('a');
    expect(result.reviewers).toHaveLength(0);
    expect(result.isThreeBrain).toBe(false);
  });

  it('1 writer + 1 reviewer (menos de 2) não é three-brain', () => {
    const sessions = [
      session({ id: 'a', taskId: 'task-1', taskRole: 'writer' }),
      session({ id: 'b', taskId: 'task-1', taskRole: 'reviewer' })
    ];
    const result = classifyTaskRoles(sessions, 'task-1');
    expect(result.isThreeBrain).toBe(false);
  });

  it('1 writer + 2 reviewers é three-brain (AC2 da 7.1)', () => {
    const sessions = [
      session({ id: 'a', taskId: 'task-1', taskRole: 'writer' }),
      session({ id: 'b', taskId: 'task-1', taskRole: 'reviewer' }),
      session({ id: 'c', taskId: 'task-1', taskRole: 'reviewer' })
    ];
    const result = classifyTaskRoles(sessions, 'task-1');
    expect(result.writer?.id).toBe('a');
    expect(result.reviewers.map((s) => s.id).sort()).toEqual(['b', 'c']);
    expect(result.isThreeBrain).toBe(true);
  });

  it('2 writers (ambíguo) não é three-brain', () => {
    const sessions = [
      session({ id: 'a', taskId: 'task-1', taskRole: 'writer' }),
      session({ id: 'b', taskId: 'task-1', taskRole: 'writer' }),
      session({ id: 'c', taskId: 'task-1', taskRole: 'reviewer' }),
      session({ id: 'd', taskId: 'task-1', taskRole: 'reviewer' })
    ];
    const result = classifyTaskRoles(sessions, 'task-1');
    expect(result.isThreeBrain).toBe(false);
  });

  it('ignora sessões de OUTRAS tarefas', () => {
    const sessions = [
      session({ id: 'a', taskId: 'task-1', taskRole: 'writer' }),
      session({ id: 'b', taskId: 'task-2', taskRole: 'reviewer' }),
      session({ id: 'c', taskId: 'task-2', taskRole: 'reviewer' })
    ];
    const result = classifyTaskRoles(sessions, 'task-1');
    expect(result.writer?.id).toBe('a');
    expect(result.reviewers).toHaveLength(0);
    expect(result.isThreeBrain).toBe(false);
  });

  it('3+ reviewers ainda conta como three-brain (mínimo, não exato)', () => {
    const sessions = [
      session({ id: 'a', taskId: 'task-1', taskRole: 'writer' }),
      session({ id: 'b', taskId: 'task-1', taskRole: 'reviewer' }),
      session({ id: 'c', taskId: 'task-1', taskRole: 'reviewer' }),
      session({ id: 'd', taskId: 'task-1', taskRole: 'reviewer' })
    ];
    expect(classifyTaskRoles(sessions, 'task-1').isThreeBrain).toBe(true);
  });
});
