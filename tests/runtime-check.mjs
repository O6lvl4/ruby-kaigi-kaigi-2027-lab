import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.DEMO_URL || 'http://127.0.0.1:5173/';
for(const [name,engine] of Object.entries({chromium,webkit})){
 const browser=await engine.launch();
 try{
  const context=await browser.newContext({viewport:{width:390,height:844}});const page=await context.newPage();const requests=[];
  page.on('request',r=>requests.push(r.url()));
  await page.goto(new URL('runtime-check.html',base).href);
  assert.match(await page.locator('#saved-stage').innerText(),/まだ起動の記録がありません/);
  assert.ok(!requests.some(u=>/\.wasm|rails\.worker|cyberjapandata|postgres|duckdb/i.test(u)),'Diagnostic landing must not boot any runtime');
  await page.locator('#run-check').click();
  await page.waitForFunction(()=>document.querySelector('#check-results').children.length===3 || document.querySelector('#run-check').disabled===false,null,{timeout:180000});
  assert.equal(await page.locator('#check-results li').count(),3);
  assert.match(await page.locator('#check-status').innerText(),/地図は起動していません/);
  assert.ok(requests.some(u=>u.includes('base-app.wasm?release=28acbb22')));
  assert.ok(!requests.some(u=>/cyberjapandata|postgres|duckdb/i.test(u)),'Isolated Rails check must not load map or databases');
  const second=await context.newPage();await second.goto(new URL('runtime-check.html',base).href);
  assert.match(await second.locator('#saved-stage').innerText(),/Ruby・Rails・本文生成が完了/);
  assert.equal(await second.locator('#check-results li').count(),0,'Second tab must only read the local record');
  await second.screenshot({path:`evidence/runtime-check-${name}.png`,fullPage:true});
  console.log('PASS lightweight landing, isolated Ruby→Rails→ERB, persistent local stage in new tab',name);await context.close();
 }finally{await browser.close();}
}
