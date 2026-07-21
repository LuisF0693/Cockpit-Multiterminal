import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ADAPTER_MATRIX,
  aggregateDispatchOutcomes,
  explainCandidates,
  mergeAdapterMatrix,
  type AdapterMatrix
} from './adapter-profile';
import { planAgentDispatch } from './agent-dispatch';

describe('mergeAdapterMatrix (Story 17.2, AC4)', () => {
  it('override null devolve a base intacta', () => {
    expect(mergeAdapterMatrix(DEFAULT_ADAPTER_MATRIX, null)).toBe(DEFAULT_ADAPTER_MATRIX);
  });

  it('perfil do override substitui o default inteiro; demais adapters permanecem', () => {
    const merged = mergeAdapterMatrix(DEFAULT_ADAPTER_MATRIX, {
      adapters: { codex: { strengths: ['review de arquitetura'], cost: 'baixo' } }
    });
    expect(merged.adapters['codex']).toEqual({ strengths: ['review de arquitetura'], cost: 'baixo' });
    expect(merged.adapters['claude-code']).toEqual(DEFAULT_ADAPTER_MATRIX.adapters['claude-code']);
  });

  it('preferences do override valem por categoria presente', () => {
    const merged = mergeAdapterMatrix(DEFAULT_ADAPTER_MATRIX, {
      preferences: { research: ['claude-code', 'gemini-cli'] }
    });
    expect(merged.preferences?.research).toEqual(['claude-code', 'gemini-cli']);
    expect(merged.preferences?.development).toBeUndefined();
  });

  it('preferences da matriz sobrescrevem a política default do planner', () => {
    const merged = mergeAdapterMatrix(DEFAULT_ADAPTER_MATRIX, {
      preferences: { 'review-planning': ['claude-code', 'codex'] }
    });
    const plan = planAgentDispatch({
      agent: '@qa',
      task: 'revisar a story 17.2',
      availableAdapters: ['claude-code', 'codex', 'gemini-cli'],
      preferences: merged.preferences
    });
    expect(plan.category).toBe('review-planning');
    expect(plan.candidates).toEqual(['claude-code', 'codex', 'gemini-cli']);
  });
});

describe('explainCandidates (Story 17.2, AC5)', () => {
  it('gera justificativa com forças, custo e notas do perfil', () => {
    const [first] = explainCandidates(['codex'], DEFAULT_ADAPTER_MATRIX);
    expect(first?.adapter).toBe('codex');
    expect(first?.reason).toContain('revisão de código');
    expect(first?.reason).toContain('custo médio');
  });

  it('adapter sem perfil ganha razão neutra em vez de falhar', () => {
    const matrix: AdapterMatrix = { adapters: {} };
    expect(explainCandidates(['misterioso'], matrix)).toEqual([
      { adapter: 'misterioso', reason: 'sem perfil na matriz — avalie manualmente' }
    ]);
  });

  it('preserva a ordem dos candidatos', () => {
    const explained = explainCandidates(['grok', 'claude-code'], DEFAULT_ADAPTER_MATRIX);
    expect(explained.map((e) => e.adapter)).toEqual(['grok', 'claude-code']);
  });

  it('modelos do perfil aparecem na justificativa (Story 17.3)', () => {
    const [first] = explainCandidates(['claude-code'], DEFAULT_ADAPTER_MATRIX);
    expect(first?.reason).toContain('modelos: haiku, sonnet, opus');
  });
});

describe('aggregateDispatchOutcomes (Story 18.5, AC1)', () => {
  it('agrega done/error por adapterId', () => {
    const counts = aggregateDispatchOutcomes([
      { adapterId: 'claude-code', outcome: 'done' },
      { adapterId: 'claude-code', outcome: 'done' },
      { adapterId: 'claude-code', outcome: 'error' },
      { adapterId: 'codex', outcome: 'error' }
    ]);
    expect(counts).toEqual(
      expect.arrayContaining([
        { adapterId: 'claude-code', done: 2, error: 1 },
        { adapterId: 'codex', done: 0, error: 1 }
      ])
    );
    expect(counts).toHaveLength(2);
  });

  it('ignora desfechos closed e null — só done/error contam', () => {
    const counts = aggregateDispatchOutcomes([
      { adapterId: 'grok', outcome: 'closed' },
      { adapterId: 'grok', outcome: null },
      { adapterId: 'gemini-cli', outcome: 'done' }
    ]);
    expect(counts).toEqual([{ adapterId: 'gemini-cli', done: 1, error: 0 }]);
  });

  it('histórico vazio devolve array vazio (AC3 — nunca quebra sem dado)', () => {
    expect(aggregateDispatchOutcomes([])).toEqual([]);
  });
});

describe('explainCandidates com contador histórico (Story 18.5, AC1/AC2/AC3)', () => {
  it('anexa o histórico ao FINAL da reason sem alterar a ordem dos candidatos', () => {
    const explained = explainCandidates(['codex', 'claude-code'], DEFAULT_ADAPTER_MATRIX, [
      { adapterId: 'codex', done: 3, error: 1 }
    ]);
    expect(explained.map((e) => e.adapter)).toEqual(['codex', 'claude-code']);
    expect(explained[0]?.reason.endsWith('histórico: 3 concluído(s), 1 erro(s)')).toBe(true);
    expect(explained[1]?.reason).not.toContain('histórico:');
  });

  it('sem outcomeCounts (undefined), reason fica idêntica à assinatura antiga — nunca quebra call sites existentes', () => {
    const withoutParam = explainCandidates(['codex'], DEFAULT_ADAPTER_MATRIX);
    const withEmptyArray = explainCandidates(['codex'], DEFAULT_ADAPTER_MATRIX, []);
    expect(withoutParam).toEqual(withEmptyArray);
  });

  it('adapter com contagem zerada (done=0, error=0) não ganha sufixo', () => {
    const [first] = explainCandidates(['codex'], DEFAULT_ADAPTER_MATRIX, [{ adapterId: 'codex', done: 0, error: 0 }]);
    expect(first?.reason).not.toContain('histórico:');
  });

  it('adapter sem perfil na matriz também ganha o sufixo histórico quando presente', () => {
    const matrix: AdapterMatrix = { adapters: {} };
    const [first] = explainCandidates(['misterioso'], matrix, [{ adapterId: 'misterioso', done: 1, error: 0 }]);
    expect(first?.reason).toBe('sem perfil na matriz — avalie manualmente — histórico: 1 concluído(s), 0 erro(s)');
  });
});
