// Downloads the two checksum-pinned Ruby/Wasm runtimes into public/.
//
//   guide-runtime.wasm  Ruby 4.0.7 + Rails 8.1.4, built from wasm/ by CI and published
//                       as a GitHub Release asset (see wasm/README.md)
//   base-app.wasm       Ruby 3.3.3 + Rails 8.0.1 wasmify-rails sample, used by the lab only;
//                       DWARF sections are stripped locally and verified byte-for-byte
//
// Nothing is executed unless its SHA-256 matches. Bump hashes only after review.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { stripDebug, sections } from './strip-runtime.mjs';

export const GUIDE_RUNTIME = {
  path: 'public/guide-runtime.wasm',
  url: 'https://github.com/O6lvl4/ruby-kaigi-kaigi-2027-lab/releases/download/guide-runtime-r1/guide-runtime.wasm',
  sha256: '58e96a8136fd5d7d3e4404bec051e50064bf53c3714688219c7234ee256a416a'
};

const LAB_RUNTIME = {
  path: 'public/base-app.wasm',
  url: 'https://rails-blog-on-wasm.vladem.com/app.wasm',
  upstreamSha256: 'de9cc366e32e24a13b58b7bf1409744fd50159d6554f8575fc325a5a4b3605d4',
  sha256: '28acbb22c853454d6b392dd4838f85051eff9d37ad0870c44ac75c17288d9e56'
};

const sha = buffer => createHash('sha256').update(buffer).digest('hex');
const coreSections = bytes =>
  Buffer.concat(
    sections(bytes)
      .filter(section => section.id !== 0)
      .map(section => section.bytes)
  );

async function readIfPresent(path) {
  try {
    return await readFile(path);
  } catch {
    return null;
  }
}

async function download(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed: ${response.status} ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

async function fetchGuideRuntime() {
  const local = await readIfPresent(GUIDE_RUNTIME.path);
  if (local && sha(local) === GUIDE_RUNTIME.sha256) return console.log('Verified guide runtime already present');
  console.log('Downloading checksum-pinned Ruby 4.0.7 / Rails 8.1.4 guide runtime…');
  const bytes = await download(GUIDE_RUNTIME.url);
  if (sha(bytes) !== GUIDE_RUNTIME.sha256)
    throw new Error('Guide runtime checksum changed; do not execute it until reviewed');
  await writeFile(GUIDE_RUNTIME.path, bytes);
  console.log(`Verified guide runtime: ${bytes.length} bytes; SHA256 ${GUIDE_RUNTIME.sha256}`);
}

async function fetchLabRuntime() {
  let bytes = await readIfPresent(LAB_RUNTIME.path);
  if (bytes && sha(bytes) === LAB_RUNTIME.sha256) return console.log('Verified lab runtime already present');
  if (!bytes || sha(bytes) !== LAB_RUNTIME.upstreamSha256) {
    console.log('Downloading checksum-pinned upstream lab Ruby/Rails runtime…');
    bytes = await download(LAB_RUNTIME.url);
  }
  if (sha(bytes) !== LAB_RUNTIME.upstreamSha256)
    throw new Error('Upstream runtime checksum changed; do not execute it until reviewed');
  const optimized = stripDebug(bytes);
  if (sha(optimized) !== LAB_RUNTIME.sha256) throw new Error('Release runtime checksum did not match');
  if (!coreSections(bytes).equals(coreSections(optimized))) throw new Error('Executable/data sections changed');
  await writeFile(LAB_RUNTIME.path, optimized);
  console.log(
    `Verified lab runtime: ${bytes.length} → ${optimized.length} bytes; executable/data sections byte-identical; SHA256 ${LAB_RUNTIME.sha256}`
  );
}

await mkdir('public', { recursive: true });
await fetchGuideRuntime();
await fetchLabRuntime();
