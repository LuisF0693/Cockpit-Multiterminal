/**
 * Código de cores de identidade por adapter (Story 12.4, AC1) — tabela FIXA
 * por `adapterId`, mesmo princípio de `STATUS_COLORS` (status-colors.tsx):
 * fonte de verdade única, consumida pelo TerminalTile e pela sessão master.
 * `adapterId` não é um union fechado (registro dinâmico, Épico 2) — ids
 * desconhecidos caem no fallback neutro, sem quebrar.
 */

export const ADAPTER_COLORS: Record<string, string> = {
  shell: '#9CA3AF',
  cmd: '#9CA3AF',
  'claude-code': '#D97757',
  codex: '#10A37F',
  grok: '#8B5CF6',
  'gemini-cli': '#4285F4',
  antigravity: '#F4B400',
  ollama: '#EEEEEC'
};

export const DEFAULT_ADAPTER_COLOR = '#6B7280';

export function adapterColor(adapterId: string): string {
  return ADAPTER_COLORS[adapterId] ?? DEFAULT_ADAPTER_COLOR;
}
