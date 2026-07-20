import { ulid } from './ulid';
import type { DispatchOutcome, PersistedDispatchRecord, StateStore } from './state-store/types';
import type { WriteQueue } from './state-store/write-queue';

export type DispatchRecord = PersistedDispatchRecord;

export type DispatchEvent =
  | { type: 'created'; record: DispatchRecord }
  | { type: 'outcome_recorded'; record: DispatchRecord };

export type DispatchListener = (event: DispatchEvent) => void;

/**
 * DispatchManager (Épico 18, Story 18.4) — mesmo princípio do LearningManager
 * (11.x)/TaskManager (5.1): estado vivo em Map + persistência via WriteQueue,
 * sem recurso externo a orquestrar. Histórico FACTUAL de despachos
 * RASTREÁVEIS: só nasce quando `dispatchedBy` já foi resolvido no ponto de
 * adoção externa (Story 17.2) — sem vínculo detectado, nenhum registro é
 * criado (AC4).
 */
export class DispatchManager {
  private readonly records = new Map<string, DispatchRecord>();
  /** Índice workerId → id do registro — recordOutcome nunca varre a Map inteira. */
  private readonly byWorkerId = new Map<string, string>();
  private readonly listeners = new Set<DispatchListener>();

  constructor(
    private readonly store: StateStore,
    private readonly queue: WriteQueue
  ) {}

  /** Carrega o histórico persistido (chamar uma vez no boot). */
  load(): void {
    for (const r of this.store.listDispatchRecords()) {
      this.records.set(r.id, r);
      this.byWorkerId.set(r.workerId, r.id);
    }
  }

  create(opts: {
    dispatchedBy: string;
    workerId: string;
    label: string;
    adapterId: string;
    model: string | null;
    projectId: string | null;
  }): DispatchRecord {
    const record: DispatchRecord = {
      id: ulid(),
      dispatchedBy: opts.dispatchedBy,
      workerId: opts.workerId,
      label: opts.label,
      adapterId: opts.adapterId,
      model: opts.model,
      projectId: opts.projectId,
      createdAt: Date.now(),
      outcome: null,
      outcomeAt: null
    };
    this.records.set(record.id, record);
    this.byWorkerId.set(record.workerId, record.id);
    this.queue.push(() => this.store.createDispatchRecord(record));
    this.emit({ type: 'created', record });
    return record;
  }

  /**
   * Desfecho do worker (AC3 — `done`/`error`/fechamento). No-op se não há
   * registro rastreável pra este `workerId` (despacho sem vínculo, AC4,
   * nunca criou registro) — mesmo nível de encapsulamento simples do
   * `LearningManager.updateStatus`, mas sem lançar: o chamador é um listener
   * de status/ciclo de vida que não deve derrubar em cenário comum.
   */
  recordOutcome(workerId: string, outcome: DispatchOutcome): DispatchRecord | null {
    const id = this.byWorkerId.get(workerId);
    if (!id) return null;
    const record = this.records.get(id);
    if (!record) return null;
    const outcomeAt = Date.now();
    const updated: DispatchRecord = { ...record, outcome, outcomeAt };
    this.records.set(id, updated);
    this.queue.push(() => this.store.updateDispatchOutcome(workerId, outcome, outcomeAt));
    this.emit({ type: 'outcome_recorded', record: updated });
    return updated;
  }

  list(): DispatchRecord[] {
    return [...this.records.values()].sort((a, b) => b.createdAt - a.createdAt);
  }

  onEvent(listener: DispatchListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: DispatchEvent): void {
    for (const listener of this.listeners) listener(event);
  }
}
