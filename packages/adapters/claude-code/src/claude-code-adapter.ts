import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { spawn as ptySpawn } from 'node-pty';
import type {
  AdapterAvailability,
  AgentAdapter,
  AgentSession,
  SpawnConfig,
  Unsubscribe
} from '@cockpit/adapter-contract';
import type { AgentStatus } from '@cockpit/shared';
import { writeSessionHookFiles, type SessionHookFiles } from './hook-settings';
import { StatusFileWatcher } from './status-file-watcher';

/**
 * Adapter Claude Code (Story 2.2) — statusStrategy 'native-hooks':
 * hooks do CLI (via `--settings` temporário) escrevem AgentStatus num
 * arquivo observado. Degradação segura: se nenhum hook disparar após o
 * primeiro output (CLI antigo/sem suporte), seguimos como process-only
 * com log — a sessão NUNCA quebra por causa do status.
 * NFR6: env herdado do usuário; auth fica no próprio CLI.
 */

export interface ClaudePtyLike {
  readonly pid: number;
  onData(cb: (data: string) => void): { dispose(): void };
  onExit(cb: (e: { exitCode: number }) => void): { dispose(): void };
  write(data: string): void;
  resize(cols: number, rows: number): void;
  kill(): void;
}

export type ClaudeSpawnFn = (command: string, args: string[], config: SpawnConfig) => ClaudePtyLike;
export type WhichFn = (command: string) => string | null;

const DEFAULT_COMMAND = 'claude.cmd';
const KILL_GRACE_MS = 1500;
const HOOK_DEGRADE_TIMEOUT_MS = 30_000;

function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

const defaultSpawn: ClaudeSpawnFn = (command, args, config) =>
  ptySpawn(command, args, {
    name: 'xterm-256color',
    cols: config.cols,
    rows: config.rows,
    cwd: config.cwd,
    env: { ...(process.env as Record<string, string>), ...(config.env ?? {}) }
  });

const defaultWhich: WhichFn = (command) => {
  try {
    return execFileSync('where', [command], { encoding: 'utf8' }).split(/\r?\n/)[0]?.trim() ?? null;
  } catch {
    return null;
  }
};

let sessionSeq = 0;

export class ClaudeCodeAdapter implements AgentAdapter {
  readonly id = 'claude-code';
  readonly displayName = 'Claude Code';
  readonly statusStrategy = 'native-hooks' as const;

  constructor(
    private readonly spawnFn: ClaudeSpawnFn = defaultSpawn,
    private readonly which: WhichFn = defaultWhich,
    private readonly command: string = DEFAULT_COMMAND,
    private readonly graceMs: number = KILL_GRACE_MS,
    private readonly hookTimeoutMs: number = HOOK_DEGRADE_TIMEOUT_MS
  ) {}

  async detectAvailability(): Promise<AdapterAvailability> {
    const path = this.which('claude');
    if (!path) {
      return { available: false, reason: 'claude CLI não encontrado no PATH (npm i -g @anthropic-ai/claude-code)' };
    }
    return { available: true };
  }

  async spawn(config: SpawnConfig): Promise<AgentSession> {
    const files = writeSessionHookFiles(`s${++sessionSeq}`);
    const pty = this.spawnFn(this.command, ['--settings', files.settingsPath], config);
    return new ClaudeSession(pty, files, this.graceMs, this.hookTimeoutMs, config.initialInstruction);
  }
}

class ClaudeSession implements AgentSession {
  readonly terminalId: string;
  readonly pid: number;
  private exited = false;
  private sawFirstData = false;
  private degradeTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly watcher: StatusFileWatcher;
  private readonly statusCbs = new Set<(s: AgentStatus, detail?: string) => void>();

  constructor(
    private readonly pty: ClaudePtyLike,
    private readonly files: SessionHookFiles,
    private readonly graceMs: number,
    hookTimeoutMs: number,
    initialInstruction?: string
  ) {
    this.terminalId = `claude-${pty.pid}`;
    this.pid = pty.pid;

    this.watcher = new StatusFileWatcher(files.statusPath, (status) => {
      this.emitStatus(status, 'native-hook');
    });
    this.watcher.start();

    this.pty.onData(() => {
      if (this.sawFirstData) return;
      this.sawFirstData = true;
      // Degradação segura: sem hook após o timeout → seguimos process-only.
      this.degradeTimer = setTimeout(() => {
        if (!this.watcher.sawAnyStatus && !this.exited) {
          console.warn(
            `[adapter:claude-code] hooks silenciosos após ${hookTimeoutMs}ms — degradando p/ process-only (versão do CLI sem --settings/hooks?)`
          );
          this.emitStatus('working', 'degraded:process-only');
        }
      }, hookTimeoutMs);
    });

    this.pty.onExit(({ exitCode }) => {
      this.exited = true;
      this.emitStatus(exitCode === 0 ? 'done' : 'error', `exit ${exitCode}`);
      this.cleanup();
    });

    if (initialInstruction) this.pty.write(`${initialInstruction}\r`);
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
    this.cleanup();
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

  private cleanup(): void {
    if (this.degradeTimer !== null) clearTimeout(this.degradeTimer);
    this.degradeTimer = null;
    this.watcher.stop();
    try {
      rmSync(this.files.dir, { recursive: true, force: true });
    } catch {
      // best-effort: arquivos temp órfãos não são críticos
    }
  }
}
