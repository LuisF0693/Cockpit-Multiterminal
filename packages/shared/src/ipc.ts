import { z } from 'zod';

/**
 * Contratos IPC — validados com Zod na borda, nos dois sentidos.
 * Regra (coding standards): tipos SEMPRE inferidos do schema, nunca duplicados à mão.
 */

export const AppInfoSchema = z.object({
  name: z.literal('Meu Cockpit'),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'versão deve ser semver MAJOR.MINOR.PATCH'),
  platform: z.enum(['win32', 'darwin', 'linux'])
});

export type AppInfo = z.infer<typeof AppInfoSchema>;

/** Nomes canônicos dos canais IPC de controle (baixa frequência). */
export const IpcChannels = {
  appInfo: 'app.info'
} as const;

/**
 * Contrato da bridge exposta pelo preload em window.cockpit.
 * Vive no shared para o renderer nunca importar tipos do processo preload/Electron.
 */
export interface CockpitApi {
  getAppInfo(): Promise<AppInfo>;
}
