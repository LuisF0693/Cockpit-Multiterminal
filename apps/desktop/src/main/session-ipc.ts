import { BrowserWindow, ipcMain } from 'electron';
import { PersistenceManager, SessionRegistry, WriteQueue, type StateStore } from '@cockpit/core';
import {
  IpcChannels,
  LayoutUpdateRequestSchema,
  SessionCloseRequestSchema,
  SessionCreateRequestSchema,
  SessionRenameRequestSchema,
  SessionResizeRequestSchema,
  type SessionEvent
} from '@cockpit/shared';
import type { PtyHostManager } from './pty-host-manager';

/**
 * Cola entre SessionRegistry (fonte de verdade, @cockpit/core) e o mundo:
 * canais IPC de sessão e layout + eventos de domínio via push + persistência
 * contínua (Story 1.4: StateStore + WriteQueue — o input nunca espera I/O).
 */

export interface SessionIpcHandle {
  registry: SessionRegistry;
  persistence: PersistenceManager;
  queue: WriteQueue;
  /** Restore do boot (AC2) — chamar após registrar tudo. */
  restore(): Promise<{ restored: number; archived: number }>;
}

export function registerSessionIpc(
  ptyHost: PtyHostManager,
  store: StateStore,
  applyBatch: (batch: Array<() => void>) => void
): SessionIpcHandle {
  // Porta de cada createPty fica estacionada até o registry devolver o session id.
  const parkedPorts = new Map<string, Electron.MessagePortMain>();

  const registry = new SessionRegistry({
    createPty: async ({ sessionId, cols, rows, cwd, restore }) => {
      const created = await ptyHost.createPty({
        sessionId,
        cols,
        rows,
        ...(cwd !== undefined ? { cwd } : {}),
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

  // Exit espontâneo do shell → registro reflete; host caiu → todas exited.
  ptyHost.onSessionExit((ptyId) => registry.markExited(ptyId));
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

  ipcMain.handle(IpcChannels.layoutGet, () => persistence.savedLayout());

  ipcMain.handle(IpcChannels.layoutUpdate, (_event, raw: unknown) => {
    const req = LayoutUpdateRequestSchema.parse(raw);
    persistence.persistLayout(req.tiles);
  });

  return {
    registry,
    persistence,
    queue,
    restore: () => persistence.restore(registry)
  };
}
