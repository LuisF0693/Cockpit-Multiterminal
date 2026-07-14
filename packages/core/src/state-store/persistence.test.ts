import { describe, expect, it } from 'vitest';
import { SessionRegistry, type PtyOps } from '../session-registry';
import { MemoryStateStore } from './memory-state-store';
import { PersistenceManager } from './persistence';
import { WriteQueue } from './write-queue';

function makeOps(failFor: Set<string> = new Set()): PtyOps & { createdTags: string[] } {
  let seq = 0;
  const state = {
    createdTags: [] as string[],
    createPty: async ({ sessionId }: { sessionId: string }) => {
      if (failFor.has(sessionId)) throw new Error('cwd inexistente');
      state.createdTags.push(sessionId);
      return { ptyId: `pty-${++seq}`, pid: 1000 + seq };
    },
    closePty: async () => ({ orphan: false }),
    resizePty: () => void 0
  };
  return state;
}

function makeHarness(ops: PtyOps = makeOps()): {
  store: MemoryStateStore;
  queue: WriteQueue;
  manager: PersistenceManager;
  registry: SessionRegistry;
} {
  const store = new MemoryStateStore();
  store.init();
  const queue = new WriteQueue((batch) => batch.forEach((op) => op()), { flushMs: 5 });
  const manager = new PersistenceManager(store, queue);
  const registry = new SessionRegistry(ops);
  manager.wire(registry);
  return { store, queue, manager, registry };
}

describe('PersistenceManager (Story 1.4)', () => {
  it('persiste created/renamed/closed com trilha de eventos', async () => {
    const { store, queue, registry } = makeHarness();

    const s = await registry.create({ cols: 80, rows: 24, name: 'Build', cwd: 'C:/work' });
    registry.rename(s.id, 'Build & Ship');
    await registry.close(s.id);
    queue.flush();

    const row = store.terminals.get(s.id)!;
    expect(row.name).toBe('Build & Ship');
    expect(row.cwd).toBe('C:/work');
    expect(row.archivedAt).not.toBeNull(); // closed → arquivada, não destruída
    expect(store.events.map((e) => e.type)).toEqual([
      'terminal.created',
      'terminal.renamed',
      'terminal.closed'
    ]);
  });

  it('exited persiste status mas mantém a sessão restaurável', async () => {
    const { store, queue, registry } = makeHarness();
    const s = await registry.create({ cols: 80, rows: 24 });
    registry.markExited(registry.ptyIdOf(s.id));
    queue.flush();

    expect(store.terminals.get(s.id)!.status).toBe('exited');
    expect(store.listActiveTerminals().map((t) => t.id)).toEqual([s.id]);
  });

  it('persistLayout grava tiles e savedLayout devolve só ativos', async () => {
    const { store, queue, manager, registry } = makeHarness();
    const a = await registry.create({ cols: 80, rows: 24 });
    const b = await registry.create({ cols: 80, rows: 24 });
    queue.flush();

    manager.persistLayout([
      { id: a.id, x: 8, y: 8, width: 640, height: 400, zIndex: 1 },
      { id: b.id, x: 700, y: 8, width: 480, height: 320, zIndex: 2 }
    ]);
    queue.flush();
    await registry.close(b.id);
    queue.flush();

    const saved = manager.savedLayout();
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ id: a.id, x: 8, width: 640 });
    expect(store.terminals.get(b.id)!.tile).not.toBeNull(); // arquivada preserva tile
  });

  it('restore relança ativos com MESMO id/nome/cwd e injeta scrollback', async () => {
    const first = makeHarness();
    const a = await first.registry.create({ cols: 80, rows: 24, name: 'API', cwd: 'C:/api' });
    const b = await first.registry.create({ cols: 80, rows: 24, name: 'Web', cwd: 'C:/web' });
    first.queue.flush();

    // "reboot": novo registry/ops sobre o MESMO store
    const ops2 = makeOps();
    const registry2 = new SessionRegistry(ops2);
    const manager2 = new PersistenceManager(first.store, first.queue);
    manager2.wire(registry2);

    const result = await manager2.restore(registry2);
    expect(result).toMatchObject({ restored: 2, archived: 0 });
    expect(result.elapsedMs).toBeGreaterThanOrEqual(0); // Story 4.2 (AC1)
    expect(ops2.createdTags).toEqual([a.id, b.id]); // ids preservados → scrollback certo
    const restored = registry2.list();
    expect(restored.map((r) => [r.id, r.name, r.cwd])).toEqual([
      [a.id, 'API', 'C:/api'],
      [b.id, 'Web', 'C:/web']
    ]);
  });

  it('restore arquiva (nunca destrói) sessão que falha ao subir', async () => {
    const first = makeHarness();
    const a = await first.registry.create({ cols: 80, rows: 24 });
    const b = await first.registry.create({ cols: 80, rows: 24 });
    first.queue.flush();

    const ops2 = makeOps(new Set([a.id]));
    const registry2 = new SessionRegistry(ops2);
    const manager2 = new PersistenceManager(first.store, first.queue);

    const result = await manager2.restore(registry2);
    first.queue.flush();

    expect(result).toMatchObject({ restored: 1, archived: 1 });
    expect(first.store.terminals.get(a.id)!.archivedAt).not.toBeNull();
    expect(registry2.list().map((r) => r.id)).toEqual([b.id]);
  });

  it('timeline lê eventos com filtros e flush prévio (Story 3.3)', async () => {
    const { manager, registry } = makeHarness();
    const a = await registry.create({ cols: 80, rows: 24, name: 'A' });
    const b = await registry.create({ cols: 80, rows: 24, name: 'B' });
    manager.recordInstruction(a.id, 'roda os testes');

    // flush interno do timeline() deve enxergar tudo, mesmo sem flush manual
    const all = manager.timeline({ limit: 100 });
    expect(all.map((e) => e.type)).toContain('instruction.sent');
    expect(all.map((e) => e.type).filter((t) => t === 'terminal.created')).toHaveLength(2);

    const onlyA = manager.timeline({ limit: 100, terminalId: a.id });
    expect(onlyA.every((e) => e.terminalId === a.id)).toBe(true);

    const onlyInstr = manager.timeline({ limit: 100, type: 'instruction.sent' });
    expect(onlyInstr).toHaveLength(1);
    expect(onlyInstr[0]!.origin).toBe('human');
    expect(onlyInstr[0]!.terminalId).toBe(a.id);
    expect(b.id).toBeTruthy();
  });

  it('restore registra session.recovered na trilha (Story 3.3)', async () => {
    const first = makeHarness();
    await first.registry.create({ cols: 80, rows: 24, name: 'API' });
    first.queue.flush();

    const registry2 = new SessionRegistry(makeOps());
    const manager2 = new PersistenceManager(first.store, first.queue);
    await manager2.restore(registry2);

    const recovered = manager2.timeline({ limit: 10, type: 'session.recovered' });
    expect(recovered).toHaveLength(1);
    expect(recovered[0]!.payload['name']).toBe('API');
  });

  it('status.changed entra na trilha com origem agent (Story 3.5)', async () => {
    const { manager, registry } = makeHarness();
    const s = await registry.create({ cols: 80, rows: 24 });
    const ptyId = registry.ptyIdOf(s.id);
    registry.markAgentStatus(ptyId, 'waiting-input');
    registry.markAgentStatus(ptyId, 'waiting-input'); // sem mudança → não emite
    registry.markAgentStatus(ptyId, 'working');

    const changed = manager.timeline({ limit: 10, type: 'status.changed' });
    expect(changed).toHaveLength(2);
    expect(changed[0]!.origin).toBe('agent');
    // mesmo ms → ordem entre iguais não é garantida; comparar como conjunto
    expect(changed.map((e) => e.payload['status']).sort()).toEqual(['waiting-input', 'working']);
  });

  it('exited registra exitCode no payload da trilha (Story 3.5)', async () => {
    const { manager, registry } = makeHarness();
    const s = await registry.create({ cols: 80, rows: 24 });
    registry.markExited(registry.ptyIdOf(s.id), 137);

    const exited = manager.timeline({ limit: 10, type: 'terminal.exited' });
    expect(exited).toHaveLength(1);
    expect(exited[0]!.payload['exitCode']).toBe(137);
  });

  it('sessionReport projeta métricas da trilha (Story 3.5)', async () => {
    const { manager, registry } = makeHarness();
    const s = await registry.create({ cols: 80, rows: 24, name: 'Build', cwd: 'C:/work' });
    const ptyId = registry.ptyIdOf(s.id);
    registry.markAgentStatus(ptyId, 'waiting-input');
    manager.recordInstruction(s.id, 'segue');
    registry.markAgentStatus(ptyId, 'working');
    registry.markExited(ptyId, 0);

    const r = manager.sessionReport(s.id)!;
    expect(r).toMatchObject({
      terminalId: s.id,
      name: 'Build',
      statusTransitions: 2,
      instructions: 1,
      recoveries: 0,
      exitCode: 0,
      endedAt: null // exited ≠ closed: sessão segue restaurável
    });
    expect(r.durationMs).toBeGreaterThanOrEqual(0);

    await registry.close(s.id);
    expect(manager.sessionReport(s.id)!.endedAt).not.toBeNull();
    expect(manager.sessionReport('inexistente')).toBeNull();
  });

  it('workspace persiste no upsert e restaura com a sessão (Story 3.6)', async () => {
    const first = makeHarness();
    const a = await first.registry.create({ cols: 80, rows: 24, name: 'API', workspace: 'Alpha' });
    const b = await first.registry.create({ cols: 80, rows: 24, name: 'Web' }); // default Geral
    first.queue.flush();

    expect(first.store.terminals.get(a.id)!.workspace).toBe('Alpha');
    expect(first.store.terminals.get(b.id)!.workspace).toBe('Geral');

    const registry2 = new SessionRegistry(makeOps());
    const manager2 = new PersistenceManager(first.store, first.queue);
    manager2.wire(registry2);
    await manager2.restore(registry2);
    expect(registry2.list().map((r) => [r.name, r.workspace])).toEqual([
      ['API', 'Alpha'],
      ['Web', 'Geral']
    ]);
  });

  it('renameWorkspace propaga a vivas, persistidas e meta (Story 3.6)', async () => {
    const { store, queue, manager, registry } = makeHarness();
    manager.createWorkspace('Alpha');
    const a = await registry.create({ cols: 80, rows: 24, workspace: 'Alpha' });
    const arch = await registry.create({ cols: 80, rows: 24, workspace: 'Alpha' });
    await registry.close(arch.id); // arquivada também deve ser renomeada
    manager.setActiveWorkspace('Alpha');
    queue.flush();

    const list = manager.renameWorkspace(registry, 'Alpha', 'Beta');
    queue.flush();

    expect(list.names).toContain('Beta');
    expect(list.names).not.toContain('Alpha');
    expect(list.active).toBe('Beta');
    expect(registry.list()[0]!.workspace).toBe('Beta'); // viva atualizada
    expect(store.terminals.get(a.id)!.workspace).toBe('Beta');
    expect(store.terminals.get(arch.id)!.workspace).toBe('Beta'); // arquivada
  });

  it('workspaces(): união com Geral indelével e ativo com fallback (Story 3.6)', async () => {
    const { manager, registry } = makeHarness();
    await registry.create({ cols: 80, rows: 24, workspace: 'Órfão' }); // só nos terminais
    manager.createWorkspace('Alpha'); // só na meta

    const list = manager.workspaces();
    expect(list.names).toEqual(expect.arrayContaining(['Geral', 'Alpha', 'Órfão']));
    expect(list.active).toBe('Geral');

    expect(manager.setActiveWorkspace('inexistente').active).toBe('Geral'); // fallback
    expect(manager.setActiveWorkspace('Alpha').active).toBe('Alpha');
  });

  describe('projetos (Story 8.1, FR21)', () => {
    it('ensureDefaultProject cria "Padrão" só no primeiro boot (idempotente)', () => {
      const { manager } = makeHarness();
      const first = manager.ensureDefaultProject('C:/repo');
      expect(first.projects).toHaveLength(1);
      expect(first.projects[0]).toMatchObject({ name: 'Padrão', rootPath: 'C:/repo' });
      expect(first.activeId).toBe(first.projects[0]!.id);

      const second = manager.ensureDefaultProject('C:/outro-caminho'); // no-op: já existe projeto
      expect(second.projects).toHaveLength(1);
      expect(second.projects[0]!.rootPath).toBe('C:/repo');
    });

    it('createProject/updateProject/setActiveProject', () => {
      const { manager } = makeHarness();
      manager.ensureDefaultProject('C:/repo');

      const created = manager.createProject({ name: 'AllFluence', color: '#F87171', rootPath: 'C:/allfluence' });
      expect(created.projects).toHaveLength(2);
      const newId = created.projects[1]!.id;

      const active = manager.setActiveProject(newId);
      expect(active.activeId).toBe(newId);

      const updated = manager.updateProject({ id: newId, name: 'AllFluence Renomeado' });
      expect(updated.projects.find((p) => p.id === newId)).toMatchObject({
        name: 'AllFluence Renomeado',
        color: '#F87171', // campo ausente não muda
        rootPath: 'C:/allfluence'
      });
    });

    it('removeProject rejeita remover o último projeto restante (AC4)', () => {
      const { manager } = makeHarness();
      const { projects } = manager.ensureDefaultProject('C:/repo');
      expect(() => manager.removeProject(projects[0]!.id)).toThrow();
    });

    it('removeProject: se o removido era o ativo, ativo cai para o primeiro restante', () => {
      const { manager } = makeHarness();
      const first = manager.ensureDefaultProject('C:/repo');
      const created = manager.createProject({ name: 'AllFluence', color: '#F87171', rootPath: 'C:/allfluence' });
      const secondId = created.projects[1]!.id;
      manager.setActiveProject(secondId);

      const afterRemove = manager.removeProject(secondId);
      expect(afterRemove.projects).toHaveLength(1);
      expect(afterRemove.activeId).toBe(first.projects[0]!.id);
    });
  });

  it('adopt cria record vivo e restore pula adotadas (Story 6.3)', async () => {
    const first = makeHarness();
    const a = await first.registry.create({ cols: 80, rows: 24, name: 'API', cwd: 'C:/api', workspace: 'Alpha' });
    const b = await first.registry.create({ cols: 80, rows: 24, name: 'Web' });
    first.queue.flush();

    // "reboot": A está viva no daemon → adotada; só B relança via ops
    const ops2 = makeOps();
    const registry2 = new SessionRegistry(ops2);
    const manager2 = new PersistenceManager(first.store, first.queue);
    manager2.wire(registry2);

    registry2.adopt({
      id: a.id,
      name: 'API',
      cwd: 'C:/api',
      adapterId: 'shell',
      workspace: 'Alpha',
      pid: 4242,
      createdAt: a.createdAt
    });
    manager2.recordAdoption(a.id, { name: 'API', adapterId: 'shell', pid: 4242 });

    const result = await manager2.restore(registry2);
    expect(result).toMatchObject({ restored: 1, archived: 0 }); // só B
    expect(ops2.createdTags).toEqual([b.id]); // A NÃO relançada

    const adopted = registry2.list().find((r) => r.id === a.id)!;
    expect(adopted).toMatchObject({ pid: 4242, status: 'running', workspace: 'Alpha', adapterId: 'shell' });

    const trail = manager2.timeline({ limit: 10, type: 'session.adopted' });
    expect(trail).toHaveLength(1);
    expect(trail[0]!.terminalId).toBe(a.id);
  });

  it('sessionReport distingue adoções de recuperações (Story 4.2, AC2)', async () => {
    const first = makeHarness();
    const a = await first.registry.create({ cols: 80, rows: 24, name: 'API', cwd: 'C:/api' });
    first.queue.flush();

    // 1ª retomada: adoção pelo daemon (sem perda)
    const registry2 = new SessionRegistry(makeOps());
    const manager2 = new PersistenceManager(first.store, first.queue);
    manager2.wire(registry2);
    registry2.adopt({ id: a.id, name: 'API', cwd: 'C:/api', adapterId: 'shell', workspace: 'Geral', pid: 111 });
    manager2.recordAdoption(a.id, { name: 'API', adapterId: 'shell', pid: 111 });

    // 2ª retomada: relaunch clássico (sessão reiniciada)
    const registry3 = new SessionRegistry(makeOps());
    const manager3 = new PersistenceManager(first.store, first.queue);
    manager3.wire(registry3);
    await manager3.restore(registry3);

    const report = manager3.sessionReport(a.id)!;
    expect(report.adoptions).toBe(1);
    expect(report.recoveries).toBe(1);

    // Ambos os tipos aparecem DISTINTOS na timeline da sessão.
    const trail = manager3.timeline({ limit: 10, terminalId: a.id });
    const types = trail.map((e) => e.type);
    expect(types).toContain('session.adopted');
    expect(types).toContain('session.recovered');
  });

  it('crashSummary lista ativos com último status conhecido (Story 4.3, AC2)', async () => {
    const { manager, registry } = makeHarness();
    const withStatus = await registry.create({ cols: 80, rows: 24, name: 'Com status', cwd: 'C:/a' });
    registry.markAgentStatus(registry.ptyIdOf(withStatus.id), 'waiting-input');
    const noStatus = await registry.create({ cols: 80, rows: 24, name: 'Sem status', cwd: 'C:/b' });
    manager.recordInstruction(withStatus.id, 'algo'); // ruído global na trilha

    const summary = manager.crashSummary();
    const a = summary.terminals.find((t) => t.id === withStatus.id)!;
    const b = summary.terminals.find((t) => t.id === noStatus.id)!;
    expect(a).toMatchObject({ name: 'Com status', adapterId: 'shell', cwd: 'C:/a', lastKnownStatus: 'waiting-input' });
    expect(b.lastKnownStatus).toBe('desconhecido'); // sem status.changed na trilha
    expect(summary.lastEvents.length).toBeGreaterThan(0);
  });

  it('archiveForCrash arquiva sem destruir e some do próximo crashSummary (Story 4.3, AC3)', async () => {
    const { store, queue, manager, registry } = makeHarness();
    const s = await registry.create({ cols: 80, rows: 24, name: 'Descartada', cwd: 'C:/x' });

    manager.archiveForCrash(s.id);
    queue.flush();

    expect(store.terminals.get(s.id)!.archivedAt).not.toBeNull(); // arquivada, não destruída
    expect(store.terminals.has(s.id)).toBe(true); // linha PRESERVADA
    expect(manager.crashSummary().terminals.map((t) => t.id)).not.toContain(s.id);
  });

  it('recordCrashRecovery registra escolha e contadores na trilha (Story 4.3, AC4)', () => {
    const { manager } = makeHarness();
    manager.recordCrashRecovery('selective', { restored: 1, archived: 2, adopted: 0 });

    const trail = manager.timeline({ limit: 10, type: 'crash.recovery' });
    expect(trail).toHaveLength(1);
    expect(trail[0]!.origin).toBe('human');
    expect(trail[0]!.payload).toMatchObject({ choice: 'selective', restored: 1, archived: 2, adopted: 0 });
  });

  it('linkTask vincula/desvincula, persiste e grava trilha (Story 5.2, AC1)', async () => {
    const { store, queue, registry } = makeHarness();
    const s = await registry.create({ cols: 80, rows: 24, name: 'Build' });
    expect(s.taskId).toBeNull(); // default

    const linked = registry.linkTask(s.id, 'task-abc');
    queue.flush();
    expect(linked.taskId).toBe('task-abc');
    expect(store.terminals.get(s.id)!.taskId).toBe('task-abc'); // persistido

    const unlinked = registry.linkTask(s.id, null);
    queue.flush();
    expect(unlinked.taskId).toBeNull();
    expect(store.terminals.get(s.id)!.taskId).toBeNull();

    const trail = store.listEvents({ limit: 10, type: 'terminal.task_linked' });
    expect(trail).toHaveLength(2);
    // mesmo ms → ordem entre iguais não é garantida; comparar como conjunto
    expect(trail.map((e) => e.payload['taskId']).sort()).toEqual([null, 'task-abc'].sort());
    expect(trail.every((e) => e.terminalId === s.id)).toBe(true);
  });

  it('linkTask preserva os demais campos do terminal (nome/cwd/workspace/adapter)', async () => {
    const { store, queue, registry } = makeHarness();
    const s = await registry.create({ cols: 80, rows: 24, name: 'API', cwd: 'C:/api', workspace: 'Alpha' });
    queue.flush();

    registry.linkTask(s.id, 'task-xyz');
    queue.flush();

    const row = store.terminals.get(s.id)!;
    expect(row).toMatchObject({ name: 'API', cwd: 'C:/api', workspace: 'Alpha', adapterId: 'shell', taskId: 'task-xyz' });
  });

  it('vínculo sobrevive ao relaunch clássico do restore() (Story 5.2)', async () => {
    const first = makeHarness();
    const s = await first.registry.create({ cols: 80, rows: 24, name: 'API' });
    first.registry.linkTask(s.id, 'task-persist');
    first.queue.flush();

    const registry2 = new SessionRegistry(makeOps());
    const manager2 = new PersistenceManager(first.store, first.queue);
    manager2.wire(registry2);
    await manager2.restore(registry2);

    expect(registry2.list()[0]!.taskId).toBe('task-persist');
  });

  it('linkTask com role persiste e sobrevive a "restart" (Story 7.1, FR16)', async () => {
    const first = makeHarness();
    const s = await first.registry.create({ cols: 80, rows: 24, name: 'API' });
    const linked = first.registry.linkTask(s.id, 'task-7-1', 'writer');
    first.queue.flush();

    expect(linked.taskRole).toBe('writer');
    expect(first.store.terminals.get(s.id)!.taskRole).toBe('writer');

    const registry2 = new SessionRegistry(makeOps());
    const manager2 = new PersistenceManager(first.store, first.queue);
    manager2.wire(registry2);
    await manager2.restore(registry2);

    expect(registry2.list()[0]!).toMatchObject({ taskId: 'task-7-1', taskRole: 'writer' });
  });

  it('desvincular (taskId=null) limpa o papel implicitamente (Story 7.1)', async () => {
    const { store, queue, registry } = makeHarness();
    const s = await registry.create({ cols: 80, rows: 24 });
    registry.linkTask(s.id, 'task-x', 'reviewer');
    queue.flush();
    expect(store.terminals.get(s.id)!.taskRole).toBe('reviewer');

    const unlinked = registry.linkTask(s.id, null);
    queue.flush();
    expect(unlinked.taskRole).toBeNull();
    expect(store.terminals.get(s.id)!.taskRole).toBeNull();
  });

  it('clean_shutdown: boot marca 0, exit gracioso marca 1', () => {
    const { store, manager } = makeHarness();

    const boot1 = manager.markBootStart();
    expect(boot1.cleanShutdown).toBe(true); // primeira execução conta como limpa
    expect(store.getMeta('clean_shutdown')).toBe('0');

    const boot2 = manager.markBootStart(); // "crash": reabriu sem marcar 1
    expect(boot2.cleanShutdown).toBe(false);

    manager.markCleanShutdown();
    expect(store.getMeta('clean_shutdown')).toBe('1');
  });
});
