import { BrowserWindow, ipcMain } from 'electron';
import { SessionRegistry } from '@cockpit/core';
import {
  IpcChannels,
  SessionCloseRequestSchema,
  SessionCreateRequestSchema,
  SessionRenameRequestSchema,
  SessionResizeRequestSchema,
  type SessionEvent
} from '@cockpit/shared';
import type { PtyHostManager } from './pty-host-manager';

/**
 * Cola entre SessionRegistry (fonte de verdade, @cockpit/core) e o mundo:
 * canais IPC session.* para o renderer + eventos de domínio via push.
 * A MessagePort binária de cada sessão vai ao renderer TAGUEADA com o
 * session id (não o pty id) — a UI só conhece sessões.
 */
export function registerSessionIpc(ptyHost: PtyHostManager): SessionRegistry {
  // Porta de cada createPty fica estacionada até o registry devolver o session id.
  const parkedPorts = new Map<string, Electron.MessagePortMain>();

  const registry = new SessionRegistry({
    createPty: async ({ cols, rows, cwd }) => {
      const created = await ptyHost.createPty({
        cols,
        rows,
        ...(cwd !== undefined ? { cwd } : {})
      });
      parkedPorts.set(created.ptyId, created.rendererPort);
      return { ptyId: created.ptyId, pid: created.pid };
    },
    closePty: (ptyId) => {
      parkedPorts.get(ptyId)?.close();
      parkedPorts.delete(ptyId);
      return ptyHost.closePty(ptyId);
    },
    resizePty: (ptyId, cols, rows) => ptyHost.resizePty(ptyId, cols, rows)
  });

  // Exit espontâneo do shell → registro reflete; host caiu → todas exited.
  ptyHost.onSessionExit((ptyId) => registry.markExited(ptyId));
  ptyHost.onHostExit(() => {
    for (const record of registry.list()) {
      if (record.status === 'running') registry.markExited(registry.ptyIdOf(record.id));
    }
  });

  // Push de eventos de domínio para todas as janelas.
  registry.onEvent((event: SessionEvent) => {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send(IpcChannels.sessionEvent, event);
    }
  });

  ipcMain.handle(IpcChannels.sessionCreate, async (event, raw: unknown) => {
    const req = SessionCreateRequestSchema.parse(raw);
    const record = await registry.create(req);
    const port = parkedPorts.get(registry.ptyIdOf(record.id));
    parkedPorts.delete(registry.ptyIdOf(record.id));
    if (port) {
      event.sender.postMessage(IpcChannels.terminalPort, { id: record.id }, [port]);
    }
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

  ipcMain.handle(IpcChannels.sessionList, () => registry.list());

  return registry;
}
