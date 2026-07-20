import { describe, expect, it } from 'vitest';
import { isSameProject } from './project-link-guard';

describe('isSameProject (Épico 18, Story 18.3, FR62)', () => {
  it('devolve true para dois ids não-nulos iguais', () => {
    expect(isSameProject('proj-1', 'proj-1')).toBe(true);
  });

  it('devolve false para ids diferentes', () => {
    expect(isSameProject('proj-1', 'proj-2')).toBe(false);
  });

  it('devolve false quando só um dos lados é null', () => {
    expect(isSameProject(null, 'proj-1')).toBe(false);
    expect(isSameProject('proj-1', null)).toBe(false);
  });

  it('devolve false quando os dois lados são null (ausência não é identidade compartilhada)', () => {
    expect(isSameProject(null, null)).toBe(false);
  });
});
