import { PGlite } from '@electric-sql/pglite';
import { initRailsVM, registerPGliteWasmInterface } from 'wasmify-rails';
import appSource from './ruby/application.rb?raw';
import adapterSource from './ruby/vendor/pglite_adapter.rb?raw';
import pgSource from './ruby/vendor/pglite_shims/pg.rb?raw';
let vm;
let db;
const progress = (message) => postMessage({ type: 'progress', message });
async function boot() {
  progress('PGlite / IndexedDB を起動中…');
  db = new PGlite('idb://rubykaigi-miyazaki-v1', { relaxedDurability: false });
  await db.waitReady;
  await db.exec('SET standard_conforming_strings = on');
  registerPGliteWasmInterface(self, db);
  vm = await initRailsVM('/base-app.wasm', { skipInitialize: true, async: true, database: { adapter: 'pglite' }, progressCallback: progress });
  progress('Rails アプリケーションを起動中…');
  self.appFiles = JSON.stringify({ '/demo/application.rb': appSource, '/demo/vendor/pglite_adapter.rb': adapterSource, '/demo/vendor/pglite_shims/pg.rb': pgSource });
  await vm.evalAsync(`require 'json'; require 'fileutils'; JSON.parse(JS.global[:appFiles].to_s).each { |path, content| FileUtils.mkdir_p(File.dirname(path)); File.write(path, content) }; load '/demo/application.rb'`);
  progress('Rails + PGlite の準備完了');
}
let queue = Promise.resolve();
self.onmessage = (event) => {
  const { id, type, request } = event.data;
  queue = queue.then(async () => {
    try {
      if (type === 'boot') { await boot(); postMessage({ id, result: { ready: true } }); return; }
      if (type === 'request') {
        self.railsRequest = JSON.stringify(request);
        const response = await vm.evalAsync('$dispatch.call');
        postMessage({ id, result: JSON.parse(response.toString()) });
      } else if (type === 'close') {
        await db.close(); postMessage({ id, result: { closed: true } });
      }
    } catch (error) { console.error(error); postMessage({ id, error: error.message || String(error) }); }
  });
};
