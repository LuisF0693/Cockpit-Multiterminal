import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  DEFAULT_ADAPTER_MATRIX,
  explainCandidates,
  findDispatcherSession,
  mergeAdapterMatrix,
  planAgentDispatch,
  ulid,
  type AdapterMatrix
} from '@cockpit/core';
import { DaemonClient, DEFAULT_DAEMON_PIPE } from '@cockpit/pty-host';

/**
 * CLI agent-dispatch (Stories 17.1/17.2) — despacho genérico de workers por
 * agentes. Qualquer chefe/agente (não só o AIOX Master) roda:
 *
 *   node out/main/agent-dispatch.js --agent "@dev" --task "implementar X" \
 *     [--cwd F:\Projetos\App] [--adapter claude-code] [--pipe \\.\pipe\cockpit-daemon] \
 *     [--no-link] [--link-from <sessionId>] [--profile <adapters-profile.json>]
 *
 * QUEM decide o modelo é o CHEFE que despacha (decisão do fundador,
 * 2026-07-17): ele avalia a demanda, explica por que o modelo serve e passa
 * `--adapter` explícito — perguntando ao usuário quando ambíguo. A matriz de
 * capacidades editável (adapters-profile.json na raiz do repo — Story 17.2)
 * embasa essa decisão: `--recommend` exibe candidatos COM justificativa sem
 * despachar; sem `--adapter`, a política decide sozinha usando as
 * preferências da matriz (com fallback se o adapter falhar ao iniciar — AC3).
 *
 * Vínculo automático (17.2): quando o despacho parte de um terminal do
 * Cockpit, a CLI sobe a cadeia de PIDs até casar com uma sessão viva do
 * daemon e envia `dispatchedBy` — a adoção cria o vínculo worker→chefe em
 * modo auto (o término do worker instrui o chefe). `--no-link` desliga;
 * `--link-from` força a origem. Falha de detecção NUNCA bloqueia o despacho.
 * O Cockpit adota a sessão em até ~4s preservando o nome do agente (AC4).
 * Exit codes: 0 despachado/recomendado; 1 sem candidato viável; 2 daemon inacessível.
 */

const COLS = 120;
const ROWS = 30;
/** Raiz do repo a partir de out/main (out → desktop → apps → raiz). */
const REPO_ROOT_HOPS = ['..', '..', '..', '..'];

function argValue(argv: string[], name: string): string | undefined {
  const idx = argv.indexOf(name);
  return idx >= 0 ? argv[idx + 1] : undefined;
}

function usage(): void {
  console.error(
    'uso: agent-dispatch --agent "<nome>" --task "<tarefa>" [--cwd <dir>] [--adapter <id>] ' +
      '[--model <nome>] [--recommend] [--no-link] [--link-from <sessionId>] [--profile <json>] [--pipe <named-pipe>]'
  );
}

/**
 * `--model` (Story 17.3): o worker JÁ NASCE com o modelo escolhido pelo
 * chefe. A grafia é a da CLI alvo (claude: haiku/sonnet/opus; codex/gemini/
 * grok: nome completo do modelo). Ollama usa `run <modelo>`; as demais CLIs
 * aceitam `--model <nome>`.
 */
function modelArgs(adapterId: string, model: string): string[] {
  return adapterId === 'ollama' ? ['run', model] : ['--model', model];
}

/**
 * Matriz de capacidades: defaults do core + override editável. Sem arquivo
 * (ou JSON inválido) cai nos defaults — nunca bloqueia o despacho.
 */
function loadAdapterMatrix(argv: string[]): { matrix: AdapterMatrix; source: string } {
  const scriptDir = path.dirname(process.argv[1] ?? '.');
  const file = argValue(argv, '--profile') ?? path.resolve(scriptDir, ...REPO_ROOT_HOPS, 'adapters-profile.json');
  try {
    const override = JSON.parse(readFileSync(file, 'utf8')) as Partial<AdapterMatrix>;
    return { matrix: mergeAdapterMatrix(DEFAULT_ADAPTER_MATRIX, override), source: file };
  } catch {
    return { matrix: DEFAULT_ADAPTER_MATRIX, source: '(defaults embutidos — adapters-profile.json ausente/ilegível)' };
  }
}

/**
 * Cadeia de PIDs do processo da CLI até a raiz (Windows: uma chamada CIM).
 * O matching cadeia→sessão é puro (findDispatcherSession, core).
 */
async function processPidChain(): Promise<number[]> {
  if (process.platform !== 'win32') return [process.pid];
  const json = await new Promise<string>((resolve, reject) => {
    execFile(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        'Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId | ConvertTo-Json -Compress'
      ],
      { maxBuffer: 16 * 1024 * 1024, windowsHide: true },
      (err, stdout) => (err !== null ? reject(err) : resolve(stdout))
    );
  });
  const rows = JSON.parse(json) as Array<{ ProcessId: number; ParentProcessId: number }>;
  const parentOf = new Map(rows.map((r) => [r.ProcessId, r.ParentProcessId]));
  const chain: number[] = [];
  let pid: number | undefined = process.pid;
  // limite defensivo: cadeias reais têm <20 níveis; ciclo de pid reciclado para aqui
  while (pid !== undefined && pid > 0 && !chain.includes(pid) && chain.length < 64) {
    chain.push(pid);
    pid = parentOf.get(pid);
  }
  return chain;
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
  const model = argValue(argv, '--model');
  const pipe = argValue(argv, '--pipe') ?? DEFAULT_DAEMON_PIPE;
  const { matrix, source: matrixSource } = loadAdapterMatrix(argv);

  // Modelo é escolha por CLI — sem adapter explícito a política poderia cair
  // numa CLI que não conhece esse nome de modelo. Quem escolhe modelo,
  // escolhe a CLI (protocolo do chefe, AC7 da 17.1).
  if (model !== undefined && explicitAdapter === undefined && !argv.includes('--recommend')) {
    console.error('[agent-dispatch] --model exige --adapter explícito (a grafia do modelo é específica de cada CLI)');
    return 1;
  }

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
      availableAdapters: available,
      ...(matrix.preferences !== undefined ? { preferences: matrix.preferences } : {})
    });
    if (plan.candidates.length === 0) {
      console.error(
        explicitAdapter !== undefined
          ? `[agent-dispatch] adapter "${explicitAdapter}" não existe no daemon (disponíveis: ${available.join(', ')})`
          : '[agent-dispatch] nenhum adapter de IA disponível no daemon'
      );
      return 1;
    }

    // --recommend: só CONSULTA a política + matriz — o chefe decide (ou
    // pergunta ao usuário) e despacha depois com --adapter explícito.
    if (argv.includes('--recommend')) {
      console.log(
        JSON.stringify(
          {
            category: plan.category,
            candidates: explainCandidates(plan.candidates, matrix),
            available,
            matrixSource
          },
          null,
          2
        )
      );
      return 0;
    }

    // Vínculo worker→chefe (17.2): detecção automática pela cadeia de PIDs,
    // a menos que o chefe desligue (--no-link) ou force a origem (--link-from).
    let dispatchedBy = argValue(argv, '--link-from');
    if (dispatchedBy === undefined && !argv.includes('--no-link')) {
      try {
        const [chain, live] = await Promise.all([processPidChain(), client.listSessions()]);
        dispatchedBy = findDispatcherSession(chain, live) ?? undefined;
        if (dispatchedBy === undefined) {
          console.error('[agent-dispatch] sem vínculo: nenhum terminal do Cockpit na cadeia de processos (siga sem ele)');
        }
      } catch (err) {
        console.error('[agent-dispatch] detecção do chefe falhou — despacho segue sem vínculo:', err instanceof Error ? err.message : err);
      }
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
          initialInstruction: plan.initialInstruction,
          ...(model !== undefined ? { args: modelArgs(adapterId, model) } : {}),
          ...(dispatchedBy !== undefined ? { dispatchedBy } : {})
        });
        console.log(
          `[agent-dispatch] worker despachado: agente=${plan.label} adapter=${adapterId} ` +
            (model !== undefined ? `modelo=${model} ` : '') +
            `sessão=${id} pid=${pid} cwd=${cwd}` +
            (plan.category !== null ? ` categoria=${plan.category}` : ' (adapter explícito)') +
            (dispatchedBy !== undefined ? ` vínculo→chefe=${dispatchedBy}` : ' sem-vínculo')
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
