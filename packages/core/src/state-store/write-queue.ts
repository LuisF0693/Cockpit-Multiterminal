/**
 * Write queue não-bloqueante (decisão crítica 2 / NFR8): operações são
 * enfileiradas e aplicadas em batch — flush a cada 250ms OU 100 ops, o que
 * vier primeiro — numa transação única (o executor recebe o batch inteiro).
 * O input do usuário nunca espera I/O; no pior crash perde-se ≤ 1 batch.
 *
 * Resiliência (Story 4.1): falha do apply recoloca o batch NA FRENTE da fila
 * e agenda retry; após MAX_APPLY_RETRIES consecutivas o batch é descartado
 * com erro logado (perda limitada ≤ 1 batch; o app nunca trava). Exceções do
 * apply NUNCA propagam ao caminho interativo. O retry é seguro porque o
 * apply de produção é transacional (SQLite — rollback total em falha).
 */

export interface WriteQueueOptions {
  flushMs?: number;
  maxOps?: number;
  maxApplyRetries?: number;
}

const DEFAULT_FLUSH_MS = 250;
const DEFAULT_MAX_OPS = 100;
const DEFAULT_MAX_APPLY_RETRIES = 5;

export class WriteQueue {
  private ops: Array<() => void> = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;
  private consecutiveFailures = 0;
  private readonly flushMs: number;
  private readonly maxOps: number;
  private readonly maxApplyRetries: number;

  constructor(
    /** Aplica o batch (em produção: dentro de uma transação SQLite). */
    private readonly apply: (batch: Array<() => void>) => void,
    opts: WriteQueueOptions = {}
  ) {
    this.flushMs = opts.flushMs ?? DEFAULT_FLUSH_MS;
    this.maxOps = opts.maxOps ?? DEFAULT_MAX_OPS;
    this.maxApplyRetries = opts.maxApplyRetries ?? DEFAULT_MAX_APPLY_RETRIES;
  }

  push(op: () => void): void {
    if (this.disposed) return;
    this.ops.push(op);
    if (this.ops.length >= this.maxOps) {
      this.flush();
      return;
    }
    this.timer ??= setTimeout(() => this.flush(), this.flushMs);
  }

  /** Drena tudo imediatamente (shutdown gracioso / clean_shutdown). */
  flush(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.ops.length === 0) return;
    const batch = this.ops;
    this.ops = [];
    try {
      this.apply(batch);
      this.consecutiveFailures = 0;
    } catch (err) {
      this.consecutiveFailures++;
      if (this.consecutiveFailures > this.maxApplyRetries) {
        // Contrato do pior caso: perda limitada a este batch, app segue vivo.
        console.error(
          `[write-queue] batch descartado após ${this.maxApplyRetries} retries (${batch.length} ops):`,
          err
        );
        this.consecutiveFailures = 0;
        return;
      }
      // Rollback transacional no apply ⇒ recolocar na frente preserva ordem.
      this.ops = [...batch, ...this.ops];
      console.warn(
        `[write-queue] apply falhou (tentativa ${this.consecutiveFailures}/${this.maxApplyRetries}) — retry em ${this.flushMs}ms:`,
        err instanceof Error ? err.message : err
      );
      if (!this.disposed) {
        this.timer ??= setTimeout(() => this.flush(), this.flushMs);
      }
    }
  }

  get pending(): number {
    return this.ops.length;
  }

  dispose(): void {
    this.flush();
    this.disposed = true;
  }
}
