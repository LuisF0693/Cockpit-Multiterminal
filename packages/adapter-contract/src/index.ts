import type { AgentStatus } from '@cockpit/shared';

/**
 * Adapter Contract (decisão crítica 3 / NFR7) — o contrato é LEI.
 * Adapters vivem no PTY Host; o core consome apenas estes tipos.
 * Novo provider = novo package em packages/adapters/* implementando isto
 * + registro no AdapterRegistry. Guia: docs/guides/writing-an-adapter.md.
 */

export type Unsubscribe = () => void;

export interface AdapterAvailability {
  available: boolean;
  /** Versão do CLI quando detectável. */
  version?: string | undefined;
  /** Motivo quando indisponível (não instalado, não autenticado...). */
  reason?: string | undefined;
}

export interface SpawnConfig {
  cwd: string;
  cols: number;
  rows: number;
  /**
   * Ambiente ADICIONAL — NUNCA credenciais injetadas (NFR6):
   * o spawn herda o ambiente do usuário; nada de tokens em config/logs.
   */
  env?: Record<string, string> | undefined;
  /** Instrução inicial (FR7) — enviada após o CLI ficar pronto. */
  initialInstruction?: string | undefined;
}

export interface AgentSession {
  readonly terminalId: string;
  readonly pid: number;
  /** Input do usuário / instruções da master (FR7). */
  write(data: string): void;
  resize(cols: number, rows: number): void;
  /**
   * Kill limpo, sem órfãos. DEVE rejeitar se o processo resistir
   * (o host reporta órfão a partir da rejeição).
   */
  dispose(): Promise<void>;
  /** Saída bruta → xterm. */
  onData(cb: (chunk: Buffer) => void): Unsubscribe;
  /** Mudanças de status detectadas (FR5). */
  onStatus(cb: (status: AgentStatus, detail?: string) => void): Unsubscribe;
  onExit(cb: (code: number | null) => void): Unsubscribe;
}

export interface AgentAdapter {
  /** Identificador estável: 'shell' | 'claude-code' | 'codex' | 'grok' | ... */
  readonly id: string;
  readonly displayName: string;
  /**
   * Estratégia de detecção de status, por camadas (decisão crítica 3):
   * 'native-hooks' (preferida) → 'output-parsing' (heurísticas testadas
   * por fixture) → 'process-only' (mínimo: running/exited).
   */
  readonly statusStrategy: 'native-hooks' | 'output-parsing' | 'process-only';
  /** CLI no PATH? versão? autenticado? */
  detectAvailability(): Promise<AdapterAvailability>;
  spawn(config: SpawnConfig): Promise<AgentSession>;
}
