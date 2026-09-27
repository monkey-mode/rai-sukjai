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
function isoFence(a, b, step = .6) {
  const n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
  const g = t => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const at = (t, z) => isoPt(...g(t), z);
  const poly = (pts, fill, w = 1.6) => `<polygon points="${isoPoints(pts)}" fill="${fill}" ${SW} stroke-width="${w}"/>`;
  const H = 30, W = .055;
  let posts = '';
  for (let i = 0; i <= n; i++) {
    const [x, y] = g(i / n), P = (dx, dy, z) => isoPt(x + dx, y + dy, z), apex = P(0, 0, H + 6);
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
const FARM_SCALE = { shrine: .7, buffalo: .75, farmer: .75, jar: .6, cart: .6 };
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
  [7.2, -3.4, 'sugar_pair', 1],             // between the house and the buffalo paddock
  [8.5, -1.3, 'betel_cluster', .95],        // in front of the buffalo paddock
];

// Where the farm props stand, on open ground around the yard ([x, y] screen points).
const FARM_SPOTS = {
  cart: [84, 491],        // oxCart(x, y): x = rear of the code-drawn cart; its asset is anchored at (x + 66, y + 1)
  cartSign: [34, 452],     // top-left of the "ขายผลผลิต" sign next to the cart
  jar: [584, 392],        // dragonJar(x, top)
  farmer: [652, 474],     // farmer(x, feetY)
  buffalo: [722, 334],    // buffalo(x, y): ground point inside the paddock, behind its front fence
};
