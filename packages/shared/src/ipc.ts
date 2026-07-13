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
  appInfo: 'app.info',
  terminalCreate: 'terminal.create',
  terminalClose: 'terminal.close',
  terminalResize: 'terminal.resize',
  /** Evento Main → renderer que transfere a MessagePort de dados. */
  terminalPort: 'terminal.port'
} as const;

/**
 * Contratos do terminal (Story 1.2). Controle via Zod (baixa frequência);
 * os DADOS do PTY trafegam por MessagePort binária, fora destes canais.
 */
export const TerminalCreateRequestSchema = z.object({
  cols: z.number().int().min(2).max(500),
  rows: z.number().int().min(2).max(500)
});
export type TerminalCreateRequest = z.infer<typeof TerminalCreateRequestSchema>;

export const TerminalCreateResponseSchema = z.object({
  id: z.string().min(1),
  pid: z.number().int().positive()
});
export type TerminalCreateResponse = z.infer<typeof TerminalCreateResponseSchema>;

export const TerminalResizeRequestSchema = z.object({
  id: z.string().min(1),
  cols: z.number().int().min(2).max(500),
  rows: z.number().int().min(2).max(500)
});
export type TerminalResizeRequest = z.infer<typeof TerminalResizeRequestSchema>;

export const TerminalCloseRequestSchema = z.object({
  id: z.string().min(1)
});
export type TerminalCloseRequest = z.infer<typeof TerminalCloseRequestSchema>;

export const TerminalCloseResponseSchema = z.object({
  id: z.string().min(1),
  orphan: z.boolean()
});
export type TerminalCloseResponse = z.infer<typeof TerminalCloseResponseSchema>;

/**
 * Mensagem postada pelo preload na window do renderer transferindo a
 * MessagePort de dados do terminal (padrão Electron p/ sandbox+contextIsolation).
 */
export const TERMINAL_PORT_MESSAGE = 'cockpit:terminal-port' as const;

export interface TerminalPortMessage {
  type: typeof TERMINAL_PORT_MESSAGE;
  id: string;
}

/**
 * Contrato da bridge exposta pelo preload em window.cockpit.
 * Vive no shared para o renderer nunca importar tipos do processo preload/Electron.
 */
export interface CockpitApi {
  getAppInfo(): Promise<AppInfo>;
  terminal: {
    /** Cria o PTY; a MessagePort de dados chega via window message TERMINAL_PORT_MESSAGE. */
    create(req: TerminalCreateRequest): Promise<TerminalCreateResponse>;
    resize(req: TerminalResizeRequest): Promise<void>;
    close(req: TerminalCloseRequest): Promise<TerminalCloseResponse>;
  };
}
