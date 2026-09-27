/* The nightly simulation. Pure: endDay(state, rng) -> newState. */
'use strict';

/* ---------- END DAY (pure) ---------- */
function endDay(state, rng) {
  const s = clone(state);
  const report = { day: s.day, grew: 0, ripened: 0, rotted: 0, bugDeaths: 0, newBugs: 0, eggsLaid: 0, duckDied: false, rain: false };

  // 1) Bug deaths first, then growth, on every plot.
  s.fields.forEach(f => {
    if (f.crop === null) return;
    const need = CONFIG.CROPS[f.crop].k + 1;
    f.plots.forEach(p => {
      if (isGrowing(p)) {
        if (p.bug && rng() < CONFIG.BUG_DEATH_CHANCE) {
          p.stage = WITHERED; p.progress = 0; p.bug = false;
          report.bugDeaths++;
        } else {
          const before = p.stage;
          p.progress += (p.watered ? 1 : 0) + (p.fertilized ? 1 : 0);
          while (p.progress >= need && p.stage <= CONFIG.RIPE_STAGE) {
            p.progress -= need;
            p.stage++;
          }
          if (p.stage > CONFIG.RIPE_STAGE) {          // passed ripe: rots
            p.stage = WITHERED; p.progress = 0; p.bug = false;
            report.rotted++;
          } else if (p.stage > before) {
            report.grew++;
            if (p.stage === CONFIG.RIPE_STAGE) report.ripened++;
          }
        }
      }
      p.watered = false;
      p.fertilized = false;
    });
  });

  // 2) New bugs are rolled only after all deaths are resolved, so a fresh bug always gets a day to be sprayed.
  s.fields.forEach(f => f.plots.forEach(p => {
    if (p.stage === CONFIG.BUG_STAGE && !p.bug && rng() < CONFIG.BUG_CHANCE) {
      p.bug = true;
      report.newBugs++;
    }
  }));

  // 3) Ducks: each fed duck lays one egg; empty trough may starve one duck; leftover feed is lost.
  const fed = Math.min(s.ducks, s.trough);
  if (s.ducks > 0 && s.trough === 0 && rng() < CONFIG.DUCK.starveDeathChance) {
    s.ducks--;
    report.duckDied = true;
  }
  s.eggs += fed;
  report.eggsLaid = fed;
  s.trough = 0;

  // 4) Next morning.
  if (s.day >= CONFIG.LAST_DAY) s.gameOver = true;
  else s.day++;
  s.energy = CONFIG.MAX_ENERGY;
  s.scene = 'farm';
  s.rain = false;
  if (!s.gameOver && rng() < rainChance(s.day)) applyRain(s);
  report.rain = s.rain;
  s.lastReport = report;
  return s;
}
