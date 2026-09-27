// Run with: node --test tests/*.test.mjs
// Loads the DOM-free game logic scripts (same order as index.html) into one VM context.
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

const LOGIC = ['config', 'calendar', 'state', 'endDay', 'actions'];
const src = LOGIC.map(f => fs.readFileSync(new URL(`../js/logic/${f}.js`, import.meta.url), 'utf8')).join('\n');
const ctx = vm.createContext({});
vm.runInContext(src + `
;this.G = { CONFIG, WITHERED, endDay, newGame, sanitizeState, mulberry32, dateOf, seasonOf, rainChance,
  applyTool, plantField, sellHand, walk, buySeed, buyDuck, buyFeed, feedTrough, pickEgg };`, ctx);
const G = ctx.G;

const never = () => 0.999999;   // no random event fires
const always = () => 0;         // every random event fires
const seq = (...vals) => { let i = 0; return () => vals[i++ % vals.length]; };

function planted(crop, stage = 1) {
  const s = G.newGame(never);
  s.fields[0].crop = crop;
  s.fields[0].plots.forEach(p => { p.stage = stage; });
  return s;
}
const plain = o => JSON.parse(JSON.stringify(o));

test('new game starts on day 1 with ฿400 and 100 energy, harvest counters on all 4 fields', () => {
  const s = G.newGame(never);
  assert.equal(s.day, 1); assert.equal(s.money, 400); assert.equal(s.energy, 100);
  assert.equal(s.fields.length, 4);
  s.fields.forEach(f => { assert.equal(f.plots.length, 12); f.plots.forEach(p => assert.equal(p.harvests, 0)); });
});

test('endDay is pure', () => {
  const s = planted(0); s.fields[0].plots[0].watered = true;
  const before = plain(s);
  G.endDay(s, always);
  assert.deepEqual(plain(s), before);
});

test('growth: +1 point for water, +1 for fertilizer, stage advances after k+1 points', () => {
  let s = planted(0);                                    // k = 0
  s.fields[0].plots[0].watered = true;
  s.fields[0].plots[1].watered = true; s.fields[0].plots[1].fertilized = true;
  s = G.endDay(s, never);
  assert.equal(s.fields[0].plots[0].stage, 2);
  assert.equal(s.fields[0].plots[1].stage, 3);
  assert.equal(s.fields[0].plots[2].stage, 1, 'no water and no fertilizer = no growth');

  let t = planted(3);                                    // chili k = 2 → 3 points per stage
  for (let d = 0; d < 2; d++) { t.fields[0].plots[0].watered = true; t = G.endDay(t, never); }
  assert.equal(t.fields[0].plots[0].stage, 1); assert.equal(t.fields[0].plots[0].progress, 2);
  t.fields[0].plots[0].watered = true; t = G.endDay(t, never);
  assert.equal(t.fields[0].plots[0].stage, 2); assert.equal(t.fields[0].plots[0].progress, 0);
});

test('watered/fertilized flags reset each night and no growth means no death', () => {
  let s = planted(2, 3);
  for (let d = 0; d < 20; d++) s = G.endDay(s, never);
  assert.equal(s.fields[0].plots[0].stage, 3);
  assert.equal(s.fields[0].plots[0].watered, false);
});

test('a ripe plot rots once it passes stage 5', () => {
  let s = planted(2, 5);                                 // k = 1
  s.fields[0].plots[0].watered = true;
  s = G.endDay(s, never);
  assert.equal(s.fields[0].plots[0].stage, 5, 'one point is not enough for k=1');
  s.fields[0].plots[0].watered = true;
  s = G.endDay(s, never);
  assert.equal(s.fields[0].plots[0].stage, G.WITHERED);
  assert.equal(s.lastReport.rotted, 1);
});

test('only stage-4 plants catch bugs; each plot uses its own flag', () => {
  const s = planted(3, 3);
  s.fields[0].plots[5].stage = 4;
  const n = G.endDay(s, seq(0));
  // with rng=0 every eligible roll hits; only plot 5 is at stage 4
  n.fields[0].plots.forEach((p, i) => assert.equal(p.bug, i === 5));
});

test('bug deaths resolve before new bugs are rolled (fresh bugs always get a day)', () => {
  const s = planted(3, 4);
  s.fields[0].plots[0].bug = true;                       // old bug
  const n = G.endDay(s, always);
  assert.equal(n.fields[0].plots[0].stage, G.WITHERED, 'old bug killed its plant');
  for (let i = 1; i < 12; i++) {
    assert.equal(n.fields[0].plots[i].stage, 4);
    assert.equal(n.fields[0].plots[i].bug, true, 'new bug rolled but plant still alive');
  }
  assert.equal(n.lastReport.bugDeaths, 1);
  assert.equal(n.lastReport.newBugs, 11);
});

test('a bugged plant survives when the 1/3 roll misses', () => {
  const s = planted(3, 4);
  s.fields[0].plots[0].bug = true;
  const n = G.endDay(s, seq(0.5));
  assert.equal(n.fields[0].plots[0].stage, 4);
  assert.equal(n.fields[0].plots[0].bug, true);
});

test('rain waters every growing plot for the new day and blocks manual watering', () => {
  const s = planted(0);
  const n = G.endDay(s, always);                          // day 2 (Jan) rains with rng 0
  assert.equal(n.rain, true);
  n.fields[0].plots.forEach(p => assert.equal(p.watered, true));
  const r = G.applyTool(n, 'water', 0, 0);
  assert.equal(r.ok, false);
  assert.equal(n.energy, 100);
});

test('season rain chance follows Thai seasons, config can go back to flat 2%', () => {
  assert.deepEqual([G.dateOf(1).month, G.dateOf(1).date], [0, 1]);
  assert.deepEqual([G.dateOf(365).month, G.dateOf(365).date], [11, 31]);
  assert.equal(G.seasonOf(1), 'cool');
  assert.equal(G.seasonOf(60), 'hot');     // 1 Mar
  assert.equal(G.seasonOf(152), 'rainy');  // 1 Jun
  assert.equal(G.seasonOf(305), 'cool');   // 1 Nov
  assert.equal(G.rainChance(100), 0.03);
  assert.equal(G.rainChance(200), 0.25);
  const saved = G.CONFIG.RAIN_CHANCE;
  G.CONFIG.RAIN_CHANCE = 0.02;
  assert.equal(G.rainChance(200), 0.02);
  G.CONFIG.RAIN_CHANCE = saved;
});

test('ducks: fed ducks lay eggs, leftover feed is lost, empty trough can kill one duck', () => {
  const s = G.newGame(never);
  s.ducks = 3; s.trough = 5;
  let n = G.endDay(s, never);
  assert.equal(n.eggs, 3); assert.equal(n.trough, 0); assert.equal(n.ducks, 3);

  s.trough = 2;
  n = G.endDay(s, never);
  assert.equal(n.eggs, 2);

  s.trough = 0;
  n = G.endDay(s, always);
  assert.equal(n.ducks, 2); assert.equal(n.lastReport.duckDied, true);
  n = G.endDay(s, never);
  assert.equal(n.ducks, 3);
});

test('multi-harvest crops drop back to stage 4, then wither after the last pick', () => {
  const s = planted(3, 5);                                // chili: 4 harvests
  const p = () => s.fields[0].plots[0];
  for (let h = 1; h <= 3; h++) {
    assert.equal(G.applyTool(s, 'pick', 0, 0).ok, true);
    assert.equal(p().stage, 4); assert.equal(p().harvests, h);
    G.sellHand(s, 'cart');
    p().stage = 5;
  }
  G.applyTool(s, 'pick', 0, 0); G.sellHand(s, 'cart');
  assert.equal(p().stage, G.WITHERED);
  assert.equal(s.money, 400 + 4 * 150);
});

test('single-harvest crops leave an empty plot; clearing the whole field frees it', () => {
  const s = planted(0, 5);
  G.applyTool(s, 'pick', 0, 0);
  assert.equal(s.fields[0].plots[0].stage, 0);
  assert.equal(s.hand.n, 1);
  G.applyTool(s, 'pick', 0, 1);
  assert.equal(s.hand.n, 2);
  for (let i = 2; i < 12; i++) G.applyTool(s, 'cut', 0, i);
  assert.equal(s.fields[0].crop, null);
});

test('replanting resets the field harvest counters', () => {
  const s = planted(3, 5);
  G.applyTool(s, 'pick', 0, 0); G.sellHand(s, 'cart');
  for (let i = 0; i < 12; i++) G.applyTool(s, 'cut', 0, i);
  s.inventory.seeds[4] = 1;
  assert.equal(G.plantField(s, 0, 4).ok, true);
  s.fields[0].plots.forEach(p => { assert.equal(p.harvests, 0); assert.equal(p.stage, 1); });
});

test('harvest counters survive save/load', () => {
  const s = planted(3, 5);
  G.applyTool(s, 'pick', 0, 7);
  const loaded = G.sanitizeState(JSON.parse(JSON.stringify(s)));
  assert.equal(loaded.fields[0].plots[7].harvests, 1);
  assert.equal(loaded.fields[0].plots[7].stage, 4);
  assert.equal(loaded.hand.n, 1);
  // older saves without counters get them filled in
  delete s.fields[1].plots[0].harvests;
  assert.equal(G.sanitizeState(plain(s)).fields[1].plots[0].harvests, 0);
});

test('energy: actions cost 1, walking needs > 5, nothing works at 0', () => {
  const s = planted(0);
  s.energy = 6;
  assert.equal(G.walk(s, 'market').ok, true); assert.equal(s.energy, 1);
  assert.equal(G.walk(s, 'farm').ok, true); assert.equal(s.energy, 0);
  s.energy = 5;
  assert.equal(G.walk(s, 'pen').ok, false);
  assert.equal(G.applyTool(s, 'water', 0, 0).ok, true); assert.equal(s.energy, 4);
  s.energy = 0;
  assert.equal(G.applyTool(s, 'water', 0, 1).ok, false);
  s.fields[0].plots[2].stage = 5;
  assert.equal(G.applyTool(s, 'pick', 0, 2).ok, false);
});

test('once per plot per day for water and fertilizer', () => {
  const s = planted(0);
  s.inventory.fertilizer = 5;
  assert.equal(G.applyTool(s, 'water', 0, 0).ok, true);
  assert.equal(G.applyTool(s, 'water', 0, 0).ok, false);
  assert.equal(G.applyTool(s, 'fertilize', 0, 0).ok, true);
  assert.equal(G.applyTool(s, 'fertilize', 0, 0).ok, false);
  assert.equal(s.inventory.fertilizer, 4);
  assert.equal(s.energy, 98);
});

test('trough holds at most 5 portions per day', () => {
  const s = G.newGame(never);
  s.inventory.feed = 20;
  for (let i = 0; i < 7; i++) G.feedTrough(s);
  assert.equal(s.trough, 5); assert.equal(s.inventory.feed, 15);
});

test('game ends after day 365', () => {
  const s = G.newGame(never); s.day = 365;
  const n = G.endDay(s, never);
  assert.equal(n.gameOver, true);
  assert.equal(n.day, 365);
});

test('seeded RNG gives reproducible seasons', () => {
  const run = seed => {
    const rng = G.mulberry32(seed);
    let s = G.newGame(rng);
    s.fields[0].crop = 3; s.fields[0].plots.forEach(p => { p.stage = 4; });
    const log = [];
    for (let d = 0; d < 120; d++) { s = G.endDay(s, rng); log.push(s.lastReport); }
    return plain({ s, log });
  };
  assert.deepEqual(run(42), run(42));
  assert.notDeepEqual(run(42), run(7));
});
