import { ulid } from './ulid';
import type { LearningStatus, PersistedLearning, StateStore } from './state-store/types';
import type { WriteQueue } from './state-store/write-queue';

export type Learning = PersistedLearning;

export type LearningEvent =
  | { type: 'created'; learning: Learning }
  | { type: 'status_changed'; learning: Learning; from: LearningStatus };

export type LearningListener = (event: LearningEvent) => void;

/** Transições válidas de qualificação (Épico 11, Story 11.2, FR32) — decisão HUMANA, nunca automática. */
const VALID_TRANSITIONS: Record<LearningStatus, LearningStatus[]> = {
  draft: ['reviewed', 'discarded'],
  reviewed: ['reusable', 'discarded'],
  reusable: [],
  discarded: []
};

export function canTransitionLearning(from: LearningStatus, to: LearningStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

/**
 * LearningManager (Épico 11, FR30) — mesmo princípio do TaskManager (5.1):
 * estado vivo + persistência juntos, sem recurso externo a orquestrar.
 * "Banco separado dos projetos": `projectId` é só rastreabilidade — nunca
 * usado para filtrar/escopar aqui (isso é decisão da UI, Story 11.3).
 */
export class LearningManager {
  private readonly learnings = new Map<string, Learning>();
  private readonly listeners = new Set<LearningListener>();

  constructor(
    private readonly store: StateStore,
    private readonly queue: WriteQueue
  ) {}

  /** Carrega learnings persistidos (chamar uma vez no boot). */
  load(): void {
    for (const l of this.store.listLearnings()) this.learnings.set(l.id, l);
  }

  create(opts: { text: string; category: string; projectId: string | null }): Learning {
    const now = Date.now();
    const record: Learning = {
      id: ulid(),
      text: opts.text,
      category: opts.category,
      projectId: opts.projectId,
      status: 'draft',
      createdAt: now,
      updatedAt: now
    };
    this.learnings.set(record.id, record);
    this.queue.push(() => this.store.createLearning(record));
    this.emit({ type: 'created', learning: record });
    return record;
  }

  /**
   * Qualificação (Story 11.2, AC1/AC2/AC4) — decisão SEMPRE humana (nunca
   * chamada automaticamente por nenhum listener deste projeto); lança em
   * transição inválida (mesmo padrão de `assertTransition`). Trilha
   * auditável gravada aqui, mesmo padrão do `TaskManager.updateState`
   * (autor+timestamp na mesma escrita da mudança de estado).
   */
  updateStatus(id: string, to: LearningStatus): Learning {
    const learning = this.learnings.get(id);
    if (!learning) throw new Error(`Learning desconhecido: ${id}`);
    if (!canTransitionLearning(learning.status, to)) {
      throw new Error(`Transição inválida: ${learning.status} → ${to}`);
    }
    const from = learning.status;
    const updatedAt = Date.now();
    const updated: Learning = { ...learning, status: to, updatedAt };
    this.learnings.set(id, updated);
    this.queue.push(() => {
      this.store.updateLearningStatus(id, to, updatedAt);
      this.store.appendEvent({
        id: ulid(),
        ts: updatedAt,
        origin: 'human',
        type: 'learning.status_changed',
        payload: { learningId: id, from, to }
      });
    });
    this.emit({ type: 'status_changed', learning: updated, from });
    return updated;
  }

  list(): Learning[] {
    return [...this.learnings.values()].sort((a, b) => b.createdAt - a.createdAt);
  }

  onEvent(listener: LearningListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: LearningEvent): void {
    for (const listener of this.listeners) listener(event);
  }
}
