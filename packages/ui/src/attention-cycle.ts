import type { AgentStatus } from '@cockpit/shared';

/**
 * Ciclo "próxima atenção" no canvas (Story 18.2) — mesmo princípio de
 * decisão-pura/efeito já usado em `canvas-minimap.tsx` (computeMinimapScale):
 * a lógica de seleção/ciclo vive aqui, testável sem DOM; o componente (App)
 * só chama `centerOn`/foco (mesmo mecanismo do `CanvasMinimap`, Story 12.5)
 * com o resultado.
 */

export interface AttentionCandidate {
  id: string;
  agentStatus: AgentStatus;
}

/**
 * Filtra os tiles com `agentStatus` em `waiting-input`/`error` (AC1),
 * preservando a ordem de entrada da lista — a MESMA ordem estável de
 * criação já usada por `matchShortcut`/Ctrl+1..9 (sessions[] é append-only,
 * cockpit-store.ts).
 */
export function attentionTiles<T extends AttentionCandidate>(tiles: readonly T[]): T[] {
  return tiles.filter((t) => t.agentStatus === 'waiting-input' || t.agentStatus === 'error');
}

/**
 * Dado a lista JÁ FILTRADA (attentionTiles) e o índice atual do ciclo,
 * devolve o PRÓXIMO tile em atenção + seu índice (AC3 — cíclico: depois do
 * último volta pro primeiro). Lista vazia → null, sem side effect (AC4).
 * `currentIndex` fora dos limites (ex.: -1 no primeiro disparo, ou um índice
 * de uma lista anterior maior) é tratado com módulo — sempre cai num índice
 * válido.
 */
export function nextAttentionTile<T>(
  tiles: readonly T[],
  currentIndex: number
): { tile: T; index: number } | null {
  if (tiles.length === 0) return null;
  const nextIndex = (((currentIndex + 1) % tiles.length) + tiles.length) % tiles.length;
  const tile = tiles[nextIndex];
  if (tile === undefined) return null; // inalcançável (nextIndex < tiles.length garantido acima)
  return { tile, index: nextIndex };
}
