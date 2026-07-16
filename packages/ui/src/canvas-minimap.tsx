import { useState } from 'react';
import { theme } from './theme';

/**
 * CanvasMinimap (Story 12.5) — retângulo por tile, proporcional à posição
 * real (`layout.tiles`), cor por projeto quando aplicável (reusa 12.3).
 * Colapsável (AC3) em vez de detecção de overflow — mais simples e evita
 * heurística de "fora da área visível" que dependeria de medir scroll em
 * tempo real; o dono (App) só monta este componente quando o canvas está
 * ativo (AC4), então nenhuma lógica de "só monta o que está em uso" vive
 * aqui dentro.
 */

export interface MinimapTile {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Cor do projeto dono (Story 12.3) — null/undefined = neutro. */
  color?: string | null;
  focused?: boolean;
}

export interface CanvasMinimapProps {
  tiles: MinimapTile[];
  /** Retângulo visível do canvas, no mesmo espaço de coordenadas dos tiles. */
  viewport: { x: number; y: number; width: number; height: number };
  onFocusTile: (id: string) => void;
}

const MAP_WIDTH = 180;
const MAP_HEIGHT = 120;
const PADDING = 20;

/**
 * Escala do minimapa — função PURA (mesmo princípio decisão-pura/efeito já
 * usado em `markdown-lite.tsx`/`sdc-routing.ts`): dado o extent real de
 * conteúdo (tiles + viewport visível), calcula o fator que faz tudo caber
 * na caixa fixa `MAP_WIDTH`×`MAP_HEIGHT` sem distorcer proporção.
 */
export function computeMinimapScale(
  tiles: Pick<MinimapTile, 'x' | 'y' | 'width' | 'height'>[],
  viewport: { x: number; y: number; width: number; height: number }
): number {
  const maxX = Math.max(viewport.x + viewport.width, ...tiles.map((t) => t.x + t.width)) + PADDING;
  const maxY = Math.max(viewport.y + viewport.height, ...tiles.map((t) => t.y + t.height)) + PADDING;
  return Math.min(MAP_WIDTH / maxX, MAP_HEIGHT / maxY);
}

export function CanvasMinimap({ tiles, viewport, onFocusTile }: CanvasMinimapProps): JSX.Element | null {
  const [collapsed, setCollapsed] = useState(false);

  if (tiles.length === 0) return null;

  const scale = computeMinimapScale(tiles, viewport);

  return (
    <div
      style={{
        position: 'absolute',
        right: 12,
        bottom: 12,
        zIndex: 9999,
        background: `color-mix(in srgb, ${theme.surface.panel} 87%, transparent)`,
        border: `1px solid ${theme.border.default}`,
        borderRadius: theme.radius.md,
        overflow: 'hidden',
        boxShadow: theme.shadow.tile
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 6,
          padding: '3px 6px',
          borderBottom: collapsed ? 'none' : `1px solid ${theme.border.default}`,
          fontSize: 10,
          color: theme.text.faint,
          letterSpacing: 0.5,
          textTransform: 'uppercase'
        }}
      >
        <span>mapa</span>
        <button
          onClick={() => setCollapsed((v) => !v)}
          title={collapsed ? 'Expandir minimapa' : 'Recolher minimapa'}
          style={{
            background: 'transparent',
            border: 'none',
            color: theme.text.muted,
            cursor: 'pointer',
            fontSize: 11,
            lineHeight: 1,
            padding: 0
          }}
        >
          {collapsed ? '▲' : '▼'}
        </button>
      </div>
      {!collapsed && (
        <div style={{ position: 'relative', width: MAP_WIDTH, height: MAP_HEIGHT }}>
          {tiles.map((t) => (
            <button
              key={t.id}
              title={t.id}
              onClick={() => onFocusTile(t.id)}
              style={{
                position: 'absolute',
                left: t.x * scale,
                top: t.y * scale,
                width: Math.max(t.width * scale, 4),
                height: Math.max(t.height * scale, 4),
                background: t.color ?? theme.border.strong,
                border: t.focused ? `1px solid ${theme.accent.primary}` : `1px solid ${theme.border.subtle}`,
                borderRadius: 2,
                padding: 0,
                cursor: 'pointer'
              }}
            />
          ))}
          {/* Retângulo do viewport visível — feedback de "onde estou". */}
          <div
            style={{
              position: 'absolute',
              left: viewport.x * scale,
              top: viewport.y * scale,
              width: viewport.width * scale,
              height: viewport.height * scale,
              border: `1px solid color-mix(in srgb, ${theme.accent.primary} 60%, transparent)`,
              pointerEvents: 'none'
            }}
          />
        </div>
      )}
    </div>
  );
}
