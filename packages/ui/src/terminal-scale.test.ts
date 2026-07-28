import { describe, expect, it } from 'vitest';
import { DEFAULT_TILE_HEIGHT, DEFAULT_TILE_WIDTH, terminalContentScale, terminalContentVisible } from './layout';

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

/**
 * LOD do corpo (pedido do fundador, referência AIOX Cockpit): em zoom baixo o
 * terminal deixa de ser desenhado e o corpo vira superfície lisa. O limiar é
 * o MESMO piso da escala — enquanto o texto sai nítido vale desenhar.
 */
const TILE_PADRAO = { width: DEFAULT_TILE_WIDTH, height: DEFAULT_TILE_HEIGHT };

describe('terminalContentVisible (LOD do corpo do tile)', () => {
  it('em 100% o terminal é desenhado', () => {
    expect(terminalContentVisible(TILE_PADRAO, 1)).toBe(true);
  });

  it('no zoom mínimo da faixa (15%) o corpo vira superfície lisa', () => {
    expect(terminalContentVisible(TILE_PADRAO, 0.15)).toBe(false);
  });

  it('no zoom máximo da faixa (160%) o terminal é desenhado', () => {
    expect(terminalContentVisible(TILE_PADRAO, 1.6)).toBe(true);
  });

  it('acompanha o piso da escala em vez de um limiar de zoom fixo', () => {
    for (const zoom of [0.15, 0.3, 0.5, 0.8, 1, 1.6]) {
      expect(terminalContentVisible(TILE_PADRAO, zoom)).toBe(terminalContentScale(TILE_PADRAO, zoom) >= 1);
    }
  });

  it('tile GRANDE continua legível num zoom em que o padrão já não estaria', () => {
    const grande = { width: 1600, height: 1000 };
    const zoom = 0.3;
    expect(terminalContentVisible(TILE_PADRAO, zoom)).toBe(false);
    expect(terminalContentVisible(grande, zoom)).toBe(true);
  });

  it('é monotônico: uma vez desenhado, continua desenhado ao aproximar', () => {
    const zooms = [0.15, 0.2, 0.3, 0.4, 0.5, 0.6, 0.8, 1, 1.2, 1.6];
    const visiveis = zooms.map((z) => terminalContentVisible(TILE_PADRAO, z));
    // nenhuma volta de true para false conforme o zoom aumenta
    expect(visiveis.indexOf(true)).toBeGreaterThan(-1);
    expect(visiveis.slice(visiveis.indexOf(true)).every(Boolean)).toBe(true);
  });
});
