import { describe, expect, it } from 'vitest';
import { MemoryStateStore } from './state-store/memory-state-store';
import { WriteQueue } from './state-store/write-queue';
import { LearningManager, canTransitionLearning } from './learning-manager';

function makeHarness(): { store: MemoryStateStore; queue: WriteQueue; manager: LearningManager } {
  const store = new MemoryStateStore();
  store.init();
  const queue = new WriteQueue((batch) => batch.forEach((op) => op()), { flushMs: 5 });
  const manager = new LearningManager(store, queue);
  return { store, queue, manager };
}

describe('canTransitionLearning (Épico 11, Story 11.2, FR32)', () => {
  it('permite draft → reviewed e draft → discarded', () => {
    expect(canTransitionLearning('draft', 'reviewed')).toBe(true);
    expect(canTransitionLearning('draft', 'discarded')).toBe(true);
  });

  it('permite reviewed → reusable e reviewed → discarded', () => {
    expect(canTransitionLearning('reviewed', 'reusable')).toBe(true);
    expect(canTransitionLearning('reviewed', 'discarded')).toBe(true);
  });

  it('rejeita pular etapa (draft → reusable direto)', () => {
    expect(canTransitionLearning('draft', 'reusable')).toBe(false);
  });

  it('rejeita transição a partir de estado terminal (reusable/discarded)', () => {
    expect(canTransitionLearning('reusable', 'draft')).toBe(false);
    expect(canTransitionLearning('discarded', 'reviewed')).toBe(false);
  });
});

describe('LearningManager (Épico 11, Story 11.1/11.2)', () => {
  it('create() nasce draft, persiste e emite created (AC1 da 11.1)', () => {
    const { store, queue, manager } = makeHarness();
    const events: string[] = [];
    manager.onEvent((e) => events.push(e.type));

    const learning = manager.create({ text: 'sempre rodar git status antes de reset', category: 'gotcha', projectId: 'p1' });
    queue.flush();

    expect(learning.status).toBe('draft');
    expect(events).toEqual(['created']);
    expect(store.learnings.get(learning.id)).toMatchObject({ text: learning.text, category: 'gotcha' });
  });

  it('create() aceita projectId null (registro sem projeto ativo)', () => {
    const { manager } = makeHarness();
    const learning = manager.create({ text: 'x', category: 'padrão', projectId: null });
    expect(learning.projectId).toBeNull();
  });

  it('updateStatus() valida a transição e lança em transição inválida (AC1/AC2 da 11.2)', () => {
    const { manager } = makeHarness();
    const learning = manager.create({ text: 'x', category: 'gotcha', projectId: null });

    expect(() => manager.updateStatus(learning.id, 'reusable')).toThrow(/draft.*reusable/);
    expect(manager.list()[0]!.status).toBe('draft'); // estado NÃO mudou na falha
  });

  it('updateStatus() persiste e emite status_changed com "from" correto', () => {
    const { store, queue, manager } = makeHarness();
    const learning = manager.create({ text: 'x', category: 'gotcha', projectId: null });
    queue.flush();

    const events: Array<{ type: string; from?: string }> = [];
    manager.onEvent((e) => events.push(e.type === 'status_changed' ? { type: e.type, from: e.from } : { type: e.type }));

    manager.updateStatus(learning.id, 'reviewed');
    queue.flush();

    expect(events).toEqual([{ type: 'status_changed', from: 'draft' }]);
    expect(store.learnings.get(learning.id)!.status).toBe('reviewed');
  });

  it('updateStatus() em id inexistente lança', () => {
    const { manager } = makeHarness();
    expect(() => manager.updateStatus('inexistente', 'reviewed')).toThrow(/desconhecido/);
  });

  it('updateStatus() grava trilha auditável com autor+timestamp (AC4 da 11.2)', () => {
    const { store, queue, manager } = makeHarness();
    const learning = manager.create({ text: 'x', category: 'gotcha', projectId: null });
    queue.flush();

    manager.updateStatus(learning.id, 'reviewed');
    queue.flush();

    const trail = store.listEvents({ limit: 10, type: 'learning.status_changed' });
    expect(trail).toHaveLength(1);
    expect(trail[0]).toMatchObject({
      origin: 'human',
      payload: { learningId: learning.id, from: 'draft', to: 'reviewed' }
    });
  });

  it('list() ordena do mais recente para o mais antigo', () => {
    // createdAt explícito (não wall-clock) — evita colisão de timestamp
    // quando os dois create() caem no mesmo milissegundo (gotcha já
    // documentado neste projeto: sort estável não garante ordem por si só).
    const { store } = makeHarness();
    store.createLearning({ id: 'a', text: 'primeiro', category: 'x', projectId: null, status: 'draft', createdAt: 1, updatedAt: 1 });
    store.createLearning({ id: 'b', text: 'segundo', category: 'x', projectId: null, status: 'draft', createdAt: 2, updatedAt: 2 });

    const queue2 = new WriteQueue((batch) => batch.forEach((op) => op()), { flushMs: 5 });
    const manager2 = new LearningManager(store, queue2);
    manager2.load();

    expect(manager2.list().map((l) => l.id)).toEqual(['b', 'a']);
  });

  it('load() restaura learnings persistidos no boot', () => {
    const { store } = makeHarness();
    store.createLearning({
      id: 'l1',
      text: 'x',
      category: 'gotcha',
      projectId: 'p1',
      status: 'reusable',
      createdAt: 1,
      updatedAt: 1
    });

    const queue2 = new WriteQueue((batch) => batch.forEach((op) => op()), { flushMs: 5 });
    const manager2 = new LearningManager(store, queue2);
    manager2.load();

    expect(manager2.list()).toHaveLength(1);
    expect(manager2.list()[0]).toMatchObject({ id: 'l1', status: 'reusable' });
  });
});
