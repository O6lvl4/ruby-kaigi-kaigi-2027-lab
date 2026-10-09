import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export function createRealMap(container, onSelect, onStatus) {
  const map = L.map(container, {
    fadeAnimation: false,
    zoomAnimation: false,
    scrollWheelZoom: false,
    minZoom: 11,
    maxZoom: 17,
    zoomControl: true
  });
  map.zoomControl.setPosition('topright');
  const markers = new Map(),
    routes = L.layerGroup().addTo(map);
  let current,
    disposed = false,
    errors = 0;
  const tile = L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png', {
    maxZoom: 17,
    keepBuffer: 0,
    updateWhenIdle: true,
    attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html">地理院タイル（淡色地図）</a>'
  }).addTo(map);
  tile.on('loading', () => onStatus('loading'));
  tile.on('tileerror', () => {
    errors++;
    onStatus('error');
  });
  tile.on('load', () => onStatus(errors ? 'error' : 'loaded'));
  function fit(all = false) {
    if (!current || disposed) return;
    const points = current.geojson.features.filter(
      f => f.geometry.type === 'Point' && (all || current.selected_ids.includes(f.id))
    );
    map.invalidateSize({ animate: false });
    map.fitBounds(L.latLngBounds(points.map(p => [p.geometry.coordinates[1], p.geometry.coordinates[0]])), {
      padding: [45, 45],
      maxZoom: 15,
      animate: false
    });
  }
  function update(data) {
    if (disposed) return;
    current = data;
    const points = data.geojson.features.filter(f => f.geometry.type === 'Point');
    if (markers.size === 0)
      for (const feature of points) {
        const marker = L.marker([feature.geometry.coordinates[1], feature.geometry.coordinates[0]], {
          icon: L.divIcon({
            className: 'guide-marker',
            html: '<span></span>',
            iconSize: [36, 36],
            iconAnchor: [18, 18]
          }),
          title: feature.properties.name,
          keyboard: true
        }).addTo(map);
        const label = document.createElement('span');
        label.textContent = feature.properties.name;
        marker.bindTooltip(label, { direction: 'top', offset: [0, -16] });
        marker.on('click', () => onSelect(feature.id));
        markers.set(feature.id, marker);
      }
    for (const feature of points) {
      const node = markers.get(feature.id).getElement();
      const index = data.selected_ids.indexOf(feature.id);
      node?.classList.toggle('place-marker-muted', index < 0);
      node?.classList.toggle('guide-marker-offset', feature.id === 'bunkakoen');
      if (node) node.querySelector('span').textContent = index < 0 ? '·' : String(index + 1);
    }
    routes.clearLayers();
    for (const f of data.geojson.features.filter(f => f.geometry.type === 'LineString'))
      L.polyline(
        f.geometry.coordinates.map(c => [c[1], c[0]]),
        { color: '#a3293d', weight: 3, dashArray: '7 9', interactive: false }
      ).addTo(routes);
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
      tile.off();
      routes.clearLayers();
      map.remove();
      markers.clear();
      container.replaceChildren();
      container.removeAttribute('class');
      container.removeAttribute('style');
    }
  };
}
