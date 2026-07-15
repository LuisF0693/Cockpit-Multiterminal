import { BrowserWindow, ipcMain } from 'electron';
import { LearningManager, type PersistenceManager, type StateStore, type WriteQueue } from '@cockpit/core';
import {
  IpcChannels,
  LearningCreateRequestSchema,
  LearningUpdateStatusRequestSchema,
  type LearningEvent
} from '@cockpit/shared';

/**
 * Learning logs globais (Épico 11, FR30-33) — arquivo dedicado (não inflar
 * session-ipc.ts) registrado à parte no boot, mesmo padrão do browser-ipc.ts.
 */
export function registerLearningIpc(store: StateStore, queue: WriteQueue, persistence: PersistenceManager): void {
  const manager = new LearningManager(store, queue);
  manager.load();

  manager.onEvent((event: LearningEvent) => {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send(IpcChannels.learningEvent, event);
    }
  });

  // Registro nasce com o projeto ATIVO como origem (Story 11.1, AC1) — mesmo
  // padrão de session.create/task.create (8.2/8.3), mas aqui é só
  // rastreabilidade: projectId nunca vira escopo de leitura (Story 11.3, AC2).
  ipcMain.handle(IpcChannels.learningCreate, (_event, raw: unknown) => {
    const req = LearningCreateRequestSchema.parse(raw);
    const { activeId } = persistence.projects();
    return manager.create({ text: req.text, category: req.category, projectId: activeId });
  });

  ipcMain.handle(IpcChannels.learningUpdateStatus, (_event, raw: unknown) => {
    const req = LearningUpdateStatusRequestSchema.parse(raw);
    return manager.updateStatus(req.id, req.status);
  });

  ipcMain.handle(IpcChannels.learningList, () => manager.list());
}
