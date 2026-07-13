import { contextBridge, ipcRenderer } from 'electron';
import {
  AppInfoSchema,
  IpcChannels,
  TERMINAL_PORT_MESSAGE,
  TerminalCloseResponseSchema,
  TerminalCreateResponseSchema,
  type AppInfo,
  type CockpitApi,
  type TerminalCloseRequest,
  type TerminalCreateRequest,
  type TerminalPortMessage,
  type TerminalResizeRequest
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
  terminal: {
    create: async (req: TerminalCreateRequest) => {
      const raw: unknown = await ipcRenderer.invoke(IpcChannels.terminalCreate, req);
      return TerminalCreateResponseSchema.parse(raw);
    },
    resize: async (req: TerminalResizeRequest) => {
      await ipcRenderer.invoke(IpcChannels.terminalResize, req);
    },
    close: async (req: TerminalCloseRequest) => {
      const raw: unknown = await ipcRenderer.invoke(IpcChannels.terminalClose, req);
      return TerminalCloseResponseSchema.parse(raw);
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
