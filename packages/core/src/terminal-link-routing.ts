import type { SessionRecord } from '@cockpit/shared';
import type { TerminalLink } from './terminal-link-manager';

export interface TerminalLinkRouting {
  sourceId: string;
  targetIds: string[];
  message: string;
}

/**
 * Decide se uma transição de status do terminal de ORIGEM deve disparar
 * instrução automática nos terminais ALVO de vínculos `auto` (Épico 9, FR26).
 * Pura — sem I/O — mesmo princípio de `planSdcReviewRouting` (Épico 7): o
 * chamador (Main) executa os efeitos colaterais (trilha, push ao renderer)
 * SOMENTE quando o retorno não é null.
 */
export function planTerminalLinkRouting(session: SessionRecord, allLinks: TerminalLink[]): TerminalLinkRouting | null {
  if (session.agentStatus !== 'done' && session.agentStatus !== 'waiting-input') return null;

  const targetIds = allLinks.filter((l) => l.sourceId === session.id && l.mode === 'auto').map((l) => l.targetId);
  if (targetIds.length === 0) return null;

  const message =
    `Instrução automática (vínculo terminal-a-terminal): avalie o trabalho mais recente do ` +
    `terminal "${session.name}" (${session.adapterId}) e aja sobre o resultado.`;

  return { sourceId: session.id, targetIds, message };
}
