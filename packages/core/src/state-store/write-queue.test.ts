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

describe('WriteQueue — resiliência a falha do apply (Story 4.1)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('falha transitória: batch recolocado na frente, sem perda/duplicação, ordem preservada', () => {
    const applied: number[] = [];
    let failures = 2;
    // apply ATÔMICO (lança antes de aplicar) — espelha o rollback do SQLite
    const queue = new WriteQueue(
      (batch) => {
        if (failures > 0) {
          failures--;
          throw new Error('lock transitório');
        }
        batch.forEach((op) => op());
      },
      { flushMs: 50 }
    );

    queue.push(() => applied.push(1));
    queue.push(() => applied.push(2));
    expect(() => queue.flush()).not.toThrow(); // falha 1 — não propaga
    expect(applied).toEqual([]);

    queue.push(() => applied.push(3)); // chega DURANTE a degradação
    vi.advanceTimersByTime(50); // retry automático — falha 2
    expect(applied).toEqual([]);

    vi.advanceTimersByTime(50); // retry — sucesso
    expect(applied).toEqual([1, 2, 3]); // ordem original, sem dup
  });

  it('falha permanente: descarta o batch após o cap e segue vivo p/ novas gravações', () => {
    const applied: number[] = [];
    let broken = true;
    const queue = new WriteQueue(
      (batch) => {
        if (broken) throw new Error('disco fora');
        batch.forEach((op) => op());
      },
      { flushMs: 50, maxApplyRetries: 2 }
    );

    queue.push(() => applied.push(1));
    queue.flush(); // falha 1
    vi.advanceTimersByTime(50); // falha 2
    vi.advanceTimersByTime(50); // falha 3 → cap excedido → descarte
    expect(applied).toEqual([]);
    expect(queue.pending).toBe(0); // batch descartado, fila limpa

    broken = false;
    queue.push(() => applied.push(2));
    vi.advanceTimersByTime(250);
    expect(applied).toEqual([2]); // app segue gravando normalmente
  });
});
