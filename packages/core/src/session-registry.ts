import type { SessionEvent, SessionRecord, TaskRole } from '@cockpit/shared';
import { ulid } from './ulid';

/**
 * SessionRegistry — fonte de verdade do registro de sessões (Main process).
 * O pty-host executa; o core registra e coordena (components.md).
 * As operações de PTY são injetadas (PtyHostManager em produção, fake nos testes).
 */

export interface PtyOps {
  createPty(opts: {
    /** Id da sessão (tag do scrollback e da porta binária — Story 1.4). */
    sessionId: string;
    cols: number;
    rows: number;
    cwd?: string;
    /** Adapter que hospeda a sessão (Story 2.1); default 'shell'. */
    adapterId?: string;
    /** true no boot: o host injeta o tail do scrollback persistido. */
    restore?: boolean;
    /** Argumentos extra de CLI (Story 12.6) — ex.: Ollama precisa do modelo. */
    args?: string[];
  }): Promise<{ ptyId: string; pid: number }>;
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
    /** Adapter (2.1): default 'shell'. */
    adapterId?: string | undefined;
    /** Workspace (3.6): default 'Geral'. */
    workspace?: string | undefined;
    /** Tarefa vinculada (5.2) — preservada no relançamento/restore. */
    taskId?: string | null | undefined;
    /** Papel na tarefa (7.1) — preservado no relançamento/restore. */
    taskRole?: TaskRole | null | undefined;
    /** Projeto dono do terminal (8.2) — preservado no relançamento/restore. */
    projectId?: string | null | undefined;
    /** Restore (1.4): preserva o id salvo e injeta scrollback persistido. */
    id?: string | undefined;
    restore?: boolean | undefined;
    /** Argumentos extra de CLI (Story 12.6) — ex.: Ollama precisa do modelo; não sobrevive a restore. */
    args?: string[] | undefined;
  }): Promise<SessionRecord> {
    const id = opts.id ?? ulid();
    const adapterId = opts.adapterId ?? 'shell';
    const { ptyId, pid } = await this.ops.createPty({
      sessionId: id,
      cols: opts.cols,
      rows: opts.rows,
      adapterId,
      ...(opts.cwd !== undefined ? { cwd: opts.cwd } : {}),
      ...(opts.restore !== undefined ? { restore: opts.restore } : {}),
      ...(opts.args !== undefined ? { args: opts.args } : {})
    });
    const record: SessionRecord = {
      id,
      name: opts.name ?? `${DEFAULT_NAME_PREFIX} ${++this.nameSeq}`,
      cwd: opts.cwd ?? process.cwd(),
      status: 'running',
      pid,
      createdAt: Date.now(),
      adapterId,
      agentStatus: 'working',
      lastStatusChangeAt: Date.now(),
      workspace: opts.workspace ?? 'Geral',
      taskId: opts.taskId ?? null,
      taskRole: opts.taskId ? (opts.taskRole ?? null) : null,
      projectId: opts.projectId ?? null
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

  /**
   * Vincula/desvincula tarefa (Story 5.2, AC1) — taskId=null desvincula.
   * `role` (Story 7.1) só se aplica ao vincular; desvincular limpa o papel
   * implicitamente (papel sem tarefa não faz sentido).
   */
  linkTask(id: string, taskId: string | null, role?: TaskRole | null): SessionRecord {
    const session = this.get(id);
    session.record = { ...session.record, taskId, taskRole: taskId === null ? null : (role ?? null) };
    this.emit({ type: 'task_linked', session: session.record });
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
  markExited(ptyId: string, exitCode?: number): void {
    for (const session of this.sessions.values()) {
      if (session.ptyId === ptyId && session.record.status === 'running') {
        session.record = {
          ...session.record,
          status: 'exited',
          lastStatusChangeAt: Date.now(),
          ...(exitCode !== undefined ? { exitCode } : {})
        };
        this.emit({ type: 'exited', session: session.record });
        return;
      }
    }
  }

  /** Status do agente detectado pelo adapter (FR5 — Story 2.1). */
  markAgentStatus(ptyId: string, agentStatus: SessionRecord['agentStatus']): void {
    for (const session of this.sessions.values()) {
      if (session.ptyId === ptyId && session.record.agentStatus !== agentStatus) {
        session.record = { ...session.record, agentStatus, lastStatusChangeAt: Date.now() };
        this.emit({ type: 'status', session: session.record });
        return;
      }
    }
  }

  /**
   * Adota sessão JÁ VIVA no daemon (Story 6.3) — cria o record SEM spawn.
   * Emite 'created': persistência re-upserta (corrige exited→running) e a
   * UI espelha, tudo pelo caminho existente.
   */
  adopt(opts: {
    id: string;
    name: string;
    cwd: string;
    adapterId: string;
    workspace: string;
    pid: number;
    createdAt?: number;
    taskId?: string | null;
    taskRole?: TaskRole | null;
    projectId?: string | null;
  }): SessionRecord {
    const record: SessionRecord = {
      id: opts.id,
      name: opts.name,
      cwd: opts.cwd,
      status: 'running',
      pid: opts.pid,
      createdAt: opts.createdAt ?? Date.now(),
      adapterId: opts.adapterId,
      agentStatus: 'working',
      lastStatusChangeAt: Date.now(),
      workspace: opts.workspace,
      taskId: opts.taskId ?? null,
      taskRole: opts.taskId ? (opts.taskRole ?? null) : null,
      projectId: opts.projectId ?? null
    };
    // ptyId = id da sessão no daemon (tag) — decisão da 6.1.
    this.sessions.set(record.id, { record, ptyId: opts.id });
    this.emit({ type: 'created', session: record });
    return record;
  }

  /**
   * Renomeia workspace nas sessões VIVAS (3.6) — emite 'renamed' por sessão
   * afetada para reusar o caminho de upsert da persistência e o espelho da UI.
   */
  renameWorkspace(from: string, to: string): SessionRecord[] {
    const changed: SessionRecord[] = [];
    for (const session of this.sessions.values()) {
      if (session.record.workspace === from) {
        session.record = { ...session.record, workspace: to };
        this.emit({ type: 'renamed', session: session.record });
        changed.push(session.record);
      }
    }
    return changed;
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
