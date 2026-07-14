import { app } from 'electron';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { PtyHostManager } from './pty-host-manager';

/**
 * Smoke de diagnóstico: valida o canal binário host→MessagePort SEM renderer.
 * Se os bytes chegam aqui, o problema está no lado renderer; senão, no host.
 */

app.whenReady().then(async () => {
  const manager = new PtyHostManager();
  manager.start();
  const dir = join(app.getPath('temp'), 'cockpit-dataflow-smoke');
  mkdirSync(dir, { recursive: true });
  manager.configure({ scrollbackDir: dir, maxFileBytes: 1024 * 1024, restoreTailBytes: 1024 });

  try {
    const created = await manager.createPty({ sessionId: 'probe-1', cols: 80, rows: 24 });
    let received = '';
    const decoder = new TextDecoder();
    created.rendererPort.on('message', (e) => {
      received += decoder.decode(e.data as Uint8Array);
    });
    created.rendererPort.start();

    await sleep(4000);
    const gotPrompt = received.length > 0;

    // input roundtrip
    created.rendererPort.postMessage(new TextEncoder().encode('echo dataflow-ok\r'));
    await sleep(3000);
    const gotEcho = received.includes('dataflow-ok');

    await manager.closePty(created.ptyId);
    await manager.shutdown();

    console.log(
      '[dataflow-smoke]',
      JSON.stringify({ ok: gotPrompt && gotEcho, bytes: received.length, gotPrompt, gotEcho })
    );
    app.exit(gotPrompt && gotEcho ? 0 : 1);
  } catch (err) {
    console.error('[dataflow-smoke] erro:', err instanceof Error ? err.message : err);
    app.exit(1);
  }
});

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
