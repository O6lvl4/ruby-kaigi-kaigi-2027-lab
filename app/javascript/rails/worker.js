// Runs Ruby/Wasm + Rails off the main thread. Messages: boot, probe_rails, request, close.
// Modes:
//   'guide' reading pages on Ruby 4.0.7 + Rails 8.1.4 (./guide_runtime.js), no database
//   'probe' the same runtime, Ruby only until probe_rails (runtime-check.html)
//   'lab'   Rails 8.0 + Active Record + PGlite on the wasmify-rails runtime
import { appFiles, RAILS_ROOT } from './app_files.js';
import { bootGuideRuntime } from './guide_runtime.js';

const LAB_RUNTIME_URL = `${import.meta.env.BASE_URL}base-app.wasm?release=28acbb22`;

let vm;
let db;
let applicationLoaded = false;
const progress = message => postMessage({ type: 'progress', message });

async function bootLab() {
  const [{ PGlite }, { initRailsVM, registerPGliteWasmInterface }] = await Promise.all([
    import('@electric-sql/pglite'),
    import('wasmify-rails')
  ]);
  progress('PGlite / IndexedDB を起動中…');
  db = new PGlite('idb://rubykaigi-miyazaki-v1', { relaxedDurability: false });
  await db.waitReady;
  await db.exec('SET standard_conforming_strings = on');
  registerPGliteWasmInterface(self, db);
  vm = await initRailsVM(LAB_RUNTIME_URL, {
    skipInitialize: true,
    async: true,
    env: [],
    database: { adapter: 'pglite' },
    progressCallback: progress
  });
  progress('Ruby の起動完了。Rails のファイルを準備しています…');
  // wasmify's VM has its own writable FS: copy the app in through Ruby.
  self.appFiles = JSON.stringify(appFiles);
  await vm.evalAsync(
    `require 'json'; require 'fileutils'; JSON.parse(JS.global[:appFiles].to_s).each { |path, content| FileUtils.mkdir_p(File.dirname(path)); File.write(path, content) }`
  );
  self.appFiles = null;
}

async function boot(mode) {
  if (mode === 'lab') await bootLab();
  else
    vm = await bootGuideRuntime({
      files: appFiles,
      mountPoint: RAILS_ROOT,
      env: { GUIDE_ONLY: '1' },
      onProgress: progress
    });
  if (mode !== 'probe') await loadApplication();
  const railsLoaded = (await vm.evalAsync('defined?(Rails).to_s')).toString() !== '';
  return { ready: true, railsLoaded };
}

async function loadApplication() {
  if (applicationLoaded) return;
  if (!vm) throw new Error('Ruby is not initialized');
  progress('Rails ライブラリを読み込んでいます…');
  await vm.evalAsync(`load '${RAILS_ROOT}/config/environment.rb'`);
  applicationLoaded = true;
  progress('Rails の準備完了');
}

async function handle({ type, request, mode }) {
  switch (type) {
    case 'boot':
      return boot(mode);
    case 'probe_rails':
      await loadApplication();
      return { ready: true };
    case 'request':
      self.railsRequest = JSON.stringify(request);
      return JSON.parse((await vm.evalAsync('WasmRequestBridge.call')).toString());
    case 'close':
      await db?.close();
      return { closed: true };
    default:
      throw new Error(`Unknown message: ${type}`);
  }
}

let queue = Promise.resolve();
self.onmessage = ({ data }) => {
  queue = queue.then(async () => {
    try {
      postMessage({ id: data.id, result: await handle(data) });
    } catch (error) {
      console.error(error);
      postMessage({ id: data.id, error: error.message || String(error) });
    }
  });
};
