// Ruby 4.0.7 + Rails 8.1.4 (built in wasm/, ruby.wasm 2.10.1) for the guide and the lab.
// The Rails app is mounted read-only at /demo as an in-memory WASI directory, so
// nothing is written through Ruby and the app needs no runtime rebuild to change.
import { ConsoleStdout, Directory, File, OpenFile, PreopenDirectory, WASI } from '@bjorn3/browser_wasi_shim';
import { RubyVM } from '@ruby/wasm-wasi';

// Keep in step with scripts/fetch-runtime.mjs (RAILS_RUNTIME).
export const RAILS_RUNTIME_URL = `${import.meta.env.BASE_URL}rails-runtime.wasm?release=b28170cc`;
// Exact size of the pinned runtime; Content-Length may be the compressed size instead.
const RAILS_RUNTIME_BYTES = 43452267;

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

// Downloads the runtime, reporting the fraction received so far.
async function download(url, onRatio) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Ruby/Wasm を取得できませんでした（${response.status}）`);
  if (!response.body) return response.arrayBuffer();
  const reader = response.body.getReader();
  const bytes = new Uint8Array(RAILS_RUNTIME_BYTES);
  let received = 0;
  let percent = -1;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (received + value.length > bytes.length) throw new Error('Ruby/Wasm のサイズが想定と異なります');
    bytes.set(value, received);
    received += value.length;
    const ratio = received / bytes.length;
    if (Math.floor(ratio * 100) === percent) continue;
    percent = Math.floor(ratio * 100);
    onRatio(ratio);
  }
  return bytes.subarray(0, received);
}

// Share of starting Ruby + Rails taken by the download; the rest is compile and boot.
const DOWNLOAD_SHARE = 0.85;

// onProgress(message, ratio): ratio is how far starting Ruby + Rails has got (0–1).
export async function bootRailsRuntime({ files, mountPoint, env = {}, onProgress = () => {} }) {
  const downloading = 'Ruby/Wasm をダウンロードしています…';
  onProgress(downloading, 0);
  const bytes = await download(RAILS_RUNTIME_URL, ratio => onProgress(downloading, ratio * DOWNLOAD_SHARE));
  onProgress('Ruby/Wasm を起動しています…', DOWNLOAD_SHARE);
  const module = await WebAssembly.compile(bytes);
  const fds = [
    new OpenFile(new File([])),
    ConsoleStdout.lineBuffered(line => console.log(line)),
    ConsoleStdout.lineBuffered(line => console.warn(line)),
    new PreopenDirectory(mountPoint, directoryTree(files, mountPoint))
  ];
  const wasi = new WASI(
    [],
    Object.entries({ RAILS_ENV: 'production', ...env }).map(([key, value]) => `${key}=${value}`),
    fds
  );
  const { vm } = await RubyVM.instantiateModule({ module, wasip1: wasi });
  return vm;
}
