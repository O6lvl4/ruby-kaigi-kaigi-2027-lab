import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.DEMO_URL||'http://127.0.0.1:5173/';
const results=[];await mkdir('evidence',{recursive:true});
for(const [engineName,engine]of Object.entries({chromium,webkit})){
 const browser=await engine.launch();
 try{for(const [size,viewport]of Object.entries({desktop:{width:1360,height:1000},mobile:{width:390,height:844}})){
  const context=await browser.newContext({viewport});
  await context.addInitScript(()=>{
   window.copiedAddresses=[];window.geolocationCalls=0;
   Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>{window.copiedAddresses.push(value);}}});
   Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition(){window.geolocationCalls++;throw new Error('Location must not be requested');},watchPosition(){window.geolocationCalls++;throw new Error('Location must not be requested');}}});
  });
  const page=await context.newPage(),requests=[],errors=[];
  page.on('request',request=>requests.push(request.url()));page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base);await page.waitForFunction(()=>window.summaryApp?.mapReady||window.summaryApp?.error,null,{timeout:180000});
  assert.equal(await page.evaluate(()=>window.summaryApp.error),null);
  const initialWasm=requests.filter(u=>u.includes('base-app.wasm')).length;
  assert.ok(!requests.some(u=>u.includes('cyberjapandata')));
  assert.equal(await page.locator('#site-navigation a[href="https://aid-on.org"]').count(),1);
  if(size==='mobile'){
   await page.locator('#menu-toggle').click();assert.equal(await page.locator('#site-navigation').isVisible(),true);
   await page.keyboard.press('Escape');assert.equal(await page.locator('#site-navigation').isVisible(),false);
   assert.equal(await page.locator('#menu-toggle').evaluate(el=>el===document.activeElement),true);
   await page.locator('#menu-toggle').click();await page.locator('#site-navigation a[href="#dining"]').click();
   await page.waitForFunction(()=>location.hash==='#dining');assert.equal(await page.locator('#site-navigation').isVisible(),false);
   await page.waitForFunction(()=>document.activeElement.id==='dining');
   await page.goBack();await page.waitForFunction(()=>location.hash==='');
   await page.goForward();await page.waitForFunction(()=>location.hash==='#dining');
   assert.equal(await page.locator('#site-navigation').isVisible(),false);
  }else{
   assert.equal(await page.locator('#site-navigation').isVisible(),true);
   await page.locator('.header-archives summary').click();assert.equal(await page.locator('.header-archives a').count(),5);
   await page.locator('.header-archives a').first().focus();
   await page.keyboard.press('Escape');assert.equal(await page.locator('.header-archives').getAttribute('open'),null);
   assert.equal(await page.locator('.header-archives summary').evaluate(el=>el===document.activeElement),true);
  }
  const dining=page.locator('#dining');await dining.scrollIntoViewIfNeeded();
  assert.equal(await dining.locator('[data-restaurant-id]').count(),20);
  assert.equal(await dining.locator('.dining-thumbnail').count(),20);
  const card=dining.locator('[data-restaurant-id="torihisa"]');
  for(const mode of ['walking','driving']){
   const href=await card.locator(`a[href*="travelmode=${mode}"]`).getAttribute('href');const url=new URL(href);
   assert.equal(url.hostname,'www.google.com');assert.equal(url.searchParams.get('api'),'1');assert.equal(url.searchParams.has('origin'),false);assert.match(url.searchParams.get('destination'),/とり寿.*宮崎県宮崎市/);
  }
  await card.locator('[data-copy-address]').click();assert.match((await page.evaluate(()=>window.copiedAddresses)).at(-1),/とり寿\n宮崎県宮崎市橘通西3-4-1/);
  await page.evaluate(()=>navigator.clipboard.writeText=async()=>{throw new Error('blocked');});
  await card.locator('[data-copy-address]').click();assert.match(await card.locator('.copy-address-status').innerText(),/表示されている名称・住所/);
  await card.locator('[data-dining-focus]').click();
  assert.equal(await dining.locator('#dining-map-choice').evaluate(el=>el===document.activeElement),true);
  await page.waitForFunction(()=>document.querySelectorAll('[data-dining-pin]').length===20);
  await dining.locator('[data-dining-view="list"]').click();
  await dining.locator('#dining-capacity').selectOption('50');await dining.locator('#dining-area').selectOption('橘通西');
  const listMatches=await dining.locator('[data-restaurant-id]:visible').evaluateAll(cards=>cards.map(c=>c.dataset.restaurantId));
  await dining.locator('[data-dining-view="map"]').click();await page.waitForFunction(()=>document.querySelectorAll('[data-dining-pin]').length===20);
  assert.deepEqual(await page.evaluate(()=>window.diningGuideState.matchingIds),listMatches);
  assert.equal(await dining.locator('[data-dining-pin]').count(),20);
  assert.equal(await dining.locator('.dining-pin-muted').count(),20-listMatches.length);
  await dining.locator('#dining-map-choice').selectOption('torihisa');
  assert.equal(await dining.locator('[data-dining-detail-id="torihisa"]').count(),1);
  assert.match(await dining.locator('#dining-map-detail').innerText(),/対象外/);
  await dining.locator('#dining-capacity').selectOption('0');
  assert.ok(!(await dining.locator('#dining-map-detail').innerText()).includes('対象外'));
  await dining.locator('#dining-area').selectOption('all');
  await dining.locator('[data-dining-pin="the-meibia-miyazaki-banquet"]').click();
  assert.equal(await dining.locator('[data-dining-detail-id="the-meibia-miyazaki-banquet"]').count(),1);
  await page.screenshot({path:`evidence/dining-map-${engineName}-${size}.png`,fullPage:true});
  for(let i=0;i<3;i++){
   await dining.locator('[data-dining-view="list"]').click();assert.equal(await dining.locator('#dining-map-canvas .leaflet-pane').count(),0);
   assert.equal(await dining.locator('[data-restaurant-id]:visible').count(),20);
   await dining.locator('[data-dining-view="map"]').click();await page.waitForFunction(()=>document.querySelectorAll('[data-dining-pin]').length===20);
  }
  await dining.locator('[data-dining-view="list"]').click();
  await context.route('**/cyberjapandata.gsi.go.jp/**',route=>route.abort());
  await dining.locator('[data-dining-view="map"]').click();await page.waitForFunction(()=>document.querySelectorAll('[data-dining-pin]').length===20);
  await page.waitForFunction(()=>document.getElementById('dining-map-status').textContent.includes('読み込めません'),null,{timeout:30000});
  await dining.locator('#dining-map-choice').selectOption('ogura-honten');assert.equal(await dining.locator('[data-dining-detail-id="ogura-honten"] a[href*="travelmode=walking"]').count(),1);
  assert.equal(page.workers().length,0);assert.equal(await page.evaluate(()=>window.summaryApp.railsRequestCount),5);
  assert.equal(requests.filter(u=>u.includes('base-app.wasm')).length,initialWasm);
  assert.equal(await page.evaluate(()=>window.geolocationCalls),0);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
  results.push({engine:engineName,size,status:'PASS',all20Pins:true,sharedFilters:true,addressLinks:true,copyAndFallback:true,noLocationAccess:true,workerReleased:true,repeatedTeardown:true,tileFailureReadable:true,mobileNavigation:true});
  console.log('PASS dining map/address/header lifecycle',engineName,size);await context.close();
 }}finally{await browser.close();}
}
await writeFile('evidence/dining-navigation-results.json',JSON.stringify({url:base,results},null,2));
