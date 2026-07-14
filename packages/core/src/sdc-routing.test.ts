import { describe, expect, it } from 'vitest';
import { classifyTaskRoles, type SessionRecord } from '@cockpit/shared';
import { planSdcReviewRouting, planSdcCorrectionRouting, planSdcRedirect } from './sdc-routing';
import type { TaskRecord } from './task-manager';

/**
 * planSdcReviewRouting (Story 7.2, FR17) — decisão pura de quando disparar
 * roteamento automático de revisão. Idempotência (AC4) não é testada aqui:
 * é garantida estruturalmente pelo guard de `markAgentStatus` no
 * SessionRegistry (só emite 'status' em transições reais) — este arquivo
 * testa exclusivamente as condições de disparo (AC1) e o conteúdo (AC2).
 */

function session(overrides: Partial<SessionRecord>): SessionRecord {
  return {
    id: overrides.id ?? 'writer-1',
    name: overrides.name ?? 'Claude',
    cwd: 'C:/work',
    status: 'running',
    pid: 1234,
    createdAt: Date.now(),
    adapterId: 'claude-code',
    agentStatus: 'working',
    lastStatusChangeAt: Date.now(),
    workspace: 'Geral',
    taskId: null,
    taskRole: null,
    projectId: null,
    ...overrides
  };
}

function task(overrides: Partial<TaskRecord>): TaskRecord {
  return {
    id: 'task-1',
    title: 'Implementar X',
    description: '',
    state: 'in_progress',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    projectId: null,
    ...overrides
  };
}

const threeBrainSessions = (writerStatus: SessionRecord['agentStatus']): SessionRecord[] => [
  session({ id: 'w', taskId: 'task-1', taskRole: 'writer', agentStatus: writerStatus, name: 'Claude' }),
  session({ id: 'r1', taskId: 'task-1', taskRole: 'reviewer', name: 'Codex' }),
  session({ id: 'r2', taskId: 'task-1', taskRole: 'reviewer', name: 'Grok' })
];

describe('planSdcReviewRouting (Story 7.2, FR17)', () => {
  it('dispara quando writer→done em modo three-brain com tarefa in_progress (AC1)', () => {
    const sessions = threeBrainSessions('done');
    const result = planSdcReviewRouting(sessions[0]!, task({}), sessions);

    expect(result).not.toBeNull();
    expect(result!.taskId).toBe('task-1');
    expect(result!.writerId).toBe('w');
    expect(result!.reviewerIds.sort()).toEqual(['r1', 'r2']);
  });

  it('dispara quando writer→waiting-input (AC1 cobre os dois status)', () => {
    const sessions = threeBrainSessions('waiting-input');
    const result = planSdcReviewRouting(sessions[0]!, task({}), sessions);
    expect(result).not.toBeNull();
  });

  it('mensagem referencia título e descrição da tarefa e o escritor (AC2)', () => {
    const sessions = threeBrainSessions('done');
    const result = planSdcReviewRouting(
      sessions[0]!,
      task({ title: 'Corrigir bug X', description: 'foco no módulo Y' }),
      sessions
    );
    expect(result!.message).toContain('Corrigir bug X');
    expect(result!.message).toContain('foco no módulo Y');
    expect(result!.message).toContain('Claude');
  });

  it('NÃO dispara se o agente não é writer', () => {
    const sessions = threeBrainSessions('done');
    const reviewer = sessions[1]!; // taskRole 'reviewer', não 'writer'
    expect(planSdcReviewRouting(reviewer, task({}), sessions)).toBeNull();
  });

  it('NÃO dispara se o status não é done/waiting-input', () => {
    const sessions = threeBrainSessions('working');
    expect(planSdcReviewRouting(sessions[0]!, task({}), sessions)).toBeNull();
  });

  it('NÃO dispara se a tarefa não está in_progress', () => {
    const sessions = threeBrainSessions('done');
    expect(planSdcReviewRouting(sessions[0]!, task({ state: 'planned' }), sessions)).toBeNull();
    expect(planSdcReviewRouting(sessions[0]!, task({ state: 'awaiting_decision' }), sessions)).toBeNull();
  });

  it('NÃO dispara se a tarefa é null (lookup órfão/defensivo)', () => {
    const sessions = threeBrainSessions('done');
    expect(planSdcReviewRouting(sessions[0]!, null, sessions)).toBeNull();
  });

  it('NÃO dispara fora do modo three-brain (só 1 reviewer)', () => {
    const sessions = [
      session({ id: 'w', taskId: 'task-1', taskRole: 'writer', agentStatus: 'done' }),
      session({ id: 'r1', taskId: 'task-1', taskRole: 'reviewer' })
    ];
    expect(planSdcReviewRouting(sessions[0]!, task({}), sessions)).toBeNull();
  });

  it('NÃO dispara sem taskId vinculado', () => {
    const s = session({ taskRole: null, taskId: null, agentStatus: 'done' });
    expect(planSdcReviewRouting(s, task({}), [s])).toBeNull();
  });
});

describe('planSdcCorrectionRouting (Story 7.4, FR19)', () => {
  it('agrega o transcript de cada revisor numa única mensagem (AC1)', () => {
    const sessions = threeBrainSessions('waiting-input');
    const roles = classifyTaskRoles(sessions, 'task-1');
    const result = planSdcCorrectionRouting('task-1', 'Corrigir bug X', roles, {
      r1: 'saída do Codex',
      r2: 'saída do Grok'
    });

    expect(result).not.toBeNull();
    expect(result!.taskId).toBe('task-1');
    expect(result!.writerId).toBe('w');
    expect(result!.reviewerIds.sort()).toEqual(['r1', 'r2']);
    expect(result!.message).toContain('Corrigir bug X');
    expect(result!.message).toContain('saída do Codex');
    expect(result!.message).toContain('saída do Grok');
  });

  it('inclui a justificativa quando presente', () => {
    const sessions = threeBrainSessions('waiting-input');
    const roles = classifyTaskRoles(sessions, 'task-1');
    const result = planSdcCorrectionRouting('task-1', 'Corrigir bug X', roles, {}, 'faltou tratar o caso nulo');
    expect(result!.message).toContain('faltou tratar o caso nulo');
  });

  it('usa fallback "(sem saída recente)" quando o revisor não tem transcript', () => {
    const sessions = threeBrainSessions('waiting-input');
    const roles = classifyTaskRoles(sessions, 'task-1');
    const result = planSdcCorrectionRouting('task-1', 'Corrigir bug X', roles, {});
    expect(result!.message).toContain('(sem saída recente)');
  });

  it('retorna null fora do modo three-brain', () => {
    const sessions = [
      session({ id: 'w', taskId: 'task-1', taskRole: 'writer' }),
      session({ id: 'r1', taskId: 'task-1', taskRole: 'reviewer' })
    ];
    const roles = classifyTaskRoles(sessions, 'task-1');
    expect(planSdcCorrectionRouting('task-1', 'Corrigir bug X', roles, {})).toBeNull();
  });

  it('retorna null sem escritor vinculado', () => {
    const sessions = [
      session({ id: 'r1', taskId: 'task-1', taskRole: 'reviewer' }),
      session({ id: 'r2', taskId: 'task-1', taskRole: 'reviewer' })
    ];
    const roles = classifyTaskRoles(sessions, 'task-1');
    expect(planSdcCorrectionRouting('task-1', 'Corrigir bug X', roles, {})).toBeNull();
  });
});

describe('planSdcRedirect (Story 7.4, AC3)', () => {
  it('em modo three-brain, troca só o escritor — revisores preservados', () => {
    const sessions = threeBrainSessions('done');
    const roles = classifyTaskRoles(sessions, 'task-1');
    const allLinkedIds = sessions.map((s) => s.id);
    const plan = planSdcRedirect(roles, allLinkedIds, 'new-writer');

    expect(plan.unlinkIds).toEqual(['w']);
    expect(plan.link).toEqual({ id: 'new-writer', role: 'writer' });
  });

  it('fora do modo three-brain, mantém o comportamento antigo (vínculo neutro)', () => {
    const sessions = [
      session({ id: 'a', taskId: 'task-1', taskRole: null }),
      session({ id: 'b', taskId: 'task-1', taskRole: null })
    ];
    const roles = classifyTaskRoles(sessions, 'task-1');
    const allLinkedIds = sessions.map((s) => s.id);
    const plan = planSdcRedirect(roles, allLinkedIds, 'c');

    expect(plan.unlinkIds.sort()).toEqual(['a', 'b']);
    expect(plan.link).toEqual({ id: 'c', role: null });
  });
});
