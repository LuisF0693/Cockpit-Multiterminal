import { createConnection, type Socket } from 'node:net';
import { FrameDecoder, encodeControl, encodeData } from './framing';
import {
  DAEMON_PROTOCOL_VERSION,
  type DaemonInbound,
  type DaemonOutbound,
  type DaemonSessionInfo
} from './daemon-protocol';

/**
 * DaemonClient (Story 6.1) — lado cliente do túnel: handshake versionado,
 * requests com correlação por requestId, dados binários por sessão com
 * data-ack automático (o daemon segura acima do HIGH_WATER).
 * Consumidores: testes de integração agora; Main do app na Story 6.3.
 */

type Pending =
  | { kind: 'create'; resolve: (v: { id: string; pid: number }) => void; reject: (e: Error) => void }
  | { kind: 'close'; resolve: (v: { orphan: boolean }) => void; reject: (e: Error) => void }
  | { kind: 'adapters'; resolve: (v: Array<{ id: string; displayName: string }>) => void; reject: (e: Error) => void }
  | { kind: 'attach'; resolve: (v: { ok: boolean }) => void; reject: (e: Error) => void }
  | { kind: 'sessions'; resolve: (v: DaemonSessionInfo[]) => void; reject: (e: Error) => void }
  | {
      kind: 'ping';
      resolve: (v: { daemonPid: number; sessions: number; protocolVersion: number }) => void;
      reject: (e: Error) => void;
    }
  | { kind: 'shutdown'; resolve: (v: { orphans: number }) => void; reject: (e: Error) => void };

const REQUEST_TIMEOUT_MS = 10_000;

export class DaemonClient {
  private socket: Socket | null = null;
  private seq = 0;
  /** autoAck=false (Main/proxy): acks vêm do renderer via ack() — 6.3. */
  private readonly autoAck: boolean;

  constructor(opts?: { autoAck?: boolean }) {
    this.autoAck = opts?.autoAck ?? true;
  }
  private readonly pending = new Map<number, Pending>();
  private readonly dataListeners = new Map<string, (bytes: Uint8Array) => void>();
  private exitListener: ((id: string, exitCode: number) => void) | null = null;
  private statusListener: ((id: string, status: string, detail?: string) => void) | null = null;
  private closeListener: (() => void) | null = null;

  /** Conecta e completa o handshake; rejeita em versão incompatível. */
  async connect(pipePath: string): Promise<{ daemonPid: number }> {
    const socket = createConnection(pipePath);
    this.socket = socket;
    const decoder = new FrameDecoder();
    const helloAck = new Promise<{ daemonPid: number }>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timeout no handshake do daemon')), REQUEST_TIMEOUT_MS);
      socket.on('data', (chunk) => {
        for (const frame of decoder.push(chunk)) {
          if (frame.kind === 'data') {
            this.dataListeners.get(frame.sessionId)?.(frame.bytes);
            if (this.autoAck) this.post({ type: 'data-ack', id: frame.sessionId, n: frame.bytes.byteLength });
            continue;
          }
          const msg = frame.message as DaemonOutbound;
          if (msg.type === 'hello-ack') {
            clearTimeout(timer);
            resolve({ daemonPid: msg.daemonPid });
            continue;
          }
          if (msg.type === 'hello-error') {
            clearTimeout(timer);
            reject(new Error(msg.message));
            continue;
          }
          this.onMessage(msg);
        }
      });
      socket.once('error', (err) => {
        clearTimeout(timer);
        reject(err instanceof Error ? err : new Error(String(err)));
      });
    });
    // Falha ANTES do connect (daemon ainda subindo): helloAck rejeita sem
    // awaiter — marcar como tratada evita unhandled rejection no retry loop.
    helloAck.catch(() => void 0);
    await new Promise<void>((resolve, reject) => {
      socket.once('connect', resolve);
      socket.once('error', reject);
    });
    socket.on('close', () => this.closeListener?.());
    this.post({ type: 'hello', protocolVersion: DAEMON_PROTOCOL_VERSION });
    return await helloAck;
  }

  configure(config: { scrollbackDir: string; maxFileBytes: number; restoreTailBytes: number }): void {
    this.post({ type: 'configure', ...config });
  }

  async createSession(opts: {
    tag: string;
    cols: number;
    rows: number;
    cwd?: string;
    adapterId?: string;
    restore?: boolean;
    args?: string[];
  }): Promise<{ id: string; pid: number }> {
    return await this.request('create', (requestId) => ({
      type: 'create',
      requestId,
      tag: opts.tag,
      cols: opts.cols,
      rows: opts.rows,
      ...(opts.cwd !== undefined ? { cwd: opts.cwd } : {}),
      ...(opts.adapterId !== undefined ? { adapterId: opts.adapterId } : {}),
      ...(opts.restore !== undefined ? { restore: opts.restore } : {}),
      ...(opts.args !== undefined ? { args: opts.args } : {})
    }));
  }

  write(sessionId: string, bytes: Uint8Array): void {
    this.socket?.write(encodeData(sessionId, bytes));
  }

  /** Ack manual (autoAck=false): repassa a confirmação do consumidor final. */
  ack(sessionId: string, n: number): void {
    this.post({ type: 'data-ack', id: sessionId, n });
  }

  resize(sessionId: string, cols: number, rows: number): void {
    this.post({ type: 'resize', id: sessionId, cols, rows });
  }

  async closeSession(sessionId: string): Promise<{ orphan: boolean }> {
    return await this.request('close', (requestId) => ({ type: 'close', requestId, id: sessionId }));
  }

  async listAdapters(): Promise<Array<{ id: string; displayName: string }>> {
    return await this.request('adapters', (requestId) => ({ type: 'list-adapters', requestId }));
  }

  /**
   * Assina uma sessão viva (6.2): registre onData ANTES de chamar — o replay
   * do transcript chega como frames de dados logo após o 'attached'.
   */
  async attach(sessionId: string, tailBytes?: number): Promise<{ ok: boolean }> {
    return await this.request('attach', (requestId) => ({
      type: 'attach',
      requestId,
      id: sessionId,
      ...(tailBytes !== undefined ? { tailBytes } : {})
    }));
  }

  /** Sessões vivas no daemon (6.2) — insumo da adoção no boot (6.3). */
  async listSessions(): Promise<DaemonSessionInfo[]> {
    return await this.request('sessions', (requestId) => ({ type: 'list-sessions', requestId }));
  }

  /** Heartbeat (6.4): prova de vida do daemon. */
  async ping(): Promise<{ daemonPid: number; sessions: number; protocolVersion: number }> {
    return await this.request('ping', (requestId) => ({ type: 'ping', requestId }));
  }

  async shutdownDaemon(): Promise<{ orphans: number }> {
    return await this.request('shutdown', (requestId) => ({ type: 'shutdown', requestId }));
  }

  onData(sessionId: string, cb: (bytes: Uint8Array) => void): () => void {
    this.dataListeners.set(sessionId, cb);
    return () => this.dataListeners.delete(sessionId);
  }

  onSessionExit(cb: (id: string, exitCode: number) => void): void {
    this.exitListener = cb;
  }

  onSessionStatus(cb: (id: string, status: string, detail?: string) => void): void {
    this.statusListener = cb;
  }

  onClose(cb: () => void): void {
    this.closeListener = cb;
  }

  /** Encerra só a CONEXÃO — sessões seguem vivas no daemon (AC3). */
  disconnect(): void {
    this.socket?.destroy();
    this.socket = null;
  }

  private onMessage(msg: DaemonOutbound): void {
    switch (msg.type) {
      case 'created': {
        const p = this.takePending(msg.requestId);
        if (p?.kind === 'create') p.resolve({ id: msg.id, pid: msg.pid });
        break;
      }
      case 'create-error': {
        this.takePending(msg.requestId)?.reject(new Error(msg.message));
        break;
      }
      case 'closed': {
        const p = this.takePending(msg.requestId);
        if (p?.kind === 'close') p.resolve({ orphan: msg.orphan });
        break;
      }
      case 'adapters': {
        const p = this.takePending(msg.requestId);
        if (p?.kind === 'adapters') p.resolve(msg.adapters);
        break;
      }
      case 'attached': {
        const p = this.takePending(msg.requestId);
        if (p?.kind === 'attach') p.resolve({ ok: msg.ok });
        break;
      }
      case 'sessions': {
        const p = this.takePending(msg.requestId);
        if (p?.kind === 'sessions') p.resolve(msg.sessions);
        break;
      }
      case 'pong': {
        const p = this.takePending(msg.requestId);
        if (p?.kind === 'ping') {
          p.resolve({ daemonPid: msg.daemonPid, sessions: msg.sessions, protocolVersion: msg.protocolVersion });
        }
        break;
      }
      case 'shutdown-done': {
        const p = this.takePending(msg.requestId);
        if (p?.kind === 'shutdown') p.resolve({ orphans: msg.orphans });
        break;
      }
      case 'session-exit':
        this.exitListener?.(msg.id, msg.exitCode);
        break;
      case 'session-status':
        this.statusListener?.(msg.id, msg.status, msg.detail);
        break;
      case 'hello-ack':
      case 'hello-error':
        break; // tratados no connect
    }
  }

  private async request<T>(kind: Pending['kind'], build: (requestId: number) => DaemonInbound): Promise<T> {
    const requestId = ++this.seq;
    return await new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error(`timeout no request ${kind} ao daemon`));
      }, REQUEST_TIMEOUT_MS);
      this.pending.set(requestId, {
        kind,
        resolve: (v: never) => {
          clearTimeout(timer);
          resolve(v as T);
        },
        reject: (e: Error) => {
          clearTimeout(timer);
          reject(e);
        }
      } as Pending);
      this.post(build(requestId));
    });
  }

  private takePending(requestId: number): Pending | undefined {
    const p = this.pending.get(requestId);
    this.pending.delete(requestId);
    return p;
  }

  private post(msg: DaemonInbound): void {
    this.socket?.write(encodeControl(msg));
  }
}
