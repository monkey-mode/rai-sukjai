/* Rendering of the farm, village map, duck pen, HUD, toolbar, rain and carried item. */
'use strict';

// One plot on the isometric grid: soil block, crop, bugs and remaining-harvest pips.
function plotSVG(f, fi, p, pi) {
  const [gx, gy] = fieldCell(fi, pi);
  let g = `<g class="plot" data-act="plot" data-f="${fi}" data-p="${pi}">` + isoSoil(gx, gy, p.watered, p.fertilized);
  if (p.stage > 0 && f.crop !== null) {
    const [x, y] = isoPt(gx + .5, gy + .5);
    g += `<g pointer-events="none" transform="translate(${r(x)} ${r(y + 2)})">${plantArt(f.crop, p.stage)}${p.bug ? bugsArt() : ''}</g>`;
    const H = CONFIG.CROPS[f.crop].harvests;
    if (H > 1 && p.stage !== WITHERED) {
      for (let i = 0; i < H - p.harvests; i++) {
        const [px, py] = isoPt(gx + .16 + i * .12, gy + .86);
        g += `<circle cx="${r(px)}" cy="${r(py)}" r="1.7" fill="#ffe066" stroke="${O}" stroke-width=".7" pointer-events="none"/>`;
      }
    }
  }
  return g + '</g>';
}

// Compact field badge (number + crop icon) on each field's outer corner, so it never covers crops.
function fieldLabel(f, fi) {
  const c = f.crop === null ? null : CONFIG.CROPS[f.crop], w = c ? 44 : 58;
  const [gx, gy] = fieldOrigin(fi), m = ISO.RIM;
  const spot = [isoPt(gx - m, gy - m), isoPt(gx + 4 + m, gy - m), isoPt(gx - m, gy + 3 + m), isoPt(gx + 4 + m, gy + 3 + m)][fi];
  let [lx, ly] = [[spot[0] - w / 2, spot[1] - 28], [spot[0] + 6, spot[1] - 10], [spot[0] - w - 6, spot[1] - 10], [spot[0] - w / 2, spot[1] + 14]][fi];
  if (lx < 4) [lx, ly] = [4, spot[1] + 14]; // no room beside the corner: drop below it, outside the field
  const inner = c ? `<g transform="translate(31 11) scale(.62)">${produceIcon(f.crop)}</g>` : `<text x="22" y="15" font-family="Kanit" font-size="11" fill="${O}">ว่าง</text>`;
  return `<g pointer-events="none" transform="translate(${r(lx)} ${r(ly)})"><title>แปลง ${fi + 1} · ${c ? c.th : 'ว่าง'}</title>` +
    `<rect width="${w}" height="22" rx="7" fill="#fff4d6" stroke="${O}" stroke-width="2"/>${circ(11, 11, 7.5, '#8fb04a', 1.6)}` +
    `<text x="11" y="15" text-anchor="middle" font-family="Kanit" font-size="11" font-weight="600" fill="#fff">${fi + 1}</text>${inner}</g>`;
}

// Scale an SVG fragment by k around the point (x, y).
const scaled = (x, y, k, svg) => `<g transform="translate(${x} ${y}) scale(${k}) translate(${-x} ${-y})">${svg}</g>`;

function renderFarm() {
  // plots back to front (by gx+gy) so nearer plants overlap farther ones
  const order = [];
  S.fields.forEach((f, fi) => f.plots.forEach((p, pi) => { const [gx, gy] = fieldCell(fi, pi); order.push([gx + gy, gx, fi, pi]); }));
  order.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let s = order.map(([, , fi, pi]) => plotSVG(S.fields[fi], fi, S.fields[fi].plots[pi], pi)).join('');
  s += S.fields.map(fieldLabel).join('');
  // props and the farmer are drawn at the farm's scale (FARM_SCALE), each around its ground point; the text sign keeps its size
  const [cx, cy] = FARM_SPOTS.cart, [jx, jt] = FARM_SPOTS.jar, [fx, fy] = FARM_SPOTS.farmer, jb = jt + 88;
  s += scaled(cx + 66, cy, FARM_SCALE.cart, oxCart(cx, cy, S.hand && S.hand.type === 'crop', null)) +
    `<g data-act="cart" class="hot">${cartSign(...FARM_SPOTS.cartSign)}</g>`;
  s += scaled(jx, jb, FARM_SCALE.jar, dragonJar(jx, jt)) +
    `<circle data-act="jar" cx="${jx}" cy="${jb - 44 * FARM_SCALE.jar}" r="${Math.max(24, 50 * FARM_SCALE.jar)}" fill="transparent"><title>โอ่งมังกร · Dragon jar</title></circle>`;   // easy tap target
  s += scaled(fx, fy, FARM_SCALE.farmer, farmer(fx, fy, S.energy < CONFIG.TIRED_BELOW));
  s += signpost(false);
  dynEl.innerHTML = s;
}

// Iso trough: ground point under its centre, and the half-size of its cavity (world px) for the feed surface.
const TROUGH = { at: [445, 472], inner: [58, 14] };

// The nest shows up to 10 eggs as a pile; past 10 (and past 20) a darker "shadow" pile peeks out behind it.
// The nest sits inside the pen's fence (the u = 0 fence runs diagonally past its left side).
const NEST = [450, 332];
const NEST_PILE = [NEST[0], NEST[1] - 10];
const NEST_BACK = [[-9, -7], [9, -7]];

// Village map: a name plate over each place, and an invisible diamond over its area; either walks there.
function renderMap() {
  let hits = '', plates = '';
  for (const p of VILLAGE_PLACES) {
    const [u0, v0, u1, v1] = p.hit, act = `data-act="go-place" data-place="${p.id}" data-th="${p.th}"${p.soon ? ' data-soon="1"' : ''}`;
    hits += `<polygon class="place" ${act} points="${[vPt(u0, v0), vPt(u1, v0), vPt(u1, v1), vPt(u0, v1)].map(q => q.map(r).join(',')).join(' ')}" fill="transparent"><title>${p.th} · ${p.en}</title></polygon>`;
    const w = Math.max(96, p.th.length * 13 + 26), [x, y] = p.at.map(r);
    plates += `<g class="place hot" ${act} transform="translate(${x} ${y})"><path d="M0 0v18" stroke="${O}" stroke-width="3"/>` +
      `<rect x="${-w / 2}" y="-34" width="${w}" height="34" rx="8" fill="${p.soon ? '#e8dcc0' : '#fff4d6'}" ${SW} stroke-width="2.6"/>` +
      `<text x="0" y="-17" text-anchor="middle" font-family="Kanit" font-weight="600" font-size="15" fill="${O}">${p.th}</text>` +
      `<text x="0" y="-6" text-anchor="middle" font-family="Sarabun" font-size="9.5" fill="${O}" opacity=".8">${p.en}${p.soon ? ' · soon' : p.id === S.scene ? '' : ` · −${CONFIG.COST.walk}⚡`}</text></g>`;
  }
  dynEl.innerHTML = hits + plates;                   // plates on top of the hit areas
}

function renderPen() {
  let s = '', labels = '';
  const items = [];                                   // [ground y, svg]: props and ducks, drawn back to front
  // nest with eggs
  const nk = gameScale('prop.nest');                  // the size chart scales the nest and its egg piles together
  const nestArt = Assets.has('prop.nest') ? scaled(...NEST, nk, Assets.image('prop.nest', ...NEST)) : `<g transform="translate(${NEST[0] - 300} ${NEST[1] - 312})">${ell(300, 312, 62, 20, '#d9b25a', 0, 2.6)}${line('M246 306l14 6M262 318l16 -4M290 322l14 -6M318 320l12 4M338 312l12 -6M252 316l-6 4M350 316l6 4', '#a8842f', 1.6)}</g>`;
  s += `<g data-act="egg" class="hot"><title>รังไข่ · Nest</title>${nestArt}`;
  if (Assets.has('prop.egg_pile_1')) {
    const [nx, ny] = NEST_PILE;
    NEST_BACK.slice(0, Math.min(2, Math.floor((S.eggs - 1) / 10))).forEach(([dx, dy]) => {
      s += `<g style="filter:brightness(.62) saturate(.8)">${scaled(...NEST, nk, Assets.image('prop.egg_pile_10', nx + dx, ny + dy))}</g>`;
    });
    if (S.eggs > 0) s += scaled(...NEST, nk, Assets.image(`prop.egg_pile_${Math.min(10, S.eggs)}`, nx, ny));
  } else {
    const shown = Math.min(S.eggs, 12);
    for (let i = 0; i < shown; i++) {
      const col = i % 6, row = Math.floor(i / 6);
      s += `<g transform="translate(${NEST[0] - 38 + col * 15 + row * 7} ${NEST[1] - 6 - row * 9}) scale(.75)">${eggIcon()}</g>`;
    }
  }
  s += `</g>`;
  items.push([NEST[1], s]); s = '';
  labels += `<text x="${NEST[0]}" y="${NEST[1] + 40}" text-anchor="middle" font-family="Kanit" font-size="13" font-weight="600" fill="${O}">ไข่ในรัง ${S.eggs} ฟอง</text>` +
    `<text x="${NEST[0]}" y="${NEST[1] + 52}" text-anchor="middle" font-family="Sarabun" font-size="10" fill="${O}">Eggs in nest — click to pick</text>`;
  // trough
  const fill = S.trough / CONFIG.DUCK.troughMax;
  const troughAsset = Assets.has('prop.trough');
  s += `<g data-act="trough" class="hot"><title>รางอาหาร · Trough</title>`;
  if (troughAsset) {
    // the iso trough asset is anchored at the ground under its centre; the feed is an iso surface inside its cavity
    const [tx, ty] = TROUGH.at, P = (x, y, z) => `${r(tx + (x - y) * .894)},${r(ty + (x + y) * .447 - z)}`;
    let t = Assets.image('prop.trough', tx, ty);
    if (fill > 0) {
      const z = 17 + 17 * fill, [a, b] = TROUGH.inner;
      t += `<polygon points="${P(-a, -b, z)} ${P(a, -b, z)} ${P(a, b, z)} ${P(-a, b, z)}" fill="#e8c77a" stroke="#b8943e" stroke-width="1"/>` +
        line(Array.from({ length: S.trough * 5 }, (_, i) => { const u = -a + 6 + (i * 23) % (2 * a - 12), v = -b + 4 + (i * 7) % (2 * b - 8); return `M${P(u, v, z).replace(',', ' ')}h1.4`; }).join(''), '#8a5a22', 2);
    }
    s += scaled(tx, ty, gameScale('prop.trough'), t);   // the size chart scales the trough and its feed together
  } else {
    s += `<rect x="370" y="452" width="150" height="40" rx="6" fill="#9a6a3c" ${SW} stroke-width="3"/><rect x="378" y="458" width="134" height="18" rx="3" fill="#5a3a22"/>`;
    if (fill > 0) s += `<rect x="378" y="${458 + 18 * (1 - fill)}" width="134" height="${18 * fill}" rx="3" fill="#e8c77a"/>` +
      line(Array.from({ length: S.trough * 4 }, (_, i) => `M${384 + i * 6.5} ${470 - (i % 3) * 3}h1`).join(''), '#8a5a22', 2);
  }
  if (!troughAsset) s += `<rect x="378" y="484" width="8" height="16" fill="#7a4a26" ${SW} stroke-width="1.6"/><rect x="504" y="484" width="8" height="16" fill="#7a4a26" ${SW} stroke-width="1.6"/>`;
  s += '</g>';
  items.push([TROUGH.at[1], s]); s = '';
  labels += `<text x="445" y="518" text-anchor="middle" font-family="Kanit" font-size="13" font-weight="600" fill="${O}">รางอาหาร ${S.trough}/${CONFIG.DUCK.troughMax}</text>` +
    `<text x="445" y="530" text-anchor="middle" font-family="Sarabun" font-size="10" fill="${O}">Trough — click to add feed (have ${S.inventory.feed})</text>`;
  // basket
  const hasEgg = S.hand && S.hand.type === 'egg';
  const basketArt = Assets.has('prop.egg_basket') ? scaled(650, 478, gameScale('prop.egg_basket'), Assets.image('prop.egg_basket', 650, 478)) : `<path d="M620 452Q650 420 680 452" fill="none" stroke="${O}" stroke-width="3"/>` +
    `<path d="M612 452H688L680 494H620Z" fill="#d6ad62" ${SW} stroke-width="3"/>` + line('M616 466H684M618 480H682M634 452V494M650 452V494M666 452V494', '#9a7338', 1.4) +
    `<g transform="translate(640 448) scale(.6)">${eggIcon()}</g><g transform="translate(656 446) scale(.6)">${eggIcon()}</g>`;
  items.push([478, `<g data-act="basket" class="hot ${hasEgg ? 'glow' : ''}"><title>ตะกร้าขายไข่ · Egg basket</title>${basketArt}</g>`]);
  labels += `<text x="650" y="512" text-anchor="middle" font-family="Kanit" font-size="13" font-weight="600" fill="${O}">ตะกร้าขายไข่ ฿${CONFIG.DUCK.eggPrice}</text>` +
    `<text x="650" y="524" text-anchor="middle" font-family="Sarabun" font-size="10" fill="${O}">Egg basket — drop eggs to sell</text>`;
  items.push(...penDucks());
  if (penKitActive()) items.push(...penKitItems());
  s = items.sort((a, b) => a[0] - b[0]).map(i => i[1]).join('') + labels;
  if (S.ducks === 0) s += `<text x="600" y="300" text-anchor="middle" font-family="Kanit" font-size="16" fill="${O}" opacity=".7">ยังไม่มีเป็ด — ซื้อจากลุงมีได้เลย</text>`;
  dynEl.innerHTML = s;
}

// The kit's fences and duck house, depth-sorted with the props and ducks so they can pass behind them. A fence span
// sorts by its middle.
function penKitItems() {
  const fences = penFenceSprites().map(([id, u, v, k]) => {
    const du = id === 'kit.fence_span_se' ? .5 * k : 0, dv = id === 'kit.fence_span_sw' ? .5 * k : 0;
    return kitSprite(id, u, v, k, false, penPt(u + du, v + dv)[1]);
  });
  return PEN_LAYOUT.pen.map(p => kitSprite(...p)).concat(fences);
}

// Ducks as [ground y, svg] items so they sort with the nest, trough and basket. A negative animation delay taken
// from the clock keeps each duck's walk continuous when the pen re-renders.
const DUCK_SPOTS = [[600, 300, 11], [300, 365, 14], [665, 362, 10], [560, 408, 13], [305, 425, 15]];   // clear of the nest, trough and basket
function penDucks() {
  const t = performance.now() / 1000;
  return DUCK_SPOTS.slice(0, S.ducks).map(([x, y, dur], i) =>
    [y, `<g transform="translate(${x} ${y})"><ellipse cx="0" cy="3" rx="16" ry="3.5" fill="rgba(0,0,0,.15)"/><g class="duck" style="animation-duration:${dur}s;animation-delay:${-((t + i * 3.1) % dur).toFixed(2)}s"><g class="waddle" style="animation-delay:${i * .13}s"><g transform="scale(${gameScale('animal.duck').toFixed(3)})">${duckShape()}</g></g></g></g>`]);
}

function renderAnim() { animEl.innerHTML = ''; }   // animated layers now live in their scenes' depth sorts

function renderHUD() {
  const d = dateOf(S.day), se = seasonOf(S.day), inv = S.inventory;
  hud.innerHTML = `<div class="hb wx" title="${S.rain ? 'ฝนตก · Rain' : 'แดดออก · Sunny'}">${S.rain ? icon('rain') : icon('sun')}</div>
  <div class="hb date"><b>วันที่ ${S.day}<span> / ${CONFIG.LAST_DAY}</span></b><small>${d.date} ${MONTHS_TH[d.month]} · ${MONTHS_EN[d.month]} ${d.date}</small></div>
  <div class="hb season s-${se}"><b>${SEASONS[se].th}</b><small>${SEASONS[se].en}${S.rain ? ' · ฝนตก' : ''}</small></div>
  <div class="hb money"><b>฿${fmt(S.money)}</b><small>เงิน · Money</small></div>
  <div class="hb energy ${S.energy < CONFIG.TIRED_BELOW ? 'low' : ''}"><div class="ebar"><i style="width:${S.energy / CONFIG.MAX_ENERGY * 100}%"></i></div><small>แรง Energy ${S.energy}${S.energy < CONFIG.TIRED_BELOW ? ' · เหนื่อย!' : ''}</small></div>
  <div class="hb inv">
    <div class="inv-i" title="ปุ๋ย · Fertilizer"><div class="row">${icon('fertS')}<b>${inv.fertilizer}</b></div><small>ปุ๋ย</small></div>
    <div class="inv-i" title="ยาฉีดแมลง · Spray"><div class="row">${icon('sprayS')}<b>${inv.spray}</b></div><small>ยา</small></div>
    <div class="inv-i" title="อาหารเป็ด · Feed"><div class="row">${icon('feed')}<b>${inv.feed}</b></div><small>อาหาร</small></div>
    <div class="inv-i" title="เป็ด · Ducks"><div class="row">${icon('duck')}<b>${S.ducks}</b></div><small>เป็ด</small></div>
  </div>
  <div class="spacer"></div>
  <button class="hbtn" data-act="mute" title="เสียง · Sound">${Sound.muted ? icon('mute') : icon('sound')}</button>
  <button class="hbtn" data-act="menu" title="เมนู · Menu">${icon('menu')}</button>`;
}

const TOOLS = [['water', 'รดน้ำ', 'Water'], ['fertilize', 'ใส่ปุ๋ย', 'Fertilize'], ['spray', 'ฉีดยา', 'Spray'], ['cut', 'ถาง', 'Clear'], ['pick', 'เก็บ', 'Pick']];

function renderToolbar() {
  if (S.scene !== 'farm') { toolbar.style.display = 'none'; return; }
  toolbar.style.display = '';
  const dis = S.energy <= 0 ? 'disabled' : '';
  let s = TOOLS.map(([id, th, en]) => {
    const badge = id === 'fertilize' ? `<i class="badge">${S.inventory.fertilizer}</i>` : id === 'spray' ? `<i class="badge">${S.inventory.spray}</i>` : '';
    return `<button class="tool ${ui.tool === id ? 'sel' : ''}" data-act="tool" data-tool="${id}" ${dis} title="${en}">${icon(id)}<span>${th}</span><small>${en}</small>${badge}</button>`;
  }).join('');
  s += `<div class="sep"></div>`;
  s += CONFIG.CROPS.map((c, i) => `<button class="seed ${ui.tool === 'seed:' + i ? 'sel' : ''} ${S.inventory.seeds[i] ? '' : 'zero'}" data-act="tool" data-tool="seed:${i}" ${dis} title="${c.th} · ${c.en}">${packetSVG(i, 30, 34)}<b class="cnt">×${S.inventory.seeds[i]}</b></button>`).join('');
  s += `<button id="endday" data-act="endday">จบวัน<small>End Day</small></button>`;
  toolbar.innerHTML = s;
}

function renderFx() {
  if (!S.rain) { fxEl.innerHTML = ''; return; }
  fxEl.innerHTML = `<defs><pattern id="rp" width="40" height="60" patternUnits="userSpaceOnUse"><path d="M10 0l-4 14M30 26l-4 14M22 44l-3 10" stroke="#dff3ff" stroke-width="2" stroke-linecap="round" opacity=".75"/></pattern></defs>` +
    `<rect x="-300" width="1400" height="600" fill="#3a5a7a" opacity=".12"/><rect class="rainfall" x="-340" y="0" width="1480" height="660" fill="url(#rp)"/>`;
}

function renderHand() {
  if (!S || !S.hand) { handEl.style.display = 'none'; return; }
  handEl.style.display = 'block';
  handEl.innerHTML = `<svg viewBox="-16 -16 32 32" width="36" height="36">${S.hand.type === 'egg' ? eggIcon() : produceIcon(S.hand.crop)}</svg><b>×${S.hand.n}</b>`;
  posHand();
}

function posHand() { handEl.style.transform = `translate(${ui.px + 8}px, ${ui.py + 6}px)`; }

function render() {
  if (!S) return;
  if (ui.bgScene !== S.scene) {
    bgEl.innerHTML = { map: villageBG, market: marketBG, pen: penBG }[S.scene]?.() ?? farmBG();
    ui.bgScene = S.scene;
  }
  renderAnim();
  if (S.scene === 'farm') renderFarm(); else if (S.scene === 'pen') renderPen(); else if (S.scene === 'map') renderMap(); else dynEl.innerHTML = '';
  renderPanel(); renderHUD(); renderToolbar(); renderFx(); renderHand();
  if (typeof applyCam === 'function') applyCam();
}
