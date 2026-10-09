// The real Rails app on Ruby/Wasm (Node): routes, controllers, ERB views and JSON.
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { bootRails } from './support/rails_app.mjs';

const { vm, get, request } = await bootRails();
const html = path => get(path, 'text/html');
const data = async name => JSON.parse(await readFile(`db/data/${name}.json`, 'utf8'));
const PAGES = {
  '/': 'MapsController',
  '/event': 'EventsController',
  '/restaurants': 'RestaurantsController',
  '/archives': 'EditionsController'
};

const pages = {};
for (const [path, controller] of Object.entries(PAGES)) {
  const page = await html(path);
  pages[path] = page.body;
  assert.equal(page.status, 200, path);
  assert.equal(page.headers['x-renderer'], 'Rails-ActionView-ERB');
  assert.equal(page.headers['x-ruby-platform'], 'wasm32-wasi');
  assert.equal((page.body.match(/data-renderer="rails-erb"/g) || []).length, 1);
  assert.match(page.body, new RegExp(`data-controller="${controller}"`));
  assert.ok(!page.body.includes('<%'));
  assert.match(page.body, /id="site-navigation"/);
  assert.equal(
    (page.body.match(/aria-current="page"/g) || []).length,
    1,
    `${path} marks exactly one current menu item`
  );
  assert.ok(!page.body.includes('aid-on'));
}
assert.match(pages['/event'], /2027年4月14日〜16日/);
assert.match(pages['/event'], /バス 約60分/);
assert.equal((pages['/'].match(/data-map-node=/g) || []).length, 7);
assert.match(pages['/'], /id="schematic-map"/);
assert.equal((await vm.evalAsync('RUBY_VERSION')).toString(), '4.0.7');
assert.equal((await vm.evalAsync('Rails.version')).toString(), '8.1.4');
assert.match(pages['/'], /Ruby 4\.0\.7 \/ Rails 8\.1\.4/, 'The footer reports the runtime that rendered it');
console.log('PASS each guide page is its own Rails route → controller → ActionView ERB with the shared layout');

const mounted = (
  await request('GET', '/restaurants', { accept: 'text/html', scriptName: '/ruby-kaigi-kaigi-2027-lab' })
).body;
assert.match(mounted, /href="\/ruby-kaigi-kaigi-2027-lab\/event"/);
assert.match(mounted, /aria-current="page" href="\/ruby-kaigi-kaigi-2027-lab\/restaurants"/);
console.log('PASS URL helpers honour the Pages mount point (SCRIPT_NAME)');

const event = await get('/event.json');
assert.equal(event.status, 200);
assert.deepEqual(event.body, await data('event'));
console.log('PASS Rails JSON exposes the same event snapshot');

assert.equal(typeof globalThis.pglite4rails, 'undefined');
assert.equal((await vm.evalAsync('defined?(ActiveRecord::Base).to_s')).toString(), '');
console.log('PASS reading-mode Rails boots and renders without opening the lab database');

await vm.evalAsync(`
  class << Event
    alias_method :original_current, :current
    def current
      attributes = JSON.parse(Rails.root.join('db/data/event.json').read).merge('venue' => 'RUBY_DYNAMIC_SENTINEL <script>bad</script>')
      new(attributes)
    end
  end`);
const changed = await html('/event');
assert.match(changed.body, /RUBY_DYNAMIC_SENTINEL/);
assert.match(changed.body, /&lt;script&gt;bad&lt;\/script&gt;/);
assert.ok(!changed.body.includes('<script>bad</script>'));
await vm.evalAsync('class << Event; alias_method :current, :original_current; end');
console.log('PASS changing the Ruby model changes ERB output and ActionView escapes HTML');

for (const scenario of ['arrival', 'venue', 'night']) {
  const mapped = await get(`/map/scenarios/${scenario}.json`);
  assert.equal(mapped.status, 200);
  assert.equal(mapped.body.key, scenario);
  assert.equal(mapped.body.renderer, 'Rails-ActionView-ERB');
  assert.equal(mapped.body.controller, 'MapScenariosController');
  const points = mapped.body.geojson.features.filter(f => f.geometry.type === 'Point');
  assert.equal(points.length, 7);
  assert.deepEqual(
    points
      .filter(f => f.properties.selected)
      .map(f => f.id)
      .sort(),
    mapped.body.selected_ids.slice().sort()
  );
  assert.deepEqual(
    mapped.body.selected_ids,
    mapped.body.places.map(p => p.id)
  );
  for (const p of points) {
    assert.ok(p.geometry.coordinates[0] > 131 && p.geometry.coordinates[0] < 132);
    assert.ok(p.geometry.coordinates[1] > 31 && p.geometry.coordinates[1] < 32);
    if (mapped.body.selected_ids.includes(p.id)) assert.ok(mapped.body.html.includes(`data-place-id="${p.id}"`));
    assert.ok(p.properties.coordinate_source.startsWith('https://'));
  }
  for (const line of mapped.body.geojson.features.filter(f => f.geometry.type === 'LineString'))
    assert.equal(line.properties.kind, 'schematic');
}
assert.equal((await get('/map/scenarios/unknown.json')).status, 404);
console.log(
  'PASS Rails scenarios emit matching ERB place cards and source-backed GeoJSON with schematic-only lines; unknown → 404'
);

const restaurantsJson = await get('/restaurants.json');
const editionsJson = await get('/archives.json');
const restaurantData = await data('restaurants');
const editionData = await data('editions');
assert.deepEqual(restaurantsJson.body.restaurants, restaurantData.restaurants);
assert.deepEqual(editionsJson.body.editions, editionData.editions);
const venues = restaurantData.restaurants;
const restaurantsHtml = pages['/restaurants'];
const archivesHtml = pages['/archives'];
assert.equal(venues.length, 20);
assert.deepEqual(
  editionData.editions.map(x => x.year),
  [2026, 2025, 2024, 2023, 2022]
);
assert.equal(venues.find(x => x.id === 'ajidokoro-shu').groupCapacity, null);
assert.equal(venues.find(x => x.id === 'torihisa').groupCapacity, 20);
assert.equal(venues.find(x => x.id === 'takasago').totalSeats, 163);
assert.equal(venues.find(x => x.id === 'takasago').groupCapacity, 50);
assert.equal((restaurantsHtml.match(/data-restaurant-id=/g) || []).length, 20);
assert.equal((archivesHtml.match(/data-archive-year=/g) || []).length, 5);
assert.match(restaurantsHtml, /id="dining"/);
assert.match(archivesHtml, /id="archive"/);
for (const restaurant of venues) {
  assert.ok(restaurantsHtml.includes(restaurant.name));
  assert.ok(restaurantsHtml.includes(restaurant.sourceUrl));
}
for (const edition of editionData.editions)
  for (const key of ['url', 'scheduleUrl', 'eventsUrl']) assert.ok(archivesHtml.includes(edition[key]));
console.log('PASS real Rails ERB and JSON expose twenty source-backed dining venues and five official archives');

assert.equal(new Set(venues.map(v => v.id)).size, 20);
assert.equal(venues.filter(v => v.venueType === 'hotel_banquet').length, 4);
assert.equal(venues.find(v => v.id === 'rikyu').groupCapacity, null);
assert.equal(venues.find(v => v.id === 'ebisuya-ichibangai').groupCapacity, 40);
assert.equal(venues.find(v => v.id === 'take-miyazaki').groupCapacity, 65);
assert.equal(venues.find(v => v.id === 'take-miyazaki').standingCapacity, 80);
assert.equal(venues.find(v => v.id === 'uruwashi').totalSeats, null);
assert.match(restaurantsHtml, /20件を掲載/);
assert.match(restaurantsHtml, /ホテル宴会場/);
for (const venue of venues) {
  for (const key of ['totalSeats', 'groupCapacity', 'standingCapacity'])
    assert.ok(venue[key] === null || (Number.isInteger(venue[key]) && venue[key] > 0));
  assert.ok(venue.sourceUrl.startsWith('https://'));
  if (venue.openingHours) assert.ok(restaurantsHtml.includes(venue.openingHours));
  for (const fieldSource of Object.values(venue.fieldSources)) {
    const url = venue[fieldSource] || fieldSource;
    assert.ok(typeof url === 'string' && url.startsWith('https://'), `Missing provenance ${venue.id}/${fieldSource}`);
    assert.ok(restaurantsHtml.includes(url), `Missing visible provenance link ${venue.id}/${fieldSource}`);
  }
  if (venue.venueType === 'hotel_banquet') {
    assert.equal(venue.totalSeats, null);
    assert.ok(venue.roomOptions.some(room => room.seatedMax === venue.groupCapacity));
  }
}
console.log(
  'PASS expanded data provenance, unknown/conflicting capacities, seated-vs-standing and hotel room distinctions'
);

assert.equal(venues.filter(venue => venue.coordinates?.length === 2).length, 20);
for (const venue of venues) {
  assert.ok(venue.coordinates.every(Number.isFinite));
  assert.ok(venue.coordinateSourceUrl.startsWith('https://'));
  assert.ok(venue.coordinatePrecision.length > 0);
  const query = new URL('https://www.google.com/maps/search/');
  query.searchParams.set('api', '1');
  query.searchParams.set('query', `${venue.name} ${venue.address}`);
  assert.ok(restaurantsHtml.includes(query.href.replaceAll('&', '&amp;')));
  assert.equal(venue.thumbnail, null, 'No unverified photo may be presented as a venue photo');
}
for (const place of await data('places')) {
  assert.ok(place.address.length > 0);
  assert.ok(place.addressQualification.length > 0);
  assert.ok(place.addressSourceUrl.startsWith('https://'));
}
assert.match(restaurantsHtml, /id="dining-area"/);
assert.match(restaurantsHtml, /id="dining-map-panel"/);
for (const body of Object.values(pages)) assert.ok(!body.includes('origin='));
console.log(
  'PASS all 27 destinations have qualified addresses; 20 dining pins and origin-free Maps links are Rails-rendered'
);
