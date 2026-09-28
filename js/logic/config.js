/* All crop, shop and rule numbers. Tweak the game here. */
'use strict';

/* All crop, shop and rule numbers live here. */
const CONFIG = {
  START_MONEY: 400,
  START_ENERGY: 100,
  MAX_ENERGY: 100,
  LAST_DAY: 365,
  FIELDS: 4,
  PLOTS_PER_FIELD: 12,
  RIPE_STAGE: 5,
  COST: { water: 1, fertilize: 1, spray: 1, cut: 1, pick: 0, plant: 0, walk: 5 },
  TIRED_BELOW: 6,          // show "เหนื่อยแล้ว…" when energy < this
  BUG_STAGE: 4,            // only this stage can catch bugs
  BUG_CHANCE: 0.10,        // per plot per End Day
  BUG_DEATH_CHANCE: 1 / 3, // per bugged plant per End Day
  // Rain chance by Thai season. Replace with a single number (0.02) to restore the original flat 2%.
  RAIN_CHANCE: { hot: 0.03, rainy: 0.25, cool: 0.05 },
  CROPS: [
    { id: 'phakbung',   th: 'ผักบุ้ง',            en: 'Morning glory',       seed: 100,  sell: 50,  k: 0, harvests: 1,
      desc: 'ผักบุ้งไทยยอดอ่อน โตไว ปลูกง่าย เหมาะกับมือใหม่' },
    { id: 'khana',      th: 'คะน้า',              en: 'Chinese kale',        seed: 200,  sell: 60,  k: 0, harvests: 1,
      desc: 'ใบเขียวเข้ม ก้านกรอบ ผัดน้ำมันหอยอร่อยนัก' },
    { id: 'manthet',    th: 'มันเทศ',             en: 'Sweet potato',        seed: 300,  sell: 75,  k: 1, harvests: 1,
      desc: 'หัวมันเนื้อม่วง เผาหรือต้มก็หวานมัน' },
    { id: 'phrik',      th: 'พริก',               en: 'Chili',               seed: 500,  sell: 150, k: 2, harvests: 4,
      desc: 'พริกขี้หนูเม็ดเล็กเผ็ดจัด เก็บขายได้หลายรอบ' },
    { id: 'thua',       th: 'ถั่วฝักยาว',          en: 'Long bean',           seed: 600,  sell: 160, k: 3, harvests: 5,
      desc: 'ไต่ค้างไม้ไผ่ ฝักยาวกรอบ เก็บได้ถึงห้ารอบ' },
    { id: 'strawberry', th: 'สตรอว์เบอร์รี่ดอย',   en: 'Highland strawberry', seed: 800,  sell: 200, k: 3, harvests: 4,
      desc: 'พันธุ์จากดอยทางเหนือ ลูกแดงหวานฉ่ำ' },
    { id: 'mango',      th: 'มะม่วงน้ำดอกไม้',     en: 'Nam Dok Mai mango',   seed: 1200, sell: 350, k: 5, harvests: 6,
      desc: 'ราชาผลไม้ไทย โตช้าแต่ออกลูกได้หลายรอบ' },
    { id: 'watermelon', th: 'แตงโม',              en: 'Watermelon',          seed: 900,  sell: 500, k: 4, harvests: 1,
      desc: 'ลูกโตเนื้อแดง ราคางามแต่เก็บได้ครั้งเดียว' },
  ],
  SUPPLIES: {
    fertilizer: { price: 200, uses: 50, th: 'ปุ๋ยคอก', en: 'Fertilizer' },
    spray:      { price: 200, uses: 20, th: 'ยาฉีดแมลง', en: 'Bug spray' },
  },
  DUCK: { price: 1000, max: 5, feedPrice: 200, feedPortions: 20, troughMax: 5, eggPrice: 50, starveDeathChance: 0.10 },
};

// Scenes: the farm, the village map (the hub between places) and the places you can walk to from it.
const SCENES = ['farm', 'map', 'market', 'pen'];
const WITHERED = 6; // plot.stage value for a rotten / dead plant that must be cut
