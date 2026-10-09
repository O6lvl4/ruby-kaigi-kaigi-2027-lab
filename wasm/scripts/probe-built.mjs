import {readFile} from 'node:fs/promises'; import {createHash} from 'node:crypto'; import {WASI} from 'node:wasi'; import {RubyVM} from '@ruby/wasm-wasi';
const file=process.argv[2]; const bytes=await readFile(file);const start=performance.now(); const module=await WebAssembly.compile(bytes);const compiled=performance.now();let initial;
const wasi=new WASI({version:'preview1',returnOnExit:true,env:{RAILS_ENV:'production'}});
const {vm,instance}=await RubyVM.instantiateModule({module,wasip1:wasi,setMemory:m=>{initial=m.buffer.byteLength;}});
const ruby=vm.eval('RUBY_VERSION').toString();if(ruby!=='4.0.7')throw Error(`Wrong embedded Ruby: ${ruby}`);
const platform=vm.eval('RUBY_PLATFORM').toString();if(!platform.includes('wasm'))throw Error(`Wrong platform: ${platform}`);
console.log(JSON.stringify({marker:'RUBY_407_WASM_BOOT_PASSED',file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),ruby,platform,compileMs:compiled-start,bootMs:performance.now()-compiled,initialMemory:initial,bootMemory:instance.exports.memory.buffer.byteLength,rss:process.memoryUsage().rss,maxRssKiB:process.resourceUsage().maxRSS},null,2));
