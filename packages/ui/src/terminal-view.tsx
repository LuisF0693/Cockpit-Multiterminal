import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebglAddon } from '@xterm/addon-webgl';
import { matchShortcut } from './shortcuts';
import { getActiveTheme, subscribeTheme, type ThemeData } from './theme-runtime';
import '@xterm/xterm/css/xterm.css';

/**
 * TerminalView — organism embrionário do TerminalTile (front-end spec).
 * xterm.js conectado a uma MessagePort binária (PTY Host):
 * - saída: chunks Uint8Array → term.write; ack no callback (backpressure)
 * - input: term.onData → TextEncoder → port.postMessage
 * Renderer WebGL com fallback documentado: se o addon falhar (GPU/driver),
 * seguimos no renderer DOM/canvas padrão do xterm — funcional, menos rápido.
 * Tiles desfocados escrevem em lote (~10fps) para não competir com o focado
 * (spec de performance da Story 1.3); o backpressure segue funcionando pois
 * os acks são enviados quando o lote é consumido.
 */

const UNFOCUSED_FLUSH_MS = 100;

export interface TerminalViewProps {
  /** Porta de dados binária negociada pelo Main (uma por sessão PTY). */
  port: MessagePort;
  /** Tile focado escreve imediatamente; desfocado, em lote. */
  focused?: boolean;
  /** Notifica cols/rows para o resize do PTY (canal de controle). */
  onResize?: (size: { cols: number; rows: number }) => void;
}

// Tema do xterm coordenado pelo tema ATIVO (Story 15.2, FR55) — xterm não
// lê CSS variables, então consome os dados CRUS do runtime e re-tematiza
// ao vivo via subscribeTheme (o fundo casa com surface.tile do tema).
const xtermTheme = (t: ThemeData): { background: string; foreground: string; cursor: string; selectionBackground: string } => ({
  ...t.terminal
});

export function TerminalView({ port, focused = true, onResize }: TerminalViewProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const onResizeRef = useRef(onResize);
  onResizeRef.current = onResize;
  const focusedRef = useRef(focused);
  focusedRef.current = focused;
  const termRef = useRef<Terminal | null>(null);
  const flushRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;

    const term = new Terminal({
      fontFamily: getActiveTheme().font.mono,
      fontSize: 14,
      theme: xtermTheme(getActiveTheme()),
      scrollback: 5000,
      allowProposedApi: true
    });
    termRef.current = term;

    // Re-tematiza ao vivo na troca de tema (15.2) — options é mutável no xterm 5.
    const unsubTheme = subscribeTheme((t) => {
      term.options.theme = xtermTheme(t);
      term.options.fontFamily = t.font.mono;
    });

    // Atalhos globais (Ctrl+N/W/1..9) não são consumidos pelo xterm:
    // retornar false pula o handling interno e deixa o evento subir à window.
    term.attachCustomKeyEventHandler((e) => matchShortcut(e) === null);

    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(container);

    // WebGL + fit adiados 1 frame: no duplo-mount do StrictMode (dev) o
    // primeiro terminal é descartado antes do render inicial — carregar o
    // addon nesse intervalo dispara erro assíncrono interno do xterm.
    let webgl: WebglAddon | null = null;
    requestAnimationFrame(() => {
      if (disposed) return;
      try {
        webgl = new WebglAddon();
        term.loadAddon(webgl);
        webgl.onContextLoss(() => {
          webgl?.dispose();
          webgl = null;
        });
      } catch {
        // Fallback canvas/DOM: WebGL indisponível (VM, driver antigo) — seguir sem addon.
        webgl = null;
      }
      notifyResize();
    });

    const encoder = new TextEncoder();
    const inputSub = term.onData((data) => {
      port.postMessage(encoder.encode(data));
    });

    // Escrita com throttle p/ tiles desfocados; ack por chunk consumido.
    let pending: Uint8Array[] = [];
    let flushTimer: ReturnType<typeof setTimeout> | null = null;
    const writeChunk = (chunk: Uint8Array): void => {
      term.write(chunk, () => port.postMessage({ t: 'ack', n: chunk.byteLength }));
    };
    const flushPending = (): void => {
      if (flushTimer !== null) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
      const batch = pending;
      pending = [];
      for (const chunk of batch) writeChunk(chunk);
    };
    flushRef.current = flushPending;

    port.onmessage = (event: MessageEvent) => {
      const chunk = event.data as Uint8Array;
      if (focusedRef.current) {
        writeChunk(chunk);
        return;
      }
      pending.push(chunk);
      flushTimer ??= setTimeout(flushPending, UNFOCUSED_FLUSH_MS);
    };
    port.start();

    const notifyResize = (): void => {
      if (disposed) return;
      fit.fit();
      onResizeRef.current?.({ cols: term.cols, rows: term.rows });
    };
    const observer = new ResizeObserver(notifyResize);
    observer.observe(container);

    return () => {
      disposed = true;
      if (flushTimer !== null) clearTimeout(flushTimer);
      flushRef.current = null;
      termRef.current = null;
      observer.disconnect();
      unsubTheme();
      inputSub.dispose();
      webgl?.dispose();
      term.dispose();
      // NÃO fechar a porta aqui: o dono é o App/store (fecha no removeSession).
      // O duplo-mount do StrictMode (dev) remonta este componente com a MESMA
      // porta — close() no cleanup mataria o canal permanentemente.
      port.onmessage = null;
    };
  }, [port]);

  // Ganhou foco → drena o buffer pendente e foca o xterm.
  useEffect(() => {
    if (focused) {
      flushRef.current?.();
      termRef.current?.focus();
    }
  }, [focused]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: 0 }} />;
}
