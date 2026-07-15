import { describe, expect, it } from 'vitest';
import { ADAPTER_CATALOG } from './adapter-catalog';
import { ADAPTER_COLORS } from './adapter-colors';

/** Story 13.4 (FR45) — paridade entre as duas tabelas de identidade de adapter. */
describe('ADAPTER_CATALOG', () => {
  it('todo adapter com cor tem entrada no catálogo (e vice-versa)', () => {
    expect(Object.keys(ADAPTER_CATALOG).sort()).toEqual(Object.keys(ADAPTER_COLORS).sort());
  });

  it('todo comando tem extensão explícita (CreateProcess não resolve PATHEXT)', () => {
    for (const [id, entry] of Object.entries(ADAPTER_CATALOG)) {
      expect(entry.command, id).toMatch(/\.(exe|cmd|bat)$/);
      expect(entry.description.length, id).toBeGreaterThan(10);
    }
  });

  it('ollama é o único com args default por sessão', () => {
    const withArgs = Object.entries(ADAPTER_CATALOG).filter(([, e]) => e.defaultArgs);
    expect(withArgs.map(([id]) => id)).toEqual(['ollama']);
  });
});
