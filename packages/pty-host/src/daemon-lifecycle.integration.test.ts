import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isPidAlive } from './session-manager';
import { startDaemon, stopDaemon } from './daemon-entry';
import { DaemonClient } from './daemon-client';
import { DAEMON_PROTOCOL_VERSION } from './daemon-protocol';

/** Lifecycle do daemon (Story 6.4): ping/pong, stop gracioso, re-attach sem replay. */

const uniquePipe = (): string =>
  `\\\\.\\pipe\\cockpit-daemon-64-${process.pid}-${Math.random().toString(36).slice(2)}`;

describe('lifecycle do daemon (Story 6.4)', () => {
  it('ping devolve pid, contagem de sessões e versão do protocolo', { timeout: 15_000 }, async () => {
    const pipe = uniquePipe();
    const server = await startDaemon(pipe);
    const client = new DaemonClient();
    await client.connect(pipe);

    const pong = await client.ping();
    expect(pong).toEqual({ daemonPid: process.pid, sessions: 0, protocolVersion: DAEMON_PROTOCOL_VERSION });

    client.disconnect();
    await server.shutdown();
  });

  it('stopDaemon encerra gracioso: 0 órfãos, PTY morto, pipe fora do ar', { timeout: 60_000 }, async () => {
    const pipe = uniquePipe();
    await startDaemon(pipe);
    const client = new DaemonClient();
    await client.connect(pipe);
    const { pid } = await client.createSession({ tag: 'sess-64-stop', cols: 80, rows: 24 });
    expect(isPidAlive(pid)).toBe(true);
    client.disconnect();

    const orphans = await stopDaemon(pipe);
    expect(orphans).toBe(0);
    await waitFor(() => !isPidAlive(pid), 10_000);

    const probe = new DaemonClient();
    await expect(probe.connect(pipe)).rejects.toThrow(); // pipe morto
  });

  it('attach com tailBytes 0 resubscreve SEM replay (reconexão do Main)', { timeout: 60_000 }, async () => {
    const pipe = uniquePipe();
    const scrollbackDir = mkdtempSync(join(tmpdir(), 'cockpit-daemon-64-'));
    const server = await startDaemon(pipe);
    try {
      const clientA = new DaemonClient();
      await clientA.connect(pipe);
      clientA.configure({ scrollbackDir, maxFileBytes: 1024 * 1024, restoreTailBytes: 128 * 1024 });
      const { id } = await clientA.createSession({ tag: 'sess-64-tail0', cols: 80, rows: 24 });
      let outA = '';
      clientA.onData(id, (b) => {
        outA += Buffer.from(b).toString('utf8');
      });
      clientA.write(id, new TextEncoder().encode('echo marker-historico\r'));
      await waitFor(() => outA.includes('marker-historico'), 20_000);
      clientA.disconnect();

      const clientB = new DaemonClient();
      await clientB.connect(pipe);
      let outB = '';
      clientB.onData(id, (b) => {
        outB += Buffer.from(b).toString('utf8');
      });
      const { ok } = await clientB.attach(id, 0); // 0 = sem replay
      expect(ok).toBe(true);
      await new Promise((r) => setTimeout(r, 800));
      expect(outB).not.toContain('marker-historico'); // histórico NÃO duplicado

      clientB.write(id, new TextEncoder().encode('echo marker-vivo\r'));
      await waitFor(() => outB.includes('marker-vivo'), 15_000); // stream vivo ok

      await clientB.closeSession(id);
      const { orphans } = await clientB.shutdownDaemon();
      expect(orphans).toBe(0);
      clientB.disconnect();
    } finally {
      await server.shutdown();
      rmSync(scrollbackDir, { recursive: true, force: true });
    }
  });
});

async function waitFor(cond: () => boolean, timeoutMs: number): Promise<void> {
  const start = Date.now();
  while (!cond()) {
    if (Date.now() - start > timeoutMs) throw new Error('timeout aguardando condição do daemon');
    await new Promise((r) => setTimeout(r, 100));
  }
}
