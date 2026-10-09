// index.html: boots Rails in Ruby/Wasm, renders every guide page once, releases
// the runtime, then serves the pages from memory through the router.
import { RailsClient } from '../rails/client.js';
import { isRailsRendered, RENDERER } from '../rails/rendered_response.js';
import { Router } from '../navigation/router.js';
import { initSiteNavigation } from '../navigation/site_navigation.js';
import { initAddressTools } from '../features/destinations/address_tools.js';
import { guidePages, LEGACY_ANCHORS } from '../pages/index.js';
import { bootScreen, progressMessage } from '../runtime/boot_screen.js';
import { BootCheckpoint } from '../runtime/boot_checkpoint.js';
import { stageLabel } from '../runtime/status.js';

const BUILD = import.meta.env.VITE_BUILD_ID || 'rails-reading-home-v1';
const BASE_PATH = import.meta.env.BASE_URL;
const TIMEOUT_MS = 180000;

const checkpoint = new BootCheckpoint(BUILD);
let rails = null;
let router = null;
let booting = false;
let timeout;
let lastDiagnostic = '';

// Test and diagnostics hook; read-only state about the running guide.
window.guideApp = {
  ready: false,
  error: null,
  build: BUILD,
  renderer: null,
  lastResponse: null,
  runtimeReleased: false,
  mapReady: false,
  mapError: null,
  get railsRequestCount() {
    return rails?.requestCount ?? 0;
  },
  request: (path, accept) => rails.request(path, accept)
};

// Starting Ruby + Rails fills the bar up to this point; rendering the pages fills the rest.
const RUNTIME_SHARE = 0.85;

function step(message) {
  checkpoint.record('booting', message);
  bootScreen.progress(stageLabel(message));
}

function fail(client, error) {
  if (client !== rails) return;
  const message = error.message || String(error);
  booting = false;
  checkpoint.record('error');
  teardown();
  lastDiagnostic = checkpoint.diagnostic(message);
  bootScreen.failed(message, lastDiagnostic);
  Object.assign(window.guideApp, { ready: false, error: message });
}

function teardown() {
  clearTimeout(timeout);
  router?.stop();
  router = null;
  rails?.dispose();
}

// Every page's HTML plus the JSON its JavaScript reads.
function renderRequests(pages) {
  return [...pages].flatMap(([path, page]) => [
    { path, accept: 'text/html' },
    ...(page.data || []).map(dataPath => ({ path: dataPath, accept: 'application/json' }))
  ]);
}

function verify(response, path) {
  if (!isRailsRendered(response, { html: !path.endsWith('.json') }))
    throw new Error(`Rails の生成結果を確認できませんでした（${path}）`);
}

function mountGuide(client, pages) {
  const root = bootScreen.showGuide();
  router = new Router({
    root,
    pages: new Map(
      [...pages].map(([path, page]) => [
        path,
        {
          // Layout behaviour (header menu, address copy) is re-mounted with every page.
          mount: pageRoot => {
            const unmounts = [initSiteNavigation(pageRoot), initAddressTools(pageRoot), page.mount?.(pageRoot)];
            return () => unmounts.forEach(unmount => unmount?.());
          }
        }
      ])
    ),
    html: path => client.rendered(path).body,
    basePath: BASE_PATH,
    legacyAnchors: LEGACY_ANCHORS,
    onRender: path => {
      window.guideApp.lastResponse = client.rendered(path);
    }
  });
  router.start();
}

async function start() {
  if (booting) return;
  booting = true;
  teardown();
  bootScreen.reset();
  Object.assign(window.guideApp, {
    ready: false,
    error: null,
    mapReady: false,
    mapError: null,
    lastResponse: null,
    runtimeReleased: false
  });
  step('Ruby/Wasm worker startup');

  const client = new RailsClient({
    scriptName: BASE_PATH.replace(/\/$/, ''),
    onProgress: (message, ratio) => {
      if (client !== rails) return;
      // The download reports every percent; record each stage only once.
      if (progressMessage(message) !== checkpoint.step) step(progressMessage(message));
      if (ratio !== undefined) bootScreen.setProgress(ratio * RUNTIME_SHARE);
    },
    onCrash: error => fail(client, error)
  });
  rails = client;
  timeout = setTimeout(
    () => fail(client, new Error('読み込みが3分以内に完了しませんでした。通信状況を確認して再試行してください。')),
    TIMEOUT_MS
  );

  try {
    await client.boot('guide');
    const pages = guidePages(client);
    step('Rails GET (each page) → controller → ActionView ERB');
    bootScreen.progress('Rails の ERB ビューで各ページを生成しています…');
    await client.prerender(renderRequests(pages), verify, done =>
      bootScreen.setProgress(RUNTIME_SHARE + done * (1 - RUNTIME_SHARE))
    );
    if (client !== rails) return;
    client.release();
    window.guideApp.runtimeReleased = true;
    checkpoint.record('booting', 'Rails の生成完了。実行用メモリを解放しました');
    mountGuide(client, pages);
    clearTimeout(timeout);
    Object.assign(window.guideApp, { ready: true, renderer: RENDERER });
    booting = false;
    checkpoint.record('ready', 'Rails pages and map initialization completed');
  } catch (error) {
    if (!window.guideApp.error) fail(client, error);
  }
}

bootScreen.onRetry(start);
bootScreen.onCopyDiagnostics(() => lastDiagnostic);

if (checkpoint.interrupted) {
  checkpoint.step = 'Waiting for explicit retry after interrupted boot';
  lastDiagnostic = checkpoint.diagnostic('Previous load did not finish');
  bootScreen.interrupted(stageLabel(checkpoint.previous.stage), lastDiagnostic);
} else {
  start();
}
