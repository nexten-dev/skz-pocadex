import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));

/** Grava a versão do app no service worker, para que cada versão tenha seu próprio cache. */
function serviceWorkerVersion(): Plugin {
  let outDir = 'dist';
  return {
    name: 'sw-version',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const file = resolve(outDir, 'sw.js');
      if (existsSync(file)) {
        writeFileSync(file, readFileSync(file, 'utf-8').replaceAll('__APP_VERSION__', pkg.version));
      }
    },
  };
}

// Mesma porta no modo normal e no modo dev: o navegador guarda a coleção
// por endereço, então usar sempre localhost:4173 mantém a mesma coleção.
const PORT = 4173;

export default defineConfig({
  // Caminho relativo: funciona em GitHub Pages, Netlify ou qualquer subpasta.
  base: './',
  plugins: [react(), serviceWorkerVersion()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  server: { port: PORT, strictPort: true },
  preview: { port: PORT, strictPort: true },
});
