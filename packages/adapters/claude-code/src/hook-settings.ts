import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Ponte de hooks nativos (Story 2.2): gera um settings JSON temporário
 * carregado via `claude --settings <arquivo>` — injeta hooks de status SEM
 * tocar nos settings do usuário/projeto. Cada hook faz append de uma linha
 * de status num arquivo que o adapter observa. NFR6: o settings contém
 * APENAS hooks; nenhuma credencial passa por aqui.
 */

/** Mapeamento evento do Claude Code → AgentStatus (Dev Notes da story). */
export const HOOK_STATUS_MAP = {
  SessionStart: 'idle',
  UserPromptSubmit: 'working',
  Stop: 'idle',
  Notification: 'waiting-input'
} as const;

export interface SessionHookFiles {
  dir: string;
  settingsPath: string;
  statusPath: string;
}

/** Comando de hook: append da linha de status (cmd nativo, zero deps). */
function appendCommand(statusPath: string, status: string): string {
  return `cmd /c echo ${status}>> "${statusPath}"`;
}

export function buildHookSettings(statusPath: string): Record<string, unknown> {
  const hooks: Record<string, unknown> = {};
  for (const [event, status] of Object.entries(HOOK_STATUS_MAP)) {
    hooks[event] = [
      {
        hooks: [{ type: 'command', command: appendCommand(statusPath, status) }]
      }
    ];
  }
  return { hooks };
}

/** Cria dir temporário por sessão com settings + arquivo de status vazio. */
export function writeSessionHookFiles(sessionTag: string): SessionHookFiles {
  const dir = mkdtempSync(join(tmpdir(), `cockpit-claude-${sessionTag}-`));
  const statusPath = join(dir, 'session.status');
  const settingsPath = join(dir, 'hook-settings.json');
  writeFileSync(statusPath, '');
  writeFileSync(settingsPath, JSON.stringify(buildHookSettings(statusPath), null, 2));
  return { dir, settingsPath, statusPath };
}
