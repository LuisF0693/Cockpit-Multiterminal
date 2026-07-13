/**
 * Entry do PTY Host — roda DENTRO de um utilityProcess do Electron.
 * Isolamento de crash: PTY caiu ≠ UI caiu. Bundled como entry separado
 * do build main (electron-vite); node-pty fica external (nativo).
 *
 * Backpressure (AC3): pausa o PTY quando o renderer acumula bytes não
 * confirmados acima de HIGH_WATER; retoma abaixo de LOW_WATER. O renderer
 * confirma consumo com mensagens {t:'ack', n} no callback do xterm.write.
 */
import { spawn as ptySpawn } from 'node-pty';
import { PtySessionManager, type PtyLike, type PtySpawnOptions } from './session-manager';
import type { HostInbound, HostOutbound } from './protocol';

const HIGH_WATER_BYTES = 512 * 1024;
const LOW_WATER_BYTES = 128 * 1024;

/** Tipagem mínima do parentPort/MessagePortMain (evita dep de 'electron' aqui). */
interface PortMainLike {
  on(event: 'message', cb: (e: { data: unknown; ports: PortMainLike[] }) => void): void;
  postMessage(message: unknown): void;
  start(): void;
  close(): void;
}

const parentPort = (process as unknown as { parentPort: PortMainLike }).parentPort;

const spawnFn = (opts: PtySpawnOptions): PtyLike =>
  ptySpawn(opts.shell, opts.args, {
    name: 'xterm-256color',
    cols: opts.cols,
    rows: opts.rows,
    cwd: opts.cwd,
    env: opts.env
  });

const manager = new PtySessionManager(spawnFn);
const dataPorts = new Map<string, PortMainLike>();

function send(msg: HostOutbound): void {
  parentPort.postMessage(msg);
}

function wireDataChannel(id: string, port: PortMainLike): void {
  dataPorts.set(id, port);
  let outstanding = 0;
  let paused = false;
  const encoder = new TextEncoder();

  manager.onData(id, (data) => {
    const chunk = encoder.encode(data);
    outstanding += chunk.byteLength;
    port.postMessage(chunk);
    if (!paused && outstanding > HIGH_WATER_BYTES) {
      paused = true;
      manager.pause(id);
    }
  });

  manager.onExit(id, ({ exitCode }) => {
    send({ type: 'session-exit', id, exitCode });
    port.close();
    dataPorts.delete(id);
  });

  port.on('message', (e) => {
    const payload = e.data;
    if (payload instanceof Uint8Array) {
      // Input de teclado do renderer (binário, caminho inverso).
      manager.write(id, Buffer.from(payload).toString('utf8'));
      return;
    }
    if (isAck(payload)) {
      outstanding = Math.max(0, outstanding - payload.n);
      if (paused && outstanding < LOW_WATER_BYTES) {
        paused = false;
        manager.resume(id);
      }
    }
  });
  port.start();
}

function isAck(value: unknown): value is { t: 'ack'; n: number } {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { t?: unknown }).t === 'ack' &&
    typeof (value as { n?: unknown }).n === 'number'
  );
}

parentPort.on('message', (e) => {
  const msg = e.data as HostInbound;
  switch (msg.type) {
    case 'create': {
      try {
        const port = e.ports[0];
        if (!port) throw new Error('create sem MessagePort transferida');
        const created = manager.create({
          cols: msg.cols,
          rows: msg.rows,
          ...(msg.shell !== undefined ? { shell: msg.shell } : {}),
          ...(msg.cwd !== undefined ? { cwd: msg.cwd } : {})
        });
        wireDataChannel(created.id, port);
        send({ type: 'created', requestId: msg.requestId, id: created.id, pid: created.pid });
      } catch (err) {
        send({
          type: 'create-error',
          requestId: msg.requestId,
          message: err instanceof Error ? err.message : String(err)
        });
      }
      break;
    }
    case 'resize': {
      if (manager.has(msg.id)) manager.resize(msg.id, msg.cols, msg.rows);
      break;
    }
    case 'close': {
      void manager.dispose(msg.id).then(({ orphan }) => {
        dataPorts.get(msg.id)?.close();
        dataPorts.delete(msg.id);
        send({ type: 'closed', requestId: msg.requestId, id: msg.id, orphan });
      });
      break;
    }
    case 'shutdown': {
      void manager.disposeAll().then(({ orphans }) => {
        if (orphans.length > 0) {
          console.error(`[pty-host] órfãos no shutdown: ${orphans.join(', ')}`);
        }
        process.exit(orphans.length > 0 ? 1 : 0);
      });
      break;
    }
  }
});
