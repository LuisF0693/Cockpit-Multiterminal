/**
 * Protocolo de controle Main ↔ PTY Host (via parentPort do utilityProcess).
 * Dados de terminal NÃO passam por aqui — trafegam pela MessagePort binária
 * transferida no `create` (decisão crítica 4: controle e dados separados).
 */

export type HostInbound =
  | {
      /** Config de scrollback (Story 1.4) — enviada uma vez após o spawn. */
      type: 'configure';
      scrollbackDir: string;
      maxFileBytes: number;
      restoreTailBytes: number;
    }
  | {
      type: 'create';
      requestId: number;
      /** Tag = session id: nomeia scrollback e correlaciona com o registry. */
      tag: string;
      cols: number;
      rows: number;
      shell?: string;
      cwd?: string;
      /** true no restore do boot: injeta tail do scrollback antes do stream vivo. */
      restore?: boolean;
    }
  | { type: 'resize'; id: string; cols: number; rows: number }
  | { type: 'close'; requestId: number; id: string }
  | { type: 'shutdown' };

export type HostOutbound =
  | { type: 'created'; requestId: number; id: string; pid: number }
  | { type: 'create-error'; requestId: number; message: string }
  | { type: 'closed'; requestId: number; id: string; orphan: boolean }
  | { type: 'session-exit'; id: string; exitCode: number };
