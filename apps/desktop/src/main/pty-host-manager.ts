import { MessageChannelMain, ipcMain, utilityProcess, type UtilityProcess } from 'electron';
import { join } from 'node:path';
import {
  IpcChannels,
  TerminalCloseRequestSchema,
  TerminalCreateRequestSchema,
  TerminalCreateResponseSchema,
  TerminalResizeRequestSchema,
  type TerminalCloseResponse,
  type TerminalCreateResponse
} from '@cockpit/shared';
import type { HostInbound, HostOutbound } from '@cockpit/pty-host';

/**
 * Supervisor do PTY Host (utilityProcess) + IPC de controle do terminal.
 * O Main só NEGOCIA o canal binário (MessageChannelMain): port1 → PTY Host,
 * port2 → renderer. Dados nunca passam por aqui (decisão crítica 4).
 */

const RESPAWN_DELAY_MS = 1000;
const CREATE_TIMEOUT_MS = 10_000;

type Pending =
  | { kind: 'create'; resolve: (v: TerminalCreateResponse) => void; reject: (e: Error) => void }
  | { kind: 'close'; resolve: (v: TerminalCloseResponse) => void; reject: (e: Error) => void };

export class PtyHostManager {
  private host: UtilityProcess | null = null;
  private shuttingDown = false;
  private seq = 0;
  private readonly pending = new Map<number, Pending>();

  start(): void {
    this.spawnHost();
    this.registerIpc();
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
    const entry = join(__dirname, 'pty-host.js');
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

    host.on('exit', (code) => {
      this.failAllPending(new Error(`PTY Host saiu (code ${code})`));
      if (this.shuttingDown) return;
      console.error(`[pty-host] exit inesperado (code ${code}) — respawn em ${RESPAWN_DELAY_MS}ms`);
      setTimeout(() => {
        if (!this.shuttingDown) this.spawnHost();
      }, RESPAWN_DELAY_MS);
    });

    this.host = host;
  }

  private registerIpc(): void {
    ipcMain.handle(IpcChannels.terminalCreate, async (event, raw: unknown) => {
      const req = TerminalCreateRequestSchema.parse(raw);
      const { port1, port2 } = new MessageChannelMain();
      const requestId = ++this.seq;

      const created = await new Promise<TerminalCreateResponse>((resolve, reject) => {
        const timer = setTimeout(() => {
          this.pending.delete(requestId);
          reject(new Error('timeout criando terminal no PTY Host'));
        }, CREATE_TIMEOUT_MS);
        this.pending.set(requestId, {
          kind: 'create',
          resolve: (v) => {
            clearTimeout(timer);
            resolve(v);
          },
          reject: (e) => {
            clearTimeout(timer);
            reject(e);
          }
        });
        this.post({ type: 'create', requestId, cols: req.cols, rows: req.rows }, [port1]);
      });

      // Porta de dados vai ao renderer que pediu o terminal.
      event.sender.postMessage(IpcChannels.terminalPort, { id: created.id }, [port2]);
      return created;
    });

    ipcMain.handle(IpcChannels.terminalResize, (_event, raw: unknown) => {
      const req = TerminalResizeRequestSchema.parse(raw);
      this.post({ type: 'resize', id: req.id, cols: req.cols, rows: req.rows });
    });

    ipcMain.handle(IpcChannels.terminalClose, async (_event, raw: unknown) => {
      const req = TerminalCloseRequestSchema.parse(raw);
      const requestId = ++this.seq;
      return await new Promise<TerminalCloseResponse>((resolve, reject) => {
        const timer = setTimeout(() => {
          this.pending.delete(requestId);
          reject(new Error('timeout fechando terminal no PTY Host'));
        }, CREATE_TIMEOUT_MS);
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
        this.post({ type: 'close', requestId, id: req.id });
      });
    });
  }

  private onHostMessage(msg: HostOutbound): void {
    switch (msg.type) {
      case 'created': {
        const p = this.takePending(msg.requestId);
        if (p?.kind === 'create') {
          p.resolve(TerminalCreateResponseSchema.parse({ id: msg.id, pid: msg.pid }));
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
        if (p?.kind === 'close') p.resolve({ id: msg.id, orphan: msg.orphan });
        if (msg.orphan) console.error(`[pty-host] AVISO: órfão detectado ao fechar ${msg.id}`);
        break;
      }
      case 'session-exit': {
        console.log(`[pty-host] sessão ${msg.id} saiu (code ${msg.exitCode})`);
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
