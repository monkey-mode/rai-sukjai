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

test('banana clumps stand on open farm ground, below the horizon and apart from each other', async () => {
  const vm = await import('node:vm');
  const ctx = vm.createContext({});
  vm.runInContext(fs.readFileSync(new URL('../js/art/iso.js', import.meta.url), 'utf8') + ';this.X = { ISO, isoPt, FARM_ZONES, FARM_HORIZON_Y, BANANA_SPOTS };', ctx);
  const { isoPt, FARM_ZONES, FARM_HORIZON_Y, BANANA_SPOTS } = ctx.X;
  const inside = ([x0, y0, x1, y1], gx, gy) => gx > x0 && gx < x1 && gy > y0 && gy < y1;
  for (const [gx, gy, v] of BANANA_SPOTS) {
    for (const [zone, rect] of Object.entries(FARM_ZONES)) assert.ok(!inside(rect, gx, gy), `${v} stands in the ${zone}`);
    const [x, y] = isoPt(gx, gy);
    assert.ok(y > FARM_HORIZON_Y && y < 532 && x > 0 && x < 800, `${v} base is off the visible ground (${x}, ${y})`);
  }
  for (let i = 0; i < BANANA_SPOTS.length; i++) for (let j = i + 1; j < BANANA_SPOTS.length; j++) {
    const [a, b] = [BANANA_SPOTS[i], BANANA_SPOTS[j]];
    assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1]) >= 1.5, `${a[2]} and ${b[2]} are too close`);
  }
});
