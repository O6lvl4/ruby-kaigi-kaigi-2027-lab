// Run on a normal development computer where browser launch is supported.
// This is intentionally NOT a substitute for the recorded Node Wasm checks.
import { chromium } from 'playwright';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
const profile=await mkdtemp(join(tmpdir(),'miyazaki-wasm-e2e-'));
const url=process.env.DEMO_URL || 'http://127.0.0.1:5173';
const options={headless:true,viewport:{width:1360,height:1100},...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH}:{})};
const results=[];
let context;
async function open(){
 context=await chromium.launchPersistentContext(profile,options);
 const page=await context.newPage();
 await page.goto(url);
 await page.waitForFunction(()=>window.demo?.ready,null,{timeout:180000});
 return page;
}
function pass(name){results.push({name,status:'PASS'});console.log('PASS',name);}
try{
 let page=await open();
 assert.equal(await page.locator('#count').textContent(),'0');pass('Fresh browser IndexedDB is empty');
 await page.getByLabel('名前',{exact:true}).fill('架空・再起動テスト会場');
 await page.getByRole('button',{name:'Rails で検証して保存'}).click();
 await page.getByText('保存しました。IndexedDB への書き込みが完了しています',{exact:true}).waitFor();
 assert.equal(await page.locator('#count').textContent(),'1');pass('UI creates via Rails and renders stored candidate');
 let snapshot=await page.evaluate(()=>window.demo.snapshot());
 assert.deepEqual(snapshot.summaries,[{category:'venue',count:1,capacity:50,cost:100000}]);pass('DuckDB browser aggregation matches');
 const invalid=await page.evaluate(()=>window.demo.request('POST','/venues',{venue:{name:'',area:'架空',category:'venue',capacity:-1,estimated_cost:-1}}));
 assert.equal(invalid.status,422);pass('Rails rejects invalid browser request');
 const tab2=await context.newPage();await tab2.goto(url);
 await tab2.getByText(/別のタブでこのデモが開いています/).waitFor();pass('Second writer tab is blocked');await tab2.close();
 await mkdir('evidence',{recursive:true});await page.screenshot({path:'evidence/browser-desktop.png',fullPage:true});
 await context.close(); // Actually terminates the persistent Chromium instance.
 page=await open();
 snapshot=await page.evaluate(()=>window.demo.snapshot());
 assert.equal(snapshot.records.length,1);assert.equal(snapshot.records[0].name,'架空・再起動テスト会場');pass('Full browser close/relaunch preserves IndexedDB record');
 assert.deepEqual(snapshot.summaries,[{category:'venue',count:1,capacity:50,cost:100000}]);pass('DuckDB aggregate reconstructs after browser reopen');
 await page.setViewportSize({width:390,height:844});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));pass('Mobile layout has no horizontal overflow');
 await page.screenshot({path:'evidence/browser-mobile.png',fullPage:true});
 await writeFile('evidence/browser-results.json',JSON.stringify({status:'PASS',profile,results},null,2));
}finally{await context?.close();}
