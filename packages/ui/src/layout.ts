/**
 * Modelo de layout do canvas — PURO e serializável (layoutVersion: 1).
 * A Story 1.4 persistirá este objeto no state store; aqui vive em memória.
 * Sem classes/funções no estado: JSON-friendly por construção.
 */

export interface TileLayout {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
}

export interface CanvasLayout {
  layoutVersion: 1;
  tiles: TileLayout[];
}

export const MIN_TILE_WIDTH = 320;
export const MIN_TILE_HEIGHT = 200;
export const GRID_SNAP = 8;
export const DEFAULT_TILE_WIDTH = 640;
export const DEFAULT_TILE_HEIGHT = 400;
/** Deslocamento em cascata para novos tiles não nascerem empilhados. */
const CASCADE_OFFSET = 32;

/**
 * Piso da caixa lógica do terminal (≈28 colunas × 7 linhas na fonte padrão) e
 * cromo do tile (bordas + header 30px + rodapé 24px + padding 4+4).
 * Usados por `terminalContentScale` — geometria de tile, mora aqui junto com
 * o resto do modelo puro, longe do xterm (que exige DOM).
 */
const MIN_CONTENT_WIDTH_PX = 240;
const MIN_CONTENT_HEIGHT_PX = 120;
const TILE_CHROME_WIDTH = 10;
const TILE_CHROME_HEIGHT = 64;

/**
 * "O TERMINAL NUNCA ESCALA" (decisão do fundador) — escala em que o CONTEÚDO
 * do terminal é rasterizado, dado o tamanho do tile e o zoom do canvas.
 *
 * `1` significa um pixel CSS do xterm por pixel de tela: texto nítido, e a
 * variação de zoom vira variação de COLUNAS/LINHAS em vez de tamanho de
 * fonte. `< 1` só acontece quando o tile já ficou pequeno demais na tela para
 * caber o piso — aí o conteúdo vira miniatura escalada por CSS em vez de
 * reflowar para ~8 colunas e destruir o layout de uma TUI rodando.
 *
 * NUNCA passa de 1: ampliar o bitmap do texto é exatamente o defeito que
 * estamos consertando.
 */
export function terminalContentScale(layout: Pick<TileLayout, 'width' | 'height'>, zoom: number): number {
  const screenWidth = Math.max(1, layout.width - TILE_CHROME_WIDTH) * zoom;
  const screenHeight = Math.max(1, layout.height - TILE_CHROME_HEIGHT) * zoom;
  return Math.min(1, screenWidth / MIN_CONTENT_WIDTH_PX, screenHeight / MIN_CONTENT_HEIGHT_PX);
}

export function createLayout(): CanvasLayout {
  return { layoutVersion: 1, tiles: [] };
}

export function snapToGrid(value: number, snap: boolean): number {
  return snap ? Math.round(value / GRID_SNAP) * GRID_SNAP : value;
}

export function addTile(layout: CanvasLayout, id: string): CanvasLayout {
  const n = layout.tiles.length;
  const offset = (n % 8) * CASCADE_OFFSET;
  const tile: TileLayout = {
    id,
    x: 16 + offset,
    y: 16 + offset,
    width: DEFAULT_TILE_WIDTH,
    height: DEFAULT_TILE_HEIGHT,
    zIndex: maxZ(layout) + 1
  };
  return { ...layout, tiles: [...layout.tiles, tile] };
}

export function removeTile(layout: CanvasLayout, id: string): CanvasLayout {
  return { ...layout, tiles: layout.tiles.filter((t) => t.id !== id) };
}

export function moveTile(
  layout: CanvasLayout,
  id: string,
  x: number,
  y: number,
  opts: { snap?: boolean } = {}
): CanvasLayout {
  const snap = opts.snap ?? false;
  return mapTile(layout, id, (t) => ({
    ...t,
    x: Math.max(0, snapToGrid(x, snap)),
    y: Math.max(0, snapToGrid(y, snap))
  }));
}

export function resizeTile(
  layout: CanvasLayout,
  id: string,
  width: number,
  height: number,
  opts: { snap?: boolean } = {}
): CanvasLayout {
  const snap = opts.snap ?? false;
  return mapTile(layout, id, (t) => ({
    ...t,
    width: Math.max(MIN_TILE_WIDTH, snapToGrid(width, snap)),
    height: Math.max(MIN_TILE_HEIGHT, snapToGrid(height, snap))
  }));
}

export function bringToFront(layout: CanvasLayout, id: string): CanvasLayout {
  const top = maxZ(layout);
  const tile = layout.tiles.find((t) => t.id === id);
  if (!tile || tile.zIndex === top) return layout;
  return mapTile(layout, id, (t) => ({ ...t, zIndex: top + 1 }));
}

function mapTile(
  layout: CanvasLayout,
  id: string,
  fn: (t: TileLayout) => TileLayout
): CanvasLayout {
  return { ...layout, tiles: layout.tiles.map((t) => (t.id === id ? fn(t) : t)) };
}

function maxZ(layout: CanvasLayout): number {
  return layout.tiles.reduce((max, t) => Math.max(max, t.zIndex), 0);
}
