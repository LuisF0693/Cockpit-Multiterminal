import { describe, expect, it } from 'vitest';
import { spawn as ptySpawn } from 'node-pty';
import { PtySessionManager, type PtyLike, type PtySpawnOptions } from '@cockpit/pty-host';
import { SessionRegistry, type PtyOps } from '../session-registry';
import { MemoryStateStore } from './memory-state-store';
import { PersistenceManager } from './persistence';
import { WriteQueue } from './write-queue';

/**
 * Carga com persistência (Story 4.1, AC1/AC3): 6 sessões REAIS produzindo
 * output enquanto o PersistenceManager grava — sem perda de eventos de
 * domínio, sem bloquear a interação (NFR8), com timeline/contagens íntegras.
 */

const spawnReal = (opts: PtySpawnOptions): PtyLike =>
  ptySpawn(opts.shell, opts.args, {
    name: 'xterm-256color',
    cols: opts.cols,
    rows: opts.rows,
    cwd: opts.cwd,
    env: opts.env
  });

describe('persistência sob carga — 6 PTYs reais (Story 4.1)', () => {
  it('grava tudo sem perda, mantém ordenação e contagens consistentes', { timeout: 120_000 }, async () => {
    const manager = new PtySessionManager(spawnReal);
    const outputs = new Map<string, string>();
    const ops: PtyOps = {
      createPty: async ({ cols, rows, cwd }) => {
        const created = manager.create({ cols, rows, ...(cwd !== undefined ? { cwd } : {}) });
        outputs.set(created.id, '');
        manager.onData(created.id, (d) => outputs.set(created.id, outputs.get(created.id) + d));
        return { ptyId: created.id, pid: created.pid };
      },
      closePty: (ptyId) => manager.dispose(ptyId),
      resizePty: (ptyId, cols, rows) => manager.resize(ptyId, cols, rows)
    };

    const store = new MemoryStateStore();
    store.init();
    const queue = new WriteQueue((batch) => batch.forEach((op) => op()));
    const persistence = new PersistenceManager(store, queue);
    const registry = new SessionRegistry(ops);
    persistence.wire(registry);

    // 6 sessões reais + instruções via master no meio da carga
    const sessions: Awaited<ReturnType<SessionRegistry['create']>>[] = [];
    for (let i = 0; i < 6; i++) {
      sessions.push(await registry.create({ cols: 80, rows: 24, name: `Carga ${i}` }));
    }
    for (const [i, s] of sessions.entries()) {
      manager.write(registry.ptyIdOf(s.id), `echo persist-carga-${i}\r`);
      persistence.recordInstruction(s.id, `instrução ${i}`);
    }
    await waitFor(
      () => sessions.every((s, i) => (outputs.get(registry.ptyIdOf(s.id)) ?? '').includes(`persist-carga-${i}`)),
      60_000
    );

    // interação nunca bloqueou: push é síncrono e barato (NFR8) — se algo
    // tivesse travado, os echoes acima não teriam completado no prazo.
    for (const s of sessions) {
      await registry.close(s.id);
    }
    queue.flush();

    // AC1: nenhum evento de domínio perdido
    expect(store.countEvents({ type: 'terminal.created' })).toBe(6);
    expect(store.countEvents({ type: 'terminal.closed' })).toBe(6);
    expect(store.countEvents({ type: 'instruction.sent' })).toBe(6);
    expect(store.listActiveTerminals()).toHaveLength(0); // todas arquivadas

    // AC3: ordenação (ts desc) + limit respeitado + contagens batem
    const all = persistence.timeline({ limit: 500 });
    for (let i = 1; i < all.length; i++) {
      expect(all[i - 1]!.ts).toBeGreaterThanOrEqual(all[i]!.ts);
    }
    const limited = persistence.timeline({ limit: 5 });
    expect(limited).toHaveLength(5);
    const one = sessions[0]!;
    const ofOne = persistence.timeline({ limit: 500, terminalId: one.id });
    expect(store.countEvents({ terminalId: one.id })).toBe(ofOne.length);

    // relatório 3.5 íntegro sobre a carga
    const report = persistence.sessionReport(one.id)!;
    expect(report.instructions).toBe(1);
    expect(report.endedAt).not.toBeNull();
  });
});

async function waitFor(cond: () => boolean, timeoutMs: number): Promise<void> {
  const start = Date.now();
  while (!cond()) {
    if (Date.now() - start > timeoutMs) throw new Error('timeout aguardando condição de carga');
    await new Promise((r) => setTimeout(r, 100));
  }
}
