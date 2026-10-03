#!/usr/bin/env node
// Builds the Unity hand-off package in unity-handoff/ from the running game (so it matches what the game draws):
//   Sprites/<category>/<id>.png      every asset the game uses, rasterised at 2× game size (PPU 200 = 100 game px/unit)
//   Sprites/<category>/<id>_n.png    its normal map (OpenGL convention), same size, when it has one
//   sprites.json                      per sprite: file, normal, size, pivot (Unity, bottom-left origin), game scale, tags
//   Scenes/<scene>.json               every placed sprite as drawn (asset id, anchor position, scale, flip, draw order)
//                                     plus the scene's layout data (grid, recipes, spots)
//   Scenes/<scene>_reference.png      the scene as the web game draws it (1400×600, the 800×600 safe area at x 300)
//   Scenes/<scene>_codedrawn.png      only the parts the web game draws in code (yard blocks, forest floor…), 2×
//   Data/config.json, Data/daylight.json, Data/size_chart.json
//   node tools/export-unity.mjs        (needs Playwright + Chromium). Re-run whenever new art is approved.
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'unity-handoff');
async function loadPlaywright() {
  try { return await import('playwright'); } catch (e) { /* fall back to a global install */ }
  return createRequire(path.join(execSync('npm root -g').toString().trim(), 'noop.js'))('playwright');
}
const { chromium } = await loadPlaywright();
const K = 2;                                                     // export scale: sprites at 2× game px
const write = (rel, data) => { const f = path.join(OUT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, data); };
const json = (rel, obj) => write(rel, JSON.stringify(obj, null, 1) + '\n');
const png = (rel, url) => write(rel, Buffer.from(url.split(',')[1], 'base64'));

const server = await new Promise(done => {
  const s = createServer((req, res) => {
    const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    const type = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp' }[path.extname(f)] || 'application/octet-stream';
    res.writeHead(200, { 'content-type': type }); fs.createReadStream(f).pipe(res);
  }).listen(0, () => done(s));
});
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 600 } });
await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
await page.goto(`http://localhost:${server.address().port}/index.html?light=0`);
await page.waitForFunction(() => typeof Assets !== 'undefined' && Object.keys(Assets.found).length > 0);
await page.evaluate(() => { save = () => {}; S = newGame(() => .99); S.ducks = 5; S.eggs = 4; S.trough = 2; closeModal(); });
fs.rmSync(OUT, { recursive: true, force: true });

// ---- sprites
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/manifest.json'), 'utf8'));
const byId = Object.fromEntries(manifest.assets.map(a => [a.id, a]));
const found = await page.evaluate(() => Object.entries(Assets.found).map(([id, file]) => ({ id, file, normal: Assets.normal[file] || null, sp: ASSET_SPECS[id], scale: gameScale(id) })));
const sprites = {};
for (const { id, file, normal, sp, scale } of found) {
  const a = byId[id] || {}, cat = a.category || id.split('.')[0], base = `Sprites/${cat}/${id}`;
  const out = await page.evaluate(async ({ file, normal, w, h, K, flatNormal }) => {
    const load = src => new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = src; });
    const draw = async (src, flat) => {
      const c = document.createElement('canvas'); c.width = Math.round(w * K); c.height = Math.round(h * K);
      const g = c.getContext('2d'); g.drawImage(await load(src), 0, 0, c.width, c.height);
      return c.toDataURL('image/png');
    };
    return { art: await draw(file), normal: normal ? await draw(normal) : null };
  }, { file, normal, w: sp.w, h: sp.h, K });
  png(`${base}.png`, out.art);
  if (out.normal) png(`${base}_n.png`, out.normal);
  sprites[id] = {
    file: `${base}.png`, normal: out.normal ? `${base}_n.png` : null, category: cat, style: a.style || (a.restyle_v3 && a.restyle_v3.file === file ? 'flat-v3' : 'legacy'),
    status: a.restyle_v3 && a.restyle_v3.file === file ? a.restyle_v3.status : a.status,
    sizePx: [Math.round(sp.w * K), Math.round(sp.h * K)], gamePx: [sp.w, sp.h], anchorGamePx: [sp.ax, sp.ay],
    pivot: [+(sp.ax / sp.w).toFixed(4), +(1 - sp.ay / sp.h).toFixed(4)],            // Unity sprite pivot (0,0 = bottom-left)
    gameScale: +scale.toFixed(4), footprint: a.footprint || null, heightPx: a.height_px || null, tags: a.tags || [],
  };
}
json('sprites.json', { about: 'Every sprite the web game uses. PNGs are 2× game size: import with Pixels Per Unit = 200 (1 Unity unit = 100 game px), Filter Mode Bilinear, Compression Normal or High Quality, Generate Mip Maps off, pivot = Custom with the `pivot` below (the ground point the sprite stands on). Scale each instance by `gameScale` × the placement scale. Normal maps: Texture Type Normal map is NOT used by the 2D renderer; add them as the sprite\'s Secondary Texture named _NormalMap.', ppu: 100 * K, sprites });
console.log(`${Object.keys(sprites).length} sprites`);

// ---- scenes: exact placements as drawn, plus layout data
const hrefToId = Object.fromEntries(found.map(f => [f.file, f.id]));
for (const scene of ['farm', 'pen', 'market', 'map']) {
  await page.evaluate(sc => { S.scene = sc; ui.bgScene = null; cam.z = 1; render(); }, scene);
  await page.waitForTimeout(3500);                                // let the grass bake and images settle
  const placed = await page.evaluate(hrefToId => {
    const out = [];
    for (const [layer, svg] of [['background', bgEl], ['dynamic', dynEl]]) {
      const inv = svg.getScreenCTM().inverse();
      svg.querySelectorAll('image').forEach(el => {
        const href = el.getAttribute('href'), id = hrefToId[href];
        const m = inv.multiply(el.getScreenCTM()), sp = id && ASSET_SPECS[id];
        const x = +el.getAttribute('x') || 0, y = +el.getAttribute('y') || 0, w = +el.getAttribute('width'), h = +el.getAttribute('height');
        const ax = sp ? x + sp.ax * w / sp.w : x, ay = sp ? y + sp.ay * h / sp.h : y + h;      // the anchor in the image's own space
        const px = m.a * ax + m.c * ay + m.e, py = m.b * ax + m.d * ay + m.f;
        const sx = Math.hypot(m.a, m.b) * w / (sp ? sp.w : w), sy = Math.hypot(m.c, m.d) * h / (sp ? sp.h : h);
        out.push({ layer, order: out.length, id: id || (href.startsWith('data:') ? 'baked:grass' : href), x: +px.toFixed(2), y: +py.toFixed(2),
          scale: [+sx.toFixed(4), +sy.toFixed(4)], flipX: m.a * m.d - m.b * m.c < 0, cls: el.closest('[class]') ? el.closest('[class]').getAttribute('class') : null });
      });
    }
    return out;
  }, hrefToId);
  const data = await page.evaluate(sc => {
    const pick = o => JSON.parse(JSON.stringify(o));
    if (sc === 'farm') return pick({ grid: { origin: [ISO.OX, ISO.OY], tile: [ISO.TW, ISO.TH], formula: 'x = 290 + (gx - gy)*32, y = 226 + (gx + gy)*16 - z' }, ISO, FARM_ZONES, FARM_HOUSE, FARM_SHRINE, FARM_MOUNDS, FARM_CLEARING, FARM_FENCES, FARM_PATH, FARM_POND, FARM_SPOTS, FARM_SCALE: { ...FARM_SCALE, farmer: FARM_SCALE.farmer }, BANANA_SPOTS, PALM_SPOTS, FARM_PADDIES,
      plots: [0, 1, 2, 3].flatMap(fi => Array.from({ length: 12 }, (_, pi) => { const [gx, gy] = fieldCell(fi, pi); return { field: fi, plot: pi, gx, gy, centre: isoPt(gx + .5, gy + .5) }; })),
      pieces: FARM_BUILD.pieces, landmarks: FARM_RECIPE.landmarks, forest: FARM_FOREST_SPRITES, grass: FARM_GRASS, rice: FARM_RICE, fenceSprites: fenceSprites(FARM_FENCES), lamps: sceneLamps('farm') });
    if (sc === 'pen') return pick({ grid: { formula: 'x = 520 + (u - v)*32, y = 200 + (u + v)*16 - z' }, PEN_FENCES, PEN_LAYOUT, NEST, TROUGH, DUCK_SPOTS, grass: PEN_GRASS, fenceSprites: penFenceSprites(), lamps: sceneLamps('pen') });
    if (sc === 'market') return pick({ grid: { formula: 'x = 400 + (u - v)*32, y = 150 + (u + v)*16 - z' }, MARKET, landmarks: MARKET_RECIPE.landmarks, pieces: MARKET_BUILD.pieces, keepClear: MARKET_RECIPE.keepClear, grass: MARKET_GRASS, kitActiveInWebGame: marketKitActive() });
    return pick({ grid: { formula: 'x = 400 + (u - v)*32, y = 70 + (u + v)*16 - z' }, VILLAGE, VILLAGE_PLACES, VILLAGE_FENCES, landmarks: VILLAGE_RECIPE.landmarks, pieces: VILLAGE_BUILD.pieces, fenceSprites: fenceSprites(VILLAGE_FENCES, 'kit.map_fence'), kitActiveInWebGame: villageKitActive() });
  }, scene);
  const name = scene === 'map' ? 'village' : scene;
  json(`Scenes/${name}.json`, { about: 'Coordinates are web-game scene px: x right, y DOWN, the 800×600 safe area spans x 0..800 (bleed to -300 and 1100). In Unity: position = (x / 100, -y / 100). `placed` is every sprite exactly as the web game draws it, in draw order (back to front) — anchor point, scale (already includes the size chart), flip. `layout` is the data the web game builds the scene from (grid coordinates), to rebuild or edit it in Unity.', placed, layout: data });
  png(`Scenes/${name}_reference.png`, 'data:image/png;base64,' + (await page.screenshot()).toString('base64'));
  const code = await page.evaluate(async K => {
    const svg = bgEl.cloneNode(true); svg.querySelectorAll('image').forEach(e => e.remove());
    svg.setAttribute('viewBox', '-300 0 1400 600'); svg.setAttribute('width', 1400 * K); svg.setAttribute('height', 600 * K);
    const fontless = new XMLSerializer().serializeToString(svg);
    const img = await new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(fontless); });
    const c = document.createElement('canvas'); c.width = 1400 * K; c.height = 600 * K; c.getContext('2d').drawImage(img, 0, 0); return c.toDataURL('image/png');
  }, K);
  png(`Scenes/${name}_codedrawn.png`, code);
  console.log(`${name}: ${placed.length} placed sprites`);
}

// ---- rules and look
json('Data/config.json', await page.evaluate(() => JSON.parse(JSON.stringify(CONFIG))));
json('Data/daylight.json', await page.evaluate(() => ({
  about: 'js/art/daylight.js: the clock follows energy (06:00 at full energy, 21:00 when it runs out). `tint` multiplies the scene, `sun` is the light direction in screen space (+y up, +z toward the viewer), `shadow.skew/squash` lay each sprite\'s silhouette on the ground (per px of height: skew px sideways, squash px back up the screen).',
  DAY, DAY_TINT, hours: Array.from({ length: 33 }, (_, i) => daylight(5 + i * .5)),
})));
json('Data/size_chart.json', await page.evaluate(() => ({ SIZE_CHART, gameScale: Object.fromEntries(Object.keys(ASSET_SPECS).map(id => [id, +gameScale(id).toFixed(4)])) })));
await browser.close();
server.close();
console.log('unity-handoff/ written');
