/**
 * Write queue não-bloqueante (decisão crítica 2 / NFR8): operações são
 * enfileiradas e aplicadas em batch — flush a cada 250ms OU 100 ops, o que
 * vier primeiro — numa transação única (o executor recebe o batch inteiro).
 * O input do usuário nunca espera I/O; no pior crash perde-se ≤ 1 batch.
 */

export interface WriteQueueOptions {
  flushMs?: number;
  maxOps?: number;
}

const DEFAULT_FLUSH_MS = 250;
const DEFAULT_MAX_OPS = 100;

export class WriteQueue {
  private ops: Array<() => void> = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;
  private readonly flushMs: number;
  private readonly maxOps: number;

  constructor(
    /** Aplica o batch (em produção: dentro de uma transação SQLite). */
    private readonly apply: (batch: Array<() => void>) => void,
    opts: WriteQueueOptions = {}
  ) {
    this.flushMs = opts.flushMs ?? DEFAULT_FLUSH_MS;
    this.maxOps = opts.maxOps ?? DEFAULT_MAX_OPS;
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
    this.apply(batch);
  }

  get pending(): number {
    return this.ops.length;
  }

  dispose(): void {
    this.flush();
    this.disposed = true;
  }
}
