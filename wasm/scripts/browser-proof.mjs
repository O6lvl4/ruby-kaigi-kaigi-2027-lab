import {chromium,webkit} from 'playwright';import assert from 'node:assert/strict';import {writeFile} from 'node:fs/promises';
const base='http://127.0.0.1:4178/';const report=[];
for(const [name,engine] of Object.entries(process.env.CHROMIUM_ONLY?{chromium}:{chromium,webkit})){
 const browser=await engine.launch(name==='chromium'&&process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{});const context=await browser.newContext({viewport:{width:390,height:844}});const page=await context.newPage();const errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));page.on('console',m=>console.log(name,m.type(),m.text()));
 try {
  await page.goto(base);assert.equal(await page.locator('#status').innerText(),'未開始');assert.ok(!requests.some(url=>url.endsWith('.wasm')),'Landing must not load Wasm');
  await page.locator('#start').click();await page.locator('#stop').click();assert.equal(await page.locator('#start').isEnabled(),true,'Stop must permit restart');
  await page.locator('#start').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('テスト成功')||document.querySelector('#status').textContent.includes('失敗')||document.querySelector('#status').textContent.includes('エラー'),null,{timeout:120000});
  const first=await page.locator('#log').innerText();assert.match(await page.locator('#status').innerText(),/テスト成功/);assert.match(await page.locator('#view').innerText(),/Ruby 4.0.7 \/ Rails 8.1.4/);assert.match(first,/"platform":"wasm32-wasi"/);assert.equal(await page.locator('#stop').isEnabled(),false,'Successful worker terminates');
  await page.screenshot({path:`evidence/foundation-${name}.png`,fullPage:true});
  await page.locator('#start').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('テスト成功')||document.querySelector('#status').textContent.includes('失敗'),null,{timeout:120000});assert.match(await page.locator('#status').innerText(),/テスト成功/);
  await page.reload();assert.equal(await page.locator('#status').innerText(),'未開始');assert.match(await page.locator('#log').innerText(),/前回の最終状態/);
  await page.locator('#start').click();await page.goto('about:blank');await page.goBack();assert.equal(await page.locator('#start').isEnabled(),true,'Back navigation can restart');
  assert.deepEqual(errors,[]);assert.ok(!requests.some(url=>/pglite|postgres|duckdb|map/i.test(new URL(url).pathname)));
  report.push({engine:name,passed:true,viewport:'390x844',physicalIPhone:false,checks:['no automatic Wasm','stop and restart','real Ruby/Rails/ERB/JSON','repeat boot','reload persisted stage','back during boot','no map/database requests'],log:first});
 } catch(error){await page.screenshot({path:`evidence/foundation-${name}-failure.png`,fullPage:true});console.error(await page.locator('body').innerText());throw error;} finally {await context.close();await browser.close();}
}
await writeFile('evidence/browser-proof.json',JSON.stringify(report,null,2));console.log('BROWSER_PROOF_PASSED',report.map(x=>x.engine));
