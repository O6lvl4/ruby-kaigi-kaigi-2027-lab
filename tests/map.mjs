import { chromium, webkit } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const url = process.env.DEMO_URL || 'http://127.0.0.1:5173/';
const results = [];
await mkdir('evidence', { recursive: true });
async function ready(page) {
  await page.waitForFunction(
    () => window.guideApp?.mapReady || window.guideApp?.error || window.guideApp?.mapError,
    null,
    { timeout: 180000 }
  );
  assert.equal(await page.evaluate(() => window.guideApp.mapReady), true);
}
for (const [engineName, engine] of Object.entries({ chromium, webkit })) {
  const browser = await engine.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 1360, height: 1000 } }),
      page = await context.newPage(),
      requests = [],
      errors = [];
    page.on('request', r => requests.push(r.url()));
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(url);
    await ready(page);
    assert.equal(await page.locator('#schematic-map [data-map-node]').count(), 7);
    assert.equal(page.workers().length, 0);
    assert.ok(
      !requests.some(u => /cyberjapandata|real-map-/.test(u)),
      'Default schematic must not load Leaflet or tiles'
    );
    await page.evaluate(() => {
      window.originalPoints = [...document.querySelectorAll('[data-map-node]')];
      window.originalAnchors = window.originalPoints.map(n => [
        n.dataset.mapNode,
        n.querySelector('circle').getAttribute('cx'),
        n.querySelector('circle').getAttribute('cy')
      ]);
    });
    await page.screenshot({ path: `evidence/map-${engineName}-desktop.png`, fullPage: true });
    for (const key of ['arrival', 'venue', 'night']) {
      await page.locator(`[data-map-scenario="${key}"]`).click();
      await page.waitForFunction(k => window.guideApp.mapState.key === k, key);
      const state = await page.evaluate(() => window.guideApp.mapState),
        points = state.geojson.features.filter(f => f.geometry.type === 'Point');
      assert.equal(points.length, 7);
      assert.deepEqual(
        await page.locator('[data-place-id]').evaluateAll(ns => ns.map(n => n.dataset.placeId)),
        state.placeIds
      );
      assert.equal(state.renderer, 'Rails-ActionView-ERB');
      assert.equal(state.controller, 'MapScenariosController');
      assert.equal(await page.evaluate(() => window.originalPoints.every(n => n.isConnected)), true);
      assert.deepEqual(
        await page
          .locator('[data-map-node]')
          .evaluateAll(ns =>
            ns.map(n => [
              n.dataset.mapNode,
              n.querySelector('circle').getAttribute('cx'),
              n.querySelector('circle').getAttribute('cy')
            ])
          ),
        await page.evaluate(() => window.originalAnchors)
      );
      const first = state.placeIds[0];
      await page.locator(`[data-map-place="${first}"]`).click();
      assert.equal(await page.evaluate(() => window.guideApp.mapSelected), first);
      await page.locator(`[data-map-node="${first}"]`).press('Enter');
      assert.equal(await page.locator(`[data-map-place="${first}"]`).getAttribute('aria-pressed'), 'true');
      results.push({
        engine: engineName,
        scenario: key,
        allSevenPersistent: true,
        sameAnchors: true,
        railsCardsMatch: true
      });
    }
    await page.locator('[data-map-mode="actual"]').click();
    await page.waitForFunction(() => ['loaded', 'error'].includes(window.guideApp.mapTileStatus), null, {
      timeout: 30000
    });
    assert.equal(await page.evaluate(() => window.guideApp.mapTileStatus), 'loaded');
    assert.equal(await page.locator('.guide-marker').count(), 7);
    await page.evaluate(() => (window.originalMarkers = [...document.querySelectorAll('.guide-marker')]));
    for (const key of ['arrival', 'venue', 'night']) {
      await page.locator(`[data-map-scenario="${key}"]`).click();
      await page.waitForFunction(k => window.guideApp.mapState.key === k, key);
      assert.equal(await page.locator('.guide-marker').count(), 7);
      assert.equal(await page.evaluate(() => window.originalMarkers.every(n => n.isConnected)), true);
    }
    // Road-following routes: 徒歩 / 車 switch the drawn line and the highlighted distance rows.
    assert.equal(await page.locator('#travel-mode-switch').isVisible(), true);
    assert.equal(await page.locator('[data-legend="actual"]').isVisible(), true);
    for (const mode of ['walking', 'driving']) {
      await page.locator(`[data-travel-mode="${mode}"]`).click();
      await page.waitForFunction(m => window.guideApp.mapTravelMode === m, mode);
      assert.equal(await page.locator(`[data-travel-mode="${mode}"]`).getAttribute('aria-pressed'), 'true');
      assert.ok((await page.locator(`.road-route [data-route-mode="${mode}"].is-current`).count()) > 0);
      const vertices = await page.evaluate(() =>
        [...document.querySelectorAll('#real-map path.leaflet-interactive, #real-map svg path')].map(
          p => (p.getAttribute('d') || '').split(/[LM]/).length
        )
      );
      assert.ok(Math.max(...vertices) > 5, `The ${mode} route follows roads, not a straight segment`);
      const dashed = await page.evaluate(() =>
        [...document.querySelectorAll('#real-map svg path')].some(p => p.getAttribute('stroke-dasharray'))
      );
      assert.equal(dashed, mode === 'walking', 'Walking is dotted and driving is solid');
    }
    assert.match(await page.locator('.road-routes').innerText(), /OpenStreetMap/);
    // Pinch / Ctrl + wheel zooms the map, not the page; a plain wheel scrolls the page and shows a hint.
    const tileZoom = () =>
      page.evaluate(() =>
        Math.max(
          ...[...document.querySelectorAll('#real-map img.leaflet-tile')].map(img => Number(img.src.split('/').at(-3)))
        )
      );
    const zoomBefore = await tileZoom();
    const realBox = await page.locator('#real-map').boundingBox();
    await page.mouse.move(realBox.x + realBox.width / 2, realBox.y + realBox.height / 2);
    await page.keyboard.down('Control');
    await page.mouse.wheel(0, -360);
    await page.keyboard.up('Control');
    await page.waitForFunction(
      z =>
        Math.max(
          ...[...document.querySelectorAll('#real-map img.leaflet-tile')].map(img => Number(img.src.split('/').at(-3)))
        ) > z,
      zoomBefore
    );
    assert.equal(await page.locator('#real-map .map-zoom-hint').isVisible(), false);
    const scrollBefore = await page.evaluate(() => scrollY);
    await page.mouse.wheel(0, 200);
    await page.waitForFunction(y => scrollY > y, scrollBefore);
    assert.equal(
      await page.locator('#real-map .map-zoom-hint').isVisible(),
      true,
      'A plain wheel scrolls the page and explains how to zoom'
    );
    await page.evaluate(() => scrollTo(0, 0));
    await page.locator('[data-map-mode="schematic"]').click();
    assert.equal(await page.locator('#travel-mode-switch').isVisible(), false);
    const viewWidth = () => page.evaluate(() => document.getElementById('schematic-map').viewBox.baseVal.width);
    const widthBefore = await viewWidth();
    const schematicBox = await page.locator('#schematic-map').boundingBox();
    await page.mouse.move(schematicBox.x + schematicBox.width / 2, schematicBox.y + schematicBox.height / 2);
    await page.keyboard.down('Control');
    await page.mouse.wheel(0, -240);
    await page.keyboard.up('Control');
    await page.waitForFunction(w => document.getElementById('schematic-map').viewBox.baseVal.width < w, widthBefore);
    await page.locator('#fit-map').click();
    assert.equal(await page.locator('.leaflet-container').count(), 0);
    assert.equal(await page.locator('#real-map').locator('*').count(), 0);
    const before = await page.locator('*').count();
    for (let i = 0; i < 12; i++) {
      await page.locator(`[data-map-scenario="${['arrival', 'venue', 'night'][i % 3]}"]`).click();
      await page.evaluate(() => window.scrollTo(0, 600));
      await page.evaluate(() => window.scrollTo(0, 0));
    }
    for (let i = 0; i < 3; i++) {
      await page.locator('[data-map-mode="actual"]').click();
      await page.waitForFunction(() => window.guideApp.mapMetrics.realMapInstances === 1);
      await page.locator('[data-map-mode="schematic"]').click();
      assert.equal(await page.locator('.leaflet-container').count(), 0);
    }
    assert.equal(await page.evaluate(() => window.guideApp.railsRequestCount), 8);
    assert.equal(await page.evaluate(() => window.guideApp.mapMetrics.cachedScenarios), 3);
    assert.equal(await page.evaluate(() => window.guideApp.mapMetrics.realMapInstances), 0);
    assert.equal(page.workers().length, 0);
    assert.ok((await page.locator('*').count()) <= before + 20);
    await page.waitForTimeout(20000);
    assert.equal(await page.locator('[data-map-node]').count(), 7);
    assert.equal(page.workers().length, 0);
    assert.deepEqual(errors, []);
    console.log(
      'PASS persistent7-point schematic/real maps, bounded repeated switches/scroll and20s observation',
      engineName
    );
    await context.close();
    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } }),
      mp = await mobile.newPage();
    await mp.goto(url);
    await ready(mp);
    assert.ok(await mp.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await mp.screenshot({ path: `evidence/map-${engineName}-mobile.png`, fullPage: true });
    await mobile.close();
    const blocked = await browser.newContext({ viewport: { width: 390, height: 844 } }),
      bp = await blocked.newPage();
    await blocked.route('https://cyberjapandata.gsi.go.jp/**', r => r.abort('failed'));
    await bp.goto(url);
    await ready(bp);
    await bp.locator('[data-map-mode="actual"]').click();
    await bp.waitForFunction(() => window.guideApp.mapTileStatus === 'error');
    await bp.locator('[data-map-mode="schematic"]').click();
    assert.equal(await bp.locator('[data-map-node]').count(), 7);
    assert.equal(await bp.locator('#schematic-layer').isVisible(), true);
    assert.equal(await bp.locator('[data-place-id]').count(), 4);
    await blocked.close();
    console.log('PASS real-tile failure returns to Rails schematic and cards', engineName);
  } finally {
    await browser.close();
  }
}
await writeFile('evidence/map-results.json', JSON.stringify({ url, results }, null, 2));
