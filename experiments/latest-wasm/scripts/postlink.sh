#!/usr/bin/env bash
set -euo pipefail
module=$1
script_dir=$(cd "$(dirname "$0")" && pwd)
cp "$module" "$module.before-asyncify"
node --input-type=module - "$module.before-asyncify" "$module.stripped" "$script_dir/strip-runtime.mjs" <<'JS'
import {readFile,writeFile} from 'node:fs/promises';import {pathToFileURL} from 'node:url';const [, ,input,output,helper]=process.argv;const {stripDebug}=await import(pathToFileURL(helper));const bytes=await readFile(input);if(bytes.length<8)throw Error('Empty or invalid pre-link Wasm');await writeFile(output,stripDebug(bytes));
JS
BINARYEN_CORES=2 "${WASM_OPT:?Set WASM_OPT}" --asyncify -O1 --pass-arg=asyncify-ignore-imports -o "$module.optimized" "$module.stripped"
node --input-type=module - "$module.optimized" <<'JS'
import {readFile} from 'node:fs/promises';const b=await readFile(process.argv[2]);if(b.length<8)throw Error('Empty optimized Wasm');const m=await WebAssembly.compile(b);const names=WebAssembly.Module.exports(m).map(x=>x.name);for(const name of ['asyncify_start_unwind','asyncify_stop_unwind','asyncify_start_rewind','asyncify_stop_rewind'])if(!names.includes(name))throw Error(`Missing ${name}`);
JS
mv "$module.optimized" "$module"
