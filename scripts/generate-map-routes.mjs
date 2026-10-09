// Precomputes road-following routes for every map scenario path into db/data/map_routes.json.
// Run by hand when places or scenarios change: `node scripts/generate-map-routes.mjs`.
//
// Routes come from the FOSSGIS OSRM servers that openstreetmap.org itself uses, on
// OpenStreetMap data (© OpenStreetMap contributors, ODbL). The guide never calls a
// routing API at runtime and never sends the visitor's location anywhere.
import { readFile, writeFile } from 'node:fs/promises';

const SERVER = 'https://routing.openstreetmap.de';
const PROFILES = { walking: 'routed-foot', driving: 'routed-car' };
const USER_AGENT = 'RubyKaigiKaigi-2027-field-guide (https://github.com/O6lvl4/ruby-kaigi-kaigi-2027-lab)';
const PAUSE_MS = 1500; // one request at a time, well within the servers' fair-use policy

const places = JSON.parse(await readFile('db/data/places.json', 'utf8'));
const { scenarios } = JSON.parse(await readFile('db/data/map_scenarios.json', 'utf8'));
const coordinatesOf = id => places.find(place => place.id === id)?.coordinates ?? raiseMissing(id);
const round = ([lng, lat]) => [Number(lng.toFixed(6)), Number(lat.toFixed(6))];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function raiseMissing(id) {
  throw new Error(`Unknown place ${id}`);
}

async function route(mode, placeIds) {
  const points = placeIds
    .map(coordinatesOf)
    .map(([lng, lat]) => `${lng},${lat}`)
    .join(';');
  const url = `${SERVER}/${PROFILES[mode]}/route/v1/driving/${points}?overview=full&geometries=geojson&steps=false`;
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  const body = await response.json();
  if (body.code !== 'Ok') throw new Error(`${body.code} ${url}`);
  const [best] = body.routes;
  return {
    distance: Math.round(best.distance),
    duration: Math.round(best.duration),
    // How far each place had to be moved to reach the nearest routable road.
    snapMeters: body.waypoints.map(waypoint => Math.round(waypoint.distance)),
    coordinates: best.geometry.coordinates.map(round)
  };
}

const routes = [];
for (const scenario of scenarios) {
  for (const [path, placeIds] of scenario.paths.entries()) {
    for (const mode of Object.keys(PROFILES)) {
      routes.push({
        id: `${scenario.id}-${path}-${mode}`,
        scenario: scenario.id,
        path,
        mode,
        placeIds,
        ...(await route(mode, placeIds))
      });
      console.log(`${scenario.id} ${placeIds.join(' → ')} ${mode}: ${routes.at(-1).distance} m`);
      await sleep(PAUSE_MS);
    }
  }
}

const document = {
  checkedAt: new Date().toISOString().slice(0, 10),
  source: {
    name: 'FOSSGIS OSRM（routing.openstreetmap.de）',
    url: SERVER,
    data: '© OpenStreetMap contributors',
    license: 'ODbL',
    licenseUrl: 'https://www.openstreetmap.org/copyright'
  },
  routes
};
await writeFile('db/data/map_routes.json', JSON.stringify(document, null, 2) + '\n');
