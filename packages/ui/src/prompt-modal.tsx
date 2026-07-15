import { useState } from 'react';
import { theme } from './theme';

/**
 * PromptModal — substitui `window.prompt`, que o Electron NÃO implementa no
 * renderer (retorna `null` sempre, silenciosamente, sem mostrar nada —
 * limitação documentada do Chromium fora de um browser completo). Overlay
 * simples controlado por React, mesmo palette visual do resto do app.
 */

export interface PromptModalProps {
  message: string;
  defaultValue?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export function PromptModal({ message, defaultValue = '', onConfirm, onCancel }: PromptModalProps): JSX.Element {
  const [value, setValue] = useState(defaultValue);

  return (
    <div
      onPointerDown={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        background: theme.surface.overlay,
        display: 'grid',
        placeItems: 'center',
        zIndex: 100000
      }}
    >
      <div
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          width: 320,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          padding: theme.space.lg,
          background: theme.surface.panel,
          border: `1px solid ${theme.border.default}`,
          borderRadius: theme.radius.lg,
          boxShadow: theme.shadow.overlay
        }}
      >
        <p style={{ margin: 0, fontSize: theme.font.size.md, color: theme.text.primary }}>{message}</p>
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onConfirm(value.trim());
            if (e.key === 'Escape') onCancel();
          }}
          style={{
            background: theme.surface.raised,
            color: theme.text.primary,
            border: `1px solid ${theme.accent.primary}`,
            borderRadius: theme.radius.sm,
            padding: '6px 8px',
            fontSize: theme.font.size.md,
            fontFamily: 'inherit'
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            onClick={onCancel}
            style={{
              background: 'transparent',
              color: theme.text.muted,
              border: `1px solid ${theme.border.default}`,
              borderRadius: 6,
              padding: '5px 12px',
              fontSize: theme.font.size.sm,
              cursor: 'pointer'
            }}
          >
            cancelar
          </button>
          <button
            onClick={() => onConfirm(value.trim())}
            style={{
              background: theme.accent.primary,
              color: theme.text.inverse,
              border: 'none',
              borderRadius: 6,
              padding: '5px 12px',
              fontSize: theme.font.size.sm,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
