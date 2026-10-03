// The time-of-day light model (js/art/daylight.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const ctx = vm.createContext({});
vm.runInContext(['js/logic/config.js', 'js/art/daylight.js'].map(f => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8')).join('\n') +
  ';this.X = { daylight, dayHour, clockText, CONFIG };', ctx);
const { daylight, dayHour, clockText, CONFIG } = ctx.X;

test('the clock follows energy: a fresh day is 06:00, an empty bar is 21:00', () => {
  assert.equal(dayHour({ energy: CONFIG.MAX_ENERGY }), 6);
  assert.equal(dayHour({ energy: 0 }), 21);
  assert.equal(clockText({ energy: CONFIG.MAX_ENERGY / 2 }), '13:30');
});

test('mid-morning is neutral: the scene looks exactly as painted', () => {
  for (const h of [9, 10, 12]) {
    const D = daylight(h);
    for (const c of D.tint) assert.ok(Math.abs(c - 1) < 1e-9, `tint at ${h}`);
    assert.equal(D.lamps, 0);
    assert.ok(D.sunStrength > .99);
  }
});

test('the sun crosses from left to right, lamps light up at dusk, night stays playable', () => {
  assert.ok(daylight(7).sun[0] < -.3 && daylight(17).sun[0] > .3, 'sun moves left to right');
  assert.ok(daylight(12).sun[2] > daylight(7).sun[2], 'higher at noon');
  assert.equal(daylight(15).lamps, 0);
  assert.ok(daylight(20).lamps > .99);
  assert.ok(daylight(20).sunStrength < .01);
  for (const h of [20, 21]) assert.ok(Math.min(...daylight(h).tint) >= .5, `night at ${h} is too dark to play`);
  const dusk = daylight(18).tint;
  assert.ok(dusk[0] > dusk[2] + .3, 'evening is warm');
});
