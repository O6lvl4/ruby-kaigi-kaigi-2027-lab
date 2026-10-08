import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {DefaultRubyVM} from '@ruby/wasm-wasi/dist/node';
const path='node_modules/@ruby/4.0-wasm-wasi/dist/ruby+stdlib.wasm';
const bytes=await readFile(path); const start=performance.now();
const module=await WebAssembly.compile(bytes); const compiled=performance.now();
const {vm,instance}=await DefaultRubyVM(module);
const result={artifact:path,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,compileMs:compiled-start,bootMs:performance.now()-compiled,ruby:vm.eval('RUBY_DESCRIPTION').toString(),platform:vm.eval('RUBY_PLATFORM').toString(),memory:instance.exports.memory.buffer.byteLength,rss:process.memoryUsage().rss};
console.log(JSON.stringify(result,null,2));
