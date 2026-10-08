import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { stripDebug, sections } from './strip-runtime.mjs';
const url='https://rails-blog-on-wasm.vladem.com/app.wasm';
const upstream='de9cc366e32e24a13b58b7bf1409744fd50159d6554f8575fc325a5a4b3605d4';
const release='28acbb22c853454d6b392dd4838f85051eff9d37ad0870c44ac75c17288d9e56';
const path='public/base-app.wasm';
const sha=buffer=>createHash('sha256').update(buffer).digest('hex');
let bytes;
try {bytes=await readFile(path);if(sha(bytes)===release){console.log('Verified release Rails/Wasm runtime already present');process.exit(0);}if(sha(bytes)!==upstream)bytes=null;} catch {}
if(!bytes){console.log('Downloading checksum-pinned upstream Ruby/Rails runtime…');const response=await fetch(url);if(!response.ok)throw new Error(`Download failed: ${response.status}`);bytes=Buffer.from(await response.arrayBuffer());}
if(sha(bytes)!==upstream)throw new Error('Upstream runtime checksum changed; do not execute it until reviewed');
const optimized=stripDebug(bytes);
if(sha(optimized)!==release)throw new Error('Release runtime checksum did not match');
const originalCore=Buffer.concat(sections(bytes).filter(x=>x.id!==0).map(x=>x.bytes));
const releaseCore=Buffer.concat(sections(optimized).filter(x=>x.id!==0).map(x=>x.bytes));
if(!originalCore.equals(releaseCore))throw new Error('Executable/data sections changed');
await mkdir('public',{recursive:true});await writeFile(path,optimized);
console.log(`Verified release runtime: ${bytes.length} → ${optimized.length} bytes; executable/data sections byte-identical; SHA256 ${release}`);
