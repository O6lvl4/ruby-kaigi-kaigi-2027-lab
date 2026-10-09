import {readFile} from 'node:fs/promises'; import {WASI} from 'node:wasi'; import {RubyVM} from '@ruby/wasm-wasi';
const bytes=await readFile('node_modules/@ruby/4.0-wasm-wasi/dist/ruby+stdlib.wasm');
const module=await WebAssembly.compile(bytes); const env=process.env.SMALL_HEAPS?Object.fromEntries(Array.from({length:6},(_,i)=>[`RUBY_GC_HEAP_${i}_INIT_SLOTS`,'100'])):{};
const wasi=new WASI({version:'preview1',returnOnExit:true,env});let initial;
const {vm,instance}=await RubyVM.instantiateModule({module,wasip1:wasi,setMemory:m=>{initial=m.buffer.byteLength;}});
console.log(JSON.stringify({env,initial,boot:instance.exports.memory.buffer.byteLength,rss:process.memoryUsage().rss,stats:vm.eval('GC.stat.inspect').toString(),heaps:vm.eval('GC.stat_heap.inspect').toString()},null,2));
