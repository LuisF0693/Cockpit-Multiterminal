import type { SessionRecord } from '@cockpit/shared';
import type { TerminalLink } from './terminal-link-manager';

export interface TerminalLinkRouting {
  sourceId: string;
  targetIds: string[];
  message: string;
}

/**
 * Texto da instrução automática (Onda 1) — antes era genérico ("avalie o
 * trabalho mais recente do terminal X"), o que obrigava o terminal-chefe a
 * ir garimpar o que tinha acontecido. Agora carrega o DESFECHO alcançado
 * (`done` = terminou; `waiting-input` = parou esperando alguém), porque as
 * duas transições disparam o mesmo vínculo e pedem reações diferentes.
 *
 * A tarefa original NÃO entra aqui: ela mora no TaskManager (I/O do Main) e
 * esta função é pura — o enriquecimento com dado externo é do chamador, via
 * `enrichTerminalLinkMessage`, mesmo padrão do `enrichReviewMessage` no SDC.
 */
function outcomeSentence(session: SessionRecord): string {
  return session.agentStatus === 'done'
    ? `concluiu o trabalho (done)`
    : `parou aguardando input (waiting-input) — pode estar bloqueado ou pedindo decisão`;
}

/**
 * Decide se uma transição de status do terminal de ORIGEM deve disparar
 * instrução automática nos terminais ALVO de vínculos `auto` (Épico 9, FR26).
 * Pura — sem I/O — mesmo princípio de `planSdcReviewRouting` (Épico 7): o
 * chamador (Main) executa os efeitos colaterais (trilha, injeção no PTY do
 * alvo, push ao renderer) SOMENTE quando o retorno não é null.
 */
export function planTerminalLinkRouting(session: SessionRecord, allLinks: TerminalLink[]): TerminalLinkRouting | null {
  if (session.agentStatus !== 'done' && session.agentStatus !== 'waiting-input') return null;

  const targetIds = allLinks.filter((l) => l.sourceId === session.id && l.mode === 'auto').map((l) => l.targetId);
  if (targetIds.length === 0) return null;

  const message =
    `Instrução automática (vínculo terminal-a-terminal): o terminal "${session.name}" ` +
    `(${session.adapterId}) ${outcomeSentence(session)}. Avalie o resultado mais recente dele e ` +
    `aja sobre isso agora — esta instrução já é a sua vez de falar, não espere confirmação humana.`;

  return { sourceId: session.id, targetIds, message };
}

/** Contexto externo (I/O do Main) anexado à instrução — tudo opcional. */
export interface TerminalLinkRoutingContext {
  /** Título da tarefa que a origem estava tocando (TaskManager), quando há uma. */
  originalTask?: string | undefined;
  /** Estado da tarefa no momento do disparo — separa "terminou" de "travou". */
  taskState?: string | undefined;
}

/**
 * Anexa contexto acionável à mensagem pura (Onda 1). Espelha
 * `enrichReviewMessage` (session-ipc, P2 do Épico 7): campo ausente é campo
 * omitido — nunca inventa e nunca bloqueia o routing. Fica no core (e não
 * inline no Main) só porque é concatenação determinística e testável.
 */
export function enrichTerminalLinkMessage(base: string, ctx: TerminalLinkRoutingContext): string {
  const task = ctx.originalTask?.trim();
  if (task === undefined || task === '') return base;
  const state = ctx.taskState?.trim();
  const suffix = state !== undefined && state !== '' ? ` [estado: ${state}]` : '';
  return `${base}\nTarefa original do terminal de origem: "${task}"${suffix}`;
}

/**
 * Gate de roteamento (P3) — mesma condição de disparo do `planTerminalLinkRouting`,
 * mas seleciona vínculos `gate`: o routing é retido pelo Main até o humano
 * aprovar (APPROVE) ou descartar (REJECT). Pura — o gateId é gerado pelo
 * chamador para manter a função livre de efeitos aleatórios.
 */
export interface TerminalLinkGating {
  sourceId: string;
  targetIds: string[];
  message: string;
}

export function planTerminalLinkGating(session: SessionRecord, allLinks: TerminalLink[]): TerminalLinkGating | null {
  if (session.agentStatus !== 'done' && session.agentStatus !== 'waiting-input') return null;

  const targetIds = allLinks.filter((l) => l.sourceId === session.id && l.mode === 'gate').map((l) => l.targetId);
  if (targetIds.length === 0) return null;

  const message =
    `Gate de roteamento: o terminal "${session.name}" (${session.adapterId}) ${outcomeSentence(session)}. ` +
    `Aprove para encaminhar a instrução ao(s) terminal(is) alvo, ou rejeite para descartar.`;

  return { sourceId: session.id, targetIds, message };
}
