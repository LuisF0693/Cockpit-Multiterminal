import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ADAPTER_MATRIX,
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
});
