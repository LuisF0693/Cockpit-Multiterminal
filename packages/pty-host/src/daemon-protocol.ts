import type { AgentStatus, PendingDispatchChoice } from '@cockpit/shared';

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
  /**
   * Nome do tile → daemon (Épico 20, Story 20.1). O `label` do `create` só é
   * preenchido por cliente EXTERNO (a CLI `agent-dispatch`, Story 17.1) — tile
   * aberto pela UI do Cockpit nasce no daemon ANÔNIMO, e a renomeação na UI
   * (`SessionRegistry.rename`) nunca atravessava o processo. Consequência: o
   * casamento por nome (`--to-agent`, e agora o REUSO automático do despacho)
   * enxergava só os tiles que a própria CLI havia criado — era por isso que o
   * chefe abria um segundo "@dev" em vez de continuar com o que estava aberto.
   *
   * Fire-and-forget, sem requestId/ack, pelo mesmo motivo do `resize`: é
   * metadado de exibição, não decisão. Daemon antigo ignora a mensagem e
   * continua servindo a sessão sem label — o reuso simplesmente não casa e o
   * despacho cria worker novo, que é o comportamento de hoje (degradação sem
   * quebra, por isso `DAEMON_PROTOCOL_VERSION` segue em 1).
   */
  | { type: 'set-label'; id: string; label: string }
  | { type: 'close'; requestId: number; id: string }
  | { type: 'list-adapters'; requestId: number }
  | { type: 'data-ack'; id: string; n: number }
  /** Attach (6.2): assina a sessão com replay do transcript (tail). */
  | { type: 'attach'; requestId: number; id: string; tailBytes?: number }
  /** Sessões vivas no daemon (6.2) — insumo da adoção pelo app (6.3). */
  | { type: 'list-sessions'; requestId: number }
  /** Heartbeat (6.4): prova de vida + versão sem efeitos colaterais. */
  | { type: 'ping'; requestId: number }
  | { type: 'shutdown'; requestId: number }
  /**
   * Histórico de despachos (Épico 18, Story 18.5) — o Main empurra o
   * snapshot mais recente (fire-and-forget, sem ack: o próximo evento do
   * DispatchManager reenvia o snapshot inteiro, então perder um push não
   * deixa o cache preso desatualizado por muito tempo). O DAEMON é só um
   * RELAY em memória — a CLI (`agent-dispatch`, processo separado do Main)
   * não tem outro jeito seguro de ler o histórico: ele vive em SQLite aberto
   * pelo Main com o `better-sqlite3` rebuildado pra ABI do Electron (decisão
   * crítica 2 da Story 1.4), que não carrega sob o `node` puro que roda a
   * CLI. O Main já é cliente do próprio daemon (DaemonManager, Story 6.3) —
   * reusar essa conexão evita abrir um segundo canal.
   */
  | { type: 'dispatch-history-push'; counts: AdapterOutcomeCount[] }
  /** Consulta do cache acima — usada pela CLI no `--recommend` (Story 18.5). */
  | { type: 'dispatch-history'; requestId: number }
  /**
   * ESCOLHA DE DESPACHO (Épico 20, Story 20.3): o chefe pediu um agente que já
   * existe mas está OCUPADO. A decisão do fundador é que isso vira pergunta na
   * fila de Decisões — e o daemon é o único lugar onde essa pergunta pode
   * esperar, porque a CLI morre segundos depois do comando (mesmo raciocínio
   * da fila de `deliver-task`).
   *
   * O ack devolve `accepted: false` quando NÃO há app conectado ao daemon: sem
   * Cockpit aberto não existe fila pra perguntar, e segurar a pendência seria o
   * sumiço silencioso que o Épico 19 existiu pra eliminar — a CLI então
   * enfileira no próprio agente, que nunca descarta a tarefa.
   */
  | {
      type: 'dispatch-choice-push';
      requestId: number;
      choice: PendingDispatchChoice;
    }
  /** Consulta das escolhas pendentes — o Main faz isso no poll de adoção. */
  | { type: 'dispatch-choices'; requestId: number }
  /** Remove a escolha já resolvida pelo humano (o Main executou a ação). */
  | { type: 'dispatch-choice-resolve'; id: string }
  /**
   * Entrega de tarefa numa sessão JÁ VIVA (Onda 1, item 1 do fundador).
   *
   * Por que um comando de CONTROLE e não bytes crus em FRAME_DATA (que o
   * `write` do DaemonClient já sabe fazer): quem entrega precisa saber SE a
   * entrega foi aceita, enfileirada ou recusada — a CLI decide o exit code
   * com isso, e o Main decide se loga aviso. Frame de dados não tem ack.
   *
   * A FILA mora no daemon (e não na CLI) porque a CLI é um processo efêmero
   * que morre segundos depois do comando: uma tarefa pendente guardada nela
   * sumiria junto. O daemon é o único processo que sobrevive ao app E à CLI e
   * que já observa o status de cada sessão — é ele que sabe QUANDO o alvo
   * ficou ocioso.
   *
   * Compatibilidade: comando NOVO, sem quebra de contrato — por isso
   * `DAEMON_PROTOCOL_VERSION` continua em 1. Daemon antigo simplesmente não
   * casa nenhum `case` do switch e IGNORA a mensagem; o cliente cai no
   * timeout de request e reporta "daemon antigo, reinicie" (degradação
   * explícita, ver `DaemonClient.deliverTask`).
   */
  | {
      type: 'deliver-task';
      requestId: number;
      /** Sessão alvo (id do daemon = tag = session id do registry). */
      id: string;
      /** Instrução em LINHA ÚNICA — o daemon anexa o `\r` que submete. */
      text: string;
      /** false = recusa na hora em vez de enfileirar quando o alvo está ocupado. */
      queueIfBusy?: boolean;
    };

/** Contagem agregada de desfechos por adapter (Épico 18, Story 18.5, FR63). */
export interface AdapterOutcomeCount {
  adapterId: string;
  done: number;
  error: number;
}

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
  | { type: 'shutdown-done'; requestId: number; orphans: number }
  /** Resposta à consulta de histórico (Story 18.5) — cache do daemon, pode vir vazio. */
  | { type: 'dispatch-history-result'; requestId: number; counts: AdapterOutcomeCount[] }
  /** Ack da entrega em sessão viva (Onda 1) — define o exit code da CLI. */
  | {
      type: 'task-delivery';
      requestId: number;
      id: string;
      outcome: TaskDeliveryOutcome;
      /** Motivo legível — vai direto pro stderr da CLI / log do Main. */
      reason: string;
      /** Tamanho da fila do alvo DEPOIS da operação (0 quando entregou na hora). */
      queued: number;
    }
  /**
   * Ack do `dispatch-choice-push` (Story 20.3). `accepted: false` = ninguém vai
   * ver essa pergunta (app fechado ou teto de pendências atingido); a CLI cai
   * no fallback de enfileirar, nunca descarta a tarefa.
   */
  | { type: 'dispatch-choice-ack'; requestId: number; accepted: boolean; reason: string }
  /** Escolhas pendentes servidas ao Main (Story 20.3). */
  | { type: 'dispatch-choices-result'; requestId: number; choices: PendingDispatchChoice[] };

/**
 * Desfecho de uma entrega (Onda 1): `delivered` escreveu no PTY agora;
 * `queued` guardou pra escrever quando o alvo ficar ocioso; `refused` não
 * entregou nem guardou (alvo inexistente, morto ou em erro).
 */
export type TaskDeliveryOutcome = 'delivered' | 'queued' | 'refused';
