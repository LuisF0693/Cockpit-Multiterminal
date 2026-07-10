import { contextBridge, ipcRenderer } from 'electron';
import { AppInfoSchema, IpcChannels, type AppInfo } from '@cockpit/shared';

/**
 * Preload mínimo — única ponte entre renderer e Main.
 * Zod na borda: o renderer valida a resposta antes de confiar nela.
 */
const api = {
  getAppInfo: async (): Promise<AppInfo> => {
    const raw: unknown = await ipcRenderer.invoke(IpcChannels.appInfo);
    return AppInfoSchema.parse(raw);
  }
} as const;

export type CockpitApi = typeof api;

contextBridge.exposeInMainWorld('cockpit', api);
