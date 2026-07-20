import type { DispatchCategory } from './agent-dispatch';

/**
 * Matriz de capacidades dos adapters de IA (Story 17.2, AC4/AC5) — o
 * conhecimento que embasa a escolha de modelo pelo chefe (AC7 da 17.1).
 * Os defaults vivem aqui (testados); um `adapters-profile.json` na raiz do
 * repo pode sobrescrever perfis e a ordem de preferência por categoria —
 * editável pelo fundador sem story nova ("codex melhorou em review" é um
 * ajuste de arquivo, não de código). O merge é puro; quem lê o arquivo é a
 * CLI (I/O fora do core, mesmo princípio de `planAgentDispatch`).
 */

export interface AdapterProfile {
  /** Forças da CLI (ex.: "refatoração longa", "contexto grande"). */
  strengths: string[];
  /** Custo relativo percebido (ex.: "alto", "médio", "baixo"). */
  cost: string;
  /** Observações livres — atualizáveis conforme a experiência real. */
  notes?: string;
  /**
   * Modelos sugeridos pro `--model` da CLI (Story 17.3) — do mais barato ao
   * mais forte, na grafia que a CLI aceita (ex.: claude: "haiku"/"sonnet").
   */
  models?: string[];
}

export interface AdapterMatrix {
  adapters: Record<string, AdapterProfile>;
  /** Sobrescreve a ordem de preferência por categoria (senão, default do planner). */
  preferences?: Partial<Record<DispatchCategory, string[]>>;
}

export const DEFAULT_ADAPTER_MATRIX: AdapterMatrix = {
  adapters: {
    'claude-code': {
      strengths: ['implementação multi-arquivo', 'agentic coding longo', 'aderência a convenções do repo'],
      cost: 'alto',
      notes: 'melhor executor geral de desenvolvimento; usa MCP e skills do repo',
      models: ['haiku', 'sonnet', 'opus']
    },
    codex: {
      strengths: ['revisão de código', 'planejamento', 'crítica técnica objetiva'],
      cost: 'médio',
      notes: 'bom contraponto pra QA/review — evita revisar com o mesmo modelo que escreveu'
    },
    'gemini-cli': {
      strengths: ['pesquisa', 'contexto muito grande', 'síntese de documentação'],
      cost: 'baixo',
      notes: 'janela de contexto enorme; bom pra varrer bases/documentos extensos'
    },
    grok: {
      strengths: ['marketing', 'conteúdo', 'tom informal e velocidade'],
      cost: 'baixo'
    },
    antigravity: {
      strengths: ['tarefas de IDE agentic', 'prototipagem'],
      cost: 'médio'
    }
  }
};

/**
 * Merge do override editável sobre os defaults: perfil por adapter é
 * substituído inteiro (não campo a campo — o arquivo é a verdade do
 * fundador); preferências valem por categoria presente.
 */
export function mergeAdapterMatrix(base: AdapterMatrix, override: Partial<AdapterMatrix> | null): AdapterMatrix {
  if (override === null) return base;
  return {
    adapters: { ...base.adapters, ...(override.adapters ?? {}) },
    ...(override.preferences !== undefined || base.preferences !== undefined
      ? { preferences: { ...(base.preferences ?? {}), ...(override.preferences ?? {}) } }
      : {})
  };
}

export interface CandidateExplanation {
  adapter: string;
  reason: string;
}

/**
 * Justificativa por candidato para o `--recommend` (AC5): insumo estruturado
 * da decisão do chefe. Adapter sem perfil ganha razão neutra — nunca falha.
 */
export function explainCandidates(candidates: readonly string[], matrix: AdapterMatrix): CandidateExplanation[] {
  return candidates.map((adapter) => {
    const p = matrix.adapters[adapter];
    if (p === undefined) return { adapter, reason: 'sem perfil na matriz — avalie manualmente' };
    const notes = p.notes !== undefined ? ` — ${p.notes}` : '';
    const models = p.models !== undefined && p.models.length > 0 ? `; modelos: ${p.models.join(', ')}` : '';
    return { adapter, reason: `forças: ${p.strengths.join(', ')}; custo ${p.cost}${models}${notes}` };
  });
}
