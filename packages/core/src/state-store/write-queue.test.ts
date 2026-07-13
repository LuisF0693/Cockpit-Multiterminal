import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WriteQueue } from './write-queue';

describe('WriteQueue (NFR8: flush 250ms ou 100 ops)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('acumula e flusha por timer, aplicando em ordem', () => {
    const applied: number[] = [];
    const batches: number[] = [];
    const queue = new WriteQueue((batch) => {
      batches.push(batch.length);
      for (const op of batch) op();
    });

    queue.push(() => applied.push(1));
    queue.push(() => applied.push(2));
    expect(applied).toEqual([]); // nada síncrono — input nunca espera I/O

    vi.advanceTimersByTime(250);
    expect(applied).toEqual([1, 2]);
    expect(batches).toEqual([2]);
  });

  it('flusha imediatamente ao atingir maxOps', () => {
    const batches: number[] = [];
    const queue = new WriteQueue((batch) => batches.push(batch.length), { maxOps: 3 });

    queue.push(() => void 0);
    queue.push(() => void 0);
    expect(batches).toEqual([]);
    queue.push(() => void 0);
    expect(batches).toEqual([3]); // sem esperar o timer
  });

  it('flush manual drena tudo e cancela o timer', () => {
    const applied: number[] = [];
    const queue = new WriteQueue((batch) => batch.forEach((op) => op()));
    queue.push(() => applied.push(1));

    queue.flush();
    expect(applied).toEqual([1]);
    vi.advanceTimersByTime(1000);
    expect(applied).toEqual([1]); // não reflusha vazio
  });

  it('dispose flusha pendentes e rejeita novos pushes', () => {
    const applied: number[] = [];
    const queue = new WriteQueue((batch) => batch.forEach((op) => op()));
    queue.push(() => applied.push(1));
    queue.dispose();
    expect(applied).toEqual([1]);

    queue.push(() => applied.push(2));
    vi.advanceTimersByTime(1000);
    expect(applied).toEqual([1]);
  });
});
