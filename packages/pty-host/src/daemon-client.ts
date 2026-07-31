import { createConnection, type Socket } from 'node:net';
import type { PendingDispatchChoice } from '@cockpit/shared';
import { FrameDecoder, encodeControl, encodeData } from './framing';
import {
  DAEMON_PROTOCOL_VERSION,
  type AdapterOutcomeCount,
  type DaemonInbound,
  type DaemonOutbound,
  type DaemonSessionInfo,
  type TaskDeliveryOutcome
} from './daemon-protocol';

/**
 * DaemonClient (Story 6.1) — lado cliente do túnel: handshake versionado,
 * requests com correlação por requestId, dados binários por sessão com
 * data-ack automático (o daemon segura acima do HIGH_WATER).
 * Consumidores: testes de integração agora; Main do app na Story 6.3.
 */

type Pending =
  | { kind: 'create'; resolve: (v: { id: string; pid: number }) => void; reject: (e: Error) => void }
  | { kind: 'close'; resolve: (v: { orphan: boolean }) => void; reject: (e: Error) => void }
  | { kind: 'adapters'; resolve: (v: Array<{ id: string; displayName: string }>) => void; reject: (e: Error) => void }
  | { kind: 'attach'; resolve: (v: { ok: boolean }) => void; reject: (e: Error) => void }
  | { kind: 'sessions'; resolve: (v: DaemonSessionInfo[]) => void; reject: (e: Error) => void }
  | {
      kind: 'ping';
      resolve: (v: { daemonPid: number; sessions: number; protocolVersion: number }) => void;
      reject: (e: Error) => void;
    }
  | { kind: 'shutdown'; resolve: (v: { orphans: number }) => void; reject: (e: Error) => void }
  | { kind: 'dispatch-history'; resolve: (v: AdapterOutcomeCount[]) => void; reject: (e: Error) => void }
  | { kind: 'deliver-task'; resolve: (v: TaskDeliveryAck) => void; reject: (e: Error) => void }
  | { kind: 'dispatch-choice-push'; resolve: (v: DispatchChoiceAck) => void; reject: (e: Error) => void }
  | { kind: 'dispatch-choices'; resolve: (v: PendingDispatchChoice[]) => void; reject: (e: Error) => void };

/** Resultado do `pushDispatchChoice` (Story 20.3) — `accepted: false` = fallback. */
export interface DispatchChoiceAck {
  accepted: boolean;
  reason: string;
}

/** Resultado de `deliverTask` (Onda 1) — espelha o ack `task-delivery`. */
export interface TaskDeliveryAck {
  outcome: TaskDeliveryOutcome;
  reason: string;
  queued: number;
}

const REQUEST_TIMEOUT_MS = 10_000;

export class DaemonClient {
  private socket: Socket | null = null;
  private seq = 0;
  /** autoAck=false (Main/proxy): acks vêm do renderer via ack() — 6.3. */
  private readonly autoAck: boolean;

  constructor(opts?: { autoAck?: boolean }) {
    this.autoAck = opts?.autoAck ?? true;
  }
  private readonly pending = new Map<number, Pending>();
  private readonly dataListeners = new Map<string, (bytes: Uint8Array) => void>();
  private exitListener: ((id: string, exitCode: number) => void) | null = null;
  private statusListener: ((id: string, status: string, detail?: string) => void) | null = null;
  private closeListener: (() => void) | null = null;

  /** Conecta e completa o handshake; rejeita em versão incompatível. */
  async connect(pipePath: string): Promise<{ daemonPid: number }> {
    const socket = createConnection(pipePath);
    this.socket = socket;
    const decoder = new FrameDecoder();
    const helloAck = new Promise<{ daemonPid: number }>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timeout no handshake do daemon')), REQUEST_TIMEOUT_MS);
      socket.on('data', (chunk) => {
        for (const frame of decoder.push(chunk)) {
          if (frame.kind === 'data') {
            this.dataListeners.get(frame.sessionId)?.(frame.bytes);
            if (this.autoAck) this.post({ type: 'data-ack', id: frame.sessionId, n: frame.bytes.byteLength });
            continue;
          }
          const msg = frame.message as DaemonOutbound;
          if (msg.type === 'hello-ack') {
            clearTimeout(timer);
            resolve({ daemonPid: msg.daemonPid });
            continue;
          }
          if (msg.type === 'hello-error') {
            clearTimeout(timer);
            reject(new Error(msg.message));
            continue;
          }
          this.onMessage(msg);
        }
      });
      socket.once('error', (err) => {
        clearTimeout(timer);
        reject(err instanceof Error ? err : new Error(String(err)));
      });
    });
    // Falha ANTES do connect (daemon ainda subindo): helloAck rejeita sem
    // awaiter — marcar como tratada evita unhandled rejection no retry loop.
    helloAck.catch(() => void 0);
    await new Promise<void>((resolve, reject) => {
      socket.once('connect', resolve);
      socket.once('error', reject);
    });
    socket.on('close', () => this.closeListener?.());
    this.post({ type: 'hello', protocolVersion: DAEMON_PROTOCOL_VERSION });
    return await helloAck;
  }

  configure(config: { scrollbackDir: string; maxFileBytes: number; restoreTailBytes: number }): void {
    this.post({ type: 'configure', ...config });
  }

  async createSession(opts: {
    tag: string;
    cols: number;
    rows: number;
    cwd?: string;
    adapterId?: string;
    restore?: boolean;
    args?: string[];
    label?: string;
    initialInstruction?: string;
    dispatchedBy?: string;
  }): Promise<{ id: string; pid: number }> {
    return await this.request('create', (requestId) => ({
      type: 'create',
      requestId,
      tag: opts.tag,
      cols: opts.cols,
      rows: opts.rows,
      ...(opts.cwd !== undefined ? { cwd: opts.cwd } : {}),
      ...(opts.adapterId !== undefined ? { adapterId: opts.adapterId } : {}),
      ...(opts.restore !== undefined ? { restore: opts.restore } : {}),
      ...(opts.args !== undefined ? { args: opts.args } : {}),
      ...(opts.label !== undefined ? { label: opts.label } : {}),
      ...(opts.initialInstruction !== undefined ? { initialInstruction: opts.initialInstruction } : {}),
      ...(opts.dispatchedBy !== undefined ? { dispatchedBy: opts.dispatchedBy } : {})
    }));
  }

  write(sessionId: string, bytes: Uint8Array): void {
    this.socket?.write(encodeData(sessionId, bytes));
  }

  /**
   * Entrega uma tarefa numa sessão JÁ VIVA (Onda 1, item 1 do fundador) —
   * diferente de `write`, que despeja bytes crus sem saber se o alvo estava
   * pronto pra recebê-los. Aqui o daemon respeita o estado do alvo, enfileira
   * quando ele está ocupado e devolve o desfecho (`delivered`/`queued`/
   * `refused`), que é o que decide o exit code da CLI.
   *
   * Degradação em daemon ANTIGO (sem o comando): a mensagem é ignorada
   * silenciosamente pelo switch do servidor e este request morre no timeout
   * de 10s — o erro abaixo traduz isso em instrução acionável em vez de um
   * "timeout" cru, porque um daemon velho sobrevive a upgrades do app (ele
   * roda destacado e só morre com `cockpit-daemon --stop`).
   */
  async deliverTask(sessionId: string, text: string, opts?: { queueIfBusy?: boolean }): Promise<TaskDeliveryAck> {
    try {
      return await this.request<TaskDeliveryAck>('deliver-task', (requestId) => ({
        type: 'deliver-task',
        requestId,
        id: sessionId,
        text,
        ...(opts?.queueIfBusy !== undefined ? { queueIfBusy: opts.queueIfBusy } : {})
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('timeout')) {
        throw new Error(
          'daemon não respondeu à entrega direta (deliver-task) — provavelmente um daemon antigo ainda rodando: ' +
            'encerre com `cockpit-daemon --stop` e reabra o Cockpit para subir a versão nova'
        );
      }
      throw err instanceof Error ? err : new Error(message);
    }
  }

  /** Ack manual (autoAck=false): repassa a confirmação do consumidor final. */
  ack(sessionId: string, n: number): void {
    this.post({ type: 'data-ack', id: sessionId, n });
  }

  resize(sessionId: string, cols: number, rows: number): void {
    this.post({ type: 'resize', id: sessionId, cols, rows });
  }

  /**
   * Nome do tile → daemon (Story 20.1). Fire-and-forget: sem isto, o tile
   * aberto pela UI é anônimo no `list-sessions` e o reuso por nome do agente
   * nunca o encontra. Chamado na criação E em toda renomeação.
   */
  setLabel(sessionId: string, label: string): void {
    this.post({ type: 'set-label', id: sessionId, label });
  }

  async closeSession(sessionId: string): Promise<{ orphan: boolean }> {
    return await this.request('close', (requestId) => ({ type: 'close', requestId, id: sessionId }));
  }

  async listAdapters(): Promise<Array<{ id: string; displayName: string }>> {
    return await this.request('adapters', (requestId) => ({ type: 'list-adapters', requestId }));
  }

  /**
   * Assina uma sessão viva (6.2): registre onData ANTES de chamar — o replay
   * do transcript chega como frames de dados logo após o 'attached'.
   */
  async attach(sessionId: string, tailBytes?: number): Promise<{ ok: boolean }> {
    return await this.request('attach', (requestId) => ({
      type: 'attach',
      requestId,
      id: sessionId,
      ...(tailBytes !== undefined ? { tailBytes } : {})
    }));
  }

  /** Sessões vivas no daemon (6.2) — insumo da adoção no boot (6.3). */
  async listSessions(): Promise<DaemonSessionInfo[]> {
    return await this.request('sessions', (requestId) => ({ type: 'list-sessions', requestId }));
  }

  /** Heartbeat (6.4): prova de vida do daemon. */
  async ping(): Promise<{ daemonPid: number; sessions: number; protocolVersion: number }> {
    return await this.request('ping', (requestId) => ({ type: 'ping', requestId }));
  }

  async shutdownDaemon(): Promise<{ orphans: number }> {
    return await this.request('shutdown', (requestId) => ({ type: 'shutdown', requestId }));
  }

  /**
   * Empurra o snapshot mais recente do histórico de despachos (Story 18.5) —
   * fire-and-forget, sem requestId/ack: o Main é a fonte de verdade e reenvia
   * o snapshot inteiro a cada mudança no DispatchManager (create/outcome),
   * então um push perdido não deixa o cache do daemon preso desatualizado.
   */
  pushDispatchHistory(counts: AdapterOutcomeCount[]): void {
    this.post({ type: 'dispatch-history-push', counts });
  }

  /**
   * Pergunta pendente na fila de Decisões (Story 20.3) — a CLI empurra e o
   * daemon responde se alguém vai ver. Daemon ANTIGO ignora o comando e o
   * request morre no timeout: o chamador trata como `accepted: false` e
   * enfileira, que é o desfecho seguro (nunca descarta a tarefa).
   */
  async pushDispatchChoice(choice: PendingDispatchChoice): Promise<DispatchChoiceAck> {
    return await this.request<DispatchChoiceAck>('dispatch-choice-push', (requestId) => ({
      type: 'dispatch-choice-push',
      requestId,
      choice
    }));
  }

  /** Escolhas aguardando o humano (Story 20.3) — o Main consulta no poll. */
  async listDispatchChoices(): Promise<PendingDispatchChoice[]> {
    return await this.request('dispatch-choices', (requestId) => ({ type: 'dispatch-choices', requestId }));
  }

  /** Remove a escolha já resolvida (o Main executou queue/new). Fire-and-forget. */
  resolveDispatchChoice(id: string): void {
    this.post({ type: 'dispatch-choice-resolve', id });
  }

  /**
   * Consulta o cache do daemon (Story 18.5) — usado pela CLI `agent-dispatch`
   * no `--recommend`. Vazio se o Main nunca empurrou (app nunca aberto desde
   * o boot do daemon, ou histórico realmente sem registros) — nunca lança.
   */
  async listDispatchHistory(): Promise<AdapterOutcomeCount[]> {
    return await this.request('dispatch-history', (requestId) => ({ type: 'dispatch-history', requestId }));
  }

  onData(sessionId: string, cb: (bytes: Uint8Array) => void): () => void {
    this.dataListeners.set(sessionId, cb);
    return () => this.dataListeners.delete(sessionId);
  }

  onSessionExit(cb: (id: string, exitCode: number) => void): void {
    this.exitListener = cb;
  }

  onSessionStatus(cb: (id: string, status: string, detail?: string) => void): void {
    this.statusListener = cb;
  }

  onClose(cb: () => void): void {
    this.closeListener = cb;
  }

  /** Encerra só a CONEXÃO — sessões seguem vivas no daemon (AC3). */
  disconnect(): void {
    this.socket?.destroy();
    this.socket = null;
  }

  private onMessage(msg: DaemonOutbound): void {
    switch (msg.type) {
      case 'created': {
        const p = this.takePending(msg.requestId);
        if (p?.kind === 'create') p.resolve({ id: msg.id, pid: msg.pid });
        break;
      }
      case 'create-error': {
        this.takePending(msg.requestId)?.reject(new Error(msg.message));
        break;
      }
      case 'closed': {
        const p = this.takePending(msg.requestId);
        if (p?.kind === 'close') p.resolve({ orphan: msg.orphan });
        break;
      }
      case 'adapters': {
        const p = this.takePending(msg.requestId);
        if (p?.kind === 'adapters') p.resolve(msg.adapters);
        break;
      }
      case 'attached': {
        const p = this.takePending(msg.requestId);
        if (p?.kind === 'attach') p.resolve({ ok: msg.ok });
        break;
      }
      case 'sessions': {
        const p = this.takePending(msg.requestId);
        if (p?.kind === 'sessions') p.resolve(msg.sessions);
        break;
      }
      case 'pong': {
        const p = this.takePending(msg.requestId);
        if (p?.kind === 'ping') {
          p.resolve({ daemonPid: msg.daemonPid, sessions: msg.sessions, protocolVersion: msg.protocolVersion });
        }
        break;
      }
      case 'shutdown-done': {
        const p = this.takePending(msg.requestId);
        if (p?.kind === 'shutdown') p.resolve({ orphans: msg.orphans });
        break;
      }
      case 'dispatch-history-result': {
        const p = this.takePending(msg.requestId);
        if (p?.kind === 'dispatch-history') p.resolve(msg.counts);
        break;
      }
      case 'task-delivery': {
        const p = this.takePending(msg.requestId);
        if (p?.kind === 'deliver-task') p.resolve({ outcome: msg.outcome, reason: msg.reason, queued: msg.queued });
        break;
      }
      case 'dispatch-choice-ack': {
        const p = this.takePending(msg.requestId);
        if (p?.kind === 'dispatch-choice-push') p.resolve({ accepted: msg.accepted, reason: msg.reason });
        break;
      }
      case 'dispatch-choices-result': {
        const p = this.takePending(msg.requestId);
        if (p?.kind === 'dispatch-choices') p.resolve(msg.choices);
        break;
      }
      case 'session-exit':
        this.exitListener?.(msg.id, msg.exitCode);
        break;
      case 'session-status':
        this.statusListener?.(msg.id, msg.status, msg.detail);
        break;
      case 'hello-ack':
      case 'hello-error':
        break; // tratados no connect
    }
  }

  private async request<T>(kind: Pending['kind'], build: (requestId: number) => DaemonInbound): Promise<T> {
    const requestId = ++this.seq;
    return await new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error(`timeout no request ${kind} ao daemon`));
      }, REQUEST_TIMEOUT_MS);
      this.pending.set(requestId, {
        kind,
        resolve: (v: never) => {
          clearTimeout(timer);
          resolve(v as T);
        },
        reject: (e: Error) => {
          clearTimeout(timer);
          reject(e);
        }
      } as Pending);
      this.post(build(requestId));
    });
  }

  private takePending(requestId: number): Pending | undefined {
    const p = this.pending.get(requestId);
    this.pending.delete(requestId);
    return p;
  }

  private post(msg: DaemonInbound): void {
    this.socket?.write(encodeControl(msg));
  }
}
