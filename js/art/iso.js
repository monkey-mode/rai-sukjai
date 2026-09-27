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

// Post-and-rail fence from grid point a to b (inclusive), posts every `step` tiles.
function isoFence(a, b, step = .5) {
  const n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
  const at = (t, z) => isoPt(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, z);
  let rails = '';
  for (const z of [12, 24]) rails += `M${at(0, z)}L${at(1, z)}`;
  let s = `<path d="${rails}" fill="none" stroke="${O}" stroke-width="5.4" stroke-linecap="round"/><path d="${rails}" fill="none" stroke="#b88350" stroke-width="3" stroke-linecap="round"/>`;
  for (let i = 0; i <= n; i++) {
    const [x, y] = at(i / n, 0);
    s += `<rect x="${r(x - 3)}" y="${r(y - 30)}" width="6" height="32" rx="1.5" fill="#9a6a3c" ${SW} stroke-width="1.8"/>`;
  }
  return s;
}

// Banana clumps on the farm: [gx, gy, variant, scale]. Every spot uses a different variant (checked by tests).
const BANANA_SPOTS = [
  [-1.3, 1.2, 'old', .8],          // canal bank, upper
  [-1.1, -1.0, 'fruiting', .85],   // left of the Phra Phum shrine
  [4.9, -1.7, 'young', .8],        // between the stilt house and the yard
  [7.0, -2.9, 'ripe', .8],         // by the buffalo paddock corner
  [-1.4, 5.4, 'harvested', .85],   // canal bank, lower
];

// Where the farm props stand, on open ground around the yard ([x, y] screen points).
const FARM_SPOTS = {
  cart: [84, 491],        // oxCart(x, y): x = rear of the code-drawn cart; its asset is anchored at (x + 66, y + 1)
  cartSign: [34, 452],     // top-left of the "ขายผลผลิต" sign next to the cart
  jar: [584, 392],        // dragonJar(x, top)
  farmer: [652, 474],     // farmer(x, feetY)
  buffalo: [694, 316],    // buffalo(x, y): ground point inside the paddock, behind its front fence
};
