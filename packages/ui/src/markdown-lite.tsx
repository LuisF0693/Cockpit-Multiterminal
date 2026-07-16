/**
 * markdown-lite (Story 12.1, FR35) — renderizador de Markdown MÍNIMO, sem
 * dependência nova (NFR9 diz que Playwright é "a única exceção" às
 * dependências mínimas — trazer uma lib de Markdown quebraria essa
 * garantia). Cobre o caso comum de README/docs internos: headers, negrito/
 * itálico/código inline, blocos de código, listas. NUNCA usa
 * `dangerouslySetInnerHTML` — só produz elementos React seguros, mesmo
 * tratando arquivo de fonte não-confiável (defesa contra XSS).
 *
 * `parseMarkdownLite` é PURA (testável sem harness de render — mesmo
 * princípio de separar decisão de efeito já usado em `sdc-routing.ts`);
 * `renderMarkdownLite` só converte o resultado em JSX.
 */
import { theme } from './theme';

export type InlineToken = { kind: 'text'; value: string } | { kind: 'code' | 'bold' | 'italic'; value: string };

export type MarkdownBlock =
  | { kind: 'heading'; level: number; tokens: InlineToken[] }
  | { kind: 'paragraph'; tokens: InlineToken[] }
  | { kind: 'code'; text: string }
  | { kind: 'list'; ordered: boolean; items: InlineToken[][] };

function parseInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  const pattern = /`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) tokens.push({ kind: 'text', value: text.slice(last, match.index) });
    if (match[1] !== undefined) tokens.push({ kind: 'code', value: match[1] });
    else if (match[2] !== undefined) tokens.push({ kind: 'bold', value: match[2] });
    else if (match[3] !== undefined) tokens.push({ kind: 'italic', value: match[3] });
    last = pattern.lastIndex;
  }
  if (last < text.length) tokens.push({ kind: 'text', value: text.slice(last) });
  return tokens;
}

/** Parsing puro — sem I/O, sem React. */
export function parseMarkdownLite(text: string): MarkdownBlock[] {
  const lines = text.split(/\r?\n/);
  const blocks: MarkdownBlock[] = [];
  let i = 0;
  let listBuffer: { ordered: boolean; items: InlineToken[][] } | null = null;

  const flushList = (): void => {
    if (!listBuffer) return;
    blocks.push({ kind: 'list', ordered: listBuffer.ordered, items: listBuffer.items });
    listBuffer = null;
  };

  while (i < lines.length) {
    const line = lines[i]!;

    if (line.trim().startsWith('```')) {
      flushList();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i]!.trim().startsWith('```')) {
        codeLines.push(lines[i]!);
        i++;
      }
      i++; // consome a cerca de fechamento
      blocks.push({ kind: 'code', text: codeLines.join('\n') });
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      flushList();
      blocks.push({ kind: 'heading', level: heading[1]!.length, tokens: parseInline(heading[2]!) });
      i++;
      continue;
    }

    const unordered = /^[-*]\s+(.*)$/.exec(line);
    const ordered = /^\d+\.\s+(.*)$/.exec(line);
    if (unordered || ordered) {
      const isOrdered = !!ordered;
      const content = (unordered ?? ordered)![1]!;
      if (!listBuffer || listBuffer.ordered !== isOrdered) {
        flushList();
        listBuffer = { ordered: isOrdered, items: [] };
      }
      listBuffer.items.push(parseInline(content));
      i++;
      continue;
    }

    flushList();
    if (line.trim().length === 0) {
      i++;
      continue;
    }
    blocks.push({ kind: 'paragraph', tokens: parseInline(line) });
    i++;
  }
  flushList();

  return blocks;
}

function renderTokens(tokens: InlineToken[], keyPrefix: string): (string | JSX.Element)[] {
  return tokens.map((t, idx) => {
    if (t.kind === 'text') return t.value;
    if (t.kind === 'code') {
      return (
        <code key={`${keyPrefix}-${idx}`} style={{ background: theme.surface.raised, padding: '1px 4px', borderRadius: 3 }}>
          {t.value}
        </code>
      );
    }
    if (t.kind === 'bold') return <strong key={`${keyPrefix}-${idx}`}>{t.value}</strong>;
    return <em key={`${keyPrefix}-${idx}`}>{t.value}</em>;
  });
}

const HEADING_SIZE: Record<number, number> = { 1: 20, 2: 17, 3: 15, 4: 13, 5: 13, 6: 13 };

/** Só converte o resultado (já validado) de `parseMarkdownLite` em JSX. */
export function renderMarkdownLite(text: string): JSX.Element {
  const blocks = parseMarkdownLite(text);
  return (
    <div style={{ fontSize: theme.font.size.md, lineHeight: 1.5, color: theme.text.primary }}>
      {blocks.map((block, i) => {
        if (block.kind === 'code') {
          return (
            <pre
              key={i}
              style={{
                background: theme.surface.canvas,
                border: `1px solid ${theme.border.default}`,
                borderRadius: 6,
                padding: 10,
                overflow: 'auto',
                fontSize: theme.font.size.sm,
                fontFamily: theme.font.mono,
                margin: '6px 0'
              }}
            >
              {block.text}
            </pre>
          );
        }
        if (block.kind === 'heading') {
          const HeadingTag = `h${Math.min(block.level, 6)}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
          return (
            <HeadingTag key={i} style={{ fontSize: HEADING_SIZE[block.level] ?? 13, margin: '10px 0 4px' }}>
              {renderTokens(block.tokens, `h-${i}`)}
            </HeadingTag>
          );
        }
        if (block.kind === 'list') {
          const ListTag = block.ordered ? 'ol' : 'ul';
          return (
            <ListTag key={i} style={{ margin: '4px 0', paddingLeft: 22 }}>
              {block.items.map((item, idx) => (
                <li key={idx} style={{ margin: '2px 0' }}>
                  {renderTokens(item, `li-${i}-${idx}`)}
                </li>
              ))}
            </ListTag>
          );
        }
        return (
          <p key={i} style={{ margin: '4px 0' }}>
            {renderTokens(block.tokens, `p-${i}`)}
          </p>
        );
      })}
    </div>
  );
}
