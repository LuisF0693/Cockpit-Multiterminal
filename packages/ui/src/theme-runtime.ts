/**
 * Runtime de tema vivo (Story 15.2, FR55) — a contraparte DINÂMICA do
 * `theme.ts`: presets de tema (dados crus, hex reais), cor de destaque e
 * fontes selecionáveis, aplicados como CSS variables no `:root` SEM
 * reiniciar. Quem consegue ler CSS vars (todos os componentes, via
 * `theme.ts`) não muda nada; quem precisa de valores RESOLVIDOS (xterm)
 * assina `subscribeTheme` e recebe os dados crus na troca.
 */

export interface ThemeData {
  id: string;
  label: string;
  mode: 'dark' | 'light';
  surface: { app: string; canvas: string; panel: string; tile: string; header: string; raised: string; overlay: string };
  text: { bright: string; primary: string; secondary: string; muted: string; faint: string; inverse: string };
  border: { default: string; subtle: string; strong: string };
  accent: { primary: string; bright: string; danger: string; warn: string; ok: string; info: string };
  canvasDot: string;
  terminal: { background: string; foreground: string; cursor: string; selectionBackground: string };
  font: { ui: string; mono: string };
}

const FONT_STACK: Record<string, string> = {
  'JetBrains Mono': '"JetBrains Mono", "Cascadia Mono", Consolas, ui-monospace, monospace',
  'Cascadia Mono': '"Cascadia Mono", "JetBrains Mono", Consolas, ui-monospace, monospace',
  Consolas: 'Consolas, "Cascadia Mono", ui-monospace, monospace',
  Inter: 'Inter, "Segoe UI", system-ui, sans-serif',
  'Segoe UI': '"Segoe UI", system-ui, sans-serif'
};

/** Opções de fonte exibidas na Aparência (15.3) — nomes amigáveis. */
export const FONT_TEXT_OPTIONS = ['JetBrains Mono', 'Cascadia Mono', 'Consolas', 'Inter', 'Segoe UI'] as const;
export const FONT_MONO_OPTIONS = ['JetBrains Mono', 'Cascadia Mono', 'Consolas'] as const;

export function fontStackOf(name: string): string {
  return FONT_STACK[name] ?? FONT_STACK['JetBrains Mono']!;
}

/** Cores de destaque da referência (par primária/clara por opção). */
export const ACCENT_OPTIONS: ReadonlyArray<{ primary: string; bright: string; label: string }> = [
  { primary: '#22D3EE', bright: '#67E8F9', label: 'ciano' },
  { primary: '#3B82F6', bright: '#93C5FD', label: 'azul' },
  { primary: '#A78BFA', bright: '#C4B5FD', label: 'violeta' },
  { primary: '#4ADE80', bright: '#86EFAC', label: 'verde' },
  { primary: '#FBBF24', bright: '#FDE68A', label: 'âmbar' },
  { primary: '#F472B6', bright: '#F9A8D4', label: 'rosa' },
  { primary: '#2DD4BF', bright: '#5EEAD4', label: 'turquesa' }
];

const DARK_TEXT = {
  bright: '#F4F4F5',
  primary: '#E4E4E7',
  secondary: '#A1A1AA',
  muted: '#71717A',
  faint: '#52525B',
  inverse: '#0A0A0C'
};

const BASE_ACCENT = { danger: '#F87171', warn: '#FBBF24', ok: '#4ADE80', info: '#60A5FA' };

/** Presets prontos (FR55) — o escuro é EXATAMENTE o Multerminal do Épico 14. */
export const THEME_PRESETS: ReadonlyArray<ThemeData> = [
  {
    id: 'multerminal-dark',
    label: 'Multerminal Escuro',
    mode: 'dark',
    surface: {
      app: '#111113',
      canvas: '#0C0C0E',
      panel: '#0E0E10',
      tile: '#0F0F11',
      header: '#151517',
      raised: '#19191C',
      overlay: 'rgba(4, 4, 6, 0.72)'
    },
    text: DARK_TEXT,
    border: { default: '#232326', subtle: '#1C1C1F', strong: '#2A2A2E' },
    accent: { primary: '#22D3EE', bright: '#67E8F9', ...BASE_ACCENT },
    canvasDot: '#1C1C1F',
    terminal: { background: '#0F0F11', foreground: '#D4D4D8', cursor: '#22D3EE', selectionBackground: '#2A2A2E' },
    font: { ui: fontStackOf('JetBrains Mono'), mono: fontStackOf('JetBrains Mono') }
  },
  {
    id: 'multerminal-light',
    label: 'Multerminal Claro',
    mode: 'light',
    surface: {
      app: '#F4F4F5',
      canvas: '#EBEBEE',
      panel: '#FAFAFA',
      tile: '#FFFFFF',
      header: '#F0F0F2',
      raised: '#E8E8EB',
      overlay: 'rgba(24, 24, 27, 0.35)'
    },
    text: {
      bright: '#09090B',
      primary: '#18181B',
      secondary: '#52525B',
      muted: '#71717A',
      faint: '#A1A1AA',
      inverse: '#FAFAFA'
    },
    border: { default: '#D4D4D8', subtle: '#E4E4E7', strong: '#C0C0C6' },
    accent: { primary: '#0891B2', bright: '#22D3EE', danger: '#DC2626', warn: '#D97706', ok: '#16A34A', info: '#2563EB' },
    canvasDot: '#D8D8DC',
    terminal: { background: '#FFFFFF', foreground: '#18181B', cursor: '#0891B2', selectionBackground: '#D4D4D8' },
    font: { ui: fontStackOf('JetBrains Mono'), mono: fontStackOf('JetBrains Mono') }
  },
  {
    id: 'midnight',
    label: 'Meia-noite',
    mode: 'dark',
    surface: {
      app: '#0B1020',
      canvas: '#070B16',
      panel: '#0A0F1D',
      tile: '#0C1222',
      header: '#111931',
      raised: '#16203C',
      overlay: 'rgba(3, 6, 14, 0.72)'
    },
    text: DARK_TEXT,
    border: { default: '#1E2A45', subtle: '#16203A', strong: '#2A3A5E' },
    accent: { primary: '#22D3EE', bright: '#67E8F9', ...BASE_ACCENT },
    canvasDot: '#182440',
    terminal: { background: '#0C1222', foreground: '#D4D4D8', cursor: '#22D3EE', selectionBackground: '#2A3A5E' },
    font: { ui: fontStackOf('JetBrains Mono'), mono: fontStackOf('JetBrains Mono') }
  }
];

export interface ThemeSelection {
  themePreset: string;
  accentColor: string;
  fontText: string;
  fontMono: string;
}

/** Preset + destaque + fontes → dados finais do tema (função PURA, testável). */
export function composeTheme(sel: ThemeSelection): ThemeData {
  const preset = THEME_PRESETS.find((p) => p.id === sel.themePreset) ?? THEME_PRESETS[0]!;
  const accent = ACCENT_OPTIONS.find((a) => a.primary.toUpperCase() === sel.accentColor.toUpperCase());
  return {
    ...preset,
    accent: accent ? { ...preset.accent, primary: accent.primary, bright: accent.bright } : preset.accent,
    terminal: { ...preset.terminal, cursor: accent ? accent.primary : preset.terminal.cursor },
    font: { ui: fontStackOf(sel.fontText), mono: fontStackOf(sel.fontMono) }
  };
}

/** Mapa ThemeData → CSS variables (função PURA, testável). */
export function themeToCssVars(data: ThemeData): Record<string, string> {
  return {
    '--ck-surface-app': data.surface.app,
    '--ck-surface-canvas': data.surface.canvas,
    '--ck-surface-panel': data.surface.panel,
    '--ck-surface-tile': data.surface.tile,
    '--ck-surface-header': data.surface.header,
    '--ck-surface-raised': data.surface.raised,
    '--ck-surface-overlay': data.surface.overlay,
    '--ck-text-bright': data.text.bright,
    '--ck-text-primary': data.text.primary,
    '--ck-text-secondary': data.text.secondary,
    '--ck-text-muted': data.text.muted,
    '--ck-text-faint': data.text.faint,
    '--ck-text-inverse': data.text.inverse,
    '--ck-border-default': data.border.default,
    '--ck-border-subtle': data.border.subtle,
    '--ck-border-strong': data.border.strong,
    '--ck-accent-primary': data.accent.primary,
    '--ck-accent-bright': data.accent.bright,
    '--ck-accent-soft': `${data.accent.primary}1A`,
    '--ck-accent-ring': `${data.accent.primary}55`,
    '--ck-accent-danger': data.accent.danger,
    '--ck-accent-warn': data.accent.warn,
    '--ck-accent-ok': data.accent.ok,
    '--ck-accent-info': data.accent.info,
    '--ck-canvas-dot': data.canvasDot,
    '--ck-font-ui': data.font.ui,
    '--ck-font-mono': data.font.mono
  };
}

type ThemeListener = (data: ThemeData) => void;
let activeTheme: ThemeData = THEME_PRESETS[0]!;
const listeners = new Set<ThemeListener>();

/** Dados CRUS do tema ativo — pra quem não lê CSS vars (xterm). */
export function getActiveTheme(): ThemeData {
  return activeTheme;
}

export function subscribeTheme(cb: ThemeListener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Aplica o tema: CSS vars no :root + notifica assinantes (xterm etc.). */
export function applyTheme(data: ThemeData): void {
  activeTheme = data;
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    for (const [name, value] of Object.entries(themeToCssVars(data))) {
      root.style.setProperty(name, value);
    }
  }
  for (const cb of listeners) cb(data);
}

// Tema default aplicado no import (renderer) — os componentes leem var()
// desde o primeiro paint; testes (node) caem no guard de document.
applyTheme(activeTheme);
