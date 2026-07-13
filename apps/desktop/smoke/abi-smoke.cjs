/**
 * Smoke ABI (Story 1.2, Task 0): valida require('node-pty') dentro de um
 * utilityProcess do Electron — o mesmo ambiente do PTY Host de produção.
 * Uso: pnpm --filter @cockpit/desktop smoke:abi
 * Exit 0 = ABI ok; exit != 0 = incompatibilidade (rodar rebuild:native).
 */
const { app, utilityProcess } = require('electron');
const path = require('node:path');

app.whenReady().then(() => {
  const child = utilityProcess.fork(path.join(__dirname, 'abi-smoke-child.cjs'));

  const timeout = setTimeout(() => {
    console.error('[abi-smoke] timeout aguardando o utilityProcess');
    app.exit(1);
  }, 20000);

  child.on('message', (msg) => {
    clearTimeout(timeout);
    console.log('[abi-smoke]', JSON.stringify(msg));
    app.exit(msg.ok ? 0 : 1);
  });

  child.on('exit', (code) => {
    if (code !== 0) {
      clearTimeout(timeout);
      console.error(`[abi-smoke] utilityProcess saiu com código ${code} antes de reportar`);
      app.exit(1);
    }
  });
});
