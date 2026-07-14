import { MessageChannelMain, app } from 'electron';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { DaemonClient, DEFAULT_DAEMON_PIPE, type DaemonSessionInfo } from '@cockpit/pty-host';
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

interface ProxiedSession {
  port1: Electron.MessagePortMain;
  unsubData: () => void;
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

  constructor(private readonly pipePath: string = DEFAULT_DAEMON_PIPE) {}

  /** Connect-or-spawn (AC1): daemon vivo → conecta; ausente → sobe detached. */
  async start(): Promise<void> {
    try {
      await this.connect();
      console.log('[daemon] conectado a daemon existente');
      return;
    } catch {
      this.spawnDaemon();
    }
    let lastError: unknown = null;
    for (let i = 0; i < CONNECT_RETRIES; i++) {
      await new Promise((r) => setTimeout(r, CONNECT_RETRY_MS));
      try {
        await this.connect();
        console.log('[daemon] daemon iniciado e conectado');
        return;
      } catch (err) {
        lastError = err;
      }
    }
    throw new Error(`daemon não respondeu após spawn: ${String(lastError)}`);
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
  }): Promise<{ ptyId: string; pid: number; rendererPort: Electron.MessagePortMain }> {
    const client = this.requireClient();
    const { id, pid } = await client.createSession({
      tag: opts.sessionId,
      cols: opts.cols,
      rows: opts.rows,
      ...(opts.cwd !== undefined ? { cwd: opts.cwd } : {}),
      ...(opts.adapterId !== undefined ? { adapterId: opts.adapterId } : {}),
      ...(opts.restore !== undefined ? { restore: opts.restore } : {})
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
      if (!this.shuttingDown) this.hostExitListener?.();
    });
    if (this.scrollbackConfig) this.configure(this.scrollbackConfig);
  }

  /** Proxy por sessão: frames do pipe ↔ MessagePort do renderer (AC3). */
  private buildProxy(sessionId: string): Electron.MessagePortMain {
    const client = this.requireClient();
    this.disposeProxy(sessionId); // adoção substitui proxy anterior, se houver
    const { port1, port2 } = new MessageChannelMain();
    const unsubData = client.onData(sessionId, (bytes) => port1.postMessage(bytes));
    port1.on('message', (e) => {
      const payload = e.data as unknown;
      if (payload instanceof Uint8Array) {
        client.write(sessionId, payload);
        return;
      }
      if (isAck(payload)) client.ack(sessionId, payload.n); // fim-a-fim (Task 1)
    });
    port1.start();
    this.proxies.set(sessionId, { port1, unsubData });
    return port2;
  }

  private disposeProxy(sessionId: string): void {
    const proxy = this.proxies.get(sessionId);
    if (!proxy) return;
    proxy.unsubData();
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
