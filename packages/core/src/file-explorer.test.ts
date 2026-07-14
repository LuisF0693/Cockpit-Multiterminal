import { describe, expect, it } from 'vitest';
import { isGitignored, isPathWithin, parseGitignorePatterns } from './file-explorer';

describe('parseGitignorePatterns (Story 8.4, AC3)', () => {
  it('ignora comentários e linhas vazias', () => {
    const patterns = parseGitignorePatterns('# comentário\n\nnode_modules\n  dist  \n');
    expect(patterns).toEqual(['node_modules', 'dist']);
  });
});

describe('isGitignored (Story 8.4, AC3)', () => {
  it('casa nome simples em qualquer profundidade (não ancorado)', () => {
    const patterns = parseGitignorePatterns('node_modules');
    expect(isGitignored('node_modules', true, patterns)).toBe(true);
    expect(isGitignored('packages/core/node_modules', true, patterns)).toBe(true);
  });

  it('padrão ancorado (/) só casa na raiz', () => {
    const patterns = parseGitignorePatterns('/dist');
    expect(isGitignored('dist', true, patterns)).toBe(true);
    expect(isGitignored('packages/core/dist', true, patterns)).toBe(false);
  });

  it('padrão de pasta (barra final) não casa arquivo de mesmo nome', () => {
    const patterns = parseGitignorePatterns('build/');
    expect(isGitignored('build', true, patterns)).toBe(true);
    expect(isGitignored('build', false, patterns)).toBe(false);
  });

  it('glob de extensão (*.log)', () => {
    const patterns = parseGitignorePatterns('*.log');
    expect(isGitignored('npm-debug.log', false, patterns)).toBe(true);
    expect(isGitignored('src/app.log', false, patterns)).toBe(true);
    expect(isGitignored('src/app.ts', false, patterns)).toBe(false);
  });

  it('negação (!) reverte um match anterior — última regra vence', () => {
    const patterns = parseGitignorePatterns('*.log\n!important.log');
    expect(isGitignored('debug.log', false, patterns)).toBe(true);
    expect(isGitignored('important.log', false, patterns)).toBe(false);
  });

  it('sem match nenhum → não ignorado', () => {
    const patterns = parseGitignorePatterns('node_modules\n*.log');
    expect(isGitignored('src/index.ts', false, patterns)).toBe(false);
  });
});

describe('isPathWithin (Story 8.4, AC4 — defesa em profundidade)', () => {
  it('aceita o próprio root e subcaminhos', () => {
    expect(isPathWithin('C:/repo', 'C:/repo')).toBe(true);
    expect(isPathWithin('C:/repo', 'C:/repo/src/index.ts')).toBe(true);
  });

  it('rejeita caminhos fora do root, mesmo com prefixo parecido', () => {
    expect(isPathWithin('C:/repo', 'C:/repo-outro')).toBe(false);
    expect(isPathWithin('C:/repo', 'C:/outro')).toBe(false);
  });
});
