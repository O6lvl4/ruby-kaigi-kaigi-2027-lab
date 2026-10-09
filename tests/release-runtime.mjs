import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { sections, stripDebug } from '../scripts/strip-runtime.mjs';
const bytes = await readFile('public/base-app.wasm');
assert.equal(
  createHash('sha256').update(bytes).digest('hex'),
  '28acbb22c853454d6b392dd4838f85051eff9d37ad0870c44ac75c17288d9e56'
);
assert.equal(bytes.length, 65019499);
assert.ok(WebAssembly.validate(bytes));
assert.ok(
  sections(bytes).some(s => s.name === 'name'),
  'Retain function names for diagnostics'
);
assert.ok(!sections(bytes).some(s => s.name.startsWith('.debug_')));
assert.deepEqual(stripDebug(bytes), bytes, 'Release transformation must be idempotent');
assert.throws(() => stripDebug(Buffer.from([0, 1, 2])));
console.log('PASS checksum-pinned release artifact:65,019,499bytes, no DWARF, valid Wasm, names retained');

// Guide runtime: Ruby 4.0.7 + Rails 8.1.4 from the guide-runtime-r1 Release (wasm/).
const guide = await readFile('public/guide-runtime.wasm');
assert.equal(
  createHash('sha256').update(guide).digest('hex'),
  '58e96a8136fd5d7d3e4404bec051e50064bf53c3714688219c7234ee256a416a'
);
assert.ok(WebAssembly.validate(guide));
const guideExports = WebAssembly.Module.exports(await WebAssembly.compile(guide)).map(entry => entry.name);
for (const name of ['asyncify_start_unwind', 'asyncify_stop_unwind', 'asyncify_start_rewind', 'asyncify_stop_rewind']) {
  assert.ok(guideExports.includes(name), `Guide runtime must keep ${name} for Ruby fibers/exceptions`);
}
console.log(
  `PASS checksum-pinned guide runtime: ${guide.length.toLocaleString('en')} bytes, valid Wasm, Asyncify exports present`
);
