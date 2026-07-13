import { contextBridge, ipcRenderer } from 'electron';
import {
  AppInfoSchema,
  IpcChannels,
  LayoutTileSchema,
  SessionCloseResponseSchema,
  SessionEventSchema,
  SessionRecordSchema,
  TERMINAL_PORT_MESSAGE,
  type AppInfo,
  type CockpitApi,
  type LayoutUpdateRequest,
  type SessionCloseRequest,
  type SessionCreateRequest,
  type SessionEvent,
  type SessionRenameRequest,
  type SessionResizeRequest,
  type TerminalPortMessage
} from '@cockpit/shared';

/**
 * Preload mínimo — única ponte entre renderer e Main.
 * Zod na borda: o renderer valida a resposta antes de confiar nela.
 */
const api: CockpitApi = {
  getAppInfo: async (): Promise<AppInfo> => {
    const raw: unknown = await ipcRenderer.invoke(IpcChannels.appInfo);
    return AppInfoSchema.parse(raw);
  },
  session: {
    create: async (req: SessionCreateRequest) => {
      const raw: unknown = await ipcRenderer.invoke(IpcChannels.sessionCreate, req);
      return SessionRecordSchema.parse(raw);
    },
    rename: async (req: SessionRenameRequest) => {
      const raw: unknown = await ipcRenderer.invoke(IpcChannels.sessionRename, req);
      return SessionRecordSchema.parse(raw);
    },
    close: async (req: SessionCloseRequest) => {
      const raw: unknown = await ipcRenderer.invoke(IpcChannels.sessionClose, req);
      return SessionCloseResponseSchema.parse(raw);
    },
    resize: async (req: SessionResizeRequest) => {
      await ipcRenderer.invoke(IpcChannels.sessionResize, req);
    },
    list: async () => {
      const raw: unknown = await ipcRenderer.invoke(IpcChannels.sessionList);
      return SessionRecordSchema.array().parse(raw);
    },
    onEvent: (cb: (event: SessionEvent) => void) => {
      const listener = (_e: unknown, raw: unknown): void => {
        cb(SessionEventSchema.parse(raw));
      };
      ipcRenderer.on(IpcChannels.sessionEvent, listener);
      return () => ipcRenderer.removeListener(IpcChannels.sessionEvent, listener);
    }
  },
  layout: {
    get: async () => {
      const raw: unknown = await ipcRenderer.invoke(IpcChannels.layoutGet);
      return LayoutTileSchema.array().parse(raw);
    },
    update: async (req: LayoutUpdateRequest) => {
      await ipcRenderer.invoke(IpcChannels.layoutUpdate, req);
    }
  }
};

contextBridge.exposeInMainWorld('cockpit', api);

/**
 * MessagePorts não atravessam a contextBridge — o caminho suportado com
 * sandbox+contextIsolation é window.postMessage com transfer para o main world.
 * (tsconfig.node não carrega lib DOM; declarar só o necessário do window.)
 */
declare const window: {
  postMessage(message: unknown, targetOrigin: string, transfer?: unknown[]): void;
};

ipcRenderer.on(IpcChannels.terminalPort, (event, data: { id: string }) => {
  const message: TerminalPortMessage = { type: TERMINAL_PORT_MESSAGE, id: data.id };
  window.postMessage(message, '*', event.ports);
});
