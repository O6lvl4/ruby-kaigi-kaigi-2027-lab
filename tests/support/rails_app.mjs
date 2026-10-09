// Boots the real Rails app (app/, config/, db/, lib/, vendor/) inside Ruby/Wasm on Node.
// Mirrors app/javascript/rails/app_files.js, which does the same for the browser worker.
//
//   runtime 'guide': public/guide-runtime.wasm (Ruby 4.0.7 + Rails 8.1.4, ruby.wasm 2.10.1)
//   runtime 'lab':   public/base-app.wasm (Ruby 3.3.3 + Rails 8.0.1, wasmify-rails)
import { mkdtemp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { WASI } from 'node:wasi';
import { RubyVM } from '@ruby/wasm-wasi-2.10';
import { initRailsVM } from 'wasmify-rails';

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

// Ruby 4.0.7 guide runtime: the app is copied to a temporary directory mounted at /demo.
async function bootGuideRuntime() {
  const mount = await mkdtemp(join(tmpdir(), 'rails-guide-'));
  for (const [path, source] of Object.entries(await railsAppFiles())) {
    const target = join(mount, path.slice(RAILS_ROOT.length));
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, source);
  }
  const module = await WebAssembly.compile(await readFile('public/guide-runtime.wasm'));
  const wasi = new WASI({
    version: 'preview1',
    returnOnExit: true,
    env: { GUIDE_ONLY: '1', RAILS_ENV: 'production' },
    preopens: { [RAILS_ROOT]: mount }
  });
  const { vm } = await RubyVM.instantiateModule({ module, wasip1: wasi });
  await vm.evalAsync(`load '${RAILS_ROOT}/config/environment.rb'`);
  return vm;
}

// Ruby 3.3.3 lab runtime: files are written through Ruby into wasmify's in-memory FS.
async function bootLabRuntime({ guideOnly, database }) {
  const module = await WebAssembly.compile(await readFile('public/base-app.wasm'));
  const vm = await initRailsVM(module, {
    skipInitialize: true,
    async: true,
    env: guideOnly ? ['GUIDE_ONLY=1'] : [],
    ...(database ? { database } : {})
  });
  globalThis.appFiles = JSON.stringify(await railsAppFiles());
  await vm.evalAsync(
    `require 'json'; require 'fileutils'; JSON.parse(JS.global[:appFiles].to_s).each { |path, content| FileUtils.mkdir_p(File.dirname(path)); File.write(path, content) }; load '${RAILS_ROOT}/config/environment.rb'`
  );
  globalThis.appFiles = null;
  return vm;
}

export async function bootRails({ runtime = 'guide', guideOnly = true, database } = {}) {
  const vm = runtime === 'guide' ? await bootGuideRuntime() : await bootLabRuntime({ guideOnly, database });
  async function request(method, path, { accept = 'application/json', body, scriptName } = {}) {
    globalThis.railsRequest = JSON.stringify({ method, path, accept, body, scriptName });
    return JSON.parse((await vm.evalAsync('WasmRequestBridge.call')).toString());
  }
  return { vm, request, get: (path, accept) => request('GET', path, { accept }) };
}
