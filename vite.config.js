import { defineConfig } from 'vite';
// GitHub Pages project sites live under /ruby-kaigi-lab/.
// Neither the dev nor preview server adds COOP/COEP: CI tests Pages conditions.
export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  optimizeDeps: { exclude: ['@electric-sql/pglite', '@duckdb/duckdb-wasm'] },
  worker: { format: 'es' },
  build: { target: 'es2022' }
});
