// WebAssembly custom sections do not change execution semantics.
// Only DWARF sections are removed; name/producers/features and every core byte stay intact.
export function sections(bytes) {
  if (Buffer.from(bytes.subarray(0,8)).toString('hex') !== '0061736d01000000') throw new Error('Unexpected Wasm header');
  function u32(offset) {
    let value=0,shift=0;
    for(let n=0;n<5;n++) { if(offset>=bytes.length)throw new Error('Truncated Wasm length');const byte=bytes[offset++];value+=(byte&127)*2**shift;if(!(byte&128))return [value,offset];shift+=7; }
    throw new Error('Invalid Wasm length');
  }
  const result=[];let offset=8;
  while(offset<bytes.length) {
    const start=offset,id=bytes[offset++];const [length,payload]=u32(offset);const end=payload+length;
    if(end>bytes.length)throw new Error('Truncated Wasm section');
    let name='';if(id===0){const [size,text]=u32(payload);if(text+size>end)throw new Error('Invalid custom section');name=new TextDecoder().decode(bytes.subarray(text,text+size));}
    result.push({id,name,bytes:bytes.subarray(start,end)});offset=end;
  }
  return result;
}
export function stripDebug(bytes) {
  const kept=sections(bytes).filter(section=>!section.name.startsWith('.debug_'));
  return Buffer.concat([bytes.subarray(0,8),...kept.map(section=>section.bytes)]);
}
