/* Time of day and the light it casts (pure; used by js/ui/light.js, tested in tests/daylight.test.mjs).
   The day's clock follows the player's energy: a fresh day starts at 06:00 and every point spent moves it on, up to
   21:00 when the energy runs out. The painted art already carries a mid-morning upper-left light, so around 09:00-10:00
   the light is neutral and the scene looks exactly as painted. */
'use strict';

const DAY = { START: 6, END: 21 };

// The hour (6..21) for the current state, or the ?time=H override (for testing and screenshots).
function dayHour(s) {
  const q = typeof location !== 'undefined' && /[?&]time=(\d+(?:\.\d+)?)/.exec(location.search);
  if (q) return Math.min(24, Math.max(0, +q[1]));
  if (!s) return 9.5;
  return DAY.START + (1 - Math.max(0, Math.min(1, s.energy / CONFIG.MAX_ENERGY))) * (DAY.END - DAY.START);
}
function clockText(s = typeof S !== 'undefined' ? S : null) {
  const h = dayHour(s), m = Math.floor((h % 1) * 60 / 15) * 15;
  return `${String(Math.floor(h)).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Colour keyframes [hour, r, g, b]: the multiply tint over the scene (1 = as painted).
const DAY_TINT = [
  [5, .5, .52, .76], [6, .92, .78, .80], [7.5, 1, .9, .86], [9, 1, 1, 1], [15, 1, 1, 1], [16.5, 1, .93, .82],
  [18, 1, .76, .58], [19, .74, .64, .78], [20, .58, .58, .80], [21, .52, .54, .78], [24, .46, .5, .74],   // night stays playable
];
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// Everything the lighting pass needs for one hour.
function daylight(hour) {
  let i = 0;
  while (i < DAY_TINT.length - 2 && DAY_TINT[i + 1][0] <= hour) i++;
  const [h0, ...c0] = DAY_TINT[i], [h1, ...c1] = DAY_TINT[i + 1], t = Math.max(0, Math.min(1, (hour - h0) / (h1 - h0)));
  const tint = c0.map((v, k) => v + (c1[k] - v) * t);
  // the sun crosses from the left (morning) over the top to the right (evening); screen space, +y up, +z to the viewer
  const p = Math.max(0, Math.min(1, (hour - 6) / 12)), elev = Math.sin(Math.PI * p);
  const L = [-Math.cos(Math.PI * p) * .9, .3 + .5 * elev, .45 + .45 * elev], len = Math.hypot(...L);
  return {
    hour, tint,
    sun: L.map(v => v / len),
    sunStrength: smooth(5.6, 7.2, hour) * (1 - smooth(18.2, 19.4, hour)),
    lamps: smooth(17.6, 19.2, hour),                     // windows and lanterns light up at dusk
    relief: .55,                                          // how strongly the normal maps shape the light (0 = flat)
    // cast shadows on the ground plane: per pixel of height, `skew` px sideways (away from the sun) and `squash` px
    // back up the screen; long in the morning and evening, short at noon; gone at night
    shadow: { skew: -L[0] / len * (.25 + 1.6 * (1 - elev)), squash: .16 + .26 * (1 - elev), strength: .8 * smooth(5.6, 7.2, hour) * (1 - smooth(17.6, 19, hour)) },
  };
}

// Light sources per scene: [x, y, radius, r, g, b] in scene coordinates (warm window and lamp glow).
function sceneLamps(scene) {
  if (scene === 'farm') {
    const [hu, hv] = FARM_HOUSE.at;
    return [
      [...isoPt(hu + 2.2, hv + 3.1, 44), 120, 1, .72, .38],    // the house veranda
      [...isoPt(hu + 0.6, hv + 1.6, 70), 90, 1, .78, .45],     // a window
      [...isoPt(...FARM_SHRINE, 72), 70, 1, .66, .3],           // candles at the spirit house
      [FARM_SPOTS.cart[0] + 60, FARM_SPOTS.cart[1] - 40, 70, 1, .7, .35],   // a lamp hung on the cart
    ];
  }
  if (scene === 'pen') return [[...penPt(-0.1, 3.6, 34), 110, 1, .72, .38], [96, 230, 70, 1, .74, .42]];   // duck-house door, Uncle Mee's lamp
  return [];
}
