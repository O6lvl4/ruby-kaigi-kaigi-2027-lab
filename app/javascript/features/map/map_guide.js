import '../../../assets/stylesheets/map.css';
import { saveStage } from '../../runtime/status.js';
import { scenarioPath } from './scenarios.js';

function tileStatusMessage(tileStatus) {
  if (tileStatus === 'error') return '背景地図を読み込めませんでした。模式図と地点カードは利用できます。';
  if (tileStatus === 'loaded') return '実地図に全7地点を配置しています。破線は概略線です。';
  return '背景地図を読み込んでいます…';
}

export async function initMapGuide(page, request) {
  const root = page.querySelector('.map-workspace');
  const sidebar = page.querySelector('#map-sidebar');
  const status = page.querySelector('#map-status');
  const svg = page.querySelector('#schematic-map');
  const schematic = page.querySelector('#schematic-layer');
  const actual = page.querySelector('#real-map');
  if (!root || !svg) return;

  const cache = new Map();
  const bindings = [];
  let current;
  let disposed = false;
  let switching = false;
  let desiredKey = null;
  let mode = 'schematic';
  let realMap = null;
  let modeVersion = 0;
  let cameraBox = null;
  window.guideApp.mapMetrics = { scenarioRequests: 0, cachedScenarios: 0, realMapInstances: 0 };

  function checkpoint(stage) {
    saveStage({
      build: window.guideApp.build,
      state: 'ready',
      stage,
      at: new Date().toISOString(),
      source: 'map-interaction'
    });
  }

  function bind(node, type, handler) {
    node.addEventListener(type, handler);
    bindings.push(() => node.removeEventListener(type, handler));
  }

  function sizeLabels() {
    const box = svg.viewBox.baseVal;
    const rect = svg.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const scale = Math.min(rect.width / box.width, rect.height / box.height);
    if (!scale) return;
    const label = (rect.width < 600 ? 13 : 14) / scale;
    svg.style.setProperty('--label-size', `${label}px`);
    svg.style.setProperty('--context-size', `${11 / scale}px`);
    svg.style.setProperty('--number-size', `${12 / scale}px`);
    for (const node of svg.querySelectorAll('[data-map-node]')) {
      const circle = node.querySelector('.point-ring');
      const hit = node.querySelector('.point-hit');
      const x = Number(circle.getAttribute('cx'));
      const y = Number(circle.getAttribute('cy'));
      const size = Math.max(90, 44 / scale);
      circle.setAttribute('r', String(Math.max(18, 12 / scale)));
      hit.setAttribute('x', String(x - size / 2));
      hit.setAttribute('y', String(y - size / 2));
      hit.setAttribute('width', String(size));
      hit.setAttribute('height', String(size));
    }
  }

  function setCamera(box) {
    cameraBox = box.slice();
    let [x, y, w, h] = box;
    const rect = svg.getBoundingClientRect();
    if (rect.width && rect.height) {
      const ratio = rect.width / rect.height;
      if (w / h > ratio) {
        const nh = w / ratio;
        y -= (nh - h) / 2;
        h = nh;
      } else {
        const nw = h * ratio;
        x -= (nw - w) / 2;
        w = nw;
      }
    }
    if (h <= 900) y = Math.max(0, Math.min(900 - h, y));
    if (w <= 1000) x = Math.max(0, Math.min(1000 - w, x));
    svg.setAttribute('viewBox', [x, y, w, h].join(' '));
    sizeLabels();
  }

  const observer = new ResizeObserver(() => (cameraBox ? setCamera(cameraBox) : sizeLabels()));
  observer.observe(svg);

  function selectPlace(id) {
    const place = current?.all_places.find(p => p.id === id);
    if (!place) return;
    for (const node of svg.querySelectorAll('[data-map-node]')) {
      node.classList.toggle('is-selected', node.dataset.mapNode === id);
    }
    for (const card of sidebar.querySelectorAll('[data-place-id]')) {
      const selected = card.dataset.placeId === id;
      card.classList.toggle('is-selected', selected);
      card.querySelector('[data-map-place]')?.setAttribute('aria-pressed', String(selected));
    }
    realMap?.select(id);
    window.guideApp.mapSelected = id;
    const note = page.querySelector('#selected-place-note');
    note.textContent = `${place.name}：${place.description}`;
    note.hidden = false;
    checkpoint(`地点を選択：${place.name}`);
  }

  function validateScenario(data) {
    if (data.renderer !== 'Rails-ActionView-ERB' || data.controller !== 'MapScenariosController') {
      throw new Error('Rails map response could not be verified');
    }
    const ids = [...svg.querySelectorAll('[data-map-node]')].map(node => node.dataset.mapNode);
    const points = data.geojson.features.filter(feature => feature.geometry.type === 'Point');
    if (ids.length !== 7 || JSON.stringify([...ids].sort()) !== JSON.stringify(points.map(point => point.id).sort())) {
      throw new Error('Persistent map and Rails locations do not match');
    }
    return ids;
  }

  function updateScenarioCards(data) {
    sidebar.innerHTML = data.html;
    sidebar.dataset.scenario = data.key;
    const cardIds = [...sidebar.querySelectorAll('[data-place-id]')].map(node => node.dataset.placeId);
    if (JSON.stringify(cardIds) !== JSON.stringify(data.selected_ids)) {
      throw new Error('Rails selected cards do not match');
    }
  }

  function updateSchematic(data) {
    for (const node of svg.querySelectorAll('[data-map-node]')) {
      const index = data.selected_ids.indexOf(node.dataset.mapNode);
      node.classList.toggle('is-in-scenario', index >= 0);
      node.classList.remove('is-selected');
      node.querySelector('[data-map-number]').textContent = index < 0 ? '' : String(index + 1);
    }
    for (const path of svg.querySelectorAll('[data-route-scenario]')) {
      path.classList.toggle('is-active', path.dataset.routeScenario === data.key);
    }
    setCamera(data.schematic.view_box);
  }

  function applyScenario(data) {
    // A newer request or teardown must never publish the response just received.
    if (disposed || desiredKey) return;
    const ids = validateScenario(data);
    current = data;
    updateScenarioCards(data);
    updateSchematic(data);
    for (const button of root.querySelectorAll('[data-map-scenario]')) {
      button.setAttribute('aria-pressed', String(button.dataset.mapScenario === data.key));
    }
    page.querySelector('#selected-place-note').hidden = true;
    realMap?.update(data);
    window.guideApp.mapState = {
      key: data.key,
      geojson: data.geojson,
      placeIds: data.selected_ids,
      allPlaceIds: ids,
      controller: data.controller,
      renderer: data.renderer
    };
    window.guideApp.mapReady = true;
    window.guideApp.mapMetrics.cachedScenarios = cache.size;
    if (mode === 'schematic') {
      status.textContent = '全7地点を同じ地図に配置しています。選んだ導線を強調しています。';
    }
    checkpoint(`導線を表示：${data.label}（${mode === 'schematic' ? '模式図' : '実地図'}）`);
  }

  function requestScenario(key) {
    status.textContent = 'Rails で導線を確認しています…';
    window.guideApp.mapMetrics.scenarioRequests++;
    return request(scenarioPath(key));
  }

  function cacheScenario(key, result) {
    if (result.status !== 200) throw new Error('Scenario request failed');
    const data = result.body;
    if (cache.size < 3) cache.set(key, data);
    return data;
  }

  function reportScenarioError(error) {
    if (disposed || desiredKey) return;
    status.textContent = '導線を更新できませんでした。現在の地図と出典を確認してください。';
    window.guideApp.mapError = error.message;
  }

  async function loadScenario(key) {
    desiredKey = key;
    if (switching) return;
    switching = true;
    try {
      while (desiredKey && !disposed) {
        const next = desiredKey;
        desiredKey = null;
        try {
          let data = cache.get(next);
          if (!data) data = cacheScenario(next, await requestScenario(next));
          applyScenario(data);
        } catch (error) {
          reportScenarioError(error);
        }
      }
    } finally {
      switching = false;
    }
  }

  function reportTileStatus(tileStatus, version) {
    if (disposed || version !== modeVersion) return;
    window.guideApp.mapTileStatus = tileStatus;
    status.classList.toggle('map-warning', tileStatus === 'error');
    status.textContent = tileStatusMessage(tileStatus);
  }

  async function setMode(next) {
    const version = ++modeVersion;
    mode = next;
    window.guideApp.mapMode = next;
    realMap?.dispose();
    realMap = null;
    window.guideApp.mapMetrics.realMapInstances = 0;
    for (const button of root.querySelectorAll('[data-map-mode]')) {
      button.setAttribute('aria-pressed', String(button.dataset.mapMode === next));
    }
    schematic.hidden = next !== 'schematic';
    actual.hidden = next !== 'actual';
    page.querySelector('#actual-map-license').hidden = next !== 'actual';
    if (next === 'schematic') {
      sizeLabels();
      status.textContent = '全7地点を同じ地図に配置しています。縮尺は実際と異なります。';
      checkpoint('模式図を表示');
      return;
    }
    status.textContent = '実地図を読み込んでいます…';
    checkpoint('実地図を読み込み中');
    try {
      const { createRealMap } = await import('./real_map.js');
      if (disposed || version !== modeVersion) return;
      realMap = createRealMap(actual, selectPlace, tileStatus => reportTileStatus(tileStatus, version));
      window.guideApp.mapMetrics.realMapInstances = 1;
      realMap.update(current);
    } catch (error) {
      if (disposed || version !== modeVersion) return;
      status.textContent = '実地図を起動できませんでした。模式図と地点カードをご利用ください。';
      window.guideApp.mapTileStatus = 'error';
    }
  }

  bind(root, 'click', event => {
    const scenario = event.target.closest('[data-map-scenario]');
    if (scenario) {
      loadScenario(scenario.dataset.mapScenario);
      return;
    }
    const toggle = event.target.closest('[data-map-mode]');
    if (toggle) {
      if (toggle.dataset.mapMode !== mode) setMode(toggle.dataset.mapMode);
      return;
    }
    const point = event.target.closest('[data-map-node]');
    if (point) {
      selectPlace(point.dataset.mapNode);
      return;
    }
    const card = event.target.closest('[data-map-place]');
    if (card) selectPlace(card.dataset.mapPlace);
  });
  bind(svg, 'keydown', event => {
    const point = event.target.closest('[data-map-node]');
    if (point && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      selectPlace(point.dataset.mapNode);
    }
  });
  bind(page.querySelector('#fit-map'), 'click', () => {
    setCamera(current.schematic.overview);
    realMap?.fit(true);
    checkpoint('全7地点を全体表示');
  });
  bind(document, 'visibilitychange', () =>
    checkpoint(document.hidden ? 'タブが非表示になりました' : 'タブに戻りました')
  );
  window.guideApp.mapMode = 'schematic';
  window.guideApp.mapReady = false;
  await loadScenario(sidebar.dataset.scenario || 'arrival');
  return () => {
    observer.disconnect();
    disposed = true;
    desiredKey = null;
    modeVersion++;
    realMap?.dispose();
    realMap = null;
    for (const unbind of bindings) unbind();
    cache.clear();
    window.guideApp.mapMetrics.realMapInstances = 0;
  };
}
