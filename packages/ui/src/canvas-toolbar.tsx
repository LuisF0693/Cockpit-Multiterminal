import { theme } from './theme';

/**
 * CanvasToolbar (Story 13.2, FR42) — toolbar flutuante do canvas: criação
 * (terminal/browser), zoom (movido do header da 12.6, sem duplicação) e
 * toggles de minimapa (12.5) e overlay de vínculos (9.3). Componente de
 * exibição puro: todo estado vive no dono (App), aqui só callbacks.
 *
 * O dono deve montá-la FORA do wrapper escalado pelo zoom (senão a própria
 * toolbar escala) e dentro de um wrapper `position: sticky` de altura 0 —
 * fica visível em qualquer scroll do canvas sem empurrar o conteúdo.
 */

export interface CanvasToolbarProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onNewTerminal: () => void;
  onNewBrowser: () => void;
  minimapVisible: boolean;
  onToggleMinimap: () => void;
  linksVisible: boolean;
  onToggleLinks: () => void;
  /** Nome de exibição do adapter ativo — só informativo no tooltip. */
  adapterLabel: string;
}

export function CanvasToolbar(props: CanvasToolbarProps): JSX.Element {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: theme.space.xs,
        margin: theme.space.sm,
        padding: `${theme.space.xs}px ${theme.space.sm}px`,
        background: `${theme.surface.panel}E6`,
        border: `1px solid ${theme.border.default}`,
        borderRadius: theme.radius.lg,
        boxShadow: theme.shadow.tile,
        backdropFilter: 'blur(4px)'
      }}
    >
      <button onClick={props.onNewTerminal} title={`Novo terminal ${props.adapterLabel} (Ctrl+N)`} style={toolButtonStyle}>
        ⌨+
      </button>
      <button onClick={props.onNewBrowser} title="Novo preview de browser (Playwright)" style={toolButtonStyle}>
        🌐+
      </button>

      <span style={dividerStyle} />

      <button onClick={props.onZoomOut} title="Diminuir zoom (Ctrl+scroll)" style={toolButtonStyle}>
        −
      </button>
      <button
        onClick={props.onZoomReset}
        title="Redefinir zoom para 100%"
        style={{ ...toolButtonStyle, width: 48, fontSize: theme.font.size.xs, fontFamily: theme.font.mono }}
      >
        {Math.round(props.zoom * 100)}%
      </button>
      <button onClick={props.onZoomIn} title="Aumentar zoom (Ctrl+scroll)" style={toolButtonStyle}>
        +
      </button>

      <span style={dividerStyle} />

      <button
        onClick={props.onToggleMinimap}
        title={props.minimapVisible ? 'Ocultar minimapa' : 'Mostrar minimapa'}
        style={{ ...toolButtonStyle, ...(props.minimapVisible ? activeToggleStyle : {}) }}
      >
        🗺
      </button>
      <button
        onClick={props.onToggleLinks}
        title={props.linksVisible ? 'Ocultar linhas de vínculo' : 'Mostrar linhas de vínculo'}
        style={{ ...toolButtonStyle, ...(props.linksVisible ? activeToggleStyle : {}) }}
      >
        🔗
      </button>
    </div>
  );
}

const toolButtonStyle: React.CSSProperties = {
  background: 'transparent',
  color: theme.text.secondary,
  border: '1px solid transparent',
  borderRadius: theme.radius.sm,
  minWidth: 26,
  height: 26,
  padding: '0 4px',
  cursor: 'pointer',
  fontSize: theme.font.size.md,
  lineHeight: '24px'
};

const activeToggleStyle: React.CSSProperties = {
  background: theme.accent.soft,
  border: `1px solid ${theme.accent.ring}`,
  color: theme.text.primary
};

const dividerStyle: React.CSSProperties = {
  width: 1,
  height: 18,
  background: theme.border.default,
  margin: '0 2px'
};
