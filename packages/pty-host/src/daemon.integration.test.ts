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

  it(
    'set-label: tile criado SEM label (caminho da UI) ganha nome depois, e a renomeação chega ao list-sessions (Story 20.1)',
    { timeout: 60_000 },
    async () => {
      const pipe = uniquePipe();
      const server = await startDaemon(pipe);

      // O Main cria a sessão como a UI cria hoje: sem `label` nenhum. É esse
      // anonimato que fazia o reuso por nome do agente nunca casar um tile
      // aberto pelo Cockpit — e o despacho abrir um segundo "@dev".
      const main = new DaemonClient();
      await main.connect(pipe);
      const { id } = await main.createSession({ tag: 'sess-20-1', cols: 80, rows: 24, adapterId: 'shell' });
      expect((await main.listSessions())[0]).not.toHaveProperty('label');

      main.setLabel(id, '@dev');
      // A CLI é um cliente SEPARADO — é ela quem precisa enxergar o nome.
      const cli = new DaemonClient();
      await cli.connect(pipe);
      await waitFor(async () => (await cli.listSessions())[0]?.label === '@dev', 10_000);

      // Renomear na UI reflete no daemon (o listener assina 'renamed' também).
      main.setLabel(id, '@dev-refatoracao');
      await waitFor(async () => (await cli.listSessions())[0]?.label === '@dev-refatoracao', 10_000);

      // Sessão inexistente é no-op silencioso (tile fechado entre o rename e o frame).
      main.setLabel('sessao-que-nao-existe', '@fantasma');
      expect(await cli.listSessions()).toHaveLength(1);

      await main.closeSession(id);
      const { orphans } = await main.shutdownDaemon();
      expect(orphans).toBe(0);
      main.disconnect();
      cli.disconnect();
      await server.shutdown();
    }
  );

  it(
    'dispatch-choice: sem app conectado a pergunta é RECUSADA; com app, ela espera e o app a consome (Story 20.3)',
    { timeout: 30_000 },
    async () => {
      const pipe = uniquePipe();
      const server = await startDaemon(pipe);

      const choice = {
        id: 'choice-1',
        agent: '@dev',
        task: 'seguir a story 20.3',
        instruction: 'Você é o agente "@dev". Tarefa: seguir a story 20.3',
        targetId: 'tile-dev',
        targetLabel: '@dev',
        adapterId: 'claude-code',
        cwd: 'F:/Projetos/Meu Cockpit',
        createdAt: Date.now()
      };

      // A CLI é um cliente que NUNCA manda `configure` — é assim que o daemon
      // sabe que ela não é o app. Sem Cockpit aberto, não há fila de Decisões:
      // recusar aqui é o que faz a CLI cair no enfileiramento em vez de deixar
      // a tarefa presa numa pergunta que ninguém veria.
      const cli = new DaemonClient();
      await cli.connect(pipe);
      const semApp = await cli.pushDispatchChoice(choice);
      expect(semApp.accepted).toBe(false);
      expect(await cli.listDispatchChoices()).toEqual([]);

      // App conecta e se identifica pelo `configure` (o que só ele manda).
      const app = new DaemonClient();
      await app.connect(pipe);
      app.configure({ scrollbackDir: 'F:/tmp/scrollback', maxFileBytes: 1024, restoreTailBytes: 256 });
      await new Promise((r) => setTimeout(r, 200));

      const comApp = await cli.pushDispatchChoice(choice);
      expect(comApp.accepted).toBe(true);
      expect(await app.listDispatchChoices()).toEqual([choice]);

      // Humano decidiu: o Main executa a ação e remove a pendência.
      app.resolveDispatchChoice(choice.id);
      await waitFor(async () => (await app.listDispatchChoices()).length === 0, 5_000);

      cli.disconnect();
      app.disconnect();
      await server.shutdown();
    }
  );

  it(
    'dispatch-history: cache começa vazio, um cliente empurra e OUTRO cliente lê o mesmo snapshot (Story 18.5)',
    { timeout: 30_000 },
    async () => {
      const pipe = uniquePipe();
      const server = await startDaemon(pipe);

      // CLI (agent-dispatch) consulta ANTES de qualquer push do Main — AC3:
      // sem histórico, o cache vem vazio, nunca lança.
      const cli = new DaemonClient();
      await cli.connect(pipe);
      expect(await cli.listDispatchHistory()).toEqual([]);

      // Main empurra o snapshot numa conexão SEPARADA — mesmo padrão real
      // (DaemonManager do Main é um cliente distinto da CLI).
      const main = new DaemonClient();
      await main.connect(pipe);
      main.pushDispatchHistory([{ adapterId: 'claude-code', done: 2, error: 1 }]);

      // Push é fire-and-forget (sem ack) — poll até o cache do daemon refletir.
      const deadline = Date.now() + 10_000;
      let counts: Awaited<ReturnType<typeof cli.listDispatchHistory>> = [];
      while (Date.now() < deadline) {
        counts = await cli.listDispatchHistory();
        if (counts.length > 0) break;
        await new Promise((r) => setTimeout(r, 100));
      }
      expect(counts).toEqual([{ adapterId: 'claude-code', done: 2, error: 1 }]);

      cli.disconnect();
      main.disconnect();
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

// Condição pode ser assíncrona (Story 20.1: a checagem é um `list-sessions`
// round-trip pelo pipe, não uma variável local acumulada por `onData`).
async function waitFor(cond: () => boolean | Promise<boolean>, timeoutMs: number): Promise<void> {
  const start = Date.now();
  while (!(await cond())) {
    if (Date.now() - start > timeoutMs) throw new Error('timeout aguardando condição do daemon');
    await new Promise((r) => setTimeout(r, 100));
  }
}
