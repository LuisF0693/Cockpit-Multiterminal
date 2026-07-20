import { execFileSync } from 'node:child_process';
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
 * Adapter Antigravity CLI (Story 12.4, FR39) — mesmo contrato normalizado
 * do Épico 2, mesmo statusStrategy 'output-parsing' do adapter Grok/Gemini
 * CLI: `agy` (binário `C:\Users\<user>\AppData\Local\agy\bin\agy.exe`,
 * instalado via `curl -fsSL https://antigravity.google/cli/install.cmd`,
 * confirmado pelo fundador) é um REPL interativo sem hooks/notify de
 * ciclo de vida documentados — mesma heurística já validada (Story 2.4):
 * - heurística de input: write() com `\r` → working
 * - exit 0→done / ≠0→error
 * NFR6: env herdado; auth do CLI (conta Google) fica com o usuário. Este
 * adapter só INVOCA o comando já instalado no PATH — nunca instala nada.
 */

export interface AntigravityPtyLike {
  readonly pid: number;
  onData(cb: (data: string) => void): { dispose(): void };
  onExit(cb: (e: { exitCode: number }) => void): { dispose(): void };
  write(data: string): void;
  resize(cols: number, rows: number): void;
  kill(): void;
}

export type AntigravitySpawnFn = (
  command: string,
  args: string[],
  config: SpawnConfig
) => AntigravityPtyLike;
export type WhichFn = (command: string) => string | null;

// Windows: node-pty usa CreateProcess diretamente, sem a resolução PATHEXT
// que `where`/cmd.exe fazem — precisa do nome de arquivo EXATO, extensão
// incluída (mesmo motivo pelo qual claude-code/codex/grok usam `.cmd`).
// `agy` é instalado como `agy.exe` (confirmado pelo fundador).
const DEFAULT_COMMAND = 'agy.exe';
const KILL_GRACE_MS = 1500;

function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

const defaultSpawn: AntigravitySpawnFn = (command, args, config) =>
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

export class AntigravityAdapter implements AgentAdapter {
  readonly id = 'antigravity';
  readonly displayName = 'Antigravity';
  readonly statusStrategy = 'output-parsing' as const;

  constructor(
    private readonly spawnFn: AntigravitySpawnFn = defaultSpawn,
    private readonly which: WhichFn = defaultWhich,
    private readonly command: string = DEFAULT_COMMAND,
    private readonly graceMs: number = KILL_GRACE_MS
  ) {}

  async detectAvailability(): Promise<AdapterAvailability> {
    const path = this.which('agy');
    if (!path) {
      return {
        available: false,
        reason: 'agy CLI não encontrado no PATH (instale via https://antigravity.google/cli/install.cmd)'
      };
    }
    return { available: true };
  }

  async spawn(config: SpawnConfig): Promise<AgentSession> {
    // args extras (17.3): escolha de modelo/flags do chefe por sessão
    const pty = this.spawnFn(this.command, config.args ?? [], config);
    return new AntigravitySession(pty, this.graceMs, config.initialInstruction);
  }
}

class AntigravitySession implements AgentSession {
  readonly terminalId: string;
  readonly pid: number;
  private exited = false;
  private last: AgentStatus | null = null;
  private readonly statusCbs = new Set<(s: AgentStatus, detail?: string) => void>();

  constructor(
    private readonly pty: AntigravityPtyLike,
    private readonly graceMs: number,
    initialInstruction?: string
  ) {
    this.terminalId = `antigravity-${pty.pid}`;
    this.pid = pty.pid;
    this.pty.onExit(({ exitCode }) => {
      this.exited = true;
      this.emitStatus(exitCode === 0 ? 'done' : 'error', `exit ${exitCode}`);
    });
    if (initialInstruction) this.write(`${initialInstruction}\r`);
  }

  write(data: string): void {
    this.pty.write(data);
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
    if (status === this.last) return;
    this.last = status;
    for (const cb of this.statusCbs) cb(status, detail);
  }
}
