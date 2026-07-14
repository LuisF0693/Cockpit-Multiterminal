import { BrowserWindow, ipcMain } from 'electron';
import { z } from 'zod';
import { PersistenceManager, SessionRegistry, WriteQueue, type StateStore } from '@cockpit/core';
import {
  AgentStatusSchema,
  IpcChannels,
  LayoutUpdateRequestSchema,
  TimelineGetRequestSchema,
  RecoveryResolveRequestSchema,
  SessionCloseRequestSchema,
  SessionCreateRequestSchema,
  SessionRenameRequestSchema,
  SessionReportRequestSchema,
  SessionResizeRequestSchema,
  WorkspaceCreateRequestSchema,
  WorkspaceRenameRequestSchema,
  WorkspaceSetActiveRequestSchema,
  type SessionEvent
} from '@cockpit/shared';
import type { DaemonSessionInfo } from '@cockpit/pty-host';

/**
 * Cola entre SessionRegistry (fonte de verdade, @cockpit/core) e o mundo:
 * canais IPC de sessão e layout + eventos de domínio via push + persistência
 * contínua (Story 1.4: StateStore + WriteQueue — o input nunca espera I/O).
 */

/**
 * Backend de PTY (Story 6.3) — satisfeito estruturalmente pelo
 * PtyHostManager (utilityProcess) e pelo DaemonManager (named pipe).
 * listSessions/adoptPty só existem no daemon: habilitam a adoção no boot.
 */
export interface PtyBackend {
  createPty(opts: {
    sessionId: string;
    cols: number;
    rows: number;
    cwd?: string;
    adapterId?: string;
    restore?: boolean;
  }): Promise<{ ptyId: string; pid: number; rendererPort: Electron.MessagePortMain }>;
  closePty(ptyId: string): Promise<{ orphan: boolean }>;
  resizePty(ptyId: string, cols: number, rows: number): void;
  listAdapters(): Promise<Array<{ id: string; displayName: string }>>;
  onSessionExit(cb: (ptyId: string, exitCode: number) => void): void;
  onSessionStatus(cb: (ptyId: string, status: string) => void): void;
  onHostExit(cb: () => void): void;
  listSessions?(): Promise<DaemonSessionInfo[]>;
  adoptPty?(sessionId: string): Promise<{ pid: number; rendererPort: Electron.MessagePortMain }>;
}

export interface SessionIpcHandle {
  registry: SessionRegistry;
  persistence: PersistenceManager;
  queue: WriteQueue;
  /** true se o boot anterior não fechou graciosamente (Story 4.3, FR12). */
  crashDetected: boolean;
  /**
   * Restore do boot (AC2 da 1.4) — chamar após registrar tudo. Quando
   * `crashDetected` é true, NÃO chamar automaticamente: a Recovery Screen
   * (4.3) resolve via IPC (`recovery.resolve`), que roda este MESMO caminho.
   */
  restore(): Promise<{ restored: number; archived: number; adopted: number; elapsedMs: number }>;
}

export function registerSessionIpc(
  ptyHost: PtyBackend,
  store: StateStore,
  applyBatch: (batch: Array<() => void>) => void
): SessionIpcHandle {
  // Porta de cada createPty fica estacionada até o registry devolver o session id.
  const parkedPorts = new Map<string, Electron.MessagePortMain>();

  const registry = new SessionRegistry({
    createPty: async ({ sessionId, cols, rows, cwd, adapterId, restore }) => {
      const created = await ptyHost.createPty({
        sessionId,
        cols,
        rows,
        ...(cwd !== undefined ? { cwd } : {}),
        ...(adapterId !== undefined ? { adapterId } : {}),
        ...(restore !== undefined ? { restore } : {})
      });
      parkedPorts.set(sessionId, created.rendererPort);
      return { ptyId: created.ptyId, pid: created.pid };
    },
    closePty: (ptyId) => ptyHost.closePty(ptyId),
    resizePty: (ptyId, cols, rows) => ptyHost.resizePty(ptyId, cols, rows)
  });

  const queue = new WriteQueue(applyBatch);
  const persistence = new PersistenceManager(store, queue);
  persistence.wire(registry);

  // Antecipado (Story 4.3): precisa estar resolvido ANTES do primeiro IPC
  // para o handle já nascer sabendo se há uma Recovery Screen a resolver.
  const { cleanShutdown } = persistence.markBootStart();
  const crashDetected = !cleanShutdown;
  let recoveryResolved = !crashDetected;

  // Exit espontâneo do shell → registro reflete (exitCode → relatório 3.5);
  // host caiu → todas exited.
  ptyHost.onSessionExit((ptyId, exitCode) => registry.markExited(ptyId, exitCode));
  // Status do agente (FR5 — Story 2.1): adapter → host → registry → UI.
  ptyHost.onSessionStatus((ptyId, status) => {
    const parsed = AgentStatusSchema.safeParse(status);
    if (parsed.success) registry.markAgentStatus(ptyId, parsed.data);
  });
  ptyHost.onHostExit(() => {
    for (const record of registry.list()) {
      if (record.status === 'running') registry.markExited(registry.ptyIdOf(record.id));
    }
  });

  // Push de eventos de domínio para todas as janelas; porta segue junto
  // (o renderer pode ainda não existir no restore — enviar na criação da janela).
  registry.onEvent((event: SessionEvent) => {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send(IpcChannels.sessionEvent, event);
    }
  });

  const deliverPort = (sessionId: string, target: Electron.WebContents): boolean => {
    const port = parkedPorts.get(sessionId);
    if (!port) return false;
    parkedPorts.delete(sessionId);
    target.postMessage(IpcChannels.terminalPort, { id: sessionId }, [port]);
    return true;
  };

  ipcMain.handle(IpcChannels.sessionCreate, async (event, raw: unknown) => {
    const req = SessionCreateRequestSchema.parse(raw);
    const record = await registry.create(req);
    deliverPort(record.id, event.sender);
    return record;
  });

  ipcMain.handle(IpcChannels.sessionRename, (_event, raw: unknown) => {
    const req = SessionRenameRequestSchema.parse(raw);
    return registry.rename(req.id, req.name);
  });

  ipcMain.handle(IpcChannels.sessionClose, async (_event, raw: unknown) => {
    const req = SessionCloseRequestSchema.parse(raw);
    return await registry.close(req.id);
  });

  ipcMain.handle(IpcChannels.sessionResize, (_event, raw: unknown) => {
    const req = SessionResizeRequestSchema.parse(raw);
    registry.resize(req.id, req.cols, req.rows);
  });

  // Sessões restauradas no boot têm portas estacionadas: o renderer chama
  // session.list ao montar — é o momento de entregá-las.
  ipcMain.handle(IpcChannels.sessionList, (event) => {
    const records = registry.list();
    for (const record of records) deliverPort(record.id, event.sender);
    return records;
  });

  ipcMain.handle(IpcChannels.sessionInstructed, (_event, raw: unknown) => {
    const req = z.object({ id: z.string().min(1), text: z.string() }).parse(raw);
    persistence.recordInstruction(req.id, req.text);
  });

  ipcMain.handle(IpcChannels.sessionReport, (_event, raw: unknown) => {
    const req = SessionReportRequestSchema.parse(raw);
    return persistence.sessionReport(req.id);
  });

  // Workspaces (Story 3.6)
  ipcMain.handle(IpcChannels.workspaceList, () => persistence.workspaces());
  ipcMain.handle(IpcChannels.workspaceCreate, (_event, raw: unknown) => {
    const req = WorkspaceCreateRequestSchema.parse(raw);
    return persistence.createWorkspace(req.name);
  });
  ipcMain.handle(IpcChannels.workspaceRename, (_event, raw: unknown) => {
    const req = WorkspaceRenameRequestSchema.parse(raw);
    return persistence.renameWorkspace(registry, req.from, req.to);
  });
  ipcMain.handle(IpcChannels.workspaceSetActive, (_event, raw: unknown) => {
    const req = WorkspaceSetActiveRequestSchema.parse(raw);
    return persistence.setActiveWorkspace(req.name);
  });

  ipcMain.handle(IpcChannels.adapterList, () => ptyHost.listAdapters());

  ipcMain.handle(IpcChannels.timelineGet, (_event, raw: unknown) => {
    const req = TimelineGetRequestSchema.parse(raw ?? {});
    return persistence.timeline({
      limit: req.limit,
      ...(req.terminalId !== undefined ? { terminalId: req.terminalId } : {}),
      ...(req.type !== undefined ? { type: req.type } : {})
    });
  });

  ipcMain.handle(IpcChannels.layoutGet, () => persistence.savedLayout());

  ipcMain.handle(IpcChannels.layoutUpdate, (_event, raw: unknown) => {
    const req = LayoutUpdateRequestSchema.parse(raw);
    persistence.persistLayout(req.tiles);
  });

  // Adoção (6.3): sessões vivas no daemon casadas com os terminais
  // persistidos — adota (attach+replay) ANTES do relaunch da 1.4.
  const adoptFromDaemon = async (): Promise<number> => {
    if (!ptyHost.listSessions || !ptyHost.adoptPty) return 0;
    let alive: Map<string, DaemonSessionInfo>;
    try {
      alive = new Map((await ptyHost.listSessions()).map((s) => [s.id, s]));
    } catch {
      return 0; // sem daemon utilizável → restore clássico cuida de tudo
    }
    let adopted = 0;
    for (const t of store.listActiveTerminals()) {
      const live = alive.get(t.id);
      if (!live) continue;
      try {
        const { rendererPort } = await ptyHost.adoptPty(t.id);
        parkedPorts.set(t.id, rendererPort);
        registry.adopt({
          id: t.id,
          name: t.name,
          cwd: t.cwd,
          adapterId: t.adapterId,
          workspace: t.workspace,
          pid: live.pid,
          createdAt: t.createdAt
        });
        persistence.recordAdoption(t.id, { name: t.name, adapterId: t.adapterId, pid: live.pid });
        adopted++;
      } catch (err) {
        console.error(`[daemon] adoção falhou p/ ${t.id} — cai no relaunch:`, err);
      }
    }
    return adopted;
  };

  // Time-to-resume (AC1 da 4.2): adoção + relaunch clássico, do primeiro I/O
  // até a última sessão relançada — não inclui createWindow()/boot do
  // Electron (constantes de plataforma fora do controle desta lógica).
  // Caminho ÚNICO: usado tanto pelo boot automático quanto pela resolução
  // da Recovery Screen (4.3) — nenhuma lógica duplicada entre os dois.
  const performResume = async (): Promise<{ restored: number; archived: number; adopted: number; elapsedMs: number }> => {
    const startedAt = Date.now();
    const adopted = await adoptFromDaemon();
    const { restored, archived } = await persistence.restore(registry);
    return { restored, archived, adopted, elapsedMs: Date.now() - startedAt };
  };

  // Recuperação pós-crash (Story 4.3)
  ipcMain.handle(IpcChannels.recoverySummary, () => {
    if (!crashDetected || recoveryResolved) return null;
    return persistence.crashSummary();
  });

  ipcMain.handle(IpcChannels.recoveryResolve, async (_event, raw: unknown) => {
    const req = RecoveryResolveRequestSchema.parse(raw);
    if (req.choice === 'clean') {
      for (const t of store.listActiveTerminals()) persistence.archiveForCrash(t.id);
    } else if (req.choice === 'selective') {
      const keep = new Set(req.keepIds ?? []);
      for (const t of store.listActiveTerminals()) {
        if (!keep.has(t.id)) persistence.archiveForCrash(t.id);
      }
    }
    queue.flush(); // arquivamentos visíveis para o performResume() a seguir
    const { restored, archived, adopted } = await performResume();
    persistence.recordCrashRecovery(req.choice, { restored, archived, adopted });
    recoveryResolved = true;
    return { restored, archived, adopted };
  });

  return {
    registry,
    persistence,
    queue,
    crashDetected,
    restore: performResume
  };
}
