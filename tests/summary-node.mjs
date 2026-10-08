import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { initRailsVM } from 'wasmify-rails';
const module=await WebAssembly.compile(await readFile('public/base-app.wasm'));
const vm=await initRailsVM(module,{skipInitialize:true,async:true,env:['SUMMARY_ONLY=1']});
const files={};
for(const [target,path] of Object.entries({'/demo/application.rb':'src/ruby/application.rb','/demo/summary.rb':'src/ruby/summary.rb','/demo/map_guide.rb':'src/ruby/map_guide.rb','/demo/map_places.json':'src/ruby/map_places.json','/demo/views/summary/_map_cards.html.erb':'src/ruby/views/summary/_map_cards.html.erb','/demo/views/summary/show.html.erb':'src/ruby/views/summary/show.html.erb','/demo/vendor/pglite_adapter.rb':'src/ruby/vendor/pglite_adapter.rb','/demo/vendor/pglite_shims/pg.rb':'src/ruby/vendor/pglite_shims/pg.rb'}))files[target]=await readFile(path,'utf8');
globalThis.appFiles=JSON.stringify(files);
await vm.evalAsync(`require 'json'; require 'fileutils'; JSON.parse(JS.global[:appFiles].to_s).each { |path, content| FileUtils.mkdir_p(File.dirname(path)); File.write(path, content) }; load '/demo/application.rb'`);
async function get(path,accept){globalThis.railsRequest=JSON.stringify({method:'GET',path,accept});return JSON.parse((await vm.evalAsync('$dispatch.call')).toString());}
const html=await get('/summary','text/html');
assert.equal(html.status,200);assert.equal(html.headers['x-summary-renderer'],'Rails-ActionView-ERB');assert.equal(html.headers['x-ruby-platform'],'wasm32-wasi');
assert.match(html.body,/data-renderer="rails-erb"/);assert.match(html.body,/2027年4月14日〜16日/);assert.match(html.body,/バス 約60分/);assert.match(html.body,/SummaryController/);assert.ok(!html.body.includes('<%'));assert.equal((html.body.match(/data-renderer=/g)||[]).length,1);
console.log('PASS genuine Rails SummaryController renders ActionView ERB with Ruby snapshot values');
const json=await get('/summary.json','application/json');
assert.equal(json.status,200);assert.equal(json.body.runtime.controller,'SummaryController');assert.equal(json.body.runtime.renderer,'ActionView::ERB');assert.equal(json.body.runtime.platform,'wasm32-wasi');assert.equal(json.body.snapshot.routes.length,3);assert.equal(json.body.snapshot.checked_on,'2026-10-08');
console.log('PASS Rails JSON route exposes the same Ruby snapshot and actual runtime');
assert.equal(typeof globalThis.pglite4rails,'undefined');
console.log('PASS reading-mode Rails boots and renders without opening the lab database');
await vm.evalAsync(`$original_snapshot = PreparationSnapshot.method(:current); class << PreparationSnapshot; def current; $original_snapshot.call.merge(venue: 'RUBY_DYNAMIC_SENTINEL <script>bad</script>'); end; end`);
const changed=await get('/summary','text/html');
assert.match(changed.body,/RUBY_DYNAMIC_SENTINEL/);assert.match(changed.body,/&lt;script&gt;bad&lt;\/script&gt;/);assert.ok(!changed.body.includes('<script>bad</script>'));
console.log('PASS changing Ruby snapshot changes ERB output and ActionView escapes HTML');
for(const scenario of ['arrival','venue','night']){
 const mapped=await get(`/map.json?scenario=${scenario}`,'application/json');
 assert.equal(mapped.status,200);assert.equal(mapped.body.key,scenario);assert.equal(mapped.body.renderer,'Rails-ActionView-ERB');
 const points=mapped.body.geojson.features.filter(f=>f.geometry.type==='Point');
 assert.deepEqual(points.map(f=>f.id),mapped.body.places.map(p=>p.id));
 for(const p of points){assert.ok(p.geometry.coordinates[0]>131&&p.geometry.coordinates[0]<132);assert.ok(p.geometry.coordinates[1]>31&&p.geometry.coordinates[1]<32);assert.ok(mapped.body.html.includes(`data-place-id="${p.id}"`));assert.ok(p.properties.coordinate_source.startsWith('https://'));}
 for(const line of mapped.body.geojson.features.filter(f=>f.geometry.type==='LineString'))assert.equal(line.properties.kind,'schematic');
}
const invalidMap=await get('/map.json?scenario=unknown','application/json');assert.equal(invalidMap.status,422);
console.log('PASS Rails scenarios emit matching ERB place cards and source-backed GeoJSON with schematic-only lines');
