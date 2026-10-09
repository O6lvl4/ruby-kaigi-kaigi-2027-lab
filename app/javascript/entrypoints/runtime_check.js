// runtime-check.html: loads no Wasm until asked, then checks Ruby → Rails → one ERB page.
import { RailsClient } from '../rails/client.js';
import { isRailsRendered } from '../rails/rendered_response.js';
import { readStage, saveStage, stageLabel } from '../runtime/status.js';

const BUILD = import.meta.env.VITE_BUILD_ID || 'local';
const TIMEOUT_MS = 180000;
const $ = id => document.getElementById(id);
let record = readStage();
let rails = null;

function display() {
  $('saved-stage').textContent = record
    ? `最後の記録：${record.stage}`
    : 'このブラウザには、まだ起動の記録がありません';
  $('saved-detail').textContent = record ? JSON.stringify(record, null, 2) : '';
}

function stage(state, message) {
  record = { build: BUILD, state, stage: stageLabel(message), at: new Date().toISOString(), source: 'isolated-check' };
  const saved = saveStage(record);
  display();
  $('check-status').textContent = record.stage + (saved ? '' : '（ブラウザ内への保存ができませんでした）');
}

function passed(message) {
  const item = document.createElement('li');
  item.textContent = message;
  $('check-results').append(item);
}

function stop() {
  rails?.dispose();
  rails = null;
  $('run-check').disabled = false;
}

async function runCheck() {
  if (rails) return;
  $('run-check').disabled = true;
  $('check-results').replaceChildren();
  stage('booting', 'Ruby/Wasm の起動準備');
  rails = new RailsClient({
    onProgress: message => stage('booting', message),
    onCrash: error => {
      stage('error', error.message);
      stop();
    }
  });
  const timeout = setTimeout(() => {
    stage('error', '起動チェックが3分以内に完了しませんでした');
    stop();
  }, TIMEOUT_MS);
  try {
    const ruby = await rails.boot('probe');
    if (ruby.railsLoaded) throw new Error('Ruby-only check loaded Rails unexpectedly');
    passed('1. Ruby の単独起動：完了');
    stage('booting', 'Ruby 完了。Rails を起動中');
    await rails.call('probe_rails');
    passed('2. Rails の起動：完了');
    stage('booting', 'Rails 完了。ERB の本文を生成中');
    const result = await rails.request('/event', 'text/html');
    if (!isRailsRendered(result)) throw new Error('Rails の実行結果を確認できませんでした');
    passed('3. Rails / ERB の本文生成：完了（地図なし）');
    stage('ready', 'Ruby・Rails・本文生成が完了。地図は起動していません');
  } catch (error) {
    if (rails) stage('error', error.message || String(error));
  } finally {
    clearTimeout(timeout);
    stop();
  }
}

$('run-check').addEventListener('click', runCheck);
$('copy-stage').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(record ? JSON.stringify(record, null, 2) : '起動記録なし');
    $('copy-status').textContent = 'コピーしました';
  } catch {
    $('copy-status').textContent = 'コピーできませんでした。上の記録を選択してコピーできます';
  }
});
display();
