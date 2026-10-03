/* Static backgrounds: the farm, the village map and the market and pen interiors. */
'use strict';

// Isometric farm. The painted asset covers sky, horizon, paddies, house, trees, yard, field bunds and the
// paddock's back fence; the game adds what moves or stands in front: clouds, buffalo, the paddock front fence.
// ---- Farm from its scene kit (FARM_RECIPE in js/art/iso.js). The game switches once ground.farm and every new kit
// piece are done (`?kit=1` forces it with placeholders); until then it keeps bg.farm. Existing sprites (house,
// shrine, palms, bananas, buffalo) stay where they are and pick up their v3 restyles through the loader.
const FARM_KIT_IDS = ['ground.farm', 'kit.fence_span_se', 'kit.fence_span_sw', 'kit.fence_post',
  ...new Set(FARM_BUILD.pieces.concat(FARM_RECIPE.landmarks, FARM_FOREST_SPRITES).map(p => p[0]))];
function farmKitActive() { return KIT_DEBUG || FARM_KIT_IDS.every(id => Assets.has(id)); }
const farmKitSprite = (id, u, v, k, flip, depth = u + v) => kitSprite(id, u, v, k, flip, depth, isoPt);

// Yard and field bunds in art style v3 (palette tones + the locked outline), drawn by the game so they line up with
// the plots exactly.
function isoFarmGroundV3() {
  const [x0, y0, x1, y1] = ISO.YARD;
  let s = isoBlock(x0, y0, x1, y1, ISO.YARD_DEPTH, '#ecd09a', '#d4ab6c', '#a97f4a');
  for (let fi = 0; fi < 4; fi++) {
    const [gx, gy] = fieldOrigin(fi), m = ISO.RIM;
    s += isoBlock(gx - m, gy - m, gx + 4 + m, gy + 3 + m, ISO.RIM_DEPTH, '#a8d468', '#82b84a', '#5f9038');
  }
  return s;
}

// The forest floor beyond the clearing, drawn on the grid so the border is exactly the clearing's two edge lines.
function farmForestFloor() {
  const [cu, cv] = FARM_CLEARING, P = (u, v) => isoPt(u, v).map(r).join(',');
  const border = `${P(cu, 30)} ${P(cu, cv)} ${P(40, cv)}`;
  return `<polygon points="${border} 1500,-700 -900,-700" fill="#3f7a2e"/>` +
    `<polyline points="${border}" fill="none" stroke="#3a2213" stroke-width="2.5" stroke-linejoin="round"/>`;
}
const forestSprite = ([id, u, v, k, flip, shade]) => {
  const [d, svg] = farmKitSprite(id, u, v, k, flip);
  return [d, shade < 1 ? `<g style="filter:brightness(${shade})">${svg}</g>` : svg];
};

// ---- Grass ground cover. In the hot season the dry versions are used when they exist. The tufts never move, so once
// their images load they are baked into one image per scene and season (fast to repaint while panning); until then,
// or where baking is not allowed (file://), they are drawn as individual images.
const grassDry = () => typeof S !== 'undefined' && S && seasonOf(S.day) === 'hot';
const grassId = id => grassDry() && Assets.has(id + '_dry') ? id + '_dry' : id;
const GRASS_BAKED = {};
function grassLayer(scene, sprites, pt) {
  const key = scene + (grassDry() ? ':dry' : '');
  if (GRASS_BAKED[key]) return `<image href="${GRASS_BAKED[key]}" x="-300" y="0" width="1400" height="600"/>`;
  const list = sprites.map(([id, u, v, k, flip]) => [grassId(id), ...pt(u, v), k, flip]).filter(([id]) => Assets.has(id) || KIT_DEBUG);
  if (!list.length) return '';
  if (list.every(([id]) => Assets.has(id))) bakeGrass(key, list);
  return list.sort((a, b) => a[2] - b[2]).map(([id, x, y, k, flip]) => Assets.has(id)
    ? `<g transform="translate(${r(x)} ${r(y)}) scale(${flip ? -k : k} ${k})">${Assets.image(id)}</g>`
    : `<path d="M${r(x - 5)} ${r(y)}l2 -9M${r(x)} ${r(y)}v-12M${r(x + 5)} ${r(y)}l-2 -9" stroke="#2c5a24" stroke-width="2.4" stroke-linecap="round"/>`).join('');
}
async function bakeGrass(key, list) {
  if (bakeGrass.busy || GRASS_BAKED[key]) return;
  bakeGrass.busy = true;
  try {
    const K = 2, c = document.createElement('canvas'); c.width = 1400 * K; c.height = 600 * K;
    const g = c.getContext('2d'), imgs = {};
    await Promise.all([...new Set(list.map(l => l[0]))].map(id => new Promise((ok, bad) => { const i = new Image(); i.onload = () => { imgs[id] = i; ok(); }; i.onerror = bad; i.src = Assets.found[id]; })));
    for (const [id, x, y, k, flip] of list.sort((a, b) => a[2] - b[2])) {
      const sp = ASSET_SPECS[id];
      g.setTransform(K * (flip ? -k : k), 0, 0, K * k, (x + 300) * K, y * K);
      g.drawImage(imgs[id], -sp.ax, -sp.ay, sp.w, sp.h);
    }
    GRASS_BAKED[key] = c.toDataURL('image/webp', .9);
    // the same tufts' normal maps, for the moving light (mirrored tufts get mirrored normals)
    if (typeof Light !== 'undefined' && list.every(([id]) => Assets.normal[Assets.found[id]])) {
      const n = document.createElement('canvas'); n.width = c.width; n.height = c.height;
      const ng = n.getContext('2d'); ng.fillStyle = 'rgb(128,128,255)'; ng.fillRect(0, 0, n.width, n.height);
      for (const [id, x, y, k, flip] of list) {
        const sp = ASSET_SPECS[id], src = await Light.normalImage(Assets.normal[Assets.found[id]], flip);
        ng.setTransform(K * (flip ? -k : k), 0, 0, K * k, (x + 300) * K, y * K);
        ng.drawImage(src, -sp.ax, -sp.ay, sp.w, sp.h);
      }
      Light.bakedNormal.set(GRASS_BAKED[key], n);
    }
    if (typeof ui !== 'undefined' && S && S.scene + (grassDry() ? ':dry' : '') === key) { ui.bgScene = null; render(); }
  } catch (e) { /* file:// or a missing tuft: keep the individual images */ }
  bakeGrass.busy = false;
}

function farmKitGround() {
  if (Assets.has('ground.farm')) return bleed(Assets.image('ground.farm'), 'ground.farm');
  const [cu, cv] = FARM_CLEARING;   // placeholder: grass clearing, forest beyond its back edges, paddies, canal, pond, path
  const poly = pts => pts.map(p => isoPt(...p).map(r).join(',')).join(' ');
  const pc = isoPt(...FARM_POND.at);
  return `<rect x="-300" width="1400" height="600" fill="#a8d468"/>` +
    `<polygon points="${poly([[cu, 30], [cu, cv], [40, cv]])} 1400,-600 -800,-600" fill="#3f7a2e"/>` +
    `<polygon points="${poly([[cu, cv + .1], [-2.75, cv + .1], [-2.75, 11], [cu, 11]])}" fill="#9edcf2" stroke="#5f9038" stroke-width="2"/>` +
    `<polygon points="${poly([[-2.62, -8], [-2.26, -8], [-2.26, 11], [-2.62, 11]])}" fill="#5fbbe2"/>` +
    ell(pc[0], pc[1], FARM_POND.r[0], FARM_POND.r[1], '#5fbbe2', 0, 2) +
    `<polyline points="${poly(FARM_PATH)}" fill="none" stroke="#d4ab6c" stroke-width="34" stroke-linecap="round"/>`;
}

function farmBG() {
  if (farmKitActive()) {
    const b = FARM_SPOTS.buffalo;
    const bGrid = [((b[0] - ISO.OX) / 32 + (b[1] - ISO.OY) / 16) / 2, ((b[1] - ISO.OY) / 16 - (b[0] - ISO.OX) / 32) / 2];
    const fences = fenceSprites(FARM_FENCES).map(([id, u, v, k]) => farmKitSprite(id, u, v, k, false,
      u + v + (id === 'kit.fence_span_se' || id === 'kit.fence_span_sw' ? .5 * k : 0)));
    const items = [[bGrid[0] + bGrid[1], `<g transform="translate(${b[0]} ${b[1]}) scale(${FARM_SCALE.buffalo}) translate(${-b[0]} ${-b[1]})">${buffalo(b[0], b[1])}</g>`]]
      .concat(fences, plantSprites(), [spiritHouseSprite(), houseSprite()].filter(Boolean),
        FARM_RECIPE.landmarks.map(([id, u, v, k, flip]) => farmKitSprite(id, u, v, k, flip)),
        FARM_BUILD.pieces.map(p => farmKitSprite(...p)), FARM_FOREST_SPRITES.map(forestSprite));
    return farmKitGround() + farmForestFloor() + isoFarmGroundV3() + grassLayer('farm', FARM_GRASS, isoPt) + cloud(250, 76, 1, '') + cloud(470, 58, .75, 'd2') + depthSorted(items);
  }
  return farmBGOld();
}

function farmBGOld() {
  const [px0, py0, px1, py1] = ISO.PADDOCK, b = FARM_SPOTS.buffalo;
  const clouds = cloud(250, 76, 1, '') + cloud(470, 58, .75, 'd2') + cloud(120, 64, .6, 'd2');
  // the buffalo and the paddock's front fence join the plant sprites in one back-to-front pass
  const bGrid = [((b[0] - ISO.OX) / 32 + (b[1] - ISO.OY) / 16) / 2, ((b[1] - ISO.OY) / 16 - (b[0] - ISO.OX) / 32) / 2];
  const items = [
    [bGrid[0] + bGrid[1], `<g transform="translate(${b[0]} ${b[1]}) scale(${FARM_SCALE.buffalo}) translate(${-b[0]} ${-b[1]})">${buffalo(b[0], b[1])}</g>`],
    [px0 + py1, isoFence([px0, py1], [px1, py1])],
    [px0 + (py0 + py1) / 2, isoFence([px0, py0], [px0, py1])],       // left side: palms stand behind it
  ];
  const sprites = items.concat(plantSprites(), [spiritHouseSprite(), houseSprite()].filter(Boolean));
  return (Assets.has('bg.farm') ? Assets.image('bg.farm') : farmBackdropIso()) + clouds + depthSorted(sprites);
}

// A background filling the wide stage. One painted with bleed (1400 wide) is used as is; an 800-wide one gets
// mirrored copies that continue it seamlessly into both margins.
function bleed(img, id) {
  if (ASSET_SPECS[id].w > 800) return img;
  return `<g transform="scale(-1 1)">${img}</g><g transform="translate(1600 0) scale(-1 1)">${img}</g>${img}`;
}

function depthSorted(items) {
  return items.slice().sort((a, c) => a[0] - c[0]).map(i => i[1]).join('');
}

// Banana clump and palm sprites as [depth, svg] items, each with a ground shadow.
// The Thai house as a [depth, svg] item (none without its asset: the old house was part of the painted background).
function houseSprite() {
  if (!Assets.has('scenery.thai_house_iso')) return null;
  const [x, y] = isoPt(...FARM_HOUSE.at);
  return [FARM_HOUSE.depth, Assets.image('scenery.thai_house_iso', x, y)];
}

// The spirit house as a [depth, svg] item at FARM_SHRINE: the iso asset, or the code-drawn shrine.
function spiritHouseSprite() {
  const [gx, gy] = FARM_SHRINE, [x, y] = isoPt(gx, gy);
  const art = Assets.has('scenery.spirit_house_iso') ? Assets.image('scenery.spirit_house_iso') : spiritHouse(0, 0);
  return [gx + gy, `<g transform="translate(${r(x)} ${r(y)}) scale(${FARM_SCALE.shrine})"><ellipse cx="3" cy="1" rx="24" ry="9" fill="rgba(58,34,19,.18)"/>${art}</g>`];
}

// Grass tufts in front of a plant sprite's base, so it grows out of the ground rather than standing on it.
const PLANT_TUFTS = '<path d="' + [[-15, 4], [-6, 6], [9, 5], [17, 2]].map(([x, y]) => `M${x} ${y}l-3 -7M${x} ${y}l0 -9M${x} ${y}l3 -7`).join('') + '" fill="none" stroke="#6f8f3a" stroke-width="2.2" stroke-linecap="round"/>';

function plantSprites() {
  const put = (id, gx, gy, sc, rx) => {
    if (!Assets.has(id)) return null;
    const [x, y] = isoPt(gx, gy);
    return [gx + gy, `<g transform="translate(${r(x)} ${r(y)}) scale(${sc})"><ellipse cx="4" cy="1" rx="${rx}" ry="${r(rx * .35)}" fill="rgba(58,34,19,.18)"/>${Assets.image(id)}${PLANT_TUFTS}</g>`];
  };
  return BANANA_SPOTS.map(([gx, gy, v, sc]) => put(`scenery.banana_${v}_iso`, gx, gy, sc, 26))
    .concat(PALM_SPOTS.map(([gx, gy, v, sc]) => put(`scenery.palm_${v}_iso`, gx, gy, sc, 18)))
    .filter(Boolean);
}

// Code-drawn fallback for the isometric farm background.
function farmBackdropIso() {
  let s = `<defs><linearGradient id="gSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#86cdea"/><stop offset="1" stop-color="#fbe6b2"/></linearGradient></defs>`;
  s += `<rect x="-300" width="1400" height="160" fill="url(#gSky)"/>` + circ(118, 94, 24, '#ffd54a', 3);
  { const hills = `<path d="M0 150Q40 132 80 146Q120 128 160 144Q200 130 240 146Q280 132 320 144Q360 128 400 144Q440 130 480 146Q520 132 560 144Q600 128 640 146Q680 132 720 144Q760 130 800 146V160H0Z" fill="#5f8f3e" ${SW} stroke-width="2.5"/>`; s += hills + `<g transform="translate(-800 0)">${hills}</g><g transform="translate(800 0)">${hills}</g>`; }
  s += `<rect x="-300" width="1400" y="156" height="444" fill="#bccb6c"/>` + line('M-300 156H1100', O, 2.5);
  // iso paddies behind the yard's upper-left edge
  let pad = '';
  for (let gx = -7; gx < -1; gx++) for (let gy = -4; gy < 9; gy += 2) {
    const [a, b, c, d] = [isoPt(gx, gy), isoPt(gx + 1, gy), isoPt(gx + 1, gy + 2), isoPt(gx, gy + 2)];
    if (Math.min(a[1], b[1], d[1]) < 156) continue;
    pad += `<polygon points="${isoPoints([a, b, c, d])}" fill="${(gx + gy) % 3 ? '#a8d04e' : '#bfe0e6'}" stroke="#dcc67c" stroke-width="3"/>`;
  }
  s += pad;
  // the forest beyond the clearing's back edges (the house, shrine and plants are sprites drawn by farmBG)
  const [ex, ey] = FARM_CLEARING;
  s += `<polygon points="${isoPoints([isoPt(ex, 30), isoPt(ex, ey), isoPt(40, ey), [1400, -600], [-800, -600]])}" fill="#4d7a34" ${SW} stroke-width="2.5"/>`;
  // paddock ground and its back fences
  const [px0, py0, px1, py1] = ISO.PADDOCK;
  s += `<polygon points="${isoPoints([isoPt(px0, py0), isoPt(px1, py0), isoPt(px1, py1), isoPt(px0, py1)])}" fill="#b0c160" stroke="none"/>`;
  s += isoFence([px0, py0], [px1, py0]) + isoFence([px0, py0], [px0, py1]);
  s += isoFarmGround();
  return s;
}

// Village map: the hub between places. The painted asset (its own iso grid, vPt) has the lanes, the farm fields,
// the market roofs, the pen, temple and houses; sprites add the landmarks shared with the farm and a few locals.
const vPt = (u, v, z = 0) => [400 + (u - v) * 32, 70 + (u + v) * 16 - z];
// Tappable places: a name plate at `at` and an invisible hit diamond [u0, v0, u1, v1] over the area.
const VILLAGE_PLACES = [
  { id: 'farm', th: 'ไร่ของเรา', en: 'Our farm', at: vPt(17.2, 5.2, 50), hit: [11, 0, 18, 7] },
  { id: 'market', th: 'ตลาด', en: 'Market', at: vPt(11.2, 11.2, 8), hit: [6.8, 6.8, 11.4, 11.4] },
  { id: 'pen', th: 'คอกเป็ดลุงมี', en: "Uncle Mee's ducks", at: vPt(14.2, 17.4, 4), hit: [11, 11.8, 15.2, 16.7] },
  { id: 'temple', th: 'วัด', en: 'Temple', at: vPt(6.2, 5.6, 40), hit: [1.5, 1.5, 7, 5.5], soon: true },
  { id: 'houses', th: 'บ้านเพื่อนบ้าน', en: 'Neighbours', at: vPt(4.6, 17.8, 4), hit: [1, 11.8, 6.4, 17.4], soon: true },
];

function villageBG() {
  const img = (id, [x, y], k) => Assets.has(id) ? [y, `<g transform="translate(${r(x)} ${r(y)}) scale(${k})">${Assets.image(id)}</g>`] : null;
  const back = Assets.has('bg.village') ? bleed(Assets.image('bg.village'), 'bg.village') : `<rect x="-300" width="1400" height="600" fill="#a9c95e"/>`;
  const b = vPt(17.2, 7.4);
  const sprites = [
    img('scenery.thai_house_iso', vPt(13, -.9), .55),
    img('scenery.palm_coconut_lean_iso', vPt(17.6, .4), .6), img('scenery.palm_sugar_tall_iso', vPt(10.9, 6.9), .6),
    img('scenery.palm_coconut_dwarf_iso', vPt(18.2, 6.6), .7),
    img('scenery.banana_ripe_iso', vPt(10.8, 4), .5), img('scenery.banana_fruiting_iso', vPt(6.6, 12.2), .45),
    [b[1], scaled(b[0], b[1], .35, buffalo(...b))],
    img('scenery.spirit_house_iso', vPt(7.2, 1.2), .35),
    img('character.uncle_mee', vPt(10.6, 15.4), .9), img('character.farmer', vPt(9.2, 11.2), .5),
  ].filter(Boolean);
  return back + cloud(180, 50, .7, '') + cloud(620, 36, .55, 'd2') + depthSorted(sprites);
}

// Market interior (front view): Auntie Daeng behind her counter under the stall's sign.
function marketBG() {
  const back = Assets.has('bg.market') ? bleed(Assets.image('bg.market'), 'bg.market') : marketBackdrop();
  return back + `<g transform="translate(104 150)"><rect x="-80" y="-18" width="160" height="36" rx="8" fill="#fff4d6" ${SW} stroke-width="2.6"/>` +
    `<text y="7" text-anchor="middle" font-family="Kanit" font-size="20" font-weight="700" fill="#c8372d">แผงป้าแดง</text></g>` + auntieDaeng(190, 410) + marketCounter();
}

function marketBackdrop() {
  let s = `<rect x="-300" width="1400" height="600" fill="#c78b52"/>`;
  let pl = '';
  for (let y = 70; y < 470; y += 22) pl += `M-300 ${y}H1100`;
  s += line(pl, '#a8703f', 2);
  s += `<rect x="-300" y="470" width="1400" height="130" fill="#8a5a33"/>` + line('M-300 470H1100M-300 520H1100M100 470L80 600M300 470L290 600M500 470L510 600M700 470L720 600', '#6e4526', 2.5);
  // hanging goods along the back
  s += line('M200 60Q500 80 800 60', O, 1.6);
  [240, 330, 420, 510, 600, 690, 770].forEach((x, i) => {
    s += line(`M${x} 66v12`, O, 1.4) + (i % 2 ? circ(x, 86, 8, '#f39c12', 2) + circ(x - 6, 96, 6, '#f7c52b', 1.6) : `<path d="M${x - 8} 78Q${x} 104 ${x + 8} 78Z" fill="#f2d26b" ${SW} stroke-width="1.8"/>`);
  });
  // stall frame, awning & counter on the left
  s += `<rect x="12" y="46" width="10" height="440" fill="#6e4526" ${SW} stroke-width="2"/><rect x="186" y="46" width="10" height="440" fill="#6e4526" ${SW} stroke-width="2"/>`;
  for (let i = 0; i < 5; i++) {
    const x = 4 + i * 40, col = i % 2 ? '#fff4e0' : '#d6372c';
    s += `<rect x="${x}" y="46" width="40" height="50" fill="${col}"/><path d="M${x} 96A20 16 0 0 0 ${x + 40} 96Z" fill="${col}" ${SW} stroke-width="2.4"/>`;
  }
  s += `<path d="M4 46H204V96" fill="none" stroke="${O}" stroke-width="3"/>`;
  s += `<g transform="translate(104 122)"><rect x="-70" y="-14" width="140" height="30" rx="6" fill="#fff4d6" ${SW} stroke-width="2.6"/>` +
    `<text x="0" y="4" text-anchor="middle" font-family="Kanit" font-size="17" font-weight="700" fill="#c8372d">แผงป้าแดง</text></g>`;
  return s;
}

// Front-view counter: a gingham cloth over the boards and baskets of produce.
function marketCounter() {
  let s = `<rect x="20" y="400" width="340" height="140" fill="#9a6232" ${SW} stroke-width="3"/>` + line('M20 440H360M20 490H360M100 400V540M190 400V540M280 400V540', '#6e4526', 2);
  s += `<path d="M10 392H370L362 430H18Z" fill="#e2453a" ${SW} stroke-width="3"/>`;
  let chk = '';
  for (let x = 22; x < 362; x += 14) chk += `M${x} 394v34`;
  s += line(chk + 'M14 410H366', '#fff', 1.6);
  [[80, 3], [180, 6], [280, 2]].forEach(([x, c]) => {
    s += ell(x, 390, 38, 12, '#c9a15a', 0, 2.4);
    [-16, 0, 16].forEach(dx => { s += `<g transform="translate(${x + dx} ${378 - Math.abs(dx) * .2}) scale(.8)">${produceIcon(c)}</g>`; });
  });
  return s;
}

// ---- Duck pen from its scene kit (js/art/iso.js: PEN_LAYOUT, PEN_FENCES). The game switches to it once the painted
// ground and every piece are done; until then it keeps the single painted bg.pen. `?kit=1` in the URL forces the kit
// and draws a labelled box for each missing piece, to check the layout before the art arrives.
const PEN_KIT_IDS = ['ground.pen', 'kit.fence_span_se', 'kit.fence_span_sw', 'kit.fence_post',
  ...new Set(PEN_LAYOUT.back.concat(PEN_LAYOUT.pen).map(p => p[0]))];
function penKitActive() { return KIT_DEBUG || PEN_KIT_IDS.every(id => Assets.has(id)); }

// A kit piece at pen grid (u, v) as a [depth, svg] item, with the soft ground shadow the game adds (not for fences).
function kitSprite(id, u, v, k = 1, flip = false, depth, pt = penPt) {
  const [x, y] = pt(u, v), sp = ASSET_SPECS[id];
  const shadow = id.startsWith('kit.fence') ? '' : `<ellipse cx="0" cy="1" rx="${r(sp.w * .3)}" ry="${r(sp.w * .09)}" fill="rgba(58,34,19,.18)"/>`;
  const has = Assets.has(id), art = has ? Assets.image(id) : kitPlaceholder(id);
  return [depth ?? y, `<g transform="translate(${r(x)} ${r(y)}) scale(${flip && has ? -k : k} ${k})">${shadow}${art}</g>`];
}

function kitPlaceholder(id) {
  const sp = ASSET_SPECS[id];
  if (id === 'kit.fence_post') return line('M0 0V-34', '#8a5a2e', 5);
  if (id.startsWith('kit.fence_span')) { const dx = id.endsWith('se') ? 32 : -32; return line(`M0 0V-34M0 -11L${dx} 5M0 -23L${dx} -7`, '#8a5a2e', 4); }
  return `<rect x="${-sp.ax}" y="${-sp.ay}" width="${sp.w}" height="${sp.h}" rx="6" fill="rgba(255,255,255,.3)" stroke="#6b3fa0" stroke-width="1.5" stroke-dasharray="5 3"/>` +
    `<circle r="3" fill="#6b3fa0"/><text y="${-sp.ay + 13}" text-anchor="middle" font-family="Sarabun" font-size="10" fill="#4a2a70">${id.replace(/^(kit|scenery)\./, '')}</text>`;
}

function penKitGround() {
  if (Assets.has('ground.pen')) return bleed(Assets.image('ground.pen'), 'ground.pen');
  const floor = [penPt(0, 0), penPt(12.5, 0), penPt(12.5, 12.5), penPt(0, 12.5)].map(q => q.join(',')).join(' ');
  return `<rect x="-300" width="1400" height="600" fill="#a9c95e"/><polygon points="${penPt(-9, 40).join(',')} ${penPt(-9, -11).join(',')} ${penPt(40, -11).join(',')} 2200,-900 -1500,-900" fill="#3f6a2c"/>` +
    `<polygon points="${floor}" fill="#cdbf7e" stroke="#8a7a4a" stroke-width="2"/>` + ell(...penPt(7.5, -4.2), 150, 60, '#6fb3c4', 0, 2);
}

function penBG() {
  if (penKitActive()) return penKitGround() + grassLayer('pen', PEN_GRASS, penPt) + cloud(430, 40, .8, '') + cloud(630, 30, .6, 'd2') +
    depthSorted(PEN_LAYOUT.back.map(p => kitSprite(...p))) + uncleMee(96, 318);
  if (Assets.has('bg.pen')) return bleed(Assets.image('bg.pen'), 'bg.pen') + cloud(430, 40, .8, '') + cloud(630, 30, .6, 'd2') + uncleMee(96, 318);
  let s = `<rect x="-300" width="1400" height="160" fill="#9fd6ee"/>` + cloud(640, 80, .8, '') + cloud(360, 70, .6, 'd2');
  { const hills = `<path d="M0 150Q60 120 120 140Q190 110 260 138Q330 112 400 136Q470 114 540 138Q620 116 700 136Q760 120 800 132V170H0Z" fill="#5f8f3e" ${SW} stroke-width="2.5"/>`; s += hills + `<g transform="translate(-800 0)">${hills}</g><g transform="translate(800 0)">${hills}</g>`; }
  s += `<rect x="-300" y="160" width="1400" height="440" fill="#a9c95e"/>` + line('M-300 160H1100', O, 2.5);
  s += `<rect x="215" y="250" width="585" height="300" fill="#b7cf6b"/>`;
  // pond
  s += ell(660, 205, 122, 44, '#5fb3dd', 0, 3) + ell(640, 198, 80, 22, '#8fd0ee', 0, 0);
  s += ell(600, 214, 14, 6, '#4f9a34', 0, 1.6) + ell(700, 196, 12, 5, '#4f9a34', 0, 1.6) + circ(700, 190, 5, '#f4a6c0', 1.6) + ell(740, 220, 11, 5, '#4f9a34', 0, 1.6);
  s += line('M548 212l-4 -24M556 214l2 -26M770 200l4 -24M778 204l-2 -22', '#4d7a2a', 2.4) + ell(544, 186, 2, 6, '#7a4a26', 0, 1) + ell(774, 176, 2, 6, '#7a4a26', 0, 1);
  // shed
  s += `<rect x="236" y="170" width="8" height="70" fill="#7a4a26" ${SW} stroke-width="2"/><rect x="350" y="170" width="8" height="70" fill="#7a4a26" ${SW} stroke-width="2"/>`;
  s += `<rect x="240" y="196" width="114" height="44" fill="#5a3a22" ${SW} stroke-width="2"/>`;
  s += `<path d="M222 182L297 128L372 182Z" fill="#d9b25a" ${SW} stroke-width="3"/>` + line('M240 176L297 136M260 180L297 140M280 182L297 146M314 182L297 146M334 180L297 140M354 176L297 136', '#b08a3a', 1.6);
  // fences
  let fp = '';
  for (let x = 215; x <= 800; x += 26) fp += `<rect x="${x - 3}" y="236" width="6" height="26" fill="#c9a15a" ${SW} stroke-width="1.6"/>`;
  s += fp + oline('M205 246H800', '#d6b16a', 3);
  let lp = '';
  for (let y = 260; y <= 540; y += 26) lp += `<rect x="212" y="${y - 3}" width="6" height="22" fill="#c9a15a" ${SW} stroke-width="1.6"/>`;
  s += lp;
  s += tufts([[260, 520], [540, 540], [760, 300], [380, 280], [720, 520], [100, 180], [150, 240], [60, 260]]);
  s += uncleMee(96, 318);
  return s;
}
