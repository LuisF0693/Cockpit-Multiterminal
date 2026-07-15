/**
 * Tema visual global (Story 13.1, FR41) — fonte de verdade ÚNICA de
 * superfícies, texto, bordas, acentos, raios, sombras, tipografia e
 * espaçamento. Evolui a paleta que o app já tinha (dark azul-acinzentado,
 * acento ciano) para uma versão em CAMADAS de profundidade — mesma
 * identidade, mais acabamento. `STATUS_COLORS` (2.5) e `ADAPTER_COLORS`
 * (12.4) continuam sendo as fontes de cor de ESTADO e IDENTIDADE; este
 * módulo cobre tudo o que é superfície/cromo.
 */

export const theme = {
  /** Superfícies em camadas — do chão do canvas (mais fundo) ao overlay. */
  surface: {
    /** Cromo geral do app (header, nav). */
    app: '#0A0E14',
    /** Chão do canvas — a camada mais funda de todas. */
    canvas: '#07090D',
    /** Painéis e sidebars. */
    panel: '#0C1118',
    /** Fundo de tile de terminal/browser. */
    tile: '#0E131B',
    /** Cabeçalho de tile e superfícies levemente elevadas. */
    header: '#121926',
    /** Inputs, hovers, cards elevados. */
    raised: '#172033',
    /** Scrim de modal. */
    overlay: 'rgba(4, 7, 12, 0.72)'
  },
  text: {
    primary: '#E7ECF3',
    secondary: '#A9B4C4',
    muted: '#76818F',
    faint: '#586374',
    /** Texto sobre acentos claros (badges). */
    inverse: '#0B0F14'
  },
  border: {
    default: '#1E2836',
    subtle: '#151C28',
    strong: '#2C3A4F'
  },
  accent: {
    primary: '#22D3EE',
    /** Fundo suave do acento (seleções, hovers acentuados). */
    soft: '#22D3EE1A',
    /** Borda/anel do acento. */
    ring: '#22D3EE55',
    danger: '#F87171',
    warn: '#FBBF24',
    ok: '#34D399'
  },
  radius: { sm: 4, md: 8, lg: 12, pill: 999 },
  shadow: {
    tile: '0 4px 18px #00000055',
    tileFocused: '0 0 0 1px #22D3EE55, 0 10px 30px #00000077',
    overlay: '0 16px 48px #000000AA'
  },
  font: {
    ui: 'Inter, "Segoe UI", system-ui, sans-serif',
    mono: '"Cascadia Mono", "JetBrains Mono", Consolas, monospace',
    size: { xs: 11, sm: 12, md: 13, lg: 15, xl: 18 }
  },
  /** Escala de espaçamento (px) — base 4. */
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
  /** Tema do xterm (terminal-view) — coordenado com surface.tile. */
  terminal: {
    background: '#0E131B',
    foreground: '#E7ECF3',
    cursor: '#22D3EE',
    selectionBackground: '#2C3A4F'
  }
} as const;

/**
 * Paleta cíclica de identidade de PROJETO (Story 8.2 → promovida ao tema na
 * 13.1) — mesmo papel do `ADAPTER_COLORS`: identidade, não superfície.
 */
export const PROJECT_PALETTE = ['#3B82F6', '#F87171', '#34D399', '#FBBF24', '#A78BFA', '#F472B6'] as const;

/** Cor dos pontos da grade do canvas — sutil sobre `surface.canvas`. */
const CANVAS_DOT = '#1A2230';

/**
 * Fundo do canvas com profundidade (Story 13.1, AC2): grade de pontos sutil
 * via `radial-gradient` (sem imagem) sobre o chão mais fundo do tema; quando
 * o projeto ativo tem cor (12.6/FR37), uma lavagem translúcida da cor entra
 * como camada extra — sem cor, visual neutro (zero regressão do AC3 da 12.6).
 */
export function canvasBackground(projectColor?: string | null): {
  backgroundColor: string;
  backgroundImage: string;
  backgroundSize: string;
} {
  const dots = `radial-gradient(circle, ${CANVAS_DOT} 1px, transparent 1px)`;
  if (!projectColor) {
    return {
      backgroundColor: theme.surface.canvas,
      backgroundImage: dots,
      backgroundSize: '24px 24px'
    };
  }
  return {
    backgroundColor: theme.surface.canvas,
    backgroundImage: `linear-gradient(${projectColor}1F, ${projectColor}12), ${dots}`,
    backgroundSize: 'auto, 24px 24px'
  };
}
