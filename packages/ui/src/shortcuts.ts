/**
 * Registro CENTRAL de atalhos (Story 1.3, AC5) — mapa único, sem listeners
 * espalhados. Função pura: dado um evento de teclado, devolve a ação (ou null).
 * O mesmo matcher é usado pelo TerminalView para NÃO engolir esses atalhos
 * dentro do xterm (attachCustomKeyEventHandler).
 */

export type ShortcutAction =
  | { type: 'new-terminal' }
  | { type: 'focus-terminal'; index: number }
  | { type: 'close-terminal' }
  | { type: 'toggle-master' };

export interface KeyStroke {
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  key: string;
}

export function matchShortcut(e: KeyStroke): ShortcutAction | null {
  if (!e.ctrlKey || e.shiftKey || e.altKey || e.metaKey) return null;
  const key = e.key.toLowerCase();

  if (key === 'n') return { type: 'new-terminal' };
  if (key === 'w') return { type: 'close-terminal' };
  if (key === 'm') return { type: 'toggle-master' };
  if (key >= '1' && key <= '9' && key.length === 1) {
    return { type: 'focus-terminal', index: Number(key) - 1 };
  }
  return null;
}
