import { useEffect, useRef } from 'react';

/**
 * PanelResizeHandle (Story 15.1, FR52) — alça de 6px na borda de um painel
 * lateral: arrastar redimensiona (clamp [min, max]), soltar dispara
 * `onResizeEnd` (persistência no dono). `side` é a borda onde a alça vive:
 * 'right' = painel à esquerda (cresce arrastando pra direita), 'left' =
 * painel à direita (cresce arrastando pra esquerda). Mesmo padrão de drag
 * global dos tiles (ref + listeners de janela).
 */

export interface PanelResizeHandleProps {
  side: 'left' | 'right';
  width: number;
  min: number;
  max: number;
  onResize: (width: number) => void;
  onResizeEnd: (width: number) => void;
}

export function PanelResizeHandle({ side, width, min, max, onResize, onResizeEnd }: PanelResizeHandleProps): JSX.Element {
  const dragRef = useRef<{ startX: number; origin: number } | null>(null);
  const propsRef = useRef({ side, min, max, onResize, onResizeEnd, width });
  propsRef.current = { side, min, max, onResize, onResizeEnd, width };

  useEffect(() => {
    const onMove = (e: PointerEvent): void => {
      const drag = dragRef.current;
      if (!drag) return;
      const p = propsRef.current;
      const dx = e.clientX - drag.startX;
      const next = Math.min(p.max, Math.max(p.min, p.side === 'right' ? drag.origin + dx : drag.origin - dx));
      p.onResize(next);
    };
    const onUp = (): void => {
      if (!dragRef.current) return;
      dragRef.current = null;
      propsRef.current.onResizeEnd(propsRef.current.width);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, []);

  return (
    <div
      data-no-pan
      onPointerDown={(e) => {
        e.stopPropagation();
        dragRef.current = { startX: e.clientX, origin: propsRef.current.width };
      }}
      title="Arraste para redimensionar"
      style={{
        position: 'absolute',
        top: 0,
        [side]: 0,
        width: 6,
        height: '100%',
        cursor: 'ew-resize',
        zIndex: 20
      }}
    />
  );
}
