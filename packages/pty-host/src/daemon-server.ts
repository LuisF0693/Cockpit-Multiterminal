import { createServer, type Server, type Socket } from 'node:net';
import { join } from 'node:path';
import type { AgentSession } from '@cockpit/adapter-contract';
import type { AdapterRegistry } from './adapter-registry';
import { ScrollbackWriter, readScrollbackTail } from './scrollback-writer';
import { FrameDecoder, encodeControl, encodeData } from './framing';
import { DAEMON_PROTOCOL_VERSION, type DaemonInbound, type DaemonOutbound } from './daemon-protocol';

/**
 * DaemonServer (Story 6.1, decisão crítica 5) — hospeda sessões PTY num
 * processo PRÓPRIO, servidas por named pipe. Desconectar um cliente NUNCA
 * dispõe sessões (AC3): elas seguem vivas alimentando o scrollback; um novo
 * cliente reconecta (attach pleno chega na 6.2 — aqui a sessão fica sem
 * assinante até lá). Backpressure espelha o host: HIGH/LOW water por sessão.
 */

const HIGH_WATER_BYTES = 512 * 1024;
const LOW_WATER_BYTES = 128 * 1024;
const DEFAULT_ADAPTER = 'shell';

interface DaemonSession {
  session: AgentSession;
  /** Cliente atualmente assinado (o que criou; reassinatura na 6.2). */
  subscriber: Socket | null;
  writer: ScrollbackWriter | null;
  unsubscribes: Array<() => void>;
  outstanding: number;
  holding: Uint8Array[];
}

export class DaemonServer {
  private server: Server | null = null;
  private readonly sessions = new Map<string, DaemonSession>();
  private scrollbackConfig: { dir: string; maxFileBytes: number; restoreTailBytes: number } | null = null;
  private shuttingDown = false;

  constructor(private readonly registry: AdapterRegistry) {}

  listen(pipePath: string): Promise<void> {
    const server = createServer((socket) => this.onConnection(socket));
    this.server = server;
    return new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(pipePath, () => {
        server.removeListener('error', reject);
        resolve();
      });
    });
  }

  /** Dispose de TODAS as sessões (0 órfãos — critério (d) do spike). */
  async shutdown(): Promise<number> {
    this.shuttingDown = true;
    let orphans = 0;
    for (const [id, s] of [...this.sessions.entries()]) {
      try {
        await s.session.dispose();
      } catch {
        orphans++;
      }
      this.disposeWiring(id);
    }
    this.server?.close();
    this.server = null;
    return orphans;
  }

  sessionCount(): number {
    return this.sessions.size;
  }

  private onConnection(socket: Socket): void {
    const decoder = new FrameDecoder();
    let helloDone = false;
    socket.on('data', (chunk) => {
      let frames;
      try {
        frames = decoder.push(chunk);
      } catch (err) {
        console.error('[daemon] frame inválido — derrubando conexão:', err);
        socket.destroy();
        return;
      }
      for (const frame of frames) {
        if (frame.kind === 'data') {
          // Input de teclado do cliente → PTY.
          this.sessions.get(frame.sessionId)?.session.write(Buffer.from(frame.bytes).toString('utf8'));
          continue;
        }
        const msg = frame.message as DaemonInbound;
        if (!helloDone) {
          if (msg.type !== 'hello' || msg.protocolVersion !== DAEMON_PROTOCOL_VERSION) {
            this.send(socket, {
              type: 'hello-error',
              message: `handshake inválido (esperado hello v${DAEMON_PROTOCOL_VERSION})`
            });
            socket.end();
            return;
          }
          helloDone = true;
          this.send(socket, { type: 'hello-ack', protocolVersion: DAEMON_PROTOCOL_VERSION, daemonPid: process.pid });
          continue;
        }
        this.onMessage(socket, msg);
      }
    });
    // AC3: desconexão NÃO dispõe sessões — só solta a assinatura.
    socket.on('close', () => {
      for (const s of this.sessions.values()) {
        if (s.subscriber === socket) s.subscriber = null;
      }
    });
    socket.on('error', () => void 0);
  }

  private onMessage(socket: Socket, msg: DaemonInbound): void {
    switch (msg.type) {
      case 'hello':
        break; // já tratado no handshake
      case 'configure':
        this.scrollbackConfig = {
          dir: msg.scrollbackDir,
          maxFileBytes: msg.maxFileBytes,
          restoreTailBytes: msg.restoreTailBytes
        };
        break;
      case 'create': {
        void (async () => {
          try {
            if (this.sessions.has(msg.tag)) throw new Error(`sessão já existe no daemon: ${msg.tag}`);
            const adapter = this.registry.get(msg.adapterId ?? DEFAULT_ADAPTER);
            const session = await adapter.spawn({
              cwd: msg.cwd ?? process.cwd(),
              cols: msg.cols,
              rows: msg.rows
            });
            const hosted: DaemonSession = {
              session,
              subscriber: socket,
              writer: null,
              unsubscribes: [],
              outstanding: 0,
              holding: []
            };
            this.sessions.set(msg.tag, hosted);
            this.wireSession(msg.tag, hosted, msg.restore === true);
            this.send(socket, { type: 'created', requestId: msg.requestId, id: msg.tag, pid: session.pid });
          } catch (err) {
            this.send(socket, {
              type: 'create-error',
              requestId: msg.requestId,
              message: err instanceof Error ? err.message : String(err)
            });
          }
        })();
        break;
      }
      case 'resize':
        this.sessions.get(msg.id)?.session.resize(msg.cols, msg.rows);
        break;
      case 'close': {
        const hosted = this.sessions.get(msg.id);
        if (!hosted) {
          this.send(socket, { type: 'closed', requestId: msg.requestId, id: msg.id, orphan: false });
          break;
        }
        void hosted.session
          .dispose()
          .then(() => this.send(socket, { type: 'closed', requestId: msg.requestId, id: msg.id, orphan: false }))
          .catch(() => this.send(socket, { type: 'closed', requestId: msg.requestId, id: msg.id, orphan: true }))
          .finally(() => this.disposeWiring(msg.id));
        break;
      }
      case 'list-adapters':
        this.send(socket, { type: 'adapters', requestId: msg.requestId, adapters: this.registry.list() });
        break;
      case 'data-ack': {
        const hosted = this.sessions.get(msg.id);
        if (!hosted) break;
        hosted.outstanding = Math.max(0, hosted.outstanding - msg.n);
        while (hosted.holding.length > 0 && hosted.outstanding < LOW_WATER_BYTES) {
          this.deliver(msg.id, hosted, hosted.holding.shift()!);
        }
        break;
      }
      case 'shutdown': {
        void this.shutdown().then((orphans) => {
          this.send(socket, { type: 'shutdown-done', requestId: msg.requestId, orphans });
        });
        break;
      }
    }
  }

  private wireSession(id: string, hosted: DaemonSession, restore: boolean): void {
    const file = this.scrollbackConfig ? join(this.scrollbackConfig.dir, `${id}.log`) : null;
    if (file && restore && this.scrollbackConfig) {
      const tail = readScrollbackTail(file, this.scrollbackConfig.restoreTailBytes);
      if (tail.byteLength > 0) this.deliver(id, hosted, tail);
    }
    hosted.writer = file ? new ScrollbackWriter(file, this.scrollbackConfig?.maxFileBytes) : null;

    hosted.unsubscribes.push(
      hosted.session.onData((chunk) => {
        const bytes = new Uint8Array(chunk);
        hosted.writer?.append(bytes);
        if (hosted.outstanding > HIGH_WATER_BYTES) {
          hosted.holding.push(bytes);
          return;
        }
        this.deliver(id, hosted, bytes);
      })
    );
    hosted.unsubscribes.push(
      hosted.session.onStatus((status, detail) => {
        this.broadcast(id, { type: 'session-status', id, status, ...(detail !== undefined ? { detail } : {}) });
      })
    );
    hosted.unsubscribes.push(
      hosted.session.onExit((code) => {
        this.broadcast(id, { type: 'session-exit', id, exitCode: code ?? -1 });
        if (!this.shuttingDown) this.disposeWiring(id);
      })
    );
  }

  private deliver(id: string, hosted: DaemonSession, bytes: Uint8Array): void {
    hosted.outstanding += bytes.byteLength;
    const sub = hosted.subscriber;
    if (sub && !sub.destroyed) sub.write(encodeData(id, bytes));
    // Sem assinante: bytes já foram ao scrollback; replay pleno vem na 6.2.
  }

  private broadcast(id: string, msg: DaemonOutbound): void {
    const sub = this.sessions.get(id)?.subscriber;
    if (sub && !sub.destroyed) this.send(sub, msg);
  }

  private send(socket: Socket, msg: DaemonOutbound): void {
    if (!socket.destroyed) socket.write(encodeControl(msg));
  }

  private disposeWiring(id: string): void {
    const hosted = this.sessions.get(id);
    if (!hosted) return;
    for (const unsub of hosted.unsubscribes) unsub();
    hosted.unsubscribes.length = 0;
    hosted.writer?.dispose();
    hosted.writer = null;
    this.sessions.delete(id);
  }
}
