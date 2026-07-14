import { describe, expect, it } from 'vitest';
import { MemoryStateStore } from './state-store/memory-state-store';
import { WriteQueue } from './state-store/write-queue';
import { TaskManager } from './task-manager';

function makeHarness(): { store: MemoryStateStore; queue: WriteQueue; manager: TaskManager } {
  const store = new MemoryStateStore();
  store.init();
  const queue = new WriteQueue((batch) => batch.forEach((op) => op()), { flushMs: 5 });
  const manager = new TaskManager(store, queue);
  return { store, queue, manager };
}

describe('TaskManager (Story 5.1, FR13)', () => {
  it('create() nasce planned, persiste e registra task.created na trilha (AC1/AC2)', () => {
    const { store, queue, manager } = makeHarness();
    const events: string[] = [];
    manager.onEvent((e) => events.push(e.type));

    const task = manager.create({ title: 'Implementar X' });
    queue.flush();

    expect(task.state).toBe('planned');
    expect(task.description).toBe('');
    expect(events).toEqual(['created']);
    expect(store.tasks.get(task.id)).toMatchObject({ title: 'Implementar X', state: 'planned' });

    const trail = store.listEvents({ limit: 10, type: 'task.created' });
    expect(trail).toHaveLength(1);
    expect(trail[0]!.payload).toMatchObject({ taskId: task.id, title: 'Implementar X' });
  });

  it('updateState() valida a transição pelo core e lança em transição inválida (AC1)', () => {
    const { manager } = makeHarness();
    const task = manager.create({ title: 'X' });

    expect(() => manager.updateState(task.id, 'done')).toThrow(/planned.*done/);
    expect(manager.get(task.id).state).toBe('planned'); // estado NÃO mudou na falha
  });

  it('updateState() válida atualiza, persiste e registra autor+timestamp na trilha (AC2)', () => {
    const { store, queue, manager } = makeHarness();
    const events: Array<{ type: string; from?: string }> = [];
    manager.onEvent((e) => events.push(e.type === 'state_changed' ? { type: e.type, from: e.from } : { type: e.type }));

    const task = manager.create({ title: 'X' });
    const updated = manager.updateState(task.id, 'in_progress');
    queue.flush();

    expect(updated.state).toBe('in_progress');
    expect(updated.updatedAt).toBeGreaterThanOrEqual(task.updatedAt);
    expect(events).toEqual([{ type: 'created' }, { type: 'state_changed', from: 'planned' }]);
    expect(store.tasks.get(task.id)!.state).toBe('in_progress');

    const trail = store.listEvents({ limit: 10, type: 'task.state_changed' });
    expect(trail).toHaveLength(1);
    expect(trail[0]!.origin).toBe('human');
    expect(trail[0]!.payload).toMatchObject({ taskId: task.id, from: 'planned', to: 'in_progress' });
    expect(trail[0]!.ts).toBeGreaterThan(0);
  });

  it('sobrevive a "restart": novo TaskManager sobre o mesmo store carrega tudo (AC3)', () => {
    const first = makeHarness();
    const a = first.manager.create({ title: 'A' });
    first.manager.updateState(a.id, 'in_progress');
    first.manager.create({ title: 'B' });
    first.queue.flush();

    const manager2 = new TaskManager(first.store, first.queue);
    manager2.load();

    const list = manager2.list();
    expect(list).toHaveLength(2);
    expect(list.find((t) => t.id === a.id)!.state).toBe('in_progress');
    expect(list.map((t) => t.title).sort()).toEqual(['A', 'B']);
  });

  it('rejeitar (awaiting_decision → in_progress) e concluir após revisão funcionam de ponta a ponta', () => {
    const { manager } = makeHarness();
    const task = manager.create({ title: 'Y' });
    manager.updateState(task.id, 'in_progress');
    manager.updateState(task.id, 'awaiting_decision');

    const rejected = manager.updateState(task.id, 'in_progress'); // rejeitar
    expect(rejected.state).toBe('in_progress');

    manager.updateState(task.id, 'awaiting_decision');
    manager.updateState(task.id, 'reviewed');
    const done = manager.updateState(task.id, 'done');
    expect(done.state).toBe('done');
  });

  it('decide("approve") leva a reviewed e grava a decisão auditável (Story 5.3, AC1/AC2)', () => {
    const { store, queue, manager } = makeHarness();
    const task = manager.create({ title: 'Z' });
    manager.updateState(task.id, 'in_progress');
    manager.updateState(task.id, 'awaiting_decision');

    const approved = manager.decide(task.id, 'approve');
    queue.flush();

    expect(approved.state).toBe('reviewed');
    const decisions = store.listEvents({ limit: 10, type: 'task.decision' });
    expect(decisions).toHaveLength(1);
    expect(decisions[0]!.origin).toBe('human');
    expect(decisions[0]!.payload).toEqual({ taskId: task.id, action: 'approve' }); // sem justificativa
  });

  it('decide("reject", justificativa) leva a in_progress e grava o feedback (Story 5.3, AC1/AC2)', () => {
    const { store, queue, manager } = makeHarness();
    const task = manager.create({ title: 'Z' });
    manager.updateState(task.id, 'in_progress');
    manager.updateState(task.id, 'awaiting_decision');

    const rejected = manager.decide(task.id, 'reject', 'faltou tratar o caso X');
    queue.flush();

    expect(rejected.state).toBe('in_progress');
    const decisions = store.listEvents({ limit: 10, type: 'task.decision' });
    expect(decisions[0]!.payload).toEqual({
      taskId: task.id,
      action: 'reject',
      justification: 'faltou tratar o caso X'
    });
  });

  it('decide("redirect") leva a in_progress e registra a decisão (Story 5.3, AC1) — o vínculo é responsabilidade do Main', () => {
    const { manager } = makeHarness();
    const task = manager.create({ title: 'Z' });
    manager.updateState(task.id, 'in_progress');
    manager.updateState(task.id, 'awaiting_decision');

    const redirected = manager.decide(task.id, 'redirect');
    expect(redirected.state).toBe('in_progress');
  });

  it('decide() reusa a validação do core: lança se a tarefa não está em awaiting_decision', () => {
    const { manager } = makeHarness();
    const task = manager.create({ title: 'Z' }); // planned

    expect(() => manager.decide(task.id, 'approve')).toThrow(/planned.*reviewed/);
    expect(manager.get(task.id).state).toBe('planned');
  });
});
