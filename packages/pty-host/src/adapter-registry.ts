import type { AgentAdapter } from '@cockpit/adapter-contract';

/**
 * AdapterRegistry (Story 2.1) — vive NO PTY Host (components.md).
 * O core nunca vê um adapter: consulta a lista via protocolo.
 * Novo provider = package em packages/adapters/* + register() aqui.
 */
export class AdapterRegistry {
  private readonly adapters = new Map<string, AgentAdapter>();

  register(adapter: AgentAdapter): void {
    if (this.adapters.has(adapter.id)) {
      throw new Error(`adapter duplicado: ${adapter.id}`);
    }
    this.adapters.set(adapter.id, adapter);
  }

  get(id: string): AgentAdapter {
    const adapter = this.adapters.get(id);
    if (!adapter) throw new Error(`adapter desconhecido: ${id}`);
    return adapter;
  }

  has(id: string): boolean {
    return this.adapters.has(id);
  }

  list(): Array<{ id: string; displayName: string }> {
    return [...this.adapters.values()].map((a) => ({ id: a.id, displayName: a.displayName }));
  }
}
