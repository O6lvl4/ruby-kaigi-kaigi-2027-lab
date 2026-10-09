// ごはん・人数: filters the Rails-rendered restaurant cards and switches between
// the card list and a pin map. The same filter drives both views.
import { matchesRestaurantFilter } from './filter.js';

const DETAIL_EMPTY = 'ピンを選ぶと、名称・住所・移動リンクをここで確認できます';
const MAP_LOADING = '地図を読み込んでいます…';
const MAP_FAILED = '地図を読み込めませんでした。一覧の住所・移動リンクをご利用ください';
const TILES_FAILED = '背景地図を読み込めません。地点・住所・Google Mapsのリンクは引き続き利用できます。';
const TILES_READY = '地理院の背景地図に、出典を確認した地点を重ねています';

export function initRestaurantGuide(page, restaurants = []) {
  const root = page.querySelector('#dining');
  if (!root) return undefined;
  const guide = new RestaurantGuide(root, restaurants);
  guide.mount();
  return () => guide.dispose();
}

// Restaurants in card order, joined with their JSON data and Rails-rendered card.
function restaurantsFromCards(root, restaurants) {
  const byId = new Map(restaurants.map(restaurant => [restaurant.id, restaurant]));
  return [...root.querySelectorAll('[data-restaurant-id]')].map((card, index) => ({
    ...byId.get(card.dataset.restaurantId),
    id: card.dataset.restaurantId,
    area: card.dataset.diningArea,
    number: index + 1,
    card
  }));
}

function isLocated(restaurant) {
  const { coordinates, coordinateSourceUrl } = restaurant;
  return (
    Array.isArray(coordinates) &&
    coordinates.length === 2 &&
    coordinates.every(Number.isFinite) &&
    Boolean(coordinateSourceUrl?.startsWith('https://'))
  );
}

class RestaurantGuide {
  #mode = 'list';
  #selected = null;
  #matches = [];
  #map = null;
  #mapGeneration = 0;
  #disposed = false;

  constructor(root, restaurants) {
    this.root = root;
    this.restaurants = restaurantsFromCards(root, restaurants);
    this.located = this.restaurants.filter(isLocated);
    const $ = selector => root.querySelector(selector);
    this.el = {
      capacity: $('#dining-capacity'),
      area: $('#dining-area'),
      choice: $('#dining-map-choice'),
      toolbar: $('.dining-toolbar'),
      grid: $('.dining-grid'),
      mapPanel: $('#dining-map-panel'),
      mapCanvas: $('#dining-map-canvas'),
      mapStatus: $('#dining-map-status'),
      mapCount: $('#dining-map-count'),
      detail: $('#dining-map-detail'),
      results: $('#dining-results'),
      empty: $('#dining-empty')
    };
  }

  mount() {
    this.el.choice.addEventListener('change', this.#onChoose);
    this.el.capacity.addEventListener('change', this.#onFilter);
    this.el.area.addEventListener('change', this.#onFilter);
    this.root.addEventListener('click', this.#onClick);
    this.#select(null);
    this.#applyFilters();
  }

  dispose() {
    this.#disposed = true;
    this.#closeMap();
    this.el.choice.removeEventListener('change', this.#onChoose);
    this.el.capacity.removeEventListener('change', this.#onFilter);
    this.el.area.removeEventListener('change', this.#onFilter);
    this.root.removeEventListener('click', this.#onClick);
    delete window.diningGuideState;
  }

  // --- filtering -----------------------------------------------------------

  #applyFilters({ keepSelection = false } = {}) {
    const minimum = Number(this.el.capacity.value);
    const area = this.el.area.value;
    this.#matches = this.restaurants.filter(restaurant => matchesRestaurantFilter(restaurant, minimum, area));
    const matchedIds = new Set(this.#matches.map(restaurant => restaurant.id));
    for (const restaurant of this.restaurants) restaurant.card.hidden = !matchedIds.has(restaurant.id);
    this.#renderCounts(minimum, area, matchedIds);
    if (this.#selected) this.#select(matchedIds.has(this.#selected) || keepSelection ? this.#selected : null);
    this.#map?.update(matchedIds, this.#selected);
    window.diningGuideState = {
      mode: this.#mode,
      selected: this.#selected,
      matchingIds: this.#matches.map(restaurant => restaurant.id),
      mappedIds: this.located.map(restaurant => restaurant.id)
    };
  }

  #renderCounts(minimum, area, matchedIds) {
    const listed = this.#matches.filter(restaurant => restaurant.groupCapacity !== null).length;
    const unknown = this.#matches.length - listed;
    const areaLabel = area === 'all' ? '全エリア' : area;
    const sizeLabel = minimum ? `${minimum}人以上の掲載目安` : 'すべての人数';
    this.el.results.textContent = `${areaLabel} · ${sizeLabel}：${listed}件 ＋ 人数要確認 ${unknown}件`;
    this.el.empty.hidden = minimum === 0 || listed > 0;

    const locatedMatches = this.located.filter(restaurant => matchedIds.has(restaurant.id));
    const locatedListed = locatedMatches.filter(restaurant => restaurant.groupCapacity !== null).length;
    const unlocated = this.#matches.filter(restaurant => !this.located.includes(restaurant)).length;
    this.el.mapCount.textContent =
      `全${this.located.length}地点を表示 · 掲載人数の条件内${locatedListed}地点 ＋ ` +
      `人数要確認${locatedMatches.length - locatedListed}地点 · 位置未確認${unlocated}件は一覧で確認`;
  }

  // --- selection -----------------------------------------------------------

  #select(id) {
    this.#selected = id;
    this.el.choice.value = id || '';
    for (const restaurant of this.restaurants) {
      const isSelected = restaurant.id === id;
      restaurant.card.classList.toggle('dining-card-selected', isSelected);
      restaurant.card.querySelector('[data-dining-focus]')?.setAttribute('aria-pressed', String(isSelected));
    }
    const restaurant = this.restaurants.find(candidate => candidate.id === id);
    const showing = this.el.detail.querySelector('[data-dining-detail-id]')?.dataset.diningDetailId;
    if (!restaurant || showing !== id) this.#renderDetail(restaurant);
    if (restaurant) this.#renderOutsideFilterNote(restaurant);
    this.#map?.select(id);
  }

  #renderDetail(restaurant) {
    if (!restaurant) {
      const empty = document.createElement('p');
      empty.className = 'dining-detail-empty';
      empty.textContent = DETAIL_EMPTY;
      this.el.detail.replaceChildren(empty);
      return;
    }
    const clone = restaurant.card.cloneNode(true);
    clone.hidden = false;
    clone.removeAttribute('data-restaurant-id');
    clone.removeAttribute('data-group-capacity');
    clone.dataset.diningDetailId = restaurant.id;
    clone.querySelector('[data-dining-focus]')?.remove();
    this.el.detail.replaceChildren(clone);
  }

  // A pin can be chosen even when the filters hide it; say so next to its details.
  #renderOutsideFilterNote(restaurant) {
    let note = this.el.detail.querySelector('.dining-selection-note');
    if (this.#matches.some(match => match.id === restaurant.id)) {
      note?.remove();
      return;
    }
    if (!note) {
      note = document.createElement('p');
      note.className = 'note dining-selection-note';
      this.el.detail.prepend(note);
    }
    note.textContent = '現在の絞り込み条件の対象外です';
  }

  // --- list / map views ----------------------------------------------------

  #setMode(next) {
    if (this.#mode === next) return;
    const toolbarTop = this.el.toolbar.getBoundingClientRect().top;
    this.#mode = next;
    for (const button of this.root.querySelectorAll('[data-dining-view]')) {
      button.setAttribute('aria-pressed', String(button.dataset.diningView === next));
    }
    this.el.mapPanel.hidden = next !== 'map';
    this.el.grid.hidden = next !== 'list';
    if (next === 'map') {
      this.#select(this.#selected);
      this.#openMap();
    } else {
      this.#closeMap();
    }
    this.#applyFilters();
    // Keep the toolbar where the reader's eye was.
    window.scrollBy({ top: this.el.toolbar.getBoundingClientRect().top - toolbarTop, behavior: 'instant' });
  }

  async #openMap() {
    const run = ++this.#mapGeneration;
    this.el.mapStatus.textContent = MAP_LOADING;
    try {
      const { createDiningMap } = await import('./restaurant_map.js');
      if (this.#disposed || run !== this.#mapGeneration || this.#mode !== 'map') return;
      this.#map = createDiningMap(this.el.mapCanvas, this.located, this.#onPinSelected, this.#onTileState);
      this.#applyFilters();
      this.#map.fit();
    } catch {
      if (this.#disposed || run !== this.#mapGeneration) return;
      this.el.mapStatus.textContent = MAP_FAILED;
    }
  }

  #closeMap() {
    this.#mapGeneration++;
    this.#map?.dispose();
    this.#map = null;
  }

  #focusOnMap(id) {
    this.#select(id);
    this.#setMode('map');
    this.#applyFilters();
    this.el.toolbar.scrollIntoView({ block: 'start', behavior: 'auto' });
    this.el.choice.focus({ preventScroll: true });
  }

  // --- events --------------------------------------------------------------

  #onFilter = () => this.#applyFilters();

  #onChoose = () => {
    this.#select(this.el.choice.value || null);
    this.#applyFilters({ keepSelection: true });
  };

  #onPinSelected = id => {
    this.#select(id);
    this.#applyFilters({ keepSelection: true });
  };

  #onTileState = state => {
    if (this.#disposed || this.#mode !== 'map') return;
    this.el.mapStatus.textContent = state === 'error' ? TILES_FAILED : TILES_READY;
  };

  #onClick = event => {
    const view = event.target.closest('[data-dining-view]');
    if (view) return this.#setMode(view.dataset.diningView);
    const focus = event.target.closest('[data-dining-focus]');
    if (focus) return this.#focusOnMap(focus.dataset.diningFocus);
    if (event.target.closest('#dining-map-fit')) this.#map?.fit();
    return undefined;
  };
}
