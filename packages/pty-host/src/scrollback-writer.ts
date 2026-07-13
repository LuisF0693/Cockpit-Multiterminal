import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * Scrollback persistido (decisão crítica 2): arquivos append por terminal,
 * FORA do SQLite. Batch de flush (~500ms) para não competir com o PTY;
 * rotação por tamanho com 2 gerações ({file} e {file}.1).
 */

const DEFAULT_MAX_FILE_BYTES = 1024 * 1024; // 1MB por geração (~10k linhas)
const DEFAULT_FLUSH_MS = 500;

export class ScrollbackWriter {
  private pending: Uint8Array[] = [];
  private pendingBytes = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;

  constructor(
    private readonly filePath: string,
    private readonly maxFileBytes: number = DEFAULT_MAX_FILE_BYTES,
    private readonly flushMs: number = DEFAULT_FLUSH_MS
  ) {
    mkdirSync(dirname(filePath), { recursive: true });
  }

  append(chunk: Uint8Array): void {
    if (this.disposed) return;
    this.pending.push(chunk);
    this.pendingBytes += chunk.byteLength;
    this.timer ??= setTimeout(() => this.flush(), this.flushMs);
  }

  flush(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.pending.length === 0) return;
    const batch = Buffer.concat(this.pending);
    this.pending = [];
    this.pendingBytes = 0;
    appendFileSync(this.filePath, batch);
    this.rotateIfNeeded();
  }

  dispose(): void {
    this.flush();
    this.disposed = true;
  }

  private rotateIfNeeded(): void {
    try {
      if (statSync(this.filePath).size <= this.maxFileBytes) return;
      const prev = `${this.filePath}.1`;
      rmSync(prev, { force: true });
      renameSync(this.filePath, prev);
    } catch {
      // rotação é best-effort: nunca derrubar o host por I/O de scrollback
    }
  }
}

/** Tail persistido (geração anterior + atual), limitado a maxBytes — restore. */
export function readScrollbackTail(filePath: string, maxBytes: number): Uint8Array {
  const parts: Buffer[] = [];
  for (const p of [`${filePath}.1`, filePath]) {
    if (existsSync(p)) parts.push(readFileSync(p));
  }
  if (parts.length === 0) return new Uint8Array(0);
  const all = Buffer.concat(parts);
  return all.byteLength <= maxBytes ? all : all.subarray(all.byteLength - maxBytes);
}
