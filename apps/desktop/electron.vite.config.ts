import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';

/**
 * Só em dev (serve): o preamble inline do react-refresh precisa de
 * 'unsafe-inline' no script-src da meta CSP. O build de produção não passa
 * por aqui — a CSP estrita do index.html permanece intacta no empacotado.
 */
function relaxCspForDev(): Plugin {
  return {
    name: 'cockpit-dev-csp',
    apply: 'serve',
    transformIndexHtml(html) {
      return html.replace("script-src 'self'", "script-src 'self' 'unsafe-inline'");
    }
  };
}

const shared = resolve(__dirname, '../../packages/shared/src');
const ui = resolve(__dirname, '../../packages/ui/src');
const ptyHost = resolve(__dirname, '../../packages/pty-host/src');
const core = resolve(__dirname, '../../packages/core/src');
const adapterContract = resolve(__dirname, '../../packages/adapter-contract/src');
const adapterShell = resolve(__dirname, '../../packages/adapters/shell/src');

export default defineConfig({
  main: {
    resolve: {
      alias: {
        '@cockpit/shared': shared,
        '@cockpit/pty-host': ptyHost,
        '@cockpit/core': core,
        '@cockpit/adapter-contract': adapterContract,
        '@cockpit/adapter-shell': adapterShell
      }
    },
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/index.ts'),
          // PTY Host roda como utilityProcess — entry próprio em out/main/pty-host.js
          'pty-host': resolve(ptyHost, 'host-entry.ts'),
          // Smoke de persistência (Story 1.4, AC4) — roda sob ABI do Electron
          'persist-smoke': resolve(__dirname, 'src/main/persist-smoke.ts'),
          // Smoke de diagnóstico do canal binário (host → MessagePort)
          'dataflow-smoke': resolve(__dirname, 'src/main/dataflow-smoke.ts')
        },
        // Módulos nativos: carregados em runtime (utilityProcess / Main), nunca bundled.
        external: ['node-pty', 'better-sqlite3']
      }
    }
  },
  preload: {
    resolve: { alias: { '@cockpit/shared': shared } }
  },
  renderer: {
    plugins: [react(), relaxCspForDev()],
    resolve: { alias: { '@cockpit/shared': shared, '@cockpit/ui': ui } }
  }
});
