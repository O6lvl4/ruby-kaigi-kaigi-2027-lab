// Restaurant pins on GSI tiles. Numbers match the card list; colour shows the filter.
import { addPin, createGsiMap, fitPoints } from '../../lib/gsi_map.js';

const MIYAZAKI_CENTRE = [31.915, 131.424];

export function createDiningMap(container, restaurants, onSelect, onStatus) {
  const gsi = createGsiMap(container, { maxZoom: 18, onStatus: status => status !== 'loading' && onStatus(status) });
  const markers = new Map();
  let disposed = false;

  function fit() {
    if (restaurants.length)
      fitPoints(
        gsi.map,
        restaurants.map(restaurant => restaurant.coordinates),
        { padding: 38 }
      );
    else gsi.map.setView(MIYAZAKI_CENTRE, 13);
  }

  // Establish the view before adding markers so their DOM and initial filter styles exist.
  fit();
  for (const restaurant of restaurants) {
    const marker = addPin(gsi.map, restaurant.coordinates, {
      name: restaurant.name,
      className: 'dining-pin',
      html: `<span>${restaurant.number}</span>`,
      size: 34,
      tooltipOffset: -14,
      onClick: () => onSelect(restaurant.id)
    });
    markers.set(restaurant.id, marker);
    marker.getElement()?.setAttribute('data-dining-pin', restaurant.id);
    marker.getElement()?.classList.toggle('dining-pin-unknown', restaurant.groupCapacity === null);
  }

  return {
    fit() {
      if (!disposed) fit();
    },
    update(matches, selected) {
      for (const [id, marker] of markers) {
        marker.getElement()?.classList.toggle('dining-pin-muted', !matches.has(id));
        marker.getElement()?.classList.toggle('dining-pin-selected', id === selected);
      }
    },
    select(id) {
      for (const [key, marker] of markers) {
        marker.getElement()?.classList.toggle('dining-pin-selected', key === id);
        if (key !== id) marker.closeTooltip();
      }
      markers.get(id)?.openTooltip();
    },
    dispose() {
      disposed = true;
      gsi.remove();
      markers.clear();
      container.replaceChildren();
      container.removeAttribute('style');
      container.className = 'dining-map-canvas';
    }
  };
}
