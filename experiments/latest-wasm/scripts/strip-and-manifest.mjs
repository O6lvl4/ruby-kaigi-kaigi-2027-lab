import {dirname,join} from 'node:path';import {readFile,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';import {sections,stripDebug} from './strip-runtime.mjs';
const [input,output]=process.argv.slice(2);if(!output)throw Error('Usage: strip-and-manifest.mjs INPUT OUTPUT');
const original=await readFile(input),stripped=stripDebug(original);const code=x=>Buffer.concat(sections(x).filter(s=>s.id!==0).map(s=>s.bytes));
if(!code(original).equals(code(stripped)))throw Error('Core Wasm sections changed while stripping');
await writeFile(output,stripped);const sha=x=>createHash('sha256').update(x).digest('hex');
const manifest={ruby:'4.0.7',rails:'8.1.4',toolkit:'2.10.1',experimental:true,physicalIPhoneVerified:false,inputBytes:original.length,bytes:stripped.length,sourceSha256:sha(original),sha256:sha(stripped),coreSectionsIdentical:true};
await writeFile(join(dirname(output),'runtime-manifest.json'),JSON.stringify(manifest,null,2));console.log(JSON.stringify(manifest,null,2));
