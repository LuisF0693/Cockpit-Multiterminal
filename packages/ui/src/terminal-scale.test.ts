import { describe, expect, it } from 'vitest';
import { terminalContentScale } from './layout';

/**
 * "O terminal nunca escala" (decisão do fundador): o conteúdo deve rasterizar
 * a 1:1 com a tela em qualquer zoom em que ainda caiba o piso de colunas/
 * linhas; só abaixo disso ele vira miniatura.
 */
const TILE = { width: 520, height: 360 };

describe('terminalContentScale', () => {
  it('zoom 100% → escala 1 (nada muda em relação ao comportamento antigo)', () => {
    expect(terminalContentScale(TILE, 1)).toBe(1);
  });

  it('zoom acima de 100% → ainda 1 (texto nítido, mais colunas, sem esticar bitmap)', () => {
    expect(terminalContentScale(TILE, 1.6)).toBe(1);
  });

  it('zoom moderado para fora → ainda 1 (nítido, menos colunas)', () => {
    expect(terminalContentScale(TILE, 0.5)).toBe(1);
  });

  it('zoom extremo → cai abaixo de 1 e vira miniatura em vez de reflowar', () => {
    const scale = terminalContentScale(TILE, 0.15);
    expect(scale).toBeLessThan(1);
    expect(scale).toBeGreaterThan(0);
  });

  it('tile minúsculo também aciona a miniatura, independente do zoom', () => {
    expect(terminalContentScale({ width: 180, height: 140 }, 1)).toBeLessThan(1);
  });

  it('nunca passa de 1 — o conteúdo jamais é AMPLIADO por CSS', () => {
    for (const zoom of [0.15, 0.3, 0.5, 0.8, 1, 1.2, 1.6]) {
      expect(terminalContentScale(TILE, zoom)).toBeLessThanOrEqual(1);
    }
  });
});
