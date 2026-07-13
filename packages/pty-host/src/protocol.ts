/**
 * Protocolo de controle Main ↔ PTY Host (via parentPort do utilityProcess).
 * Dados de terminal NÃO passam por aqui — trafegam pela MessagePort binária
 * transferida no `create` (decisão crítica 4: controle e dados separados).
 */

export type HostInbound =
  | { type: 'create'; requestId: number; cols: number; rows: number; shell?: string; cwd?: string }
  | { type: 'resize'; id: string; cols: number; rows: number }
  | { type: 'close'; requestId: number; id: string }
  | { type: 'shutdown' };

export type HostOutbound =
  | { type: 'created'; requestId: number; id: string; pid: number }
  | { type: 'create-error'; requestId: number; message: string }
  | { type: 'closed'; requestId: number; id: string; orphan: boolean }
  | { type: 'session-exit'; id: string; exitCode: number };
