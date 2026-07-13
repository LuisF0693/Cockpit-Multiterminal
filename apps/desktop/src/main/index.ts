import { app, BrowserWindow, ipcMain, session, shell } from 'electron';
import { join } from 'node:path';
import { AppInfoSchema, IpcChannels, type AppInfo } from '@cockpit/shared';
import { PtyHostManager } from './pty-host-manager';

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

  ptyHostManager = new PtyHostManager();
  ptyHostManager.start();

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

let ptyHostManager: PtyHostManager | null = null;
let quitting = false;

// Shutdown ordenado: PTYs dispostos (AC4) antes do app morrer.
app.on('before-quit', (event) => {
  if (quitting || !ptyHostManager) return;
  event.preventDefault();
  quitting = true;
  void ptyHostManager.shutdown().finally(() => app.quit());
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
