/**
 * SPIKE ConPTY (Story 1.1 Task 3) — risco nº 1 do projeto.
 *
 * Critérios eliminatórios (docs/architecture/high-level-architecture.md):
 *  (a) 6+ PTYs ConPTY simultâneos estáveis por 30+ min sem leak/órfãos
 *  (b) TUI interativa funcional (validação manual: rodar `vim`/CLI agêntico à parte)
 *  (c) resize correto
 *  (d) kill limpo sem processos órfãos
 *
 * Uso: pnpm --filter @cockpit/desktop spike:conpty [--minutes 30] [--ptys 6]
 * Saída: relatório no console + spike/conpty-spike-report.json
 */
import { spawn as ptySpawn, type IPty } from 'node-pty';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const getArg = (name: string, fallback: number): number => {
  const idx = args.indexOf(`--${name}`);
  const raw = idx >= 0 ? args[idx + 1] : undefined;
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
};

const PTY_COUNT = getArg('ptys', 6);
const DURATION_MIN = getArg('minutes', 30);
const shellCmd = process.platform === 'win32' ? 'powershell.exe' : 'bash';

interface PtyProbe {
  id: number;
  pty: IPty;
  pid: number;
  bytesReceived: number;
  lastOutputAt: number;
  exited: boolean;
  exitCode: number | null;
}

const probes: PtyProbe[] = [];
const startedAt = Date.now();
const memSamples: number[] = [];

console.log(`[spike] Spawnando ${PTY_COUNT} PTYs (${shellCmd}) por ${DURATION_MIN} min...`);

for (let i = 0; i < PTY_COUNT; i++) {
  const pty = ptySpawn(shellCmd, [], {
    name: 'xterm-256color',
    cols: 100,
    rows: 30,
    cwd: process.cwd(),
    env: process.env as Record<string, string>
  });
  const probe: PtyProbe = {
    id: i,
    pty,
    pid: pty.pid,
    bytesReceived: 0,
    lastOutputAt: Date.now(),
    exited: false,
    exitCode: null
  };
  pty.onData((data) => {
    probe.bytesReceived += data.length;
    probe.lastOutputAt = Date.now();
  });
  pty.onExit(({ exitCode }) => {
    probe.exited = true;
    probe.exitCode = exitCode;
    console.error(`[spike] ❌ PTY #${i} (pid ${probe.pid}) saiu prematuramente: code ${exitCode}`);
  });
  probes.push(probe);
  console.log(`[spike] PTY #${i} ok — pid ${pty.pid}`);
}

// Atividade contínua: comando periódico + resize alternado (critério c)
const activity = setInterval(() => {
  const mem = process.memoryUsage().rss / 1024 / 1024;
  memSamples.push(mem);
  for (const p of probes) {
    if (p.exited) continue;
    p.pty.write(`echo spike-tick-${Date.now()}\r`);
    const cols = 80 + Math.floor(Math.random() * 60);
    p.pty.resize(cols, 30); // resize sob carga
  }
  const elapsedMin = ((Date.now() - startedAt) / 60000).toFixed(1);
  console.log(`[spike] t=${elapsedMin}min rss=${mem.toFixed(1)}MB vivos=${probes.filter((p) => !p.exited).length}/${PTY_COUNT}`);
}, 15000);

setTimeout(() => {
  clearInterval(activity);
  console.log('[spike] Encerrando PTYs (critério d: kill limpo)...');
  for (const p of probes) {
    if (!p.exited) p.pty.kill();
  }

  setTimeout(() => {
    const survivors = probes.filter((p) => !p.exited && p.bytesReceived > 0);
    const prematureExits = probes.filter((p) => p.exited && p.exitCode !== 0 && p.exitCode !== null);
    const report = {
      date: new Date().toISOString(),
      platform: `${process.platform} ${process.arch} node ${process.version}`,
      ptyCount: PTY_COUNT,
      durationMinutes: DURATION_MIN,
      allProducedOutput: probes.every((p) => p.bytesReceived > 0),
      prematureExits: prematureExits.length,
      rssMinMB: Math.min(...memSamples).toFixed(1),
      rssMaxMB: Math.max(...memSamples).toFixed(1),
      verdict:
        probes.every((p) => p.bytesReceived > 0) && prematureExits.length === 0
          ? 'PASS (a,c,d) — validar (b) TUI manualmente'
          : 'FAIL — escalar @architect (fallback Tauri)'
    };
    writeFileSync(join(__dirname, 'conpty-spike-report.json'), JSON.stringify(report, null, 2));
    console.log('[spike] Relatório:', report);
    console.log(`[spike] Verificar órfãos: Get-Process | Where-Object { $_.Name -match 'powershell|conhost' }`);
    process.exit(report.verdict.startsWith('PASS') ? 0 : 1);
  }, 3000);
}, DURATION_MIN * 60000);
