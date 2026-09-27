/* Player actions. Each mutates the state and returns {ok, th, en} for the toast. */
'use strict';

/* ---------- Player actions (mutate state, return a result message) ---------- */
function res(ok, th, en) { return { ok, th: th || '', en: en || '' }; }

const OK = () => res(true);

function energyBlock(s, cost) {
  if (s.energy <= 0) return res(false, 'หมดแรงแล้ว… กด "จบวัน" เพื่อพักผ่อน', 'Out of energy — end the day to rest');
  if (s.energy < cost) return res(false, 'เหนื่อยแล้ว…', "I'm tired");
  return null;
}

function normalizeField(f) {
  if (f.plots.every(p => p.stage === 0)) f.crop = null;
}

function applyTool(s, tool, fi, pi) {
  const f = s.fields[fi], p = f && f.plots[pi];
  if (!p) return res(false);
  if (tool && tool.startsWith('seed:')) return plantField(s, fi, +tool.slice(5));
  const C = CONFIG.COST;
  let block;
  switch (tool) {
    case 'water':
      if (!isGrowing(p)) return res(false, p.stage === WITHERED ? 'ต้นนี้เหี่ยวแล้ว ต้องถางทิ้ง' : 'ยังไม่มีต้นไม้ให้รดน้ำ', p.stage === WITHERED ? 'Withered — clear it' : 'Nothing planted here');
      if (s.rain) return res(false, 'วันนี้ฝนตก รดน้ำให้แล้ว', 'The rain already watered it');
      if (p.watered) return res(false, 'รดน้ำแปลงนี้แล้ววันนี้', 'Already watered today');
      if ((block = energyBlock(s, C.water))) return block;
      s.energy -= C.water; p.watered = true;
      return OK();
    case 'fertilize':
      if (!isGrowing(p)) return res(false, 'ยังไม่มีต้นไม้ให้ใส่ปุ๋ย', 'Nothing to fertilize');
      if (p.fertilized) return res(false, 'ใส่ปุ๋ยแปลงนี้แล้ววันนี้', 'Already fertilized today');
      if (s.inventory.fertilizer < 1) return res(false, 'ปุ๋ยหมด ไปซื้อที่แผงป้าแดง', 'Out of fertilizer');
      if ((block = energyBlock(s, C.fertilize))) return block;
      s.energy -= C.fertilize; s.inventory.fertilizer--; p.fertilized = true;
      return OK();
    case 'spray':
      if (!p.bug) return res(false, 'ต้นนี้ไม่มีแมลง', 'No bugs here');
      if (s.inventory.spray < 1) return res(false, 'ยาฉีดแมลงหมด ไปซื้อที่แผงป้าแดง', 'Out of bug spray');
      if ((block = energyBlock(s, C.spray))) return block;
      s.energy -= C.spray; s.inventory.spray--; p.bug = false;
      return OK();
    case 'cut':
      if (p.stage === 0) return res(false, 'แปลงนี้ว่างอยู่แล้ว', 'Already empty');
      if ((block = energyBlock(s, C.cut))) return block;
      s.energy -= C.cut;
      f.plots[pi] = emptyPlot();
      normalizeField(f);
      return OK();
    case 'pick':
      return pickPlot(s, fi, pi);
    default:
      return res(false, 'เลือกเครื่องมือก่อน', 'Choose a tool first');
  }
}

function pickPlot(s, fi, pi) {
  const f = s.fields[fi], p = f.plots[pi];
  if (p.stage === WITHERED) return res(false, 'ต้นเหี่ยวแล้ว ต้องถางทิ้ง', 'Withered — clear it');
  if (p.stage !== CONFIG.RIPE_STAGE) return res(false, 'ยังไม่สุก รออีกหน่อย', 'Not ripe yet');
  const block = energyBlock(s, CONFIG.COST.pick);
  if (block) return block;
  if (s.hand && !(s.hand.type === 'crop' && s.hand.crop === f.crop))
    return res(false, 'มือไม่ว่าง เอาของในมือไปขายที่เกวียนก่อน', 'Hands full — sell at the cart first');
  const crop = CONFIG.CROPS[f.crop];
  s.hand = s.hand ? { type: 'crop', crop: f.crop, n: s.hand.n + 1 } : { type: 'crop', crop: f.crop, n: 1 };
  s.energy -= CONFIG.COST.pick;
  p.harvests++;
  if (crop.harvests <= 1) {
    f.plots[pi] = emptyPlot();
  } else if (p.harvests >= crop.harvests) {
    p.stage = WITHERED; p.progress = 0; p.bug = false;
  } else {
    p.stage = CONFIG.RIPE_STAGE - 1; p.progress = 0;
  }
  normalizeField(f);
  return OK();
}

function plantField(s, fi, c) {
  const f = s.fields[fi], crop = CONFIG.CROPS[c];
  if (!crop) return res(false);
  if (f.crop !== null) return res(false, 'แปลงนี้ยังมีพืชอยู่ ต้องถางให้หมดก่อน', 'Field in use — clear every plot first');
  if (s.inventory.seeds[c] < 1) return res(false, 'ไม่มีเมล็ด' + crop.th + ' ไปซื้อที่แผงป้าแดง', 'No ' + crop.en + ' seeds');
  const block = energyBlock(s, CONFIG.COST.plant);
  if (block) return block;
  s.inventory.seeds[c]--;
  s.energy -= CONFIG.COST.plant;
  f.crop = c;
  f.plots = f.plots.map(() => Object.assign(emptyPlot(), { stage: 1, watered: s.rain })); // harvest counters reset
  return res(true, 'ปลูก' + crop.th + 'เต็มแปลงแล้ว', 'Planted ' + crop.en);
}

function sellHand(s, where) {
  const h = s.hand;
  if (!h) return res(false, where === 'basket' ? 'คลิกไข่ในรังก่อน แล้วค่อยใส่ตะกร้า' : 'ใช้ "เก็บ" กับต้นที่สุก แล้วเอามาใส่เกวียน',
    where === 'basket' ? 'Pick eggs first' : 'Pick ripe produce first');
  if (where === 'cart' && h.type !== 'crop') return res(false, 'เกวียนรับเฉพาะผลผลิต', 'The cart takes produce only');
  if (where === 'basket' && h.type !== 'egg') return res(false, 'ตะกร้านี้รับเฉพาะไข่เป็ด', 'Eggs only');
  const price = h.type === 'egg' ? CONFIG.DUCK.eggPrice : CONFIG.CROPS[h.crop].sell;
  const total = price * h.n;
  s.money += total;
  s.stats.earned += total;
  if (h.type === 'egg') s.stats.eggsSold += h.n; else s.stats.cropsSold += h.n;
  const name = h.type === 'egg' ? 'ไข่เป็ด' : CONFIG.CROPS[h.crop].th;
  s.hand = null;
  return res(true, 'ขาย' + name + ' ' + h_n(h) + ' ได้ ฿' + total.toLocaleString('en-US'), 'Sold for ฿' + total);
}

function h_n(h) { return h.n + (h.type === 'egg' ? ' ฟอง' : ' ชิ้น'); }

function walk(s, to) {
  const cost = CONFIG.COST.walk;
  if (to === 'farm') {
    if (s.scene === 'farm') return res(false);
    if (s.hand) return res(false, 'ขายไข่ในมือก่อนนะ', 'Sell what you carry first');
    s.energy = Math.max(0, s.energy - cost);
    s.scene = 'farm';
    return OK();
  }
  if (s.scene !== 'farm') return res(false);
  if (s.hand) return res(false, 'เอาของในมือไปขายที่เกวียนก่อน', 'Sell what you carry first');
  if (!(s.energy > cost)) return res(false, 'เหนื่อยเกินไป เดินไม่ไหวแล้ว', 'Too tired to walk (need more than ' + cost + ' energy)');
  s.energy -= cost;
  s.scene = to;
  return OK();
}

function spend(s, amount) {
  if (s.money < amount) return false;
  s.money -= amount; s.stats.spent += amount;
  return true;
}

function buySeed(s, c) {
  const crop = CONFIG.CROPS[c];
  if (!crop || !spend(s, crop.seed)) return res(false, 'เงินไม่พอจ้ะ', 'Not enough money');
  s.inventory.seeds[c]++;
  return res(true, 'ซื้อเมล็ด' + crop.th + ' 1 ซอง', 'Bought ' + crop.en + ' seeds');
}

function buySupply(s, key) {
  const it = CONFIG.SUPPLIES[key];
  if (!it || !spend(s, it.price)) return res(false, 'เงินไม่พอจ้ะ', 'Not enough money');
  s.inventory[key] += it.uses;
  return res(true, 'ซื้อ' + it.th + ' +' + it.uses + ' ครั้ง', 'Bought ' + it.en);
}

function buyDuck(s) {
  if (s.ducks >= CONFIG.DUCK.max) return res(false, 'คอกเต็มแล้ว เลี้ยงได้ ' + CONFIG.DUCK.max + ' ตัว', 'Pen is full');
  if (!spend(s, CONFIG.DUCK.price)) return res(false, 'เงินไม่พอนะหลาน', 'Not enough money');
  s.ducks++;
  return res(true, 'ได้เป็ดไข่มา 1 ตัว', 'Bought a laying duck');
}

function buyFeed(s) {
  if (!spend(s, CONFIG.DUCK.feedPrice)) return res(false, 'เงินไม่พอนะหลาน', 'Not enough money');
  s.inventory.feed += CONFIG.DUCK.feedPortions;
  return res(true, 'ซื้ออาหารเป็ด +' + CONFIG.DUCK.feedPortions + ' ส่วน', 'Bought duck feed');
}

function feedTrough(s) {
  if (s.trough >= CONFIG.DUCK.troughMax) return res(false, 'รางเต็มแล้ว (วันละ ' + CONFIG.DUCK.troughMax + ' ส่วน)', 'Trough is full for today');
  if (s.inventory.feed < 1) return res(false, 'อาหารเป็ดหมด ซื้อจากลุงมีได้', 'Out of duck feed');
  s.inventory.feed--; s.trough++;
  return OK();
}

function pickEgg(s) {
  if (s.eggs < 1) return res(false, 'ไม่มีไข่ในรัง', 'No eggs');
  if (s.hand && s.hand.type !== 'egg') return res(false, 'มือไม่ว่าง', 'Hands full');
  s.eggs--;
  s.hand = { type: 'egg', n: (s.hand ? s.hand.n : 0) + 1 };
  return OK();
}
