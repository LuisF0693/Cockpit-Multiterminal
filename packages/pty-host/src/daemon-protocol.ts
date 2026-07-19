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
      /** Argumentos extra de CLI (Story 12.6) — ex.: Ollama precisa do modelo. */
      args?: string[];
      /** Nome da sessão p/ adoção com identidade do agente (Story 17.1). */
      label?: string;
      /** Instrução entregue pelo adapter quando o CLI fica pronto (17.1/FR7). */
      initialInstruction?: string;
      /** Sessão do CHEFE que despachou (17.2) — o app cria o vínculo na adoção. */
      dispatchedBy?: string;
    }
  | { type: 'resize'; id: string; cols: number; rows: number }
  | { type: 'close'; requestId: number; id: string }
  | { type: 'list-adapters'; requestId: number }
  | { type: 'data-ack'; id: string; n: number }
  /** Attach (6.2): assina a sessão com replay do transcript (tail). */
  | { type: 'attach'; requestId: number; id: string; tailBytes?: number }
  /** Sessões vivas no daemon (6.2) — insumo da adoção pelo app (6.3). */
  | { type: 'list-sessions'; requestId: number }
  /** Heartbeat (6.4): prova de vida + versão sem efeitos colaterais. */
  | { type: 'ping'; requestId: number }
  | { type: 'shutdown'; requestId: number };

/** Metadados de sessão viva no daemon (list-sessions — Story 6.2). */
export interface DaemonSessionInfo {
  id: string;
  adapterId: string;
  pid: number;
  status: AgentStatus;
  cwd: string;
  createdAt: number;
  /** Nome dado pelo cliente externo no create (Story 17.1) — ausente em sessões antigas. */
  label?: string;
  /** Sessão do chefe que despachou (Story 17.2) — ausente fora do despacho vinculado. */
  dispatchedBy?: string;
}

export type DaemonOutbound =
  | { type: 'hello-ack'; protocolVersion: number; daemonPid: number }
  | { type: 'hello-error'; message: string }
  | { type: 'created'; requestId: number; id: string; pid: number }
  | { type: 'create-error'; requestId: number; message: string }
  | { type: 'closed'; requestId: number; id: string; orphan: boolean }
  | { type: 'session-exit'; id: string; exitCode: number }
  | { type: 'session-status'; id: string; status: AgentStatus; detail?: string }
  | { type: 'adapters'; requestId: number; adapters: Array<{ id: string; displayName: string }> }
  | { type: 'attached'; requestId: number; id: string; ok: boolean }
  | { type: 'sessions'; requestId: number; sessions: DaemonSessionInfo[] }
  | { type: 'pong'; requestId: number; daemonPid: number; sessions: number; protocolVersion: number }
  | { type: 'shutdown-done'; requestId: number; orphans: number };
