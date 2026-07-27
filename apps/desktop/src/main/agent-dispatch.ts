import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import {
  DEFAULT_ADAPTER_MATRIX,
  explainCandidates,
  findDispatcherSession,
  findIdleCandidate,
  mergeAdapterMatrix,
  planAgentDispatch,
  planTaskDelivery,
  resolveDeliveryTarget,
  resolveDispatchCwd,
  ulid,
  type AdapterMatrix
} from '@cockpit/core';
import {
  DaemonClient,
  DEFAULT_DAEMON_PIPE,
  type AdapterOutcomeCount,
  type DaemonSessionInfo,
  type TaskDeliveryAck
} from '@cockpit/pty-host';

/**
 * CLI agent-dispatch (Stories 17.1/17.2) — despacho genérico de workers por
 * agentes. Qualquer chefe/agente (não só o AIOX Master) roda:
 *
 *   node out/main/agent-dispatch.js --agent "@dev" --task "implementar X" \
 *     [--cwd F:\Projetos\App] [--adapter claude-code] [--pipe \\.\pipe\cockpit-daemon] \
 *     [--no-link] [--link-from <sessionId>] [--profile <adapters-profile.json>]
 *
 * P0 — env vars injetadas pelo daemon em todo PTY (eliminam args manuais):
 *   COCKPIT_DAEMON_PIPE  → usada como fallback de --pipe (sem precisar passar --pipe)
 *   COCKPIT_SESSION_ID   → usada como fallback de --link-from (sem precisar de PID chain)
 *   COCKPIT_DISPATCH_CMD → caminho absoluto deste arquivo (agentes localizam sem hardcode)
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
 *
 * Checagem de sessão ociosa (18.1): antes de despachar, a CLI reusa a MESMA
 * consulta `listSessions` (feita pro vínculo acima) pra procurar um worker
 * ocioso (`waiting-input`/`done`) do mesmo adapter do primeiro candidato —
 * se achar, avisa no stderr (AC3) mas NUNCA bloqueia (AC5). `--model` não
 * entra no filtro: não há como ler o modelo de uma sessão já em execução
 * sem introspecção nova (AC2 — limitação documentada, sem workaround hoje).
 *
 * ENTREGA EM TILE JÁ ABERTO (Onda 1, item 1 do fundador): até aqui a CLI só
 * sabia NASCER worker (`createSession`) — o chefe que quisesse falar com um
 * tile vivo tinha que duplicar o agente. Agora:
 *
 *   --list-sessions                       lista os tiles vivos em JSON (alvo descobrível)
 *   --to-session <id>  --task "<tarefa>"  entrega direto naquele tile
 *   --to-agent "<nome>" --task "<tarefa>" idem, resolvendo o tile pelo nome
 *
 * Nesse modo NADA é criado: a instrução (mesma normalização de
 * `planAgentDispatch`) vai pelo comando `deliver-task` do daemon, que respeita
 * o estado do alvo — ocioso recebe na hora, ocupado ENFILEIRA (nunca descarta,
 * nunca força). `--agent` é opcional aqui: sem ele, a identidade usada na
 * instrução é o próprio nome do tile alvo. `--no-queue` recusa em vez de
 * enfileirar quando o alvo está ocupado.
 *
 * LIMITAÇÃO conhecida do `--to-agent`: o `label` que ele casa é o que foi
 * dado no `create` do daemon (Story 17.1) — ou seja, só tiles DESPACHADOS por
 * esta CLI têm nome lá. Tile aberto pela UI do Cockpit chega ao daemon sem
 * label, e a renomeação na UI não é propagada; para esses, use
 * `--list-sessions` + `--to-session <id>`, que sempre funciona.
 *
 * cwd (Onda 1, item 2): `--cwd` explícito > cwd da sessão do CHEFE
 * (`dispatchedBy`, já resolvido pelo MESMO `listSessions` do vínculo) >
 * `process.cwd()` — o worker nasce no projeto ativo, não "lá em cima".
 *
 * Exit codes: 0 despachado/entregue/enfileirado/recomendado/listado;
 * 1 sem candidato ou alvo viável (inclusive entrega recusada);
 * 2 daemon inacessível (ou daemon antigo sem `deliver-task`).
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
    'uso (worker novo): agent-dispatch --agent "<nome>" --task "<tarefa>" [--cwd <dir>] [--adapter <id>] ' +
      '[--model <nome>] [--recommend] [--no-link] [--link-from <sessionId>] [--profile <json>] [--pipe <named-pipe>]\n' +
      'uso (tile já aberto): agent-dispatch --to-session <sessionId> | --to-agent "<nome>" --task "<tarefa>" ' +
      '[--agent "<nome>"] [--no-queue] [--pipe <named-pipe>]\n' +
      'uso (descoberta):     agent-dispatch --list-sessions [--pipe <named-pipe>]'
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

// Valida o SHAPE do override antes do merge — o arquivo é editado à mão
// (AGENTS.md: "EDITE À VONTADE"), e um campo fora do formato (ex.: strengths
// como string em vez de array) não pode virar TypeError em explainCandidates.
const AdapterMatrixOverrideSchema = z.object({
  adapters: z
    .record(
      z.object({
        strengths: z.array(z.string()),
        cost: z.string(),
        notes: z.string().optional(),
        models: z.array(z.string()).optional()
      })
    )
    .optional(),
  preferences: z.record(z.array(z.string())).optional()
});

/**
 * Matriz de capacidades: defaults do core + override editável. Sem arquivo
 * cai nos defaults silenciosamente (ausência é o caso comum); arquivo
 * presente mas inválido (JSON quebrado ou fora do schema) cai nos defaults
 * TAMBÉM, mas avisa no stderr — nunca bloqueia o despacho, só nunca some.
 */
function loadAdapterMatrix(argv: string[]): { matrix: AdapterMatrix; source: string } {
  const scriptDir = path.dirname(process.argv[1] ?? '.');
  const file = argValue(argv, '--profile') ?? path.resolve(scriptDir, ...REPO_ROOT_HOPS, 'adapters-profile.json');
  let raw: string;
  try {
    raw = readFileSync(file, 'utf8');
  } catch {
    return { matrix: DEFAULT_ADAPTER_MATRIX, source: '(defaults embutidos — adapters-profile.json ausente)' };
  }
  try {
    // Cast pós-validação: o parse acima já lançou se o shape não bater —
    // exactOptionalPropertyTypes só reclama do tipo estático do zod
    // (`T | undefined` em campo opcional), não do dado validado em si.
    const override = AdapterMatrixOverrideSchema.parse(JSON.parse(raw)) as Partial<AdapterMatrix>;
    return { matrix: mergeAdapterMatrix(DEFAULT_ADAPTER_MATRIX, override), source: file };
  } catch (err) {
    console.error(
      `[agent-dispatch] adapters-profile.json inválido em ${file} — usando defaults: ${err instanceof Error ? err.message : String(err)}`
    );
    return { matrix: DEFAULT_ADAPTER_MATRIX, source: '(defaults embutidos — adapters-profile.json inválido)' };
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

/** Conecta ao daemon; null quando inacessível (o chamador devolve exit 2). */
async function connectDaemon(pipe: string): Promise<DaemonClient | null> {
  const client = new DaemonClient();
  try {
    await client.connect(pipe);
    return client;
  } catch (err) {
    console.error(`[agent-dispatch] daemon inacessível em ${pipe}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * `--list-sessions` (Onda 1): sem isto o agente orquestrador NÃO tem como
 * descobrir qual tile é o alvo — só sabia criar às cegas. JSON puro no stdout
 * (o resto da CLI já reserva o stdout pro resultado e o stderr pros avisos),
 * pra o chefe parsear sem heurística de texto.
 */
async function listSessionsCommand(pipe: string): Promise<number> {
  const client = await connectDaemon(pipe);
  if (!client) return 2;
  try {
    const sessions = await client.listSessions();
    console.log(
      JSON.stringify(
        sessions.map((s) => ({
          id: s.id,
          label: s.label ?? null,
          adapterId: s.adapterId,
          status: s.status,
          cwd: s.cwd,
          pid: s.pid,
          dispatchedBy: s.dispatchedBy ?? null,
          createdAt: s.createdAt
        })),
        null,
        2
      )
    );
    return 0;
  } catch (err) {
    console.error('[agent-dispatch] falha ao listar sessões:', err instanceof Error ? err.message : err);
    return 2;
  } finally {
    client.disconnect();
  }
}

/**
 * Entrega em tile JÁ ABERTO (Onda 1, item 1). Não cria nada: resolve o alvo,
 * monta a MESMA instrução do despacho (`planAgentDispatch` — a normalização de
 * whitespace importa: newline no meio submeteria a instrução pela metade) e
 * pede `deliver-task` ao daemon, que decide entregar ou enfileirar.
 */
async function deliverToOpenTile(
  argv: string[],
  pipe: string,
  selector: { sessionId?: string | undefined; agentLabel?: string | undefined }
): Promise<number> {
  const task = argValue(argv, '--task');
  if (!task) {
    console.error('[agent-dispatch] entrega em tile aberto exige --task "<tarefa>"');
    usage();
    return 1;
  }
  const queueIfBusy = !argv.includes('--no-queue');

  const client = await connectDaemon(pipe);
  if (!client) return 2;
  try {
    let sessions: DaemonSessionInfo[];
    try {
      sessions = await client.listSessions();
    } catch (err) {
      console.error('[agent-dispatch] falha ao listar sessões vivas:', err instanceof Error ? err.message : err);
      return 2;
    }

    const resolution = resolveDeliveryTarget(sessions, selector);
    if (resolution.kind !== 'resolved') {
      console.error(`[agent-dispatch] alvo não resolvido: ${resolution.reason}`);
      if (resolution.kind === 'ambiguous') {
        for (const m of resolution.matches) console.error(`  - ${m.id} (${m.label ?? 'sem nome'} / ${m.adapterId})`);
      } else {
        console.error('[agent-dispatch] use --list-sessions para ver os tiles abertos');
      }
      return 1;
    }
    const target = resolution.target;

    // Plano local só pra AVISAR o chefe do que esperar; a decisão que vale é
    // a do daemon (ele tem o status do instante da escrita, não do listSessions).
    const plan = planTaskDelivery(target, { queueIfBusy });
    console.error(`[agent-dispatch] alvo ${target.id} (${target.label ?? 'sem nome'}): ${plan.reason}`);

    // Identidade da instrução: `--agent` explícito vence; sem ele o tile fala
    // com o nome que já tem — reafirmar outra persona num agente vivo só
    // confundiria o contexto dele.
    const agent = argValue(argv, '--agent') ?? target.label ?? target.id;
    // `planAgentDispatch` é reusado SÓ pelo `initialInstruction` — passando o
    // adapter do próprio alvo como explícito, a lista de candidatos vira
    // irrelevante (nada será criado) e a normalização de texto é idêntica à
    // do despacho, sem duplicar a formatação em dois lugares.
    const { initialInstruction } = planAgentDispatch({
      agent,
      task,
      explicitAdapter: target.adapterId,
      availableAdapters: [target.adapterId]
    });

    let ack: TaskDeliveryAck;
    try {
      ack = await client.deliverTask(target.id, initialInstruction, { queueIfBusy });
    } catch (err) {
      console.error('[agent-dispatch] entrega falhou:', err instanceof Error ? err.message : err);
      return 2;
    }

    if (ack.outcome === 'refused') {
      console.error(`[agent-dispatch] entrega RECUSADA: ${ack.reason}`);
      return 1;
    }
    console.log(
      `[agent-dispatch] tarefa ${ack.outcome === 'delivered' ? 'ENTREGUE' : 'ENFILEIRADA'} ` +
        `em ${target.id} (${target.label ?? 'sem nome'} / ${target.adapterId}) — ${ack.reason}` +
        (ack.queued > 0 ? ` [fila: ${ack.queued}]` : '')
    );
    return 0;
  } finally {
    client.disconnect();
  }
}

export async function dispatchAgent(argv: string[]): Promise<number> {
  // P0: COCKPIT_DAEMON_PIPE injetado pelo daemon evita --pipe manual — resolvido
  // antes de tudo porque os três modos (listar, entregar, despachar) precisam.
  const pipePath = argValue(argv, '--pipe') ?? process.env['COCKPIT_DAEMON_PIPE'] ?? DEFAULT_DAEMON_PIPE;

  // Descoberta e entrega vêm ANTES da validação de --agent/--task do despacho:
  // nenhum dos dois cria worker, então nenhum exige a dupla agente+tarefa.
  if (argv.includes('--list-sessions')) return await listSessionsCommand(pipePath);

  const toSession = argValue(argv, '--to-session');
  const toAgent = argValue(argv, '--to-agent');
  if (toSession !== undefined || toAgent !== undefined) {
    return await deliverToOpenTile(argv, pipePath, {
      ...(toSession !== undefined ? { sessionId: toSession } : {}),
      ...(toAgent !== undefined ? { agentLabel: toAgent } : {})
    });
  }

  const agent = argValue(argv, '--agent');
  const task = argValue(argv, '--task');
  if (!agent || !task) {
    usage();
    return 1;
  }
  const explicitCwd = argValue(argv, '--cwd');
  const explicitAdapter = argValue(argv, '--adapter');
  const model = argValue(argv, '--model');
  const { matrix, source: matrixSource } = loadAdapterMatrix(argv);

  // Modelo é escolha por CLI — sem adapter explícito a política poderia cair
  // numa CLI que não conhece esse nome de modelo. Quem escolhe modelo,
  // escolhe a CLI (protocolo do chefe, AC7 da 17.1).
  if (model !== undefined && explicitAdapter === undefined && !argv.includes('--recommend')) {
    console.error('[agent-dispatch] --model exige --adapter explícito (a grafia do modelo é específica de cada CLI)');
    return 1;
  }

  const client = await connectDaemon(pipePath);
  if (!client) return 2;

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
      // Contador histórico (Story 18.5, FR63): a CLI não tem acesso direto
      // ao histórico do Main (SQLite fechado por driver de ABI do Electron —
      // ver Dev Notes) — consulta o cache que o Main empurra pro daemon pelo
      // MESMO pipe já usado aqui. Puramente informativo (AC2/AC3): falha na
      // consulta (daemon antigo sem o comando, Main nunca conectou) cai pra
      // array vazio — `explainCandidates` já trata isso como "sem sufixo".
      let outcomeCounts: AdapterOutcomeCount[] = [];
      try {
        outcomeCounts = await client.listDispatchHistory();
      } catch (err) {
        console.error(
          '[agent-dispatch] histórico de despachos indisponível — --recommend segue sem o contador:',
          err instanceof Error ? err.message : err
        );
      }
      console.log(
        JSON.stringify(
          {
            category: plan.category,
            candidates: explainCandidates(plan.candidates, matrix, outcomeCounts),
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
    // --no-link é a trava de segurança: vence mesmo se --link-from também vier.
    const noLink = argv.includes('--no-link');
    // P0: prioridade de resolução do chefe:
    //   1. --link-from explícito (máxima prioridade)
    //   2. COCKPIT_SESSION_ID injetado pelo daemon no PTY pai (evita PID chain)
    //   3. Cadeia de PIDs via PowerShell CIM (fallback legado — Windows only)
    const envSessionId = !noLink ? (process.env['COCKPIT_SESSION_ID'] ?? undefined) : undefined;
    let dispatchedBy = noLink ? undefined : (argValue(argv, '--link-from') ?? envSessionId);
    // A cadeia de PIDs só é útil pro vínculo — `listSessions` (abaixo) também
    // alimenta a checagem de ociosidade (18.1), então é buscada sempre,
    // independente do vínculo estar ligado.
    const needsChain = dispatchedBy === undefined && !noLink;

    // Sessões vivas do daemon: insumo único pro vínculo automático (17.2) E
    // pra checagem de sessão ociosa (18.1) — uma consulta só, sem round-trip
    // duplicado ao daemon (Dev Notes da Story 18.1).
    let liveSessions: DaemonSessionInfo[] = [];
    try {
      const [chain, sessions] = await Promise.all([
        needsChain ? processPidChain() : Promise.resolve<number[]>([]),
        client.listSessions()
      ]);
      liveSessions = sessions;
      if (needsChain) {
        dispatchedBy = findDispatcherSession(chain, sessions) ?? undefined;
        if (dispatchedBy === undefined) {
          console.error('[agent-dispatch] sem vínculo: nenhum terminal do Cockpit na cadeia de processos (siga sem ele)');
        }
      }
    } catch (err) {
      console.error(
        needsChain
          ? '[agent-dispatch] detecção do chefe falhou — despacho segue sem vínculo:'
          : '[agent-dispatch] consulta de sessões vivas falhou — despacho segue sem checagem de ociosidade:',
        err instanceof Error ? err.message : err
      );
    }

    // cwd do worker (Onda 1, item 2): herda o diretório do CHEFE — que é o do
    // projeto ativo quando o despacho parte de um tile do Cockpit (Story 8.3
    // já resolve o cwd do tile pelo projeto). Reusa o MESMO `liveSessions`
    // acima; nenhum round-trip novo ao daemon. Sem chefe detectável, mantém o
    // comportamento antigo (`process.cwd()`), então nada regride.
    const dispatcherSession = dispatchedBy !== undefined ? liveSessions.find((s) => s.id === dispatchedBy) : undefined;
    const cwd = resolveDispatchCwd({
      ...(explicitCwd !== undefined ? { explicitCwd } : {}),
      ...(dispatcherSession !== undefined ? { dispatcherSession } : {}),
      fallbackCwd: process.cwd()
    });
    if (explicitCwd === undefined && dispatcherSession !== undefined) {
      console.error(`[agent-dispatch] cwd herdado do terminal-chefe ${dispatchedBy ?? ''}: ${cwd}`);
    }

    // Sessão ociosa do mesmo adapter (18.1, AC1/AC3): só o PRIMEIRO candidato
    // é checado — é o que a política escolheria se nada estivesse ocioso.
    // Aviso puro: nunca bloqueia o despacho (AC5).
    const [firstCandidate] = plan.candidates;
    if (firstCandidate !== undefined) {
      const idleId = findIdleCandidate(firstCandidate, liveSessions);
      if (idleId !== null) {
        console.error(
          `[agent-dispatch] sessão ociosa do mesmo adapter encontrada: ${idleId} — considere reusar em vez de abrir um novo worker`
        );
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
