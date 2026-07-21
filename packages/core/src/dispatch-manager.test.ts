import { describe, expect, it } from 'vitest';
import { MemoryStateStore } from './state-store/memory-state-store';
import { WriteQueue } from './state-store/write-queue';
import { DispatchManager } from './dispatch-manager';

function makeHarness(): { store: MemoryStateStore; queue: WriteQueue; manager: DispatchManager } {
  const store = new MemoryStateStore();
  store.init();
  const queue = new WriteQueue((batch) => batch.forEach((op) => op()), { flushMs: 5 });
  const manager = new DispatchManager(store, queue);
  return { store, queue, manager };
}

describe('DispatchManager (Épico 18, Story 18.4)', () => {
  it('create() nasce sem desfecho, persiste e emite created (AC1/AC2)', () => {
    const { store, queue, manager } = makeHarness();
    const events: string[] = [];
    manager.onEvent((e) => events.push(e.type));

    const record = manager.create({
      dispatchedBy: 'chefe-1',
      workerId: 'worker-1',
      label: '@dev',
      adapterId: 'claude-code',
      model: null,
      projectId: 'p1'
    });
    queue.flush();

    expect(record.outcome).toBeNull();
    expect(record.outcomeAt).toBeNull();
    expect(events).toEqual(['created']);
    expect(store.dispatchRecords.get(record.id)).toMatchObject({
      dispatchedBy: 'chefe-1',
      workerId: 'worker-1',
      label: '@dev',
      adapterId: 'claude-code',
      projectId: 'p1'
    });
  });

  it('create() aceita model e projectId null (Story 17.3 não propaga modelo até a adoção)', () => {
    const { manager } = makeHarness();
    const record = manager.create({
      dispatchedBy: 'chefe-1',
      workerId: 'worker-1',
      label: '@dev',
      adapterId: 'codex',
      model: null,
      projectId: null
    });
    expect(record.model).toBeNull();
    expect(record.projectId).toBeNull();
  });

  it('recordOutcome() atualiza outcome/outcomeAt e emite outcome_recorded', () => {
    const { store, queue, manager } = makeHarness();
    const record = manager.create({
      dispatchedBy: 'chefe-1',
      workerId: 'worker-1',
      label: '@dev',
      adapterId: 'claude-code',
      model: null,
      projectId: 'p1'
    });
    queue.flush();

    const events: string[] = [];
    manager.onEvent((e) => events.push(e.type));

    const updated = manager.recordOutcome('worker-1', 'done');
    queue.flush();

    expect(updated).not.toBeNull();
    expect(updated!.outcome).toBe('done');
    expect(updated!.outcomeAt).not.toBeNull();
    expect(events).toEqual(['outcome_recorded']);
    expect(store.dispatchRecords.get(record.id)).toMatchObject({ outcome: 'done' });
  });

  it('recordOutcome() é no-op quando não há registro pro workerId (AC4 — sem despacho rastreável)', () => {
    const { manager } = makeHarness();
    const events: string[] = [];
    manager.onEvent((e) => events.push(e.type));

    const result = manager.recordOutcome('worker-desconhecido', 'error');

    expect(result).toBeNull();
    expect(events).toEqual([]);
  });

  it('recordOutcome() aceita "error" e "closed" como desfechos terminais (AC3)', () => {
    const { manager } = makeHarness();
    manager.create({
      dispatchedBy: 'chefe-1',
      workerId: 'worker-err',
      label: '@qa',
      adapterId: 'gemini-cli',
      model: null,
      projectId: null
    });
    manager.create({
      dispatchedBy: 'chefe-1',
      workerId: 'worker-closed',
      label: '@analyst',
      adapterId: 'grok',
      model: null,
      projectId: null
    });

    expect(manager.recordOutcome('worker-err', 'error')!.outcome).toBe('error');
    expect(manager.recordOutcome('worker-closed', 'closed')!.outcome).toBe('closed');
  });

  it('list() ordena do mais recente para o mais antigo', () => {
    const { store } = makeHarness();
    store.createDispatchRecord({
      id: 'a',
      dispatchedBy: 'chefe-1',
      workerId: 'w1',
      label: '@dev',
      adapterId: 'claude-code',
      model: null,
      projectId: null,
      createdAt: 1,
      outcome: null,
      outcomeAt: null
    });
    store.createDispatchRecord({
      id: 'b',
      dispatchedBy: 'chefe-1',
      workerId: 'w2',
      label: '@qa',
      adapterId: 'codex',
      model: 'gpt-5',
      projectId: null,
      createdAt: 2,
      outcome: null,
      outcomeAt: null
    });

    const queue2 = new WriteQueue((batch) => batch.forEach((op) => op()), { flushMs: 5 });
    const manager2 = new DispatchManager(store, queue2);
    manager2.load();

    expect(manager2.list().map((r) => r.id)).toEqual(['b', 'a']);
  });

  it('load() restaura registros persistidos no boot, inclusive o índice por workerId', () => {
    const { store } = makeHarness();
    store.createDispatchRecord({
      id: 'r1',
      dispatchedBy: 'chefe-1',
      workerId: 'worker-1',
      label: '@dev',
      adapterId: 'claude-code',
      model: null,
      projectId: 'p1',
      createdAt: 1,
      outcome: null,
      outcomeAt: null
    });

    const queue2 = new WriteQueue((batch) => batch.forEach((op) => op()), { flushMs: 5 });
    const manager2 = new DispatchManager(store, queue2);
    manager2.load();

    expect(manager2.list()).toHaveLength(1);
    // recordOutcome funciona pós-boot (índice byWorkerId reconstruído no load).
    const updated = manager2.recordOutcome('worker-1', 'done');
    expect(updated?.outcome).toBe('done');
  });
});
