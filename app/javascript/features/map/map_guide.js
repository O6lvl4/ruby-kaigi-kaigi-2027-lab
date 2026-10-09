// 宮崎の地図: switches between Rails-rendered map scenarios and between the
// schematic SVG and the real (Leaflet) map, keeping cards and pins in sync.
import { saveStage } from '../../runtime/status.js';
import { scenarioPath } from './scenarios.js';
import { SchematicView } from './schematic_view.js';

const EXPECTED_CONTROLLER = 'MapScenariosController';
const RENDERER = 'Rails-ActionView-ERB';
const PLACE_COUNT = 7;
const SCENARIO_CACHE_LIMIT = 3;

const STATUS = {
  loading: 'Rails で導線を確認しています…',
  scenario: '全7地点を同じ地図に配置しています。選んだ導線を強調しています。',
  schematic: '全7地点を同じ地図に配置しています。縮尺は実際と異なります。',
  realLoading: '実地図を読み込んでいます…',
  realFailed: '実地図を起動できませんでした。模式図と地点カードをご利用ください。',
  scenarioFailed: '導線を更新できませんでした。現在の地図と出典を確認してください。',
  tiles: {
    error: '背景地図を読み込めませんでした。模式図と地点カードは利用できます。',
    loaded: '実地図に全7地点と、道路に沿った経路の目安を表示しています。',
    loading: '背景地図を読み込んでいます…'
  }
};

export async function initMapGuide(page, request) {
  const root = page.querySelector('.map-workspace');
  const svg = page.querySelector('#schematic-map');
  if (!root || !svg) return undefined;
  const guide = new MapGuide(page, root, svg, request);
  await guide.mount();
  return () => guide.dispose();
}

class MapGuide {
  #current = null;
  #cache = new Map();
  #bindings = [];
  #disposed = false;
  #switching = false;
  #desiredKey = null;
  #mode = 'schematic';
  #modeVersion = 0;
  #realMap = null;
  #travelMode = null; // set by the reader; until then each scenario's default

  constructor(page, root, svg, request) {
    this.page = page;
    this.root = root;
    this.request = request;
    this.schematic = new SchematicView(svg);
    const $ = selector => page.querySelector(selector);
    this.el = {
      sidebar: $('#map-sidebar'),
      status: $('#map-status'),
      schematicLayer: $('#schematic-layer'),
      realLayer: $('#real-map'),
      license: $('#actual-map-license'),
      note: $('#selected-place-note'),
      fit: $('#fit-map'),
      travelSwitch: $('#travel-mode-switch'),
      legends: page.querySelectorAll('[data-legend]')
    };
    this.metrics = { scenarioRequests: 0, cachedScenarios: 0, realMapInstances: 0 };
  }

  async mount() {
    Object.assign(window.guideApp, { mapMetrics: this.metrics, mapMode: 'schematic', mapReady: false });
    this.#bind(this.root, 'click', this.#onClick);
    this.#bind(this.schematic.svg, 'keydown', this.#onKeydown);
    this.#bind(this.el.fit, 'click', this.#onFit);
    this.#bind(document, 'visibilitychange', () =>
      this.#checkpoint(document.hidden ? 'タブが非表示になりました' : 'タブに戻りました')
    );
    await this.loadScenario(this.el.sidebar.dataset.scenario || 'arrival');
  }

  dispose() {
    this.#disposed = true;
    this.#desiredKey = null;
    this.#modeVersion++;
    this.schematic.dispose();
    this.#disposeRealMap();
    for (const unbind of this.#bindings) unbind();
    this.#cache.clear();
  }

  // --- scenarios -----------------------------------------------------------

  // Only the most recently requested scenario is shown, however fast the clicks.
  async loadScenario(key) {
    this.#desiredKey = key;
    if (this.#switching) return;
    this.#switching = true;
    try {
      while (this.#desiredKey && !this.#disposed) {
        const next = this.#desiredKey;
        this.#desiredKey = null;
        try {
          this.#applyScenario(this.#cache.get(next) || (await this.#fetchScenario(next)));
        } catch (error) {
          this.#reportScenarioError(error);
        }
      }
    } finally {
      this.#switching = false;
    }
  }

  async #fetchScenario(key) {
    this.el.status.textContent = STATUS.loading;
    this.metrics.scenarioRequests++;
    const response = await this.request(scenarioPath(key));
    if (response.status !== 200) throw new Error('Scenario request failed');
    if (this.#cache.size < SCENARIO_CACHE_LIMIT) this.#cache.set(key, response.body);
    return response.body;
  }

  #applyScenario(scenario) {
    // A newer request or teardown must never publish the response just received.
    if (this.#disposed || this.#desiredKey) return;
    const placeIds = this.#verify(scenario);
    this.#current = scenario;
    this.#showTravelMode();
    this.#renderCards(scenario);
    this.schematic.showScenario(scenario);
    for (const button of this.root.querySelectorAll('[data-map-scenario]')) {
      button.setAttribute('aria-pressed', String(button.dataset.mapScenario === scenario.key));
    }
    this.el.note.hidden = true;
    this.#realMap?.update(scenario, this.travelMode);
    Object.assign(window.guideApp, {
      mapReady: true,
      mapState: {
        key: scenario.key,
        geojson: scenario.geojson,
        placeIds: scenario.selected_ids,
        allPlaceIds: placeIds,
        controller: scenario.controller,
        renderer: scenario.renderer
      }
    });
    this.metrics.cachedScenarios = this.#cache.size;
    if (this.#mode === 'schematic') this.el.status.textContent = STATUS.scenario;
    this.#checkpoint(`導線を表示：${scenario.label}（${this.#mode === 'schematic' ? '模式図' : '実地図'}）`);
  }

  // The scenario must come from Rails and describe the same seven places the SVG shows.
  #verify(scenario) {
    if (scenario.renderer !== RENDERER || scenario.controller !== EXPECTED_CONTROLLER) {
      throw new Error('Rails map response could not be verified');
    }
    const ids = this.schematic.placeIds;
    const points = scenario.geojson.features.filter(feature => feature.geometry.type === 'Point');
    if (
      ids.length !== PLACE_COUNT ||
      !sameMembers(
        ids,
        points.map(point => point.id)
      )
    ) {
      throw new Error('Persistent map and Rails locations do not match');
    }
    return ids;
  }

  #renderCards(scenario) {
    this.el.sidebar.innerHTML = scenario.html;
    this.el.sidebar.dataset.scenario = scenario.key;
    const cardIds = [...this.el.sidebar.querySelectorAll('[data-place-id]')].map(node => node.dataset.placeId);
    if (JSON.stringify(cardIds) !== JSON.stringify(scenario.selected_ids)) {
      throw new Error('Rails selected cards do not match');
    }
  }

  #reportScenarioError(error) {
    if (this.#disposed || this.#desiredKey) return;
    this.el.status.textContent = STATUS.scenarioFailed;
    window.guideApp.mapError = error.message;
  }

  // --- places --------------------------------------------------------------

  #selectPlace = id => {
    const place = this.#current?.all_places.find(candidate => candidate.id === id);
    if (!place) return;
    this.schematic.highlight(id);
    for (const card of this.el.sidebar.querySelectorAll('[data-place-id]')) {
      const selected = card.dataset.placeId === id;
      card.classList.toggle('is-selected', selected);
      card.querySelector('[data-map-place]')?.setAttribute('aria-pressed', String(selected));
    }
    this.#realMap?.select(id);
    window.guideApp.mapSelected = id;
    this.el.note.textContent = `${place.name}：${place.description}`;
    this.el.note.hidden = false;
    this.#checkpoint(`地点を選択：${place.name}`);
  };

  // --- schematic / real map ------------------------------------------------

  async #setMode(next) {
    const version = ++this.#modeVersion;
    this.#mode = next;
    window.guideApp.mapMode = next;
    this.#disposeRealMap();
    for (const button of this.root.querySelectorAll('[data-map-mode]')) {
      button.setAttribute('aria-pressed', String(button.dataset.mapMode === next));
    }
    this.el.schematicLayer.hidden = next !== 'schematic';
    this.el.realLayer.hidden = next !== 'actual';
    this.el.license.hidden = next !== 'actual';
    this.el.travelSwitch.hidden = next !== 'actual';
    for (const legend of this.el.legends) legend.hidden = legend.dataset.legend !== next;
    if (next === 'schematic') {
      this.schematic.sizeLabels();
      this.el.status.textContent = STATUS.schematic;
      this.#checkpoint('模式図を表示');
      return;
    }
    await this.#openRealMap(version);
  }

  async #openRealMap(version) {
    const stale = () => this.#disposed || version !== this.#modeVersion;
    this.el.status.textContent = STATUS.realLoading;
    this.#checkpoint('実地図を読み込み中');
    try {
      const { createRealMap } = await import('./real_map.js');
      if (stale()) return;
      this.#realMap = createRealMap(this.el.realLayer, this.#selectPlace, tileStatus => {
        if (!stale()) this.#reportTileStatus(tileStatus);
      });
      this.metrics.realMapInstances = 1;
      this.#realMap.update(this.#current, this.travelMode);
    } catch {
      if (stale()) return;
      this.el.status.textContent = STATUS.realFailed;
      window.guideApp.mapTileStatus = 'error';
    }
  }

  #reportTileStatus(tileStatus) {
    window.guideApp.mapTileStatus = tileStatus;
    this.el.status.classList.toggle('map-warning', tileStatus === 'error');
    this.el.status.textContent = STATUS.tiles[tileStatus] || STATUS.tiles.loading;
  }

  #disposeRealMap() {
    this.#realMap?.dispose();
    this.#realMap = null;
    this.metrics.realMapInstances = 0;
  }

  // --- travel mode (徒歩 / 車) -------------------------------------------------

  get travelMode() {
    return this.#travelMode || this.#current?.default_travel_mode || 'driving';
  }

  #setTravelMode(mode) {
    this.#travelMode = mode;
    this.#showTravelMode();
    this.#realMap?.update(this.#current, mode);
    this.#checkpoint(`経路を表示：${mode === 'walking' ? '徒歩' : '車'}`);
  }

  // Pressed button and the matching distance/time rows in the Rails-rendered cards.
  #showTravelMode() {
    const mode = this.travelMode;
    for (const button of this.root.querySelectorAll('[data-travel-mode]')) {
      button.setAttribute('aria-pressed', String(button.dataset.travelMode === mode));
    }
    for (const row of this.el.sidebar.querySelectorAll('[data-route-mode]')) {
      row.classList.toggle('is-current', row.dataset.routeMode === mode);
    }
    window.guideApp.mapTravelMode = mode;
  }

  // --- events --------------------------------------------------------------

  #onClick = event => {
    const target = selector => event.target.closest(selector);
    const scenario = target('[data-map-scenario]');
    if (scenario) return this.loadScenario(scenario.dataset.mapScenario);
    const travel = target('[data-travel-mode]');
    if (travel) return this.#setTravelMode(travel.dataset.travelMode);
    const toggle = target('[data-map-mode]');
    if (toggle) return toggle.dataset.mapMode === this.#mode ? undefined : this.#setMode(toggle.dataset.mapMode);
    const place = target('[data-map-node]')?.dataset.mapNode || target('[data-map-place]')?.dataset.mapPlace;
    if (place) this.#selectPlace(place);
    return undefined;
  };

  #onKeydown = event => {
    const point = event.target.closest('[data-map-node]');
    if (!point || (event.key !== 'Enter' && event.key !== ' ')) return;
    event.preventDefault();
    this.#selectPlace(point.dataset.mapNode);
  };

  #onFit = () => {
    this.schematic.frame(this.#current.schematic.overview);
    this.#realMap?.fit(true);
    this.#checkpoint('全7地点を全体表示');
  };

  #bind(node, type, handler) {
    node.addEventListener(type, handler);
    this.#bindings.push(() => node.removeEventListener(type, handler));
  }

  #checkpoint(stage) {
    saveStage({
      build: window.guideApp.build,
      state: 'ready',
      stage,
      at: new Date().toISOString(),
      source: 'map-interaction'
    });
  }
}

function sameMembers(a, b) {
  return JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
}
