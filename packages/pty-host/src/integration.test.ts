import { describe, expect, it } from 'vitest';
import { spawn as ptySpawn } from 'node-pty';
import {
  PtySessionManager,
  isPidAlive,
  type PtyLike,
  type PtySpawnOptions
} from './session-manager';

/**
 * Integração com PTY REAL (padrão do spike da Story 1.1):
 * spawn → echo roundtrip → dispose → assert sem órfãos.
 * Roda sob Node ABI (aceitável para a lógica — Dev Notes da story);
 * a validação sob Electron ABI é o smoke:abi da Task 0.
 */

const spawnReal = (opts: PtySpawnOptions): PtyLike =>
  ptySpawn(opts.shell, opts.args, {
    name: 'xterm-256color',
    cols: opts.cols,
    rows: opts.rows,
    cwd: opts.cwd,
    env: opts.env
  });

describe('PtySessionManager + node-pty real (ConPTY)', () => {
  it(
    'spawn → echo → dispose sem processo órfão',
    { timeout: 30_000 },
    async () => {
      const manager = new PtySessionManager(spawnReal);
      const { id, pid } = manager.create({ cols: 80, rows: 24 });
      expect(isPidAlive(pid)).toBe(true);

      let output = '';
      manager.onData(id, (d) => {
        output += d;
      });

      manager.write(id, 'echo cockpit-roundtrip\r');
      await waitFor(() => output.includes('cockpit-roundtrip'), 15_000);

      manager.resize(id, 100, 30); // não deve lançar

      const { orphan } = await manager.dispose(id);
      expect(orphan).toBe(false);
      expect(isPidAlive(pid)).toBe(false);
    }
  );
});

async function waitFor(cond: () => boolean, timeoutMs: number): Promise<void> {
  const start = Date.now();
  while (!cond()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error('timeout aguardando condição do PTY');
    }
    await new Promise((r) => setTimeout(r, 100));
  }
}
