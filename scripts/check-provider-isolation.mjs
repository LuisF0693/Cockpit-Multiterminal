/**
 * Guarda NFR7 (Story 2.1, AC3): o core e o Main NUNCA importam adapters.
 * Roda no `pnpm verify`. Falha com exit 1 listando as violações.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const GUARDED_DIRS = ['packages/core/src', 'apps/desktop/src/main', 'packages/shared/src', 'packages/ui/src'];
const FORBIDDEN = [/@cockpit\/adapter-shell/, /@cockpit\/adapters\//, /packages\/adapters\//];
// Exceção: tipos do contrato são permitidos APENAS via import type — mas para
// manter a fronteira simples, o core consome tipos pelo shared; o contrato
// em si só é permitido no pty-host e nos adapters.
const FORBIDDEN_CONTRACT = /@cockpit\/adapter-contract/;

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) yield* walk(path);
    else if (/\.(ts|tsx|js|mjs)$/.test(entry)) yield path;
  }
}

const violations = [];
for (const dir of GUARDED_DIRS) {
  let files;
  try {
    files = [...walk(dir)];
  } catch {
    continue;
  }
  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    for (const pattern of [...FORBIDDEN, FORBIDDEN_CONTRACT]) {
      if (pattern.test(content)) {
        violations.push(`${file}: importa ${pattern.source}`);
      }
    }
  }
}

if (violations.length > 0) {
  console.error('[NFR7] VIOLAÇÃO de isolamento de provider:');
  for (const v of violations) console.error(`  - ${v}`);
  process.exit(1);
}
console.log('[NFR7] isolamento de provider OK (core/Main/shared/ui sem imports de adapters)');
