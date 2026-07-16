/**
 * git-info (Story 13.3, FR44) — funções PURAS para extrair a branch atual
 * de um repositório lendo `.git/HEAD` diretamente (sem spawnar `git`:
 * mais barato, sem dependência de PATH, e o Main já tem `node:fs`).
 * Mesmo padrão decisão-pura/efeito de `file-explorer.ts`/`sdc-routing.ts`:
 * o I/O (ler os arquivos) fica no Main; aqui só parsing testável.
 */

/**
 * Interpreta o conteúdo de `.git/HEAD`:
 * - `ref: refs/heads/<branch>` → nome da branch
 * - hash solto (detached HEAD) → 7 primeiros caracteres
 * - qualquer outra coisa → null (conteúdo corrompido/inesperado)
 */
export function parseGitHead(content: string): string | null {
  const text = content.trim();
  if (!text) return null;
  const ref = /^ref:\s*refs\/heads\/(.+)$/.exec(text);
  if (ref) return ref[1]!.trim() || null;
  if (/^[0-9a-fA-F]{40}$/.test(text)) return text.slice(0, 7);
  return null;
}

/**
 * Interpreta um `.git` que é ARQUIVO (worktree/submódulo): contém
 * `gitdir: <caminho do diretório git real>`. Retorna o caminho (pode ser
 * relativo à pasta do projeto — o chamador resolve) ou null.
 */
export function parseGitdirPointer(content: string): string | null {
  const match = /^gitdir:\s*(.+)$/.exec(content.trim());
  return match ? match[1]!.trim() || null : null;
}
