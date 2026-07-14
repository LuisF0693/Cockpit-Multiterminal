import type { AgentStatus } from '@cockpit/shared';

/**
 * Protocolo de controle daemon↔cliente (Story 6.1) — viaja em frames
 * FRAME_CONTROL (framing.ts); dados de terminal viajam em FRAME_DATA.
 * Espelha o contrato do host (protocol.ts) + handshake e backpressure.
 */

export const DAEMON_PROTOCOL_VERSION = 1;
export const DEFAULT_DAEMON_PIPE = '\\\\.\\pipe\\cockpit-daemon';

export type DaemonInbound =
  | { type: 'hello'; protocolVersion: number }
  | { type: 'configure'; scrollbackDir: string; maxFileBytes: number; restoreTailBytes: number }
  | {
      type: 'create';
      requestId: number;
      /** Tag = session id (ULID do registry) — TAMBÉM é o id da sessão no daemon. */
      tag: string;
      adapterId?: string;
      cols: number;
      rows: number;
      cwd?: string;
      restore?: boolean;
    }
  | { type: 'resize'; id: string; cols: number; rows: number }
  | { type: 'close'; requestId: number; id: string }
  | { type: 'list-adapters'; requestId: number }
  | { type: 'data-ack'; id: string; n: number }
  | { type: 'shutdown'; requestId: number };

export type DaemonOutbound =
  | { type: 'hello-ack'; protocolVersion: number; daemonPid: number }
  | { type: 'hello-error'; message: string }
  | { type: 'created'; requestId: number; id: string; pid: number }
  | { type: 'create-error'; requestId: number; message: string }
  | { type: 'closed'; requestId: number; id: string; orphan: boolean }
  | { type: 'session-exit'; id: string; exitCode: number }
  | { type: 'session-status'; id: string; status: AgentStatus; detail?: string }
  | { type: 'adapters'; requestId: number; adapters: Array<{ id: string; displayName: string }> }
  | { type: 'shutdown-done'; requestId: number; orphans: number };
