import { describe, expect, it } from 'vitest';
import { createConnection } from 'node:net';
import { isPidAlive } from './session-manager';
import { startDaemon } from './daemon-entry';
import { DaemonClient } from './daemon-client';
import { FrameDecoder, encodeControl } from './framing';
import type { DaemonOutbound } from './daemon-protocol';

/**
 * Integração do daemon com pipe REAL + PTY REAL (Story 6.1).
 * Sobrevivência CROSS-PROCESSO foi provada pelo spike (decisão crítica 5);
 * aqui valida-se em-processo que desconectar o cliente NÃO dispõe a sessão
 * (AC3) e que o contrato inteiro flui pelo framing (AC1/AC2).
 */

const uniquePipe = (): string => `\\\\.\\pipe\\cockpit-daemon-test-${process.pid}-${Math.random().toString(36).slice(2)}`;

describe('DaemonServer + DaemonClient (pipe real, PTY real)', () => {
  it(
    'create → echo → desconectar cliente (sessão VIVA) → reconectar → close → shutdown 0 órfãos',
    { timeout: 60_000 },
    async () => {
      const pipe = uniquePipe();
      const server = await startDaemon(pipe);

      // Cliente A: handshake + contrato básico
      const clientA = new DaemonClient();
      const { daemonPid } = await clientA.connect(pipe);
      expect(daemonPid).toBe(process.pid); // in-process: mesmo pid

      const adapters = await clientA.listAdapters();
      expect(adapters.map((a) => a.id)).toEqual(
        expect.arrayContaining(['shell', 'cmd', 'claude-code', 'codex', 'grok'])
      );

      const { id, pid } = await clientA.createSession({ tag: 'sess-6-1', cols: 80, rows: 24 });
      expect(id).toBe('sess-6-1'); // id do daemon = tag (preparo do attach 6.2)
      expect(isPidAlive(pid)).toBe(true);

      let output = '';
      clientA.onData(id, (bytes) => {
        output += Buffer.from(bytes).toString('utf8');
      });
      clientA.write(id, new TextEncoder().encode('echo daemon-roundtrip-61\r'));
      await waitFor(() => output.includes('daemon-roundtrip-61'), 20_000);
      clientA.resize(id, 100, 30); // não deve lançar

      // AC3: desconectar o cliente NÃO dispõe a sessão
      clientA.disconnect();
      await new Promise((r) => setTimeout(r, 500));
      expect(isPidAlive(pid)).toBe(true);
      expect(server.sessionCount()).toBe(1);

      // Cliente B reconecta e governa a MESMA sessão
      const clientB = new DaemonClient();
      await clientB.connect(pipe);
      const { orphan } = await clientB.closeSession(id);
      expect(orphan).toBe(false);
      await waitFor(() => !isPidAlive(pid), 10_000);

      const { orphans } = await clientB.shutdownDaemon();
      expect(orphans).toBe(0);
      clientB.disconnect();
    }
  );

  it(
    'create com label + initialInstruction: list-sessions expõe o label e o adapter entrega a instrução (17.1)',
    { timeout: 60_000 },
    async () => {
      const pipe = uniquePipe();
      const server = await startDaemon(pipe);
      const client = new DaemonClient();
      await client.connect(pipe);

      let output = '';
      const { id } = await client.createSession({
        tag: 'sess-17-1',
        cols: 80,
        rows: 24,
        adapterId: 'shell',
        label: '@dev',
        initialInstruction: 'echo dispatch-17-1',
        dispatchedBy: 'chefe-sessao-01'
      });
      // criador é o assinante: a saída do echo (instrução escrita no spawn) chega ao vivo
      client.onData(id, (bytes) => {
        output += Buffer.from(bytes).toString('utf8');
      });
      await waitFor(() => output.includes('dispatch-17-1'), 20_000);

      const sessions = await client.listSessions();
      expect(sessions).toEqual([
        // dispatchedBy propagado (17.2): insumo do vínculo worker→chefe na adoção
        expect.objectContaining({ id: 'sess-17-1', adapterId: 'shell', label: '@dev', dispatchedBy: 'chefe-sessao-01' })
      ]);

      await client.closeSession(id);
      const { orphans } = await client.shutdownDaemon();
      expect(orphans).toBe(0);
      client.disconnect();
      await server.shutdown();
    }
  );

  it('handshake com versão errada recebe hello-error', { timeout: 15_000 }, async () => {
    const pipe = uniquePipe();
    const server = await startDaemon(pipe);

    const socket = createConnection(pipe);
    await new Promise<void>((resolve, reject) => {
      socket.once('connect', resolve);
      socket.once('error', reject);
    });
    const decoder = new FrameDecoder();
    const messages: DaemonOutbound[] = [];
    socket.on('data', (chunk) => {
      for (const f of decoder.push(chunk)) {
        if (f.kind === 'control') messages.push(f.message as DaemonOutbound);
      }
    });
    socket.write(encodeControl({ type: 'hello', protocolVersion: 999 }));
    await waitFor(() => messages.length > 0, 10_000);
    expect(messages[0]!.type).toBe('hello-error');
    socket.destroy();
    await server.shutdown();
  });
});

async function waitFor(cond: () => boolean, timeoutMs: number): Promise<void> {
  const start = Date.now();
  while (!cond()) {
    if (Date.now() - start > timeoutMs) throw new Error('timeout aguardando condição do daemon');
    await new Promise((r) => setTimeout(r, 100));
  }
}
