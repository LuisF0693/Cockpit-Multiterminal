/**
 * Explorador de arquivos (Story 8.4, FR23) — funções PURAS (sem I/O) de
 * gitignore matching e contenção de caminho. O Main (session-ipc.ts) faz a
 * leitura real do disco (node:fs) e chama estas funções para decidir o que
 * mostrar/permitir — mesma separação decisão-pura/efeito-colateral já
 * aplicada em `sdc-routing.ts` (Épico 7).
 */

/** Parseia o CONTEÚDO de um .gitignore — ignora comentários e linhas vazias. */
export function parseGitignorePatterns(content: string): string[] {
  return content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'));
}

/**
 * Decide se `relPath` (POSIX, sem barra inicial, relativo à raiz do
 * .gitignore) está ignorado — semântica simplificada do gitignore: suporta
 * `#comentário`, `!negação`, `/ancorado-na-raiz`, `pasta/`, `*`/`**` glob.
 * Não é 100% spec-compliant (ex.: glob duplo no meio do caminho), mas cobre
 * o caso comum (node_modules, dist, *.log, .env) — suficiente para AC3.
 */
export function isGitignored(relPath: string, isDirectory: boolean, patterns: string[]): boolean {
  let ignored = false;
  const baseName = relPath.split('/').pop() ?? relPath;
  for (const raw of patterns) {
    let pattern = raw;
    const negate = pattern.startsWith('!');
    if (negate) pattern = pattern.slice(1);
    const dirOnly = pattern.endsWith('/');
    if (dirOnly) pattern = pattern.slice(0, -1);
    if (dirOnly && !isDirectory) continue;
    const anchored = pattern.startsWith('/');
    if (anchored) pattern = pattern.slice(1);

    // Split em '**' primeiro (glob duplo → '.*'); dentro de cada parte,
    // '*' vira '[^/]*'. Sem placeholder intermediário — regex construída
    // direto por junção das partes já escapadas.
    const regexStr = pattern
      .split('**')
      .map((part) => part.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*'))
      .join('.*');
    const regex = new RegExp(`^${regexStr}$`);
    const matches = anchored ? regex.test(relPath) : regex.test(relPath) || regex.test(baseName);
    if (matches) ignored = !negate;
  }
  return ignored;
}

/** Nomes SEMPRE ocultos, independente do .gitignore (ruído universal). */
export const ALWAYS_HIDDEN_NAMES = new Set(['.git']);

/**
 * Contenção de caminho (defesa em profundidade) — `target` precisa estar
 * DENTRO de `root` (ou ser o próprio root). Espera caminhos já normalizados
 * (`path.resolve`) pelo chamador — esta função só compara strings.
 */
export function isPathWithin(root: string, target: string): boolean {
  const normalizedRoot = root.replace(/[/\\]+$/, '');
  return target === normalizedRoot || target.startsWith(`${normalizedRoot}/`) || target.startsWith(`${normalizedRoot}\\`);
}
