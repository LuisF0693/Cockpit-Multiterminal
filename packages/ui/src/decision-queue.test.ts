import { describe, expect, it } from 'vitest';
import type { SessionRecord, Task } from '@cockpit/shared';
import { buildDecisionQueue, countBlocking, type PendingLinkGate } from './decision-queue';

const NOW = 1_000_000;

const session = (over: Partial<SessionRecord>): SessionRecord =>
  ({
    id: 'a',
    name: 'Agente A',
    adapterId: 'shell',
    cwd: 'C:\\x',
    status: 'running',
    agentStatus: 'idle',
    createdAt: 0,
    lastStatusChangeAt: NOW - 1000,
    workspace: 'Geral',
    projectId: null,
    taskId: null,
    taskRole: null,
    ...over
  }) as SessionRecord;

const task = (over: Partial<Task>): Task =>
  ({
    id: 't1',
    title: 'Tarefa 1',
    state: 'planned',
    projectId: null,
    createdAt: 0,
    updatedAt: NOW - 1000,
    ...over
  }) as Task;

const gate = (over: Partial<PendingLinkGate>): PendingLinkGate => ({
  gateId: 'g1',
  sourceId: 'a',
  targetIds: ['b'],
  message: 'avalie o resultado',
  receivedAt: NOW - 1000,
  ...over
});

const base = {
  now: NOW,
  taskTitle: (id: string | null): string => id ?? '—',
  sessionName: (id: string): string => `nome-${id}`
};

describe('buildDecisionQueue', () => {
  it('fila vazia quando nada exige olho humano', () => {
    const items = buildDecisionQueue({
      ...base,
      sessions: [session({ agentStatus: 'working' })],
      tasks: [task({ state: 'in_progress' })],
      gates: []
    });
    expect(items).toEqual([]);
  });

  it('agente em waiting-input entra na fila com deep-link no terminal (3.4 AC1/AC3)', () => {
    const items = buildDecisionQueue({
      ...base,
      sessions: [session({ id: 'a', agentStatus: 'waiting-input' })],
      tasks: [],
      gates: []
    });
    expect(items).toHaveLength(1);
    expect(items[0]?.target).toEqual({ type: 'terminal', id: 'a' });
    expect(items[0]?.severity).toBe('attention');
  });

  it('agente waiting-input mas com processo encerrado NÃO entra (não há a quem responder)', () => {
    const items = buildDecisionQueue({
      ...base,
      sessions: [session({ agentStatus: 'waiting-input', status: 'exited' })],
      tasks: [],
      gates: []
    });
    expect(items).toEqual([]);
  });

  it('tarefa em awaiting_decision entra com deep-link na tarefa (5.3 AC3)', () => {
    const items = buildDecisionQueue({
      ...base,
      sessions: [],
      tasks: [task({ id: 't7', state: 'awaiting_decision' })],
      gates: []
    });
    expect(items[0]?.target).toEqual({ type: 'task', id: 't7' });
    expect(items[0]?.severity).toBe('blocking');
  });

  it('gate de vínculo pendente entra na fila com deep-link na ORIGEM', () => {
    const items = buildDecisionQueue({
      ...base,
      sessions: [],
      tasks: [],
      gates: [gate({ sourceId: 'src', targetIds: ['dst'] })]
    });
    expect(items).toHaveLength(1);
    expect(items[0]?.kind).toBe('link-gate');
    expect(items[0]?.target).toEqual({ type: 'terminal', id: 'src' });
  });

  it('o que represa trabalho vem antes do que só aguarda resposta', () => {
    const items = buildDecisionQueue({
      ...base,
      // agente esperando há MUITO mais tempo que a tarefa
      sessions: [session({ id: 'a', agentStatus: 'waiting-input', lastStatusChangeAt: 0 })],
      tasks: [task({ id: 't1', state: 'awaiting_decision', updatedAt: NOW - 10 })],
      gates: []
    });
    expect(items.map((i) => i.kind)).toEqual(['task-decision', 'agent-waiting']);
  });

  it('dentro da mesma severidade, o mais antigo sobe (nada é esquecido)', () => {
    const items = buildDecisionQueue({
      ...base,
      sessions: [
        session({ id: 'novo', name: 'novo', agentStatus: 'waiting-input', lastStatusChangeAt: NOW - 10 }),
        session({ id: 'antigo', name: 'antigo', agentStatus: 'waiting-input', lastStatusChangeAt: NOW - 90_000 })
      ],
      tasks: [],
      gates: []
    });
    expect(items.map((i) => i.title)).toEqual(['antigo', 'novo']);
  });

  it('todas as fontes convivem na MESMA fila', () => {
    const items = buildDecisionQueue({
      ...base,
      sessions: [session({ id: 'a', agentStatus: 'waiting-input' })],
      tasks: [task({ state: 'awaiting_decision' })],
      gates: [gate({})]
    });
    expect(items).toHaveLength(3);
    expect(new Set(items.map((i) => i.kind))).toEqual(new Set(['agent-waiting', 'task-decision', 'link-gate']));
  });
});

describe('countBlocking', () => {
  it('conta só o que represa trabalho', () => {
    const items = buildDecisionQueue({
      ...base,
      sessions: [session({ id: 'a', agentStatus: 'waiting-input' })],
      tasks: [task({ state: 'awaiting_decision' })],
      gates: [gate({})]
    });
    expect(countBlocking(items)).toBe(2);
  });
});
