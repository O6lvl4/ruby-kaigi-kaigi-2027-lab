// Runs Ruby 4.0.7 + Rails 8.1.4 off the main thread. Messages: boot, probe_rails, request, close.
// Modes:
//   'guide' the reading pages, without a database (GUIDE_ONLY=1)
//   'probe' Ruby only until probe_rails (runtime-check.html)
//   'lab'   Active Record + PGlite (IndexedDB) for lab.html
import { appFiles, RAILS_ROOT } from './app_files.js';
import { registerPGliteInterface } from './pglite_interface.js';
import { bootRailsRuntime } from './rails_runtime.js';

let vm;
let db;
let applicationLoaded = false;
const progress = (message, ratio) => postMessage({ type: 'progress', message, ratio });

async function openLabDatabase() {
  const { PGlite } = await import('@electric-sql/pglite');
  progress('PGlite / IndexedDB を起動中…');
  db = new PGlite('idb://rubykaigi-miyazaki-v1', { relaxedDurability: false });
  await db.waitReady;
  await db.exec('SET standard_conforming_strings = on');
  registerPGliteInterface(self, db);
}

async function boot(mode) {
  if (mode === 'lab') await openLabDatabase();
  vm = await bootRailsRuntime({
    files: appFiles,
    mountPoint: RAILS_ROOT,
    env: mode === 'lab' ? {} : { GUIDE_ONLY: '1' },
    onProgress: progress
  });
  if (mode !== 'probe') await loadApplication();
  const railsLoaded = (await vm.evalAsync('defined?(Rails).to_s')).toString() !== '';
  return { ready: true, railsLoaded };
}

async function loadApplication() {
  if (applicationLoaded) return;
  if (!vm) throw new Error('Ruby is not initialized');
  progress('Rails ライブラリを読み込んでいます…', 0.92);
  await vm.evalAsync(`load '${RAILS_ROOT}/config/environment.rb'`);
  applicationLoaded = true;
  progress('Rails の準備完了', 1);
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
