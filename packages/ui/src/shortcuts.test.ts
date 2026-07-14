import { describe, expect, it } from 'vitest';
import { matchShortcut, type KeyStroke } from './shortcuts';

function stroke(partial: Partial<KeyStroke> & { key: string }): KeyStroke {
  return { ctrlKey: false, shiftKey: false, altKey: false, metaKey: false, ...partial };
}

describe('registro central de atalhos (AC5)', () => {
  it('Ctrl+N → novo terminal', () => {
    expect(matchShortcut(stroke({ ctrlKey: true, key: 'n' }))).toEqual({ type: 'new-terminal' });
    expect(matchShortcut(stroke({ ctrlKey: true, key: 'N' }))).toEqual({ type: 'new-terminal' });
  });

  it('Ctrl+1..9 → foca terminal pelo índice', () => {
    expect(matchShortcut(stroke({ ctrlKey: true, key: '1' }))).toEqual({
      type: 'focus-terminal',
      index: 0
    });
    expect(matchShortcut(stroke({ ctrlKey: true, key: '9' }))).toEqual({
      type: 'focus-terminal',
      index: 8
    });
  });

  it('Ctrl+W → fechar focado', () => {
    expect(matchShortcut(stroke({ ctrlKey: true, key: 'w' }))).toEqual({
      type: 'close-terminal'
    });
  });

  it('Ctrl+M → alternar master (Story 3.1)', () => {
    expect(matchShortcut(stroke({ ctrlKey: true, key: 'm' }))).toEqual({
      type: 'toggle-master'
    });
  });

  it('Ctrl+T → alternar timeline (Story 3.3)', () => {
    expect(matchShortcut(stroke({ ctrlKey: true, key: 't' }))).toEqual({
      type: 'toggle-timeline'
    });
  });

  it('não captura sem Ctrl ou com modificadores extras', () => {
    expect(matchShortcut(stroke({ key: 'n' }))).toBeNull();
    expect(matchShortcut(stroke({ ctrlKey: true, shiftKey: true, key: 'n' }))).toBeNull();
    expect(matchShortcut(stroke({ ctrlKey: true, key: '0' }))).toBeNull();
    expect(matchShortcut(stroke({ ctrlKey: true, key: 'x' }))).toBeNull();
  });
});
