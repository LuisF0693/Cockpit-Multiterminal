/** Roda DENTRO do utilityProcess: spawn real de PTY + roundtrip de saída. */
let report;
try {
  const pty = require('node-pty');
  const p = pty.spawn('powershell.exe', ['-NoLogo', '-Command', 'echo abi-ok'], {
    name: 'xterm-256color',
    cols: 80,
    rows: 24,
    cwd: process.cwd(),
    env: process.env
  });
  let out = '';
  p.onData((d) => {
    out += d;
  });
  p.onExit(() => {
    report = {
      ok: out.includes('abi-ok'),
      electronAbi: process.versions.modules,
      electron: process.versions.electron,
      node: process.versions.node
    };
    process.parentPort.postMessage(report);
    process.exit(0);
  });
} catch (err) {
  process.parentPort.postMessage({ ok: false, error: String(err && err.message) });
  process.exit(0);
}
