import { describe, expect, it } from 'vitest';
import { computeMinimapScale } from './canvas-minimap';

describe('computeMinimapScale (Story 12.5)', () => {
  it('escala pra caber conteúdo pequeno inteiro na caixa fixa', () => {
    const tiles = [{ x: 0, y: 0, width: 100, height: 100 }];
    const viewport = { x: 0, y: 0, width: 800, height: 600 };
    const scale = computeMinimapScale(tiles, viewport);
    expect(scale).toBeGreaterThan(0);
    expect(scale).toBeLessThan(1);
  });

  it('conteúdo maior gera escala menor (mais zoom out)', () => {
    const viewport = { x: 0, y: 0, width: 800, height: 600 };
    const small = computeMinimapScale([{ x: 0, y: 0, width: 200, height: 200 }], viewport);
    const large = computeMinimapScale([{ x: 0, y: 0, width: 4000, height: 3000 }], viewport);
    expect(large).toBeLessThan(small);
  });

  it('sem tiles, usa só o viewport pra calcular a escala', () => {
    const viewport = { x: 0, y: 0, width: 900, height: 600 };
    const scale = computeMinimapScale([], viewport);
    expect(scale).toBeGreaterThan(0);
  });

  it('mantém proporção (mesma escala pros dois eixos)', () => {
    const tiles = [{ x: 0, y: 0, width: 500, height: 500 }];
    const viewport = { x: 0, y: 0, width: 500, height: 500 };
    const scale = computeMinimapScale(tiles, viewport);
    // Caixa 180x120 não é quadrada — a escala usada é a mínima dos dois eixos.
    expect(scale).toBeCloseTo(120 / (500 + 20), 5);
  });
});
