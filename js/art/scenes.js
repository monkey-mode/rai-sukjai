/* Static backgrounds for the three scenes. */
'use strict';

// Isometric farm. The painted asset covers sky, horizon, paddies, house, trees, yard, field bunds and the
// paddock's back fence; the game adds what moves or stands in front: clouds, buffalo, the paddock front fence.
function farmBG() {
  const [px0, py0, px1, py1] = ISO.PADDOCK, b = FARM_SPOTS.buffalo;
  const clouds = cloud(250, 76, 1, '') + cloud(470, 58, .75, 'd2') + cloud(120, 64, .6, 'd2');
  // the buffalo and the paddock's front fence join the plant sprites in one back-to-front pass
  const bGrid = [((b[0] - ISO.OX) / 32 + (b[1] - ISO.OY) / 16) / 2, ((b[1] - ISO.OY) / 16 - (b[0] - ISO.OX) / 32) / 2];
  const items = [
    [bGrid[0] + bGrid[1], `<g transform="translate(${b[0]} ${b[1]}) scale(${FARM_SCALE.buffalo}) translate(${-b[0]} ${-b[1]})">${buffalo(b[0], b[1])}</g>`],
    [px0 + py1, isoFence([px0, py1], [px1, py1])],
    [px0 + (py0 + py1) / 2, isoFence([px0, py0], [px0, py1])],       // left side: palms stand behind it
  ];
  if (Assets.has('bg.farm')) return Assets.image('bg.farm') + clouds + depthSorted(items.concat(plantSprites(), [spiritHouseSprite(), houseSprite()].filter(Boolean)));
  return farmBackdropIso() + clouds + depthSorted(items);
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
  s += sugarPalm(70, 250, 1) + sugarPalm(150, 205, .9) + sugarPalm(40, 330, 1.1);
  s += stiltHouse() + spiritHouse(330, 196) + coconutTree(250, 196, 120, -10);
  // paddock ground and its back fences
  const [px0, py0, px1, py1] = ISO.PADDOCK;
  s += `<polygon points="${isoPoints([isoPt(px0, py0), isoPt(px1, py0), isoPt(px1, py1), isoPt(px0, py1)])}" fill="#b0c160" stroke="none"/>`;
  s += isoFence([px0, py0], [px1, py0]) + isoFence([px0, py0], [px0, py1]);
  s += isoFarmGround();
  return s;
}

function marketBG() {
  const back = Assets.has('bg.market') ? bleed(Assets.image('bg.market'), 'bg.market') + marketSign() : marketBackdrop();
  return back + auntieDaeng(104, 440) + marketCounter();
}

function marketSign() {
  return `<text x="104" y="178" text-anchor="middle" font-family="Kanit" font-size="17" font-weight="700" fill="#c8372d">แผงป้าแดง</text>`;
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

function marketCounter() {
  if (Assets.has('prop.market_counter')) return Assets.image('prop.market_counter', 100, 470);
  let s = '';
  s += `<rect x="4" y="380" width="200" height="100" fill="#a8693a" ${SW} stroke-width="3"/>` + line('M4 404H204M4 440H204', '#7a4a26', 2);
  s += ell(44, 380, 30, 10, '#d6ad62', 0, 2) + ell(116, 382, 32, 10, '#d6ad62', 0, 2) + ell(176, 380, 24, 9, '#d6ad62', 0, 2);
  [[34, 372, 3], [48, 370, 3], [58, 374, 3], [104, 372, 6], [120, 370, 6], [132, 374, 6], [168, 372, 2], [182, 373, 2]].forEach(([x, y, c]) => { s += `<g transform="translate(${x} ${y}) scale(.6)">${produceIcon(c)}</g>`; });
  return s;
}

function penBG() {
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
