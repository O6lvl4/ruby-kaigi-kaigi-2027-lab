import { chromium, webkit } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const base=process.env.DEMO_URL || 'http://127.0.0.1:5173/';
const results=[];
await mkdir('evidence',{recursive:true});
for(const [name,engine] of Object.entries({chromium,webkit})){
 const browser=await engine.launch({headless:true});
 try {
  for(const [size,viewport] of Object.entries({desktop:{width:1360,height:1000},mobile:{width:390,height:844}})){
   const context=await browser.newContext({javaScriptEnabled:false,viewport});
   const page=await context.newPage();const requested=[];const failures=[];
   page.on('request',r=>requested.push(r.url()));page.on('requestfailed',r=>failures.push(r.url()));
   await page.goto(base,{waitUntil:'networkidle'});
   await page.getByRole('heading',{name:'いま分かっていること。',exact:true}).waitFor();
   assert.match(await page.locator('body').innerText(),/2027年4月14日〜16日/);
   assert.match(await page.locator('body').innerText(),/情報確認日 2026年10月8日/);
   assert.equal(await page.locator('form,input,button').count(),0,'Reading home must not be a form');
   assert.equal(requested.some(x=>/\.wasm(?:\?|$)|rails\.worker|duckdb|postgres/.test(x)),false,'No heavyweight runtimes on home');
   assert.deepEqual(failures,[]);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal overflow');
   for(const id of ['overview','access','pending','next'])assert.equal(await page.locator('#'+id).count(),1);
   await page.locator('a[href="#pending"]').click();assert.equal(new URL(page.url()).hash,'#pending');
   await page.locator('summary').click();
   assert.equal(await page.getByRole('link',{name:'技術デモを開く',exact:true}).getAttribute('href'),'./lab.html');
   assert.equal(await page.locator('a[href="https://rubykaigi.org/2027/"]').count()>0,true);
   await page.screenshot({path:`evidence/summary-${name}-${size}.png`,fullPage:true});
   results.push({engine:name,viewport:size,status:'PASS',javaScriptEnabled:false,wasmRequests:0,requests:requested.length});
   console.log('PASS reading summary',name,size,'without JS/Wasm');
   await context.close();
  }
  const context=await browser.newContext();const page=await context.newPage();const requests=[];
  page.on('request',r=>requests.push(r.url()));await page.goto(base,{waitUntil:'networkidle'});
  assert.equal(requests.some(x=>/\.wasm(?:\?|$)|rails\.worker|duckdb|postgres/.test(x)),false);
  results.push({engine:name,status:'PASS',javaScriptEnabled:true,wasmRequests:0});
  console.log('PASS reading summary',name,'with JS enabled still requests no Wasm');
  await context.close();
 }finally{await browser.close();}
}
await writeFile('evidence/summary-results.json',JSON.stringify({url:base,results},null,2));
