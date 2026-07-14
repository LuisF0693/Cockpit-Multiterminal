import { contextBridge, ipcRenderer } from 'electron';
import {
  AdapterInfoSchema,
  AppInfoSchema,
  CrashSummarySchema,
  DaemonStatusSchema,
  IpcChannels,
  LayoutTileSchema,
  RecoveryResolveResponseSchema,
  SessionCloseResponseSchema,
  SessionEventSchema,
  SessionRecordSchema,
  SessionReportSchema,
  TERMINAL_PORT_MESSAGE,
  TimelineEventSchema,
  WorkspaceListSchema,
  type AppInfo,
  type CockpitApi,
  type LayoutUpdateRequest,
  type RecoveryResolveRequest,
  type SessionCloseRequest,
  type SessionCreateRequest,
  type SessionEvent,
  type SessionRenameRequest,
  type SessionReportRequest,
  type SessionResizeRequest,
  type TerminalPortMessage,
  type WorkspaceCreateRequest,
  type WorkspaceRenameRequest,
  type WorkspaceSetActiveRequest
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
    instructed: async (req: { id: string; text: string }) => {
      await ipcRenderer.invoke(IpcChannels.sessionInstructed, req);
    },
    report: async (req: SessionReportRequest) => {
      const raw: unknown = await ipcRenderer.invoke(IpcChannels.sessionReport, req);
      return raw === null ? null : SessionReportSchema.parse(raw);
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
  },
  adapter: {
    list: async () => {
      const raw: unknown = await ipcRenderer.invoke(IpcChannels.adapterList);
      return AdapterInfoSchema.array().parse(raw);
    }
  },
  timeline: {
    get: async (req = {}) => {
      const raw: unknown = await ipcRenderer.invoke(IpcChannels.timelineGet, req);
      return TimelineEventSchema.array().parse(raw);
    }
  },
  daemon: {
    onStatus: (cb) => {
      const listener = (_e: unknown, raw: unknown): void => {
        cb(DaemonStatusSchema.parse(raw));
      };
      ipcRenderer.on(IpcChannels.daemonStatus, listener);
      return () => ipcRenderer.removeListener(IpcChannels.daemonStatus, listener);
    }
  },
  workspace: {
    list: async () => {
      const raw: unknown = await ipcRenderer.invoke(IpcChannels.workspaceList);
      return WorkspaceListSchema.parse(raw);
    },
    create: async (req: WorkspaceCreateRequest) => {
      const raw: unknown = await ipcRenderer.invoke(IpcChannels.workspaceCreate, req);
      return WorkspaceListSchema.parse(raw);
    },
    rename: async (req: WorkspaceRenameRequest) => {
      const raw: unknown = await ipcRenderer.invoke(IpcChannels.workspaceRename, req);
      return WorkspaceListSchema.parse(raw);
    },
    setActive: async (req: WorkspaceSetActiveRequest) => {
      const raw: unknown = await ipcRenderer.invoke(IpcChannels.workspaceSetActive, req);
      return WorkspaceListSchema.parse(raw);
    }
  },
  recovery: {
    summary: async () => {
      const raw: unknown = await ipcRenderer.invoke(IpcChannels.recoverySummary);
      return raw === null ? null : CrashSummarySchema.parse(raw);
    },
    resolve: async (req: RecoveryResolveRequest) => {
      const raw: unknown = await ipcRenderer.invoke(IpcChannels.recoveryResolve, req);
      return RecoveryResolveResponseSchema.parse(raw);
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
