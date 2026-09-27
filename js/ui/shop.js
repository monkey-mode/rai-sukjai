/* Shop panels: Auntie Daeng's market stall and Uncle Mee's duck pen. */
'use strict';

function renderPanel() {
  if (S.scene === 'market') {
    const greet = [['มาแล้วเหรอหลาน วันนี้เอาอะไรดีจ๊ะ', "Welcome, dear! What'll it be?"], ['ผักสด ๆ ทั้งนั้นจ้ะ', 'All fresh today!'], ['ปุ๋ยดีผักก็งามนะ', 'Good fertilizer, good greens']][ui.greet % 3];
    panel.innerHTML = `<div class="bubble" style="left:14px;top:34px;width:180px">${greet[0]}<small>${greet[1]}</small></div>
    ${ui.shopOpen ? `<div class="shop-board"><button class="shop-x" data-act="shop-close" title="ปิด · Close">×</button><h3>ร้านป้าแดง <span class="en">Auntie Daeng's shop</span><span class="money-now k">฿${fmt(S.money)}</span></h3>
    <div class="tabs">${SHOP_TABS.map(t => `<button class="tab ${t.id === shopTab().id ? 'on' : ''}" data-act="shop-tab" data-tab="${t.id}">${t.th}<small>${t.en}</small></button>`).join('')}</div>
    ${shopTab().body()}</div>`
    : `<button class="shop-open glow" data-act="shop-open">🛒 ซื้อของ<small>Open the shop</small></button>`}
    <button class="back" data-act="go-home">← กลับไร่<small>Walk home (−5 energy)</small></button>`;
  } else if (S.scene === 'pen') {
    const D = CONFIG.DUCK;
    panel.innerHTML = `<div class="bubble" style="left:8px;top:6px;width:176px">เป็ดกินอิ่ม ไข่ก็ดกนะหลาน<small>Well-fed ducks lay every day</small></div>
    <div class="mee-shop"><h3>คอกเป็ดลุงมี<br><span class="en">Uncle Mee's duck pen</span></h3>
      <div class="line"><span>เป็ดไข่ <b>${S.ducks}/${D.max}</b></span><button data-act="buy-duck" ${S.ducks >= D.max ? 'disabled' : ''}>ซื้อ ฿${fmt(D.price)}</button></div>
      <div class="line"><span>อาหาร <b>${S.inventory.feed}</b></span><button data-act="buy-feed">฿${D.feedPrice} / ${D.feedPortions}</button></div>
      <div class="note">ใส่อาหารในรางได้วันละ ${D.troughMax} ส่วน เป็ดที่ได้กินจะออกไข่ 1 ฟองในเช้าวันถัดไป ถ้ารางว่างตอนจบวัน เป็ดอาจหิวตาย<br><i>Feed up to ${D.troughMax}/day. Each fed duck lays an egg. Empty trough = risk.</i></div>
      <div class="line" style="margin-bottom:0"><span class="k">฿${fmt(S.money)}</span></div>
    </div>
    <button class="back" data-act="go-home">← กลับไร่<small>Walk home (−5 energy)</small></button>`;
  } else panel.innerHTML = '';
}

// Auntie Daeng's shop tabs. A future feature adds its goods by adding a tab (or cards to one) here.
const SHOP_TABS = [
  { id: 'seeds', th: 'เมล็ดพันธุ์', en: 'Seeds', body: () => `<div class="grid">${CONFIG.CROPS.map(seedCard).join('')}</div>` },
  { id: 'supplies', th: 'ของใช้', en: 'Supplies', body: () => `<div class="supplies">${supplyCard('fertilizer')}${supplyCard('spray')}</div>` },
  { id: 'livestock', th: 'สัตว์เลี้ยง', en: 'Livestock', body: () => `<div class="supplies">${duckCard()}${feedCard()}${soonCard('ควาย', 'Water buffalo', 'ไถนา ขนของ ช่วยงานในไร่')}</div>` },
];
const shopTab = () => SHOP_TABS.find(t => t.id === ui.shopTab) || SHOP_TABS[0];

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
