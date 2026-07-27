import { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebglAddon } from '@xterm/addon-webgl';
import { ICON_SIZE, Icon, Icons, type LucideIcon } from './icons';
import { matchShortcut } from './shortcuts';
import { needsPasteConfirmation, sanitizePastedText } from './terminal-clipboard';
import { theme } from './theme';
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
 *
 * Copiar/colar (pedido do fundador: "não consigo copiar nem colar"): o xterm
 * NÃO traz isso pronto — ele manda `\x03`/`\x16` e cancela o evento do
 * navegador. As regras vivem aqui, com a convenção do Windows Terminal / VS
 * Code: Ctrl+C copia SE houver seleção, senão é SIGINT (quebrar o SIGINT
 * seria pior que o bug); Ctrl+V cola sanitizado; Ctrl+Shift+C/V são
 * incondicionais. Menu de contexto no botão direito oferece os dois.
 */

const UNFOCUSED_FLUSH_MS = 100;

/** Janela de silêncio antes de refazer o fit e reportar cols/rows à PTY. */
const RESIZE_DEBOUNCE_MS = 80;

/** Espera pelo evento `paste` nativo antes de cair na leitura do clipboard. */
const PASTE_FALLBACK_MS = 60;

/** Tamanho nominal do menu de contexto — usado só para não abri-lo fora do tile. */
const CONTEXT_MENU_WIDTH = 168;
const CONTEXT_MENU_HEIGHT = 62;

export interface TerminalViewProps {
  /** Porta de dados binária negociada pelo Main (uma por sessão PTY). */
  port: MessagePort;
  /** Tile focado escreve imediatamente; desfocado, em lote. */
  focused?: boolean;
  /** Notifica cols/rows para o resize do PTY (canal de controle). */
  onResize?: (size: { cols: number; rows: number }) => void;
  /**
   * Confirma uma colagem que submeteria VÁRIOS comandos sozinha (sem
   * bracketed paste). O dono (App) responde com o modal temático; ausente,
   * a colagem segue direto — este componente nunca abre dialog nativo.
   */
  onConfirmMultilinePaste?: (submits: number) => Promise<boolean>;
}

// Tema do xterm coordenado pelo tema ATIVO (Story 15.2, FR55) — xterm não
// lê CSS variables, então consome os dados CRUS do runtime e re-tematiza
// ao vivo via subscribeTheme (o fundo casa com surface.tile do tema).
const xtermTheme = (t: ThemeData): { background: string; foreground: string; cursor: string; selectionBackground: string } => ({
  ...t.terminal
});

export function TerminalView({
  port,
  focused = true,
  onResize,
  onConfirmMultilinePaste
}: TerminalViewProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const onResizeRef = useRef(onResize);
  onResizeRef.current = onResize;
  const focusedRef = useRef(focused);
  focusedRef.current = focused;
  // Lido dentro dos handlers registrados no mount — ref evita a closure
  // obsoleta (mesmo gotcha já resolvido no TerminalTile p/ move/resize).
  const confirmPasteRef = useRef(onConfirmMultilinePaste);
  confirmPasteRef.current = onConfirmMultilinePaste;
  const termRef = useRef<Terminal | null>(null);
  const flushRef = useRef<(() => void) | null>(null);
  // Menu de contexto (botão direito) — o Electron não desenha um menu nativo
  // de edição sobre o canvas do xterm, então o caminho "sem atalho" para
  // copiar/colar precisa existir aqui.
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; hasSelection: boolean } | null>(null);
  const copyRef = useRef<() => void>(() => void 0);
  const pasteFromClipboardRef = useRef<() => void>(() => void 0);

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

    /**
     * Copia a seleção. `writeText` não exige permissão especial (é escrita,
     * dentro de um gesto do usuário); falha silenciosa em vez de derrubar o
     * terminal — copiar nunca deve virar exceção no meio de um comando.
     */
    const copySelection = (): boolean => {
      const selection = term.getSelection();
      if (!selection) return false;
      void navigator.clipboard.writeText(selection).catch(() => void 0);
      // Limpa a seleção como o Windows Terminal: sem isso o próximo Ctrl+C
      // copiaria de novo em vez de mandar SIGINT, e o fundador ficaria sem
      // conseguir interromper o processo.
      term.clearSelection();
      return true;
    };
    copyRef.current = () => void copySelection();

    /** Cola texto já sanitizado, confirmando quando submeteria vários comandos. */
    const applyPaste = async (raw: string): Promise<void> => {
      const text = sanitizePastedText(raw);
      if (!text) return;
      if (needsPasteConfirmation(text, term.modes.bracketedPasteMode)) {
        const confirm = confirmPasteRef.current;
        const submits = text.split('\r').length - 1;
        if (confirm && !(await confirm(submits))) return;
      }
      if (disposed) return;
      // `term.paste` (e não escrita direta na porta) porque é ele quem embrulha
      // o texto em bracketed paste quando o processo pediu esse modo — é o que
      // faz o Claude/Codex receberem a colagem como UM bloco.
      term.paste(text);
    };

    const pasteFromClipboard = (): void => {
      // Caminho SEM evento `paste` do navegador (menu de contexto, ou o
      // fallback abaixo): só resta a leitura assíncrona do clipboard.
      void navigator.clipboard
        .readText()
        .then((text) => applyPaste(text))
        .catch(() => void 0);
    };
    pasteFromClipboardRef.current = pasteFromClipboard;

    /**
     * Rede de segurança do Ctrl+V. O caminho principal é o evento `paste`
     * nativo (não precisa de permissão de leitura), mas ele só dispara se o
     * foco estiver no textarea auxiliar do xterm. Se em 60ms nenhum `paste`
     * chegou, caímos na leitura direta do clipboard. O flag garante que
     * exatamente UM dos dois caminhos executa — colar duas vezes seria pior
     * que não colar.
     */
    let pasteFallbackTimer: ReturnType<typeof setTimeout> | null = null;
    const armPasteFallback = (): void => {
      if (pasteFallbackTimer !== null) clearTimeout(pasteFallbackTimer);
      pasteFallbackTimer = setTimeout(() => {
        pasteFallbackTimer = null;
        if (!disposed) pasteFromClipboard();
      }, PASTE_FALLBACK_MS);
    };
    const cancelPasteFallback = (): void => {
      if (pasteFallbackTimer === null) return;
      clearTimeout(pasteFallbackTimer);
      pasteFallbackTimer = null;
    };

    /**
     * Atalhos globais (Ctrl+N/W/1..9) não são consumidos pelo xterm: retornar
     * false pula o handling interno e deixa o evento subir à window.
     * Copiar/colar entram ANTES do matcher porque usam Shift (o
     * `matchShortcut` ignora combinações com Shift por contrato).
     */
    term.attachCustomKeyEventHandler((e) => {
      if (e.type !== 'keydown') return matchShortcut(e) === null;
      const mod = e.ctrlKey && !e.altKey && !e.metaKey;
      const key = e.key.toLowerCase();

      if (mod && key === 'c') {
        // Ctrl+Shift+C: copiar incondicional. Ctrl+C: copia SE houver
        // seleção; sem seleção segue para o xterm virar `\x03` (SIGINT) —
        // convenção do Windows Terminal/VS Code.
        if (e.shiftKey) {
          copySelection();
          return false;
        }
        if (term.hasSelection()) {
          copySelection();
          return false;
        }
        return true;
      }

      if (mod && key === 'v') {
        // Devolvendo false o xterm não manda `\x16` NEM cancela o evento —
        // o `paste` nativo do Chromium dispara e cai no listener abaixo, que
        // sanitiza. Isso evita depender da permissão de LEITURA de clipboard.
        armPasteFallback();
        return false;
      }

      return matchShortcut(e) === null;
    });

    // Intercepta o `paste` na captura (antes do textarea interno do xterm,
    // que colaria o texto cru sem sanitização nem confirmação).
    const onPasteEvent = (event: ClipboardEvent): void => {
      cancelPasteFallback();
      const raw = event.clipboardData?.getData('text') ?? '';
      event.preventDefault();
      event.stopPropagation();
      if (raw) void applyPaste(raw);
    };
    container.addEventListener('paste', onPasteEvent, true);

    const onContextMenu = (event: MouseEvent): void => {
      event.preventDefault();
      const rect = container.getBoundingClientRect();
      // Clampa dentro do tile: o conteúdo do terminal vive sob `overflow:
      // hidden` (recorte da contra-escala do zoom), então um menu aberto perto
      // da borda inferior/direita seria cortado pela metade.
      setContextMenu({
        x: Math.max(0, Math.min(event.clientX - rect.left, container.clientWidth - CONTEXT_MENU_WIDTH)),
        y: Math.max(0, Math.min(event.clientY - rect.top, container.clientHeight - CONTEXT_MENU_HEIGHT)),
        hasSelection: term.hasSelection()
      });
    };
    container.addEventListener('contextmenu', onContextMenu);

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
    /**
     * Reflow com debounce. Antes o ResizeObserver chamava `fit`+resize da PTY
     * a cada quadro; com o terminal contra-escalado (o tile não escala mais o
     * texto — ver TerminalTile), um gesto de zoom no canvas muda o tamanho em
     * CSS px continuamente e viraria uma rajada de `session.resize` por
     * segundo, cada um atravessando IPC e chegando ao processo real. 80ms
     * espera o gesto parar sem que o usuário perceba atraso.
     */
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleResize = (): void => {
      if (resizeTimer !== null) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(notifyResize, RESIZE_DEBOUNCE_MS);
    };
    const observer = new ResizeObserver(scheduleResize);
    observer.observe(container);

    return () => {
      disposed = true;
      if (flushTimer !== null) clearTimeout(flushTimer);
      if (resizeTimer !== null) clearTimeout(resizeTimer);
      cancelPasteFallback();
      flushRef.current = null;
      termRef.current = null;
      container.removeEventListener('paste', onPasteEvent, true);
      container.removeEventListener('contextmenu', onContextMenu);
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

  // Qualquer clique/Esc fecha o menu de contexto — registrado só enquanto ele
  // existe (nada de listener global permanente por tile).
  useEffect(() => {
    if (!contextMenu) return;
    const close = (): void => setContextMenu(null);
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('pointerdown', close);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [contextMenu]);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%', minHeight: 0 }}>
      {contextMenu && (
        <div
          // `data-no-pan` porque o canvas do App faz pan ao arrastar o fundo;
          // sem isso, clicar no menu arrastaria o mundo junto.
          data-no-pan
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            left: contextMenu.x,
            top: contextMenu.y,
            zIndex: 300,
            minWidth: CONTEXT_MENU_WIDTH,
            padding: 4,
            background: theme.surface.overlay,
            border: `1px solid ${theme.border.strong}`,
            borderRadius: theme.radius.md,
            boxShadow: theme.shadow.overlay,
            fontFamily: theme.font.ui
          }}
        >
          <ContextMenuItem
            icon={Icons.copy}
            label="Copiar"
            hint="Ctrl+Shift+C"
            disabled={!contextMenu.hasSelection}
            onClick={() => {
              copyRef.current();
              setContextMenu(null);
            }}
          />
          <ContextMenuItem
            icon={Icons.paste}
            label="Colar"
            hint="Ctrl+Shift+V"
            onClick={() => {
              pasteFromClipboardRef.current();
              setContextMenu(null);
            }}
          />
        </div>
      )}
    </div>
  );
}

function ContextMenuItem({
  icon,
  label,
  hint,
  disabled,
  onClick
}: {
  icon: LucideIcon;
  label: string;
  hint: string;
  disabled?: boolean;
  onClick: () => void;
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        padding: '5px 8px',
        border: 'none',
        borderRadius: theme.radius.sm,
        background: 'transparent',
        color: disabled ? theme.text.faint : theme.text.primary,
        cursor: disabled ? 'default' : 'pointer',
        fontSize: theme.font.size.sm + 0.5,
        fontFamily: theme.font.ui,
        textAlign: 'left'
      }}
    >
      <Icon glyph={icon} size={ICON_SIZE.sm} />
      <span style={{ flex: 1 }}>{label}</span>
      <span style={{ color: theme.text.faint, fontSize: theme.font.size.xs }}>{hint}</span>
    </button>
  );
}
