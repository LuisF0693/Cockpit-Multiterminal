import { createServer, type Server, type Socket } from 'node:net';
import { dirname, join } from 'node:path';
import type { AgentStatus } from '@cockpit/shared';
import type { AgentSession } from '@cockpit/adapter-contract';
import type { AdapterRegistry } from './adapter-registry';
import { ScrollbackWriter, readScrollbackTail } from './scrollback-writer';
import { FrameDecoder, encodeControl, encodeData } from './framing';
import { DAEMON_PROTOCOL_VERSION, type AdapterOutcomeCount, type DaemonInbound, type DaemonOutbound } from './daemon-protocol';

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
  /** Cliente atualmente assinado — troca no attach (6.2). */
  subscriber: Socket | null;
  writer: ScrollbackWriter | null;
  unsubscribes: Array<() => void>;
  outstanding: number;
  holding: Uint8Array[];
  /** Metadados p/ list-sessions/adoção (6.2). */
  adapterId: string;
  cwd: string;
  pid: number;
  lastStatus: AgentStatus;
  createdAt: number;
  /** Nome dado pelo cliente no create (17.1) — preservado na adoção. */
  label: string | undefined;
  /** Sessão do chefe que despachou (17.2) — preservado na adoção. */
  dispatchedBy: string | undefined;
}

export class DaemonServer {
  private server: Server | null = null;
  private readonly sessions = new Map<string, DaemonSession>();
  private scrollbackConfig: { dir: string; maxFileBytes: number; restoreTailBytes: number } | null = null;
  private shuttingDown = false;
  /** Cache do histórico de despachos (Story 18.5) — empurrado pelo Main, servido a qualquer cliente. */
  private dispatchHistoryCache: AdapterOutcomeCount[] = [];
  /** Pipe path armazenado em listen() — injetado no env de todo PTY (P0). */
  private pipePath = '';

  constructor(private readonly registry: AdapterRegistry) {}

  listen(pipePath: string): Promise<void> {
    this.pipePath = pipePath;
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
            const adapterId = msg.adapterId ?? DEFAULT_ADAPTER;
            const adapter = this.registry.get(adapterId);
            const cwd = msg.cwd ?? process.cwd();
            const session = await adapter.spawn({
              cwd,
              cols: msg.cols,
              rows: msg.rows,
              env: this.buildSessionEnv(msg.tag, msg.cwd),
              ...(msg.args !== undefined ? { args: msg.args } : {}),
              ...(msg.initialInstruction !== undefined ? { initialInstruction: msg.initialInstruction } : {})
            });
            const hosted: DaemonSession = {
              session,
              subscriber: socket,
              writer: null,
              unsubscribes: [],
              outstanding: 0,
              holding: [],
              adapterId,
              cwd,
              pid: session.pid,
              lastStatus: 'working',
              createdAt: Date.now(),
              label: msg.label,
              dispatchedBy: msg.dispatchedBy
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
      case 'attach': {
        // 6.2: replay SEM gap/dup — flush+tail+swap são síncronos; onData só
        // roda depois deste handler devolver o event loop.
        const hosted = this.sessions.get(msg.id);
        if (!hosted) {
          this.send(socket, { type: 'attached', requestId: msg.requestId, id: msg.id, ok: false });
          break;
        }
        hosted.subscriber = socket;
        hosted.outstanding = 0; // acks do socket antigo morreram com ele
        hosted.holding = [];
        this.send(socket, { type: 'attached', requestId: msg.requestId, id: msg.id, ok: true });
        if (this.scrollbackConfig) {
          hosted.writer?.flush();
          const tail = readScrollbackTail(
            join(this.scrollbackConfig.dir, `${msg.id}.log`),
            msg.tailBytes ?? this.scrollbackConfig.restoreTailBytes
          );
          if (tail.byteLength > 0) this.deliver(msg.id, hosted, tail);
        }
        break;
      }
      case 'list-sessions': {
        this.send(socket, {
          type: 'sessions',
          requestId: msg.requestId,
          sessions: [...this.sessions.entries()].map(([id, s]) => ({
            id,
            adapterId: s.adapterId,
            pid: s.pid,
            status: s.lastStatus,
            cwd: s.cwd,
            createdAt: s.createdAt,
            ...(s.label !== undefined ? { label: s.label } : {}),
            ...(s.dispatchedBy !== undefined ? { dispatchedBy: s.dispatchedBy } : {})
          }))
        });
        break;
      }
      case 'data-ack': {
        const hosted = this.sessions.get(msg.id);
        if (!hosted) break;
        hosted.outstanding = Math.max(0, hosted.outstanding - msg.n);
        while (hosted.holding.length > 0 && hosted.outstanding < LOW_WATER_BYTES) {
          this.deliver(msg.id, hosted, hosted.holding.shift()!);
        }
        break;
      }
      case 'ping': {
        this.send(socket, {
          type: 'pong',
          requestId: msg.requestId,
          daemonPid: process.pid,
          sessions: this.sessions.size,
          protocolVersion: DAEMON_PROTOCOL_VERSION
        });
        break;
      }
      case 'shutdown': {
        void this.shutdown().then((orphans) => {
          this.send(socket, { type: 'shutdown-done', requestId: msg.requestId, orphans });
        });
        break;
      }
      case 'dispatch-history-push':
        this.dispatchHistoryCache = msg.counts;
        break;
      case 'dispatch-history':
        this.send(socket, { type: 'dispatch-history-result', requestId: msg.requestId, counts: this.dispatchHistoryCache });
        break;
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
        hosted.lastStatus = status;
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

  /**
   * Env vars injetadas em todo PTY spawned pelo daemon (P0/P4):
   * - COCKPIT_DAEMON_PIPE    → pipe deste daemon (permite agent-dispatch sem --pipe)
   * - COCKPIT_SESSION_ID     → id da sessão criada (permite --link-from automático)
   * - COCKPIT_DISPATCH_CMD   → caminho absoluto do agent-dispatch.js (se detectável)
   * - COCKPIT_SCRATCHPAD_DIR → diretório de scratchpad do projeto (P4)
   */
  private buildSessionEnv(sessionId: string, cwd?: string): Record<string, string> {
    const env: Record<string, string> = {
      COCKPIT_DAEMON_PIPE: this.pipePath,
      COCKPIT_SESSION_ID: sessionId,
      COCKPIT_SCRATCHPAD_DIR: join(cwd ?? process.cwd(), '.cockpit', 'scratchpad')
    };
    const entry = process.argv[1];
    if (entry) {
      env['COCKPIT_DISPATCH_CMD'] = join(dirname(entry), 'agent-dispatch.js');
    }
    return env;
  }
}
