/**
 * Gerenciador de sessões PTY — lógica pura, sem dependência de Electron.
 * O spawn é injetado (node-pty em produção via host-entry; fake nos testes).
 * Contrato de adapter formal chega na Story 2.1 — manter esta API limpa.
 */

export interface PtyLike {
  readonly pid: number;
  onData(cb: (data: string) => void): { dispose(): void };
  onExit(cb: (e: { exitCode: number }) => void): { dispose(): void };
  write(data: string): void;
  resize(cols: number, rows: number): void;
  kill(): void;
  pause(): void;
  resume(): void;
}

export interface PtySpawnOptions {
  shell: string;
  args: string[];
  cols: number;
  rows: number;
  cwd: string;
  env: Record<string, string>;
}

export type PtySpawnFn = (opts: PtySpawnOptions) => PtyLike;

export interface SessionInfo {
  id: string;
  pid: number;
}

interface Session {
  id: string;
  pty: PtyLike;
  exited: boolean;
}

/** Padrão do spike da Story 1.1: sinal 0 não mata, só testa existência. */
export function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

const DEFAULT_SHELL = 'powershell.exe';
const KILL_GRACE_MS = 1500;

export class PtySessionManager {
  private readonly sessions = new Map<string, Session>();
  private seq = 0;

  constructor(
    private readonly spawnFn: PtySpawnFn,
    private readonly graceMs: number = KILL_GRACE_MS
  ) {}

  create(opts: { cols: number; rows: number; shell?: string; cwd?: string }): SessionInfo {
    const id = `pty-${++this.seq}`;
    const pty = this.spawnFn({
      shell: opts.shell ?? DEFAULT_SHELL,
      args: [],
      cols: opts.cols,
      rows: opts.rows,
      cwd: opts.cwd ?? process.cwd(),
      env: process.env as Record<string, string>
    });
    const session: Session = { id, pty, exited: false };
    pty.onExit(() => {
      session.exited = true;
    });
    this.sessions.set(id, session);
    return { id, pid: pty.pid };
  }

  write(id: string, data: string): void {
    this.get(id).pty.write(data);
  }

  resize(id: string, cols: number, rows: number): void {
    this.get(id).pty.resize(cols, rows);
  }

  pause(id: string): void {
    this.get(id).pty.pause();
  }

  resume(id: string): void {
    this.get(id).pty.resume();
  }

  onData(id: string, cb: (data: string) => void): { dispose(): void } {
    return this.get(id).pty.onData(cb);
  }

  onExit(id: string, cb: (e: { exitCode: number }) => void): { dispose(): void } {
    return this.get(id).pty.onExit(cb);
  }

  has(id: string): boolean {
    return this.sessions.has(id);
  }

  /**
   * Encerra a sessão e VERIFICA órfãos (AC4): kill → aguarda grace →
   * `isPidAlive` deve ser false. Retorna orphan=true se o processo resistiu.
   */
  async dispose(id: string): Promise<{ orphan: boolean }> {
    const session = this.sessions.get(id);
    if (!session) return { orphan: false };
    this.sessions.delete(id);

    const { pid } = session.pty;
    if (!session.exited) {
      session.pty.kill();
    }
    await new Promise((r) => setTimeout(r, this.graceMs));
    return { orphan: isPidAlive(pid) };
  }

  async disposeAll(): Promise<{ orphans: number[] }> {
    const ids = [...this.sessions.keys()];
    const orphans: number[] = [];
    for (const id of ids) {
      const pid = this.sessions.get(id)?.pty.pid;
      const { orphan } = await this.dispose(id);
      if (orphan && pid !== undefined) orphans.push(pid);
    }
    return { orphans };
  }

  private get(id: string): Session {
    const session = this.sessions.get(id);
    if (!session) throw new Error(`Sessão PTY desconhecida: ${id}`);
    return session;
  }
}
