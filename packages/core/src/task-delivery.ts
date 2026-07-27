import { isIdleAgentStatus } from '@cockpit/shared';

/**
 * Entrega de tarefa em terminal JÁ ABERTO (Onda 1, item 1 do fundador).
 * Até aqui o conector (`agent-dispatch`) só sabia NASCER worker novo — não
 * havia caminho para dar uma tarefa a um tile vivo e linkado, o que obrigava
 * o fundador a duplicar agentes. Este módulo é a metade PURA desse caminho:
 * decide QUAL tile recebe (`resolveDeliveryTarget`) e SE ele pode receber
 * agora (`planTaskDelivery`). Mesmo princípio de `planAgentDispatch` (17.1) e
 * `planTerminalLinkRouting` (9.2): quem escreve no PTY é o chamador (CLI ou
 * Main) — aqui não há I/O.
 */

/**
 * Referência mínima de tile vivo — subconjunto estrutural de
 * `DaemonSessionInfo` (pty-host) e de `SessionRecord` (shared), pra este
 * módulo servir os DOIS chamadores sem o core depender do pty-host.
 */
export interface DeliveryTargetRef {
  id: string;
  adapterId: string;
  /** `AgentStatus` como string — o core não valida o enum, só compara. */
  status: string;
  /** Nome do tile (`--to-agent` casa por aqui); ausente em sessões antigas. */
  label?: string | undefined;
  cwd?: string | undefined;
}

/** Como o chefe apontou o alvo: por id exato ou pelo nome do agente. */
export interface DeliveryTargetSelector {
  sessionId?: string | undefined;
  agentLabel?: string | undefined;
}

export type DeliveryTargetResolution =
  | { kind: 'resolved'; target: DeliveryTargetRef }
  | { kind: 'not-found'; reason: string }
  /** Mais de um tile casa com o label — o chefe precisa desambiguar por id. */
  | { kind: 'ambiguous'; reason: string; matches: DeliveryTargetRef[] };

const normalize = (value: string): string => value.trim().toLowerCase();

/**
 * Resolve o tile alvo (AC da parte A). `--to-session` vence `--to-agent`
 * quando ambos vêm: id é inequívoco, label é heurística.
 *
 * Casamento de label em DOIS níveis, exato primeiro: o fundador nomeia tiles
 * como "@dev"/"@qa", mas o `label` real pode ter sufixo (a adoção preserva o
 * nome do agente, Story 17.1). Empate no nível vencedor é AMBÍGUO — entregar
 * a tarefa no tile errado é pior do que recusar e pedir o id.
 */
export function resolveDeliveryTarget(
  sessions: readonly DeliveryTargetRef[],
  selector: DeliveryTargetSelector
): DeliveryTargetResolution {
  if (selector.sessionId !== undefined && selector.sessionId.trim() !== '') {
    const wanted = selector.sessionId.trim();
    const target = sessions.find((s) => s.id === wanted);
    if (!target) {
      return { kind: 'not-found', reason: `nenhuma sessão viva com id "${wanted}"` };
    }
    return { kind: 'resolved', target };
  }

  if (selector.agentLabel !== undefined && selector.agentLabel.trim() !== '') {
    const wanted = normalize(selector.agentLabel);
    const labelled = sessions.filter((s) => s.label !== undefined && s.label.trim() !== '');
    const exact = labelled.filter((s) => normalize(s.label!) === wanted);
    const matches = exact.length > 0 ? exact : labelled.filter((s) => normalize(s.label!).includes(wanted));

    const [first] = matches;
    if (first === undefined) {
      return { kind: 'not-found', reason: `nenhum tile aberto com o nome "${selector.agentLabel.trim()}"` };
    }
    if (matches.length > 1) {
      return {
        kind: 'ambiguous',
        reason: `"${selector.agentLabel.trim()}" casa com ${matches.length} tiles — use --to-session <id>`,
        matches
      };
    }
    return { kind: 'resolved', target: first };
  }

  return { kind: 'not-found', reason: 'nenhum alvo informado (--to-session <id> ou --to-agent "<nome>")' };
}

/**
 * `deliver`  — alvo ocioso: escreve agora.
 * `queue`    — alvo ocupado: a tarefa ESPERA (nunca é descartada nem forçada).
 * `refuse`   — alvo que não vai ficar ocioso sozinho: entregar seria mentira.
 */
export type TaskDeliveryDecision = 'deliver' | 'queue' | 'refuse';

export interface TaskDeliveryPlan {
  decision: TaskDeliveryDecision;
  reason: string;
}

/**
 * Decide o destino da instrução conforme o ESTADO do alvo (regra explícita do
 * fundador: não force, não descarte).
 *
 * `error` é RECUSA, não fila: um agente em erro não volta pra `waiting-input`
 * sozinho, então enfileirar ali seria exatamente o sumiço silencioso que esta
 * onda existe pra eliminar — melhor devolver exit code 1 e deixar o chefe
 * decidir (re-despachar, reabrir o tile).
 */
export function planTaskDelivery(
  target: DeliveryTargetRef,
  opts?: { queueIfBusy?: boolean | undefined }
): TaskDeliveryPlan {
  if (target.status === 'error') {
    return { decision: 'refuse', reason: `tile ${target.id} está em erro — não voltaria a ficar ocioso sozinho` };
  }
  if (isIdleAgentStatus(target.status)) {
    return { decision: 'deliver', reason: `tile ${target.id} está ocioso (${target.status})` };
  }
  if (opts?.queueIfBusy === false) {
    return { decision: 'refuse', reason: `tile ${target.id} está ocupado (${target.status}) e a fila foi desligada` };
  }
  return { decision: 'queue', reason: `tile ${target.id} está ocupado (${target.status}) — entrega quando ficar ocioso` };
}

/**
 * Freio de ping-pong das injeções AUTOMÁTICAS (Onda 1, item 2 — proteção que
 * o roteamento de vínculo não precisava antes). Enquanto o `planTerminalLink
 * Routing` só NOTIFICAVA a UI, dois vínculos auto recíprocos (A→B e B→A)
 * geravam no máximo notificações que um humano ignorava. Agora que a
 * instrução é INJETADA no PTY, o mesmo par vira um loop infinito de agentes
 * se instruindo — e queimando tokens — sem ninguém no meio.
 *
 * Contador puro por ALVO, em janela deslizante: estourou o teto, o Main para
 * de INJETAR naquele alvo (o vínculo continua existindo e a UI continua sendo
 * notificada — só a escrita automática é contida). A janela reinicia sozinha,
 * então um pico legítimo não deixa o alvo mudo pra sempre.
 */
export const AUTO_DELIVERY_WINDOW_MS = 60_000;
export const AUTO_DELIVERY_MAX_PER_WINDOW = 8;

export interface AutoDeliveryBudget {
  windowStartedAt: number;
  count: number;
}

export function chargeAutoDeliveryBudget(
  previous: AutoDeliveryBudget | undefined,
  now: number,
  opts?: { windowMs?: number | undefined; maxPerWindow?: number | undefined }
): { allowed: boolean; budget: AutoDeliveryBudget } {
  const windowMs = opts?.windowMs ?? AUTO_DELIVERY_WINDOW_MS;
  const max = opts?.maxPerWindow ?? AUTO_DELIVERY_MAX_PER_WINDOW;

  if (previous === undefined || now - previous.windowStartedAt >= windowMs) {
    return { allowed: true, budget: { windowStartedAt: now, count: 1 } };
  }
  if (previous.count >= max) {
    // Não incrementa depois do teto: o contador não infla enquanto o loop
    // insiste, então a janela expira no prazo normal e o alvo se recupera.
    return { allowed: false, budget: previous };
  }
  return { allowed: true, budget: { windowStartedAt: previous.windowStartedAt, count: previous.count + 1 } };
}
