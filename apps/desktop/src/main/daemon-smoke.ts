import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DaemonClient } from '@cockpit/pty-host';

/**
 * Smoke CROSS-PROCESSO do daemon (Story 6.3, AC4): três processos reais.
 *   daemon (detached) ← fase A (cria sessão + marker, MORRE)
 *                     ← fase B (novo processo: adota, replay, echo vivo, shutdown)
 * Uso: pnpm --filter @cockpit/desktop smoke:daemon  (build + node)
 */

const MARKER_A = 'smoke63-fase-a';
const MARKER_B = 'smoke63-fase-b';
const SESSION = 'smoke-63';

function daemonEntryPath(): string {
  const candidates = [join(__dirname, 'daemon.js'), join(process.cwd(), 'out', 'main', 'daemon.js')];
  const entry = candidates.find((p) => existsSync(p));
  if (!entry) throw new Error(`daemon.js não encontrado: ${candidates.join(' | ')}`);
  return entry;
}

async function phaseA(pipe: string, scrollbackDir: string): Promise<void> {
  const daemon = spawn(process.execPath, [daemonEntryPath(), '--run-daemon', '--pipe', pipe], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true
  });
  daemon.unref();

  const client = new DaemonClient();
  await connectRetry(client, pipe);
  client.configure({ scrollbackDir, maxFileBytes: 1024 * 1024, restoreTailBytes: 128 * 1024 });
  const { id } = await client.createSession({ tag: SESSION, cols: 80, rows: 24 });
  let out = '';
  client.onData(id, (b) => {
    out += Buffer.from(b).toString('utf8');
  });
  client.write(id, new TextEncoder().encode(`echo ${MARKER_A}\r`));
  await waitFor(() => out.includes(MARKER_A), 20_000, 'echo fase A');
  console.log('[fase-a] ok — cliente morre; daemon+PTY devem sobreviver');
  process.exit(0);
}

async function phaseB(pipe: string): Promise<void> {
  const client = new DaemonClient();
  await connectRetry(client, pipe);

  const sessions = await client.listSessions();
  const alive = sessions.find((s) => s.id === SESSION);
  if (!alive) throw new Error(`sessão ${SESSION} não sobreviveu (list-sessions: ${JSON.stringify(sessions)})`);

  let out = '';
  client.onData(SESSION, (b) => {
    out += Buffer.from(b).toString('utf8');
  });
  const { ok } = await client.attach(SESSION);
  if (!ok) throw new Error('attach falhou');
  await waitFor(() => out.includes(MARKER_A), 15_000, 'replay do transcript');

  client.write(SESSION, new TextEncoder().encode(`echo ${MARKER_B}\r`));
  await waitFor(() => out.includes(MARKER_B), 15_000, 'echo vivo fase B');

  const { orphan } = await client.closeSession(SESSION);
  const { orphans } = await client.shutdownDaemon();
  if (orphan || orphans > 0) throw new Error(`órfãos: close=${String(orphan)} shutdown=${orphans}`);
  console.log('[fase-b] ok — adoção + replay + stream vivo + shutdown 0 órfãos');
  process.exit(0);
}

function orchestrate(): void {
  const pipe = `\\\\.\\pipe\\cockpit-daemon-smoke-${process.pid}`;
  const scrollbackDir = mkdtempSync(join(tmpdir(), 'cockpit-smoke63-'));
  const self = process.argv[1]!;

  const a = spawnSync(process.execPath, [self, '--phase-a', pipe, scrollbackDir], {
    stdio: 'inherit',
    timeout: 60_000
  });
  if (a.status !== 0) {
    console.error(`[daemon-smoke] FAIL na fase A (exit ${a.status})`);
    process.exit(1);
  }
  const b = spawnSync(process.execPath, [self, '--phase-b', pipe], { stdio: 'inherit', timeout: 60_000 });
  if (b.status !== 0) {
    console.error(`[daemon-smoke] FAIL na fase B (exit ${b.status})`);
    process.exit(1);
  }
  console.log('[daemon-smoke] PASS — sessão sobreviveu ao processo cliente (AC4 da 6.3)');
  process.exit(0);
}

async function connectRetry(client: DaemonClient, pipe: string): Promise<void> {
  let lastErr: unknown = null;
  for (let i = 0; i < 20; i++) {
    try {
      await client.connect(pipe);
      return;
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  throw new Error(`não conectou ao daemon: ${String(lastErr)}`);
}

async function waitFor(cond: () => boolean, timeoutMs: number, label: string): Promise<void> {
  const start = Date.now();
  while (!cond()) {
    if (Date.now() - start > timeoutMs) throw new Error(`timeout: ${label}`);
    await new Promise((r) => setTimeout(r, 100));
  }
}

const argv = process.argv;
if (argv.includes('--phase-a')) {
  void phaseA(argv[argv.indexOf('--phase-a') + 1]!, argv[argv.indexOf('--phase-a') + 2]!).catch((err) => {
    console.error('[fase-a] FAIL:', err);
    process.exit(1);
  });
} else if (argv.includes('--phase-b')) {
  void phaseB(argv[argv.indexOf('--phase-b') + 1]!).catch((err) => {
    console.error('[fase-b] FAIL:', err);
    process.exit(1);
  });
} else {
  orchestrate();
}
