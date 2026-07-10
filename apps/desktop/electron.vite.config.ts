import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

const shared = resolve(__dirname, '../../packages/shared/src');

export default defineConfig({
  main: {
    resolve: { alias: { '@cockpit/shared': shared } }
  },
  preload: {
    resolve: { alias: { '@cockpit/shared': shared } }
  },
  renderer: {
    plugins: [react()],
    resolve: { alias: { '@cockpit/shared': shared } }
  }
});
