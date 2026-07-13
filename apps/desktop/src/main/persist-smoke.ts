import { app } from 'electron';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import {
  PersistenceManager,
  SessionRegistry,
  SqliteStateStore,
  WriteQueue,
  type PtyOps
} from '@cockpit/core';
import { ScrollbackWriter, readScrollbackTail } from '@cockpit/pty-host';

/**
 * Smoke de integração da Story 1.4 (AC4): ciclo persistir → fechar →
 * restaurar com o código REAL (SqliteStateStore + WriteQueue +
 * PersistenceManager + ScrollbackWriter) sob a ABI do Electron.
 * PTYs são fake — o ciclo sob teste é o de persistência (PTYs reais já
 * são cobertos pela integração da 1.3).
 * Uso: pnpm --filter @cockpit/desktop smoke:persist
 */

function makeFakeOps(): PtyOps {
  let seq = 0;
  return {
    createPty: async () => ({ ptyId: `pty-${++seq}`, pid: 40_000 + seq }),
    closePty: async () => ({ orphan: false }),
    resizePty: () => void 0
  };
}

function assert(cond: boolean, label: string): void {
  if (!cond) throw new Error(`assert falhou: ${label}`);
}

app.whenReady().then(async () => {
  const dir = join(app.getPath('temp'), 'cockpit-persist-smoke');
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(join(dir, 'scrollback'), { recursive: true });
  const dbPath = join(dir, 'cockpit.db');

  try {
    // ---------- FASE A: primeira execução ----------
    const storeA = new SqliteStateStore(new Database(dbPath));
    storeA.init();
    const queueA = new WriteQueue((batch) => storeA.applyBatch(batch), { flushMs: 20 });
    const persistA = new PersistenceManager(storeA, queueA);
    const registryA = new SessionRegistry(makeFakeOps());
    persistA.wire(registryA);

    const bootA = persistA.markBootStart();
    assert(bootA.cleanShutdown, 'primeira execução conta como shutdown limpo');

    const s1 = await registryA.create({ cols: 80, rows: 24, name: 'API', cwd: 'C:/proj/api' });
    const s2 = await registryA.create({ cols: 80, rows: 24, name: 'Web', cwd: 'C:/proj/web' });
    persistA.persistLayout([
      { id: s1.id, x: 8, y: 8, width: 640, height: 400, zIndex: 1 },
      { id: s2.id, x: 664, y: 8, width: 480, height: 320, zIndex: 2 }
    ]);

    // Scrollback real em arquivo (AC3)
    const sbFile = join(dir, 'scrollback', `${s1.id}.log`);
    const writer = new ScrollbackWriter(sbFile);
    writer.append(new TextEncoder().encode('historico-persistido\r\n'));
    writer.dispose();

    persistA.markCleanShutdown();
    queueA.dispose();
    storeA.close();

    // ---------- FASE B: "reboot" ----------
    const storeB = new SqliteStateStore(new Database(dbPath));
    storeB.init();
    const queueB = new WriteQueue((batch) => storeB.applyBatch(batch), { flushMs: 20 });
    const persistB = new PersistenceManager(storeB, queueB);
    const registryB = new SessionRegistry(makeFakeOps());
    persistB.wire(registryB);

    const bootB = persistB.markBootStart();
    assert(bootB.cleanShutdown, 'fase A marcou clean_shutdown=1');

    const result = await persistB.restore(registryB);
    assert(result.restored === 2 && result.archived === 0, `restore 2/0 (veio ${JSON.stringify(result)})`);

    const restored = registryB.list();
    assert(
      JSON.stringify(restored.map((r) => [r.id, r.name, r.cwd])) ===
        JSON.stringify([
          [s1.id, 'API', 'C:/proj/api'],
          [s2.id, 'Web', 'C:/proj/web']
        ]),
      'ids/nomes/cwd preservados'
    );

    const layout = persistB.savedLayout();
    assert(layout.length === 2, 'layout com 2 tiles');
    assert(
      layout.find((t) => t.id === s1.id)?.width === 640 && layout.find((t) => t.id === s2.id)?.x === 664,
      'posições/tamanhos restaurados'
    );

    const tail = new TextDecoder().decode(readScrollbackTail(sbFile, 64 * 1024));
    assert(tail.includes('historico-persistido'), 'scrollback restaurável');

    queueB.dispose();
    storeB.close();
    rmSync(dir, { recursive: true, force: true });

    console.log('[persist-smoke] {"ok":true,"restored":2,"layoutTiles":2,"scrollback":true}');
    app.exit(0);
  } catch (err) {
    console.error('[persist-smoke] FALHOU:', err instanceof Error ? err.message : err);
    app.exit(1);
  }
});
