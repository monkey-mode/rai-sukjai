/* Crop art: 5 growth stages + withered, bugs, produce icons and seed packets. */
'use strict';

/* Foliage of each crop at scale sc (stages 2–5). Origin = soil point, y grows up (negative). */
function foliage(c, sc) {
  let s = '';
  switch (c) {
    case 0: // ผักบุ้ง: slender arrow leaves on upright hollow stems
      [-40, -24, -8, 8, 24, 40].forEach((a, i) => { s += lf(0, 0, a, (21 + (i % 3) * 4) * sc, 4 * sc + 1.2, i % 2 ? '#6cc644' : '#56b234'); });
      break;
    case 1: // คะน้า: broad blue-green leaves with pale veins
      [-52, -26, 0, 26, 52].forEach((a, i) => {
        const L = (19 + (i === 2 ? 5 : 0)) * sc;
        s += lf(0, 0, a, L, 12 * sc + 1, i % 2 ? '#2f8157' : '#3b9866') + `<path d="M0 0L0 ${r(-L * .8)}" transform="rotate(${a})" stroke="#a7dcb8" stroke-width="1.2"/>`;
      });
      break;
    case 2: // มันเทศ: spreading vine with heart leaves
      s += line(`M0 0L${r(-15 * sc)} ${r(-3 * sc)}M0 0L${r(15 * sc)} ${r(-3 * sc)}M0 0L0 ${r(-11 * sc)}`, '#7a3a6a', 2);
      s += heart(-15 * sc, -2 * sc, -65, 9 * sc, '#6aa23c') + heart(15 * sc, -2 * sc, 65, 9 * sc, '#6aa23c') +
        heart(-6 * sc, -7 * sc, -25, 10 * sc, '#5a9232') + heart(7 * sc, -7 * sc, 28, 10 * sc, '#5a9232') + heart(0, -10 * sc, 0, 11 * sc, '#72ad42');
      break;
    case 3: // พริก: small bushy shrub
      s += oline(`M0 0L0 ${r(-22 * sc)}M0 ${r(-9 * sc)}L${r(-9 * sc)} ${r(-18 * sc)}M0 ${r(-11 * sc)}L${r(9 * sc)} ${r(-20 * sc)}`, '#5a8a32', 1.8);
      [[-12, -12, -60], [12, -13, 60], [-9, -20, -30], [9, -22, 30], [-4, -25, -10], [4, -27, 15], [0, -30, 0], [-6, -15, -40], [6, -16, 40]]
        .forEach(([x, y, a], i) => { s += ell(x * sc, y * sc, 3.6 * sc + .5, 6 * sc + .5, i % 2 ? '#3f9a3a' : '#4aa844', a, 1.3); });
      break;
    case 4: // ถั่วฝักยาว: climbing a bamboo stake
      s += `<rect x="-2" y="${r(-44 * sc)}" width="4" height="${r(44 * sc + 2)}" rx="1" fill="#d6b16a" ${SW} stroke-width="1.5"/>`;
      s += line(`M0 0Q${r(-7 * sc)} ${r(-8 * sc)} 0 ${r(-14 * sc)}Q${r(7 * sc)} ${r(-21 * sc)} 0 ${r(-28 * sc)}Q${r(-7 * sc)} ${r(-35 * sc)} 0 ${r(-42 * sc)}`, '#4d9a2c', 2.2);
      s += trifol(-4 * sc, -8 * sc, -60, 7 * sc, '#4fa33a') + trifol(4 * sc, -20 * sc, 60, 7 * sc, '#5cb244') +
        trifol(-4 * sc, -31 * sc, -55, 6.5 * sc, '#4fa33a') + trifol(3 * sc, -40 * sc, 45, 5.5 * sc, '#5cb244');
      break;
    case 5: // สตรอว์เบอร์รี่: low trifoliate rosette
      s += trifol(0, 0, -50, 8 * sc, '#3c9c43') + trifol(0, 0, 50, 8 * sc, '#3c9c43') + trifol(0, 0, 0, 9.5 * sc, '#48ab4e');
      break;
    case 6: // มะม่วง: little tree
      s += `<path d="M${r(-3 * sc)} 0L${r(-2 * sc)} ${r(-21 * sc)}L${r(2 * sc)} ${r(-21 * sc)}L${r(3 * sc)} 0Z" fill="#7a4b2a" ${SW} stroke-width="1.6"/>`;
      s += ell(0, -28 * sc, 18 * sc, 12 * sc, '#2f7d32') + ell(-10 * sc, -24 * sc, 9 * sc, 7 * sc, '#3a8c3c') +
        ell(10 * sc, -25 * sc, 9 * sc, 7 * sc, '#3a8c3c') + ell(0, -35 * sc, 10 * sc, 7 * sc, '#43994a');
      s += line(`M${r(-8 * sc)} ${r(-30 * sc)}l${r(4 * sc)} ${r(-2 * sc)}M${r(6 * sc)} ${r(-32 * sc)}l${r(4 * sc)} ${r(2 * sc)}M${r(-2 * sc)} ${r(-24 * sc)}l${r(4 * sc)} ${r(-1 * sc)}`, '#1f5a22', 1.2);
      break;
    case 7: { // แตงโม: ground vines, lobed leaves
      s += line(`M${r(-21 * sc)} -2Q${r(-10 * sc)} ${r(-9 * sc)} 0 -2Q${r(10 * sc)} ${r(4 * sc)} ${r(21 * sc)} ${r(-3 * sc)}`, '#4d8f2c', 2);
      const lobe = (x, y, z) => circ(x - z * .42, y, z * .46, '#4c9a38', 1.3) + circ(x + z * .42, y, z * .46, '#4c9a38', 1.3) + circ(x, y - z * .42, z * .52, '#58a842', 1.3);
      s += lobe(-14 * sc, -5 * sc, 9 * sc) + lobe(13 * sc, -4 * sc, 9 * sc) + lobe(0, -8 * sc, 10 * sc);
      s += line(`M${r(19 * sc)} ${r(-4 * sc)}q3 -3 1 -5q-2 -1 -1 2`, '#4d8f2c', 1.1);
      break;
    }
  }
  return s;
}

/* Fruit / flowers for stage 4 (ripe=false) and stage 5 (ripe=true). */
function fruit(c, ripe) {
  let s = '';
  switch (c) {
    case 0:
      if (ripe) s += lf(0, 0, -14, 30, 5, '#6cc644') + lf(0, 0, 16, 29, 5, '#56b234') + circ(10, -27, 4, '#f3e6f7', 1.3) + circ(10, -27, 1.4, '#b67fd0', 0);
      break;
    case 1:
      if (ripe) s += lf(0, 0, -12, 26, 9, '#3b9866') + lf(0, 0, 12, 26, 9, '#2f8157') + ell(0, -6, 5, 7, '#9ad99a', 0, 1.3);
      break;
    case 2:
      s += ripe ? ell(-8, 0, 8, 5, '#a23b6c', -15) + ell(7, 1, 7, 4.5, '#963363', 20) + ell(-10, -1.5, 2.5, 1.2, '#e79bc0', -15, 0)
        : ell(-6, 1, 5, 3, '#8a4a60', -10) + ell(6, 1, 4, 2.6, '#8a4a60', 10);
      break;
    case 3: {
      const pos = ripe ? [[-11, -16], [8, -19], [-3, -22], [12, -11], [-13, -8]] : [[-10, -16], [9, -18], [2, -24]];
      pos.forEach(([x, y], i) => {
        s += `<path d="M0 0Q3 5 0 11Q-1.5 6 -2.5 1Z" transform="translate(${x} ${y}) rotate(${i % 2 ? -15 : 15})" fill="${ripe ? '#d8261d' : '#7cc44a'}" ${SW} stroke-width="1.2"/>`;
      });
      break;
    }
    case 4:
      if (ripe) {
        [[-6, -30], [5, -22], [-3, -13], [7, -36]].forEach(([x, y]) => { s += oline(`M${x} ${y}q-3 10 1 ${20}q1 3 -1 5`, '#79c943', 2.6); });
      } else {
        [[-6, -14], [6, -26], [-5, -36]].forEach(([x, y]) => { s += circ(x, y, 2.8, '#b18ad6', 1.2); });
        s += oline('M5 -20q-1 5 1 8M-4 -30q-1 5 1 8', '#8ad35a', 2);
      }
      break;
    case 5:
      if (ripe) {
        [[-10, -3], [9, -2], [1, -7], [-3, 1]].forEach(([x, y]) => {
          s += `<g transform="translate(${x} ${y})"><path d="M0 -4Q5 -4 4.5 1Q3 6 0 7Q-3 6 -4.5 1Q-5 -4 0 -4Z" fill="#e2323a" ${SW} stroke-width="1.2"/>` +
            `<path d="M-3 -4L0 -6L3 -4" fill="#3c9c43" ${SW} stroke-width="1"/><circle cx="-1.5" cy="0" r=".6" fill="#ffe27a"/><circle cx="1.5" cy="2" r=".6" fill="#ffe27a"/><circle cx="0" cy="-1.5" r=".6" fill="#ffe27a"/></g>`;
        });
      } else {
        s += circ(-9, -8, 3.2, '#fff', 1.2) + circ(-9, -8, 1.1, '#f5c518', 0) + circ(9, -9, 3.2, '#fff', 1.2) + circ(9, -9, 1.1, '#f5c518', 0) + ell(1, -4, 2.5, 3, '#a8d86a', 0, 1.1);
      }
      break;
    case 6: {
      const pos = ripe ? [[-11, -17], [9, -16], [0, -21], [14, -25], [-14, -26]] : [[-10, -17], [9, -17], [1, -22]];
      pos.forEach(([x, y], i) => {
        s += ell(x, y, 3.6, 5.2, ripe ? '#f7c52b' : '#9bcf4f', i % 2 ? -20 : 20, 1.3);
        if (ripe) s += ell(x - 1, y + 1.5, 1.6, 2, '#f08a3a', 0, 0);
      });
      break;
    }
    case 7:
      s += ripe
        ? ell(2, -7, 15, 10, '#3f8f33', 0, 2) + line('M-6 -16Q-10 -7 -6 2M1 -17Q-1 -7 1 3M9 -16Q12 -7 9 1', '#1f5a1d', 2.2) + line('M-7 -13Q-9 -10 -8 -7', 'rgba(255,255,255,.5)', 2)
        : ell(4, -3, 6, 4.5, '#5fae3e', 0, 1.3) + line('M2 -7Q1 -3 2 1M6 -7Q7 -3 6 1', '#2f6e28', 1.2);
      break;
  }
  return s;
}

const SPARK = `<g transform="translate(15 -30)"><path class="spark" d="M0 -5L1.3 -1.3L5 0L1.3 1.3L0 5L-1.3 1.3L-5 0L-1.3 -1.3Z" fill="#fff6a0" stroke="${O}" stroke-width="1"/></g>`;

const MOUND = `<ellipse cx="0" cy="1" rx="8" ry="2.6" fill="#6e4528"/>`;

const plantCache = {};

function plantArt(c, stage) {
  const key = c + ':' + stage;
  if (plantCache[key]) return plantCache[key];
  let s;
  if (stage === WITHERED) {
    s = MOUND + line('M0 1Q-2 -10 3 -16Q7 -20 10 -13', '#7b5a33', 2.6) + line('M-1 -5Q-6 -9 -9 -4', '#7b5a33', 2) +
      lf(4, -16, 125, 10, 4, '#a07b45', 1.4) + lf(-1, -8, -125, 9, 4, '#8f6a3a', 1.4) + lf(9, -13, 160, 7, 3, '#b08a52', 1.3);
  } else if (stage === 1) {
    s = MOUND + line('M0 0L0 -6', '#5aa02c', 2) + lf(0, -5, -55, 7, 4, '#8fd14f', 1.3) + lf(0, -5, 55, 7, 4, '#8fd14f', 1.3);
  } else if (stage === 2) s = MOUND + foliage(c, .5);
  else if (stage === 3) s = MOUND + foliage(c, .75);
  else if (stage === 4) s = MOUND + foliage(c, 1) + fruit(c, false);
  else s = MOUND + foliage(c, 1) + fruit(c, true) + SPARK;
  return (plantCache[key] = s);
}

const BUGS = `<g class="bug"><g transform="translate(-7 -13)">${ell(0, 0, 4, 3, '#6b2d8f', 20, 1.2)}${circ(3.5, -1.5, 1.8, '#2a1a2a', 1)}<path d="M-3 2l-2 2M0 3l0 2.5M3 2l2 2" stroke="${O}" stroke-width="1"/></g>` +
  `<g transform="translate(8 -21)">${ell(0, 0, 3.4, 2.6, '#1e6b3a', -30, 1.2)}${circ(-3, -1.5, 1.6, '#123', 1)}<circle cx="0" cy="0" r=".9" fill="#ffd23f"/></g></g>`;

/* Harvested produce icons, centered at 0,0 (about ±13). */
function produceIcon(c) {
  const band = `<rect x="-5" y="2" width="10" height="4" rx="1.5" fill="#d23c2c" ${SW} stroke-width="1.2"/>`;
  switch (c) {
    case 0: return [-22, -10, 2, 14].map((a, i) => lf(0, 12, a, 24, 4, i % 2 ? '#6cc644' : '#56b234', 1.4)).join('') + band;
    case 1: return lf(0, 12, -28, 20, 9, '#2f8157', 1.4) + lf(0, 12, 28, 20, 9, '#2f8157', 1.4) + lf(0, 12, 0, 24, 10, '#3b9866', 1.4) + line('M0 12L0 -8', '#a7dcb8', 1.2) + band;
    case 2: return ell(0, 0, 13, 7.5, '#a23b6c', -20) + line('M11 -5q4 -3 5 -7M-12 5q-3 2 -6 2', O, 1.4) + ell(-4, -3, 4, 1.6, '#e79bc0', -20, 0) + line('M2 2l1 1M6 -2l1 1', '#6a1f45', 1.2);
    case 3: return `<path d="M-9 -9Q-2 -12 3 -4Q8 5 12 12Q2 8 -4 1Q-9 -4 -9 -9Z" fill="#d8261d" ${SW} stroke-width="1.6"/><path d="M-10 -8Q-12 -13 -7 -13Q-6 -10 -5 -9Z" fill="#3f8a2a" ${SW} stroke-width="1.3"/>` + line('M-9 -13q-2 -3 1 -5', O, 1.4) + line('M-5 -7Q0 -7 3 -2', 'rgba(255,255,255,.5)', 1.5);
    case 4: return [-6, -2, 2, 6].map(d => oline(`M${d} -13Q${d + 4} 0 ${d - 1} 13`, '#79c943', 2.6)).join('') + `<rect x="-8" y="-3" width="15" height="4" rx="1.5" fill="#d23c2c" ${SW} stroke-width="1.2"/>`;
    case 5: return `<path d="M0 -8Q10 -8 9 1Q6 11 0 13Q-6 11 -9 1Q-10 -8 0 -8Z" fill="#e2323a" ${SW} stroke-width="1.6"/><path d="M-7 -8L-3 -11L0 -8L3 -11L7 -8L3 -6L0 -7L-3 -6Z" fill="#3c9c43" ${SW} stroke-width="1.2"/>` +
      [[-4, -2], [3, -3], [0, 3], [-4, 5], [4, 4], [0, -4]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".9" fill="#ffe27a"/>`).join('');
    case 6: return ell(0, 2, 9, 12.5, '#f7c52b', 25) + ell(-3, 5, 4, 5, '#f59a3a', 25, 0) + line('M4 -9l2 -4', O, 1.6) + lf(5, -12, 55, 11, 4, '#3a8c3c', 1.3);
    case 7: return ell(0, 0, 13.5, 10.5, '#3f8f33', 0, 1.8) + line('M-7 -9Q-11 0 -7 9M0 -10.5Q-2 0 0 10.5M7 -9Q10 0 7 9', '#1f5a1d', 2.2) + line('M-8 -5Q-9 -3 -8 0', 'rgba(255,255,255,.5)', 2);
  }
  return '';
}

function eggIcon() { return ell(0, 0, 8, 10.5, '#f1ede0', 0, 1.8) + ell(-3, -4, 1.8, 3, '#fff', 20, 0) + `<circle cx="3" cy="3" r=".8" fill="#c9b99a"/><circle cx="-1" cy="5" r=".6" fill="#c9b99a"/>`; }

const PACK_COL = ['#8fd14f', '#5bbf8a', '#c98ad6', '#ff8a6a', '#b5d86a', '#ff9fb0', '#ffd24a', '#7fcf6a'];

function packetSVG(i, w = 36, h = 40) {
  return `<svg viewBox="0 0 36 40" width="${w}" height="${h}"><path d="M5 6L8 3L11 6L14 3L17 6L20 3L23 6L26 3L29 6L31 4V37H5Z" fill="${PACK_COL[i]}" ${SW} stroke-width="2"/>` +
    `<rect x="8" y="9" width="20" height="21" rx="4" fill="#fff8e6" ${SW} stroke-width="1.5"/><g transform="translate(18 19.5) scale(.68)">${produceIcon(i)}</g>` +
    `<rect x="9" y="32" width="18" height="2.5" rx="1.2" fill="rgba(0,0,0,.25)"/></svg>`;
}
