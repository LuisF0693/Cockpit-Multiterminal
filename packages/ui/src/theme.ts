/**
 * Tema visual global (13.1/14.1; VIVO desde a 15.2, FR55) — este módulo é a
 * PONTE estática que todos os componentes leem: mesma forma de sempre, mas
 * os valores de COR/FONTE agora são CSS variables (`var(--ck-*)`) definidas
 * em runtime pelo `theme-runtime.ts` (presets, cor de destaque, fontes —
 * trocáveis ao vivo). Números (raios, espaçamento, tamanhos) continuam
 * estáticos. Quem precisa de valores RESOLVIDOS (xterm) usa o runtime.
 * `STATUS_COLORS` (2.5) e `ADAPTER_COLORS` (12.4) seguem fixos (identidade).
 */

export const theme = {
  /** Superfícies em camadas — do chão do canvas (mais fundo) ao overlay. */
  surface: {
    app: 'var(--ck-surface-app)',
    canvas: 'var(--ck-surface-canvas)',
    panel: 'var(--ck-surface-panel)',
    tile: 'var(--ck-surface-tile)',
    header: 'var(--ck-surface-header)',
    raised: 'var(--ck-surface-raised)',
    overlay: 'var(--ck-surface-overlay)'
  },
  text: {
    bright: 'var(--ck-text-bright)',
    primary: 'var(--ck-text-primary)',
    secondary: 'var(--ck-text-secondary)',
    muted: 'var(--ck-text-muted)',
    faint: 'var(--ck-text-faint)',
    inverse: 'var(--ck-text-inverse)'
  },
  border: {
    default: 'var(--ck-border-default)',
    subtle: 'var(--ck-border-subtle)',
    strong: 'var(--ck-border-strong)'
  },
  accent: {
    primary: 'var(--ck-accent-primary)',
    bright: 'var(--ck-accent-bright)',
    soft: 'var(--ck-accent-soft)',
    ring: 'var(--ck-accent-ring)',
    danger: 'var(--ck-accent-danger)',
    warn: 'var(--ck-accent-warn)',
    ok: 'var(--ck-accent-ok)',
    info: 'var(--ck-accent-info)'
  },
  radius: { sm: 4, md: 8, lg: 9, xl: 16, pill: 999 },
  shadow: {
    tile: '0 6px 18px -6px #00000088',
    tileFocused: '0 12px 34px -8px #000000CC',
    overlay: '0 16px 48px #000000AA'
  },
  font: {
    ui: 'var(--ck-font-ui)',
    mono: 'var(--ck-font-mono)',
    size: { xs: 10, sm: 11, md: 12, lg: 13, xl: 16 }
  },
  /** Escala de espaçamento (px) — base 4. */
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 }
} as const;

/**
 * Paleta cíclica de identidade de PROJETO (Story 8.2 → tema na 13.1) —
 * identidade fixa, não muda com o tema (mesmo papel do `ADAPTER_COLORS`).
 */
export const PROJECT_PALETTE = ['#22D3EE', '#4ADE80', '#A78BFA', '#F472B6', '#FBBF24', '#FB923C'] as const;

/**
 * Fundo do canvas com profundidade (13.1/14.1): grade de pontos do mock
 * sobre o chão do tema ATIVO (vars); com cor de projeto (12.6/FR37), uma
 * lavagem translúcida entra como camada extra.
 */
export function canvasBackground(projectColor?: string | null): {
  backgroundColor: string;
  backgroundImage: string;
  backgroundSize: string;
} {
  const dots = `radial-gradient(circle at 1px 1px, var(--ck-canvas-dot) 1.5px, transparent 0)`;
  if (!projectColor) {
    return {
      backgroundColor: 'var(--ck-surface-canvas)',
      backgroundImage: dots,
      backgroundSize: '22px 22px'
    };
  }
  return {
    backgroundColor: 'var(--ck-surface-canvas)',
    backgroundImage: `linear-gradient(${projectColor}1F, ${projectColor}12), ${dots}`,
    backgroundSize: 'auto, 22px 22px'
  };
}
