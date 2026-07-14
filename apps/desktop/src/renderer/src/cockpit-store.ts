import { create } from 'zustand';
import type { LayoutTile, SessionRecord } from '@cockpit/shared';
import {
  addTile,
  bringToFront,
  createLayout,
  moveTile,
  removeTile,
  resizeTile,
  type CanvasLayout
} from '@cockpit/ui';

/**
 * Estado do renderer (Zustand) — REFLEXO dos eventos do SessionRegistry
 * (CQRS leve: a UI nunca é dona do estado de sessões). O layout do canvas
 * é o modelo serializável da 1.3; a 1.4 vai persisti-lo.
 * Ports são recursos vivos (não serializáveis) — vivem aqui só em memória.
 */

interface CockpitState {
  sessions: SessionRecord[];
  layout: CanvasLayout;
  focusedId: string | null;
  ports: ReadonlyMap<string, MessagePort>;

  seedSessions(list: SessionRecord[], savedTiles?: LayoutTile[]): void;
  upsertSession(record: SessionRecord): void;
  removeSession(id: string): void;
  attachPort(id: string, port: MessagePort): void;
  focus(id: string): void;
  moveTileTo(id: string, x: number, y: number): void;
  snapTile(id: string): void;
  resizeTileTo(id: string, width: number, height: number): void;
}

export const useCockpitStore = create<CockpitState>((set) => ({
  sessions: [],
  layout: createLayout(),
  focusedId: null,
  ports: new Map<string, MessagePort>(),

  seedSessions: (list, savedTiles = []) =>
    set((s) => {
      // Tiles salvos (Story 1.4) têm prioridade; sem tile salvo → cascata default.
      const saved = new Map(savedTiles.map((t) => [t.id, t]));
      let layout = s.layout;
      for (const record of list) {
        if (layout.tiles.some((t) => t.id === record.id)) continue;
        const tile = saved.get(record.id);
        layout = tile
          ? { ...layout, tiles: [...layout.tiles, { ...tile }] }
          : addTile(layout, record.id);
      }
      return {
        sessions: list,
        layout,
        focusedId: s.focusedId ?? list[0]?.id ?? null
      };
    }),

  upsertSession: (record) =>
    set((s) => {
      const exists = s.sessions.some((x) => x.id === record.id);
      return {
        sessions: exists
          ? s.sessions.map((x) => (x.id === record.id ? record : x))
          : [...s.sessions, record],
        layout: exists ? s.layout : addTile(s.layout, record.id),
        focusedId: exists ? s.focusedId : record.id
      };
    }),

  removeSession: (id) =>
    set((s) => {
      const sessions = s.sessions.filter((x) => x.id !== id);
      const ports = new Map(s.ports);
      // O store é o dono do ciclo de vida da porta (TerminalView só a usa).
      ports.get(id)?.close();
      ports.delete(id);
      return {
        sessions,
        layout: removeTile(s.layout, id),
        ports,
        focusedId: s.focusedId === id ? (sessions[sessions.length - 1]?.id ?? null) : s.focusedId
      };
    }),

  attachPort: (id, port) =>
    set((s) => {
      const ports = new Map(s.ports);
      ports.set(id, port);
      return { ports };
    }),

  focus: (id) =>
    set((s) => ({
      focusedId: id,
      layout: bringToFront(s.layout, id)
    })),

  moveTileTo: (id, x, y) => set((s) => ({ layout: moveTile(s.layout, id, x, y) })),

  snapTile: (id) =>
    set((s) => {
      const tile = s.layout.tiles.find((t) => t.id === id);
      if (!tile) return s;
      return {
        layout: resizeTile(
          moveTile(s.layout, id, tile.x, tile.y, { snap: true }),
          id,
          tile.width,
          tile.height,
          { snap: true }
        )
      };
    }),

  resizeTileTo: (id, width, height) =>
    set((s) => ({ layout: resizeTile(s.layout, id, width, height) }))
}));
