import { defineConfig } from 'vite';
import { copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// GitHub Pages serves 404.html for unknown paths; a copy of the guide shell lets
// deep links such as /restaurants boot the app, whose router renders that page.
const pagesDeepLinkFallback = {
  name: 'pages-deep-link-fallback',
  apply: 'build',
  async closeBundle() {
    await copyFile(resolve('dist/index.html'), resolve('dist/404.html'));
  }
};

// GitHub Pages project sites live under /ruby-kaigi-kaigi-2027-lab/.
// Neither the dev nor preview server adds COOP/COEP: CI tests Pages conditions.
export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  optimizeDeps: { exclude: ['@electric-sql/pglite', '@duckdb/duckdb-wasm'] },
  worker: { format: 'es' },
  plugins: [pagesDeepLinkFallback],
  build: {
    target: 'es2022',
    rollupOptions: {
      input: { guide: resolve('index.html'), lab: resolve('lab.html'), 'runtime-check': resolve('runtime-check.html') }
    }
  }
});
