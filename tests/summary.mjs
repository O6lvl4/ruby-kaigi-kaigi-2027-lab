import { chromium, webkit } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const base=process.env.DEMO_URL || 'http://127.0.0.1:5173/';
const results=[];await mkdir('evidence',{recursive:true});
async function ready(page){
 await page.waitForFunction(()=>window.summaryApp?.ready || window.summaryApp?.error,null,{timeout:180000});
 if(!await page.evaluate(()=>window.summaryApp.ready))throw new Error(await page.locator('#boot-error').textContent());
 await page.waitForFunction(()=>window.summaryApp.mapReady || window.summaryApp.mapError,null,{timeout:30000});
 assert.equal(await page.evaluate(()=>window.summaryApp.mapReady),true);
}
for(const [name,engine] of Object.entries({chromium,webkit})){
 const browser=await engine.launch({headless:true});
 try{
  for(const [size,viewport] of Object.entries({desktop:{width:1360,height:1000},mobile:{width:390,height:844}})){
   const context=await browser.newContext({viewport});const page=await context.newPage();const requests=[];const errors=[];
   page.on('request',r=>requests.push(r.url()));page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base);await ready(page);
   const proof=await page.evaluate(()=>({response:window.summaryApp.lastResponse,renderer:window.summaryApp.renderer}));
   assert.equal(proof.response.status,200);assert.equal(proof.renderer,'Rails-ActionView-ERB');
   assert.equal(proof.response.headers['x-ruby-platform'],'wasm32-wasi');assert.equal(proof.response.headers['x-summary-renderer'],'Rails-ActionView-ERB');
   assert.match(proof.response.body,/data-controller="SummaryController"/);
   assert.match(proof.response.body,/2027年4月14日〜16日/);assert.ok(!proof.response.body.includes('<%'));
   assert.equal(await page.locator('#rails-root main[data-renderer="rails-erb"]').count(),1);
   assert.equal(await page.evaluate(()=>window.summaryApp.runtimeReleased),true);
   assert.equal(page.workers().length,0,'Read-only Rails worker must be terminated before interactions');
   assert.equal(await page.evaluate(()=>window.summaryApp.railsRequestCount),5);
   assert.equal(await page.locator('#rails-root form,#rails-root input').count(),0);
   const ruby=await page.evaluate(()=>window.summaryApp.request('/summary.json'));
   assert.equal(ruby.body.runtime.controller,'SummaryController');assert.equal(ruby.body.runtime.renderer,'ActionView::ERB');assert.equal(ruby.body.snapshot.routes.length,3);
   assert.equal(ruby.body.snapshot.checked_on,'2026-10-08');
   assert.ok(requests.some(x=>x.includes('base-app.wasm')),'Homepage must execute the Ruby Wasm runtime');
   assert.ok(requests.some(x=>new URL(x).pathname===new URL('base-app.wasm',base).pathname),'Ruby Wasm must load under the configured Pages project path');
   for(const asset of requests.filter(x=>new URL(x).origin===new URL(base).origin && /\.(?:js|css|wasm)(?:\?|$)/.test(x)))assert.ok(new URL(asset).pathname.startsWith(new URL(base).pathname),'Same-origin assets must stay under the Pages project path');
   assert.ok(!requests.some(x=>/postgres.*\.(wasm|data)|duckdb.*\.wasm/.test(x)),'Read mode must not boot unrelated database engines');
   assert.deepEqual(errors,[]);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   const requestsBeforeReading=requests.length;
   const restaurants=ruby.body.references.restaurantSection.restaurants;
   assert.equal(await page.locator('[data-restaurant-id]').count(),restaurants.length);
   assert.deepEqual(await page.locator('#dining-capacity option').evaluateAll(options=>options.map(x=>x.value)),['0','10','20','30','50','60','100']);
   assert.equal(await page.locator('[data-archive-year]').count(),5);
   await page.locator('a[href="#dining"]').click();
   for(const minimum of [10,20,30,50,60,100,0]){
     await page.locator('#dining-capacity').selectOption(String(minimum));
     const expected=restaurants.filter(r=>r.groupCapacity===null || r.groupCapacity>=minimum).map(r=>r.id);
     assert.deepEqual(await page.locator('[data-restaurant-id]:visible').evaluateAll(cards=>cards.map(x=>x.dataset.restaurantId)),expected);
     assert.equal(await page.locator('#dining-empty').isVisible(),minimum>0 && !restaurants.some(r=>r.groupCapacity!==null && r.groupCapacity>=minimum));
     assert.equal(await page.locator('[data-restaurant-id="ajidokoro-shu"]').isVisible(),true);
     if(minimum>20)assert.equal(await page.locator('[data-restaurant-id="torihisa"]').isVisible(),false);
   }
   assert.equal(await page.locator('[data-restaurant-id]:visible').count(),restaurants.length);
   for(const restaurant of restaurants){
     const card=page.locator(`[data-restaurant-id="${restaurant.id}"]`);
     assert.equal(await card.locator(`a[href="${restaurant.sourceUrl}"]`).count(),1);
   }
   await page.locator('[data-restaurant-id="torihisa"] summary').click();
   assert.match(await page.locator('[data-restaurant-id="torihisa"] details').innerText(),/2027年の空席/);
   await page.screenshot({path:`evidence/dining-${name}-${size}.png`,fullPage:true});
   await page.locator('a[href="#archive"]').click();
   for(const event of ruby.body.references.archiveSection.years){
     const card=page.locator(`[data-archive-year="${event.year}"]`);
     assert.equal(await card.locator(`a[href="${event.scheduleUrl}"]`).count(),1);
     assert.equal(await card.locator(`a[href="${event.eventsUrl}"]`).count(),1);
   }
   await page.locator('.archive-reading > summary').click();
   assert.equal(await page.locator('.reading-grid article').count(),3);
   for(let i=0;i<3;i++){await page.locator('#dining').scrollIntoViewIfNeeded();await page.locator('#archive').scrollIntoViewIfNeeded();}
   assert.equal(page.workers().length,0);
   assert.equal(await page.evaluate(()=>window.summaryApp.railsRequestCount),5);
   assert.equal(requests.length,requestsBeforeReading,'Reading/filtering must not fetch more data');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.locator('a[href="#pending"]').click();assert.equal(new URL(page.url()).hash,'#pending');
   await page.screenshot({path:`evidence/summary-${name}-${size}.png`,fullPage:true});
   await page.reload();await ready(page);assert.equal(await page.locator('#rails-root main[data-platform="wasm32-wasi"]').count(),1);
   results.push({engine:name,viewport:size,status:'PASS',rubyWasm:true,railsController:'SummaryController',erb:true,jsonRoute:true,reload:true});
   console.log('PASS actual Rails ERB reading summary',name,size,'and refresh');await context.close();
  }
  // A blocked Ruby download must show an error, never a static success substitute.
  const context=await browser.newContext();const page=await context.newPage();
  await context.route('**/base-app.wasm*',route=>route.abort('failed'));
  await page.goto(base);await page.locator('#boot-error').waitFor({state:'visible',timeout:30000});
  assert.equal(await page.locator('#rails-root').isVisible(),false);
  assert.equal(await page.locator('#rails-root main').count(),0);
  await page.locator('#diagnostics summary').click();assert.match(await page.locator('#diagnostic-text').innerText(),/"stage"/);
  await page.locator('#copy-diagnostics').click();await page.waitForFunction(()=>document.getElementById('copy-status').textContent.length>0);assert.ok((await page.locator('#copy-status').innerText()).length>0);
  await page.screenshot({path:`evidence/summary-${name}-error.png`,fullPage:true});
  await context.unroute('**/base-app.wasm*');await page.locator('#retry').click();await ready(page);
  assert.equal(await page.locator('#boot-panel').isVisible(),false);assert.equal(await page.locator('#rails-root main[data-renderer="rails-erb"]').count(),1);
  results.push({engine:name,status:'PASS',blockedRubyShowsError:true,noStaticFallback:true,diagnostics:true,retry:true});
  console.log('PASS truthful failure and successful retry',name);await context.close();
  const interrupted=await browser.newContext();const interruptedPage=await interrupted.newPage();const interruptedRequests=[];
  interruptedPage.on('request',r=>interruptedRequests.push(r.url()));
  await interruptedPage.addInitScript(()=>{if(!sessionStorage.getItem('recovery-test-seeded')){sessionStorage.setItem('recovery-test-seeded','1');sessionStorage.setItem('rubykaigi-boot-checkpoint-v1',JSON.stringify({build:'test',state:'booting',stage:'Rails initialization checkpoint',at:'2026-10-08T00:00:00Z'}));}});
  await interruptedPage.goto(base);await interruptedPage.locator('#retry').waitFor({state:'visible'});
  assert.match(await interruptedPage.locator('#boot-error').innerText(),/Rails initialization checkpoint/);
  assert.ok(!interruptedRequests.some(x=>x.includes('base-app.wasm')),'Interrupted boot must not automatically enter a reload loop');
  await interruptedPage.locator('#diagnostics summary').click();assert.match(await interruptedPage.locator('#diagnostic-text').innerText(),/Previous load did not finish/);
  await interruptedPage.locator('#retry').click();await ready(interruptedPage);
  assert.equal(await interruptedPage.evaluate(()=>JSON.parse(sessionStorage.getItem('rubykaigi-boot-checkpoint-v1')).state),'ready');
  await interruptedPage.reload();await ready(interruptedPage);
  console.log('PASS interrupted boot preserves local stage, waits for one retry and normal reload recovers',name);await interrupted.close();
  const nojs=await browser.newContext({javaScriptEnabled:false});const nojsPage=await nojs.newPage();await nojsPage.goto(base);
  assert.equal(await nojsPage.locator('#rails-root main').count(),0);
  assert.match(await nojsPage.locator('noscript').innerText(),/JavaScript/);await nojs.close();
  console.log('PASS JS-disabled mode explicitly requires Rails/Wasm rather than pretending success',name);
 }finally{await browser.close();}
}
await writeFile('evidence/summary-results.json',JSON.stringify({url:base,results},null,2));
