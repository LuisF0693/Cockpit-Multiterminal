import { MessageChannelMain, app } from 'electron';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { DaemonClient, DEFAULT_DAEMON_PIPE, type AdapterOutcomeCount, type DaemonSessionInfo } from '@cockpit/pty-host';
import type { ScrollbackConfig } from './pty-host-manager';

/**
 * DaemonManager (Story 6.3) — o Main como CLIENTE do cockpit-daemon.
 * Mesma superfície do PtyHostManager (backend estrutural do session-ipc),
 * mais listSessions/adoptPty. O Main vira proxy pipe↔MessagePort por sessão:
 * renderer e adapters não percebem a migração (NFR7 + decisão crítica 4 —
 * os dados agora atravessam o Main, custo aceito pela sobrevivência).
 */

const CONNECT_RETRIES = 20;
const CONNECT_RETRY_MS = 300;
/** Backoff da reconexão (6.4) — daemon vivo com conexão quebrada é raro. */
const RECONNECT_DELAYS_MS = [500, 1000, 2000, 4000, 8000];

/** Estado do vínculo com o daemon (badge da UI — Story 6.4). */
export type DaemonState = 'starting' | 'connected' | 'reconnecting' | 'disconnected';

interface ProxiedSession {
  port1: Electron.MessagePortMain;
  /** Entrega ao renderer — reassinada a cada (re)conexão. */
  deliver: (bytes: Uint8Array) => void;
}

export class DaemonManager {
  private client: DaemonClient | null = null;
  private readonly proxies = new Map<string, ProxiedSession>();
  private readonly liveInfo = new Map<string, DaemonSessionInfo>();
  private scrollbackConfig: ScrollbackConfig | null = null;
  private shuttingDown = false;
  private sessionExitListener: ((ptyId: string, exitCode: number) => void) | null = null;
  private sessionStatusListener: ((ptyId: string, status: string) => void) | null = null;
  private hostExitListener: (() => void) | null = null;
  private stateListener: ((state: DaemonState) => void) | null = null;

  constructor(private readonly pipePath: string = DEFAULT_DAEMON_PIPE) {}

  /** Connect-or-spawn (6.3): daemon vivo → conecta; ausente → sobe detached. */
  async start(): Promise<void> {
    try {
      await this.connect();
      console.log('[daemon] conectado a daemon existente');
      this.setState('connected');
      return;
    } catch {
      this.setState('starting');
      this.spawnDaemon();
    }
    let lastError: unknown = null;
    for (let i = 0; i < CONNECT_RETRIES; i++) {
      await new Promise((r) => setTimeout(r, CONNECT_RETRY_MS));
      try {
        await this.connect();
        console.log('[daemon] daemon iniciado e conectado');
        this.setState('connected');
        return;
      } catch (err) {
        lastError = err;
      }
    }
    this.setState('disconnected');
    throw new Error(`daemon não respondeu após spawn: ${String(lastError)}`);
  }

  /** Badge da UI (6.4): estados do vínculo Main↔daemon. */
  onStateChange(cb: (state: DaemonState) => void): void {
    this.stateListener = cb;
  }

  private setState(state: DaemonState): void {
    this.stateListener?.(state);
  }

  configure(config: ScrollbackConfig): void {
    this.scrollbackConfig = config;
    this.client?.configure({
      scrollbackDir: config.scrollbackDir,
      maxFileBytes: config.maxFileBytes,
      restoreTailBytes: config.restoreTailBytes
    });
  }

  onSessionExit(cb: (ptyId: string, exitCode: number) => void): void {
    this.sessionExitListener = cb;
  }

  onSessionStatus(cb: (ptyId: string, status: string) => void): void {
    this.sessionStatusListener = cb;
  }

  onHostExit(cb: () => void): void {
    this.hostExitListener = cb;
  }

  async listAdapters(): Promise<Array<{ id: string; displayName: string }>> {
    return await this.requireClient().listAdapters();
  }

  /** Sessões vivas no daemon (insumo da adoção — AC2). */
  async listSessions(): Promise<DaemonSessionInfo[]> {
    const sessions = await this.requireClient().listSessions();
    this.liveInfo.clear();
    for (const s of sessions) this.liveInfo.set(s.id, s);
    return sessions;
  }

  async createPty(opts: {
    sessionId: string;
    cols: number;
    rows: number;
    cwd?: string;
    adapterId?: string;
    restore?: boolean;
    args?: string[];
  }): Promise<{ ptyId: string; pid: number; rendererPort: Electron.MessagePortMain }> {
    const client = this.requireClient();
    const { id, pid } = await client.createSession({
      tag: opts.sessionId,
      cols: opts.cols,
      rows: opts.rows,
      ...(opts.cwd !== undefined ? { cwd: opts.cwd } : {}),
      ...(opts.adapterId !== undefined ? { adapterId: opts.adapterId } : {}),
      ...(opts.restore !== undefined ? { restore: opts.restore } : {}),
      ...(opts.args !== undefined ? { args: opts.args } : {})
    });
    return { ptyId: id, pid, rendererPort: this.buildProxy(id) };
  }

  /** Adota sessão viva (AC2): attach com replay + proxy novo (AC3). */
  async adoptPty(sessionId: string): Promise<{ pid: number; rendererPort: Electron.MessagePortMain }> {
    const client = this.requireClient();
    // Porta antes do attach: o replay chega logo após o 'attached' e a
    // MessagePortMain bufferiza até o renderer reclamar (fluxo da 1.4).
    const rendererPort = this.buildProxy(sessionId);
    const { ok } = await client.attach(sessionId);
    if (!ok) {
      this.disposeProxy(sessionId);
      throw new Error(`attach falhou: sessão ${sessionId} não existe no daemon`);
    }
    return { pid: this.liveInfo.get(sessionId)?.pid ?? -1, rendererPort };
  }

  async closePty(ptyId: string): Promise<{ orphan: boolean }> {
    const result = await this.requireClient().closeSession(ptyId);
    this.disposeProxy(ptyId);
    return result;
  }

  resizePty(ptyId: string, cols: number, rows: number): void {
    this.client?.resize(ptyId, cols, rows);
  }

  /**
   * Empurra o snapshot do histórico de despachos pro cache do daemon (Story
   * 18.5) — best-effort como resizePty acima: sem client conectado (boot
   * ainda subindo, ou reconexão em andamento), o push simplesmente some; o
   * próximo evento do DispatchManager reenvia o snapshot inteiro.
   */
  pushDispatchHistory(counts: AdapterOutcomeCount[]): void {
    this.client?.pushDispatchHistory(counts);
  }

  /**
   * Sai SEM derrubar o daemon (AC4): sessões sobrevivem ao app.
   * (Encerrar o daemon de verdade: `cockpit-daemon --stop`, Story 6.4.)
   */
  disconnect(): void {
    this.shuttingDown = true;
    for (const id of [...this.proxies.keys()]) this.disposeProxy(id);
    this.client?.disconnect();
    this.client = null;
  }

  private async connect(): Promise<void> {
    const client = new DaemonClient({ autoAck: false });
    await client.connect(this.pipePath);
    this.client = client;
    client.onSessionExit((id, exitCode) => {
      this.disposeProxy(id);
      this.sessionExitListener?.(id, exitCode);
    });
    client.onSessionStatus((id, status) => this.sessionStatusListener?.(id, status));
    client.onClose(() => {
      if (!this.shuttingDown) this.onUnexpectedClose();
    });
    if (this.scrollbackConfig) this.configure(this.scrollbackConfig);
    // Reassina os frames de dados dos proxies vivos na conexão nova (6.4).
    for (const [id, proxy] of this.proxies) client.onData(id, proxy.deliver);
  }

  /** Queda inesperada (6.4): reconectar com backoff antes de declarar morte. */
  private onUnexpectedClose(): void {
    this.client = null;
    this.setState('reconnecting');
    console.warn('[daemon] conexão perdida — reconectando com backoff');
    void this.reconnectLoop();
  }

  private async reconnectLoop(): Promise<void> {
    for (const delay of RECONNECT_DELAYS_MS) {
      await new Promise((r) => setTimeout(r, delay));
      if (this.shuttingDown) return;
      try {
        await this.connect();
      } catch {
        continue;
      }
      // Re-attach: tailBytes 0 = só reassinar (renderer JÁ tem o histórico —
      // replay duplicaria o xterm). Sessão sumida (daemon reiniciado) → exited.
      for (const id of [...this.proxies.keys()]) {
        try {
          const { ok } = await this.requireClient().attach(id, 0);
          if (!ok) {
            this.sessionExitListener?.(id, -1);
            this.disposeProxy(id);
          }
        } catch {
          this.sessionExitListener?.(id, -1);
          this.disposeProxy(id);
        }
      }
      console.log('[daemon] reconectado');
      this.setState('connected');
      return;
    }
    // Exaustão: daemon realmente morto → comportamento clássico (todas exited).
    this.setState('disconnected');
    this.hostExitListener?.();
  }

  /** Proxy por sessão: frames do pipe ↔ MessagePort do renderer (AC3 da 6.3). */
  private buildProxy(sessionId: string): Electron.MessagePortMain {
    this.disposeProxy(sessionId); // adoção substitui proxy anterior, se houver
    const { port1, port2 } = new MessageChannelMain();
    const deliver = (bytes: Uint8Array): void => port1.postMessage(bytes);
    this.requireClient().onData(sessionId, deliver);
    // Handlers usam this.client DINÂMICO: o proxy sobrevive à reconexão (6.4).
    port1.on('message', (e) => {
      const payload = e.data as unknown;
      if (payload instanceof Uint8Array) {
        this.client?.write(sessionId, payload);
        return;
      }
      if (isAck(payload)) this.client?.ack(sessionId, payload.n); // fim-a-fim
    });
    port1.start();
    this.proxies.set(sessionId, { port1, deliver });
    return port2;
  }

  private disposeProxy(sessionId: string): void {
    const proxy = this.proxies.get(sessionId);
    if (!proxy) return;
    proxy.port1.close();
    this.proxies.delete(sessionId);
  }

  private spawnDaemon(): void {
    // Mesmo padrão de candidatos do pty-host.js (gotcha do chunking — d83ccff).
    const candidates = [
      join(app.getAppPath(), 'out', 'main', 'daemon.js'),
      join(app.getAppPath(), 'daemon.js'),
      join(__dirname, 'daemon.js'),
      join(__dirname, '..', 'daemon.js')
    ];
    const entry = candidates.find((p) => existsSync(p));
    if (!entry) {
      throw new Error(`daemon.js não encontrado; candidatos: ${candidates.join(' | ')}`);
    }
    // Electron-as-Node: mesmo binário, runtime Node puro (node-pty é N-API).
    const child = spawn(process.execPath, [entry, '--run-daemon', '--pipe', this.pipePath], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }
    });
    child.unref();
    console.log(`[daemon] spawn detached (pid ${child.pid}) — ${entry}`);
  }

  private requireClient(): DaemonClient {
    if (!this.client) throw new Error('daemon não conectado');
    return this.client;
  }
}

function isAck(value: unknown): value is { t: 'ack'; n: number } {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { t?: unknown }).t === 'ack' &&
    typeof (value as { n?: unknown }).n === 'number'
  );
}
