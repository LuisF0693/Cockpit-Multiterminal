import type { CrashSummary, LayoutTile, Project, ProjectList, SessionEvent, SessionReport } from '@cockpit/shared';
import { ulid } from '../ulid';
import type { SessionRegistry } from '../session-registry';
import type { StateStore } from './types';
import type { WriteQueue } from './write-queue';

/**
 * PersistenceManager — liga SessionRegistry + layout ao StateStore via
 * WriteQueue (persistência contínua, AC1) e planeja o restore do boot (AC2).
 * Regras: closed → arquivar (não volta no boot); exited → status persiste
 * mas a sessão É restaurada (novo shell no mesmo cwd); nada é destruído.
 */
export class PersistenceManager {
  constructor(
    private readonly store: StateStore,
    private readonly queue: WriteQueue
  ) {}

  /** Persiste eventos de domínio do registry (chamar uma vez no boot). */
  wire(registry: SessionRegistry): () => void {
    return registry.onEvent((event: SessionEvent) => {
      const s = event.session;
      this.queue.push(() => {
        switch (event.type) {
          case 'created':
          case 'renamed':
          case 'task_linked':
            this.store.upsertTerminal({
              id: s.id,
              name: s.name,
              cwd: s.cwd,
              status: s.status,
              adapterId: s.adapterId,
              workspace: s.workspace,
              taskId: s.taskId,
              taskRole: s.taskRole,
              projectId: s.projectId,
              tile: null,
              createdAt: s.createdAt,
              archivedAt: null
            });
            break;
          case 'exited':
            this.store.setTerminalStatus(s.id, 'exited');
            break;
          case 'closed':
            this.store.archiveTerminal(s.id, Date.now());
            break;
          case 'status':
            // agentStatus segue transiente na tabela terminals (Dev Notes 2.1);
            // a TRILHA registra a transição (relatório 3.5 + AC1 da 3.3).
            this.store.appendEvent({
              id: ulid(),
              ts: Date.now(),
              origin: 'agent',
              type: 'status.changed',
              terminalId: s.id,
              payload: { status: s.agentStatus }
            });
            return;
        }
        this.store.appendEvent({
          id: ulid(),
          ts: Date.now(),
          origin: 'system',
          type: `terminal.${event.type}`,
          terminalId: s.id,
          payload: {
            name: s.name,
            cwd: s.cwd,
            ...(event.type === 'exited' && s.exitCode !== undefined ? { exitCode: s.exitCode } : {}),
            ...(event.type === 'task_linked' ? { taskId: s.taskId, taskRole: s.taskRole } : {})
          }
        });
      });
    });
  }

  /** Sessão adotada do daemon no boot (Story 6.3) — trilha auditável. */
  recordAdoption(sessionId: string, payload: { name: string; adapterId: string; pid: number }): void {
    this.queue.push(() =>
      this.store.appendEvent({
        id: ulid(),
        ts: Date.now(),
        origin: 'system',
        type: 'session.adopted',
        terminalId: sessionId,
        payload
      })
    );
  }

  /** Instrução enviada via master (Story 3.2, AC3) — trilha auditável. */
  recordInstruction(sessionId: string, text: string): void {
    this.queue.push(() =>
      this.store.appendEvent({
        id: ulid(),
        ts: Date.now(),
        origin: 'human',
        type: 'instruction.sent',
        terminalId: sessionId,
        payload: { text: text.slice(0, 500), via: 'master' }
      })
    );
  }

  /** Roteamento automático de revisão (Story 7.2, FR17) — trilha auditável, origem system. */
  recordSdcReviewRequest(reviewerId: string, payload: { taskId: string; writerId: string }): void {
    this.queue.push(() =>
      this.store.appendEvent({
        id: ulid(),
        ts: Date.now(),
        origin: 'system',
        type: 'sdc.review_requested',
        terminalId: reviewerId,
        payload
      })
    );
  }

  /** Correção agregada automática ao escritor após rejeição (Story 7.4, FR19) — trilha auditável, origem system. */
  recordSdcCorrectionRequest(writerId: string, payload: { taskId: string; reviewerIds: string[] }): void {
    this.queue.push(() =>
      this.store.appendEvent({
        id: ulid(),
        ts: Date.now(),
        origin: 'system',
        type: 'sdc.correction_requested',
        terminalId: writerId,
        payload
      })
    );
  }

  /** Roteamento automático de vínculo terminal-a-terminal (Épico 9, FR26) — trilha auditável, origem system. */
  recordTerminalLinkRouting(targetId: string, payload: { sourceId: string }): void {
    this.queue.push(() =>
      this.store.appendEvent({
        id: ulid(),
        ts: Date.now(),
        origin: 'system',
        type: 'terminal_link.routed',
        terminalId: targetId,
        payload
      })
    );
  }

  /**
   * Automação de browser preview (Story 10.2, FR29) — trilha auditável.
   * `terminalId` reusa o campo genérico "id do recurso" da trilha (já usado
   * por sdc.* com ids de terminal) com o id do TILE de browser — mesma
   * convenção, recurso diferente.
   */
  recordBrowserAction(tileId: string, payload: { action: string; selector?: string }, origin: 'human' | 'system'): void {
    this.queue.push(() =>
      this.store.appendEvent({
        id: ulid(),
        ts: Date.now(),
        origin,
        type: 'browser.action',
        terminalId: tileId,
        payload
      })
    );
  }

  /** Layout do canvas (debounced no renderer) → tiles persistidos. */
  persistLayout(tiles: LayoutTile[]): void {
    this.queue.push(() => {
      for (const tile of tiles) this.store.updateTile(tile.id, tile);
    });
  }

  /** Timeline (3.3): flush dos pendentes antes de ler (frescor). */
  timeline(opts: { limit: number; terminalId?: string; type?: string }): ReturnType<StateStore['listEvents']> {
    this.queue.flush();
    return this.store.listEvents(opts);
  }

  /**
   * Relatório de sessão (3.5): projeção da linha do terminal + contagens da
   * trilha — nenhuma tabela nova. Duração corre até agora enquanto viva.
   */
  sessionReport(terminalId: string): SessionReport | null {
    this.queue.flush();
    const t = this.store.getTerminal(terminalId);
    if (!t) return null;
    const exited = this.store.listEvents({ limit: 1, terminalId, type: 'terminal.exited' })[0];
    const exitCode = exited?.payload['exitCode'];
    return {
      terminalId: t.id,
      name: t.name,
      adapterId: t.adapterId,
      cwd: t.cwd,
      createdAt: t.createdAt,
      endedAt: t.archivedAt,
      durationMs: Math.max(0, (t.archivedAt ?? Date.now()) - t.createdAt),
      statusTransitions: this.store.countEvents({ terminalId, type: 'status.changed' }),
      instructions: this.store.countEvents({ terminalId, type: 'instruction.sent' }),
      recoveries: this.store.countEvents({ terminalId, type: 'session.recovered' }),
      // Adoção pelo daemon (6.3) é retomada SEM PERDA — distinta de recovery
      // (relaunch clássico, sessão reiniciada) — AC2 da 4.2.
      adoptions: this.store.countEvents({ terminalId, type: 'session.adopted' }),
      exitCode: typeof exitCode === 'number' ? exitCode : null
    };
  }

  savedLayout(): LayoutTile[] {
    return this.store
      .listActiveTerminals()
      .flatMap((t) => (t.tile ? [{ ...t.tile, id: t.id }] : []));
  }

  /**
   * Restore do boot (AC2 da 1.4): relança cada terminal ativo no mesmo cwd
   * com o mesmo id/nome. Falhas individuais arquivam a sessão (nunca
   * destroem) e não derrubam o restante. `elapsedMs` mede só este relaunch
   * clássico — a adoção (6.3) roda ANTES e é medida à parte pelo chamador,
   * que soma os dois para o time-to-resume total (AC1 da 4.2).
   */
  async restore(registry: SessionRegistry): Promise<{ restored: number; archived: number; elapsedMs: number }> {
    const start = Date.now();
    let restored = 0;
    let archived = 0;
    for (const t of this.store.listActiveTerminals()) {
      // Adotadas pelo daemon (6.3) já estão no registry — não relançar.
      if (registry.has(t.id)) continue;
      try {
        await registry.create({
          id: t.id,
          name: t.name,
          cwd: t.cwd,
          adapterId: t.adapterId,
          workspace: t.workspace,
          taskId: t.taskId,
          taskRole: t.taskRole,
          projectId: t.projectId,
          cols: 80,
          rows: 24,
          restore: true
        });
        this.queue.push(() =>
          this.store.appendEvent({
            id: ulid(),
            ts: Date.now(),
            origin: 'system',
            type: 'session.recovered',
            terminalId: t.id,
            payload: { name: t.name, cwd: t.cwd, adapterId: t.adapterId }
          })
        );
        restored++;
      } catch {
        this.queue.push(() => this.store.archiveTerminal(t.id, Date.now()));
        archived++;
      }
    }
    return { restored, archived, elapsedMs: Date.now() - start };
  }

  /**
   * Workspaces (3.6): união de meta ∪ terminais ativos ∪ 'Geral' (indelével).
   * Lista vive em app_meta.workspaces (JSON); ativo em app_meta.active_workspace.
   */
  workspaces(): { names: string[]; active: string } {
    this.queue.flush();
    const fromMeta = this.parseWorkspacesMeta();
    const fromTerminals = this.store.listActiveTerminals().map((t) => t.workspace);
    const names = [...new Set(['Geral', ...fromMeta, ...fromTerminals])];
    const active = this.store.getMeta('active_workspace');
    return { names, active: active && names.includes(active) ? active : 'Geral' };
  }

  createWorkspace(name: string): { names: string[]; active: string } {
    const names = [...new Set([...this.parseWorkspacesMeta(), name])];
    this.store.setMeta('workspaces', JSON.stringify(names));
    return this.workspaces();
  }

  /** Rename propaga: meta + linhas persistidas (arquivadas inclusive) + vivas. */
  renameWorkspace(registry: SessionRegistry, from: string, to: string): { names: string[]; active: string } {
    this.queue.flush();
    const names = [...new Set(this.parseWorkspacesMeta().map((n) => (n === from ? to : n)).concat(to))];
    this.store.setMeta('workspaces', JSON.stringify(names));
    this.store.renameWorkspace(from, to);
    if (this.store.getMeta('active_workspace') === from) this.store.setMeta('active_workspace', to);
    registry.renameWorkspace(from, to); // eventos 'renamed' re-upsertam vivas
    return this.workspaces();
  }

  setActiveWorkspace(name: string): { names: string[]; active: string } {
    this.store.setMeta('active_workspace', name);
    return this.workspaces();
  }

  private parseWorkspacesMeta(): string[] {
    try {
      const raw = this.store.getMeta('workspaces');
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter((n): n is string => typeof n === 'string' && n.length > 0) : [];
    } catch {
      return [];
    }
  }

  /**
   * Projetos (Story 8.1, FR21) — caminho raiz real no disco; entidade
   * INDEPENDENTE de workspace (não deriva de terminais, ao contrário de
   * `workspaces()`). Lista vive em app_meta.projects (JSON); ativo em
   * app_meta.active_project.
   */

  /**
   * Primeiro boot: cria o projeto "Padrão" apontando pro cwd atual do
   * processo — mesmo cwd que sessões sem projeto já usavam (zero regressão).
   * Idempotente: no-op se já existe algum projeto. Absorve terminais/tarefas
   * pré-Épico-8 (project_id NULL) via `backfillProjectId` — sem isso eles
   * desapareceriam de todo filtro por projeto.
   */
  ensureDefaultProject(defaultRootPath: string): ProjectList {
    if (this.parseProjectsMeta().length > 0) return this.projects();
    const project: Project = { id: ulid(), name: 'Padrão', color: '#3B82F6', rootPath: defaultRootPath };
    this.store.setMeta('projects', JSON.stringify([project]));
    this.store.setMeta('active_project', project.id);
    this.store.backfillProjectId(project.id);
    return this.projects();
  }

  projects(): ProjectList {
    this.queue.flush();
    const projects = this.parseProjectsMeta();
    const active = this.store.getMeta('active_project');
    return {
      projects,
      activeId: active && projects.some((p) => p.id === active) ? active : (projects[0]?.id ?? '')
    };
  }

  createProject(req: { name: string; color: string; rootPath: string }): ProjectList {
    const project: Project = { id: ulid(), ...req };
    this.store.setMeta('projects', JSON.stringify([...this.parseProjectsMeta(), project]));
    return this.projects();
  }

  /** Rename/recolor/reroot combinado — campos ausentes não mudam (AC4). */
  updateProject(req: { id: string; name?: string; color?: string; rootPath?: string }): ProjectList {
    const projects = this.parseProjectsMeta().map((p) =>
      p.id === req.id
        ? {
            ...p,
            ...(req.name !== undefined ? { name: req.name } : {}),
            ...(req.color !== undefined ? { color: req.color } : {}),
            ...(req.rootPath !== undefined ? { rootPath: req.rootPath } : {})
          }
        : p
    );
    this.store.setMeta('projects', JSON.stringify(projects));
    return this.projects();
  }

  /** Rejeita remover o último projeto restante (AC4). */
  removeProject(id: string): ProjectList {
    const projects = this.parseProjectsMeta();
    if (projects.length <= 1) throw new Error('não é possível remover o último projeto restante');
    const next = projects.filter((p) => p.id !== id);
    this.store.setMeta('projects', JSON.stringify(next));
    if (this.store.getMeta('active_project') === id) this.store.setMeta('active_project', next[0]!.id);
    return this.projects();
  }

  setActiveProject(id: string): ProjectList {
    this.store.setMeta('active_project', id);
    return this.projects();
  }

  private parseProjectsMeta(): Project[] {
    try {
      const raw = this.store.getMeta('projects');
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed)
        ? parsed.filter(
            (p): p is Project =>
              typeof p === 'object' &&
              p !== null &&
              typeof (p as Project).id === 'string' &&
              typeof (p as Project).name === 'string' &&
              typeof (p as Project).color === 'string' &&
              typeof (p as Project).rootPath === 'string'
          )
        : [];
    } catch {
      return [];
    }
  }

  /** clean_shutdown (FR12): '0' no boot; '1' somente no exit gracioso. */
  markBootStart(): { cleanShutdown: boolean } {
    const prev = this.store.getMeta('clean_shutdown');
    this.store.setMeta('clean_shutdown', '0');
    return { cleanShutdown: prev !== '0' };
  }

  markCleanShutdown(): void {
    this.queue.flush();
    this.store.setMeta('clean_shutdown', '1');
  }

  /**
   * Resumo do crash (Story 4.3, AC2): terminais ainda ativos + último status
   * CONHECIDO pela trilha (agentStatus é transiente — não há "ao vivo" antes
   * de retomar) + últimos eventos globais para contexto.
   */
  crashSummary(): CrashSummary {
    this.queue.flush();
    const terminals = this.store.listActiveTerminals().map((t) => {
      const last = this.store.listEvents({ terminalId: t.id, type: 'status.changed', limit: 1 })[0];
      const status = last?.payload['status'];
      return {
        id: t.id,
        name: t.name,
        adapterId: t.adapterId,
        cwd: t.cwd,
        lastKnownStatus: typeof status === 'string' ? status : 'desconhecido'
      };
    });
    return { terminals, lastEvents: this.store.listEvents({ limit: 20 }) };
  }

  /** Arquiva sem tentar retomar (Story 4.3) — nunca destrói, exclui do próximo restore(). */
  archiveForCrash(id: string): void {
    this.queue.push(() => this.store.archiveTerminal(id, Date.now()));
  }

  /** Escolha de recuperação registrada na trilha (Story 4.3, AC4). */
  recordCrashRecovery(
    choice: 'all' | 'selective' | 'clean',
    counts: { restored: number; archived: number; adopted: number }
  ): void {
    this.queue.push(() =>
      this.store.appendEvent({
        id: ulid(),
        ts: Date.now(),
        origin: 'human',
        type: 'crash.recovery',
        payload: { choice, ...counts }
      })
    );
  }
}
