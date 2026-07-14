/**
 * SPIKE — Daemon de terminais + túnel de transcript (visão do fundador).
 * Pergunta: um daemon FORA do app pode hospedar PTYs que sobrevivem ao
 * fechamento do cliente, com reattach + replay de transcript, no Windows?
 *
 * Critérios eliminatórios (@architect):
 *  (a) daemon sobrevive ao exit do cliente (PTY continua vivo)
 *  (b) reattach de OUTRO processo recebe o transcript + stream vivo
 *  (c) roundtrip de echo através do pipe < 500ms
 *  (d) shutdown do daemon dispõe PTYs sem órfãos
 *
 * Uso: pnpm --filter @cockpit/desktop spike:daemon
 * (orquestra: fase1 [processo A] → fase2 [processo B] → relatório JSON)
 */
import { spawn as spawnChild, spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { createConnection, createServer, type Socket } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn as ptySpawn, type IPty } from 'node-pty';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PIPE = '\\\\.\\pipe\\cockpit-daemon-spike';
const TRANSCRIPT_CAP = 256 * 1024;

type Msg =
  | { t: 'create'; id: string }
  | { t: 'created'; id: string; pid: number }
  | { t: 'write'; id: string; data: string }
  | { t: 'attach'; id: string }
  | { t: 'transcript'; id: string; data: string }
  | { t: 'out'; id: string; data: string }
  | { t: 'shutdown' }
  | { t: 'shutdown-done'; orphans: number };

function send(socket: Socket, msg: Msg): void {
  socket.write(JSON.stringify(msg) + '\n');
}

function onMessages(socket: Socket, cb: (msg: Msg) => void): void {
  let buffer = '';
  socket.on('data', (chunk) => {
    buffer += chunk.toString('utf8');
    let idx;
    while ((idx = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      if (line.trim()) cb(JSON.parse(line) as Msg);
    }
  });
}

function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------- daemon ---
function runDaemon(): void {
  interface Hosted {
    pty: IPty;
    transcript: string;
    subscribers: Set<Socket>;
  }
  const sessions = new Map<string, Hosted>();

  const server = createServer((socket) => {
    onMessages(socket, (msg) => {
      if (msg.t === 'create') {
        const pty = ptySpawn('powershell.exe', ['-NoLogo'], {
          name: 'xterm-256color',
          cols: 80,
          rows: 24,
          cwd: process.cwd(),
          env: process.env as Record<string, string>
        });
        const hosted: Hosted = { pty, transcript: '', subscribers: new Set([socket]) };
        pty.onData((data) => {
          hosted.transcript = (hosted.transcript + data).slice(-TRANSCRIPT_CAP);
          for (const sub of hosted.subscribers) {
            if (!sub.destroyed) send(sub, { t: 'out', id: msg.id, data });
          }
        });
        sessions.set(msg.id, hosted);
        send(socket, { t: 'created', id: msg.id, pid: pty.pid });
      } else if (msg.t === 'write') {
        sessions.get(msg.id)?.pty.write(msg.data);
      } else if (msg.t === 'attach') {
        const hosted = sessions.get(msg.id);
        if (hosted) {
          hosted.subscribers.add(socket);
          send(socket, { t: 'transcript', id: msg.id, data: hosted.transcript });
        }
      } else if (msg.t === 'shutdown') {
        void (async () => {
          let orphans = 0;
          for (const hosted of sessions.values()) {
            const pid = hosted.pty.pid;
            hosted.pty.kill();
            await new Promise((r) => setTimeout(r, 1200));
            if (isPidAlive(pid)) orphans++;
          }
          send(socket, { t: 'shutdown-done', orphans });
          setTimeout(() => process.exit(orphans > 0 ? 1 : 0), 200);
        })();
      }
    });
    socket.on('error', () => void 0);
  });
  server.listen(PIPE);
}

// ---------------------------------------------------------------- fase 1 ---
async function runPhase1(): Promise<void> {
  // Sobe o daemon DESANEXADO (sobrevive a este processo).
  const tsxCli = join(__dirname, '..', 'node_modules', 'tsx', 'dist', 'cli.mjs');
  spawnChild(process.execPath, [tsxCli, fileURLToPath(import.meta.url), '--daemon'], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true
  }).unref();
  await new Promise((r) => setTimeout(r, 3500));

  const socket = createConnection(PIPE);
  let out = '';
  let pid = 0;
  onMessages(socket, (msg) => {
    if (msg.t === 'created') pid = msg.pid;
    if (msg.t === 'out') out += msg.data;
  });
  await new Promise((r) => socket.once('connect', r));
  send(socket, { t: 'create', id: 'probe' });
  await waitFor(() => pid > 0, 10_000, 'created');
  send(socket, { t: 'write', id: 'probe', data: 'echo fase1-viva\r' });
  await waitFor(() => out.includes('fase1-viva'), 15_000, 'echo fase1');

  console.log(JSON.stringify({ phase: 1, ok: true, pid }));
  socket.destroy();
  process.exit(0); // cliente morre; daemon+PTY devem sobreviver
}

// ---------------------------------------------------------------- fase 2 ---
async function runPhase2(expectedPid: number): Promise<void> {
  const alive = isPidAlive(expectedPid);

  const socket = createConnection(PIPE);
  let transcript = '';
  let live = '';
  let latencyMs = -1;
  let orphans = -1;
  onMessages(socket, (msg) => {
    if (msg.t === 'transcript') transcript = msg.data;
    if (msg.t === 'out') live += msg.data;
    if (msg.t === 'shutdown-done') orphans = msg.orphans;
  });
  await new Promise((r) => socket.once('connect', r));

  send(socket, { t: 'attach', id: 'probe' });
  await waitFor(() => transcript.length > 0, 10_000, 'transcript');

  const t0 = Date.now();
  send(socket, { t: 'write', id: 'probe', data: 'echo fase2-reattach\r' });
  await waitFor(() => live.includes('fase2-reattach'), 15_000, 'echo fase2');
  latencyMs = Date.now() - t0;

  send(socket, { t: 'shutdown' });
  await waitFor(() => orphans >= 0, 15_000, 'shutdown');

  const report = {
    date: new Date().toISOString(),
    criteria: {
      a_daemonSurvivesClientExit: alive,
      b_reattachTranscript: transcript.includes('fase1-viva'),
      b_reattachLiveStream: live.includes('fase2-reattach'),
      c_echoRoundtripMs: latencyMs,
      c_underBudget: latencyMs > 0 && latencyMs < 500,
      d_orphansOnShutdown: orphans
    },
    verdict:
      alive && transcript.includes('fase1-viva') && live.includes('fase2-reattach') && latencyMs < 500 && orphans === 0
        ? 'PASS'
        : 'FAIL'
  };
  writeFileSync(join(__dirname, 'daemon-spike-report.json'), JSON.stringify(report, null, 2));
  console.log('[daemon-spike]', JSON.stringify(report));
  process.exit(report.verdict === 'PASS' ? 0 : 1);
}

// ------------------------------------------------------------ orquestra ---
function runOrchestrator(): void {
  const tsxCli = join(__dirname, '..', 'node_modules', 'tsx', 'dist', 'cli.mjs');
  const self = fileURLToPath(import.meta.url);

  const p1 = spawnSync(process.execPath, [tsxCli, self, '--phase1'], { encoding: 'utf8' });
  const line1 = p1.stdout.split(/\r?\n/).find((l) => l.includes('"phase": 1') || l.includes('"phase":1'));
  if (!line1) {
    console.error('[daemon-spike] fase 1 falhou:', p1.stdout, p1.stderr);
    process.exit(1);
  }
  const pid = (JSON.parse(line1) as { pid: number }).pid;
  console.log(`[daemon-spike] fase 1 ok (pty pid ${pid}); cliente A morto — reattach pela fase 2...`);

  const p2 = spawnSync(process.execPath, [tsxCli, self, '--phase2', String(pid)], {
    encoding: 'utf8',
    stdio: 'inherit'
  });
  process.exit(p2.status ?? 1);
}

async function waitFor(cond: () => boolean, timeoutMs: number, label: string): Promise<void> {
  const start = Date.now();
  while (!cond()) {
    if (Date.now() - start > timeoutMs) throw new Error(`timeout: ${label}`);
    await new Promise((r) => setTimeout(r, 50));
  }
}

if (process.argv.includes('--daemon')) runDaemon();
else if (process.argv.includes('--phase1')) void runPhase1();
else if (process.argv.includes('--phase2')) void runPhase2(Number(process.argv[process.argv.indexOf('--phase2') + 1]));
else runOrchestrator();
