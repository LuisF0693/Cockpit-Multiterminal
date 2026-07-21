import { theme } from './theme';

/**
 * ConfirmModal — substitui `window.confirm` nativo (auditoria UX Don Norman,
 * achado #2): o dialog do Chromium não lê os tokens `--ck-*`, quebrando o
 * tema exatamente nas três decisões mais críticas do produto (destrutivas ou
 * irreversíveis). Mesmo esqueleto de overlay do `PromptModal`; a cor do botão
 * de confirmação segue o padrão cor-por-risco já usado na `RecoveryScreen`
 * (danger = contorno vermelho, ação reversível = destaque neutro do tema).
 */

export interface ConfirmModalProps {
  message: string;
  /** Ação irreversível/destrutiva (excluir, encerrar processo) — botão em vermelho-contorno. */
  danger?: boolean;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  message,
  danger = false,
  confirmLabel = 'confirmar',
  onConfirm,
  onCancel
}: ConfirmModalProps): JSX.Element {
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
        onKeyDown={(e) => {
          if (e.key === 'Enter') onConfirm();
          if (e.key === 'Escape') onCancel();
        }}
        style={{
          width: 360,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          padding: theme.space.lg,
          background: theme.surface.panel,
          border: `1px solid ${theme.border.default}`,
          borderRadius: theme.radius.lg,
          boxShadow: theme.shadow.overlay
        }}
      >
        <p style={{ margin: 0, fontSize: theme.font.size.md, color: theme.text.primary, whiteSpace: 'pre-line' }}>
          {message}
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            autoFocus
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
            onClick={onConfirm}
            style={
              danger
                ? {
                    background: 'transparent',
                    color: theme.accent.danger,
                    border: `1px solid ${theme.accent.danger}`,
                    borderRadius: 6,
                    padding: '5px 12px',
                    fontSize: theme.font.size.sm,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }
                : {
                    background: theme.accent.primary,
                    color: theme.text.inverse,
                    border: 'none',
                    borderRadius: 6,
                    padding: '5px 12px',
                    fontSize: theme.font.size.sm,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
