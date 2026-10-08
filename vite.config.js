import { defineConfig } from 'vite';
import { resolve } from 'node:path';
// GitHub Pages project sites live under /ruby-kaigi-lab/.
// Neither the dev nor preview server adds COOP/COEP: CI tests Pages conditions.
export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  optimizeDeps: { exclude: ['@electric-sql/pglite', '@duckdb/duckdb-wasm'] },
  worker: { format: 'es' },
  build: { target: 'es2022', rollupOptions: { input: { summary: resolve('index.html'), lab: resolve('lab.html') } } }
});
