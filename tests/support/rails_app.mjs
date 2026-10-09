// Boots the real Rails app (app/, config/, db/, lib/, vendor/) inside Ruby/Wasm on Node.
// Mirrors app/javascript/rails/app_files.js, which does the same for the browser worker.
import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { initRailsVM } from 'wasmify-rails';

const RAILS_DIRS = ['app/controllers', 'app/helpers', 'app/models', 'app/views', 'config', 'db', 'lib', 'vendor'];
const RAILS_ROOT = '/demo';

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
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

export async function bootRails({ guideOnly = true, database } = {}) {
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
  async function request(method, path, { accept = 'application/json', body, scriptName } = {}) {
    globalThis.railsRequest = JSON.stringify({ method, path, accept, body, scriptName });
    return JSON.parse((await vm.evalAsync('WasmRequestBridge.call')).toString());
  }
  return { vm, request, get: (path, accept) => request('GET', path, { accept }) };
}
