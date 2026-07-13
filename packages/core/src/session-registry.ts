import type { SessionEvent, SessionRecord } from '@cockpit/shared';
import { ulid } from './ulid';

/**
 * SessionRegistry — fonte de verdade do registro de sessões (Main process).
 * O pty-host executa; o core registra e coordena (components.md).
 * As operações de PTY são injetadas (PtyHostManager em produção, fake nos testes).
 */

export interface PtyOps {
  createPty(opts: { cols: number; rows: number; cwd?: string }): Promise<{ ptyId: string; pid: number }>;
  closePty(ptyId: string): Promise<{ orphan: boolean }>;
  resizePty(ptyId: string, cols: number, rows: number): void;
}

export type SessionListener = (event: SessionEvent) => void;

interface SessionInternal {
  record: SessionRecord;
  ptyId: string;
}

const DEFAULT_NAME_PREFIX = 'Terminal';

export class SessionRegistry {
  private readonly sessions = new Map<string, SessionInternal>();
  private readonly listeners = new Set<SessionListener>();
  private nameSeq = 0;

  constructor(private readonly ops: PtyOps) {}

  async create(opts: {
    cols: number;
    rows: number;
    name?: string | undefined;
    cwd?: string | undefined;
  }): Promise<SessionRecord> {
    const { ptyId, pid } = await this.ops.createPty({
      cols: opts.cols,
      rows: opts.rows,
      ...(opts.cwd !== undefined ? { cwd: opts.cwd } : {})
    });
    const record: SessionRecord = {
      id: ulid(),
      name: opts.name ?? `${DEFAULT_NAME_PREFIX} ${++this.nameSeq}`,
      cwd: opts.cwd ?? process.cwd(),
      status: 'running',
      pid,
      createdAt: Date.now()
    };
    this.sessions.set(record.id, { record, ptyId });
    this.emit({ type: 'created', session: record });
    return record;
  }

  rename(id: string, name: string): SessionRecord {
    const session = this.get(id);
    session.record = { ...session.record, name };
    this.emit({ type: 'renamed', session: session.record });
    return session.record;
  }

  /** Fecha APENAS a sessão indicada (AC4) — as demais não são tocadas. */
  async close(id: string): Promise<{ id: string; orphan: boolean }> {
    const session = this.get(id);
    this.sessions.delete(id);
    const { orphan } = await this.ops.closePty(session.ptyId);
    this.emit({ type: 'closed', session: { ...session.record, status: 'exited' } });
    return { id, orphan };
  }

  resize(id: string, cols: number, rows: number): void {
    const session = this.get(id);
    this.ops.resizePty(session.ptyId, cols, rows);
  }

  /** Marca exit espontâneo do processo (shell saiu sozinho). */
  markExited(ptyId: string): void {
    for (const session of this.sessions.values()) {
      if (session.ptyId === ptyId && session.record.status === 'running') {
        session.record = { ...session.record, status: 'exited' };
        this.emit({ type: 'exited', session: session.record });
        return;
      }
    }
  }

  list(): SessionRecord[] {
    return [...this.sessions.values()].map((s) => s.record);
  }

  ptyIdOf(id: string): string {
    return this.get(id).ptyId;
  }

  has(id: string): boolean {
    return this.sessions.has(id);
  }

  async closeAll(): Promise<void> {
    const ids = [...this.sessions.keys()];
    for (const id of ids) {
      await this.close(id);
    }
  }

  onEvent(listener: SessionListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: SessionEvent): void {
    for (const listener of this.listeners) listener(event);
  }

  private get(id: string): SessionInternal {
    const session = this.sessions.get(id);
    if (!session) throw new Error(`Sessão desconhecida: ${id}`);
    return session;
  }
}
