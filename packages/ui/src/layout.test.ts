import { describe, expect, it } from 'vitest';
import {
  MIN_TILE_HEIGHT,
  MIN_TILE_WIDTH,
  addTile,
  bringToFront,
  createLayout,
  moveTile,
  removeTile,
  resizeTile
} from './layout';

describe('layout do canvas (serializável, layoutVersion 1)', () => {
  it('addTile posiciona em cascata com zIndex crescente', () => {
    let layout = createLayout();
    layout = addTile(layout, 'a');
    layout = addTile(layout, 'b');

    expect(layout.layoutVersion).toBe(1);
    expect(layout.tiles[0]).toMatchObject({ id: 'a', x: 16, y: 16, zIndex: 1 });
    expect(layout.tiles[1]).toMatchObject({ id: 'b', x: 48, y: 48, zIndex: 2 });
  });

  it('moveTile aplica snap de 8px quando pedido e clampa em 0', () => {
    let layout = addTile(createLayout(), 'a');
    layout = moveTile(layout, 'a', 101, 99, { snap: true });
    expect(layout.tiles[0]).toMatchObject({ x: 104, y: 96 });

    layout = moveTile(layout, 'a', -50, -10);
    expect(layout.tiles[0]).toMatchObject({ x: 0, y: 0 });
  });

  it('resizeTile respeita mínimos 320×200', () => {
    let layout = addTile(createLayout(), 'a');
    layout = resizeTile(layout, 'a', 100, 50);
    expect(layout.tiles[0]).toMatchObject({ width: MIN_TILE_WIDTH, height: MIN_TILE_HEIGHT });
  });

  it('bringToFront eleva zIndex acima de todos (e é no-op se já está no topo)', () => {
    let layout = addTile(addTile(addTile(createLayout(), 'a'), 'b'), 'c');
    layout = bringToFront(layout, 'a');
    const zOf = (id: string): number => layout.tiles.find((t) => t.id === id)!.zIndex;
    expect(zOf('a')).toBeGreaterThan(zOf('b'));
    expect(zOf('a')).toBeGreaterThan(zOf('c'));

    const same = bringToFront(layout, 'a');
    expect(same).toBe(layout);
  });

  it('removeTile remove só o tile pedido', () => {
    let layout = addTile(addTile(createLayout(), 'a'), 'b');
    layout = removeTile(layout, 'a');
    expect(layout.tiles.map((t) => t.id)).toEqual(['b']);
  });

  it('estado é JSON-serializável na ida e na volta', () => {
    const layout = addTile(addTile(createLayout(), 'a'), 'b');
    const roundTrip = JSON.parse(JSON.stringify(layout)) as typeof layout;
    expect(roundTrip).toEqual(layout);
  });
});
