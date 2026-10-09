// The checksum-pinned Ruby 4.0.7 / Rails 8.1.4 runtime from the rails-runtime-r2 Release (wasm/).
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { RAILS_RUNTIME } from '../scripts/rails-runtime.mjs';

const runtime = await readFile(RAILS_RUNTIME.path);
assert.equal(createHash('sha256').update(runtime).digest('hex'), RAILS_RUNTIME.sha256);
assert.ok(WebAssembly.validate(runtime));
const exports = WebAssembly.Module.exports(await WebAssembly.compile(runtime)).map(entry => entry.name);
for (const name of ['asyncify_start_unwind', 'asyncify_stop_unwind', 'asyncify_start_rewind', 'asyncify_stop_rewind']) {
  assert.ok(exports.includes(name), `The runtime must keep ${name} for Ruby fibers/exceptions`);
}
console.log(
  `PASS checksum-pinned Rails runtime: ${runtime.length.toLocaleString('en')} bytes, valid Wasm, Asyncify exports present`
);
