import { chromium, webkit } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const url=process.env.DEMO_URL || 'http://127.0.0.1:5173/';
const results=[];await mkdir('evidence',{recursive:true});
async function ready(page){await page.waitForFunction(()=>window.summaryApp?.mapReady || window.summaryApp?.error || window.summaryApp?.mapError,null,{timeout:180000});assert.equal(await page.evaluate(()=>window.summaryApp.mapReady),true);}
for(const [engineName,engine] of Object.entries({chromium,webkit})){
 const browser=await engine.launch({headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1360,height:1000}});const page=await context.newPage();
  await page.goto(url);await ready(page);
  await page.waitForFunction(()=>['loaded','error'].includes(window.summaryApp.mapTileStatus),null,{timeout:30000});
  assert.equal(await page.evaluate(()=>window.summaryApp.mapTileStatus),'loaded','Normal map must actually load background tiles');
  for(const key of ['arrival','venue','night']){
   await page.locator(`[data-map-scenario="${key}"]`).click();await page.waitForFunction(k=>window.summaryApp.mapState?.key===k,key);
   const state=await page.evaluate(()=>window.summaryApp.mapState);const ids=await page.locator('[data-place-id]').evaluateAll(nodes=>nodes.map(n=>n.dataset.placeId));
   const points=state.geojson.features.filter(f=>f.geometry.type==='Point');assert.deepEqual(ids,points.map(p=>p.id));assert.equal(await page.locator('.guide-marker').count(),points.length);
   assert.equal(state.renderer,'Rails-ActionView-ERB');assert.equal(state.controller,'SummaryController');
   assert.ok(state.geojson.features.filter(f=>f.geometry.type==='LineString').every(f=>f.properties.kind==='schematic'));
   const first=points[0];await page.locator(`[data-map-place="${first.id}"]`).click();assert.equal(await page.evaluate(()=>window.summaryApp.mapSelected),first.id);assert.equal(await page.locator(`[data-map-place="${first.id}"]`).getAttribute('aria-pressed'),'true');
   await page.locator('#fit-map').click();await page.locator(`.guide-marker[title="${first.properties.name}"]`).click();assert.equal(await page.locator(`[data-place-id="${first.id}"]`).getAttribute('class'),'location-card is-selected');
   results.push({engine:engineName,scenario:key,status:'PASS',railsDataMatchesCards:true,linkedSelection:true,schematicOnly:true});
   console.log('PASS map/card Rails consistency and linked selection',engineName,key);
   if(key==='arrival')await page.screenshot({path:`evidence/map-${engineName}-desktop.png`,fullPage:true});
  }
  await page.setViewportSize({width:390,height:844});await page.locator('#fit-map').click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`evidence/map-${engineName}-mobile.png`,fullPage:true});await context.close();
  const failed=await browser.newContext({viewport:{width:390,height:844}});const fallback=await failed.newPage();await failed.route('https://cyberjapandata.gsi.go.jp/**',route=>route.abort('failed'));
  await fallback.goto(url);await ready(fallback);await fallback.waitForFunction(()=>window.summaryApp.mapTileStatus==='error');
  assert.ok(await fallback.locator('#map-sidebar').isVisible());assert.equal(await fallback.locator('[data-place-id]').count(),4);assert.match(await fallback.locator('#map-status').innerText(),/読み込めません/);
  await fallback.locator('[data-map-scenario="night"]').click();await fallback.waitForFunction(()=>window.summaryApp.mapState.key==='night');assert.equal(await fallback.locator('[data-place-id]').count(),3);
  await fallback.screenshot({path:`evidence/map-${engineName}-tile-failure.png`,fullPage:true});results.push({engine:engineName,status:'PASS',tileFailureKeepsRailsCards:true,scenarioSwitchWorks:true});console.log('PASS map tile-failure text fallback',engineName);await failed.close();
 }finally{await browser.close();}
}
await writeFile('evidence/map-results.json',JSON.stringify({url,results},null,2));
