import { MessageChannelMain, app, utilityProcess, type UtilityProcess } from 'electron';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { HostInbound, HostOutbound } from '@cockpit/pty-host';

/**
 * Supervisor do PTY Host (utilityProcess) — serviço puro de PTY para o Main.
 * O registro de sessões (fonte de verdade) vive no SessionRegistry (@cockpit/core);
 * aqui só se fala com o host: criar/fechar/redimensionar PTYs e negociar as
 * MessagePorts binárias (decisão crítica 4: dados nunca passam pelo Main).
 */

const RESPAWN_DELAY_MS = 1000;
const REQUEST_TIMEOUT_MS = 10_000;

interface CreatedPty {
  ptyId: string;
  pid: number;
  /** Porta binária a entregar ao renderer dono da sessão. */
  rendererPort: Electron.MessagePortMain;
}

type Pending =
  | { kind: 'create'; port2: Electron.MessagePortMain; resolve: (v: CreatedPty) => void; reject: (e: Error) => void }
  | { kind: 'close'; resolve: (v: { orphan: boolean }) => void; reject: (e: Error) => void };

export interface ScrollbackConfig {
  scrollbackDir: string;
  maxFileBytes: number;
  restoreTailBytes: number;
}

export class PtyHostManager {
  private host: UtilityProcess | null = null;
  private shuttingDown = false;
  private seq = 0;
  private readonly pending = new Map<number, Pending>();
  private sessionExitListener: ((ptyId: string, exitCode: number) => void) | null = null;
  private hostExitListener: (() => void) | null = null;
  private scrollbackConfig: ScrollbackConfig | null = null;

  start(): void {
    this.spawnHost();
  }

  /** Config de scrollback (1.4) — reenviada automaticamente após respawn. */
  configure(config: ScrollbackConfig): void {
    this.scrollbackConfig = config;
    this.post({ type: 'configure', ...config });
  }

  onSessionExit(cb: (ptyId: string, exitCode: number) => void): void {
    this.sessionExitListener = cb;
  }

  /** Disparado quando o host morre inesperadamente (todas as sessões se perdem). */
  onHostExit(cb: () => void): void {
    this.hostExitListener = cb;
  }

  async createPty(opts: {
    sessionId: string;
    cols: number;
    rows: number;
    cwd?: string;
    restore?: boolean;
  }): Promise<CreatedPty> {
    const { port1, port2 } = new MessageChannelMain();
    const requestId = ++this.seq;
    return await new Promise<CreatedPty>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        port2.close();
        reject(new Error('timeout criando PTY no host'));
      }, REQUEST_TIMEOUT_MS);
      this.pending.set(requestId, {
        kind: 'create',
        port2,
        resolve: (v) => {
          clearTimeout(timer);
          resolve(v);
        },
        reject: (e) => {
          clearTimeout(timer);
          port2.close();
          reject(e);
        }
      });
      this.post(
        {
          type: 'create',
          requestId,
          tag: opts.sessionId,
          cols: opts.cols,
          rows: opts.rows,
          ...(opts.cwd !== undefined ? { cwd: opts.cwd } : {}),
          ...(opts.restore !== undefined ? { restore: opts.restore } : {})
        },
        [port1]
      );
    });
  }

  async closePty(ptyId: string): Promise<{ orphan: boolean }> {
    const requestId = ++this.seq;
    return await new Promise<{ orphan: boolean }>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error('timeout fechando PTY no host'));
      }, REQUEST_TIMEOUT_MS);
      this.pending.set(requestId, {
        kind: 'close',
        resolve: (v) => {
          clearTimeout(timer);
          resolve(v);
        },
        reject: (e) => {
          clearTimeout(timer);
          reject(e);
        }
      });
      this.post({ type: 'close', requestId, id: ptyId });
    });
  }

  resizePty(ptyId: string, cols: number, rows: number): void {
    this.post({ type: 'resize', id: ptyId, cols, rows });
  }

  async shutdown(): Promise<void> {
    this.shuttingDown = true;
    const host = this.host;
    if (!host) return;
    this.post({ type: 'shutdown' });
    // Grace para o host dispor os PTYs e sair sozinho; depois força.
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        host.kill();
        resolve();
      }, 3000);
      host.once('exit', () => {
        clearTimeout(timer);
        resolve();
      });
    });
    this.host = null;
  }

  private spawnHost(): void {
    // NÃO usar __dirname puro: quando o Rollup fatia este módulo num chunk
    // (out/main/chunks/), __dirname deixa de apontar para out/main e o fork
    // quebra silenciosamente. require.main é falsy no main do Electron, então
    // resolvemos por candidatos conhecidos a partir do appPath (dev: apps/
    // desktop; execução direta de arquivo: out/main; empacotado: app.asar).
    const candidates = [
      join(app.getAppPath(), 'out', 'main', 'pty-host.js'),
      join(app.getAppPath(), 'pty-host.js'),
      join(__dirname, 'pty-host.js'),
      join(__dirname, '..', 'pty-host.js')
    ];
    const entry = candidates.find((p) => existsSync(p));
    if (!entry) {
      throw new Error(`pty-host.js não encontrado; candidatos: ${candidates.join(' | ')}`);
    }
    const host = utilityProcess.fork(entry, [], {
      serviceName: 'cockpit-pty-host',
      stdio: ['ignore', 'pipe', 'pipe']
    });

    // Gotcha #2 (Story 1.1): node-pty loga "AttachConsole failed" no kill —
    // ruído não-fatal; filtrar para não poluir o log do Main.
    host.stderr?.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      if (text.includes('AttachConsole failed')) return;
      console.error('[pty-host:stderr]', text.trimEnd());
    });
    host.stdout?.on('data', (chunk: Buffer) => {
      console.log('[pty-host]', chunk.toString().trimEnd());
    });

    host.on('message', (raw: unknown) => this.onHostMessage(raw as HostOutbound));

    host.once('spawn', () => {
      if (this.scrollbackConfig) this.post({ type: 'configure', ...this.scrollbackConfig });
    });

    host.on('exit', (code) => {
      this.failAllPending(new Error(`PTY Host saiu (code ${code})`));
      if (this.shuttingDown) return;
      console.error(`[pty-host] exit inesperado (code ${code}) — respawn em ${RESPAWN_DELAY_MS}ms`);
      this.hostExitListener?.();
      setTimeout(() => {
        if (!this.shuttingDown) this.spawnHost();
      }, RESPAWN_DELAY_MS);
    });

    this.host = host;
  }

  private onHostMessage(msg: HostOutbound): void {
    switch (msg.type) {
      case 'created': {
        const p = this.takePending(msg.requestId);
        if (p?.kind === 'create') {
          p.resolve({ ptyId: msg.id, pid: msg.pid, rendererPort: p.port2 });
        }
        break;
      }
      case 'create-error': {
        const p = this.takePending(msg.requestId);
        p?.reject(new Error(msg.message));
        break;
      }
      case 'closed': {
        const p = this.takePending(msg.requestId);
        if (p?.kind === 'close') p.resolve({ orphan: msg.orphan });
        if (msg.orphan) console.error(`[pty-host] AVISO: órfão detectado ao fechar ${msg.id}`);
        break;
      }
      case 'session-exit': {
        console.log(`[pty-host] sessão ${msg.id} saiu (code ${msg.exitCode})`);
        this.sessionExitListener?.(msg.id, msg.exitCode);
        break;
      }
    }
  }

  private takePending(requestId: number): Pending | undefined {
    const p = this.pending.get(requestId);
    this.pending.delete(requestId);
    return p;
  }

  private failAllPending(error: Error): void {
    for (const p of this.pending.values()) p.reject(error);
    this.pending.clear();
  }

  private post(msg: HostInbound, transfer: Electron.MessagePortMain[] = []): void {
    if (!this.host) throw new Error('PTY Host indisponível');
    this.host.postMessage(msg, transfer);
  }
}
