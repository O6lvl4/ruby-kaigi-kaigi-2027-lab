// The Rails-rendered schematic SVG (1000×900, not to scale): camera framing,
// legible labels at any size, and which places the current scenario numbers.
const WIDTH = 1000;
const HEIGHT = 900;

export class SchematicView {
  #camera = null;

  constructor(svg) {
    this.svg = svg;
    this.observer = new ResizeObserver(() => (this.#camera ? this.frame(this.#camera) : this.sizeLabels()));
    this.observer.observe(svg);
  }

  get nodes() {
    return [...this.svg.querySelectorAll('[data-map-node]')];
  }

  get placeIds() {
    return this.nodes.map(node => node.dataset.mapNode);
  }

  // Show `box` ([x, y, w, h]) filling the element without distortion or leaving the map.
  frame(box) {
    this.#camera = box.slice();
    let [x, y, w, h] = box;
    const rect = this.svg.getBoundingClientRect();
    if (rect.width && rect.height) {
      const ratio = rect.width / rect.height;
      if (w / h > ratio) {
        const fittedHeight = w / ratio;
        y -= (fittedHeight - h) / 2;
        h = fittedHeight;
      } else {
        const fittedWidth = h * ratio;
        x -= (fittedWidth - w) / 2;
        w = fittedWidth;
      }
    }
    if (h <= HEIGHT) y = Math.max(0, Math.min(HEIGHT - h, y));
    if (w <= WIDTH) x = Math.max(0, Math.min(WIDTH - w, x));
    this.svg.setAttribute('viewBox', [x, y, w, h].join(' '));
    this.sizeLabels();
  }

  // Keep text and tap targets the same on-screen size whatever the zoom.
  sizeLabels() {
    const box = this.svg.viewBox.baseVal;
    const rect = this.svg.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const scale = Math.min(rect.width / box.width, rect.height / box.height);
    if (!scale) return;
    this.svg.style.setProperty('--label-size', `${(rect.width < 600 ? 13 : 14) / scale}px`);
    this.svg.style.setProperty('--context-size', `${11 / scale}px`);
    this.svg.style.setProperty('--number-size', `${12 / scale}px`);
    const hitSize = Math.max(90, 44 / scale);
    for (const node of this.nodes) {
      const circle = node.querySelector('.point-ring');
      const hit = node.querySelector('.point-hit');
      const x = Number(circle.getAttribute('cx'));
      const y = Number(circle.getAttribute('cy'));
      circle.setAttribute('r', String(Math.max(18, 12 / scale)));
      hit.setAttribute('x', String(x - hitSize / 2));
      hit.setAttribute('y', String(y - hitSize / 2));
      hit.setAttribute('width', String(hitSize));
      hit.setAttribute('height', String(hitSize));
    }
  }

  showScenario(scenario) {
    for (const node of this.nodes) {
      const index = scenario.selected_ids.indexOf(node.dataset.mapNode);
      node.classList.toggle('is-in-scenario', index >= 0);
      node.classList.remove('is-selected');
      node.querySelector('[data-map-number]').textContent = index < 0 ? '' : String(index + 1);
    }
    for (const path of this.svg.querySelectorAll('[data-route-scenario]')) {
      path.classList.toggle('is-active', path.dataset.routeScenario === scenario.key);
    }
    this.frame(scenario.schematic.view_box);
  }

  highlight(id) {
    for (const node of this.nodes) node.classList.toggle('is-selected', node.dataset.mapNode === id);
  }

  dispose() {
    this.observer.disconnect();
  }
}
