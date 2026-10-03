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

test('painted-art tasks: output paths follow the game, sizes are canvas × scale, layout images exist', async () => {
  const vm = await import('node:vm');
  const { paintedPath, imageInfo } = await import('../tools/check-assets.mjs');
  const ctx = vm.createContext({});
  vm.runInContext(fs.readFileSync(new URL('../js/logic/config.js', import.meta.url), 'utf8') +
    fs.readFileSync(new URL('../js/art/assets.js', import.meta.url), 'utf8') + ';this.paintedPath = paintedPath; this.SPECS = ASSET_SPECS;', ctx);
  const { manifest } = checkManifest();
  for (const a of manifest.assets) {
    if (a.scale) continue;                     // painted-first assets (scene kits) are their own paint task
    if (!a.paint) { assert.ok(!ctx.SPECS[a.id], `${a.id} is used by the game but has no paint task`); continue; }
    assert.equal(a.paint.output, ctx.paintedPath(a.output), a.id);
    assert.equal(a.paint.output, paintedPath(a.output), a.id);
    assert.deepEqual(a.paint.size, a.canvas.map(v => v * a.paint.scale), a.id);
    const buf = fs.readFileSync(new URL('../' + a.paint.layout, import.meta.url));
    if (a.paint.layout.endsWith('.png')) assert.deepEqual([imageInfo(buf).w, imageInfo(buf).h], a.paint.size, a.paint.layout);
  }
});

test('duck pen kit: every piece is a known asset, stands on the stage and keeps the pen props clear', async () => {
  const vm = await import('node:vm');
  const ctx = vm.createContext({});
  vm.runInContext(fs.readFileSync(new URL('../js/logic/config.js', import.meta.url), 'utf8') + fs.readFileSync(new URL('../js/art/assets.js', import.meta.url), 'utf8') +
    fs.readFileSync(new URL('../js/art/iso.js', import.meta.url), 'utf8') + ';this.X = { penPt, PEN_LAYOUT, penFenceSprites, SPECS: ASSET_SPECS };', ctx);
  const { penPt, PEN_LAYOUT, penFenceSprites, SPECS } = ctx.X;
  const { manifest } = checkManifest();
  const byId = Object.fromEntries(manifest.assets.map(a => [a.id, a]));
  const keepClear = { nest: [380, 296, 520, 390], trough: [370, 452, 520, 500], basket: [610, 420, 690, 494], uncleMee: [10, 110, 200, 330] };
  const placed = PEN_LAYOUT.back.concat(PEN_LAYOUT.pen).map(([id, u, v]) => [id, u, v]).concat(penFenceSprites().map(([id, u, v]) => [id, u, v]));
  assert.ok(byId['ground.pen'] && SPECS['ground.pen'], 'ground.pen');
  for (const [id, u, v] of placed) {
    assert.ok(byId[id], `${id} is not in the manifest`);
    assert.ok(SPECS[id], `${id} is not in ASSET_SPECS`);
    const [x, y] = penPt(u, v);
    assert.ok(x > -300 && x < 1100 && y > 46 && y < 600, `${id} at (${u}, ${v}) is off the stage (${x}, ${y})`);
    for (const [name, [x0, y0, x1, y1]] of Object.entries(keepClear))
      assert.ok(!(x > x0 && x < x1 && y > y0 && y < y1), `${id} at (${u}, ${v}) stands on the ${name}`);
  }
  for (const a of manifest.assets.filter(a => a.category === 'kit')) {
    assert.ok(a.footprint && a.height_px && a.normal && a.layout && a.scale, a.id);
    assert.ok(fs.existsSync(new URL('../' + a.layout, import.meta.url)), `${a.layout} (run node tools/export-kit-guides.mjs)`);
  }
});

test('art style v3: the checker palette matches paint_style.palette in the manifest', async () => {
  const { FLAT_PALETTE } = await import('../tools/check-assets.mjs');
  const { manifest } = checkManifest();
  const pal = manifest.paint_style.palette, fromManifest = new Set(Object.entries(pal).flatMap(([k, v]) => k === 'line' ? Object.values(v) : v));
  assert.deepEqual([...fromManifest].sort(), [...FLAT_PALETTE].sort());
  for (const a of manifest.assets.filter(a => a.style === 'flat-v3')) assert.ok(a.output.endsWith('.svg') && a.tags && a.tags.length, a.id);
});

test('style anchors: candidates until approved; once locked, their files never change', async () => {
  const crypto = await import('node:crypto');
  const { manifest } = checkManifest();
  const sa = manifest.paint_style.style_anchors, byId = Object.fromEntries(manifest.assets.map(a => [a.id, a]));
  assert.ok(sa && sa.ids.length, 'paint_style.style_anchors');
  for (const id of sa.ids) assert.ok(byId[id] && byId[id].category === 'kit', id);
  const tpl = manifest.paint_style.prompt_template;
  assert.ok(tpl['1_style_references'] && tpl['2_geometry_reference'], 'prompt template keeps style and geometry references apart');
  if (!sa.locked) return;
  for (const id of sa.ids) {
    const f = sa.files[id], a = byId[id];
    assert.equal(a.status, 'approved', `${id}: a locked anchor must stay approved`);
    assert.equal(a.file, f.svg, `${id}: a locked anchor's file must not be replaced`);
    const sha = crypto.createHash('sha256').update(fs.readFileSync(new URL('../' + f.svg, import.meta.url))).digest('hex');
    assert.equal(sha, f.sha256, `${id}: locked anchor changed (re-lock needs the owner's approval)`);
  }
});

test('farm kit: every placed piece is a known asset, stays off the fields, path and UI, and the pen layout is unchanged by the shared builder', async () => {
  const vm = await import('node:vm');
  const ctx = vm.createContext({});
  vm.runInContext(fs.readFileSync(new URL('../js/logic/config.js', import.meta.url), 'utf8') + fs.readFileSync(new URL('../js/art/assets.js', import.meta.url), 'utf8') +
    fs.readFileSync(new URL('../js/art/iso.js', import.meta.url), 'utf8') + ';this.X = { isoPt, FARM_BUILD, FARM_RECIPE, FARM_ZONES, FARM_FENCES, FARM_CLEARING, FARM_FOREST_SPRITES, fenceSprites, SPECS: ASSET_SPECS };', ctx);
  const { isoPt, FARM_BUILD, FARM_RECIPE, FARM_ZONES, FARM_FENCES, FARM_CLEARING, FARM_FOREST_SPRITES, fenceSprites, SPECS } = ctx.X;
  const { manifest } = checkManifest();
  const ids = new Set(manifest.assets.map(a => a.id));
  assert.ok(ids.has('ground.farm') && SPECS['ground.farm']);
  const placed = FARM_BUILD.pieces.concat(FARM_RECIPE.landmarks).concat(fenceSprites(FARM_FENCES));
  assert.ok(FARM_BUILD.pieces.length >= 20, 'the farm builder places its scatter');
  assert.ok(FARM_FOREST_SPRITES.length >= 60, 'the forest border is planted');
  for (const [id, u, v] of FARM_FOREST_SPRITES) {
    assert.ok(ids.has(id) && SPECS[id], `${id} is not a known asset`);
    assert.ok(!(u > FARM_CLEARING[0] && v > FARM_CLEARING[1]), `forest ${id} at (${u}, ${v}) stands inside the clearing`);
  }
  for (const [id, u, v] of FARM_BUILD.pieces) assert.ok(u > FARM_CLEARING[0] && v > FARM_CLEARING[1], `${id} at (${u}, ${v}) is scattered beyond the border`);
  const inside = ([a, b, c, d], u, v) => u > a && u < c && v > b && v < d;
  for (const [id, u, v] of placed) {
    assert.ok(ids.has(id) && SPECS[id], `${id} is not a known asset`);
    const [x, y] = isoPt(u, v);
    assert.ok(x > -300 && x < 1100 && y > 46 && y < 600, `${id} off the stage`);
    if (id.startsWith('kit.fence')) continue;
    assert.ok(!inside(FARM_ZONES.yard, u, v), `${id} stands on the yard`);
    for (const [a, b, c, d] of FARM_RECIPE.keepClear) assert.ok(!(x > a && x < c && y > b && y < d), `${id} at (${u}, ${v}) covers the UI or a prop`);
  }
});

test('grass ground cover: tufts only on open grass (never on the yard, fields, paths, water or pen floor) and every tuft has a green and a dry asset', async () => {
  const vm = await import('node:vm');
  const ctx = vm.createContext({});
  vm.runInContext(fs.readFileSync(new URL('../js/logic/config.js', import.meta.url), 'utf8') + fs.readFileSync(new URL('../js/art/assets.js', import.meta.url), 'utf8') +
    fs.readFileSync(new URL('../js/art/iso.js', import.meta.url), 'utf8') + ';this.X = { isoPt, penPt, FARM_GRASS, PEN_GRASS, FARM_RECIPE, PEN_RECIPE, SPECS: ASSET_SPECS };', ctx);
  const { isoPt, penPt, FARM_GRASS, PEN_GRASS, FARM_RECIPE, PEN_RECIPE, SPECS } = ctx.X;
  const { manifest } = checkManifest();
  const byId = Object.fromEntries(manifest.assets.map(a => [a.id, a]));
  assert.ok(FARM_GRASS.length > 300 && PEN_GRASS.length > 300, 'grass is placed');
  for (const [id, u, v] of FARM_GRASS) {
    const [x, y] = isoPt(u, v);
    assert.ok(!FARM_RECIPE.blocked(u, v, x, y, 'grass') && FARM_RECIPE.water(x, y) >= 1, `farm tuft on blocked ground at (${u}, ${v})`);
  }
  for (const [id, u, v] of PEN_GRASS) { const [x, y] = penPt(u, v); assert.ok(!PEN_RECIPE.blocked(u, v) && PEN_RECIPE.water(x, y) >= 1, `pen tuft on the floor or water at (${u}, ${v})`); }
  for (const id of new Set(FARM_GRASS.concat(PEN_GRASS).map(p => p[0]))) for (const v of [id, id + '_dry']) {
    assert.ok(SPECS[v] && byId[v], `${v} missing`);
    assert.ok(byId[v].tags.includes('groundcover'), `${v} must be tagged groundcover`);
  }
});

test('rice paddies: clumps in rows inside the fields, never on the mound, dikes or near the hut and scarecrow', async () => {
  const vm = await import('node:vm');
  const ctx = vm.createContext({});
  vm.runInContext(fs.readFileSync(new URL('../js/logic/config.js', import.meta.url), 'utf8') + fs.readFileSync(new URL('../js/art/assets.js', import.meta.url), 'utf8') +
    fs.readFileSync(new URL('../js/art/iso.js', import.meta.url), 'utf8') + ';this.X = { FARM_RICE, FARM_PADDIES, FARM_MOUNDS, FARM_RECIPE, FARM_GRASS, FARM_ZONES, FARM_BUILD, SPECS: ASSET_SPECS };', ctx);
  const { FARM_RICE, FARM_PADDIES, FARM_MOUNDS, FARM_RECIPE, FARM_GRASS, FARM_ZONES, FARM_BUILD, SPECS } = ctx.X;
  // standing pieces keep their bodies clear of the canal and the paddies (egrets wade in them; the mound is dry land)
  for (const [id, u, v] of FARM_BUILD.pieces) if (id !== 'kit.egret' && u > -6.2 && v > -6.5)
    assert.ok(u >= FARM_ZONES.canal[2] + .9 || u < FARM_ZONES.paddies[0] || (FARM_MOUNDS.some(([mu, mv, ru, rv]) => Math.hypot((u - mu) / ru, (v - mv) / rv) <= .85)), `${id} at (${u}, ${v}) hangs over the canal or a paddy`);
  // the grass stays out of the paddies (the mound is grass) and the canal, along their whole length
  const onMound = (u, v) => FARM_MOUNDS.some(([mu, mv, ru, rv]) => Math.hypot((u - mu) / ru, (v - mv) / rv) <= 1);
  for (const [, u, v] of FARM_GRASS) {
    assert.ok(onMound(u, v) || !FARM_PADDIES.fields.some(([a, b, c, d]) => u >= a - .1 && u <= c + .1 && v >= b && v <= d), `grass in a paddy at (${u}, ${v})`);
    const [c0, , c1] = FARM_ZONES.canal; assert.ok(u <= c0 || u >= c1, `grass in the canal at (${u}, ${v})`);
  }
  for (const [, , , , gy1] of FARM_PADDIES.fields.map(f => [0, ...f])) assert.ok(gy1 <= FARM_ZONES.paddies[3] && gy1 <= FARM_ZONES.canal[3], 'FARM_ZONES.paddies/canal must cover every field');
  const { manifest } = checkManifest();
  const byId = Object.fromEntries(manifest.assets.map(a => [a.id, a]));
  assert.ok(FARM_RICE.length > 200, 'rice is planted');
  for (const [id, u, v] of FARM_RICE) {
    const f = FARM_PADDIES.fields.find(([a, b, c, d]) => u >= a && u <= c && v >= b && v <= d);
    assert.ok(f, `rice outside the paddies at (${u}, ${v})`);
    assert.ok(id.includes(f[4]), `${id} planted in a ${f[4]} field`);
    const edge = Math.min(u - f[0], f[2] - u, v - f[1], f[3] - v);
    assert.ok(edge > FARM_PADDIES.dike / 2 + .05, `rice on a dike at (${u}, ${v})`);
    for (const [mu, mv, ru, rv] of FARM_MOUNDS) assert.ok(Math.hypot((u - mu) / ru, (v - mv) / rv) > 1, `rice on the mound at (${u}, ${v})`);
    for (const [, lu, lv] of FARM_RECIPE.landmarks) assert.ok(Math.hypot(u - lu, v - lv) >= .7, `rice under a landmark at (${u}, ${v})`);
  }
  for (const id of new Set(FARM_RICE.map(p => p[0]))) {
    assert.ok(SPECS[id] && byId[id], `${id} missing`);
    assert.ok(byId[id].tags.includes('groundcover'), `${id} must be tagged groundcover`);
  }
});
