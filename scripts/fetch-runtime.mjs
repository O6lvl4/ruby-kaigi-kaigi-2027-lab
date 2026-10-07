import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const url='https://rails-blog-on-wasm.vladem.com/app.wasm';
const expected='de9cc366e32e24a13b58b7bf1409744fd50159d6554f8575fc325a5a4b3605d4';
const path='public/base-app.wasm';
const sha=buffer=>createHash('sha256').update(buffer).digest('hex');
try { if(sha(await readFile(path))===expected){console.log('Pinned Rails/Wasm runtime already present');process.exit(0);} } catch {}
console.log('Downloading 79 MiB upstream Rails/Wasm demo runtime over HTTPS…');
const response=await fetch(url);
if(!response.ok)throw new Error(`Download failed: ${response.status}`);
const bytes=Buffer.from(await response.arrayBuffer());
const actual=sha(bytes);
if(actual!==expected)throw new Error(`Runtime checksum changed (${actual}). Do not execute it until reviewed.`);
await mkdir('public',{recursive:true});await writeFile(path,bytes);
console.log('Runtime checksum verified:',expected);
