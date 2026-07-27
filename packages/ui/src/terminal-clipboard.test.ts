import { describe, expect, it } from 'vitest';
import { countPasteSubmits, needsPasteConfirmation, sanitizePastedText } from './terminal-clipboard';

describe('sanitizePastedText', () => {
  it('CRLF e LF viram CR (Enter de PTY)', () => {
    expect(sanitizePastedText('a\r\nb\nc')).toBe('a\rb\rc');
  });

  it('preserva CR que já veio sozinho (idempotente)', () => {
    expect(sanitizePastedText('a\rb')).toBe('a\rb');
  });

  it('remove byte nulo (trunca escrita na PTY do Windows)', () => {
    expect(sanitizePastedText('ec\x00ho')).toBe('echo');
  });

  it('remove marcadores de bracketed paste embutidos no conteúdo (paste injection)', () => {
    expect(sanitizePastedText('ls\x1b[201~rm -rf /')).toBe('lsrm -rf /');
  });
});

describe('countPasteSubmits', () => {
  it('texto sem Enter não submete nada', () => {
    expect(countPasteSubmits('git status')).toBe(0);
  });

  it('conta um Enter por linha submetida', () => {
    expect(countPasteSubmits(sanitizePastedText('a\nb\nc\n'))).toBe(3);
  });
});

describe('needsPasteConfirmation', () => {
  it('comando único com Enter no fim NÃO pede confirmação (caso comum)', () => {
    expect(needsPasteConfirmation(sanitizePastedText('npm test\n'), false)).toBe(false);
  });

  it('trecho sem Enter nenhum NÃO pede confirmação', () => {
    expect(needsPasteConfirmation('npm test', false)).toBe(false);
  });

  it('duas ou mais submissões PEDEM confirmação', () => {
    expect(needsPasteConfirmation(sanitizePastedText('a\nb\n'), false)).toBe(true);
  });

  it('com bracketed paste ligado nada é submetido sozinho — nunca confirma', () => {
    expect(needsPasteConfirmation(sanitizePastedText('a\nb\nc\n'), true)).toBe(false);
  });
});
