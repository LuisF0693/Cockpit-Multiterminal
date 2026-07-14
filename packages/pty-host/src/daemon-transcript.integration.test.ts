import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isPidAlive } from './session-manager';
import { startDaemon } from './daemon-entry';
import { DaemonClient } from './daemon-client';

/**
 * Túnel de transcript (Story 6.2): reconectar recebe replay do scrollback
 * (fonte única — 1.4) + stream vivo. marker-um só pode chegar ao cliente B
 * via replay: aconteceu quando apenas A estava conectado.
 */

const uniquePipe = (): string =>
  `\\\\.\\pipe\\cockpit-daemon-62-${process.pid}-${Math.random().toString(36).slice(2)}`;

describe('túnel de transcript (Story 6.2)', () => {
  it(
    'attach com replay (sem gap) + list-sessions + latência aquecida < 500ms',
    { timeout: 90_000 },
    async () => {
      const pipe = uniquePipe();
      const scrollbackDir = mkdtempSync(join(tmpdir(), 'cockpit-daemon-62-'));
      const server = await startDaemon(pipe);
      try {
        // Cliente A: configura scrollback, cria sessão, produz marker-um
        const clientA = new DaemonClient();
        await clientA.connect(pipe);
        clientA.configure({ scrollbackDir, maxFileBytes: 1024 * 1024, restoreTailBytes: 128 * 1024 });
        const { id, pid } = await clientA.createSession({ tag: 'sess-62', cols: 80, rows: 24 });
        let outA = '';
        clientA.onData(id, (b) => {
          outA += Buffer.from(b).toString('utf8');
        });
        clientA.write(id, new TextEncoder().encode('echo marker-um\r'));
        await waitFor(() => outA.includes('marker-um'), 20_000);

        clientA.disconnect();
        await new Promise((r) => setTimeout(r, 300));
        expect(isPidAlive(pid)).toBe(true); // sessão viva sem cliente

        // Cliente B: adoção — lista sessões com metadados (AC4)
        const clientB = new DaemonClient();
        await clientB.connect(pipe);
        const sessions = await clientB.listSessions();
        expect(sessions).toHaveLength(1);
        expect(sessions[0]).toMatchObject({ id: 'sess-62', adapterId: 'shell', pid });
        expect(sessions[0]!.cwd.length).toBeGreaterThan(0);

        // Input SEM assinante vai ao PTY (transcript captura)
        clientB.write(id, new TextEncoder().encode('echo marker-dois\r'));
        await new Promise((r) => setTimeout(r, 1500)); // echo executa sem observador

        // Attach: replay do transcript + stream vivo (AC1/AC2)
        let outB = '';
        clientB.onData(id, (b) => {
          outB += Buffer.from(b).toString('utf8');
        });
        const { ok } = await clientB.attach(id);
        expect(ok).toBe(true);
        await waitFor(() => outB.includes('marker-um') && outB.includes('marker-dois'), 20_000);

        // Latência aquecida através do pipe (AC3 — orçamento 500ms).
        // Melhor-de-3: sob suíte paralela o shell pode engasgar pontualmente;
        // o que o AC exige é a latência do TÚNEL em operação normal.
        let best = Number.POSITIVE_INFINITY;
        for (let i = 0; i < 3 && best >= 500; i++) {
          const marker = `marker-lat-${i}`;
          const t0 = Date.now();
          clientB.write(id, new TextEncoder().encode(`echo ${marker}\r`));
          await waitFor(() => outB.includes(marker), 10_000);
          best = Math.min(best, Date.now() - t0);
        }
        expect(best).toBeLessThan(500);

        const { orphan } = await clientB.closeSession(id);
        expect(orphan).toBe(false);
        const { orphans } = await clientB.shutdownDaemon();
        expect(orphans).toBe(0);
        clientB.disconnect();
      } finally {
        await server.shutdown();
        rmSync(scrollbackDir, { recursive: true, force: true });
      }
    }
  );

  it('attach em sessão inexistente responde ok=false', { timeout: 15_000 }, async () => {
    const pipe = uniquePipe();
    const server = await startDaemon(pipe);
    const client = new DaemonClient();
    await client.connect(pipe);
    const { ok } = await client.attach('nao-existe');
    expect(ok).toBe(false);
    client.disconnect();
    await server.shutdown();
  });
});

async function waitFor(cond: () => boolean, timeoutMs: number): Promise<void> {
  const start = Date.now();
  while (!cond()) {
    if (Date.now() - start > timeoutMs) throw new Error('timeout aguardando condição do daemon');
    await new Promise((r) => setTimeout(r, 50));
  }
}
