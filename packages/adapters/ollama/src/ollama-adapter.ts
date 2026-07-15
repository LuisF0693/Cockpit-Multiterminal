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
 * Adapter Ollama (Story 12.6) — mesmo contrato normalizado do Épico 2,
 * mesmo statusStrategy 'output-parsing' dos demais adapters de CLI de
 * terceiros. DIFERENÇA dos outros: `ollama run <modelo>` exige um
 * argumento por SESSÃO (o modelo), não fixo por adapter — por isso usa
 * `SpawnConfig.args` (Story 12.6) em vez de um comando fixo sem args. Sem
 * `args`, cai no modelo default (`DEFAULT_MODEL`).
 * NFR6: env herdado; Ollama roda localmente, sem credenciais de terceiro.
 */

export interface OllamaPtyLike {
  readonly pid: number;
  onData(cb: (data: string) => void): { dispose(): void };
  onExit(cb: (e: { exitCode: number }) => void): { dispose(): void };
  write(data: string): void;
  resize(cols: number, rows: number): void;
  kill(): void;
}

export type OllamaSpawnFn = (command: string, args: string[], config: SpawnConfig) => OllamaPtyLike;
export type WhichFn = (command: string) => string | null;

// Windows: node-pty usa CreateProcess diretamente, sem a resolução PATHEXT
// que `where`/cmd.exe fazem — precisa do nome de arquivo EXATO, extensão
// incluída (mesmo motivo pelo qual claude-code/codex/grok usam `.cmd`).
// Ollama é instalado como binário nativo `ollama.exe`, não shim npm.
const DEFAULT_COMMAND = 'ollama.exe';
export const DEFAULT_MODEL = 'llama3';
const KILL_GRACE_MS = 1500;

function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

const defaultSpawn: OllamaSpawnFn = (command, args, config) =>
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

export class OllamaAdapter implements AgentAdapter {
  readonly id = 'ollama';
  readonly displayName = 'Ollama';
  readonly statusStrategy = 'output-parsing' as const;

  constructor(
    private readonly spawnFn: OllamaSpawnFn = defaultSpawn,
    private readonly which: WhichFn = defaultWhich,
    private readonly command: string = DEFAULT_COMMAND,
    private readonly graceMs: number = KILL_GRACE_MS
  ) {}

  async detectAvailability(): Promise<AdapterAvailability> {
    const path = this.which('ollama');
    if (!path) {
      return {
        available: false,
        reason: 'ollama CLI não encontrado no PATH (instale em https://ollama.com/download)'
      };
    }
    return { available: true };
  }

  async spawn(config: SpawnConfig): Promise<AgentSession> {
    const args = config.args ?? ['run', DEFAULT_MODEL];
    const pty = this.spawnFn(this.command, args, config);
    return new OllamaSession(pty, this.graceMs, config.initialInstruction);
  }
}

class OllamaSession implements AgentSession {
  readonly terminalId: string;
  readonly pid: number;
  private exited = false;
  private last: AgentStatus | null = null;
  private readonly statusCbs = new Set<(s: AgentStatus, detail?: string) => void>();

  constructor(
    private readonly pty: OllamaPtyLike,
    private readonly graceMs: number,
    initialInstruction?: string
  ) {
    this.terminalId = `ollama-${pty.pid}`;
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
