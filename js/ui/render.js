/* Rendering of the farm, duck pen, HUD, toolbar, rain and carried item. */
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
  s += signpost(!(S.energy > CONFIG.COST.walk));
  dynEl.innerHTML = s;
}

// Iso trough: ground point under its centre, and the half-size of its cavity (world px) for the feed surface.
const TROUGH = { at: [445, 472], inner: [58, 14] };

function renderPen() {
  let s = '';
  // nest with eggs
  const nestArt = Assets.has('prop.nest') ? Assets.image('prop.nest', 300, 312) : `${ell(300, 312, 62, 20, '#d9b25a', 0, 2.6)}${line('M246 306l14 6M262 318l16 -4M290 322l14 -6M318 320l12 4M338 312l12 -6M252 316l-6 4M350 316l6 4', '#a8842f', 1.6)}`;
  s += `<g data-act="egg" class="hot"><title>รังไข่ · Nest</title>${nestArt}`;
  const shown = Math.min(S.eggs, 12);
  for (let i = 0; i < shown; i++) {
    const col = i % 6, row = Math.floor(i / 6);
    s += `<g transform="translate(${262 + col * 15 + row * 7} ${306 - row * 9}) scale(.75)">${eggIcon()}</g>`;
  }
  s += `</g>`;
  s += `<text x="300" y="352" text-anchor="middle" font-family="Kanit" font-size="13" font-weight="600" fill="${O}">ไข่ในรัง ${S.eggs} ฟอง</text>` +
    `<text x="300" y="364" text-anchor="middle" font-family="Sarabun" font-size="10" fill="${O}">Eggs in nest — click to pick</text>`;
  // trough
  const fill = S.trough / CONFIG.DUCK.troughMax;
  const troughAsset = Assets.has('prop.trough');
  s += `<g data-act="trough" class="hot"><title>รางอาหาร · Trough</title>`;
  if (troughAsset) {
    // the iso trough asset is anchored at the ground under its centre; the feed is an iso surface inside its cavity
    const [tx, ty] = TROUGH.at, P = (x, y, z) => `${r(tx + (x - y) * .894)},${r(ty + (x + y) * .447 - z)}`;
    s += Assets.image('prop.trough', tx, ty);
    if (fill > 0) {
      const z = 17 + 17 * fill, [a, b] = TROUGH.inner;
      s += `<polygon points="${P(-a, -b, z)} ${P(a, -b, z)} ${P(a, b, z)} ${P(-a, b, z)}" fill="#e8c77a" stroke="#b8943e" stroke-width="1"/>` +
        line(Array.from({ length: S.trough * 5 }, (_, i) => { const u = -a + 6 + (i * 23) % (2 * a - 12), v = -b + 4 + (i * 7) % (2 * b - 8); return `M${P(u, v, z).replace(',', ' ')}h1.4`; }).join(''), '#8a5a22', 2);
    }
  } else {
    s += `<rect x="370" y="452" width="150" height="40" rx="6" fill="#9a6a3c" ${SW} stroke-width="3"/><rect x="378" y="458" width="134" height="18" rx="3" fill="#5a3a22"/>`;
    if (fill > 0) s += `<rect x="378" y="${458 + 18 * (1 - fill)}" width="134" height="${18 * fill}" rx="3" fill="#e8c77a"/>` +
      line(Array.from({ length: S.trough * 4 }, (_, i) => `M${384 + i * 6.5} ${470 - (i % 3) * 3}h1`).join(''), '#8a5a22', 2);
  }
  if (!troughAsset) s += `<rect x="378" y="484" width="8" height="16" fill="#7a4a26" ${SW} stroke-width="1.6"/><rect x="504" y="484" width="8" height="16" fill="#7a4a26" ${SW} stroke-width="1.6"/>`;
  s += '</g>';
  s += `<text x="445" y="518" text-anchor="middle" font-family="Kanit" font-size="13" font-weight="600" fill="${O}">รางอาหาร ${S.trough}/${CONFIG.DUCK.troughMax}</text>` +
    `<text x="445" y="530" text-anchor="middle" font-family="Sarabun" font-size="10" fill="${O}">Trough — click to add feed (have ${S.inventory.feed})</text>`;
  // basket
  const hasEgg = S.hand && S.hand.type === 'egg';
  const basketArt = Assets.has('prop.egg_basket') ? Assets.image('prop.egg_basket', 650, 478) : `<path d="M620 452Q650 420 680 452" fill="none" stroke="${O}" stroke-width="3"/>` +
    `<path d="M612 452H688L680 494H620Z" fill="#d6ad62" ${SW} stroke-width="3"/>` + line('M616 466H684M618 480H682M634 452V494M650 452V494M666 452V494', '#9a7338', 1.4) +
    `<g transform="translate(640 448) scale(.6)">${eggIcon()}</g><g transform="translate(656 446) scale(.6)">${eggIcon()}</g>`;
  s += `<g data-act="basket" class="hot ${hasEgg ? 'glow' : ''}"><title>ตะกร้าขายไข่ · Egg basket</title>${basketArt}</g>`;
  s += `<text x="650" y="512" text-anchor="middle" font-family="Kanit" font-size="13" font-weight="600" fill="${O}">ตะกร้าขายไข่ ฿${CONFIG.DUCK.eggPrice}</text>` +
    `<text x="650" y="524" text-anchor="middle" font-family="Sarabun" font-size="10" fill="${O}">Egg basket — drop eggs to sell</text>`;
  if (S.ducks === 0) s += `<text x="500" y="370" text-anchor="middle" font-family="Kanit" font-size="16" fill="${O}" opacity=".7">ยังไม่มีเป็ด — ซื้อจากลุงมีได้เลย</text>`;
  dynEl.innerHTML = s;
}

function renderAnim() {
  const key = S.scene + ':' + (S.scene === 'pen' ? S.ducks : '');
  if (ui.animKey === key) return;
  ui.animKey = key;
  if (S.scene !== 'pen') { animEl.innerHTML = ''; return; }
  const spots = [[470, 300, 11, 0], [580, 340, 14, -3], [420, 400, 10, -6], [640, 410, 13, -2], [520, 380, 15, -8]];
  let s = '';
  for (let i = 0; i < S.ducks; i++) {
    const [x, y, dur, delay] = spots[i];
    s += `<g transform="translate(${x} ${y})"><ellipse cx="0" cy="3" rx="16" ry="3.5" fill="rgba(0,0,0,.15)"/><g class="duck" style="animation-duration:${dur}s;animation-delay:${delay}s"><g class="waddle" style="animation-delay:${i * .13}s">${duckShape()}</g></g></g>`;
  }
  animEl.innerHTML = s;
}

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
    bgEl.innerHTML = S.scene === 'market' ? marketBG() : S.scene === 'pen' ? penBG() : farmBG();
    ui.bgScene = S.scene;
  }
  renderAnim();
  if (S.scene === 'farm') renderFarm(); else if (S.scene === 'pen') renderPen(); else dynEl.innerHTML = '';
  renderPanel(); renderHUD(); renderToolbar(); renderFx(); renderHand();
}
