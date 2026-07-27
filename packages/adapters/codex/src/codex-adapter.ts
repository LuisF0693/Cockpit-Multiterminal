import { execFileSync } from 'node:child_process';
import { closeSync, existsSync, mkdtempSync, openSync, readSync, rmSync, statSync, watch, writeFileSync, type FSWatcher } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn as ptySpawn } from 'node-pty';
import type {
  AdapterAvailability,
  AgentAdapter,
  AgentSession,
  SpawnConfig,
  Unsubscribe
} from '@cockpit/adapter-contract';
import { AgentStatusSchema, type AgentStatus } from '@cockpit/shared';

/**
 * Adapter Codex (Story 2.3) — statusStrategy 'output-parsing' (híbrido):
 * - notify do Codex (override por sessão via `-c notify=[...]`, TOML literal)
 *   dispara em agent-turn-complete → linha `idle` no arquivo de status.
 *   ⚠️ O Codex appenda um payload JSON como argumento extra ao programa de
 *   notify — ver `buildNotifyOverride` para o que isso quebrava com `cmd`.
 *   O parser ainda considera só o PRIMEIRO token de cada linha.
 * - Heurística de input: write() contendo `\r` = prompt enviado → working
 *   (o CLI não notifica submissão de prompt).
 * - exit 0→done / ≠0→error.
 * waiting-input (prompts de aprovação) = debt até fixtures reais (política 2.2).
 * NFR6: env herdado; auth do codex fica no próprio CLI (~/.codex).
 *
 * FR7 / instrução inicial: o Codex é um TUI NATIVO (Rust/ratatui). Escrever
 * `${initialInstruction}\r` no PTY logo após o spawn — como faziam os demais
 * adapters — perde os bytes: o CLI ainda está carregando config e subindo
 * MCP servers quando eles chegam, e a caixa de composição acaba VAZIA (a
 * tarefa nunca é criada). Reproduzido com codex-cli 0.145.0. Por isso a
 * instrução vai pelo argumento POSICIONAL nativo (`codex [OPTIONS] [PROMPT]`
 * — "Optional user prompt to start the session"), que já sobe a sessão com o
 * turno submetido: sem corrida, sem heurística de prontidão.
 */

export interface CodexPtyLike {
  readonly pid: number;
  onData(cb: (data: string) => void): { dispose(): void };
  onExit(cb: (e: { exitCode: number }) => void): { dispose(): void };
  write(data: string): void;
  resize(cols: number, rows: number): void;
  kill(): void;
}

export type CodexSpawnFn = (command: string, args: string[], config: SpawnConfig) => CodexPtyLike;
export type WhichFn = (command: string) => string | null;

const DEFAULT_COMMAND = 'codex.cmd';
const KILL_GRACE_MS = 1500;
const POLL_MS = 500;

/** Delimitadores do bracketed paste (DEC 2004) — o protocolo que separa conteúdo COLADO de tecla digitada. */
const PASTE_START = `${String.fromCharCode(27)}[200~`;
const PASTE_END = `${String.fromCharCode(27)}[201~`;
const CR = '\r';

/**
 * Intervalo entre o bloco colado e o Enter (Causa A). MEDIDO no Codex real
 * (codex-cli 0.145.0, tile já bootado e composer vazio), escrevendo o texto
 * como bracketed paste e o `\r` num write SEPARADO:
 *
 *   gap    0ms (setImmediate) → NÃO submeteu (45s de espera, nada)
 *   gap   20ms                → NÃO submeteu
 *   gap   40ms                → NÃO submeteu
 *   gap   70ms                → SUBMETEU (resposta em 11,8s)
 *   gap  120ms                → SUBMETEU (resposta em 3,1s)
 *
 * Ou seja: o piso real está entre 40ms e 70ms. O Codex trata um Enter que
 * chega colado a uma colagem como NOVA LINHA no composer, não como submit —
 * é comportamento deliberado dele (colar texto multi-linha não pode disparar
 * o turno no primeiro `\n`), e a janela de graça é TEMPORAL: nenhuma
 * codificação de bytes escapa dela, só a espera. 250ms é ~3,5x o piso medido
 * e ~6x o maior gap que falhou — folga para jitter de scheduler/ConPTY sem
 * latência perceptível (um turno de Codex leva segundos).
 */
export const CODEX_SUBMIT_GAP_MS = 250;

/**
 * Decide, de forma PURA, se um write é uma "linha submetida programaticamente"
 * e como codificá-la. Devolve `null` quando o write deve passar intacto.
 *
 * Por que o texto vai embrulhado em bracketed paste em vez de cru: é o mesmo
 * protocolo que o `term.paste()` do xterm usa do lado do renderer, e ele
 * garante que o conteúdo seja tratado como BLOCO — uma instrução multi-linha
 * (as mensagens do roteamento SDC são) não submete sozinha no primeiro `\n`
 * interno. O `\r` fica de fora do bloco: é a tecla Enter, não conteúdo.
 *
 * Nunca dispara em digitação humana: tecla solta não termina em quebra, e
 * Enter puro (`'\r'`) tem corpo vazio. Um write que JÁ vem embrulhado (o
 * xterm colando com DEC 2004 ligado) passa intacto — quem embrulhou sabe o
 * que está fazendo.
 */
export function splitSubmittedLine(data: string): { paste: string; enter: string } | null {
  const body = data.replace(/[\r\n]+$/, '');
  if (body === data) return null; // não termina em quebra: digitação comum
  if (body === '') return null; // só quebras: Enter puro do teclado
  if (body.includes(PASTE_START) || body.includes(PASTE_END)) return null;
  return { paste: `${PASTE_START}${body}${PASTE_END}`, enter: CR };
}

function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Override TOML do notify (literal strings — paths Windows sem escaping).
 *
 * Aponta para um script Node, NÃO para `cmd /c echo`. Motivo medido: o Codex
 * anexa o payload do evento como ARGUMENTO EXTRA do programa de notify, e o
 * payload é JSON. Com `cmd`, as aspas e os `<`/`>`/`&` do JSON são
 * reinterpretados como sintaxe de shell e o comando inteiro morre:
 *
 *   sem payload   | status 0 | escreve "idle"
 *   payload 'abc' | status 0 | escreve "idle abc"
 *   payload JSON  | status 1 | "The filename, directory name, or volume label
 *                 |          |  syntax is incorrect." — escreve NADA
 *
 * Ou seja: em sessão real o arquivo de status NUNCA era escrito e o
 * `lastStatus` ficava preso no seed `working` até o exit. Com `node <script>`
 * o argv é passado como VETOR (sem shell no meio), então o payload é só um
 * argumento a mais que o script ignora — imune a qualquer conteúdo.
 */
export function buildNotifyOverride(notifyScriptPath: string): string {
  return `notify=['node','${notifyScriptPath}']`;
}

/**
 * Fonte do script de notify. O path do status vai EMBUTIDO (via
 * `JSON.stringify`, que já escapa as barras invertidas do Windows) em vez de
 * vir por argv: o argv desse processo pertence ao Codex, que planta o payload
 * ali. `.cjs` porque o dir temporário não tem package.json — a extensão é o
 * que garante `require` sem depender do modo de módulo do ambiente.
 */
export function buildNotifyScript(statusPath: string): string {
  return `require('node:fs').appendFileSync(${JSON.stringify(statusPath)}, 'idle\\n');\n`;
}

/**
 * Argv do codex: opções primeiro (notify + args de sessão da 17.3), depois a
 * instrução inicial como POSICIONAL. O `--` é obrigatório: sem ele o clap do
 * codex tentaria casar a instrução com um subcomando (`review`, `resume`,
 * `exec`...) ou reclamaria de token com hífen — o próprio CLI sugere
 * `-- <valor>` nesse erro. Pura: só monta a lista, quem faz spawn é o caller.
 */
export function buildCodexArgs(
  notifyScriptPath: string,
  config: Pick<SpawnConfig, 'args' | 'initialInstruction'>
): string[] {
  const args = ['-c', buildNotifyOverride(notifyScriptPath), ...(config.args ?? [])];
  if (config.initialInstruction) args.push('--', config.initialInstruction);
  return args;
}

const defaultSpawn: CodexSpawnFn = (command, args, config) =>
  ptySpawn(command, args, {
    name: 'xterm-256color',
    cols: config.cols,
    rows: config.rows,
    cwd: config.cwd,
    env: { ...(process.env as Record<string, string>), ...(config.env ?? {}) }
  });

const defaultWhich: WhichFn = (command) => {
  try {
    return execFileSync('where', [command], { encoding: 'utf8' }).split(/\r?\n/)[0]?.trim() ?? null;
  } catch {
    return null;
  }
};

let sessionSeq = 0;

export class CodexAdapter implements AgentAdapter {
  readonly id = 'codex';
  readonly displayName = 'Codex';
  readonly statusStrategy = 'output-parsing' as const;

  constructor(
    private readonly spawnFn: CodexSpawnFn = defaultSpawn,
    private readonly which: WhichFn = defaultWhich,
    private readonly command: string = DEFAULT_COMMAND,
    private readonly graceMs: number = KILL_GRACE_MS,
    private readonly pollMs: number = POLL_MS,
    /** Gap texto→Enter (Causa A); injetável para o teste não esperar 250ms. */
    private readonly submitGapMs: number = CODEX_SUBMIT_GAP_MS
  ) {}

  async detectAvailability(): Promise<AdapterAvailability> {
    const path = this.which('codex');
    if (!path) {
      return { available: false, reason: 'codex CLI não encontrado no PATH (npm i -g @openai/codex)' };
    }
    return { available: true };
  }

  async spawn(config: SpawnConfig): Promise<AgentSession> {
    const dir = mkdtempSync(join(tmpdir(), `cockpit-codex-s${++sessionSeq}-`));
    const statusPath = join(dir, 'session.status');
    // O script mora AO LADO do status, no mesmo dir temporário da sessão:
    // o `cleanup()` já apaga o dir inteiro (rmSync recursive), então não há
    // arquivo órfão a limpar separadamente.
    const notifyScriptPath = join(dir, 'notify.cjs');
    writeFileSync(statusPath, '');
    writeFileSync(notifyScriptPath, buildNotifyScript(statusPath));
    // args extras (17.3): ex.: ['--model','gpt-5.5-codex'] — escolha do chefe por sessão
    const pty = this.spawnFn(this.command, buildCodexArgs(notifyScriptPath, config), config);
    return new CodexSession(pty, dir, statusPath, this.graceMs, this.pollMs, this.submitGapMs);
  }
}

class CodexSession implements AgentSession {
  readonly terminalId: string;
  readonly pid: number;
  private exited = false;
  private last: AgentStatus | null = null;
  private offset = 0;
  private watcher: FSWatcher | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  /** Enter adiado da linha submetida (Causa A) — null quando não há nenhum em voo. */
  private pendingEnter: ReturnType<typeof setTimeout> | null = null;
  /** Writes que chegaram durante a espera do Enter — drenados na ordem. */
  private readonly backlog: string[] = [];
  private readonly statusCbs = new Set<(s: AgentStatus, detail?: string) => void>();

  constructor(
    private readonly pty: CodexPtyLike,
    private readonly tempDir: string,
    private readonly statusPath: string,
    private readonly graceMs: number,
    pollMs: number,
    private readonly submitGapMs: number = CODEX_SUBMIT_GAP_MS
  ) {
    this.terminalId = `codex-${pty.pid}`;
    this.pid = pty.pid;

    try {
      this.watcher = watch(this.statusPath, () => this.drain());
    } catch {
      this.watcher = null;
    }
    this.pollTimer = setInterval(() => this.drain(), pollMs);

    this.pty.onExit(({ exitCode }) => {
      this.exited = true;
      this.emitStatus(exitCode === 0 ? 'done' : 'error', `exit ${exitCode}`);
      this.cleanup();
    });
    // Nada de write() aqui: a instrução inicial já foi via argv (ver cabeçalho).
    // O 'working' do primeiro turno vem do daemon, que semeia lastStatus
    // 'working' no create — emitir aqui não teria assinante ainda e ainda
    // envenenaria o dedupe de `last`, engolindo o próximo 'working' legítimo.
  }

  /**
   * Causa A: uma linha submetida programaticamente (`${texto}\r` — o que
   * `writeTaskLine`, o fallback do Main e o `instructAgent` produzem) NÃO
   * submete turno nenhum no Codex quando texto e `\r` chegam no MESMO burst:
   * o TUI trata o Enter colado como nova linha do composer e o texto fica
   * parado esperando um humano. Aqui a linha é quebrada em dois bursts —
   * bloco colado agora, Enter depois de `CODEX_SUBMIT_GAP_MS` (ver a medição
   * na constante). Digitação humana passa intacta, sem atraso nenhum.
   */
  write(data: string): void {
    const line = splitSubmittedLine(data);
    // Com Enter pendente TUDO espera na fila: um write que ultrapassasse o
    // `\r` agendado chegaria ao composer antes do turno abrir, e a ordem que
    // o chamador escreveu deixaria de ser a ordem que o Codex vê.
    if (this.pendingEnter !== null) {
      this.backlog.push(data);
    } else if (line === null) {
      this.pty.write(data);
    } else {
      this.pty.write(line.paste);
      this.pendingEnter = setTimeout(() => this.flushEnter(line.enter), this.submitGapMs);
    }
    // Heurística de input: Enter = prompt submetido → working. Emitida no
    // AGENDAMENTO, não na entrega: o turno é do chamador desde já, e o daemon
    // precisa ver 'working' antes de considerar o tile ocioso de novo.
    if (data.includes('\r') && !this.exited) {
      this.emitStatus('working', 'input-heuristic');
    }
  }

  /** Entrega o Enter adiado e drena o que chegou durante a espera, em ordem. */
  private flushEnter(enter: string): void {
    this.pendingEnter = null;
    if (this.exited) {
      this.backlog.length = 0;
      return;
    }
    this.pty.write(enter);
    for (const queued of this.backlog.splice(0)) this.write(queued);
  }

  resize(cols: number, rows: number): void {
    this.pty.resize(cols, rows);
  }

  async dispose(): Promise<void> {
    if (!this.exited) this.pty.kill();
    await new Promise((r) => setTimeout(r, this.graceMs));
    this.cleanup();
    if (isPidAlive(this.pid)) {
      throw new Error(`processo ${this.pid} resistiu ao dispose (órfão)`);
    }
  }

  onData(cb: (chunk: Buffer) => void): Unsubscribe {
    const sub = this.pty.onData((data) => cb(Buffer.from(data, 'utf8')));
    return () => sub.dispose();
  }

  onStatus(cb: (status: AgentStatus, detail?: string) => void): Unsubscribe {
    this.statusCbs.add(cb);
    return () => this.statusCbs.delete(cb);
  }

  onExit(cb: (code: number | null) => void): Unsubscribe {
    const sub = this.pty.onExit(({ exitCode }) => cb(exitCode));
    return () => sub.dispose();
  }

  /** Tail incremental; primeiro token da linha = status (sufixo JSON ignorado). */
  private drain(): void {
    if (this.exited || !existsSync(this.statusPath)) return;
    let size: number;
    try {
      size = statSync(this.statusPath).size;
    } catch {
      return;
    }
    if (size <= this.offset) return;
    const fd = openSync(this.statusPath, 'r');
    try {
      const buf = Buffer.alloc(size - this.offset);
      readSync(fd, buf, 0, buf.length, this.offset);
      this.offset = size;
      for (const rawLine of buf.toString('utf8').split(/\r?\n/)) {
        const token = rawLine.trim().split(/\s+/)[0] ?? '';
        if (!token) continue;
        const parsed = AgentStatusSchema.safeParse(token);
        if (parsed.success) this.emitStatus(parsed.data, 'notify');
      }
    } finally {
      closeSync(fd);
    }
  }

  private emitStatus(status: AgentStatus, detail?: string): void {
    if (status === this.last) return;
    this.last = status;
    for (const cb of this.statusCbs) cb(status, detail);
  }

  private cleanup(): void {
    this.watcher?.close();
    this.watcher = null;
    if (this.pollTimer !== null) clearInterval(this.pollTimer);
    this.pollTimer = null;
    // Enter adiado de uma sessão morta não tem onde cair — cancela e descarta
    // o backlog, senão o timer sobreviveria ao PTY (handle vazado no vitest).
    if (this.pendingEnter !== null) clearTimeout(this.pendingEnter);
    this.pendingEnter = null;
    this.backlog.length = 0;
    try {
      rmSync(this.tempDir, { recursive: true, force: true });
    } catch {
      // best-effort
    }
  }
}
