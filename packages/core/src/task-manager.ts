import { ulid } from './ulid';
import { assertTransition } from './task-lifecycle';
import type { PersistedTask, StateStore, TaskState } from './state-store/types';
import type { WriteQueue } from './state-store/write-queue';

export type TaskRecord = PersistedTask;

export type TaskEvent =
  | { type: 'created'; task: TaskRecord }
  | { type: 'state_changed'; task: TaskRecord; from: TaskState };

export type TaskListener = (event: TaskEvent) => void;

/**
 * TaskManager (Story 5.1, FR13) — fonte de verdade das tarefas. Diferente do
 * SessionRegistry (que decorre I/O de PTY real e por isso separa registro de
 * persistência via PtyOps/wire), tarefas não têm recurso externo a
 * orquestrar: estado vivo e persistência (via WriteQueue — NFR8, nunca
 * bloqueia o chamador) vivem juntos aqui.
 */
export class TaskManager {
  private readonly tasks = new Map<string, TaskRecord>();
  private readonly listeners = new Set<TaskListener>();

  constructor(
    private readonly store: StateStore,
    private readonly queue: WriteQueue
  ) {}

  /** Carrega tarefas persistidas (chamar uma vez no boot — AC3). */
  load(): void {
    for (const t of this.store.listTasks()) this.tasks.set(t.id, t);
  }

  create(opts: { title: string; description?: string }): TaskRecord {
    const now = Date.now();
    const record: TaskRecord = {
      id: ulid(),
      title: opts.title,
      description: opts.description ?? '',
      state: 'planned',
      createdAt: now,
      updatedAt: now
    };
    this.tasks.set(record.id, record);
    this.queue.push(() => {
      this.store.createTask(record);
      this.store.appendEvent({
        id: ulid(),
        ts: now,
        origin: 'human',
        type: 'task.created',
        payload: { taskId: record.id, title: record.title }
      });
    });
    this.emit({ type: 'created', task: record });
    return record;
  }

  /**
   * Transição validada pelo core (AC1) — lança em transição inválida; grava
   * autor+timestamp na trilha (AC2). author='system' fica pronto para
   * automações futuras (ex.: redirecionamento da 5.3); hoje sempre 'human'.
   */
  updateState(id: string, to: TaskState, author: 'human' | 'system' = 'human'): TaskRecord {
    const task = this.get(id);
    assertTransition(task.state, to);
    const from = task.state;
    const updatedAt = Date.now();
    const updated: TaskRecord = { ...task, state: to, updatedAt };
    this.tasks.set(id, updated);
    this.queue.push(() => {
      this.store.updateTask(id, { state: to, updatedAt });
      this.store.appendEvent({
        id: ulid(),
        ts: updatedAt,
        origin: author,
        type: 'task.state_changed',
        payload: { taskId: id, from, to }
      });
    });
    this.emit({ type: 'state_changed', task: updated, from });
    return updated;
  }

  list(): TaskRecord[] {
    return [...this.tasks.values()].sort((a, b) => a.createdAt - b.createdAt);
  }

  get(id: string): TaskRecord {
    const t = this.tasks.get(id);
    if (!t) throw new Error(`Tarefa desconhecida: ${id}`);
    return t;
  }

  onEvent(listener: TaskListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: TaskEvent): void {
    for (const listener of this.listeners) listener(event);
  }
}
