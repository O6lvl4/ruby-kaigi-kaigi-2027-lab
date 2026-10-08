import './map.css';
const $ = id => document.getElementById(id);
let worker, sequence = 0, generation = 0;
const pending = new Map();
let lastStep = 'starting';
let lastDiagnostic = '';
let timeout, mapDispose, booting = false;
const CHECKPOINT_KEY = 'rubykaigi-boot-checkpoint-v1';
let previousCheckpoint;
try { previousCheckpoint = JSON.parse(sessionStorage.getItem(CHECKPOINT_KEY) || 'null'); } catch {}
function checkpoint(state, stage) {
  try { sessionStorage.setItem(CHECKPOINT_KEY, JSON.stringify({build: BUILD, state, stage, at: new Date().toISOString()})); } catch {}
}
function diagnostic(error = '') {
  return JSON.stringify({build: BUILD, time: new Date().toISOString(), stage: lastStep, error, previous: previousCheckpoint, browser: navigator.userAgent}, null, 2);
}
const BUILD = import.meta.env.VITE_BUILD_ID || 'rails-reading-home-v1';
function rpc(type, extra = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    worker.postMessage({ id, type, ...extra });
  });
}
function request(path, accept = 'application/json') {
  return rpc('request', { request: { method: 'GET', path, accept } });
}
function dispose() {
  mapDispose?.();
  mapDispose = null;
  worker?.terminate();
  worker = null;
  for (const call of pending.values()) call.reject(new Error('読み込みを中断しました'));
  pending.clear();
  clearTimeout(timeout);
}
function fail(error, run) {
  if (run !== generation) return;
  generation++;
  booting = false;
  checkpoint('error', lastStep);
  dispose();
  document.querySelector('#boot-panel h1').textContent = 'まとめを表示できませんでした';
  $('boot-status').textContent = 'Rails/Wasm でまとめを生成できませんでした';
  $('boot-error').textContent = error.message || String(error);
  $('boot-error').hidden = false;
  $('retry').hidden = false;
  $('diagnostics').hidden = false;
  $('rails-root').hidden = true;
  $('boot-panel').hidden = false;
  lastDiagnostic = diagnostic(error.message || String(error));
  $('diagnostic-text').textContent = lastDiagnostic;
  window.summaryApp.ready = false;
  window.summaryApp.error = error.message || String(error);
}
async function start() {
  if (booting) return;
  booting = true;
  const run = ++generation;
  dispose();
  $('boot-panel').hidden = false;
  $('rails-root').hidden = true;
  $('rails-root').replaceChildren();
  $('boot-error').hidden = true;
  $('retry').hidden = true;
  $('diagnostics').hidden = true;
  $('copy-status').textContent = '';
  document.querySelector('#boot-panel h1').textContent = 'まとめを読み込んでいます';
  $('boot-status').textContent = 'Ruby / Rails を読み込んでいます…';
  window.summaryApp.ready = false;
  window.summaryApp.error = null;
  window.summaryApp.mapReady = false;
  window.summaryApp.mapError = null;
  window.summaryApp.lastResponse = null;
  lastStep = 'Ruby/Wasm worker startup';
  checkpoint('booting', lastStep);
  worker = new Worker(new URL('./rails.worker.js', import.meta.url), { type: 'module' });
  worker.onmessage = ({ data }) => {
    if (run !== generation) return;
    if (data.type === 'progress') {
      lastStep = data.message;
      checkpoint('booting', lastStep);
      $('boot-status').textContent = /Loading/.test(data.message) ? 'Ruby/Wasm をダウンロードしています…' : /Instantiating/.test(data.message) ? 'Ruby/Wasm を起動しています…' : data.message;
      return;
    }
    const call = pending.get(data.id);
    if (!call) return;
    pending.delete(data.id);
    data.error ? call.reject(new Error(data.error)) : call.resolve(data.result);
  };
  worker.onerror = event => { event.preventDefault(); fail(new Error(event.message || 'Wasm worker error'), run); dispose(); };
  timeout = setTimeout(() => { fail(new Error('読み込みが3分以内に完了しませんでした。通信状況を確認して再試行してください。'), run); dispose(); }, 180000);
  try {
    // The reading application uses real Rails but does not open the lab's persistent database.
    await rpc('boot', { mode: 'summary' });
    lastStep = 'Rails GET /summary → SummaryController → ActionView ERB';
    checkpoint('booting', lastStep);
    $('boot-status').textContent = 'Rails の ERB ビューでまとめを生成しています…';
    const response = await request('/summary', 'text/html');
    if (run !== generation) return;
    if (response.status !== 200 || response.headers['x-summary-renderer'] !== 'Rails-ActionView-ERB' || response.headers['x-ruby-platform'] !== 'wasm32-wasi' || typeof response.body !== 'string') throw new Error('Rails のまとめレスポンスを確認できませんでした');
    // Only our trusted Rails ERB template can supply this response. No external HTML is accepted.
    $('rails-root').innerHTML = response.body;
    $('rails-root').hidden = false;
    $('boot-panel').hidden = true;
    window.summaryApp.lastResponse = response;
    window.summaryApp.ready = true;
    window.summaryApp.renderer = 'Rails-ActionView-ERB';
    clearTimeout(timeout);
    try {
      const { initMapGuide } = await import('./map.js');
      if (run !== generation) return;
      const cleanup = await initMapGuide(request);
      if (run !== generation) { cleanup?.(); return; }
      mapDispose = cleanup;
    } catch (mapError) {
      const status=document.getElementById('map-status');
      if(status){status.textContent='地図を起動できませんでした。地点カードと公式の出典はそのまま確認できます。';status.classList.add('map-warning');}
      window.summaryApp.mapError=mapError.message;
    }
    booting = false;
    checkpoint('ready', 'Rails summary and map initialization completed');
    if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
  } catch (error) { if (!window.summaryApp.error) fail(error, run); }
}
$('retry').addEventListener('click', start);
$('copy-diagnostics').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(lastDiagnostic); $('copy-status').textContent = 'コピーしました'; }
  catch { $('copy-status').textContent = 'コピーできませんでした。上の詳細を選択してコピーしてください'; }
});
window.summaryApp = { ready: false, error: null, request, lastResponse: null, build: BUILD };
if (previousCheckpoint?.state === 'booting') {
  $('boot-status').textContent = '前回の読み込みが途中で中断されました';
  $('boot-error').textContent = `最後に記録した段階：${previousCheckpoint.stage}。再読み込み・タブ終了・ブラウザの停止など、中断の理由はここでは特定できません。`;
  $('boot-error').hidden = false;
  $('retry').hidden = false;
  $('retry').textContent = '読み込みを再開する';
  $('diagnostics').hidden = false;
  lastStep = 'Waiting for explicit retry after interrupted boot';
  lastDiagnostic = diagnostic('Previous load did not finish');
  $('diagnostic-text').textContent = lastDiagnostic;
} else {
  start();
} 
