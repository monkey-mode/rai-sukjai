/* Rendering of the farm, duck pen, HUD, toolbar, rain and carried item. */
'use strict';

const FX = [24, 248], FY = [262, 404], PW = 48, PH = 38, SX = 51, SY = 41;

function plotSVG(f, fi, p, pi) {
  const x = FX[fi % 2] + (pi % 4) * SX, y = FY[fi >> 1] + Math.floor(pi / 4) * SY;
  let g = `<g class="plot" data-act="plot" data-f="${fi}" data-p="${pi}">`;
  g += `<rect class="soil" x="${x}" y="${y}" width="${PW}" height="${PH}" rx="6" fill="${p.watered ? '#7a4e2e' : '#b7824f'}" stroke="${O}" stroke-width="2"/>`;
  g += `<path d="M${x + 6} ${y + 13}H${x + PW - 6}M${x + 6} ${y + 25}H${x + PW - 6}" stroke="${p.watered ? '#5e3a20' : '#9c6a3c'}" stroke-width="2" stroke-linecap="round"/>`;
  if (p.fertilized) g += [[8, 8], [38, 10], [14, 30], [40, 30], [26, 6]].map(([dx, dy]) => `<circle cx="${x + dx}" cy="${y + dy}" r="1.8" fill="#f4f0e0" stroke="${O}" stroke-width=".6"/>`).join('');
  if (p.stage > 0 && f.crop !== null) {
    g += `<g pointer-events="none" transform="translate(${x + PW / 2} ${y + PH - 6})">${plantArt(f.crop, p.stage)}${p.bug ? BUGS : ''}</g>`;
    const H = CONFIG.CROPS[f.crop].harvests;
    if (H > 1 && p.stage !== WITHERED) {
      for (let i = 0; i < H - p.harvests; i++) g += `<circle cx="${x + 5 + i * 4.5}" cy="${y + PH - 4}" r="1.7" fill="#ffe066" stroke="${O}" stroke-width=".7" pointer-events="none"/>`;
    }
  }
  return g + '</g>';
}

function renderFarm() {
  let s = '';
  S.fields.forEach((f, fi) => {
    const fx = FX[fi % 2], fy = FY[fi >> 1];
    s += `<rect x="${fx - 7}" y="${fy - 7}" width="${4 * SX - 3 + 14}" height="${3 * SY - 3 + 14}" rx="12" fill="#8fb04a" stroke="${O}" stroke-width="3"/>`;
  });
  S.fields.forEach((f, fi) => f.plots.forEach((p, pi) => { s += plotSVG(f, fi, p, pi); }));
  S.fields.forEach((f, fi) => {
    const fx = FX[fi % 2], fy = FY[fi >> 1];
    const c = f.crop === null ? null : CONFIG.CROPS[f.crop];
    const label = `แปลง ${fi + 1} · ${c ? c.th : 'ว่าง'}`;
    const w = 20 + label.length * 7.2;
    s += `<g pointer-events="none" transform="translate(${fx - 4} ${fy - 21})"><rect width="${w}" height="16" rx="5" fill="#fff4d6" stroke="${O}" stroke-width="2" opacity=".95"/>` +
      `<text x="7" y="12" font-family="Kanit" font-size="11" font-weight="500" fill="${O}">${label}</text></g>`;
  });
  s += farmer(500, 396, S.energy < CONFIG.TIRED_BELOW);
  s += dragonJar(500, 408);
  s += oxCart(560, 520, S.hand && S.hand.type === 'crop');
  s += signpost(!(S.energy > CONFIG.COST.walk));
  dynEl.innerHTML = s;
}

function renderPen() {
  let s = '';
  // nest with eggs
  s += `<g data-act="egg" class="hot"><title>รังไข่ · Nest</title>${ell(300, 312, 62, 20, '#d9b25a', 0, 2.6)}${line('M246 306l14 6M262 318l16 -4M290 322l14 -6M318 320l12 4M338 312l12 -6M252 316l-6 4M350 316l6 4', '#a8842f', 1.6)}`;
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
  s += `<g data-act="trough" class="hot"><title>รางอาหาร · Trough</title><rect x="370" y="452" width="150" height="40" rx="6" fill="#9a6a3c" ${SW} stroke-width="3"/>` +
    `<rect x="378" y="458" width="134" height="18" rx="3" fill="#5a3a22"/>`;
  if (fill > 0) s += `<rect x="378" y="${458 + 18 * (1 - fill)}" width="134" height="${18 * fill}" rx="3" fill="#e8c77a"/>` +
    line(Array.from({ length: S.trough * 4 }, (_, i) => `M${384 + i * 6.5} ${470 - (i % 3) * 3}h1`).join(''), '#8a5a22', 2);
  s += `<rect x="378" y="484" width="8" height="16" fill="#7a4a26" ${SW} stroke-width="1.6"/><rect x="504" y="484" width="8" height="16" fill="#7a4a26" ${SW} stroke-width="1.6"/></g>`;
  s += `<text x="445" y="518" text-anchor="middle" font-family="Kanit" font-size="13" font-weight="600" fill="${O}">รางอาหาร ${S.trough}/${CONFIG.DUCK.troughMax}</text>` +
    `<text x="445" y="530" text-anchor="middle" font-family="Sarabun" font-size="10" fill="${O}">Trough — click to add feed (have ${S.inventory.feed})</text>`;
  // basket
  const hasEgg = S.hand && S.hand.type === 'egg';
  s += `<g data-act="basket" class="hot ${hasEgg ? 'glow' : ''}"><title>ตะกร้าขายไข่ · Egg basket</title><path d="M620 452Q650 420 680 452" fill="none" stroke="${O}" stroke-width="3"/>` +
    `<path d="M612 452H688L680 494H620Z" fill="#d6ad62" ${SW} stroke-width="3"/>` + line('M616 466H684M618 480H682M634 452V494M650 452V494M666 452V494', '#9a7338', 1.4) +
    `<g transform="translate(640 448) scale(.6)">${eggIcon()}</g><g transform="translate(656 446) scale(.6)">${eggIcon()}</g></g>`;
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
  hud.innerHTML = `<div class="hb wx" title="${S.rain ? 'ฝนตก · Rain' : 'แดดออก · Sunny'}">${S.rain ? ICON.rain : ICON.sun}</div>
  <div class="hb date"><b>วันที่ ${S.day}<span> / ${CONFIG.LAST_DAY}</span></b><small>${d.date} ${MONTHS_TH[d.month]} · ${MONTHS_EN[d.month]} ${d.date}</small></div>
  <div class="hb season s-${se}"><b>${SEASONS[se].th}</b><small>${SEASONS[se].en}${S.rain ? ' · ฝนตก' : ''}</small></div>
  <div class="hb money"><b>฿${fmt(S.money)}</b><small>เงิน · Money</small></div>
  <div class="hb energy ${S.energy < CONFIG.TIRED_BELOW ? 'low' : ''}"><div class="ebar"><i style="width:${S.energy / CONFIG.MAX_ENERGY * 100}%"></i></div><small>แรง Energy ${S.energy}${S.energy < CONFIG.TIRED_BELOW ? ' · เหนื่อย!' : ''}</small></div>
  <div class="hb inv">
    <div class="inv-i" title="ปุ๋ย · Fertilizer"><div class="row">${ICON.fertS}<b>${inv.fertilizer}</b></div><small>ปุ๋ย</small></div>
    <div class="inv-i" title="ยาฉีดแมลง · Spray"><div class="row">${ICON.sprayS}<b>${inv.spray}</b></div><small>ยา</small></div>
    <div class="inv-i" title="อาหารเป็ด · Feed"><div class="row">${ICON.feed}<b>${inv.feed}</b></div><small>อาหาร</small></div>
    <div class="inv-i" title="เป็ด · Ducks"><div class="row">${ICON.duck}<b>${S.ducks}</b></div><small>เป็ด</small></div>
  </div>
  <div class="spacer"></div>
  <button class="hbtn" data-act="mute" title="เสียง · Sound">${Sound.muted ? ICON.mute : ICON.sound}</button>
  <button class="hbtn" data-act="menu" title="เมนู · Menu">${ICON.menu}</button>`;
}

const TOOLS = [['water', 'รดน้ำ', 'Water'], ['fertilize', 'ใส่ปุ๋ย', 'Fertilize'], ['spray', 'ฉีดยา', 'Spray'], ['cut', 'ถาง', 'Clear'], ['pick', 'เก็บ', 'Pick']];

function renderToolbar() {
  if (S.scene !== 'farm') { toolbar.style.display = 'none'; return; }
  toolbar.style.display = '';
  const dis = S.energy <= 0 ? 'disabled' : '';
  let s = TOOLS.map(([id, th, en]) => {
    const badge = id === 'fertilize' ? `<i class="badge">${S.inventory.fertilizer}</i>` : id === 'spray' ? `<i class="badge">${S.inventory.spray}</i>` : '';
    return `<button class="tool ${ui.tool === id ? 'sel' : ''}" data-act="tool" data-tool="${id}" ${dis} title="${en}">${ICON[id]}<span>${th}</span><small>${en}</small>${badge}</button>`;
  }).join('');
  s += `<div class="sep"></div>`;
  s += CONFIG.CROPS.map((c, i) => `<button class="seed ${ui.tool === 'seed:' + i ? 'sel' : ''} ${S.inventory.seeds[i] ? '' : 'zero'}" data-act="tool" data-tool="seed:${i}" ${dis} title="${c.th} · ${c.en}">${packetSVG(i, 30, 34)}<b class="cnt">×${S.inventory.seeds[i]}</b></button>`).join('');
  s += `<button id="endday" data-act="endday">จบวัน<small>End Day</small></button>`;
  toolbar.innerHTML = s;
}

function renderFx() {
  if (!S.rain) { fxEl.innerHTML = ''; return; }
  fxEl.innerHTML = `<defs><pattern id="rp" width="40" height="60" patternUnits="userSpaceOnUse"><path d="M10 0l-4 14M30 26l-4 14M22 44l-3 10" stroke="#dff3ff" stroke-width="2" stroke-linecap="round" opacity=".75"/></pattern></defs>` +
    `<rect width="800" height="600" fill="#3a5a7a" opacity=".12"/><rect class="rainfall" x="-40" y="0" width="880" height="660" fill="url(#rp)"/>`;
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
