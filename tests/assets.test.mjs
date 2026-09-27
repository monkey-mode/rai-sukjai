// Keeps the shared asset manifest valid while two agents edit it.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { checkManifest } from '../tools/check-assets.mjs';

test('assets/manifest.json is valid and every done/approved file exists', () => {
  const { errors } = checkManifest();
  assert.deepEqual(errors, []);
});

test('every crop has 5 stages and each reference file exists', () => {
  const { manifest } = checkManifest();
  const crops = manifest.assets.filter(a => a.category === 'crop' && /\.s\d$/.test(a.id));
  assert.equal(crops.length, 8 * 5);
  for (const a of manifest.assets) {
    if (a.reference) assert.ok(fs.existsSync(new URL('../' + a.reference, import.meta.url)), a.reference);
  }
});

test("the game's asset list (js/art/assets.js) matches the manifest's paths, canvas and anchor", async () => {
  const vm = await import('node:vm');
  const read = f => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
  const ctx = vm.createContext({});
  vm.runInContext(read('js/logic/config.js') + read('js/art/assets.js') + ';this.SPECS = ASSET_SPECS;', ctx);
  const { manifest } = checkManifest();
  const byId = Object.fromEntries(manifest.assets.map(a => [a.id, a]));
  for (const [id, sp] of Object.entries(ctx.SPECS)) {
    const a = byId[id];
    assert.ok(a, `${id} is not in the manifest`);
    assert.equal(sp.output, a.output, id);
    assert.deepEqual([sp.w, sp.h, sp.ax, sp.ay], [...a.canvas, ...a.anchor], id);
  }
});

test('banana clumps on the farm each use a different variant', () => {
  const src = fs.readFileSync(new URL('../js/art/iso.js', import.meta.url), 'utf8');
  const block = src.match(/const BANANA_SPOTS = \[([\s\S]*?)\];/)[1];
  const variants = [...block.matchAll(/'([a-z]+)'/g)].map(m => m[1]);
  assert.ok(variants.length >= 2);
  assert.equal(new Set(variants).size, variants.length, 'duplicate banana variant: ' + variants.join(', '));
  const { manifest } = checkManifest();
  const ids = new Set(manifest.assets.map(a => a.id));
  for (const v of variants) assert.ok(ids.has(`scenery.banana_${v}_iso`), v);
});

test('banana clumps and palms stand on open farm ground or a paddy mound, inside the clearing and apart', async () => {
  const vm = await import('node:vm');
  const ctx = vm.createContext({});
  vm.runInContext(fs.readFileSync(new URL('../js/art/iso.js', import.meta.url), 'utf8') + ';this.X = { ISO, isoPt, FARM_ZONES, FARM_MOUNDS, FARM_CLEARING, BANANA_SPOTS, PALM_SPOTS };', ctx);
  const { isoPt, FARM_ZONES, FARM_MOUNDS, FARM_CLEARING } = ctx.X;
  const SPOTS = ctx.X.BANANA_SPOTS.concat(ctx.X.PALM_SPOTS);   // every plant sprite
  const inside = ([x0, y0, x1, y1], gx, gy) => gx > x0 && gx < x1 && gy > y0 && gy < y1;
  const onMound = (gx, gy) => FARM_MOUNDS.some(([cx, cy, rx, ry]) => Math.hypot((gx - cx) / rx, (gy - cy) / ry) <= .8);
  for (const [gx, gy, v] of SPOTS) {
    for (const [zone, rect] of Object.entries(FARM_ZONES)) {
      if (zone === 'paddies' && onMound(gx, gy)) continue;           // trees in the rice grow on a raised mound
      assert.ok(!inside(rect, gx, gy), `${v} stands in the ${zone}`);
    }
    assert.ok(gx > FARM_CLEARING[0] + .6 && gy > FARM_CLEARING[1] + .6, `${v} stands in the forest`);
    const [x, y] = isoPt(gx, gy);
    assert.ok(y > 46 && y < 532 && x > -300 && x < 1100, `${v} base is off the visible ground, bleed included (${x}, ${y})`);
  }
  for (let i = 0; i < SPOTS.length; i++) for (let j = i + 1; j < SPOTS.length; j++) {
    const [a, b] = [SPOTS[i], SPOTS[j]];
    assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1]) >= 1.5, `${a[2]} and ${b[2]} are too close`);
  }
});

test('palm crowns stay below the HUD', async () => {
  const vm = await import('node:vm');
  const ctx = vm.createContext({});
  vm.runInContext(fs.readFileSync(new URL('../js/art/iso.js', import.meta.url), 'utf8') + ';this.X = { isoPt, PALM_SPOTS };', ctx);
  const { manifest } = checkManifest();
  for (const [gx, gy, v, sc] of ctx.X.PALM_SPOTS) {
    const a = manifest.assets.find(e => e.id === `scenery.palm_${v}_iso`);
    const top = ctx.X.isoPt(gx, gy)[1] - a.anchor[1] * sc;          // palm canvases are cropped to the plant
    assert.ok(top >= 46, `${v} crown reaches y ${Math.round(top)}, under the HUD`);
  }
});

test('palms on the farm each use a different variant', () => {
  const src = fs.readFileSync(new URL('../js/art/iso.js', import.meta.url), 'utf8');
  const block = src.match(/const PALM_SPOTS = \[([\s\S]*?)\];/)[1];
  const variants = [...block.matchAll(/'([a-z_]+)'/g)].map(m => m[1]);
  assert.ok(variants.length >= 2);
  assert.equal(new Set(variants).size, variants.length, 'duplicate palm variant: ' + variants.join(', '));
  const { manifest } = checkManifest();
  const ids = new Set(manifest.assets.map(a => a.id));
  for (const v of variants) assert.ok(ids.has(`scenery.palm_${v}_iso`), v);
});
