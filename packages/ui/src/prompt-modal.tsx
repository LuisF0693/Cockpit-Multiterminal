import { useState } from 'react';

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
        background: '#00000099',
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
          padding: 16,
          background: '#0D131B',
          border: '1px solid #1F2937',
          borderRadius: 8,
          boxShadow: '0 8px 24px #00000066'
        }}
      >
        <p style={{ margin: 0, fontSize: 13, color: '#E5E7EB' }}>{message}</p>
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onConfirm(value.trim());
            if (e.key === 'Escape') onCancel();
          }}
          style={{
            background: '#0B0F14',
            color: '#E5E7EB',
            border: '1px solid #22D3EE',
            borderRadius: 4,
            padding: '6px 8px',
            fontSize: 13,
            fontFamily: 'inherit'
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            onClick={onCancel}
            style={{
              background: 'transparent',
              color: '#9CA3AF',
              border: '1px solid #1F2937',
              borderRadius: 6,
              padding: '5px 12px',
              fontSize: 12,
              cursor: 'pointer'
            }}
          >
            cancelar
          </button>
          <button
            onClick={() => onConfirm(value.trim())}
            style={{
              background: '#22D3EE',
              color: '#0B0F14',
              border: 'none',
              borderRadius: 6,
              padding: '5px 12px',
              fontSize: 12,
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
