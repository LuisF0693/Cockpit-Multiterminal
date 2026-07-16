/**
 * Tema visual global (Story 13.1, FR41; valores Multerminal na 14.1, FR47)
 * — fonte de verdade ÚNICA de superfícies, texto, bordas, acentos, raios,
 * sombras, tipografia e espaçamento. Os VALORES vêm do mockup de referência
 * do fundador (`docs/prd/referencia-visual-multerminal.dc.html`): paleta
 * quase-preta NEUTRA (sem tinta azul) e interface inteira monoespaçada.
 * `STATUS_COLORS` (2.5) e `ADAPTER_COLORS` (12.4) continuam sendo as
 * fontes de cor de ESTADO e IDENTIDADE; este módulo cobre superfície/cromo.
 */

export const theme = {
  /** Superfícies em camadas — do chão do canvas (mais fundo) ao overlay. */
  surface: {
    /** Cromo geral do app (header, rodapé). */
    app: '#111113',
    /** Chão do canvas — a camada mais funda de todas. */
    canvas: '#0C0C0E',
    /** Painéis e sidebars. */
    panel: '#0E0E10',
    /** Fundo de tile de terminal/browser. */
    tile: '#0F0F11',
    /** Cabeçalho de tile e superfícies levemente elevadas. */
    header: '#151517',
    /** Inputs, hovers, cards elevados. */
    raised: '#19191C',
    /** Scrim de modal. */
    overlay: 'rgba(4, 4, 6, 0.72)'
  },
  text: {
    /** Destaques (títulos, texto ativo). */
    bright: '#F4F4F5',
    primary: '#E4E4E7',
    secondary: '#A1A1AA',
    muted: '#71717A',
    faint: '#52525B',
    /** Texto sobre acentos claros (badges). */
    inverse: '#0A0A0C'
  },
  border: {
    default: '#232326',
    subtle: '#1C1C1F',
    strong: '#2A2A2E'
  },
  accent: {
    primary: '#22D3EE',
    /** Variante clara do ciano (texto/linhas de destaque, como no mock). */
    bright: '#67E8F9',
    /** Fundo suave do acento (seleções, hovers acentuados). */
    soft: '#22D3EE1A',
    /** Borda/anel do acento. */
    ring: '#22D3EE55',
    danger: '#F87171',
    warn: '#FBBF24',
    ok: '#4ADE80',
    info: '#60A5FA'
  },
  radius: { sm: 4, md: 8, lg: 9, xl: 16, pill: 999 },
  shadow: {
    tile: '0 6px 18px -6px #00000088',
    tileFocused: '0 12px 34px -8px #000000CC',
    overlay: '0 16px 48px #000000AA'
  },
  font: {
    ui: '"JetBrains Mono", "Cascadia Mono", Consolas, ui-monospace, monospace',
    mono: '"JetBrains Mono", "Cascadia Mono", Consolas, ui-monospace, monospace',
    size: { xs: 10, sm: 11, md: 12, lg: 13, xl: 16 }
  },
  /** Escala de espaçamento (px) — base 4. */
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
  /** Tema do xterm (terminal-view) — coordenado com surface.tile. */
  terminal: {
    background: '#0F0F11',
    foreground: '#D4D4D8',
    cursor: '#22D3EE',
    selectionBackground: '#2A2A2E'
  }
} as const;

/**
 * Paleta cíclica de identidade de PROJETO (Story 8.2 → promovida ao tema na
 * 13.1) — mesmo papel do `ADAPTER_COLORS`: identidade, não superfície.
 */
export const PROJECT_PALETTE = ['#22D3EE', '#4ADE80', '#A78BFA', '#F472B6', '#FBBF24', '#FB923C'] as const;

/** Cor dos pontos da grade do canvas — valores do mockup Multerminal. */
const CANVAS_DOT = '#1C1C1F';

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
  const dots = `radial-gradient(circle at 1px 1px, ${CANVAS_DOT} 1.5px, transparent 0)`;
  if (!projectColor) {
    return {
      backgroundColor: theme.surface.canvas,
      backgroundImage: dots,
      backgroundSize: '22px 22px'
    };
  }
  return {
    backgroundColor: theme.surface.canvas,
    backgroundImage: `linear-gradient(${projectColor}1F, ${projectColor}12), ${dots}`,
    backgroundSize: 'auto, 22px 22px'
  };
}
