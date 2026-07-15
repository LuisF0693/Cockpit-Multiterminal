import { describe, expect, it } from 'vitest';
import { canvasBackground, theme } from './theme';

/** Story 13.1 (AC1) — sanidade dos tokens: cores válidas, escalas coerentes. */

const HEX = /^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/;
const RGBA = /^rgba\(\d+, \d+, \d+, 0?\.\d+\)$/;

describe('theme tokens', () => {
  it('todas as cores de superfície são hex ou rgba válidos', () => {
    for (const value of Object.values(theme.surface)) {
      expect(value, value).toMatch(value.startsWith('#') ? HEX : RGBA);
    }
  });

  it('cores de texto, borda e acento são hex válidos', () => {
    for (const group of [theme.text, theme.border, theme.accent]) {
      for (const value of Object.values(group)) {
        expect(value, value).toMatch(HEX);
      }
    }
  });

  it('cores do terminal (xterm) são hex válidos e o fundo casa com surface.tile', () => {
    for (const value of Object.values(theme.terminal)) {
      expect(value, value).toMatch(HEX);
    }
    expect(theme.terminal.background).toBe(theme.surface.tile);
  });

  it('escala de espaçamento é estritamente crescente', () => {
    const values = [theme.space.xs, theme.space.sm, theme.space.md, theme.space.lg, theme.space.xl];
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThan(values[i - 1]!);
    }
  });

  it('escala de raios é crescente até o pill', () => {
    expect(theme.radius.sm).toBeLessThan(theme.radius.md);
    expect(theme.radius.md).toBeLessThan(theme.radius.lg);
    expect(theme.radius.pill).toBeGreaterThan(theme.radius.lg);
  });
});

describe('canvasBackground', () => {
  it('sem cor de projeto: chão neutro com grade de pontos', () => {
    const bg = canvasBackground(null);
    expect(bg.backgroundColor).toBe(theme.surface.canvas);
    expect(bg.backgroundImage).toContain('radial-gradient');
    expect(bg.backgroundImage).not.toContain('linear-gradient');
  });

  it('com cor de projeto: lavagem translúcida da cor + grade', () => {
    const bg = canvasBackground('#3B82F6');
    expect(bg.backgroundImage).toContain('linear-gradient(#3B82F61F');
    expect(bg.backgroundImage).toContain('radial-gradient');
  });
});
