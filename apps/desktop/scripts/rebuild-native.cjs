/**
 * Rebuild nativo p/ ABI do Electron (Story 1.4, Task 0).
 * better-sqlite3 não é N-API: baixa o prebuilt correto via prebuild-install
 * (compilar do zero exigiria VS Build Tools). node-pty não precisa (N-API).
 * Uso: pnpm --filter @cockpit/desktop rebuild:native
 */
const { execFileSync } = require('node:child_process');
const { dirname, join } = require('node:path');

const sqliteDir = dirname(require.resolve('better-sqlite3/package.json'));
const electronVersion = require('electron/package.json').version;

const bin = join(sqliteDir, 'node_modules', '.bin', 'prebuild-install.CMD');
console.log(`[rebuild:native] better-sqlite3 → electron ${electronVersion}`);
execFileSync(bin, ['--runtime', 'electron', '--target', electronVersion, '--arch', process.arch, '--verbose'], {
  cwd: sqliteDir,
  stdio: 'inherit',
  shell: true
});
console.log('[rebuild:native] ok');
