/**
 * Despacho genérico de workers por agentes (Story 17.1, Épico 17).
 * Qualquer chefe/agente pede um worker informando agente + tarefa; este
 * planner puro decide a ORDEM determinística de adapters candidatos — o
 * chamador (CLI agent-dispatch) executa o I/O de daemon e tenta na ordem,
 * caindo pro próximo candidato quando o spawn falha (AC2/AC3). Mesmo
 * princípio de `planExternalAdoption` (16.3): decisão sem I/O.
 */

export type DispatchCategory = 'development' | 'review-planning' | 'research' | 'marketing-content';

export interface AgentDispatchRequest {
  /** Identidade do agente (ex.: "@dev", "quinn-qa") — vira o nome do tile. */
  agent: string;
  /** Tarefa em linguagem natural — insumo da classificação e da instrução. */
  task: string;
  /** Override explícito (--adapter): candidato ÚNICO, sem fallback. */
  explicitAdapter?: string | undefined;
  /** Adapters registrados no daemon (list-adapters), na ordem do registro. */
  availableAdapters: readonly string[];
}

export interface AgentDispatchPlan {
  /** null quando houve override explícito (política não consultada). */
  category: DispatchCategory | null;
  /** Ordem de tentativa; vazia quando nenhum adapter serve (o chamador erra). */
  candidates: string[];
  /** Nome da sessão externa — preservado na adoção pelo Cockpit (AC4). */
  label: string;
  /** Instrução entregue pelo adapter quando o CLI fica pronto (FR7). */
  initialInstruction: string;
}

/**
 * Adapters que NUNCA recebem despacho automático: shell/cmd não emitem
 * `waiting-input` (não são IA) e ollama exige argumento de modelo por
 * sessão. Override explícito (--adapter) ignora esta lista de propósito.
 */
const NON_DISPATCHABLE = new Set(['shell', 'cmd', 'ollama']);

/** Ordem de preferência por categoria — determinística por construção. */
const PREFERENCES: Record<DispatchCategory, readonly string[]> = {
  development: ['claude-code', 'codex', 'gemini-cli', 'antigravity', 'grok'],
  'review-planning': ['codex', 'claude-code', 'gemini-cli', 'grok', 'antigravity'],
  research: ['gemini-cli', 'grok', 'claude-code', 'codex', 'antigravity'],
  'marketing-content': ['grok', 'gemini-cli', 'claude-code', 'codex', 'antigravity']
};

/**
 * Classificação por palavras-chave, primeira que casar vence (ordem fixa:
 * marketing/conteúdo → pesquisa → revisão/planejamento → desenvolvimento).
 * Desenvolvimento é o fallback natural: é o grosso do trabalho despachado.
 */
export function classifyDispatchTask(task: string): DispatchCategory {
  if (/(marketing|conte[uú]do|copy|carross?el|post\b|reels?\b|v[ií]deo|campanha|social)/i.test(task)) {
    return 'marketing-content';
  }
  if (/(pesquis|research|benchmark|investig|an[aá]lis|estud|levantamento)/i.test(task)) return 'research';
  if (/(review|revis|planej|plano\b|plan\b|valida|\bqa\b|arquitet|spec\b)/i.test(task)) {
    return 'review-planning';
  }
  return 'development';
}

export function planAgentDispatch(req: AgentDispatchRequest): AgentDispatchPlan {
  const label = req.agent.trim();
  // Adapters escrevem `${initialInstruction}\r` no PTY: newline no meio
  // submeteria a instrução pela metade — normalizar pra linha única.
  const task = req.task.replace(/\s+/g, ' ').trim();
  const initialInstruction = `Você é o agente "${label}". Tarefa: ${task}`;

  if (req.explicitAdapter !== undefined) {
    const wanted = req.explicitAdapter.trim();
    return {
      category: null,
      candidates: req.availableAdapters.includes(wanted) ? [wanted] : [],
      label,
      initialInstruction
    };
  }

  const category = classifyDispatchTask(task);
  const dispatchable = req.availableAdapters.filter((id) => !NON_DISPATCHABLE.has(id));
  const preferred = PREFERENCES[category].filter((id) => dispatchable.includes(id));
  // Fallback (AC2): qualquer IA disponível fora da preferência entra no fim,
  // na ordem em que o daemon as listou — ainda determinístico.
  const rest = dispatchable.filter((id) => !preferred.includes(id));
  return { category, candidates: [...preferred, ...rest], label, initialInstruction };
}
