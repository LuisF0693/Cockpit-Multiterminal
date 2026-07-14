import { describe, expect, it } from 'vitest';
import type { AgentAdapter } from '@cockpit/adapter-contract';
import { AdapterRegistry } from './adapter-registry';

function fakeAdapter(id: string, displayName = id): AgentAdapter {
  return {
    id,
    displayName,
    statusStrategy: 'process-only',
    detectAvailability: async () => ({ available: true }),
    spawn: async () => {
      throw new Error('não usado no teste');
    }
  };
}

describe('AdapterRegistry (Story 2.1)', () => {
  it('registra e resolve adapters por id', () => {
    const registry = new AdapterRegistry();
    registry.register(fakeAdapter('shell', 'Shell'));
    expect(registry.get('shell').displayName).toBe('Shell');
    expect(registry.has('shell')).toBe(true);
  });

  it('lista adapters registrados (id + displayName)', () => {
    const registry = new AdapterRegistry();
    registry.register(fakeAdapter('shell', 'Shell'));
    registry.register(fakeAdapter('claude-code', 'Claude Code'));
    expect(registry.list()).toEqual([
      { id: 'shell', displayName: 'Shell' },
      { id: 'claude-code', displayName: 'Claude Code' }
    ]);
  });

  it('rejeita duplicados e ids desconhecidos com erro claro', () => {
    const registry = new AdapterRegistry();
    registry.register(fakeAdapter('shell'));
    expect(() => registry.register(fakeAdapter('shell'))).toThrow(/duplicado/);
    expect(() => registry.get('grok')).toThrow(/desconhecido/);
  });
});
