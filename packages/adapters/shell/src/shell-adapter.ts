import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawn as ptySpawn } from 'node-pty';
import type {
  AdapterAvailability,
  AgentAdapter,
  AgentSession,
  SpawnConfig,
  Unsubscribe
} from '@cockpit/adapter-contract';
import type { AgentStatus } from '@cockpit/shared';

/**
 * Adapter genérico de shell (Story 2.1) — statusStrategy 'process-only':
 * vivo → 'working'; exit 0 → 'done'; exit ≠ 0 → 'error'.
 * Base validada nas Stories 1.1-1.4 (spawn ConPTY + dispose sem órfãos).
 * O spawn é injetável para testes (fake nos unit; node-pty em produção).
 */

export interface ShellPtyLike {
  readonly pid: number;
  onData(cb: (data: string) => void): { dispose(): void };
  onExit(cb: (e: { exitCode: number }) => void): { dispose(): void };
  write(data: string): void;
  resize(cols: number, rows: number): void;
  kill(): void;
}

export type ShellSpawnFn = (shell: string, config: SpawnConfig) => ShellPtyLike;

const DEFAULT_SHELL = 'powershell.exe';
const KILL_GRACE_MS = 1500;

function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

const defaultSpawn: ShellSpawnFn = (shell, config) =>
  ptySpawn(shell, [], {
    name: 'xterm-256color',
    cols: config.cols,
    rows: config.rows,
    cwd: config.cwd,
    // NFR6: herda o ambiente do usuário; env extra NUNCA carrega credenciais.
    env: { ...(process.env as Record<string, string>), ...(config.env ?? {}) }
  });

export class ShellAdapter implements AgentAdapter {
  readonly id = 'shell';
  readonly displayName = 'Shell';
  readonly statusStrategy = 'process-only' as const;

  constructor(
    private readonly spawnFn: ShellSpawnFn = defaultSpawn,
    private readonly shell: string = DEFAULT_SHELL,
    private readonly graceMs: number = KILL_GRACE_MS
  ) {}

  async detectAvailability(): Promise<AdapterAvailability> {
    if (this.shell.includes('/') || this.shell.includes('\\')) {
      return existsSync(this.shell)
        ? { available: true }
        : { available: false, reason: `shell não encontrado: ${this.shell}` };
    }
    const systemRoot = process.env['SystemRoot'];
    if (process.platform === 'win32' && systemRoot) {
      const known = join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', this.shell);
      if (existsSync(known)) return { available: true };
    }
    // Sem resolução de PATH manual: o spawn falhará com erro claro se faltar.
    return { available: true };
  }

  async spawn(config: SpawnConfig): Promise<AgentSession> {
    const pty = this.spawnFn(this.shell, config);
    return new ShellSession(pty, this.graceMs, config.initialInstruction);
  }
}

class ShellSession implements AgentSession {
  readonly terminalId: string;
  readonly pid: number;
  private exited = false;
  private readonly statusCbs = new Set<(s: AgentStatus, detail?: string) => void>();

  constructor(
    private readonly pty: ShellPtyLike,
    private readonly graceMs: number,
    initialInstruction?: string
  ) {
    this.terminalId = `shell-${pty.pid}`;
    this.pid = pty.pid;
    this.pty.onExit(({ exitCode }) => {
      this.exited = true;
      this.emitStatus(exitCode === 0 ? 'done' : 'error', `exit ${exitCode}`);
    });
    if (initialInstruction) this.pty.write(`${initialInstruction}\r`);
    // process-only: nasce trabalhando. Macrotask (não microtask): o await do
    // spawn() drena microtasks ANTES do chamador registrar onStatus.
    setTimeout(() => {
      if (!this.exited) this.emitStatus('working');
    }, 0);
  }

  write(data: string): void {
    this.pty.write(data);
  }

  resize(cols: number, rows: number): void {
    this.pty.resize(cols, rows);
  }

  /** Rejeita se o processo resistir ao kill (host reporta órfão — contrato). */
  async dispose(): Promise<void> {
    if (!this.exited) this.pty.kill();
    await new Promise((r) => setTimeout(r, this.graceMs));
    if (isPidAlive(this.pid)) {
      throw new Error(`processo ${this.pid} resistiu ao dispose (órfão)`);
    }
  }

  onData(cb: (chunk: Buffer) => void): Unsubscribe {
    const sub = this.pty.onData((data) => cb(Buffer.from(data, 'utf8')));
    return () => sub.dispose();
  }

  onStatus(cb: (status: AgentStatus, detail?: string) => void): Unsubscribe {
    this.statusCbs.add(cb);
    return () => this.statusCbs.delete(cb);
  }

  onExit(cb: (code: number | null) => void): Unsubscribe {
    const sub = this.pty.onExit(({ exitCode }) => cb(exitCode));
    return () => sub.dispose();
  }

  private emitStatus(status: AgentStatus, detail?: string): void {
    for (const cb of this.statusCbs) cb(status, detail);
  }
}
