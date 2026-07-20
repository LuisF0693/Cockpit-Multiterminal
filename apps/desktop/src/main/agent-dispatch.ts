import { planAgentDispatch, ulid } from '@cockpit/core';
import { DaemonClient, DEFAULT_DAEMON_PIPE } from '@cockpit/pty-host';

/**
 * CLI agent-dispatch (Story 17.1) — despacho genérico de workers por
 * agentes. Qualquer chefe/agente (não só o AIOX Master) roda:
 *
 *   node out/main/agent-dispatch.js --agent "@dev" --task "implementar X" \
 *     [--cwd F:\Projetos\App] [--adapter claude-code] [--pipe \\.\pipe\cockpit-daemon]
 *
 * QUEM decide o modelo é o CHEFE que despacha (decisão do fundador,
 * 2026-07-17): ele avalia a demanda, explica por que o modelo serve e passa
 * `--adapter` explícito — perguntando ao usuário quando ambíguo. A política
 * pura (planAgentDispatch) é RECOMENDAÇÃO/fallback: `--recommend` a exibe
 * sem despachar; sem `--adapter`, ela decide sozinha (com fallback se o
 * adapter falhar ao iniciar — AC3). O Cockpit adota a sessão em até ~4s
 * preservando o nome do agente (AC4).
 * Exit codes: 0 despachado/recomendado; 1 sem candidato viável; 2 daemon inacessível.
 */

const COLS = 120;
const ROWS = 30;

function argValue(argv: string[], name: string): string | undefined {
  const idx = argv.indexOf(name);
  return idx >= 0 ? argv[idx + 1] : undefined;
}

function usage(): void {
  console.error(
    'uso: agent-dispatch --agent "<nome>" --task "<tarefa>" [--cwd <dir>] [--adapter <id>] [--recommend] [--pipe <named-pipe>]'
  );
}

export async function dispatchAgent(argv: string[]): Promise<number> {
  const agent = argValue(argv, '--agent');
  const task = argValue(argv, '--task');
  if (!agent || !task) {
    usage();
    return 1;
  }
  const cwd = argValue(argv, '--cwd') ?? process.cwd();
  const explicitAdapter = argValue(argv, '--adapter');
  const pipe = argValue(argv, '--pipe') ?? DEFAULT_DAEMON_PIPE;

  const client = new DaemonClient();
  try {
    await client.connect(pipe);
  } catch (err) {
    console.error(`[agent-dispatch] daemon inacessível em ${pipe}:`, err instanceof Error ? err.message : err);
    return 2;
  }

  try {
    const available = (await client.listAdapters()).map((a) => a.id);
    const plan = planAgentDispatch({
      agent,
      task,
      ...(explicitAdapter !== undefined ? { explicitAdapter } : {}),
      availableAdapters: available
    });
    if (plan.candidates.length === 0) {
      console.error(
        explicitAdapter !== undefined
          ? `[agent-dispatch] adapter "${explicitAdapter}" não existe no daemon (disponíveis: ${available.join(', ')})`
          : '[agent-dispatch] nenhum adapter de IA disponível no daemon'
      );
      return 1;
    }

    // --recommend: só CONSULTA a política — o chefe decide (ou pergunta ao
    // usuário) e despacha depois com --adapter explícito, justificando.
    if (argv.includes('--recommend')) {
      console.log(JSON.stringify({ category: plan.category, candidates: plan.candidates, available }, null, 2));
      return 0;
    }

    for (const adapterId of plan.candidates) {
      try {
        const { id, pid } = await client.createSession({
          tag: ulid(),
          cols: COLS,
          rows: ROWS,
          cwd,
          adapterId,
          label: plan.label,
          initialInstruction: plan.initialInstruction
        });
        console.log(
          `[agent-dispatch] worker despachado: agente=${plan.label} adapter=${adapterId} ` +
            `sessão=${id} pid=${pid} cwd=${cwd}` +
            (plan.category !== null ? ` categoria=${plan.category}` : ' (adapter explícito)')
        );
        console.log('[agent-dispatch] o Cockpit adota a sessão em até ~4s com o nome do agente.');
        return 0;
      } catch (err) {
        console.error(
          `[agent-dispatch] adapter "${adapterId}" falhou ao iniciar — tentando próximo:`,
          err instanceof Error ? err.message : err
        );
      }
    }
    console.error(`[agent-dispatch] todos os candidatos falharam: ${plan.candidates.join(', ')}`);
    return 1;
  } finally {
    // Só a CONEXÃO morre — a sessão despachada segue viva no daemon.
    client.disconnect();
  }
}

/* istanbul ignore next -- caminho de processo real; testes usam a função */
if (process.argv[1]?.endsWith('agent-dispatch.js')) {
  void dispatchAgent(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (err: unknown) => {
      console.error('[agent-dispatch] falha inesperada:', err);
      process.exit(2);
    }
  );
}
