import { describe, expect, it } from 'vitest';
import { parseMarkdownLite } from './markdown-lite';

describe('parseMarkdownLite (Story 12.1, FR35)', () => {
  it('reconhece headers de 1 a 6 níveis', () => {
    const blocks = parseMarkdownLite('# Título\n## Subtítulo\n### Nível 3');
    expect(blocks).toEqual([
      { kind: 'heading', level: 1, tokens: [{ kind: 'text', value: 'Título' }] },
      { kind: 'heading', level: 2, tokens: [{ kind: 'text', value: 'Subtítulo' }] },
      { kind: 'heading', level: 3, tokens: [{ kind: 'text', value: 'Nível 3' }] }
    ]);
  });

  it('agrupa parágrafo simples', () => {
    const blocks = parseMarkdownLite('Olá mundo');
    expect(blocks).toEqual([{ kind: 'paragraph', tokens: [{ kind: 'text', value: 'Olá mundo' }] }]);
  });

  it('reconhece negrito, itálico e código inline misturados', () => {
    const blocks = parseMarkdownLite('um **negrito** e um *itálico* e `código`');
    expect(blocks).toEqual([
      {
        kind: 'paragraph',
        tokens: [
          { kind: 'text', value: 'um ' },
          { kind: 'bold', value: 'negrito' },
          { kind: 'text', value: ' e um ' },
          { kind: 'italic', value: 'itálico' },
          { kind: 'text', value: ' e ' },
          { kind: 'code', value: 'código' }
        ]
      }
    ]);
  });

  it('agrupa lista não-ordenada consecutiva num único bloco', () => {
    const blocks = parseMarkdownLite('- um\n- dois\n- três');
    expect(blocks).toEqual([
      {
        kind: 'list',
        ordered: false,
        items: [
          [{ kind: 'text', value: 'um' }],
          [{ kind: 'text', value: 'dois' }],
          [{ kind: 'text', value: 'três' }]
        ]
      }
    ]);
  });

  it('agrupa lista ordenada consecutiva num único bloco', () => {
    const blocks = parseMarkdownLite('1. primeiro\n2. segundo');
    expect(blocks).toEqual([
      {
        kind: 'list',
        ordered: true,
        items: [[{ kind: 'text', value: 'primeiro' }], [{ kind: 'text', value: 'segundo' }]]
      }
    ]);
  });

  it('troca de lista não-ordenada pra ordenada gera dois blocos separados', () => {
    const blocks = parseMarkdownLite('- a\n1. b');
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toMatchObject({ kind: 'list', ordered: false });
    expect(blocks[1]).toMatchObject({ kind: 'list', ordered: true });
  });

  it('extrai bloco de código sem parsear o conteúdo interno como markdown', () => {
    const blocks = parseMarkdownLite('```\nconst x = 1;\n# não é header aqui\n```');
    expect(blocks).toEqual([{ kind: 'code', text: 'const x = 1;\n# não é header aqui' }]);
  });

  it('ignora linhas em branco entre blocos', () => {
    const blocks = parseMarkdownLite('# Título\n\nParágrafo depois de linha vazia');
    expect(blocks).toEqual([
      { kind: 'heading', level: 1, tokens: [{ kind: 'text', value: 'Título' }] },
      { kind: 'paragraph', tokens: [{ kind: 'text', value: 'Parágrafo depois de linha vazia' }] }
    ]);
  });

  it('texto vazio retorna array vazio', () => {
    expect(parseMarkdownLite('')).toEqual([]);
  });
});
