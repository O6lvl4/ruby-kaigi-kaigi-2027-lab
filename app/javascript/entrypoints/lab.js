import '../../assets/stylesheets/lab.css';
import { RailsClient } from '../rails/client.js';
import * as duckdb from '@duckdb/duckdb-wasm';
import duckMvp from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url';
import duckEh from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url';
import duckMvpWorker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url';
import duckEhWorker from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url';
const $ = id => document.getElementById(id);
const labels = { venue: '会場', hotel: '宿泊', food: '食事' };
const escape = text =>
  String(text).replace(
    /[&<>"']/g,
    char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]
  );
const yen = value => '¥' + Number(value).toLocaleString('ja-JP');
const rails = new RailsClient({
  onProgress: message => {
    $('status').textContent = message;
  },
  onCrash: error => {
    $('status').textContent = '起動エラー: ' + error.message;
    rails.dispose();
  }
});
const request = (method, path, body) => rails.request(path, 'application/json', { method, body });
let analyticalDB, connection;
async function initDuckDB() {
  // Only single-threaded MVP/EH bundles: Pages does not supply COOP/COEP.
  const bundle = await duckdb.selectBundle({
    mvp: { mainModule: duckMvp, mainWorker: duckMvpWorker },
    eh: { mainModule: duckEh, mainWorker: duckEhWorker }
  });
  analyticalDB = new duckdb.AsyncDuckDB(
    new duckdb.ConsoleLogger(duckdb.LogLevel.WARNING),
    new Worker(bundle.mainWorker)
  );
  await analyticalDB.instantiate(bundle.mainModule);
  connection = await analyticalDB.connect();
}
let records = [],
  summaries = [];
async function refresh() {
  const response = await request('GET', '/venues');
  if (response.status !== 200) throw new Error(JSON.stringify(response));
  records = response.body.venues;
  const runtime = response.body.runtime;
  $('versions').textContent =
    `Ruby ${runtime.ruby} / Rails ${runtime.rails} / ${runtime.platform} / Active Record ${runtime.adapter} → PGlite IndexedDB / DuckDB ${await analyticalDB.getVersion()}`;
  // Analytical copies are disposable. PGlite remains the sole source of truth.
  await connection.query('CREATE OR REPLACE TABLE venues (category VARCHAR, capacity INTEGER, estimated_cost INTEGER)');
  const insert = await connection.prepare('INSERT INTO venues VALUES (?, ?, ?)');
  try {
    for (const venue of records) await insert.query(venue.category, venue.capacity, venue.estimated_cost);
  } finally {
    await insert.close();
  }
  const result = await connection.query(
    'SELECT category, COUNT(*)::INTEGER AS count, SUM(capacity)::DOUBLE AS capacity, SUM(estimated_cost)::DOUBLE AS cost FROM venues GROUP BY category ORDER BY category'
  );
  summaries = result.toArray().map(row => row.toJSON());
  $('stats').innerHTML = summaries.length
    ? summaries
        .map(
          row =>
            `<div class="stat"><div>${escape(labels[row.category] || row.category)}<small>${row.count} 件 · ${Number(row.capacity).toLocaleString()} 人</small></div><strong>${yen(row.cost)}</strong></div>`
        )
        .join('')
    : '<p class="muted">まだ候補がありません。左のフォームから追加できます</p>';
  $('count').textContent = records.length;
  $('venues').innerHTML = records.length
    ? records
        .map(
          venue =>
            `<article class="venue"><div><b>${escape(venue.name)}</b><span>${escape(labels[venue.category] || venue.category)} · ${escape(venue.area)}</span></div><div><b>${yen(venue.estimated_cost)}</b><span>${Number(venue.capacity).toLocaleString()} 人</span></div></article>`
        )
        .join('')
    : '<p class="muted">保存された候補がここに表示されます</p>';
  return { records, summaries, runtime };
}
$('venue-form').addEventListener('submit', async event => {
  event.preventDefault();
  $('save').disabled = true;
  $('form-result').textContent = 'Rails で検証中…';
  try {
    const venue = Object.fromEntries(new FormData(event.target));
    const response = await request('POST', '/venues', { venue });
    if (response.status === 201) {
      await refresh();
      $('form-result').className = 'success';
      $('form-result').textContent = '保存しました。IndexedDB への書き込みが完了しています';
    } else {
      $('form-result').className = 'error';
      $('form-result').textContent = 'Rails 検証: ' + (response.body.errors || ['保存できませんでした']).join(' / ');
    }
  } catch (error) {
    $('form-result').className = 'error';
    $('form-result').textContent = error.message;
  } finally {
    $('save').disabled = false;
  }
});
// Diagnostic API for repeatable browser testing. No alternate persistence path.
window.demo = {
  request,
  refresh,
  snapshot: () => ({ records, summaries }),
  close: () => rails.call('close'),
  ready: false
};
try {
  // Single-writer lock prevents two tabs from independently writing the same PGlite data directory.
  // The browser releases the lock when this document/worker is destroyed.
  const hold = new Promise(() => {});
  await new Promise((resolve, reject) =>
    navigator.locks.request('rubykaigi-miyazaki-pglite-writer', { ifAvailable: true }, async lock => {
      if (!lock) {
        reject(new Error('別のタブでこのデモが開いています。そのタブを閉じて再読み込みしてください'));
        return;
      }
      resolve();
      await hold;
    })
  );
  await Promise.all([rails.boot('lab'), initDuckDB()]);
  await refresh();
  $('status').textContent = '3 つの Wasm ランタイムが起動しました';
  $('save').disabled = false;
  window.demo.ready = true;
} catch (error) {
  console.error(error);
  $('status').textContent = '起動エラー: ' + error.message;
  $('status').className = 'error';
}
