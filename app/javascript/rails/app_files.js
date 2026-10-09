// Every Rails source file, keyed by its path under Rails.root (/demo) in Ruby/Wasm.
// tests/support/rails_app.mjs mounts the same directories for the Node tests.
const sources = import.meta.glob(
  ['/app/{controllers,helpers,models,views}/**/*', '/config/**/*', '/db/**/*', '/lib/**/*', '/vendor/**/*.rb'],
  { query: '?raw', import: 'default', eager: true }
);

export const RAILS_ROOT = '/demo';
export const appFiles = Object.fromEntries(
  Object.entries(sources).map(([path, source]) => [RAILS_ROOT + path, source])
);
