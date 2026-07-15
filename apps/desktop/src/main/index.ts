import { app, BrowserWindow, ipcMain, session, shell } from 'electron';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { SqliteStateStore } from '@cockpit/core';
import { AppInfoSchema, IpcChannels, type AppInfo } from '@cockpit/shared';
import { PtyHostManager } from './pty-host-manager';
import { DaemonManager } from './daemon-manager';
import { registerSessionIpc, type PtyBackend, type SessionIpcHandle } from './session-ipc';
import { registerBrowserIpc } from './browser-ipc';
import type { BrowserPreviewManager } from './browser-preview-manager';
import { registerLearningIpc } from './learning-ipc';

/**
 * Main process — janela, ciclo de vida e IPC de controle.
 * Hardening obrigatório (coding standards / Story 1.1):
 * contextIsolation + sandbox + nodeIntegration:false + CSP + navegação bloqueada.
 */

function buildAppInfo(): AppInfo {
  // Zod na borda: o próprio Main valida o que expõe (contrato > implementação).
  return AppInfoSchema.parse({
    name: 'Meu Cockpit',
    version: app.getVersion(),
    platform: process.platform
  });
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1366,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    backgroundColor: '#0B0F14',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  win.once('ready-to-show', () => win.show());

  // Navegação externa: nunca dentro do app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event) => event.preventDefault());

  if (process.env['ELECTRON_RENDERER_URL']) {
    void win.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(async () => {
  // CSP estrita para todo conteúdo carregado.
  // Em dev, o react-refresh do @vitejs/plugin-react exige um script inline
  // (preamble) — sem 'unsafe-inline' o renderer não sobe. Produção fica estrita.
  const isDev = Boolean(process.env['ELECTRON_RENDERER_URL']);
  const scriptSrc = isDev ? "script-src 'self' 'unsafe-inline'" : "script-src 'self'";
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          `default-src 'self'; ${scriptSrc}; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' ws:`
        ]
      }
    });
  });

  ipcMain.handle(IpcChannels.appInfo, (): AppInfo => buildAppInfo());

  // State store (Story 1.4): SQLite WAL em userData/state (decisão crítica 2).
  const stateDir = join(app.getPath('userData'), 'state');
  mkdirSync(join(stateDir, 'scrollback'), { recursive: true });
  const stateStore = new SqliteStateStore(new Database(join(stateDir, 'cockpit.db')));
  stateStore.init();

  // Backend de PTY (Story 6.3): daemon por padrão (sessões sobrevivem ao
  // app — decisão crítica 5); COCKPIT_NO_DAEMON=1 = escape hatch p/ o
  // utilityProcess clássico; falha no daemon também cai no clássico.
  const scrollback = {
    scrollbackDir: join(stateDir, 'scrollback'),
    maxFileBytes: 1024 * 1024,
    restoreTailBytes: 256 * 1024
  };
  let backend: PtyBackend;
  if (process.env['COCKPIT_NO_DAEMON'] !== '1') {
    try {
      const daemon = new DaemonManager();
      // Badge da UI (6.4): estado do vínculo empurrado a todas as janelas.
      daemon.onStateChange((state) => {
        for (const win of BrowserWindow.getAllWindows()) {
          win.webContents.send(IpcChannels.daemonStatus, { state });
        }
      });
      await daemon.start();
      daemon.configure(scrollback);
      daemonManager = daemon;
      backend = daemon;
    } catch (err) {
      console.error('[daemon] indisponível — fallback p/ utilityProcess:', err);
      backend = startUtilityHost(scrollback);
    }
  } else {
    backend = startUtilityHost(scrollback);
  }

  // markBootStart() roda DENTRO de registerSessionIpc (precisa resolver
  // crashDetected antes do primeiro IPC) — não chamar de novo aqui.
  sessionIpc = registerSessionIpc(backend, stateStore, (batch) => stateStore.applyBatch(batch), {
    scrollbackDir: scrollback.scrollbackDir
  });

  // Preview de browser via Playwright (Épico 10) — arquivo/instância à
  // parte; reusa o MESMO stateStore/queue/persistence da sessão principal.
  const browserIpcHandle = registerBrowserIpc(stateStore, sessionIpc.queue, sessionIpc.persistence);
  browserPreview = browserIpcHandle.manager;

  // Learning logs globais (Épico 11) — mesmo stateStore/queue/persistence.
  registerLearningIpc(stateStore, sessionIpc.queue, sessionIpc.persistence);

  if (sessionIpc.crashDetected) {
    // Story 4.3: boot NÃO relança/adota sozinho — a janela sobe imediatamente
    // e o renderer resolve via Recovery Screen (recovery.summary/resolve).
    console.warn('[state] boot após shutdown NÃO limpo — aguardando resolução da Recovery Screen');
    createWindow();
  } else {
    // Restore (AC2 da 1.4) ANTES da janela: session.list do renderer já traz
    // tudo. Time-to-resume medido e logado (AC1/AC3 da 4.2, orçamento NFR4 <10s).
    const RESUME_BUDGET_MS = 10_000;
    void sessionIpc
      .restore()
      .then(({ restored, archived, adopted, elapsedMs }) => {
        console.log(
          `[boot] retomada em ${elapsedMs}ms — adotadas=${adopted} relançadas=${restored} arquivadas=${archived}`
        );
        if (elapsedMs > RESUME_BUDGET_MS) {
          console.warn(`[boot] retomada excedeu o orçamento NFR4 (${RESUME_BUDGET_MS}ms): ${elapsedMs}ms`);
        }
      })
      .finally(() => createWindow());
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

let ptyHostManager: PtyHostManager | null = null;
let daemonManager: DaemonManager | null = null;
let sessionIpc: SessionIpcHandle | null = null;
let browserPreview: BrowserPreviewManager | null = null;
let quitting = false;

function startUtilityHost(scrollback: {
  scrollbackDir: string;
  maxFileBytes: number;
  restoreTailBytes: number;
}): PtyHostManager {
  ptyHostManager = new PtyHostManager();
  ptyHostManager.start();
  ptyHostManager.configure(scrollback);
  return ptyHostManager;
}

// Shutdown ordenado + clean_shutdown=1 (FR12) antes do app morrer.
// Modo daemon (6.3): apenas DESCONECTA — sessões sobrevivem e serão
// adotadas no próximo boot. Modo utilityProcess: dispõe PTYs como antes.
app.on('before-quit', (event) => {
  if (quitting || (!ptyHostManager && !daemonManager)) return;
  event.preventDefault();
  quitting = true;
  const finalize = (): void => {
    // Playwright/Chromium (Épico 10) — encerramento gracioso, 0 processos
    // órfãos, mesmo cuidado já aplicado a PTY/daemon nesta função.
    void (browserPreview?.dispose() ?? Promise.resolve()).finally(() => {
      try {
        sessionIpc?.persistence.markCleanShutdown();
        sessionIpc?.queue.dispose();
      } catch (err) {
        console.error('[state] falha no clean shutdown:', err);
      }
      app.quit();
    });
  };
  if (daemonManager) {
    daemonManager.disconnect();
    finalize();
    return;
  }
  void ptyHostManager?.shutdown().finally(finalize);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
