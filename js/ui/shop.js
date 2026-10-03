/* Shop panels: Auntie Daeng's market stall and Uncle Mee's duck pen. */
'use strict';

const BACK_TO_MAP = `<button class="back" data-act="go-map">← หมู่บ้าน<small>Back to the village map</small></button>`;

function renderPanel() {
  if (S.scene === 'market') {
    const greet = [['มาแล้วเหรอหลาน วันนี้เอาอะไรดีจ๊ะ', "Welcome, dear! What'll it be?"], ['ผักสด ๆ ทั้งนั้นจ้ะ', 'All fresh today!'], ['ปุ๋ยดีผักก็งามนะ', 'Good fertilizer, good greens']][ui.greet % 3];
    panel.innerHTML = `<div class="bubble" style="left:236px;top:196px;width:180px">${greet[0]}<small>${greet[1]}</small></div>
    ${ui.shopOpen ? shopBoard(SELLERS[ui.shopOpen])
    : `<button class="shop-open glow" data-act="shop-open" data-seller="daeng">🛒 ซื้อของป้าแดง<small>Seeds & supplies</small></button>`}
    ${BACK_TO_MAP}`;
  } else if (S.scene === 'pen') {
    panel.innerHTML = `<div class="bubble" style="left:8px;top:92px;width:176px">เป็ดกินอิ่ม ไข่ก็ดกนะหลาน<small>Well-fed ducks lay every day</small></div>
    ${ui.shopOpen ? shopBoard(SELLERS[ui.shopOpen])
    : `<button class="shop-open mee glow" data-act="shop-open" data-seller="mee">🦆 ซื้อสัตว์ลุงมี<small>Ducks & feed</small></button>`}
    ${BACK_TO_MAP}`;
  } else panel.innerHTML = '';
}

// Market sellers, each with their own shop. A future feature adds a seller (and a spot in the market) here.
const SELLERS = {
  daeng: { th: 'ร้านป้าแดง', en: "Auntie Daeng's stall — seeds & supplies",
    body: () => `<div class="grid">${CONFIG.CROPS.map(seedCard).join('')}</div><div class="supplies">${supplyCard('fertilizer')}${supplyCard('spray')}</div>` },
  mee: { th: 'คอกเป็ดลุงมี', en: "Uncle Mee's livestock",
    body: () => `<div class="supplies">${duckCard()}${feedCard()}${soonCard('ควาย', 'Water buffalo', 'ไถนา ขนของ ช่วยงานในไร่')}</div>` +
      `<div class="note">ใส่อาหารในรางได้วันละ ${CONFIG.DUCK.troughMax} ส่วน เป็ดที่ได้กินจะออกไข่ 1 ฟองในเช้าวันถัดไป ถ้ารางว่างตอนจบวัน เป็ดอาจหิวตาย <i>Feed up to ${CONFIG.DUCK.troughMax}/day; each fed duck lays an egg; an empty trough is a risk.</i></div>` },
};
function shopBoard(sl) {
  return `<div class="shop-board ${ui.shopOpen}"><button class="shop-x" data-act="shop-close" title="ปิด · Close">×</button><h3>${sl.th} <span class="en">${sl.en}</span><span class="money-now k">฿${fmt(S.money)}</span></h3>${sl.body()}</div>`;
}

// Livestock cards reuse the duck pen's actions (Uncle Mee sells the same things at the pen).
function duckCard() {
  const D = CONFIG.DUCK, full = S.ducks >= D.max;
  return `<div class="scard">${icon('duck')}<div><div class="nm">เป็ดไข่<small>Laying duck — lives in the duck pen</small></div>
  <div class="ds" style="min-height:0">กินอาหารแล้วออกไข่วันละฟอง ขายได้ฟองละ ฿${D.eggPrice}</div></div>
  <div class="buy"><button data-act="buy-duck" ${full || S.money < D.price ? 'disabled' : ''}>฿${fmt(D.price)}</button><span class="own">${full ? 'คอกเต็ม' : 'มี'} ${S.ducks}/${D.max}</span></div></div>`;
}
// A livestock item that a future feature will make buyable.
function soonCard(th, en, ds) {
  return `<div class="scard soon">${Assets.has('animal.buffalo') ? Assets.img('animal.buffalo', 44, 44) : ''}<div><div class="nm">${th}<small>${en}</small></div>
  <div class="ds" style="min-height:0">${ds}</div></div>
  <div class="buy"><button disabled>เร็ว ๆ นี้</button><span class="own">Coming soon</span></div></div>`;
}
function feedCard() {
  const D = CONFIG.DUCK;
  return `<div class="scard">${icon('feed')}<div><div class="nm">อาหารเป็ด<small>Duck feed — ${D.feedPortions} portions</small></div>
  <div class="ds" style="min-height:0">ใส่ในรางที่คอกเป็ด เป็ดที่กินอิ่มจะออกไข่</div></div>
  <div class="buy"><button data-act="buy-feed" ${S.money < D.feedPrice ? 'disabled' : ''}>฿${D.feedPrice}</button><span class="own">มี ${S.inventory.feed}</span></div></div>`;
}

function stars(n) { return '★'.repeat(n) + '<span style="opacity:.3">' + '★'.repeat(5 - n) + '</span>'; }

function priceLevel(c) { return c.seed <= 100 ? 1 : c.seed <= 300 ? 2 : c.seed <= 600 ? 3 : c.seed <= 900 ? 4 : 5; }

const SPEED = [['เร็วมาก', 'very fast'], ['เร็ว', 'fast'], ['ปานกลาง', 'medium'], ['ช้า', 'slow'], ['ช้ามาก', 'very slow'], ['ช้าที่สุด', 'slowest']];

function seedCard(c, i) {
  const pts = 4 * (c.k + 1), fast = Math.ceil(pts / 2);
  return `<div class="scard"><div class="top">${packetSVG(i)}<div class="nm">${c.th}<small>${c.en}</small></div></div>
  <div class="ds">${c.desc}</div>
  <div class="st">ราคา <span class="stars">${stars(priceLevel(c))}</span><br><span title="Growth: ${SPEED[c.k][1]}">โต${SPEED[c.k][0]} ~${fast}–${pts} วัน</span><br>เก็บได้ ${c.harvests} ครั้ง · ขาย ฿${c.sell}/ชิ้น</div>
  <div class="buy"><button data-act="buy-seed" data-c="${i}" ${S.money < c.seed ? 'disabled' : ''}>฿${fmt(c.seed)}</button><span class="own">มี ${S.inventory.seeds[i]}</span></div></div>`;
}

function supplyCard(k) {
  const it = CONFIG.SUPPLIES[k];
  return `<div class="scard">${k === 'fertilizer' ? icon('fertilize') : icon('spray')}<div><div class="nm">${it.th}<small>${it.en} — ${it.uses} uses</small></div>
  <div class="ds" style="min-height:0">${k === 'fertilizer' ? 'ใส่แล้วต้นโตเพิ่มอีกขั้น วันละครั้งต่อแปลง' : 'ฆ่าแมลงที่เกาะต้นระยะใกล้สุก'}</div></div>
  <div class="buy"><button data-act="buy-supply" data-k="${k}" ${S.money < it.price ? 'disabled' : ''}>฿${it.price}</button><span class="own">มี ${S.inventory[k]}</span></div></div>`;
}
