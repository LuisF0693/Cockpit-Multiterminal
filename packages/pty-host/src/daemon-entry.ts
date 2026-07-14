import { ShellAdapter } from '@cockpit/adapter-shell';
import { ClaudeCodeAdapter } from '@cockpit/adapter-claude-code';
import { CodexAdapter } from '@cockpit/adapter-codex';
import { GrokAdapter } from '@cockpit/adapter-grok';
import { AdapterRegistry } from './adapter-registry';
import { DaemonServer } from './daemon-server';
import { DEFAULT_DAEMON_PIPE } from './daemon-protocol';

/**
 * Entry do cockpit-daemon (Story 6.1) — processo standalone, FORA da árvore
 * do Electron. Mesmo conjunto de adapters do host-entry (NFR7: providers só
 * existem aqui). Uso: node daemon-entry.js [--pipe \\.\pipe\nome]
 */

function pipeFromArgv(argv: string[]): string {
  const idx = argv.indexOf('--pipe');
  return idx >= 0 && argv[idx + 1] ? argv[idx + 1]! : DEFAULT_DAEMON_PIPE;
}

export async function startDaemon(pipePath: string): Promise<DaemonServer> {
  const registry = new AdapterRegistry();
  // 'shell' = PowerShell (id histórico, compatível com sessões persistidas)
  registry.register(new ShellAdapter());
  registry.register(new ShellAdapter({ id: 'cmd', displayName: 'CMD', shell: 'cmd.exe' }));
  registry.register(new ClaudeCodeAdapter());
  registry.register(new CodexAdapter());
  registry.register(new GrokAdapter());

  const server = new DaemonServer(registry);
  await server.listen(pipePath);
  return server;
}

/* istanbul ignore next -- caminho de processo real; testes usam startDaemon */
if (process.argv[1]?.endsWith('daemon-entry.js') || process.argv.includes('--run-daemon')) {
  const pipePath = pipeFromArgv(process.argv);
  void startDaemon(pipePath).then((server) => {
    console.log(`[cockpit-daemon] escutando em ${pipePath} (pid ${process.pid})`);
    const graceful = (): void => {
      void server.shutdown().then((orphans) => process.exit(orphans > 0 ? 1 : 0));
    };
    process.on('SIGTERM', graceful);
    process.on('SIGINT', graceful);
  });
}
