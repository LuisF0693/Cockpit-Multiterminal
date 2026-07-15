import { BrowserWindow, ipcMain } from 'electron';
import { BrowserTileManager, type PersistenceManager, type StateStore, type WriteQueue } from '@cockpit/core';
import {
  BrowserClickRequestSchema,
  BrowserNavigateRequestSchema,
  BrowserReadTextRequestSchema,
  BrowserTileCreateRequestSchema,
  BrowserTileIdRequestSchema,
  IpcChannels,
  type BrowserTileEvent
} from '@cockpit/shared';
import { BrowserPreviewManager } from './browser-preview-manager';

/**
 * Preview de browser via Playwright (Épico 10, FR28/FR29) — arquivo
 * dedicado (não inflar session-ipc.ts) registrado à parte no boot.
 */
export function registerBrowserIpc(
  store: StateStore,
  queue: WriteQueue,
  persistence: PersistenceManager
): { manager: BrowserPreviewManager; dispose: () => Promise<void> } {
  const tileManager = new BrowserTileManager(store, queue);
  tileManager.load();
  const preview = new BrowserPreviewManager();

  tileManager.onEvent((event: BrowserTileEvent) => {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send(IpcChannels.browserTileEvent, event);
    }
  });

  ipcMain.handle(IpcChannels.browserCreate, async (_event, raw: unknown) => {
    const req = BrowserTileCreateRequestSchema.parse(raw);
    const { activeId } = persistence.projects();
    const tile = tileManager.create({ url: req.url, projectId: activeId });
    await preview.ensurePage(tile.id, req.url);
    return tile;
  });

  ipcMain.handle(IpcChannels.browserRemove, async (_event, raw: unknown) => {
    const req = BrowserTileIdRequestSchema.parse(raw);
    await preview.closePage(req.id);
    tileManager.remove(req.id);
  });

  ipcMain.handle(IpcChannels.browserList, () => tileManager.list());

  ipcMain.handle(IpcChannels.browserNavigate, async (_event, raw: unknown) => {
    const req = BrowserNavigateRequestSchema.parse(raw);
    await preview.ensurePage(req.id, req.url);
    await preview.navigate(req.id, req.url);
    const updated = tileManager.updateUrl(req.id, req.url);
    if (!updated) throw new Error('tile de browser não encontrado');
    return updated;
  });

  const syncUrlAfterNav = (id: string): void => {
    const url = preview.currentUrl(id);
    if (url) tileManager.updateUrl(id, url);
  };

  ipcMain.handle(IpcChannels.browserBack, async (_event, raw: unknown) => {
    const req = BrowserTileIdRequestSchema.parse(raw);
    await preview.back(req.id);
    syncUrlAfterNav(req.id);
  });
  ipcMain.handle(IpcChannels.browserForward, async (_event, raw: unknown) => {
    const req = BrowserTileIdRequestSchema.parse(raw);
    await preview.forward(req.id);
    syncUrlAfterNav(req.id);
  });
  ipcMain.handle(IpcChannels.browserReload, async (_event, raw: unknown) => {
    const req = BrowserTileIdRequestSchema.parse(raw);
    await preview.reload(req.id);
    syncUrlAfterNav(req.id);
  });

  // Screenshot cria a página sob demanda (AC3 — restore pós-boot só tem a
  // URL persistida, nenhuma página Playwright viva ainda).
  ipcMain.handle(IpcChannels.browserScreenshot, async (_event, raw: unknown) => {
    const req = BrowserTileIdRequestSchema.parse(raw);
    const tile = tileManager.get(req.id);
    if (!tile) return null;
    await preview.ensurePage(req.id, tile.url);
    return preview.screenshot(req.id);
  });

  // Automação (Story 10.2, AC1-AC3) — origem 'human' aqui: esta story cobre
  // o caminho manual (painel), a automação disparada pelo AGENTE (origem
  // 'system') é uma extensão natural futura via o mesmo par ação/trilha.
  ipcMain.handle(IpcChannels.browserClick, async (_event, raw: unknown) => {
    const req = BrowserClickRequestSchema.parse(raw);
    await preview.click(req.id, req.selector);
    persistence.recordBrowserAction(req.id, { action: 'click', selector: req.selector }, 'human');
  });

  ipcMain.handle(IpcChannels.browserReadText, async (_event, raw: unknown) => {
    const req = BrowserReadTextRequestSchema.parse(raw);
    const text = await preview.readText(req.id, req.selector);
    persistence.recordBrowserAction(
      req.id,
      { action: 'readText', ...(req.selector !== undefined ? { selector: req.selector } : {}) },
      'human'
    );
    return text;
  });

  return { manager: preview, dispose: () => preview.dispose() };
}
