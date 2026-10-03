/* Isometric (2:1) geometry for the farm scene. The farm background asset is painted to these exact
   numbers (see bg.farm in assets/manifest.json), so change them together. */
'use strict';

const ISO = {
  TW: 64, TH: 32,           // diamond tile size
  OX: 290, OY: 226,         // screen position of grid point (0,0)
  TILE_DEPTH: 7,            // height of a soil block
  YARD: [-0.8, -0.8, 9.8, 7.8], YARD_DEPTH: 12,   // raised dirt yard under the fields [gx0, gy0, gx1, gy1]
  RIM: 0.25, RIM_DEPTH: 6,  // grass bund around each field
  PADDOCK: [8, -5, 12.6, -2],                     // buffalo paddock behind the right corner of the yard
};

// Grid point (gx, gy) at height z (px) -> screen [x, y].
function isoPt(gx, gy, z = 0) {
  return [ISO.OX + (gx - gy) * ISO.TW / 2, ISO.OY + (gx + gy) * ISO.TH / 2 - z];
}

// Fields are 4×3 plots laid out 2×2 with a one-tile path between them.
function fieldOrigin(fi) { return [(fi % 2) * 5, (fi >> 1) * 4]; }
function fieldCell(fi, pi) { const [gx, gy] = fieldOrigin(fi); return [gx + pi % 4, gy + Math.floor(pi / 4)]; }

const isoPoints = pts => pts.map(p => p.map(n => Math.round(n * 10) / 10).join(',')).join(' ');

// A raised block over grid rect [gx0,gx1]×[gy0,gy1]: the two visible sides, then the top face.
function isoBlock(gx0, gy0, gx1, gy1, depth, top, left, right, topAttrs = '') {
  const a = isoPt(gx0, gy0), b = isoPt(gx1, gy0), c = isoPt(gx1, gy1), d = isoPt(gx0, gy1);
  const dn = p => [p[0], p[1] + depth];
  const face = (pts, fill, extra = '') => `<polygon points="${isoPoints(pts)}" fill="${fill}" ${SW} stroke-width="2"${extra}/>`;
  return face([d, c, dn(c), dn(d)], left) + face([c, b, dn(b), dn(c)], right) + face([a, b, c, d], top, ' ' + topAttrs);
}

// Yard and field bunds: static ground under the plots (also painted into the bg.farm asset).
function isoFarmGround() {
  const [x0, y0, x1, y1] = ISO.YARD;
  let s = isoBlock(x0, y0, x1, y1, ISO.YARD_DEPTH, '#d6b277', '#b08a50', '#c29a5e');
  for (let fi = 0; fi < 4; fi++) {
    const [gx, gy] = fieldOrigin(fi), m = ISO.RIM;
    s += isoBlock(gx - m, gy - m, gx + 4 + m, gy + 3 + m, ISO.RIM_DEPTH, '#8fb04a', '#6f8f3a', '#7ea042');
  }
  return s;
}

// One soil plot as a raised block. Uses the tile assets when present.
function isoSoil(gx, gy, wet, fertilized) {
  const [cx, cy] = isoPt(gx + .5, gy + .5);
  const tile = wet ? 'tile.soil_wet' : 'tile.soil_dry';
  // the top face is also the click/hover target (.soil)
  const hit = `<polygon class="soil" points="${isoPoints([isoPt(gx + .06, gy + .06), isoPt(gx + .94, gy + .06), isoPt(gx + .94, gy + .94), isoPt(gx + .06, gy + .94)])}" fill="none" stroke="none"/>`;
  let s;
  if (Assets.has(tile)) {
    s = Assets.image(tile, cx, cy) + hit;
  } else {
    s = isoBlock(gx + .06, gy + .06, gx + .94, gy + .94, ISO.TILE_DEPTH, wet ? '#7a4e2e' : '#b7824f', wet ? '#5a3820' : '#8f6038', wet ? '#6b4426' : '#a5733f', 'class="soil"');
    const f = [isoPt(gx + .2, gy + .35), isoPt(gx + .8, gy + .35), isoPt(gx + .2, gy + .65), isoPt(gx + .8, gy + .65)];
    s += `<path d="M${f[0]}L${f[1]}M${f[2]}L${f[3]}" stroke="${wet ? '#5e3a20' : '#9c6a3c'}" stroke-width="2" stroke-linecap="round" pointer-events="none"/>`;
  }
  if (fertilized) {
    if (Assets.has('tile.fertilized')) s += Assets.image('tile.fertilized', cx, cy);
    else s += [[.3, .2], [.75, .3], [.25, .8], [.7, .78], [.5, .5]].map(([u, v]) => {
      const [x, y] = isoPt(gx + u, gy + v);
      return `<circle cx="${r(x)}" cy="${r(y)}" r="1.8" fill="#f4f0e0" stroke="${O}" stroke-width=".6" pointer-events="none"/>`;
    }).join('');
  }
  return s;
}

// Rustic paddock fence from grid point a to b: square timber posts with pointed caps every `step` tiles, two
// round bamboo rails with node rings and a highlight, lashed to each post with rope. Matches the painted back
// fences in bg.farm (the generator draws them the same way).
function isoFence(a, b, step = .6, pt = isoPt) {
  const n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
  const g = t => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const at = (t, z) => pt(...g(t), z);
  const poly = (pts, fill, w = 1.6) => `<polygon points="${isoPoints(pts)}" fill="${fill}" ${SW} stroke-width="${w}"/>`;
  const H = 30, W = .055;
  let posts = '';
  for (let i = 0; i <= n; i++) {
    const [x, y] = g(i / n), P = (dx, dy, z) => pt(x + dx, y + dy, z), apex = P(0, 0, H + 6);
    posts += poly([P(-W, W, 0), P(W, W, 0), P(W, W, H), P(-W, W, H)], '#8a5a30') +
      poly([P(W, W, 0), P(W, -W, 0), P(W, -W, H), P(W, W, H)], '#a8703e') +
      poly([P(-W, W, H), P(W, W, H), apex], '#b87a44', 1.3) + poly([P(W, W, H), P(W, -W, H), apex], '#d09258', 1.3);
    const [gx0, gy0] = P(W, 0, 4), [gx1, gy1] = P(W, 0, H - 6);
    posts += `<path d="M${r(gx0)} ${r(gy0)}L${r(gx1)} ${r(gy1)}" stroke="#7a4a26" stroke-width="1"/>`;   // wood grain
  }
  let rails = '', nodes = '', ties = '';
  for (const z of [11, 23]) {
    const [x0, y0] = at(0, z), [x1, y1] = at(1, z);
    rails += `M${r(x0)} ${r(y0)}L${r(x1)} ${r(y1)}`;
    const k = Math.max(2, Math.round(n * 2.4));
    for (let j = 1; j < k; j++) { const [x, y] = at(j / k, z); nodes += `M${r(x)} ${r(y - 2.2)}v4.4`; }
    for (let i = 0; i <= n; i++) { const [x, y] = at(i / n, z); ties += `M${r(x - 2.6)} ${r(y - 2.4)}l5.2 4.8M${r(x + 2.6)} ${r(y - 2.4)}l-5.2 4.8`; }
  }
  const hi = rails.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (m, x, y) => `${x} ${r(+y - 1.1)}`);
  return posts + `<path d="${rails}" fill="none" stroke="${O}" stroke-width="6.6" stroke-linecap="round"/>` +
    `<path d="${rails}" fill="none" stroke="#c8ae62" stroke-width="4.2" stroke-linecap="round"/>` +
    `<path d="${hi}" fill="none" stroke="#eadba0" stroke-width="1.2" stroke-linecap="round"/>` +
    `<path d="${nodes}" stroke="#8f7a3a" stroke-width="1.3"/>` +
    `<path d="${ties}" stroke="${O}" stroke-width="2.6" stroke-linecap="round"/><path d="${ties}" stroke="#e0c98a" stroke-width="1.3" stroke-linecap="round"/>`;
}

// Ground the farm background already uses; sprites must not stand here ([gx0, gy0, gx1, gy1] grid rects).
const FARM_ZONES = {
  yard: [-0.8, -0.8, 9.8, 7.8],      // dirt yard and fields
  canal: [-2.75, -8, -2.15, 11],     // irrigation canal and its muddy banks
  paddies: [-9.8, -9, -2.7, 11],     // flooded rice fields: trees only on a FARM_MOUNDS island
  paddock: [8, -5, 12.6, -2],        // buffalo paddock
  house: [2.3, -4.9, 6.4, -1.4],     // Thai house footprint under its eaves (FARM_HOUSE)
  stairs: [4.2, -1.4, 5.0, -0.8],    // the house's stair down to the yard
  shrine: [0.7, -2.1, 1.7, -1.1],    // Phra Phum shrine and its offerings (FARM_SHRINE)
};
// Drawn scale of farm objects whose assets are made larger than life. Scenery (house, trees, huts) is at about
// 20 px per metre. The farmer, dragon jar and buffalo are the farm's characters and get a stylised game size
// (about 2x life: farmer ~67 px, jar ~55 px, spirit house ~110 px); the cart stays near life size. Crops and the text
// signs keep their gameplay sizes.
const FARM_SCALE = { shrine: .7, buffalo: .75, jar: .6, cart: .6, get farmer() { return gameScale('character.farmer'); } };   // farmer: the size chart (js/art/assets.js)
// The Thai house sprite's anchor (ground at its back corner) and its depth for sorting (grid gx + gy of its middle).
const FARM_HOUSE = { at: [2.4, -4.8], depth: 1.0 };
// The Phra Phum spirit house stands here (grid point), inside FARM_ZONES.shrine.
const FARM_SHRINE = [1.2, -1.6];
// Raised grassy islands (โคก) in the paddies where trees may stand: [gx, gy, rgx, rgy] centre and radii.
const FARM_MOUNDS = [[-4.4, 0.2, 1.5, 2.6]];
// The farm is a clearing: forest beyond grid lines gx = -6.2 and gy = -6.5.
const FARM_CLEARING = [-6.2, -6.5];

// Banana clumps on the farm: [gx, gy, variant, scale] (3-4 m tall at the scenery scale). Each spot uses a different variant and stands on
// open ground or a mound (both checked by tests/assets.test.mjs).
const BANANA_SPOTS = [
  [-1.55, -0.4, 'fruiting', .8],   // grass bank between the canal and the yard
  [-1.6, -2.4, 'old', .8],         // canal bank, behind the yard's top corner
  [3.3, -1.0, 'young', .75],       // in front of the house's left wing, beside the stair
  [-3.7, 1.0, 'harvested', .75],   // on the paddy mound
  [6.9, -0.95, 'ripe', .78],       // open grass between the house and the paddock
];

// Palms on the farm: [gx, gy, variant, scale]. Same rules as the bananas: a different variant per spot,
// open ground or a mound, at least 1.5 tiles from every other plant sprite (tests/assets.test.mjs).
const PALM_SPOTS = [
  // palms are 5-10 m (taller than the house), so the tall ones stand low on screen where their crowns clear the HUD
  [-5.0, 1.9, 'coconut_dwarf', 1],          // on the paddy mound
  [-1.55, 3.8, 'coconut_lean', 1],          // canal bank, leaning out over the water
  [-1.55, 5.8, 'coconut_twin', 1],          // canal bank
  [-1.6, 7.9, 'sugar_tall', 1.04],          // canal bank, at the left edge of the safe area
  [-1.6, 9.9, 'sugar_ladder', 1],           // canal bank, in the left bleed: a tapping palm with its bamboo ladder
  [-1.6, 12.0, 'sugar_pair', 1],            // canal bank, far down in the left bleed
  [12.0, -5.8, 'betel_cluster', .95],       // beyond the paddock's back fence, in the right bleed (keeps the house corner open)
];

// Where the farm props stand, on open ground around the yard ([x, y] screen points).
const FARM_SPOTS = {
  cart: [84, 491],        // oxCart(x, y): x = rear of the code-drawn cart; its asset is anchored at (x + 66, y + 1)
  cartSign: [34, 452],     // top-left of the "ขายผลผลิต" sign next to the cart
  jar: [584, 392],        // dragonJar(x, top)
  farmer: [652, 474],     // farmer(x, feetY)
  buffalo: [722, 334],    // buffalo(x, y): ground point inside the paddock, behind its front fence
};

// ---- Duck pen scene kit (pilot): the pen is assembled from a painted ground plus small reusable pieces.
// The pen's own grid: the floor is u, v in 0..12.5 with its top corner at (520, 200).
const penPt = (u, v, z = 0) => [520 + (u - v) * 32, 200 + (u + v) * 16 - z];

// Fence runs [from, to], each along +u (down-right) or +v (down-left). The duck house is built into the u = 0 line.
const PEN_FENCES = [[[0, 0], [12.5, 0]], [[0, 0], [0, 2.2]], [[0, 5], [0, 12.5]], [[12.5, 0], [12.5, 3.5]]];

// ---- Scene builder (docs/map-design-guide.md, sections 3-4). A recipe says what may go where; a seeded builder
// places the filler by the rules, so a new seed gives a new arrangement of the same kit. Landmarks stay hand-placed.
function mulberry32(a) {
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

// A scene recipe for buildScene():
//   range [u0, u1, v0, v1]   grid area to sample;  maxY: lowest base point on screen
//   blocked(u, v, x, y, id)  ground nothing may stand on (floors, fields, paths...)
//   zones {name: fn(u, v, x, y)}   where each piece may go;  tallOk(u, v, x, y, h)   extra rules for tall pieces
//   water(x, y, grow)        normalised distance to the water (< 1 inside); `rim` pieces sit on its edge
//   keepClear [[x0, y0, x1, y1]] screen rects (UI, props, labels);  occupied [[u, v, radius]] already-placed sprites
//   landmarks [[id, u, v, scale, flip, radius]] hand-placed kit pieces
//   pieces [[id, count, zones, radius in tiles, height px, tall, may flip]]
function buildScene(R, seed, pt) {
  const rnd = mulberry32(seed), [u0, u1, v0, v1] = R.range, water = R.water || (() => Infinity);
  const placed = R.landmarks.map(([id, u, v, , , rad]) => ({ id, u, v, rad, tall: true }))
    .concat((R.occupied || []).map(([u, v, rad]) => ({ id: '', u, v, rad, tall: true })));
  const out = [], stats = {};
  for (const [id, n, zones, rad, h, tall, flip] of R.pieces) {
    stats[id] = 0;
    for (let i = 0; i < n; i++) {
      for (let tries = 0; tries < 3000; tries++) {
        const u = u0 + rnd() * (u1 - u0), v = v0 + rnd() * (v1 - v0), [x, y] = pt(u, v);
        if (x < -290 || x > 1090 || y < 64 || y > R.maxY) continue;                      // on the stage
        if (R.blocked(u, v, x, y, id)) continue;                                         // R1/R2: floors, fields, paths
        if (!zones.some(z => R.zones[z](u, v, x, y))) continue;
        if (tall && !R.tallOk(u, v, x, y, h)) continue;                                  // R4/R9: tall pieces at the back or in the bleed
        const onRim = zones.includes('rim') && R.zones.rim(u, v, x, y);
        if (water(x, y) < .93 || (!onRim && water(x, y, rad * 40) < 1.05)) continue;   // R3: nothing in the water; only rim pieces at its edge
        if (tall && water(x, y - h * .5, h * .5) < 1.05) continue;                       // R3/R4: no crown hanging over the water
        const box = [x - h * .4, y - h, x + h * .4, y];
        if (R.keepClear.some(([a, b, c, d]) => box[0] < c && box[2] > a && box[1] < d && box[3] > b)) continue;   // R1: UI and props
        if (placed.some(p => { const d = Math.hypot(p.u - u, p.v - v); return d < p.rad + rad + (p.tall && tall ? .4 : 0) || (p.id === id && d < 2.5); })) continue;   // R5, R6
        placed.push({ id, u, v, rad, tall });
        out.push([id, +u.toFixed(2), +v.toFixed(2), +(0.9 + rnd() * .2).toFixed(2), flip && rnd() < .5]);   // R6: ±10% scale; R11: flip only if allowed
        stats[id]++;
        break;
      }
    }
  }
  return { pieces: out, stats };
}
const KIT_DEBUG = typeof location !== 'undefined' && /[?&]kit=1\b/.test(location.search);
const SCENE_SEED = name => (typeof location !== 'undefined' && +((new RegExp(`[?&]${name}=(\\d+)`).exec(location.search) || [])[1])) || 0;

// Duck pen recipe.
const PEN_RECIPE = (() => {
  const floor = [-0.7, -0.7, 13.2, 13.2], [fu0, fv0, fu1, fv1] = floor;      // the pen floor plus the fence line: kept clear
  const pond = { c: [890, 252], r: [150, 64] };                             // the painted pond (screen ellipse)
  const water = (x, y, grow = 0) => Math.hypot((x - pond.c[0]) / (pond.r[0] + grow), (y - pond.c[1]) / (pond.r[1] + grow * .45));
  const edgeDist = (u, v) => Math.hypot(Math.max(fu0 - u, 0, u - fu1), Math.max(fv0 - v, 0, v - fv1));
  return {
    seed: 23, range: [-22, 30, -22, 30], maxY: 596, floor, pond, water,
    blocked: (u, v) => u > fu0 && u < fu1 && v > fv0 && v < fv1,
    zones: {
      back: (u, v, x, y) => (u < fu0 || v < fv0) && y > 70 && y < 360,
      bleed: (u, v, x) => x < -20 || x > 820,
      margin: (u, v, x) => x < 70 || x > 760,
      front: (u, v) => u > fu1 || v > fv1,
      edge: (u, v) => { const d = edgeDist(u, v); return d > .1 && d < 1.3; },
      rim: (u, v, x, y) => { const k = water(x, y); return k > .93 && k < 1.12; },
    },
    tallOk: (u, v, x, y) => y >= 120 && !(y > 400 && x > 0 && x < 800) && edgeDist(u, v) >= 2.2,
    landmarks: [['kit.duck_house', -1.4, 3.6, 1, false, 1.9]],
    keepClear: [[10, 92, 200, 330], [14, 392, 170, 446], [14, 540, 140, 592], [380, 500, 720, 540]],   // Uncle Mee + bubble, shop and back buttons, prop labels
    pieces: [
      ['kit.tree_round_a', 2, ['back', 'bleed'], .9, 170, true, false],
      ['kit.tree_round_b', 3, ['back', 'bleed'], .8, 140, true, true],
      ['kit.bamboo_clump', 3, ['back', 'bleed'], .8, 185, true, false],
      ['scenery.banana_young_iso', 1, ['margin', 'back'], .8, 120, true, false],
      ['scenery.banana_fruiting_iso', 1, ['margin', 'back'], .8, 120, true, false],
      ['scenery.banana_ripe_iso', 1, ['margin', 'back'], .8, 120, true, false],
      ['scenery.banana_old_iso', 1, ['margin', 'back'], .8, 120, true, false],
      ['scenery.banana_harvested_iso', 1, ['margin', 'back'], .8, 100, true, false],
      ['kit.haystack', 4, ['margin', 'front'], .6, 52, false, true],
      ['kit.water_jar', 2, ['margin', 'front'], .4, 44, false, false],
      ['kit.bush_a', 5, ['edge', 'back', 'margin'], .6, 40, false, true],
      ['kit.bush_b', 6, ['edge', 'back', 'margin', 'front'], .45, 30, false, true],
      ['kit.reeds', 6, ['rim'], .3, 46, false, true],
      ['kit.egret', 2, ['rim'], .25, 40, false, false],
      ['kit.rock_a', 3, ['rim', 'edge', 'margin', 'front'], .4, 22, false, true],
      ['kit.rock_b', 5, ['edge', 'margin', 'front'], .3, 16, false, true],
    ],
  };
})();
const PEN_SEED = SCENE_SEED('seed') || PEN_RECIPE.seed;
const PEN_BUILD = buildScene(PEN_RECIPE, PEN_SEED, penPt);
// `back` pieces stand outside the pen and are drawn with the background, behind Uncle Mee; `pen` pieces depth-sort
// with the nest, trough, basket and ducks.
const PEN_LAYOUT = {
  back: PEN_BUILD.pieces,
  pen: PEN_RECIPE.landmarks.map(([id, u, v, k, flip]) => [id, u, v, k, flip]),
};

// Fence runs as kit sprites [id, u, v, scale]: one span per step (stretched a little so the run ends on its
// end point), with a post closing each run.
function penFenceSprites() { return fenceSprites(PEN_FENCES); }
function fenceSprites(runs) {
  const out = [];
  for (const [[u0, v0], [u1, v1]] of runs) {
    const len = Math.hypot(u1 - u0, v1 - v0), n = Math.max(1, Math.round(len)), id = u1 > u0 ? 'kit.fence_span_se' : 'kit.fence_span_sw';
    for (let i = 0; i < n; i++) out.push([id, u0 + (u1 - u0) * i / n, v0 + (v1 - v0) * i / n, len / n]);
    out.push(['kit.fence_post', u1, v1, 1]);
  }
  return out;
}

// ---- Farm scene kit. The painted ground (ground.farm) carries everything flat; the game draws the yard and field
// bunds (isoFarmGroundV3) and the plots; kit pieces and the existing sprites stand on top, depth-sorted by gx + gy.
const FARM_FENCES = [[[8, -5], [12.6, -5]], [[8, -5], [8, -2]], [[8, -2], [12.6, -2]]];   // the buffalo paddock
const FARM_PATH = [[9.8, 5], [13, 3.6], [17, 2.4], [24, 1]];   // dirt path from the yard past the signpost (painted in ground.farm)
const FARM_POND = { at: [14.6, -3.2], r: [95, 40] };           // lotus pond (painted in ground.farm): grid centre, screen radii
const FARM_RECIPE = (() => {
  const [cu, cv] = FARM_CLEARING, inClear = (u, v) => u > cu && v > cv;
  const inRect = ([a, b, c, d], u, v, m = 0) => u > a - m && u < c + m && v > b - m && v < d + m;
  const onMound = (u, v) => FARM_MOUNDS.some(([mu, mv, ru, rv]) => Math.hypot((u - mu) / ru, (v - mv) / rv) <= .85);
  const inPaddy = (u, v) => inClear(u, v) && inRect(FARM_ZONES.paddies, u, v) && !onMound(u, v);
  const segDist = (u, v, [a, b], [c, d]) => { const t = Math.max(0, Math.min(1, ((u - a) * (c - a) + (v - b) * (d - b)) / ((c - a) ** 2 + (d - b) ** 2))); return Math.hypot(u - a - t * (c - a), v - b - t * (d - b)); };
  const pathDist = (u, v) => Math.min(...FARM_PATH.slice(1).map((q, i) => segDist(u, v, FARM_PATH[i], q)));
  const pc = isoPt(...FARM_POND.at);
  const water = (x, y, grow = 0) => Math.hypot((x - pc[0]) / (FARM_POND.r[0] + grow), (y - pc[1]) / (FARM_POND.r[1] + grow * .45));
  return {
    seed: 7, range: [-12, 22, -12, 16], maxY: 528, water,
    blocked: (u, v, x, y, id) => {
      if (!inClear(u, v)) return true;                                           // beyond the border: the forest generator's ground
      if (inClear(u, v) && (inRect(FARM_ZONES.yard, u, v, .4) || ['canal', 'paddock', 'house', 'stairs', 'shrine'].some(z => inRect(FARM_ZONES[z], u, v, .15)))) return true;
      if (inPaddy(u, v) && id !== 'kit.egret') return true;                      // only egrets wade in the paddies
      return pathDist(u, v) < .8;                                                // R2: the path stays clear
    },
    zones: {
      forest_edge: (u, v, x, y) => !inClear(u, v) && (u > cu - 1.4 || v > cv - 1.4) && y > 70,
      grass: (u, v) => inClear(u, v) && !inRect(FARM_ZONES.paddies, u, v),
      front: (u, v) => u > 10.3 || v > 8.3,
      margin: (u, v, x) => x < 30 || x > 790,
      paddy: (u, v) => inPaddy(u, v),
      rim: (u, v, x, y) => { const k = water(x, y); return k > .93 && k < 1.12; },
    },
    tallOk: (u, v, x, y) => y >= 100 && (y < 330 || ((x < 0 || x > 800) && y < 440)) && pathDist(u, v) > 1.5,
    occupied: [[...FARM_HOUSE.at.map((n, i) => n + [1.9, 1.5][i]), 2.4], [...FARM_SHRINE, .8], [10.3, -3.5, 2.4]]
      .concat(BANANA_SPOTS.map(([u, v]) => [u, v, .8]), PALM_SPOTS.map(([u, v]) => [u, v, .7])),
    landmarks: [['kit.field_hut', -4.7, -2.8, 1, false, 1], ['kit.scarecrow', -5.6, -0.6, 1, false, .3], ['kit.haystack', 11.6, -4.3, .9, false, .5]],
    keepClear: [[20, 420, 260, 545], [540, 360, 700, 545], [690, 380, 810, 545], [740, 46, 800, 170]],   // cart + sign, jar + farmer, signpost, zoom buttons
    pieces: [
      ['kit.haystack', 2, ['grass', 'margin'], .6, 52, false, true],
      ['kit.water_jar', 1, ['grass'], .4, 44, false, false],
      ['kit.bush_a', 5, ['grass', 'margin'], .6, 40, false, true],
      ['kit.bush_b', 5, ['grass', 'front'], .45, 30, false, true],
      ['kit.flower_patch', 6, ['grass', 'front'], .35, 18, false, true],
      ['kit.reeds', 5, ['rim'], .3, 46, false, true],
      ['kit.egret', 3, ['paddy', 'rim'], .25, 40, false, false],
      ['kit.rock_a', 2, ['grass', 'front', 'rim'], .4, 22, false, true],
      ['kit.rock_b', 3, ['grass', 'front'], .3, 16, false, true],
    ],
  };
})();
const FARM_SEED = SCENE_SEED('farmseed') || FARM_RECIPE.seed;
const FARM_BUILD = buildScene(FARM_RECIPE, FARM_SEED, isoPt);

// ---- Forest border (map rules R4, R7). The clearing's two back edges are straight grid lines (FARM_CLEARING), so
// the forest is planted in rows parallel to them: a bush fringe on the border hides the trunks, then rows of trees
// receding into the forest, darker the deeper they stand. Edges: [fixed axis, value, from, to] along the other axis.
const FARM_FOREST = {
  seed: 31,
  edges: [['u', FARM_CLEARING[0], FARM_CLEARING[1], 14], ['v', FARM_CLEARING[1], FARM_CLEARING[0], 20]],
  fringe: ['kit.bush_a', 'kit.bush_b', 'kit.flower_patch', 'kit.rock_a', 'kit.bush_b'],             // on the border line
  trees: ['kit.tree_round_a', 'kit.tree_round_b', 'kit.bamboo_clump', 'kit.tree_golden_shower', 'kit.tree_flame',
    'kit.tree_round_a', 'kit.tree_round_b', 'kit.bamboo_clump'],                                     // weights: duplicates = more common
  under: ['kit.bush_a', 'kit.bush_b'],                                                                // undergrowth between trees
  depth: 4.2,          // forest band width beyond the border (tiles)
  density: 1.1,        // trees per tile of border per tile of depth
};
// Shuffle-bag: every piece in the pool comes up once before any repeats, so the mix stays even but random.
function shuffleBag(pool, rnd) {
  let bag = [];
  return () => { if (!bag.length) { bag = pool.slice(); for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; } } return bag.pop(); };
}
function forestSprites(F, pt) {
  const rnd = mulberry32(F.seed), out = [], nextTree = shuffleBag(F.trees, rnd), nextFringe = shuffleBag(F.fringe, rnd), nextUnder = shuffleBag(F.under, rnd);
  const inside = (u, v) => u > FARM_CLEARING[0] - .1 && v > FARM_CLEARING[1] - .1;
  const free = (u, v, d) => !out.some(p => Math.hypot(p[1] - u, p[2] - v) < d);
  const add = (id, u, v, shade, kLo, kHi) => {
    const [x, y] = pt(u, v);
    if (inside(u, v) || x < -330 || x > 1130 || y < 50) return false;
    const flip = /round_b|bush|flower|rock/.test(id) && rnd() < .5;
    out.push([id, +u.toFixed(2), +v.toFixed(2), +(kLo + rnd() * (kHi - kLo)).toFixed(2), flip, +shade.toFixed(2)]);
    return true;
  };
  for (const [axis, val, from, to] of F.edges) {
    const at = (t, off) => axis === 'u' ? [val - off, t] : [t, val - off];
    // fringe: an uneven line of bushes, flowers and rocks hugging the border
    for (let t = from + rnd() * .5; t < to; t += .45 + rnd() * .6) {
      const [u, v] = at(t, .1 + rnd() * .45);
      if (free(u, v, .45)) add(nextFringe(), u, v, 1, .8, 1.15);
    }
    // trees: scattered through the band (no rows), denser toward the border, darker the deeper they stand
    const n = Math.round((to - from) * F.depth * F.density);
    for (let i = 0, tries = 0; i < n && tries < n * 30; tries++) {
      const off = .7 + Math.pow(rnd(), 1.4) * F.depth, [u, v] = at(from + rnd() * (to - from), off);
      if (!free(u, v, .8 + rnd() * .35)) continue;
      const shade = 1 - (off - .7) / F.depth * .32 - rnd() * .06;
      if (add(nextTree(), u, v, shade, .82, 1.18)) i++;
    }
    // undergrowth in the gaps
    for (let i = 0; i < (to - from) * 1.2; i++) {
      const off = .5 + rnd() * F.depth * .7, [u, v] = at(from + rnd() * (to - from), off);
      if (free(u, v, .5)) add(nextUnder(), u, v, 1 - (off / F.depth) * .3, .85, 1.2);
    }
  }
  return out;
}
const FOREST_SEED = SCENE_SEED('forestseed') || FARM_FOREST.seed;
const FARM_FOREST_SPRITES = forestSprites({ ...FARM_FOREST, seed: FOREST_SEED }, isoPt);
