import { contextBridge, ipcRenderer } from 'electron';
import { z } from 'zod';
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
  SdcCorrectionRequestedEventSchema,
  SdcReviewRequestedEventSchema,
  TaskEventSchema,
  TaskSchema,
  TimelineEventSchema,
  WorkspaceListSchema,
  ProjectListSchema,
  ProjectDirEntrySchema,
  ProjectReadFileResponseSchema,
  TerminalLinkSchema,
  TerminalLinkEventSchema,
  TerminalLinkRoutedEventSchema,
  BrowserTileSchema,
  BrowserTileEventSchema,
  LearningSchema,
  LearningEventSchema,
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
  type SdcCorrectionRequestedEvent,
  type SdcReviewRequestedEvent,
  type SdcTranscriptTailRequest,
  type TaskCreateRequest,
  type TaskDecisionRequest,
  type TaskEvent,
  type TaskLinkRequest,
  type TaskUpdateStateRequest,
  type TerminalPortMessage,
  type WorkspaceCreateRequest,
  type WorkspaceRenameRequest,
  type WorkspaceSetActiveRequest,
  type ProjectCreateRequest,
  type ProjectUpdateRequest,
  type ProjectRemoveRequest,
  type ProjectSetActiveRequest,
  type ProjectReadDirRequest,
  type ProjectReadFileRequest,
  type TerminalLinkCreateRequest,
  type TerminalLinkRemoveRequest,
  type TerminalLinkEvent,
  type TerminalLinkRoutedEvent,
  type BrowserTileCreateRequest,
  type BrowserTileIdRequest,
  type BrowserNavigateRequest,
  type BrowserClickRequest,
  type BrowserReadTextRequest,
  type BrowserTileEvent,
  type LearningCreateRequest,
  type LearningUpdateStatusRequest,
  type LearningEvent
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
    linkTask: async (req: TaskLinkRequest) => {
      const raw: unknown = await ipcRenderer.invoke(IpcChannels.sessionLinkTask, req);
      return SessionRecordSchema.parse(raw);
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
  project: {
    list: async () => {
      const raw: unknown = await ipcRenderer.invoke(IpcChannels.projectList);
      return ProjectListSchema.parse(raw);
    },
    create: async (req: ProjectCreateRequest) => {
      const raw: unknown = await ipcRenderer.invoke(IpcChannels.projectCreate, req);
      return ProjectListSchema.parse(raw);
    },
    update: async (req: ProjectUpdateRequest) => {
      const raw: unknown = await ipcRenderer.invoke(IpcChannels.projectUpdate, req);
      return ProjectListSchema.parse(raw);
    },
    remove: async (req: ProjectRemoveRequest) => {
      const raw: unknown = await ipcRenderer.invoke(IpcChannels.projectRemove, req);
      return ProjectListSchema.parse(raw);
    },
    setActive: async (req: ProjectSetActiveRequest) => {
      const raw: unknown = await ipcRenderer.invoke(IpcChannels.projectSetActive, req);
      return ProjectListSchema.parse(raw);
    },
    pickFolder: async () => {
      const raw: unknown = await ipcRenderer.invoke(IpcChannels.projectPickFolder);
      return z.string().nullable().parse(raw);
    },
    readDir: async (req: ProjectReadDirRequest) => {
      const raw: unknown = await ipcRenderer.invoke(IpcChannels.projectReadDir, req);
      return ProjectDirEntrySchema.array().parse(raw);
    },
    readFile: async (req: ProjectReadFileRequest) => {
      const raw: unknown = await ipcRenderer.invoke(IpcChannels.projectReadFile, req);
      return raw === null ? null : ProjectReadFileResponseSchema.parse(raw);
    }
  },
  terminalLink: {
    create: async (req: TerminalLinkCreateRequest) => {
      const raw: unknown = await ipcRenderer.invoke(IpcChannels.terminalLinkCreate, req);
      return TerminalLinkSchema.parse(raw);
    },
    remove: async (req: TerminalLinkRemoveRequest) => {
      await ipcRenderer.invoke(IpcChannels.terminalLinkRemove, req);
    },
    list: async () => {
      const raw: unknown = await ipcRenderer.invoke(IpcChannels.terminalLinkList);
      return TerminalLinkSchema.array().parse(raw);
    },
    onEvent: (cb: (event: TerminalLinkEvent) => void) => {
      const listener = (_e: unknown, raw: unknown): void => {
        cb(TerminalLinkEventSchema.parse(raw));
      };
      ipcRenderer.on(IpcChannels.terminalLinkEvent, listener);
      return () => ipcRenderer.removeListener(IpcChannels.terminalLinkEvent, listener);
    },
    onRouted: (cb: (event: TerminalLinkRoutedEvent) => void) => {
      const listener = (_e: unknown, raw: unknown): void => {
        cb(TerminalLinkRoutedEventSchema.parse(raw));
      };
      ipcRenderer.on(IpcChannels.terminalLinkRouted, listener);
      return () => ipcRenderer.removeListener(IpcChannels.terminalLinkRouted, listener);
    }
  },
  browser: {
    create: async (req: BrowserTileCreateRequest) => {
      const raw: unknown = await ipcRenderer.invoke(IpcChannels.browserCreate, req);
      return BrowserTileSchema.parse(raw);
    },
    remove: async (req: BrowserTileIdRequest) => {
      await ipcRenderer.invoke(IpcChannels.browserRemove, req);
    },
    list: async () => {
      const raw: unknown = await ipcRenderer.invoke(IpcChannels.browserList);
      return BrowserTileSchema.array().parse(raw);
    },
    navigate: async (req: BrowserNavigateRequest) => {
      const raw: unknown = await ipcRenderer.invoke(IpcChannels.browserNavigate, req);
      return BrowserTileSchema.parse(raw);
    },
    back: async (req: BrowserTileIdRequest) => {
      await ipcRenderer.invoke(IpcChannels.browserBack, req);
    },
    forward: async (req: BrowserTileIdRequest) => {
      await ipcRenderer.invoke(IpcChannels.browserForward, req);
    },
    reload: async (req: BrowserTileIdRequest) => {
      await ipcRenderer.invoke(IpcChannels.browserReload, req);
    },
    screenshot: async (req: BrowserTileIdRequest) => {
      const raw: unknown = await ipcRenderer.invoke(IpcChannels.browserScreenshot, req);
      return z.string().nullable().parse(raw);
    },
    click: async (req: BrowserClickRequest) => {
      await ipcRenderer.invoke(IpcChannels.browserClick, req);
    },
    readText: async (req: BrowserReadTextRequest) => {
      const raw: unknown = await ipcRenderer.invoke(IpcChannels.browserReadText, req);
      return z.string().nullable().parse(raw);
    },
    onEvent: (cb: (event: BrowserTileEvent) => void) => {
      const listener = (_e: unknown, raw: unknown): void => {
        cb(BrowserTileEventSchema.parse(raw));
      };
      ipcRenderer.on(IpcChannels.browserTileEvent, listener);
      return () => ipcRenderer.removeListener(IpcChannels.browserTileEvent, listener);
    }
  },
  learning: {
    create: async (req: LearningCreateRequest) => {
      const raw: unknown = await ipcRenderer.invoke(IpcChannels.learningCreate, req);
      return LearningSchema.parse(raw);
    },
    updateStatus: async (req: LearningUpdateStatusRequest) => {
      const raw: unknown = await ipcRenderer.invoke(IpcChannels.learningUpdateStatus, req);
      return LearningSchema.parse(raw);
    },
    list: async () => {
      const raw: unknown = await ipcRenderer.invoke(IpcChannels.learningList);
      return LearningSchema.array().parse(raw);
    },
    onEvent: (cb: (event: LearningEvent) => void) => {
      const listener = (_e: unknown, raw: unknown): void => {
        cb(LearningEventSchema.parse(raw));
      };
      ipcRenderer.on(IpcChannels.learningEvent, listener);
      return () => ipcRenderer.removeListener(IpcChannels.learningEvent, listener);
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
  },
  task: {
    create: async (req: TaskCreateRequest) => {
      const raw: unknown = await ipcRenderer.invoke(IpcChannels.taskCreate, req);
      return TaskSchema.parse(raw);
    },
    updateState: async (req: TaskUpdateStateRequest) => {
      const raw: unknown = await ipcRenderer.invoke(IpcChannels.taskUpdateState, req);
      return TaskSchema.parse(raw);
    },
    list: async () => {
      const raw: unknown = await ipcRenderer.invoke(IpcChannels.taskList);
      return TaskSchema.array().parse(raw);
    },
    onEvent: (cb: (event: TaskEvent) => void) => {
      const listener = (_e: unknown, raw: unknown): void => {
        cb(TaskEventSchema.parse(raw));
      };
      ipcRenderer.on(IpcChannels.taskEvent, listener);
      return () => ipcRenderer.removeListener(IpcChannels.taskEvent, listener);
    },
    decide: async (req: TaskDecisionRequest) => {
      const raw: unknown = await ipcRenderer.invoke(IpcChannels.taskDecide, req);
      return TaskSchema.parse(raw);
    }
  },
  sdc: {
    onReviewRequested: (cb: (event: SdcReviewRequestedEvent) => void) => {
      const listener = (_e: unknown, raw: unknown): void => {
        cb(SdcReviewRequestedEventSchema.parse(raw));
      };
      ipcRenderer.on(IpcChannels.sdcReviewRequested, listener);
      return () => ipcRenderer.removeListener(IpcChannels.sdcReviewRequested, listener);
    },
    transcriptTail: async (req: SdcTranscriptTailRequest) => {
      const raw: unknown = await ipcRenderer.invoke(IpcChannels.sdcTranscriptTail, req);
      return z.string().parse(raw);
    },
    onCorrectionRequested: (cb: (event: SdcCorrectionRequestedEvent) => void) => {
      const listener = (_e: unknown, raw: unknown): void => {
        cb(SdcCorrectionRequestedEventSchema.parse(raw));
      };
      ipcRenderer.on(IpcChannels.sdcCorrectionRequested, listener);
      return () => ipcRenderer.removeListener(IpcChannels.sdcCorrectionRequested, listener);
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
