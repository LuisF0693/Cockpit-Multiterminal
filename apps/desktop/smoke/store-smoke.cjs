/**
 * Smoke do state store (Story 1.4, Task 0): better-sqlite3 sob ABI do
 * Electron — abre DB WAL, transação de escrita, leitura de volta.
 * Uso: pnpm --filter @cockpit/desktop smoke:store
 */
const { app } = require('electron');
const { join } = require('node:path');
const { mkdirSync, rmSync } = require('node:fs');

app.whenReady().then(() => {
  try {
    const Database = require('better-sqlite3');
    const dir = join(app.getPath('temp'), 'cockpit-store-smoke');
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });

    const db = new Database(join(dir, 'smoke.db'));
    db.pragma('journal_mode = WAL');
    db.exec('CREATE TABLE t (id TEXT PRIMARY KEY, v INTEGER NOT NULL)');
    const insert = db.prepare('INSERT INTO t (id, v) VALUES (?, ?)');
    db.transaction(() => {
      for (let i = 0; i < 100; i++) insert.run(`k${i}`, i);
    })();
    const count = db.prepare('SELECT COUNT(*) AS n FROM t').get().n;
    const wal = db.pragma('journal_mode', { simple: true });
    db.close();
    rmSync(dir, { recursive: true, force: true });

    const ok = count === 100 && wal === 'wal';
    console.log('[store-smoke]', JSON.stringify({ ok, count, journalMode: wal, electronAbi: process.versions.modules }));
    app.exit(ok ? 0 : 1);
  } catch (err) {
    console.error('[store-smoke] FALHOU:', err.message);
    app.exit(1);
  }
});
