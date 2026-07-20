import { describe, expect, it } from 'vitest';
import { attentionTiles, nextAttentionTile, type AttentionCandidate } from './attention-cycle';

function tile(id: string, agentStatus: AttentionCandidate['agentStatus']): AttentionCandidate {
  return { id, agentStatus };
}

describe('attentionTiles (Story 18.2, AC1)', () => {
  it('filtra apenas waiting-input/error, preservando a ordem de entrada', () => {
    const all = [
      tile('a', 'idle'),
      tile('b', 'waiting-input'),
      tile('c', 'working'),
      tile('d', 'error'),
      tile('e', 'done')
    ];
    expect(attentionTiles(all)).toEqual([tile('b', 'waiting-input'), tile('d', 'error')]);
  });

  it('lista vazia quando nenhum tile está em atenção', () => {
    expect(attentionTiles([tile('a', 'idle'), tile('b', 'working')])).toEqual([]);
  });
});

describe('nextAttentionTile (Story 18.2, AC2/AC3/AC4)', () => {
  const tiles = [tile('a', 'waiting-input'), tile('b', 'error'), tile('c', 'waiting-input')];

  it('lista vazia → null, sem side effect (AC4)', () => {
    expect(nextAttentionTile([], -1)).toBeNull();
  });

  it('primeiro disparo (índice -1) → primeiro da lista', () => {
    expect(nextAttentionTile(tiles, -1)).toEqual({ tile: tile('a', 'waiting-input'), index: 0 });
  });

  it('disparos sucessivos avançam sequencialmente', () => {
    expect(nextAttentionTile(tiles, 0)).toEqual({ tile: tile('b', 'error'), index: 1 });
    expect(nextAttentionTile(tiles, 1)).toEqual({ tile: tile('c', 'waiting-input'), index: 2 });
  });

  it('depois do último volta pro primeiro — ciclo (AC3)', () => {
    expect(nextAttentionTile(tiles, 2)).toEqual({ tile: tile('a', 'waiting-input'), index: 0 });
  });

  it('índice fora dos limites (lista encolheu) cai num índice válido', () => {
    const shorter = [tile('a', 'waiting-input')];
    expect(nextAttentionTile(shorter, 5)).toEqual({ tile: tile('a', 'waiting-input'), index: 0 });
  });

  it('lista com um único tile sempre devolve ele mesmo', () => {
    const single = [tile('a', 'error')];
    expect(nextAttentionTile(single, 0)).toEqual({ tile: tile('a', 'error'), index: 0 });
  });
});
