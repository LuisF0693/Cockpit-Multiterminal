import { describe, expect, it } from 'vitest';
import { canvasBackground, theme } from './theme';
import { ACCENT_OPTIONS, THEME_PRESETS, composeTheme, themeToCssVars } from './theme-runtime';

/**
 * Story 13.1 (AC1) + 15.2 (FR55) — sanidade: `theme` expõe var(--ck-*)
 * consistentes; os PRESETS têm hex válidos e invariantes; composeTheme
 * aplica destaque sem tocar o resto.
 */

const HEX = /^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/;
const RGBA = /^rgba\(\d+, \d+, \d+, 0?\.\d+\)$/;
const VAR = /^var\(--ck-[a-z-]+\)$/;

describe('theme (ponte estática de CSS variables)', () => {
  it('todas as cores/fontes são var(--ck-*)', () => {
    for (const group of [theme.surface, theme.text, theme.border, theme.accent]) {
      for (const value of Object.values(group)) {
        expect(value, value).toMatch(VAR);
      }
    }
    expect(theme.font.ui).toMatch(VAR);
    expect(theme.font.mono).toMatch(VAR);
  });

  it('escalas numéricas coerentes', () => {
    const values = [theme.space.xs, theme.space.sm, theme.space.md, theme.space.lg, theme.space.xl];
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThan(values[i - 1]!);
    }
    expect(theme.radius.sm).toBeLessThan(theme.radius.md);
    expect(theme.radius.md).toBeLessThan(theme.radius.lg);
    expect(theme.radius.pill).toBeGreaterThan(theme.radius.xl);
  });
});

describe('THEME_PRESETS (Story 15.2, FR55)', () => {
  it('todo preset tem cores hex/rgba válidas e ids únicos', () => {
    const ids = new Set<string>();
    for (const p of THEME_PRESETS) {
      expect(ids.has(p.id), p.id).toBe(false);
      ids.add(p.id);
      for (const group of [p.surface, p.text, p.border, p.accent, p.terminal] as Array<Record<string, string>>) {
        for (const value of Object.values(group)) {
          expect(value, `${p.id}: ${value}`).toMatch(value.startsWith('#') ? HEX : RGBA);
        }
      }
      expect(p.canvasDot, p.id).toMatch(HEX);
      // Invariante da 13.1 preservada por preset: xterm casa com o tile.
      expect(p.terminal.background, p.id).toBe(p.surface.tile);
    }
  });

  it('o preset default é o Multerminal escuro do Épico 14 (valores exatos)', () => {
    const dark = THEME_PRESETS[0]!;
    expect(dark.id).toBe('multerminal-dark');
    expect(dark.surface.tile).toBe('#0F0F11');
    expect(dark.accent.primary).toBe('#22D3EE');
  });
});

describe('composeTheme', () => {
  it('aplica a cor de destaque escolhida (primary+bright+cursor) sem tocar o resto', () => {
    const violet = ACCENT_OPTIONS.find((a) => a.label === 'violeta')!;
    const composed = composeTheme({
      themePreset: 'multerminal-dark',
      accentColor: violet.primary,
      fontText: 'JetBrains Mono',
      fontMono: 'Consolas'
    });
    expect(composed.accent.primary).toBe(violet.primary);
    expect(composed.accent.bright).toBe(violet.bright);
    expect(composed.terminal.cursor).toBe(violet.primary);
    expect(composed.surface.tile).toBe('#0F0F11');
    expect(composed.font.mono).toContain('Consolas');
  });

  it('preset/destaque desconhecidos degradam pro default (nunca erro)', () => {
    const composed = composeTheme({ themePreset: 'x', accentColor: '#000001', fontText: 'y', fontMono: 'z' });
    expect(composed.id).toBe('multerminal-dark');
    expect(composed.accent.primary).toBe('#22D3EE');
  });
});

describe('themeToCssVars', () => {
  it('gera todas as vars que a ponte estática referencia', () => {
    const vars = themeToCssVars(THEME_PRESETS[0]!);
    const referenced = [
      ...Object.values(theme.surface),
      ...Object.values(theme.text),
      ...Object.values(theme.border),
      ...Object.values(theme.accent),
      theme.font.ui,
      theme.font.mono
    ].map((v) => /^var\((--ck-[a-z-]+)\)$/.exec(v)![1]!);
    for (const name of referenced) {
      expect(vars[name], name).toBeTruthy();
    }
  });
});

describe('canvasBackground', () => {
  it('sem cor de projeto: chão do tema com grade de pontos', () => {
    const bg = canvasBackground(null);
    expect(bg.backgroundColor).toBe('var(--ck-surface-canvas)');
    expect(bg.backgroundImage).toContain('radial-gradient');
    expect(bg.backgroundImage).not.toContain('linear-gradient');
  });

  it('com cor de projeto: lavagem translúcida da cor + grade', () => {
    const bg = canvasBackground('#3B82F6');
    expect(bg.backgroundImage).toContain('linear-gradient(#3B82F61F');
    expect(bg.backgroundImage).toContain('radial-gradient');
  });
});
