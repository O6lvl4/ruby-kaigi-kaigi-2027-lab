import { initRailsVM, registerPGliteWasmInterface } from 'wasmify-rails';
import appSource from './ruby/application.rb?raw';
import summarySource from './ruby/summary.rb?raw';
import mapSource from './ruby/map_guide.rb?raw';
import mapPlaces from './ruby/map_places.json?raw';
import mapCards from './ruby/views/summary/_map_cards.html.erb?raw';
import schematicMap from './ruby/views/summary/_schematic_map.html.erb?raw';
import summaryView from './ruby/views/summary/show.html.erb?raw';
import adapterSource from './ruby/vendor/pglite_adapter.rb?raw';
import pgSource from './ruby/vendor/pglite_shims/pg.rb?raw';
let vm;
let db;
let applicationLoaded=false;
const progress = (message) => postMessage({ type: 'progress', message });
async function boot(mode) {
  const summaryOnly = mode === 'summary' || mode === 'probe';
  if (!summaryOnly) {
  const { PGlite } = await import('@electric-sql/pglite');
  progress('PGlite / IndexedDB を起動中…');
  db = new PGlite('idb://rubykaigi-miyazaki-v1', { relaxedDurability: false });
  await db.waitReady;
  await db.exec('SET standard_conforming_strings = on');
  registerPGliteWasmInterface(self, db);
  }
  vm = await initRailsVM(`${import.meta.env.BASE_URL}base-app.wasm?release=28acbb22`, { skipInitialize: true, async: true, env: summaryOnly ? ['SUMMARY_ONLY=1'] : [], database: { adapter: 'pglite' }, progressCallback: progress });
  if(mode==='probe')return;
  await loadApplication(summaryOnly);
}
async function loadApplication(summaryOnly=true) {
  if(applicationLoaded)return;
  if(!vm)throw new Error('Ruby is not initialized');
  progress('Ruby の起動完了。Rails のファイルを準備しています…');
  self.appFiles = JSON.stringify({ '/demo/application.rb': appSource, '/demo/summary.rb': summarySource, '/demo/map_guide.rb': mapSource, '/demo/map_places.json': mapPlaces, '/demo/views/summary/_map_cards.html.erb': mapCards, '/demo/views/summary/_schematic_map.html.erb': schematicMap, '/demo/views/summary/show.html.erb': summaryView, '/demo/vendor/pglite_adapter.rb': adapterSource, '/demo/vendor/pglite_shims/pg.rb': pgSource });
  await vm.evalAsync(`require 'json'; require 'fileutils'; JSON.parse(JS.global[:appFiles].to_s).each { |path, content| FileUtils.mkdir_p(File.dirname(path)); File.write(path, content) }`);
  self.appFiles = null;
  progress('Rails ライブラリを読み込んでいます…');
  await vm.evalAsync(`load '/demo/application.rb'`);
  applicationLoaded=true;
  progress(summaryOnly ? 'Rails の準備完了' : 'Rails + PGlite の準備完了');
}
let queue = Promise.resolve();
self.onmessage = (event) => {
  const { id, type, request, mode } = event.data;
  queue = queue.then(async () => {
    try {
      if (type === 'boot') { await boot(mode); const railsLoaded = mode === 'probe' ? (await vm.evalAsync('defined?(Rails).to_s')).toString() !== '' : true; postMessage({ id, result: { ready: true, railsLoaded } }); return; }
      if (type === 'probe_rails') { await loadApplication(true); postMessage({id,result:{ready:true}}); return; }
      if (type === 'request') {
        self.railsRequest = JSON.stringify(request);
        const response = await vm.evalAsync('$dispatch.call');
        postMessage({ id, result: JSON.parse(response.toString()) });
      } else if (type === 'close') {
        await db?.close(); postMessage({ id, result: { closed: true } });
      }
    } catch (error) { console.error(error); postMessage({ id, error: error.message || String(error) }); }
  });
};
