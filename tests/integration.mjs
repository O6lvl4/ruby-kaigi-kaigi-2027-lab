import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { initRailsVM, registerPGliteWasmInterface } from 'wasmify-rails';
const phase = process.argv[2] || 'write';
const dataDir = process.env.TEST_DATA_DIR;
if (!dataDir) throw new Error('Set TEST_DATA_DIR to a new test-only directory');
const db = new PGlite(dataDir, {relaxedDurability:false});
await db.waitReady;
  await db.exec('SET standard_conforming_strings = on');
registerPGliteWasmInterface(globalThis, db);
const module = await WebAssembly.compile(await readFile('public/base-app.wasm'));
const vm = await initRailsVM(module, {skipInitialize:true,async:true,database:{adapter:'pglite'}});
const files = {};
for (const [target, source] of Object.entries({'/demo/application.rb':'src/ruby/application.rb','/demo/summary.rb':'src/ruby/summary.rb','/demo/map_guide.rb':'src/ruby/map_guide.rb','/demo/map_places.json':'src/ruby/map_places.json','/demo/views/summary/_map_cards.html.erb':'src/ruby/views/summary/_map_cards.html.erb','/demo/views/summary/_schematic_map.html.erb':'src/ruby/views/summary/_schematic_map.html.erb','/demo/views/summary/show.html.erb':'src/ruby/views/summary/show.html.erb','/demo/vendor/pglite_adapter.rb':'src/ruby/vendor/pglite_adapter.rb','/demo/vendor/pglite_shims/pg.rb':'src/ruby/vendor/pglite_shims/pg.rb'})) files[target] = await readFile(source,'utf8');
globalThis.appFiles = JSON.stringify(files);
await vm.evalAsync(`require 'json'; require 'fileutils'; JSON.parse(JS.global[:appFiles].to_s).each { |path, content| FileUtils.mkdir_p(File.dirname(path)); File.write(path, content) }; load '/demo/application.rb'`);
async function request(method,body={}) {
  globalThis.railsRequest=JSON.stringify({method,path:'/venues',body});
  return JSON.parse((await vm.evalAsync('$dispatch.call')).toString());
}
const checks=[];
function check(name, action) { action(); checks.push({name,status:'PASS'}); console.log('PASS:',name); }
const fixtures=[
  {name:'架空・宮崎テスト会場',category:'venue',area:'宮崎市（架空）',capacity:50,estimated_cost:100000},
  {name:'架空・第2会場',category:'venue',area:'宮崎市（架空）',capacity:30,estimated_cost:70000},
  {name:'架空・ホテル',category:'hotel',area:'宮崎市（架空）',capacity:10,estimated_cost:20000}
];
if (phase==='write') {
  const initial=await request('GET');
  check('Fresh database has no records',()=>assert.equal(initial.body.venues.length,0));
  for (const venue of fixtures) {
    const res=await request('POST',{venue});
    check(`Rails creates ${venue.name}`,()=>assert.equal(res.status,201));
  }
  const invalids=[['blank name',{name:''}],['negative capacity',{capacity:-1}],['negative cost',{estimated_cost:-10}],['invalid category',{category:'invalid'}],['duplicate name',{}]];
  for (const [label,patch] of invalids) {
    const res=await request('POST',{venue:{...fixtures[0],...patch}});
    check(`Rails rejects ${label} with 422`,()=>{assert.equal(res.status,422);assert.ok(res.body.errors.length);});
  }
  const strange={...fixtures[0], name:"架空 O'Reilly ] #{1+1} <script>alert(1)</script>"};
  const strangeRes=await request('POST',{venue:strange});
  check('Quoted/template/HTML-like text safely round-trips as data',()=>{assert.equal(strangeRes.status,201);assert.equal(strangeRes.body.venue.name,strange.name);});
  fixtures.push(strange);
}
const listed=await request('GET');
check('Runtime is genuine Ruby/Rails on Wasm',()=>{assert.equal(listed.body.runtime.platform,'wasm32-wasi');assert.equal(listed.body.runtime.rails,'8.0.1');});
check(phase==='reopen'?'Records survive independent process/database reopen (Node FS)':'All four records readable through Rails',()=>assert.equal(listed.body.venues.length,4));
const pg=await db.query('SELECT count(*)::integer AS count FROM venues');
check('PGlite is the source of truth',()=>assert.equal(pg.rows[0].count,4));
const require=createRequire(import.meta.url);
const duckdb=require('@duckdb/duckdb-wasm/dist/duckdb-node-blocking.cjs');
const analytics=await duckdb.createDuckDB({mvp:{mainModule:resolve('node_modules/@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm')},eh:{mainModule:resolve('node_modules/@duckdb/duckdb-wasm/dist/duckdb-eh.wasm')}},new duckdb.VoidLogger(),duckdb.NODE_RUNTIME);
await analytics.instantiate();
const conn=analytics.connect();
conn.query('CREATE TABLE venues(category VARCHAR, capacity INTEGER, estimated_cost INTEGER)');
const insert=conn.prepare('INSERT INTO venues VALUES (?, ?, ?)');
for(const venue of listed.body.venues) insert.query(venue.category,venue.capacity,venue.estimated_cost);
insert.close();
const summaries=conn.query('SELECT category, COUNT(*)::INTEGER AS count, SUM(capacity)::DOUBLE AS capacity, SUM(estimated_cost)::DOUBLE AS cost FROM venues GROUP BY category ORDER BY category').toArray().map(row=>row.toJSON());
check('DuckDB-Wasm aggregates Rails/PGlite-derived records exactly',()=>assert.deepEqual(summaries,[{category:'hotel',count:1,capacity:10,cost:20000},{category:'venue',count:3,capacity:130,cost:270000}]));
conn.close();
await db.close();
await mkdir('evidence',{recursive:true});
await writeFile(`evidence/integration-${phase}.json`,JSON.stringify({phase,host:'Node 24',runtime:listed.body.runtime,duckdb:analytics.getVersion(),checks,summaries,browserVerified:false},null,2));
console.log(`PASS ${checks.length} checks; browser IndexedDB persistence is NOT tested by this suite.`);
