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
