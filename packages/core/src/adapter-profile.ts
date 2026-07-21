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

/** Contagem agregada de desfechos históricos por adapter (Story 18.5, FR63). */
export interface AdapterOutcomeCounts {
  adapterId: string;
  done: number;
  error: number;
}

/**
 * Agrega o histórico de despachos (`DispatchManager.list()`, Story 18.4) em
 * contagem `done`/`error` por `adapterId` — função pura, sem I/O (o
 * `DispatchRecord[]` já vem carregado por quem chama).
 *
 * SÓ POR ADAPTER, sem quebrar por categoria — decisão de escopo da 18.5
 * (ver Dev Agent Record da story): `PersistedDispatchRecord` (18.4) não
 * carrega a categoria da tarefa. A categoria é decidida em
 * `planAgentDispatch` (CLI, no momento do despacho — `agent-dispatch.ts`)
 * mas não atravessa o protocolo do daemon até o ponto onde o registro
 * nasce, na adoção externa (`ExternalSessionInfo`/`ExternalAdoptionPlan`,
 * `external-adoption.ts`, também sem esse campo). Plumbar categoria por todo
 * esse caminho reabriria escopo do Épico 17/18.4 — fora do escopo desta
 * story (AC1 foi corrigida para refletir isso).
 *
 * Só `done`/`error` contam como desfecho conclusivo — `closed` (fechamento
 * sem status terminal explícito) e `null` (ainda em andamento) não entram na
 * contagem: nenhum dos dois indica se o adapter "funcionou" ou "falhou".
 */
export function aggregateDispatchOutcomes(
  records: readonly { adapterId: string; outcome: 'done' | 'error' | 'closed' | null }[]
): AdapterOutcomeCounts[] {
  const byAdapter = new Map<string, AdapterOutcomeCounts>();
  for (const r of records) {
    if (r.outcome !== 'done' && r.outcome !== 'error') continue;
    const entry = byAdapter.get(r.adapterId) ?? { adapterId: r.adapterId, done: 0, error: 0 };
    if (r.outcome === 'done') entry.done++;
    else entry.error++;
    byAdapter.set(r.adapterId, entry);
  }
  return [...byAdapter.values()];
}

/**
 * Justificativa por candidato para o `--recommend` (AC5): insumo estruturado
 * da decisão do chefe. Adapter sem perfil ganha razão neutra — nunca falha.
 *
 * `outcomeCounts` (Story 18.5, AC1/AC2/AC3) é OPCIONAL e puramente
 * informativo — anexado ao FINAL da `reason`, nunca reordena os candidatos
 * (a ordem continua vindo só da matriz, Épico 17.2). Sem contagem pro
 * adapter (histórico vazio ou adapter nunca despachado), o sufixo some por
 * completo — `--recommend` nunca quebra por falta de dado (AC3).
 */
export function explainCandidates(
  candidates: readonly string[],
  matrix: AdapterMatrix,
  outcomeCounts?: readonly AdapterOutcomeCounts[]
): CandidateExplanation[] {
  const historySuffix = (adapter: string): string => {
    const counts = outcomeCounts?.find((c) => c.adapterId === adapter);
    if (counts === undefined || (counts.done === 0 && counts.error === 0)) return '';
    return ` — histórico: ${counts.done} concluído(s), ${counts.error} erro(s)`;
  };
  return candidates.map((adapter) => {
    const p = matrix.adapters[adapter];
    if (p === undefined) return { adapter, reason: `sem perfil na matriz — avalie manualmente${historySuffix(adapter)}` };
    const notes = p.notes !== undefined ? ` — ${p.notes}` : '';
    const models = p.models !== undefined && p.models.length > 0 ? `; modelos: ${p.models.join(', ')}` : '';
    return { adapter, reason: `forças: ${p.strengths.join(', ')}; custo ${p.cost}${models}${notes}${historySuffix(adapter)}` };
  });
}
