import { describe, expect, it } from 'vitest';
import { parseGitHead, parseGitdirPointer } from './git-info';

describe('parseGitHead (Story 13.3, FR44)', () => {
  it('extrai o nome da branch de um ref normal', () => {
    expect(parseGitHead('ref: refs/heads/main\n')).toBe('main');
    expect(parseGitHead('ref: refs/heads/feature/epic-13-refinamento-visual')).toBe(
      'feature/epic-13-refinamento-visual'
    );
  });

  it('detached HEAD vira hash curto (7 chars)', () => {
    expect(parseGitHead('5d50ac9aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n')).toBe('5d50ac9');
  });

  it('conteúdo vazio ou inesperado vira null', () => {
    expect(parseGitHead('')).toBeNull();
    expect(parseGitHead('   \n')).toBeNull();
    expect(parseGitHead('lixo qualquer')).toBeNull();
    expect(parseGitHead('ref: refs/tags/v1.0')).toBeNull();
  });
});

describe('parseGitdirPointer', () => {
  it('extrai o caminho de um .git-arquivo (worktree/submódulo)', () => {
    expect(parseGitdirPointer('gitdir: ../.git/worktrees/wt1\n')).toBe('../.git/worktrees/wt1');
    expect(parseGitdirPointer('gitdir: C:/repos/x/.git/modules/sub')).toBe('C:/repos/x/.git/modules/sub');
  });

  it('conteúdo sem gitdir vira null', () => {
    expect(parseGitdirPointer('ref: refs/heads/main')).toBeNull();
    expect(parseGitdirPointer('')).toBeNull();
  });
});
