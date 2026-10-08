importScripts('./ruby-browser.umd.js');
let started=false;
self.onmessage=async({data})=>{if(data.type!=='start'||started)return;started=true;const stage=(name,details={})=>postMessage({type:'stage',stage:name,details});try{
 stage('Wasm をダウンロード');const response=await fetch('./foundation.wasm');if(!response.ok)throw Error(`Runtime download: ${response.status}`);const bytes=await response.arrayBuffer();
 stage('Wasm をコンパイル',{bytes:bytes.byteLength});const begin=performance.now();const module=await WebAssembly.compile(bytes);const compileMs=performance.now()-begin;
 stage('Ruby を起動',{compileMs});const {vm,instance}=await self['ruby-wasm-wasi'].DefaultRubyVM(module,{env:{RAILS_ENV:'production'}});
 const ruby=vm.eval('RUBY_VERSION').toString();const platform=vm.eval('RUBY_PLATFORM').toString();if(ruby!=='4.0.7'||!platform.includes('wasm'))throw Error(`Wrong runtime: ${ruby} ${platform}`);
 stage('Rails を初期化',{ruby,platform,memoryBytes:instance.exports.memory.buffer.byteLength});await vm.evalAsync("require '/app/boot'");
 stage('実際の ERB と JSON を検証',{rails:vm.eval('Rails.version').toString(),memoryBytes:instance.exports.memory.buffer.byteLength});
 const result=JSON.parse((await vm.evalAsync("load '/app/proof.rb'; JSON.generate(runtime: JSON.parse(FoundationProof.request('/runtime.json')[:body]), html: FoundationProof.request('/?name=Ruby%20on%20Wasm')[:body])")).toString());
 postMessage({type:'success',result:{...result,compileMs,memoryBytes:instance.exports.memory.buffer.byteLength}});
}catch(error){postMessage({type:'error',error:error?.stack||String(error)});}};
