import { initSiteNavigation } from './site-navigation.js';
import { initAddressTools } from './address-tools.js';
import { initDiningGuide } from './dining.js';
import './map.css';
import {saveStage,stageLabel} from './runtime-status.js';
const $ = id => document.getElementById(id);
let worker, sequence = 0, generation = 0;
const pending = new Map();
const renderedResponses = new Map();
let lastStep = 'starting';
let lastDiagnostic = '';
let timeout, mapDispose, diningDispose, addressDispose, navigationDispose, booting = false;
const CHECKPOINT_KEY = 'rubykaigi-boot-checkpoint-v1';
let previousCheckpoint;
try { previousCheckpoint = JSON.parse(sessionStorage.getItem(CHECKPOINT_KEY) || 'null'); } catch {}
function checkpoint(state, stage) {
  stage=stageLabel(stage);
  saveStage({build:BUILD,state,stage,at:new Date().toISOString(),source:'reading'});
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
  const key=`${accept} ${path}`;
  if(renderedResponses.has(key))return Promise.resolve(renderedResponses.get(key));
  if(!worker)return Promise.reject(new Error('この読み取り結果は事前生成されていません'));
  window.summaryApp.railsRequestCount++;
  return rpc('request', { request: { method: 'GET', path, accept } });
}
function dispose() {
  navigationDispose?.(); navigationDispose=null;
  diningDispose?.(); diningDispose=null;
  addressDispose?.(); addressDispose=null;
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
function resetBootView() {
  $('boot-panel').hidden = false;
  $('rails-root').hidden = true;
  $('rails-root').replaceChildren();
  renderedResponses.clear();
  window.summaryApp.runtimeReleased = false;
  window.summaryApp.railsRequestCount = 0;
  $('boot-error').hidden = true;
  $('retry').hidden = true;
  $('diagnostics').hidden = true;
  $('copy-status').textContent = '';
  document.querySelector('#boot-panel h1').textContent = 'まとめを読み込んでいます';
  $('boot-status').textContent = 'Ruby / Rails を読み込んでいます…';
  Object.assign(window.summaryApp, {ready:false,error:null,mapReady:false,mapError:null,lastResponse:null});
  lastStep = 'Ruby/Wasm worker startup';
  checkpoint('booting', lastStep);
}
function progressMessage(message) {
  if (/Loading/.test(message)) return 'Ruby/Wasm をダウンロードしています…';
  if (/Instantiating/.test(message)) return 'Ruby/Wasm を起動しています…';
  return message;
}
function receiveWorkerMessage(run, data) {
  if (run !== generation) return;
  if (data.type === 'progress') {
    lastStep = data.message;
    checkpoint('booting', lastStep);
    $('boot-status').textContent = progressMessage(data.message);
    return;
  }
  const call = pending.get(data.id);
  if (!call) return;
  pending.delete(data.id);
  if (data.error) call.reject(new Error(data.error));
  else call.resolve(data.result);
}
function createWorker(run) {
  worker = new Worker(new URL('./rails.worker.js', import.meta.url), { type: 'module' });
  worker.onmessage = ({data}) => receiveWorkerMessage(run, data);
  worker.onerror = event => {
    event.preventDefault();
    fail(new Error(event.message || 'Wasm worker error'), run);
  };
  timeout = setTimeout(() => fail(new Error('読み込みが3分以内に完了しませんでした。通信状況を確認して再試行してください。'), run), 180000);
}
function verifySummary(response) {
  const valid = response.status === 200
    && response.headers['x-summary-renderer'] === 'Rails-ActionView-ERB'
    && response.headers['x-ruby-platform'] === 'wasm32-wasi'
    && typeof response.body === 'string';
  if (!valid) throw new Error('Rails のまとめレスポンスを確認できませんでした');
}
async function cacheReadingResults(response) {
  verifySummary(response);
  renderedResponses.set('text/html /summary', response);
  lastStep = 'Rails で3つの導線を生成しています';
  checkpoint('booting', lastStep);
  $('boot-status').textContent = lastStep;
  for (const path of ['/summary.json','/map.json?scenario=arrival','/map.json?scenario=venue','/map.json?scenario=night']) {
    const generated = await request(path);
    if (generated.status !== 200) throw new Error('Rails の導線生成に失敗しました');
    renderedResponses.set(`application/json ${path}`, generated);
  }
}
function releaseRuntime() {
  // Retain only bounded, genuine Rails outputs before any interaction begins.
  worker.terminate();
  worker = null;
  window.summaryApp.runtimeReleased = true;
  lastStep = 'Rails の生成完了。実行用メモリを解放しました';
  checkpoint('booting', lastStep);
}
function mountGuide(response) {
  // Only the verified local Rails ERB response supplies this HTML.
  $('rails-root').innerHTML = response.body;
  $('rails-root').hidden = false;
  $('boot-panel').hidden = true;
  navigationDispose = initSiteNavigation($('rails-root'));
  addressDispose = initAddressTools($('rails-root'));
  const references = renderedResponses.get('application/json /summary.json').body.references;
  diningDispose = initDiningGuide(references.restaurantSection.restaurants);
  window.summaryApp.lastResponse = response;
  window.summaryApp.ready = true;
  window.summaryApp.renderer = 'Rails-ActionView-ERB';
  clearTimeout(timeout);
}
function showMapError(error) {
  const status = document.getElementById('map-status');
  if (status) {
    status.textContent = '地図を起動できませんでした。地点カードと公式の出典はそのまま確認できます。';
    status.classList.add('map-warning');
  }
  window.summaryApp.mapError = error.message;
}
async function initializeCoreMap(run) {
  try {
    const {initMapGuide} = await import('./map.js');
    if (run !== generation) return false;
    const cleanup = await initMapGuide(request);
    if (run !== generation) { cleanup?.(); return false; }
    mapDispose = cleanup;
  } catch (error) {
    if (run !== generation) return false;
    showMapError(error);
  }
  return true;
}
async function start() {
  if (booting) return;
  booting = true;
  const run = ++generation;
  dispose();
  resetBootView();
  createWorker(run);
  try {
    await rpc('boot', {mode:'summary'});
    lastStep = 'Rails GET /summary → SummaryController → ActionView ERB';
    checkpoint('booting', lastStep);
    $('boot-status').textContent = 'Rails の ERB ビューでまとめを生成しています…';
    const response = await request('/summary', 'text/html');
    if (run !== generation) return;
    await cacheReadingResults(response);
    if (run !== generation) return;
    releaseRuntime();
    mountGuide(response);
    if (!await initializeCoreMap(run)) return;
    booting = false;
    checkpoint('ready', 'Rails summary and map initialization completed');
  } catch (error) {
    if (!window.summaryApp.error) fail(error, run);
  }
}
$('retry').addEventListener('click', start);
$('copy-diagnostics').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(lastDiagnostic); $('copy-status').textContent = 'コピーしました'; }
  catch { $('copy-status').textContent = 'コピーできませんでした。上の詳細を選択してコピーしてください'; }
});
window.summaryApp = { ready: false, error: null, request, lastResponse: null, build: BUILD };
if (previousCheckpoint?.state === 'booting') {
  $('boot-status').textContent = '前回の読み込みが途中で中断されました';
  $('boot-error').textContent = `最後に記録した段階：${stageLabel(previousCheckpoint.stage)}。再読み込み・タブ終了・ブラウザの停止など、中断の理由はここでは特定できません。`;
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
