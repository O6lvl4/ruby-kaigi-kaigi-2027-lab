// Leaflet on GSI pale tiles (地理院タイル・淡色地図), shared by every map in the guide.
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const GSI_PALE_TILES = 'https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png';
const GSI_ATTRIBUTION = '<a href="https://maps.gsi.go.jp/development/ichiran.html">地理院タイル（淡色地図）</a>';
const STATIC_MAP = { fadeAnimation: false, zoomAnimation: false, scrollWheelZoom: false, minZoom: 11 };

// GeoJSON order is [longitude, latitude]; Leaflet wants [latitude, longitude].
export const toLatLng = ([longitude, latitude]) => [latitude, longitude];

// onStatus receives 'loading', 'loaded' or 'error' (sticky once any tile failed).
export function createGsiMap(container, { maxZoom, onStatus = () => {}, ...options }) {
  const map = L.map(container, { ...STATIC_MAP, maxZoom, ...options });
  const tiles = L.tileLayer(GSI_PALE_TILES, {
    maxZoom,
    keepBuffer: 0,
    updateWhenIdle: true,
    attribution: GSI_ATTRIBUTION
  });
  let tileErrors = 0;
  tiles.on('loading', () => onStatus('loading'));
  tiles.on('tileerror', () => {
    tileErrors++;
    onStatus('error');
  });
  tiles.on('load', () => onStatus(tileErrors ? 'error' : 'loaded'));
  tiles.addTo(map);
  return {
    map,
    remove() {
      tiles.off();
      map.remove();
    }
  };
}

export function fitPoints(map, coordinates, { padding }) {
  map.invalidateSize({ animate: false });
  map.fitBounds(L.latLngBounds(coordinates.map(toLatLng)), {
    padding: [padding, padding],
    maxZoom: 15,
    animate: false
  });
}

// A keyboard-reachable pin with a name tooltip.
export function addPin(map, coordinates, { name, className, html, size, tooltipOffset, onClick }) {
  const marker = L.marker(toLatLng(coordinates), {
    title: name,
    keyboard: true,
    icon: L.divIcon({ className, html, iconSize: [size, size], iconAnchor: [size / 2, size / 2] })
  }).addTo(map);
  const label = document.createElement('span');
  label.textContent = name;
  marker.bindTooltip(label, { direction: 'top', offset: [0, tooltipOffset] });
  marker.on('click', onClick);
  return marker;
}

// Road-following route: solid for driving, dotted for walking (as Google Maps draws them).
const ROUTE_STYLES = {
  driving: { color: '#a3293d', weight: 5, opacity: 0.85 },
  walking: { color: '#397b83', weight: 5, opacity: 0.9, dashArray: '1 9', lineCap: 'round' }
};

export function addRouteLine(layer, coordinates, mode) {
  L.polyline(coordinates.map(toLatLng), { ...ROUTE_STYLES[mode], smoothFactor: 0.5, interactive: false }).addTo(layer);
}

export const layerGroup = map => L.layerGroup().addTo(map);
