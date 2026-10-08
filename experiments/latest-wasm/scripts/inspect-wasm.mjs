import {readFile} from 'node:fs/promises'; import {createHash} from 'node:crypto';
const file=process.argv[2]; if(!file)throw Error('Usage: node inspect-wasm.mjs FILE');
const b=await readFile(file); let p=8;
const u=()=>{let n=0,s=0;for(let i=0;i<5;i++){const x=b[p++];n+=(x&127)*2**s;if(!(x&128))return n;s+=7;}throw Error('Invalid LEB128');};
const info={file,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex'),sections:[]};
while(p<b.length){const id=b[p++],size=u(),start=p;const row={id,size};if(id===0){const len=u();row.name=b.subarray(p,p+len).toString();} if(id===3)info.definedFunctions=u();if(id===5){const count=u();info.memories=[];for(let i=0;i<count;i++){const flags=u(),initialPages=u();info.memories.push({flags,initialPages,initialBytes:initialPages*65536,...(flags&1?{maximumPages:u()}: {})});}}info.sections.push(row);p=start+size;}
console.log(JSON.stringify(info,null,2));
