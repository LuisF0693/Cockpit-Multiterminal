/**
 * Regras PURAS de área de transferência do terminal (pedido do fundador:
 * "não consigo copiar nem colar no cockpit"). Ficam aqui, fora do
 * `TerminalView`, porque são decisões testáveis sem DOM nem xterm — mesmo
 * princípio decisão-pura/efeito já usado em `layout.ts`/`attention-cycle.ts`.
 *
 * Contexto do bug: o xterm.js NÃO implementa copiar/colar sozinho. Ele traduz
 * Ctrl+C em `\x03` (SIGINT) e Ctrl+V em `\x16` (SYN) e cancela o evento do
 * navegador — por isso nenhum dos dois funcionava dentro dos tiles. Quem
 * embute o xterm precisa interceptar os dois (é o que VS Code e Windows
 * Terminal fazem).
 */

/**
 * Normaliza texto colado para o que uma PTY espera.
 *
 * - CRLF e LF viram CR: o Enter de um terminal é `\r`; deixar `\n` cru faz o
 *   shell receber line-feed sem carriage-return e embaralhar a linha.
 * - `\x00` sai fora: byte nulo trunca a escrita em algumas PTYs no Windows.
 * - o terminador de bracketed paste (`ESC [ 201 ~`) é removido do CONTEÚDO:
 *   se ele viesse dentro do texto colado, fecharia o bloco no meio e o resto
 *   da colagem seria interpretado como comando (vetor clássico de "paste
 *   injection").
 */
export function sanitizePastedText(raw: string): string {
  return raw
    .replace(/\r\n/g, '\r')
    .replace(/\n/g, '\r')
    // eslint-disable-next-line no-control-regex -- alvo é justamente o byte de controle
    .replace(/\x00/g, '')
    // eslint-disable-next-line no-control-regex -- idem: sequência ESC literal
    .replace(/\x1b\[20[01]~/g, '');
}

/**
 * Quantos comandos esta colagem SUBMETE sozinha — cada `\r` é um Enter.
 * Só faz sentido quando o bracketed paste está DESLIGADO; com ele ligado o
 * conteúdo inteiro chega ao processo como um bloco só e nada é executado
 * sem o fundador apertar Enter.
 */
export function countPasteSubmits(sanitized: string): number {
  let count = 0;
  for (const ch of sanitized) if (ch === '\r') count += 1;
  return count;
}

/**
 * A colagem merece confirmação? Uma linha com Enter no fim (o caso comum de
 * copiar um comando pronto) NÃO merece — confirmar isso seria atrito puro.
 * Duas ou mais submissões, sim: é o cenário "colei 30 comandos sem querer"
 * que o fundador pediu para não acontecer.
 */
export function needsPasteConfirmation(sanitized: string, bracketedPasteMode: boolean): boolean {
  if (bracketedPasteMode) return false;
  return countPasteSubmits(sanitized) >= 2;
}
