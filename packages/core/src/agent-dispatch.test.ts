import { describe, expect, it } from 'vitest';
import { classifyDispatchTask, findDispatcherSession, planAgentDispatch } from './agent-dispatch';

const ALL_ADAPTERS = ['shell', 'cmd', 'claude-code', 'codex', 'grok', 'gemini-cli', 'antigravity', 'ollama'];

describe('classifyDispatchTask (Story 17.1, AC2)', () => {
  it('classifica desenvolvimento como padrão', () => {
    expect(classifyDispatchTask('implementar o endpoint de sessões')).toBe('development');
  });

  it('classifica revisão/planejamento', () => {
    expect(classifyDispatchTask('revisar o PR da story 16.3')).toBe('review-planning');
    expect(classifyDispatchTask('planejar a arquitetura do épico 18')).toBe('review-planning');
  });

  it('classifica pesquisa', () => {
    expect(classifyDispatchTask('pesquisar benchmarks de PTY no Windows')).toBe('research');
  });

  it('classifica marketing/conteúdo', () => {
    expect(classifyDispatchTask('escrever copy do carrossel de lançamento')).toBe('marketing-content');
  });

  it('marketing vence pesquisa quando ambos aparecem (ordem fixa de classificação)', () => {
    expect(classifyDispatchTask('pesquisar referências para campanha de marketing')).toBe('marketing-content');
  });
});

describe('planAgentDispatch (Story 17.1, AC1/AC2)', () => {
  it('ordena candidatos por categoria, excluindo shell/cmd/ollama', () => {
    const plan = planAgentDispatch({
      agent: '@dev',
      task: 'implementar a feature X',
      availableAdapters: ALL_ADAPTERS
    });
    expect(plan.category).toBe('development');
    expect(plan.candidates).toEqual(['claude-code', 'codex', 'gemini-cli', 'antigravity', 'grok']);
  });

  it('revisão prefere codex; pesquisa prefere gemini-cli', () => {
    const review = planAgentDispatch({ agent: '@qa', task: 'revisar a story', availableAdapters: ALL_ADAPTERS });
    expect(review.candidates[0]).toBe('codex');
    const research = planAgentDispatch({ agent: '@analyst', task: 'pesquisar mercado', availableAdapters: ALL_ADAPTERS });
    expect(research.candidates[0]).toBe('gemini-cli');
  });

  it('fallback: adapter de IA fora da preferência entra no fim, na ordem do daemon', () => {
    const plan = planAgentDispatch({
      agent: '@dev',
      task: 'codar',
      availableAdapters: ['shell', 'ia-nova', 'claude-code']
    });
    expect(plan.candidates).toEqual(['claude-code', 'ia-nova']);
  });

  it('é determinístico: mesmas entradas, mesmo plano', () => {
    const req = { agent: '@dev', task: 'codar a tela', availableAdapters: ALL_ADAPTERS };
    expect(planAgentDispatch(req)).toEqual(planAgentDispatch(req));
  });

  it('override explícito vira candidato único sem consultar a política (AC1)', () => {
    const plan = planAgentDispatch({
      agent: '@dev',
      task: 'revisar código',
      explicitAdapter: 'grok',
      availableAdapters: ALL_ADAPTERS
    });
    expect(plan.category).toBeNull();
    expect(plan.candidates).toEqual(['grok']);
  });

  it('override explícito pode despachar até shell (bypass da lista de bloqueio)', () => {
    const plan = planAgentDispatch({
      agent: '@dev',
      task: 'rodar script',
      explicitAdapter: 'shell',
      availableAdapters: ALL_ADAPTERS
    });
    expect(plan.candidates).toEqual(['shell']);
  });

  it('override para adapter inexistente no daemon retorna zero candidatos', () => {
    const plan = planAgentDispatch({
      agent: '@dev',
      task: 'codar',
      explicitAdapter: 'inexistente',
      availableAdapters: ALL_ADAPTERS
    });
    expect(plan.candidates).toEqual([]);
  });

  it('monta label e instrução inicial em linha única (adapters enviam com \\r)', () => {
    const plan = planAgentDispatch({
      agent: ' @qa ',
      task: 'revisar\n  a story 17.1\ncom atenção',
      availableAdapters: ALL_ADAPTERS
    });
    expect(plan.label).toBe('@qa');
    expect(plan.initialInstruction).toBe('Você é o agente "@qa". Tarefa: revisar a story 17.1 com atenção');
    expect(plan.initialInstruction).not.toMatch(/\n/);
  });

  it('preferences por categoria sobrescrevem a ordem default; categorias ausentes mantêm o default (17.2)', () => {
    const custom = planAgentDispatch({
      agent: '@qa',
      task: 'revisar a arquitetura',
      availableAdapters: ALL_ADAPTERS,
      preferences: { 'review-planning': ['gemini-cli', 'codex'] }
    });
    expect(custom.candidates.slice(0, 2)).toEqual(['gemini-cli', 'codex']);

    const untouched = planAgentDispatch({
      agent: '@dev',
      task: 'implementar tela',
      availableAdapters: ALL_ADAPTERS,
      preferences: { 'review-planning': ['gemini-cli'] }
    });
    expect(untouched.candidates[0]).toBe('claude-code');
  });
});

describe('findDispatcherSession (Story 17.2, AC1)', () => {
  const sessions = [
    { id: 'chefe-orion', pid: 500 },
    { id: 'worker-antigo', pid: 900 }
  ];

  it('devolve a sessão do ancestral MAIS próximo na cadeia de PIDs', () => {
    // cadeia: CLI (1000) ← bash (700) ← claude do chefe (500) ← pwsh raiz (10)
    expect(findDispatcherSession([1000, 700, 500, 10], sessions)).toBe('chefe-orion');
  });

  it('com duas sessões na cadeia, vence a que aparece primeiro (aninhamento)', () => {
    expect(findDispatcherSession([1000, 900, 500], sessions)).toBe('worker-antigo');
  });

  it('cadeia sem nenhuma sessão viva devolve null (despacho de fora do Cockpit)', () => {
    expect(findDispatcherSession([1000, 700, 10], sessions)).toBeNull();
    expect(findDispatcherSession([], sessions)).toBeNull();
  });
});
