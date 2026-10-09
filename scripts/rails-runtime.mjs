// The pinned Ruby 4.0.7 / Rails 8.1.4 runtime: where it comes from and what it must hash to.
// Also update RAILS_RUNTIME_URL/BYTES in app/javascript/rails/rails_runtime.js when bumping.
export const RAILS_RUNTIME = {
  path: 'public/rails-runtime.wasm',
  url: 'https://github.com/O6lvl4/ruby-kaigi-kaigi-2027-lab/releases/download/rails-runtime-r2/rails-runtime.wasm',
  sha256: 'b28170cc9fd57c515154116c4507cb6a31451f90e534f3ec994b9df0e85aa164'
};
