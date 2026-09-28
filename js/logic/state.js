/* Game state: creation, seeded RNG and save-file sanitising. */
'use strict';

/* Small seeded RNG for tests / replays. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function emptyPlot() {
  return { stage: 0, progress: 0, watered: false, fertilized: false, bug: false, harvests: 0 };
}

function emptyField() {
  const plots = [];
  for (let i = 0; i < CONFIG.PLOTS_PER_FIELD; i++) plots.push(emptyPlot());
  return { crop: null, plots };
}

function isGrowing(p) { return p.stage >= 1 && p.stage <= CONFIG.RIPE_STAGE; }

function clone(o) { return JSON.parse(JSON.stringify(o)); }

function applyRain(s) {
  s.rain = true;
  s.fields.forEach(f => f.plots.forEach(p => { if (isGrowing(p)) p.watered = true; }));
}

function newGame(rng) {
  rng = rng || Math.random;
  const fields = [];
  for (let i = 0; i < CONFIG.FIELDS; i++) fields.push(emptyField());
  const s = {
    version: 1,
    day: 1,
    money: CONFIG.START_MONEY,
    energy: CONFIG.START_ENERGY,
    scene: 'farm',
    rain: false,
    fields,
    inventory: { seeds: CONFIG.CROPS.map(() => 0), fertilizer: 0, spray: 0, feed: 0 },
    ducks: 0,
    trough: 0,
    eggs: 0,
    hand: null,                 // produce carried on the cursor: {type:'crop',crop,n} | {type:'egg',n}
    gameOver: false,
    lastReport: null,
    stats: { cropsSold: 0, eggsSold: 0, earned: 0, spent: 0 },
  };
  if (rng() < rainChance(s.day)) applyRain(s);
  return s;
}

/* Rebuild a state from saved JSON, filling any missing keys (incl. per-plot harvest counters). */
function sanitizeState(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.fields)) return null;
  const s = newGame(() => 1);
  const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);
  s.day = Math.min(CONFIG.LAST_DAY, Math.max(1, num(raw.day, 1)));
  s.money = num(raw.money, s.money);
  s.energy = Math.max(0, Math.min(CONFIG.MAX_ENERGY, num(raw.energy, s.energy)));
  s.scene = SCENES.includes(raw.scene) ? raw.scene : 'farm';
  s.rain = !!raw.rain;
  s.fields = s.fields.map((df, i) => {
    const rf = raw.fields[i] || {};
    const crop = Number.isInteger(rf.crop) && CONFIG.CROPS[rf.crop] ? rf.crop : null;
    const plots = df.plots.map((dp, j) => {
      const rp = (rf.plots && rf.plots[j]) || {};
      return {
        stage: crop === null ? 0 : Math.max(0, Math.min(WITHERED, num(rp.stage, 0))),
        progress: num(rp.progress, 0),
        watered: !!rp.watered,
        fertilized: !!rp.fertilized,
        bug: !!rp.bug,
        harvests: num(rp.harvests, 0),
      };
    });
    return { crop: plots.every(p => p.stage === 0) ? null : crop, plots };
  });
  const inv = raw.inventory || {};
  s.inventory = {
    seeds: CONFIG.CROPS.map((_, i) => num(inv.seeds && inv.seeds[i], 0)),
    fertilizer: num(inv.fertilizer, 0),
    spray: num(inv.spray, 0),
    feed: num(inv.feed, 0),
  };
  s.ducks = Math.min(CONFIG.DUCK.max, num(raw.ducks, 0));
  s.trough = Math.min(CONFIG.DUCK.troughMax, num(raw.trough, 0));
  s.eggs = num(raw.eggs, 0);
  const h = raw.hand;
  if (h && h.type === 'egg' && h.n > 0) s.hand = { type: 'egg', n: h.n };
  else if (h && h.type === 'crop' && CONFIG.CROPS[h.crop] && h.n > 0) s.hand = { type: 'crop', crop: h.crop, n: h.n };
  s.gameOver = !!raw.gameOver;
  s.lastReport = raw.lastReport || null;
  const st = raw.stats || {};
  s.stats = { cropsSold: num(st.cropsSold, 0), eggsSold: num(st.eggsSold, 0), earned: num(st.earned, 0), spent: num(st.spent, 0) };
  return s;
}
