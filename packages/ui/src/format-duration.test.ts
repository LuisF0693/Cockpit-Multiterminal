import { describe, expect, it } from 'vitest';
import { formatDuration } from './format-duration';

describe('formatDuration (Story 3.1)', () => {
  it('formata segundos, minutos e horas', () => {
    expect(formatDuration(5_000)).toBe('5s');
    expect(formatDuration(75_000)).toBe('1m 15s');
    expect(formatDuration(3_725_000)).toBe('1h 2m');
  });

  it('nunca negativo', () => {
    expect(formatDuration(-10)).toBe('0s');
  });
});
