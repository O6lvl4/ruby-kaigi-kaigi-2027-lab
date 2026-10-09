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
