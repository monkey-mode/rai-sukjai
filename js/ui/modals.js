/* Toasts and modal cards: title, how-to, menu, morning report, year-end summary. */
'use strict';

let toastTimer = 0;

function toast(r) {
  if (!r || !r.th) return;
  toastEl.innerHTML = `${r.th}${r.en ? `<small>${r.en}</small>` : ''}`;
  toastEl.className = 'on' + (r.ok ? '' : ' bad');
  toastEl.style.top = S && S.scene !== 'farm' ? '556px' : 'calc(478px - (var(--ui, 1) - 1) * 100px)';   // above the (scaled) toolbar
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastEl.className = ''; }, 2000);
}

// English count with the right plural: plural(1, 'egg') -> '1 egg', plural(2, 'egg') -> '2 eggs'.
const plural = (k, word) => `${k} ${word}${k === 1 ? '' : 's'}`;

function showModal(html, cls = '') {
  modal.innerHTML = `<div class="card ${cls}">${html}</div>`;
  modal.classList.add('on');
  if (typeof applyCam === 'function') applyCam();
}

function closeModal() { modal.classList.remove('on'); modal.innerHTML = ''; if (typeof applyCam === 'function') applyCam(); }

function showTitle() {
  const logo = Assets.has('ui.logo') ? `<div class="logo-img">${Assets.img('ui.logo', 420, 131)}</div>` : `<div class="logo">ไร่สุขใจ</div><div class="logo-en">RAI SUKJAI</div>`;
  showModal(`${logo}
  <p style="margin:10px 0 4px">ปลูกผัก เลี้ยงเป็ด ขายของที่ตลาด ให้รวยที่สุดภายใน 365 วัน<br><small class="en">Grow crops, raise ducks and get rich in one Thai country year.</small></p>
  <div class="btns">${hasSave() ? `<button data-act="continue">เล่นต่อ<small>Continue</small></button>` : ''}
  <button data-act="${hasSave() ? 'confirm-new' : 'new-game'}" style="background:#9be15d">เริ่มเกมใหม่<small>New game</small></button>
  <button data-act="how">วิธีเล่น<small>How to play</small></button></div>`, 'title-card');
}

function showHow() {
  const D = CONFIG.DUCK;
  showModal(`<h2>วิธีเล่น</h2><span class="en">How to play</span><div class="howto">
  <p><b>เริ่มต้น</b> วันที่ 1 มกราคม มีเงิน ฿${CONFIG.START_MONEY} แรง ${CONFIG.START_ENERGY} เกมจบหลังวันที่ ${CONFIG.LAST_DAY}</p>
  <p><b>ปลูก</b> ซื้อเมล็ดที่แผงป้าแดง เลือกซองเมล็ดจากแถบเครื่องมือ แล้วคลิกแปลงว่าง — หนึ่งซองปลูกเต็ม 12 หลุม</p>
  <p><b>ดูแล</b> รดน้ำ (1 แรง) และใส่ปุ๋ย (1 แรง + ปุ๋ย 1) ได้วันละครั้งต่อหลุม ตอนจบวันต้นไม้ได้ 1 แต้มจากน้ำ และ 1 แต้มจากปุ๋ย พอครบแต้มก็โตขึ้นหนึ่งขั้น ถึงขั้นที่ 5 ก็สุก</p>
  <p><b>ระวัง</b> ต้นที่สุกแล้วยังได้แต้มต่อจะเน่า ต้นขั้นที่ 4 อาจมีแมลงลง ต้องฉีดยา (1 แรง + ยา 1) ไม่งั้นอาจตาย ฝนตกช่วยรดน้ำให้ทุกหลุม</p>
  <p><b>เก็บและขาย</b> ใช้ "เก็บ" กับต้นที่สุก ของจะติดมือไว้ แล้วคลิกเกวียนเพื่อขาย พืชบางชนิดเก็บได้หลายรอบ (จุดสีเหลืองคือรอบที่เหลือ)</p>
  <p><b>ถาง</b> (1 แรง) ล้างหลุมที่เหี่ยวหรือไม่ต้องการ ต้องถางให้หมดทั้งแปลงก่อนปลูกพืชใหม่</p>
  <p><b>เป็ด</b> ซื้อเป็ดจากลุงมีที่คอกเป็ด ฿${fmt(D.price)} (สูงสุด ${D.max} ตัว) ใส่อาหารในรางวันละไม่เกิน ${D.troughMax} ส่วน เป็ดที่กินอิ่มออกไข่ฟองละ ฿${D.eggPrice} ถ้ารางว่างตอนจบวันเป็ดอาจตาย</p>
  <p><b>เดินทาง</b> ป้ายไปหมู่บ้านพาไปแผนที่หมู่บ้าน (ไม่ใช้แรง) กดที่ตลาด คอกเป็ด หรือไร่ของเราเพื่อเดินไป ครั้งละ ${CONFIG.COST.walk} แรง ต้องมีแรงมากกว่า ${CONFIG.COST.walk} ถึงจะไปตลาดหรือคอกเป็ดได้</p>
  <p><small class="en">Water & fertilize each plot once a day to earn growth points. Spray bugs on stage-4 plants. Pick ripe crops, then click the ox cart to sell. Clear withered plots. Feed ducks for eggs. Press End Day to sleep.</small></p>
  </div><div class="btns"><button data-act="${S ? 'close' : 'title'}">เข้าใจแล้ว<small>Got it</small></button></div>`);
}

function showMenu() {
  showModal(`<h2>พักก่อน</h2><span class="en">Paused</span>
  <p style="margin:4px 0">เกมบันทึกอัตโนมัติทุกครั้งที่ทำอะไร<br><small class="en">The game saves automatically.</small></p>
  <div class="btns"><button data-act="close" style="background:#9be15d">เล่นต่อ<small>Resume</small></button>
  <button data-act="how">วิธีเล่น<small>How to play</small></button>
  <button data-act="confirm-new">เริ่มใหม่<small>New game</small></button></div>`);
}

function showConfirmNew() {
  showModal(`<h2>เริ่มเกมใหม่?</h2><span class="en">Start over?</span><p>ไร่เดิมจะหายไปทั้งหมด<br><small class="en">Your current farm will be lost.</small></p>
  <div class="btns"><button data-act="new-game" style="background:#e2553f;color:#fff">เริ่มใหม่<small>Yes, new game</small></button>
  <button data-act="${S ? 'close' : 'title'}">ยกเลิก<small>Cancel</small></button></div>`);
}

function showReport() {
  const r = S.lastReport; if (!r) return;
  const d = dateOf(S.day), se = seasonOf(S.day), items = [];
  if (r.rain) items.push(['🌧 ฝนตก! รดน้ำให้ทุกหลุมแล้ว', 'Rain watered every plot']);
  if (r.ripened) items.push([`สุกพร้อมเก็บ ${r.ripened} ต้น`, `${plural(r.ripened, 'plant')} ripened`]);
  else if (r.grew) items.push([`ต้นไม้โตขึ้น ${r.grew} ต้น`, `${plural(r.grew, 'plant')} grew`]);
  if (r.rotted) items.push([`ผลผลิตสุกเกินจนเน่า ${r.rotted} ต้น — ต้องถาง`, `${plural(r.rotted, 'overripe plant')} rotted`]);
  if (r.bugDeaths) items.push([`แมลงกินจนตาย ${r.bugDeaths} ต้น`, `${plural(r.bugDeaths, 'plant')} killed by bugs`]);
  if (r.newBugs) items.push([`มีแมลงลง ${r.newBugs} ต้น — รีบฉีดยา!`, `Bugs on ${plural(r.newBugs, 'plant')} — spray them!`]);
  if (r.eggsLaid) items.push([`เป็ดออกไข่ ${r.eggsLaid} ฟอง`, `Ducks laid ${plural(r.eggsLaid, 'egg')}`]);
  if (r.duckDied) items.push(['เป็ดหิวตาย 1 ตัว เพราะรางอาหารว่าง', 'A hungry duck died (empty trough)']);
  if (!items.length) items.push(['คืนนี้เงียบสงบ', 'A quiet night']);
  showModal(`<h2>อรุณสวัสดิ์!</h2><span class="en">Good morning — day ${S.day}</span>
  <p style="margin:0 0 6px" class="k">วันที่ ${S.day} · ${d.date} ${MONTHS_TH[d.month]} · ${SEASONS[se].th}</p>
  <ul class="report-list">${items.map(([t, e]) => `<li>${t} <small>${e}</small></li>`).join('')}</ul>
  <div class="btns"><button data-act="close" style="background:#9be15d">ไปทำไร่กัน<small>Let's farm</small></button></div>`);
}

function showGameOver() {
  const st = S.stats, profit = S.money - CONFIG.START_MONEY;
  showModal(`<h2>ครบหนึ่งปีแล้ว!</h2><span class="en">A year on the farm is over</span>
  <div class="k">เงินทั้งหมด · Final money</div><div class="big-money">฿${fmt(S.money)}</div>
  <p style="margin:2px 0 8px">${profit >= 0 ? 'กำไร' : 'ขาดทุน'} ฿${fmt(Math.abs(profit))} <small class="en">${profit >= 0 ? 'profit' : 'loss'} vs. ฿${CONFIG.START_MONEY} start</small></p>
  <ul class="report-list">
    <li>ขายผลผลิต ${fmt(st.cropsSold)} ชิ้น <small>crops sold</small></li>
    <li>ขายไข่เป็ด ${fmt(st.eggsSold)} ฟอง <small>eggs sold</small></li>
    <li>รายได้รวม ฿${fmt(st.earned)} · ใช้จ่าย ฿${fmt(st.spent)} <small>earned · spent</small></li>
    <li>เป็ดในคอก ${S.ducks} ตัว <small>ducks left</small></li>
  </ul>
  <p style="margin:6px 0 0">${S.money >= 100000 ? 'เศรษฐีบ้านไร่! 🌾' : S.money >= 20000 ? 'ชาวไร่มือทอง' : S.money >= 2000 ? 'พออยู่พอกิน สุขใจ' : 'ปีหน้าเอาใหม่นะ'}</p>
  <div class="btns"><button data-act="new-game" style="background:#9be15d">เล่นอีกปี<small>Play again</small></button></div>`);
}
