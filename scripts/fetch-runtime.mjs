// Downloads the checksum-pinned Ruby 4.0.7 / Rails 8.1.4 runtime into public/.
// It is built from wasm/ by CI and published as a GitHub Release asset (see docs/runtime.md).
// Nothing is executed unless its SHA-256 matches. Bump the pin only after review.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { RAILS_RUNTIME } from './rails-runtime.mjs';

const sha = buffer => createHash('sha256').update(buffer).digest('hex');

async function readIfPresent(path) {
  try {
    return await readFile(path);
  } catch {
    return null;
  }
}

await mkdir('public', { recursive: true });
const local = await readIfPresent(RAILS_RUNTIME.path);
if (local && sha(local) === RAILS_RUNTIME.sha256) {
  console.log('Verified Rails runtime already present');
} else {
  console.log('Downloading checksum-pinned Ruby 4.0.7 / Rails 8.1.4 runtime…');
  const response = await fetch(RAILS_RUNTIME.url);
  if (!response.ok) throw new Error(`Download failed: ${response.status} ${RAILS_RUNTIME.url}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (sha(bytes) !== RAILS_RUNTIME.sha256)
    throw new Error('Runtime checksum changed; do not execute it until reviewed');
  await writeFile(RAILS_RUNTIME.path, bytes);
  console.log(`Verified Rails runtime: ${bytes.length} bytes; SHA256 ${RAILS_RUNTIME.sha256}`);
}
