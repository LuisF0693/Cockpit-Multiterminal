import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebglAddon } from '@xterm/addon-webgl';
import '@xterm/xterm/css/xterm.css';

/**
 * TerminalView — organism embrionário do TerminalTile (front-end spec).
 * xterm.js conectado a uma MessagePort binária (PTY Host):
 * - saída: chunks Uint8Array → term.write; ack no callback (backpressure)
 * - input: term.onData → TextEncoder → port.postMessage
 * Renderer WebGL com fallback documentado: se o addon falhar (GPU/driver),
 * seguimos no renderer DOM/canvas padrão do xterm — funcional, menos rápido.
 */

export interface TerminalViewProps {
  /** Porta de dados binária negociada pelo Main (uma por sessão PTY). */
  port: MessagePort;
  /** Notifica cols/rows para o resize do PTY (canal de controle). */
  onResize?: (size: { cols: number; rows: number }) => void;
}

const THEME = {
  background: '#0B0F14',
  foreground: '#E5E7EB',
  cursor: '#22D3EE',
  selectionBackground: '#334155'
};

export function TerminalView({ port, onResize }: TerminalViewProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const onResizeRef = useRef(onResize);
  onResizeRef.current = onResize;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;

    const term = new Terminal({
      fontFamily: '"Cascadia Mono", "JetBrains Mono", Consolas, monospace',
      fontSize: 14,
      theme: THEME,
      scrollback: 5000,
      allowProposedApi: true
    });
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

    port.onmessage = (event: MessageEvent) => {
      const chunk = event.data as Uint8Array;
      // Ack após consumo → backpressure no host (pause/resume do PTY).
      term.write(chunk, () => port.postMessage({ t: 'ack', n: chunk.byteLength }));
    };
    port.start();

    const notifyResize = (): void => {
      if (disposed) return;
      fit.fit();
      onResizeRef.current?.({ cols: term.cols, rows: term.rows });
    };
    const observer = new ResizeObserver(notifyResize);
    observer.observe(container);

    term.focus();

    return () => {
      disposed = true;
      observer.disconnect();
      inputSub.dispose();
      webgl?.dispose();
      term.dispose();
      port.close();
    };
  }, [port]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: 0 }} />;
}
