// Boots the real Rails app (app/, config/, db/, lib/, vendor/) on the Ruby 4.0.7 /
// Rails 8.1.4 runtime (public/rails-runtime.wasm) in Node. The app is copied to a
// temporary directory mounted at /demo, as app/javascript/rails/rails_runtime.js
// mounts it in the browser.
//
//   bootRails()            the guide, without a database
//   bootRails({ db })      the lab, with Active Record on the given PGlite
import { mkdtemp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { WASI } from 'node:wasi';
import { RubyVM } from '@ruby/wasm-wasi';
import { registerPGliteInterface } from '../../app/javascript/rails/pglite_interface.js';
import { RAILS_RUNTIME } from '../../scripts/rails-runtime.mjs';

const RAILS_DIRS = ['app/controllers', 'app/helpers', 'app/models', 'app/views', 'config', 'db', 'lib', 'vendor'];
const RAILS_ROOT = '/demo';

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (path === 'vendor/bundle') continue; // gems installed for the linters, not the app
    if (entry.isDirectory()) yield* walk(path);
    else yield path;
  }
}

export async function railsAppFiles() {
  const files = {};
  for (const dir of RAILS_DIRS) {
    for await (const path of walk(dir)) files[`${RAILS_ROOT}/${relative('.', path)}`] = await readFile(path, 'utf8');
  }
  return files;
}

async function mountApp() {
  const mount = await mkdtemp(join(tmpdir(), 'rails-app-'));
  for (const [path, source] of Object.entries(await railsAppFiles())) {
    const target = join(mount, path.slice(RAILS_ROOT.length));
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, source);
  }
  return mount;
}

export async function bootRails({ db } = {}) {
  if (db) registerPGliteInterface(globalThis, db);
  const module = await WebAssembly.compile(await readFile(RAILS_RUNTIME.path));
  const wasi = new WASI({
    version: 'preview1',
    returnOnExit: true,
    env: { RAILS_ENV: 'production', ...(db ? {} : { GUIDE_ONLY: '1' }) },
    preopens: { [RAILS_ROOT]: await mountApp() }
  });
  const { vm } = await RubyVM.instantiateModule({ module, wasip1: wasi });
  await vm.evalAsync(`load '${RAILS_ROOT}/config/environment.rb'`);
  async function request(method, path, { accept = 'application/json', body, scriptName } = {}) {
    globalThis.railsRequest = JSON.stringify({ method, path, accept, body, scriptName });
    return JSON.parse((await vm.evalAsync('WasmRequestBridge.call')).toString());
  }
  return { vm, request, get: (path, accept) => request('GET', path, { accept }) };
}
