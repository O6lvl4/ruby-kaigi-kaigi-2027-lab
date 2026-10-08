import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { initRailsVM } from 'wasmify-rails';
const module=await WebAssembly.compile(await readFile('public/base-app.wasm'));
const vm=await initRailsVM(module,{skipInitialize:true,async:true,env:['SUMMARY_ONLY=1']});
const files={};
for(const [target,path] of Object.entries({'/demo/public_reference_data.json':'src/ruby/public_reference_data.json','/demo/views/summary/_references.html.erb':'src/ruby/views/summary/_references.html.erb','/demo/application.rb':'src/ruby/application.rb','/demo/summary.rb':'src/ruby/summary.rb','/demo/map_guide.rb':'src/ruby/map_guide.rb','/demo/map_places.json':'src/ruby/map_places.json','/demo/views/summary/_map_cards.html.erb':'src/ruby/views/summary/_map_cards.html.erb','/demo/views/summary/_schematic_map.html.erb':'src/ruby/views/summary/_schematic_map.html.erb','/demo/views/summary/show.html.erb':'src/ruby/views/summary/show.html.erb','/demo/vendor/pglite_adapter.rb':'src/ruby/vendor/pglite_adapter.rb','/demo/vendor/pglite_shims/pg.rb':'src/ruby/vendor/pglite_shims/pg.rb'}))files[target]=await readFile(path,'utf8');
globalThis.appFiles=JSON.stringify(files);
await vm.evalAsync(`require 'json'; require 'fileutils'; JSON.parse(JS.global[:appFiles].to_s).each { |path, content| FileUtils.mkdir_p(File.dirname(path)); File.write(path, content) }; load '/demo/application.rb'`);
async function get(path,accept){globalThis.railsRequest=JSON.stringify({method:'GET',path,accept});return JSON.parse((await vm.evalAsync('$dispatch.call')).toString());}
const html=await get('/summary','text/html');
assert.equal(html.status,200);assert.equal(html.headers['x-summary-renderer'],'Rails-ActionView-ERB');assert.equal(html.headers['x-ruby-platform'],'wasm32-wasi');
assert.match(html.body,/data-renderer="rails-erb"/);assert.match(html.body,/2027年4月14日〜16日/);assert.match(html.body,/バス 約60分/);assert.match(html.body,/SummaryController/);assert.ok(!html.body.includes('<%'));assert.equal((html.body.match(/data-renderer=/g)||[]).length,1);
console.log('PASS genuine Rails SummaryController renders ActionView ERB with Ruby snapshot values');
assert.equal((html.body.match(/data-map-node=/g)||[]).length,7);assert.match(html.body,/id="schematic-map"/);
const json=await get('/summary.json','application/json');
assert.equal(json.status,200);assert.equal(json.body.runtime.controller,'SummaryController');assert.equal(json.body.runtime.renderer,'ActionView::ERB');assert.equal(json.body.runtime.platform,'wasm32-wasi');assert.equal(json.body.snapshot.routes.length,3);assert.equal(json.body.snapshot.checked_on,'2026-10-08');
console.log('PASS Rails JSON route exposes the same Ruby snapshot and actual runtime');
assert.equal(typeof globalThis.pglite4rails,'undefined');
assert.equal((await vm.evalAsync('defined?(ActiveRecord::Base).to_s')).toString(),'');
console.log('PASS reading-mode Rails boots and renders without opening the lab database');
await vm.evalAsync(`$original_snapshot = PreparationSnapshot.method(:current); class << PreparationSnapshot; def current; $original_snapshot.call.merge(venue: 'RUBY_DYNAMIC_SENTINEL <script>bad</script>'); end; end`);
const changed=await get('/summary','text/html');
assert.match(changed.body,/RUBY_DYNAMIC_SENTINEL/);assert.match(changed.body,/&lt;script&gt;bad&lt;\/script&gt;/);assert.ok(!changed.body.includes('<script>bad</script>'));
console.log('PASS changing Ruby snapshot changes ERB output and ActionView escapes HTML');
for(const scenario of ['arrival','venue','night']){
 const mapped=await get(`/map.json?scenario=${scenario}`,'application/json');
 assert.equal(mapped.status,200);assert.equal(mapped.body.key,scenario);assert.equal(mapped.body.renderer,'Rails-ActionView-ERB');
 const points=mapped.body.geojson.features.filter(f=>f.geometry.type==='Point');
 assert.equal(points.length,7);assert.deepEqual(points.filter(f=>f.properties.selected).map(f=>f.id).sort(),mapped.body.selected_ids.slice().sort());assert.deepEqual(mapped.body.selected_ids,mapped.body.places.map(p=>p.id));
 for(const p of points){assert.ok(p.geometry.coordinates[0]>131&&p.geometry.coordinates[0]<132);assert.ok(p.geometry.coordinates[1]>31&&p.geometry.coordinates[1]<32);if(mapped.body.selected_ids.includes(p.id))assert.ok(mapped.body.html.includes(`data-place-id="${p.id}"`));assert.ok(p.properties.coordinate_source.startsWith('https://'));}
 for(const line of mapped.body.geojson.features.filter(f=>f.geometry.type==='LineString'))assert.equal(line.properties.kind,'schematic');
}
const invalidMap=await get('/map.json?scenario=unknown','application/json');assert.equal(invalidMap.status,422);
console.log('PASS Rails scenarios emit matching ERB place cards and source-backed GeoJSON with schematic-only lines');
const references=json.body.references;
assert.equal(references.restaurantSection.restaurants.length,20);
assert.deepEqual(references,JSON.parse(await readFile('src/ruby/public_reference_data.json','utf8')));
assert.deepEqual(references.archiveSection.years.map(x=>x.year),[2026,2025,2024,2023,2022]);
assert.equal(references.restaurantSection.restaurants.find(x=>x.id==='ajidokoro-shu').groupCapacity,null);
assert.equal(references.restaurantSection.restaurants.find(x=>x.id==='torihisa').groupCapacity,20);
assert.equal(references.restaurantSection.restaurants.find(x=>x.id==='takasago').totalSeats,163);
assert.equal(references.restaurantSection.restaurants.find(x=>x.id==='takasago').groupCapacity,50);
assert.equal((html.body.match(/data-restaurant-id=/g)||[]).length,20);
assert.equal((html.body.match(/data-archive-year=/g)||[]).length,5);
assert.match(html.body,/id="dining"/);assert.match(html.body,/id="archive"/);
for(const restaurant of references.restaurantSection.restaurants){assert.ok(html.body.includes(restaurant.name));assert.ok(html.body.includes(restaurant.sourceUrl));}
for(const event of references.archiveSection.years){for(const key of ['url','scheduleUrl','eventsUrl'])assert.ok(html.body.includes(event[key]));}
console.log('PASS real Rails ERB and JSON expose twenty source-backed dining venues and five official archives');

const venues=references.restaurantSection.restaurants;
assert.equal(new Set(venues.map(v=>v.id)).size,20);
assert.equal(venues.filter(v=>v.venueType==='hotel_banquet').length,4);
assert.equal(venues.find(v=>v.id==='rikyu').groupCapacity,null);
assert.equal(venues.find(v=>v.id==='ebisuya-ichibangai').groupCapacity,40);
assert.equal(venues.find(v=>v.id==='take-miyazaki').groupCapacity,65);
assert.equal(venues.find(v=>v.id==='take-miyazaki').standingCapacity,80);
assert.equal(venues.find(v=>v.id==='uruwashi').totalSeats,null);
assert.match(html.body,/20件を掲載/);assert.match(html.body,/ホテル宴会場/);
for(const venue of venues){
 for(const key of ['totalSeats','groupCapacity','standingCapacity'])assert.ok(venue[key]===null || (Number.isInteger(venue[key]) && venue[key]>0));
 assert.ok(venue.sourceUrl.startsWith('https://'));
 if(venue.openingHours)assert.ok(html.body.includes(venue.openingHours));
 for(const fieldSource of Object.values(venue.fieldSources)){
   const url=venue[fieldSource] || fieldSource;
   assert.ok(typeof url==='string' && url.startsWith('https://'),`Missing provenance ${venue.id}/${fieldSource}`);
   assert.ok(html.body.includes(url),`Missing visible provenance link ${venue.id}/${fieldSource}`);
 }
 if(venue.venueType==='hotel_banquet'){
   assert.equal(venue.totalSeats,null);
   assert.ok(venue.roomOptions.some(room=>room.seatedMax===venue.groupCapacity));
 }
}
console.log('PASS expanded data provenance, unknown/conflicting capacities, seated-vs-standing and hotel room distinctions');
