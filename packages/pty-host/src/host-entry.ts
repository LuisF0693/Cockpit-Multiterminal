/**
 * Entry do PTY Host — roda DENTRO de um utilityProcess do Electron.
 * Isolamento de crash: PTY caiu ≠ UI caiu. Bundled como entry separado
 * do build main (electron-vite); node-pty fica external (nativo).
 *
 * Story 2.1: o spawn passa pelo AdapterRegistry (decisão crítica 3) —
 * este entry não conhece providers, só o contrato AgentSession.
 *
 * Backpressure (AC3 da 1.2): o contrato não expõe pause/resume do PTY,
 * então o host segura chunks em buffer quando o renderer acumula bytes
 * não confirmados acima de HIGH_WATER, drenando conforme os acks chegam.
 */
import { join } from 'node:path';
import type { AgentSession } from '@cockpit/adapter-contract';
import { ShellAdapter } from '@cockpit/adapter-shell';
import { ClaudeCodeAdapter } from '@cockpit/adapter-claude-code';
import { CodexAdapter } from '@cockpit/adapter-codex';
import { GrokAdapter } from '@cockpit/adapter-grok';
import { GeminiCliAdapter } from '@cockpit/adapter-gemini-cli';
import { AntigravityAdapter } from '@cockpit/adapter-antigravity';
import { OllamaAdapter } from '@cockpit/adapter-ollama';
import { AdapterRegistry } from './adapter-registry';
import { ScrollbackWriter, readScrollbackTail } from './scrollback-writer';
import type { HostInbound, HostOutbound } from './protocol';

const HIGH_WATER_BYTES = 512 * 1024;
const LOW_WATER_BYTES = 128 * 1024;
const DEFAULT_ADAPTER = 'shell';

/** Tipagem mínima do parentPort/MessagePortMain (evita dep de 'electron' aqui). */
interface PortMainLike {
  on(event: 'message', cb: (e: { data: unknown; ports: PortMainLike[] }) => void): void;
  postMessage(message: unknown): void;
  start(): void;
  close(): void;
}

const parentPort = (process as unknown as { parentPort: PortMainLike }).parentPort;

const registry = new AdapterRegistry();
// 'shell' = PowerShell (id histórico, compatível com sessões persistidas)
registry.register(new ShellAdapter());
registry.register(new ShellAdapter({ id: 'cmd', displayName: 'CMD', shell: 'cmd.exe' }));
registry.register(new ClaudeCodeAdapter());
registry.register(new CodexAdapter());
registry.register(new GrokAdapter());
registry.register(new GeminiCliAdapter());
registry.register(new AntigravityAdapter());
registry.register(new OllamaAdapter());

interface HostedSession {
  session: AgentSession;
  port: PortMainLike;
  writer: ScrollbackWriter | null;
  unsubscribes: Array<() => void>;
}

const sessions = new Map<string, HostedSession>();
let seq = 0;

/** Config de scrollback (Story 1.4) — chega via mensagem 'configure'. */
let scrollbackConfig: { dir: string; maxFileBytes: number; restoreTailBytes: number } | null = null;

function scrollbackPath(tag: string): string | null {
  return scrollbackConfig ? join(scrollbackConfig.dir, `${tag}.log`) : null;
}

function send(msg: HostOutbound): void {
  parentPort.postMessage(msg);
}

function wireDataChannel(
  id: string,
  hosted: HostedSession,
  tag: string,
  restore: boolean
): void {
  const { session, port } = hosted;
  let outstanding = 0;
  let holding: Uint8Array[] = [];

  // Scrollback persistido (AC3 da 1.4): seed do tail salvo ANTES do stream vivo.
  const file = scrollbackPath(tag);
  if (file && restore && scrollbackConfig) {
    const tail = readScrollbackTail(file, scrollbackConfig.restoreTailBytes);
    if (tail.byteLength > 0) {
      outstanding += tail.byteLength;
      port.postMessage(tail);
    }
  }
  hosted.writer = file ? new ScrollbackWriter(file, scrollbackConfig?.maxFileBytes) : null;

  const deliver = (chunk: Uint8Array): void => {
    outstanding += chunk.byteLength;
    port.postMessage(chunk);
  };

  hosted.unsubscribes.push(
    session.onData((chunk) => {
      const bytes = new Uint8Array(chunk);
      hosted.writer?.append(bytes);
      if (outstanding > HIGH_WATER_BYTES) {
        holding.push(bytes);
        return;
      }
      deliver(bytes);
    })
  );

  hosted.unsubscribes.push(
    session.onStatus((status, detail) => {
      send({ type: 'session-status', id, status, ...(detail !== undefined ? { detail } : {}) });
    })
  );

  hosted.unsubscribes.push(
    session.onExit((code) => {
      send({ type: 'session-exit', id, exitCode: code ?? -1 });
      disposeWiring(id);
      port.close();
    })
  );

  port.on('message', (e) => {
    const payload = e.data;
    if (payload instanceof Uint8Array) {
      // Input de teclado do renderer (binário, caminho inverso).
      session.write(Buffer.from(payload).toString('utf8'));
      return;
    }
    if (isAck(payload)) {
      outstanding = Math.max(0, outstanding - payload.n);
      while (holding.length > 0 && outstanding < LOW_WATER_BYTES) {
        const next = holding.shift()!;
        deliver(next);
      }
      if (holding.length === 0) holding = [];
    }
  });
  port.start();
}

function disposeWiring(id: string): void {
  const hosted = sessions.get(id);
  if (!hosted) return;
  for (const unsub of hosted.unsubscribes) unsub();
  hosted.unsubscribes.length = 0;
  hosted.writer?.dispose();
  hosted.writer = null;
  sessions.delete(id);
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
    case 'configure': {
      scrollbackConfig = {
        dir: msg.scrollbackDir,
        maxFileBytes: msg.maxFileBytes,
        restoreTailBytes: msg.restoreTailBytes
      };
      break;
    }
    case 'create': {
      const port = e.ports[0];
      void (async () => {
        try {
          if (!port) throw new Error('create sem MessagePort transferida');
          const adapter = registry.get(msg.adapterId ?? DEFAULT_ADAPTER);
          const session = await adapter.spawn({
            cwd: msg.cwd ?? process.cwd(),
            cols: msg.cols,
            rows: msg.rows,
            ...(msg.args !== undefined ? { args: msg.args } : {})
          });
          const id = `pty-${++seq}`;
          const hosted: HostedSession = { session, port, writer: null, unsubscribes: [] };
          sessions.set(id, hosted);
          wireDataChannel(id, hosted, msg.tag, msg.restore === true);
          send({ type: 'created', requestId: msg.requestId, id, pid: session.pid });
        } catch (err) {
          send({
            type: 'create-error',
            requestId: msg.requestId,
            message: err instanceof Error ? err.message : String(err)
          });
        }
      })();
      break;
    }
    case 'resize': {
      sessions.get(msg.id)?.session.resize(msg.cols, msg.rows);
      break;
    }
    case 'close': {
      const hosted = sessions.get(msg.id);
      if (!hosted) {
        send({ type: 'closed', requestId: msg.requestId, id: msg.id, orphan: false });
        break;
      }
      void hosted.session
        .dispose()
        .then(() => send({ type: 'closed', requestId: msg.requestId, id: msg.id, orphan: false }))
        .catch(() => send({ type: 'closed', requestId: msg.requestId, id: msg.id, orphan: true }))
        .finally(() => {
          const port = sessions.get(msg.id)?.port ?? hosted.port;
          disposeWiring(msg.id);
          port.close();
        });
      break;
    }
    case 'list-adapters': {
      send({ type: 'adapters', requestId: msg.requestId, adapters: registry.list() });
      break;
    }
    case 'write': {
      sessions.get(msg.id)?.session.write(msg.text);
      break;
    }
    case 'shutdown': {
      void (async () => {
        let orphans = 0;
        for (const [id, hosted] of [...sessions.entries()]) {
          try {
            await hosted.session.dispose();
          } catch {
            orphans++;
          }
          disposeWiring(id);
        }
        if (orphans > 0) console.error(`[pty-host] órfãos no shutdown: ${orphans}`);
        process.exit(orphans > 0 ? 1 : 0);
      })();
      break;
    }
  }
});
