// Exposes PGlite to the Ruby PGlite adapter (vendor/pglite_adapter.rb) as `pglite4rails`.
// Adapted from wasmify-rails (MIT, © 2024 Vladimir Dementyev; see vendor/LICENSE.wasmify-rails).
export function registerPGliteInterface(scope, db, name = 'pglite4rails') {
  scope[name] = {
    query: (sql, params) => db.query(sql, params)
  };
}
