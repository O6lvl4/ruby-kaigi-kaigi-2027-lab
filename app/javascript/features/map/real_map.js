// The real map: all seven places on GSI tiles, with the scenario's road-following
// routes (precomputed from OpenStreetMap) for the chosen travel mode.
import { addPin, addRouteLine, createGsiMap, fitPoints, layerGroup } from '../../lib/gsi_map.js';

const points = scenario => scenario.geojson.features.filter(feature => feature.geometry.type === 'Point');
const roads = (scenario, mode) =>
  scenario.geojson.features.filter(feature => feature.properties.kind === 'road' && feature.properties.mode === mode);

export function createRealMap(container, onSelect, onStatus) {
  const gsi = createGsiMap(container, { maxZoom: 17, zoomControl: true, onStatus });
  gsi.map.zoomControl.setPosition('topright');
  const routes = layerGroup(gsi.map);
  const markers = new Map();
  let current = null;
  let travelMode = 'driving';
  let disposed = false;

  function addMarkers(scenario) {
    for (const feature of points(scenario)) {
      const marker = addPin(gsi.map, feature.geometry.coordinates, {
        name: feature.properties.name,
        className: 'guide-marker',
        html: '<span></span>',
        size: 36,
        tooltipOffset: -16,
        onClick: () => onSelect(feature.id)
      });
      markers.set(feature.id, marker);
    }
  }

  function fit(all = false) {
    if (!current || disposed) return;
    const shown = points(current).filter(feature => all || current.selected_ids.includes(feature.id));
    const routeCoordinates = all ? [] : roads(current, travelMode).flatMap(feature => feature.geometry.coordinates);
    fitPoints(gsi.map, [...shown.map(feature => feature.geometry.coordinates), ...routeCoordinates], { padding: 45 });
  }

  function update(scenario, mode = travelMode) {
    if (disposed) return;
    current = scenario;
    travelMode = mode;
    if (markers.size === 0) addMarkers(scenario);
    for (const feature of points(scenario)) styleMarker(markers.get(feature.id).getElement(), feature, scenario);
    routes.clearLayers();
    for (const road of roads(scenario, mode)) addRouteLine(routes, road.geometry.coordinates, mode);
    fit();
  }

  return {
    update,
    fit,
    select(id) {
      for (const [key, marker] of markers) marker.getElement()?.classList.toggle('place-marker-active', key === id);
      markers.get(id)?.openTooltip();
    },
    dispose() {
      disposed = true;
      routes.clearLayers();
      gsi.remove();
      markers.clear();
      container.replaceChildren();
      container.removeAttribute('class');
      container.removeAttribute('style');
    }
  };
}

// Numbered when the place is part of the scenario, muted otherwise.
function styleMarker(node, feature, scenario) {
  if (!node) return;
  const index = scenario.selected_ids.indexOf(feature.id);
  node.classList.toggle('place-marker-muted', index < 0);
  node.classList.toggle('guide-marker-offset', feature.id === 'bunkakoen');
  node.querySelector('span').textContent = index < 0 ? '·' : String(index + 1);
}
