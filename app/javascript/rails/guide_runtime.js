// Ruby 4.0.7 + Rails 8.1.4 (built in wasm/, ruby.wasm 2.10.1) for the reading guide.
// The Rails app is mounted read-only at /demo as an in-memory WASI directory, so
// nothing is written through Ruby and the app needs no runtime rebuild to change.
import { ConsoleStdout, Directory, File, OpenFile, PreopenDirectory, WASI } from '@bjorn3/browser_wasi_shim-0.4';
import { RubyVM } from '@ruby/wasm-wasi-2.10';

// Keep in step with scripts/fetch-runtime.mjs (GUIDE_RUNTIME).
export const GUIDE_RUNTIME_URL = `${import.meta.env.BASE_URL}guide-runtime.wasm?release=58e96a81`;

const encoder = new TextEncoder();

// { '/demo/config/routes.rb': '…' } → nested Directory under the mount point.
function directoryTree(files, mountPoint) {
  const root = new Map();
  for (const [path, source] of Object.entries(files)) {
    const parts = path.slice(mountPoint.length + 1).split('/');
    const name = parts.pop();
    let level = root;
    for (const part of parts) {
      if (!level.has(part)) level.set(part, new Directory(new Map()));
      level = level.get(part).contents;
    }
    level.set(name, new File(encoder.encode(source), { readonly: true }));
  }
  return root;
}

export async function bootGuideRuntime({ files, mountPoint, env = {}, onProgress = () => {} }) {
  onProgress('Ruby/Wasm をダウンロードしています…');
  const response = await fetch(GUIDE_RUNTIME_URL);
  if (!response.ok) throw new Error(`Ruby/Wasm を取得できませんでした（${response.status}）`);
  const bytes = await response.arrayBuffer();
  onProgress('Ruby/Wasm を起動しています…');
  const module = await WebAssembly.compile(bytes);
  const fds = [
    new OpenFile(new File([])),
    ConsoleStdout.lineBuffered(line => console.log(line)),
    ConsoleStdout.lineBuffered(line => console.warn(line)),
    new PreopenDirectory(mountPoint, directoryTree(files, mountPoint))
  ];
  const wasi = new WASI(
    [],
    Object.entries(env).map(([key, value]) => `${key}=${value}`),
    fds
  );
  const { vm } = await RubyVM.instantiateModule({ module, wasip1: wasi });
  return vm;
}
