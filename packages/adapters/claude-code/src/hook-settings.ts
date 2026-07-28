import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Ponte de hooks nativos (Story 2.2): gera um settings JSON temporário
 * carregado via `claude --settings <arquivo>` — injeta hooks de status SEM
 * tocar nos settings do usuário/projeto. Cada hook faz append de uma linha
 * de status num arquivo que o adapter observa. NFR6: o settings contém
 * APENAS hooks; nenhuma credencial passa por aqui.
 *
 * `--settings` FUNCIONA e os hooks disparam — medido com claude-code 2.1.220,
 * sessão interativa sob PTY: SessionStart, UserPromptSubmit e Stop, nessa
 * ordem, um por turno. O que não funcionava era o COMANDO do hook (ver
 * `buildHookCommand`).
 */

/**
 * Mapeamento evento do Claude Code → AgentStatus (Dev Notes da story).
 *
 * `SessionStart` era `idle`, o MESMO status do `Stop` — e essa colisão na
 * ORIGEM era o defeito: "o CLI acabou de nascer" e "o agente devolveu o turno"
 * viravam o mesmo sinal, então o consumidor (`IDLE_AGENT_STATUSES`) só
 * conseguia tratar os dois juntos. Excluir `idle` matava a entrega em tile
 * vivo; incluir arriscaria escrever durante o boot. Com `starting` os dois
 * eventos passam a ser distinguíveis e cada camada decide o que quer.
 *
 * `SessionStart` ficou em `starting` (não entregável) por PRECAUÇÃO — e a
 * precaução se CONFIRMOU na medição: escrevendo `${texto}\r` no PTY logo
 * depois do spawn, o texto entra no composer mas o Enter se PERDE, o turno
 * nunca é submetido e o arquivo de status para em `["starting"]`. Ou seja, o
 * hook roda ANTES de o CLI aceitar input. Não promova para `idle`.
 */
export const HOOK_STATUS_MAP = {
  SessionStart: 'starting',
  UserPromptSubmit: 'working',
  Stop: 'idle',
  Notification: 'waiting-input'
} as const;

export interface SessionHookFiles {
  dir: string;
  settingsPath: string;
  statusPath: string;
  hookScriptPath: string;
}

/**
 * Comando do hook: `node <script> <status>`, NÃO `cmd /c echo status>> path`.
 *
 * Este era o Defeito 2 inteiro, e a causa é ambiental, não de schema. O Claude
 * Code executa o `command` do hook através de um SHELL, e no Windows esse
 * shell é o **Git Bash** — lido de dentro de um hook real:
 * `SHELL=C:\Program Files\Git\bin\bash.exe`, `MSYSTEM=MINGW64`. O MSYS
 * reescreve argumentos que PARECEM caminho POSIX antes de repassá-los a um
 * .exe nativo, e `/c` parece: vira `C:/`. Medido no mesmo shell:
 *
 *   $ cmd /c echo hello                     → "Microsoft Windows [Version ...]"
 *                                             (cmd.exe subiu INTERATIVO)
 *   $ MSYS_NO_PATHCONV=1 cmd /c echo hello  → "hello"
 *
 * Ou seja, `cmd /c echo idle>> "..."` chegava ao cmd.exe como `cmd C:/ echo
 * idle` — sem `/c`. O cmd.exe subia interativo, despejava o próprio banner no
 * arquivo de status (destino do `>>`) e ainda ecoava o payload JSON do evento,
 * que o Claude Code entrega no STDIN do hook. Conteúdo real colhido:
 *
 *   cmd /c echo <st>>> f | "Microsoft Windows [Version 10.0.26200.8894]",
 *                        | "(c) Microsoft Corporation...", o prompt do cmd e
 *                        | {"session_id":...,"hook_event_name":"SessionStart"}
 *                        | — NENHUMA linha parseável como AgentStatus
 *   node "<abs>.cjs" <st>| exatamente "<st>\n"
 *
 * Consequência em produção: `AgentStatusSchema.safeParse` rejeitava toda
 * linha, `sawAnyStatus` ficava false, o adapter degradava para process-only
 * depois de 30s e o tile de Claude Code TRAVAVA em `working` para sempre —
 * exatamente o sintoma que o fundador via na tela. É o MESMO defeito que
 * derrubou o `notify` do Codex, pela mesma razão de fundo (comando de shell
 * montado como STRING), e a correção é a mesma: um `.cjs` invocado por `node`,
 * com o status como argumento simples (sem `/`, sem `>`, sem aspas internas) e
 * o path do arquivo EMBUTIDO no script.
 *
 * O script não imprime NADA em stdout de propósito: o stdout de hooks como
 * `UserPromptSubmit` e `SessionStart` é injetado no contexto do agente.
 */
export function buildHookCommand(hookScriptPath: string, status: string): string {
  return `node "${hookScriptPath}" ${status}`;
}

/**
 * Fonte do script de hook. O path do status vai EMBUTIDO via `JSON.stringify`
 * (que já escapa as barras invertidas do Windows e sobrevive a espaço no
 * caminho — o repo do fundador vive em `F:\Projetos\Projetos\Meu Cockpit`);
 * o status vem por argv, que o shell entrega intacto. `.cjs` porque o dir
 * temporário não tem package.json — a extensão é o que garante `require` sem
 * depender do modo de módulo do ambiente.
 */
export function buildHookScript(statusPath: string): string {
  return `require('node:fs').appendFileSync(${JSON.stringify(statusPath)}, process.argv[2] + '\\n');\n`;
}

export function buildHookSettings(hookScriptPath: string): Record<string, unknown> {
  const hooks: Record<string, unknown> = {};
  for (const [event, status] of Object.entries(HOOK_STATUS_MAP)) {
    hooks[event] = [
      {
        hooks: [{ type: 'command', command: buildHookCommand(hookScriptPath, status) }]
      }
    ];
  }
  return { hooks };
}

/** Cria dir temporário por sessão com settings + script de hook + status. */
export function writeSessionHookFiles(sessionTag: string): SessionHookFiles {
  const dir = mkdtempSync(join(tmpdir(), `cockpit-claude-${sessionTag}-`));
  const statusPath = join(dir, 'session.status');
  const settingsPath = join(dir, 'hook-settings.json');
  // O script mora AO LADO do status, no mesmo dir temporário da sessão: o
  // `cleanup()` do adapter já apaga o dir inteiro (rmSync recursive), então
  // não há arquivo órfão a limpar separadamente.
  const hookScriptPath = join(dir, 'status-hook.cjs');
  writeFileSync(statusPath, '');
  writeFileSync(hookScriptPath, buildHookScript(statusPath));
  writeFileSync(settingsPath, JSON.stringify(buildHookSettings(hookScriptPath), null, 2));
  return { dir, settingsPath, statusPath, hookScriptPath };
}
