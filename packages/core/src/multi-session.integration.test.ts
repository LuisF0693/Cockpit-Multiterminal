import { describe, expect, it } from 'vitest';
import { spawn as ptySpawn } from 'node-pty';
import {
  PtySessionManager,
  isPidAlive,
  type PtyLike,
  type PtySpawnOptions
} from '@cockpit/pty-host';
import { SessionRegistry, type PtyOps } from './session-registry';

/**
 * Teste de carga da Story 1.3 (AC3/AC4): 6 sessões REAIS via SessionRegistry →
 * interagir com todas → fechar 1 → demais intactas → fechar todas → 0 órfãos.
 */

const spawnReal = (opts: PtySpawnOptions): PtyLike =>
  ptySpawn(opts.shell, opts.args, {
    name: 'xterm-256color',
    cols: opts.cols,
    rows: opts.rows,
    cwd: opts.cwd,
    env: opts.env
  });

describe('SessionRegistry + 6 PTYs reais (carga Story 1.3)', () => {
  it('cria 6, interage, fecha 1 sem afetar as demais, fecha todas sem órfãos', { timeout: 90_000 }, async () => {
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
    const registry = new SessionRegistry(ops);

    // 1) criar 6 sessões
    const sessions: Awaited<ReturnType<SessionRegistry['create']>>[] = [];
    for (let i = 0; i < 6; i++) {
      sessions.push(await registry.create({ cols: 80, rows: 24 }));
    }
    const pids = sessions.map((s) => s.pid);
    expect(registry.list()).toHaveLength(6);
    expect(pids.every(isPidAlive)).toBe(true);

    // 2) interagir com TODAS (echo roundtrip único por sessão)
    for (const [i, s] of sessions.entries()) {
      manager.write(registry.ptyIdOf(s.id), `echo carga-${i}\r`);
    }
    await waitFor(
      () => sessions.every((s, i) => (outputs.get(ptyOf(registry, s.id)) ?? '').includes(`carga-${i}`)),
      45_000
    );

    // 3) fechar UMA — demais intactas (AC4)
    const victim = sessions[2]!;
    const { orphan } = await registry.close(victim.id);
    expect(orphan).toBe(false);
    expect(isPidAlive(victim.pid)).toBe(false);

    const survivors = sessions.filter((s) => s.id !== victim.id);
    expect(survivors.every((s) => isPidAlive(s.pid))).toBe(true);
    expect(registry.list()).toHaveLength(5);

    // sobreviventes continuam interativos
    manager.write(registry.ptyIdOf(survivors[0]!.id), 'echo ainda-vivo\r');
    await waitFor(
      () => (outputs.get(ptyOf(registry, survivors[0]!.id)) ?? '').includes('ainda-vivo'),
      15_000
    );

    // 4) fechar todas — 0 órfãos
    await registry.closeAll();
    expect(registry.list()).toHaveLength(0);
    expect(pids.some(isPidAlive)).toBe(false);
  });
});

function ptyOf(registry: SessionRegistry, id: string): string {
  return registry.has(id) ? registry.ptyIdOf(id) : '';
}

async function waitFor(cond: () => boolean, timeoutMs: number): Promise<void> {
  const start = Date.now();
  while (!cond()) {
    if (Date.now() - start > timeoutMs) throw new Error('timeout aguardando PTYs');
    await new Promise((r) => setTimeout(r, 150));
  }
}
