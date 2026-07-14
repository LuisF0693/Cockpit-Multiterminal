import { closeSync, existsSync, openSync, readSync, statSync, watch, type FSWatcher } from 'node:fs';
import { AgentStatusSchema, type AgentStatus } from '@cockpit/shared';

/**
 * Tail do arquivo de status da sessão: cada linha é um AgentStatus appendado
 * pelos hooks. fs.watch + polling de segurança (Windows: watch pode falhar
 * em alguns volumes). Emite apenas MUDANÇAS (dedupe) e ignora lixo.
 */

const POLL_MS = 500;

export class StatusFileWatcher {
  private offset = 0;
  private last: AgentStatus | null = null;
  private watcher: FSWatcher | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private stopped = false;

  constructor(
    private readonly filePath: string,
    private readonly onStatus: (status: AgentStatus) => void,
    private readonly pollMs: number = POLL_MS
  ) {}

  start(): void {
    try {
      this.watcher = watch(this.filePath, () => this.drain());
    } catch {
      this.watcher = null; // volume sem suporte — polling cobre
    }
    this.pollTimer = setInterval(() => this.drain(), this.pollMs);
    this.drain();
  }

  stop(): void {
    this.stopped = true;
    this.watcher?.close();
    this.watcher = null;
    if (this.pollTimer !== null) clearInterval(this.pollTimer);
    this.pollTimer = null;
  }

  /** true se algum hook já escreveu (base da degradação segura do adapter). */
  get sawAnyStatus(): boolean {
    return this.last !== null;
  }

  private drain(): void {
    if (this.stopped || !existsSync(this.filePath)) return;
    let size: number;
    try {
      size = statSync(this.filePath).size;
    } catch {
      return;
    }
    if (size <= this.offset) return;

    const fd = openSync(this.filePath, 'r');
    try {
      const buf = Buffer.alloc(size - this.offset);
      readSync(fd, buf, 0, buf.length, this.offset);
      this.offset = size;
      for (const rawLine of buf.toString('utf8').split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line) continue;
        const parsed = AgentStatusSchema.safeParse(line);
        if (!parsed.success) continue;
        if (parsed.data === this.last) continue;
        this.last = parsed.data;
        this.onStatus(parsed.data);
      }
    } finally {
      closeSync(fd);
    }
  }
}
