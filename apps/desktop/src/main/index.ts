import { app, BrowserWindow, ipcMain, session, shell } from 'electron';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { SqliteStateStore } from '@cockpit/core';
import { AppInfoSchema, IpcChannels, type AppInfo } from '@cockpit/shared';
import { PtyHostManager } from './pty-host-manager';
import { registerSessionIpc, type SessionIpcHandle } from './session-ipc';

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

app.whenReady().then(() => {
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

  ptyHostManager = new PtyHostManager();
  ptyHostManager.start();
  ptyHostManager.configure({
    scrollbackDir: join(stateDir, 'scrollback'),
    maxFileBytes: 1024 * 1024,
    restoreTailBytes: 256 * 1024
  });

  sessionIpc = registerSessionIpc(ptyHostManager, stateStore, (batch) =>
    stateStore.applyBatch(batch)
  );

  const { cleanShutdown } = sessionIpc.persistence.markBootStart();
  if (!cleanShutdown) {
    console.warn('[state] boot após shutdown NÃO limpo (Recovery Screen completa entra no E5)');
  }

  // Restore (AC2) ANTES da janela: session.list do renderer já traz tudo.
  void sessionIpc
    .restore()
    .then(({ restored, archived }) => {
      if (restored > 0) console.log(`[state] restauradas ${restored} sessões (${archived} arquivadas)`);
    })
    .finally(() => createWindow());

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

let ptyHostManager: PtyHostManager | null = null;
let sessionIpc: SessionIpcHandle | null = null;
let quitting = false;

// Shutdown ordenado: PTYs dispostos (AC4) + flush da write queue +
// clean_shutdown=1 (FR12) antes do app morrer.
app.on('before-quit', (event) => {
  if (quitting || !ptyHostManager) return;
  event.preventDefault();
  quitting = true;
  const finalize = (): void => {
    try {
      sessionIpc?.persistence.markCleanShutdown();
      sessionIpc?.queue.dispose();
    } catch (err) {
      console.error('[state] falha no clean shutdown:', err);
    }
    app.quit();
  };
  void ptyHostManager.shutdown().finally(finalize);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
