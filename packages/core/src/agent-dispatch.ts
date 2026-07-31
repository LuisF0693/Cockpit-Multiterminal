/**
 * Despacho genérico de workers por agentes (Story 17.1, Épico 17).
 * Qualquer chefe/agente pede um worker informando agente + tarefa; este
 * planner puro decide a ORDEM determinística de adapters candidatos — o
 * chamador (CLI agent-dispatch) executa o I/O de daemon e tenta na ordem,
 * caindo pro próximo candidato quando o spawn falha (AC2/AC3). Mesmo
 * princípio de `planExternalAdoption` (16.3): decisão sem I/O.
 */

import { isIdleAgentStatus } from '@cockpit/shared';
import { resolveDeliveryTarget, type DeliveryTargetRef } from './task-delivery';

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
  /**
   * Override da ordem de preferência por categoria (Story 17.2) — vem da
   * matriz de capacidades editável; categorias ausentes usam o default.
   */
  preferences?: Partial<Record<DispatchCategory, readonly string[]>> | undefined;
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
export const NON_DISPATCHABLE = new Set(['shell', 'cmd', 'ollama']);

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
  // Override vazio ([]) não é "nenhuma preferência" — é ausência de sinal,
  // então cai no default curado em vez de perder a priorização silenciosamente.
  const rawOrder = req.preferences?.[category];
  const order = rawOrder !== undefined && rawOrder.length > 0 ? rawOrder : PREFERENCES[category];
  const preferred = order.filter((id) => dispatchable.includes(id));
  // Fallback (AC2): qualquer IA disponível fora da preferência entra no fim,
  // na ordem em que o daemon as listou — ainda determinístico.
  const rest = dispatchable.filter((id) => !preferred.includes(id));
  return { category, candidates: [...preferred, ...rest], label, initialInstruction };
}

/** Referência mínima de sessão viva no daemon para o matching de origem. */
export interface LiveSessionRef {
  id: string;
  pid: number;
}

/**
 * Detecta o terminal do CHEFE que despachou (Story 17.2, AC1): dado a cadeia
 * de PIDs do processo da CLI (do próprio processo até a raiz) e as sessões
 * vivas no daemon, devolve o id da PRIMEIRA sessão cujo pid aparece na
 * cadeia — o ancestral mais próximo vence quando houver aninhamento. Pura:
 * quem monta a cadeia (I/O de processos) é a CLI.
 */
export function findDispatcherSession(
  pidChain: readonly number[],
  sessions: readonly LiveSessionRef[]
): string | null {
  const byPid = new Map(sessions.map((s) => [s.pid, s.id]));
  for (const pid of pidChain) {
    const id = byPid.get(pid);
    if (id !== undefined) return id;
  }
  return null;
}

/**
 * Referência mínima de sessão viva pro reuso de worker ocioso (Story 18.1) —
 * campos além de `LiveSessionRef` porque a checagem precisa do adapter e do
 * status, não do pid.
 */
export interface IdleSessionRef {
  id: string;
  adapterId: string;
  status: string;
}

/**
 * Encontra a primeira sessão ociosa (`waiting-input` ou `done`) do MESMO
 * adapter do candidato escolhido (Story 18.1, AC1) — o chamador usa isso só
 * pra AVISAR (AC3), nunca pra bloquear o despacho (AC5). Pura: quem consulta
 * `listSessions` no daemon é a CLI; aqui só decide.
 */
export function findIdleCandidate(adapterId: string, sessions: readonly IdleSessionRef[]): string | null {
  const match = sessions.find((s) => s.adapterId === adapterId && isIdleAgentStatus(s.status));
  return match?.id ?? null;
}

/**
 * CONTINUIDADE DE AGENTE (Épico 20, Story 20.2) — o despacho deixa de abrir um
 * segundo "@dev" quando já existe um vivo.
 *
 * Pedido do fundador: "já temos o agente de dev que fez o trabalho, ele está lá
 * no terminal, porém quando a orquestração pede para usar o dev, ele abre outro
 * dev — ele poderia continuar com o dev que está lá". Até a 18.1 o reuso era só
 * um AVISO no stderr (`findIdleCandidate`, AC5: "nunca bloqueia"); o worker novo
 * nascia de qualquer jeito e o contexto acumulado ficava no tile antigo.
 *
 * Agora o reuso é o PADRÃO e a criação é o caso excepcional. Três guardas
 * decidem quando NÃO reusar — cada um veio de uma decisão do fundador ou de uma
 * invariante que já valia no vínculo:
 *
 * - `--new`: escape explícito de quem quer paralelismo de verdade.
 * - Adapter divergente: `--adapter` explícito é escolha consciente da CLI
 *   (protocolo do Épico 17 — "quem escolhe modelo escolhe a CLI"); reusar um
 *   tile de outra CLI trairia essa escolha. SEM `--adapter`, o adapter do tile
 *   vivo é irrelevante: a identidade do agente é que importa.
 * - Projeto diferente: mesma invariante do vínculo automático (17.2 — chefe e
 *   worker no mesmo projeto). Um "@dev" aberto em outro repositório não é o
 *   mesmo colaborador; entregar ali executaria a tarefa no lugar errado.
 *
 * Tile em `error` também não é reusado: `planTaskDelivery` recusaria a entrega
 * (ele não volta a ficar ocioso sozinho), então cair na criação é o único
 * desfecho que ainda entrega a tarefa a alguém.
 *
 * Pura: quem consulta `listSessions` e quem escreve no PTY é a CLI.
 */
export type AgentReusePlan =
  /** Tile do MESMO agente encontrado — `busy` diz se a entrega vai enfileirar. */
  | { kind: 'reuse'; target: DeliveryTargetRef; busy: boolean }
  /** Mais de um tile com esse nome — o chefe desambigua com `--to-session`. */
  | { kind: 'ambiguous'; matches: DeliveryTargetRef[]; reason: string }
  /** Nada a reusar: despacha worker novo (comportamento pré-20.2). */
  | { kind: 'create'; reason: string };

/**
 * Compara diretórios como IDENTIDADE de projeto, não como string: Windows é
 * case-insensitive e mistura `\` com `/` no mesmo caminho (o cwd do daemon vem
 * do spawn, o do chefe vem do registry). Sem esta normalização o escopo de
 * projeto reprovaria tiles legítimos e o reuso nunca aconteceria na prática.
 */
function sameDir(a: string | undefined, b: string): boolean {
  if (a === undefined || a.trim() === '') return false;
  const norm = (p: string): string => p.trim().replace(/[\\/]+/g, '/').replace(/\/+$/, '').toLowerCase();
  return norm(a) === norm(b);
}

export function planAgentReuse(opts: {
  /** Identidade pedida no despacho (`--agent`) — casa contra o label do tile. */
  agent: string;
  /** Sessões vivas do daemon (o MESMO `listSessions` do vínculo/cwd). */
  sessions: readonly DeliveryTargetRef[];
  /** cwd já resolvido do despacho (`resolveDispatchCwd`) — escopo de projeto. */
  cwd: string;
  /** `--adapter`: divergência força worker novo (decisão do fundador). */
  explicitAdapter?: string | undefined;
  /** `--new`: pula o reuso inteiro. */
  forceNew?: boolean | undefined;
}): AgentReusePlan {
  if (opts.forceNew === true) return { kind: 'create', reason: '--new: worker novo pedido explicitamente' };

  const eligible = opts.sessions.filter((s) => {
    if (s.status === 'error') return false;
    if (!sameDir(s.cwd, opts.cwd)) return false;
    if (opts.explicitAdapter !== undefined && s.adapterId !== opts.explicitAdapter.trim()) return false;
    return true;
  });

  // Heurística de nome vem de `resolveDeliveryTarget` (Onda 1) de propósito:
  // `--to-agent` e o reuso automático DEVEM casar o mesmo tile, senão o chefe
  // que confere com `--list-sessions` vê um alvo e o despacho escolhe outro.
  const resolution = resolveDeliveryTarget(eligible, { agentLabel: opts.agent });
  if (resolution.kind === 'ambiguous') {
    return { kind: 'ambiguous', matches: resolution.matches, reason: resolution.reason };
  }
  if (resolution.kind === 'not-found') {
    return { kind: 'create', reason: `nenhum tile vivo chamado "${opts.agent.trim()}" neste projeto` };
  }
  return { kind: 'reuse', target: resolution.target, busy: !isIdleAgentStatus(resolution.target.status) };
}

/**
 * cwd do worker despachado (Onda 1, item 2 do fundador: "quando abre outro
 * terminal, abrir já no cwd do projeto ativo, não lá em cima").
 *
 * Precedência: `--cwd` explícito > cwd da sessão do CHEFE que despachou >
 * `process.cwd()`. O cwd do chefe É o do projeto ativo quando o despacho
 * parte de um tile do Cockpit — a Story 8.3 já faz `session.create` nascer no
 * `rootPath` do projeto. O `process.cwd()` da CLI é último recurso porque é o
 * diretório do processo Node efêmero (tipicamente a raiz de onde o Electron
 * foi lançado), quase nunca o projeto em que o fundador está trabalhando.
 * Pura: quem consulta `listSessions` no daemon é a CLI.
 */
export function resolveDispatchCwd(opts: {
  explicitCwd?: string | undefined;
  /** Sessão do chefe (`dispatchedBy`) já resolvida no `listSessions`. */
  dispatcherSession?: { cwd?: string | undefined } | undefined;
  fallbackCwd: string;
}): string {
  const explicit = opts.explicitCwd?.trim();
  if (explicit !== undefined && explicit !== '') return explicit;
  const chief = opts.dispatcherSession?.cwd?.trim();
  if (chief !== undefined && chief !== '') return chief;
  return opts.fallbackCwd;
}
