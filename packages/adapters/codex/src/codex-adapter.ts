import { execFileSync } from 'node:child_process';
import { closeSync, existsSync, mkdtempSync, openSync, readSync, rmSync, statSync, watch, writeFileSync, type FSWatcher } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn as ptySpawn } from 'node-pty';
import type {
  AdapterAvailability,
  AgentAdapter,
  AgentSession,
  SpawnConfig,
  Unsubscribe
} from '@cockpit/adapter-contract';
import { AgentStatusSchema, type AgentStatus } from '@cockpit/shared';

/**
 * Adapter Codex (Story 2.3) — statusStrategy 'output-parsing' (híbrido):
 * - notify do Codex (override por sessão via `-c notify=[...]`, TOML literal)
 *   dispara em agent-turn-complete → linha `idle` no arquivo de status.
 *   ⚠️ O Codex appenda um payload JSON como argumento extra ao programa de
 *   notify — o parser considera só o PRIMEIRO token de cada linha.
 * - Heurística de input: write() contendo `\r` = prompt enviado → working
 *   (o CLI não notifica submissão de prompt).
 * - exit 0→done / ≠0→error.
 * waiting-input (prompts de aprovação) = debt até fixtures reais (política 2.2).
 * NFR6: env herdado; auth do codex fica no próprio CLI (~/.codex).
 */

export interface CodexPtyLike {
  readonly pid: number;
  onData(cb: (data: string) => void): { dispose(): void };
  onExit(cb: (e: { exitCode: number }) => void): { dispose(): void };
  write(data: string): void;
  resize(cols: number, rows: number): void;
  kill(): void;
}

export type CodexSpawnFn = (command: string, args: string[], config: SpawnConfig) => CodexPtyLike;
export type WhichFn = (command: string) => string | null;

const DEFAULT_COMMAND = 'codex.cmd';
const KILL_GRACE_MS = 1500;
const POLL_MS = 500;

function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/** Override TOML do notify (literal strings — paths Windows sem escaping). */
export function buildNotifyOverride(statusPath: string): string {
  return `notify=['cmd','/c','echo idle>> ${statusPath}']`;
}

const defaultSpawn: CodexSpawnFn = (command, args, config) =>
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

export class CodexAdapter implements AgentAdapter {
  readonly id = 'codex';
  readonly displayName = 'Codex';
  readonly statusStrategy = 'output-parsing' as const;

  constructor(
    private readonly spawnFn: CodexSpawnFn = defaultSpawn,
    private readonly which: WhichFn = defaultWhich,
    private readonly command: string = DEFAULT_COMMAND,
    private readonly graceMs: number = KILL_GRACE_MS,
    private readonly pollMs: number = POLL_MS
  ) {}

  async detectAvailability(): Promise<AdapterAvailability> {
    const path = this.which('codex');
    if (!path) {
      return { available: false, reason: 'codex CLI não encontrado no PATH (npm i -g @openai/codex)' };
    }
    return { available: true };
  }

  async spawn(config: SpawnConfig): Promise<AgentSession> {
    const dir = mkdtempSync(join(tmpdir(), `cockpit-codex-s${++sessionSeq}-`));
    const statusPath = join(dir, 'session.status');
    writeFileSync(statusPath, '');
    // args extras (17.3): ex.: ['--model','gpt-5.5-codex'] — escolha do chefe por sessão
    const pty = this.spawnFn(this.command, ['-c', buildNotifyOverride(statusPath), ...(config.args ?? [])], config);
    return new CodexSession(pty, dir, statusPath, this.graceMs, this.pollMs, config.initialInstruction);
  }
}

class CodexSession implements AgentSession {
  readonly terminalId: string;
  readonly pid: number;
  private exited = false;
  private last: AgentStatus | null = null;
  private offset = 0;
  private watcher: FSWatcher | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private readonly statusCbs = new Set<(s: AgentStatus, detail?: string) => void>();

  constructor(
    private readonly pty: CodexPtyLike,
    private readonly tempDir: string,
    private readonly statusPath: string,
    private readonly graceMs: number,
    pollMs: number,
    initialInstruction?: string
  ) {
    this.terminalId = `codex-${pty.pid}`;
    this.pid = pty.pid;

    try {
      this.watcher = watch(this.statusPath, () => this.drain());
    } catch {
      this.watcher = null;
    }
    this.pollTimer = setInterval(() => this.drain(), pollMs);

    this.pty.onExit(({ exitCode }) => {
      this.exited = true;
      this.emitStatus(exitCode === 0 ? 'done' : 'error', `exit ${exitCode}`);
      this.cleanup();
    });

    if (initialInstruction) this.write(`${initialInstruction}\r`);
  }

  write(data: string): void {
    this.pty.write(data);
    // Heurística de input: Enter = prompt submetido → working.
    if (data.includes('\r') && !this.exited) {
      this.emitStatus('working', 'input-heuristic');
    }
  }

  resize(cols: number, rows: number): void {
    this.pty.resize(cols, rows);
  }

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

  /** Tail incremental; primeiro token da linha = status (sufixo JSON ignorado). */
  private drain(): void {
    if (this.exited || !existsSync(this.statusPath)) return;
    let size: number;
    try {
      size = statSync(this.statusPath).size;
    } catch {
      return;
    }
    if (size <= this.offset) return;
    const fd = openSync(this.statusPath, 'r');
    try {
      const buf = Buffer.alloc(size - this.offset);
      readSync(fd, buf, 0, buf.length, this.offset);
      this.offset = size;
      for (const rawLine of buf.toString('utf8').split(/\r?\n/)) {
        const token = rawLine.trim().split(/\s+/)[0] ?? '';
        if (!token) continue;
        const parsed = AgentStatusSchema.safeParse(token);
        if (parsed.success) this.emitStatus(parsed.data, 'notify');
      }
    } finally {
      closeSync(fd);
    }
  }

  private emitStatus(status: AgentStatus, detail?: string): void {
    if (status === this.last) return;
    this.last = status;
    for (const cb of this.statusCbs) cb(status, detail);
  }

  private cleanup(): void {
    this.watcher?.close();
    this.watcher = null;
    if (this.pollTimer !== null) clearInterval(this.pollTimer);
    this.pollTimer = null;
    try {
      rmSync(this.tempDir, { recursive: true, force: true });
    } catch {
      // best-effort
    }
  }
}
