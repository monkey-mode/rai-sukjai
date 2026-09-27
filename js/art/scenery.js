/* Reusable scenery: trees, clouds, spirit house, stilt house, buffalo, fences. */
'use strict';

function cloud(x, y, sc, cls) {
  return `<g class="drift ${cls}"><g transform="translate(${x} ${y}) scale(${sc})"><path d="M-30 8Q-35 -6 -18 -6Q-14 -20 2 -16Q10 -27 22 -14Q37 -14 34 0Q41 9 29 10Z" fill="#fffaf0" ${SW} stroke-width="2.5"/></g></g>`;
}

function sugarPalm(x, y, sc) {
  const top = y - 86 * sc;
  let s = `<rect x="${r(x - 2.5 * sc)}" y="${r(top)}" width="${r(5 * sc)}" height="${r(86 * sc)}" fill="#6b4a2c" ${SW} stroke-width="2"/>`;
  [30, 150, 90].forEach(a => { const rad = a * Math.PI / 180, R = 13 * sc; s += `<path d="M${x} ${r(top)}L${r(x + Math.cos(rad - .2) * R)} ${r(top + Math.sin(rad - .2) * R + 6 * sc)}L${r(x + Math.cos(rad + .2) * R)} ${r(top + Math.sin(rad + .2) * R + 6 * sc)}Z" fill="#8a6a3a" ${SW} stroke-width="1.4"/>`; });
  for (let a = -180; a < 180; a += 30) {
    const rad = a * Math.PI / 180, R = (a > 0 ? 14 : 18) * sc;
    s += `<path d="M${x} ${r(top)}L${r(x + Math.cos(rad - .22) * R)} ${r(top + Math.sin(rad - .22) * R)}L${r(x + Math.cos(rad + .22) * R)} ${r(top + Math.sin(rad + .22) * R)}Z" fill="${(a / 30) % 2 ? '#4d8a2e' : '#5c9c36'}" ${SW} stroke-width="1.5"/>`;
  }
  return s + circ(x, top, 3 * sc, '#3e6e24', 1.4);
}

function coconutTree(x, y, h, lean) {
  const tx = x + lean, ty = y - h, cx = x + lean * .2, cy = y - h * .5;
  let s = `<path d="M${x - 6} ${y}Q${cx - 4} ${cy} ${tx - 3} ${ty}L${tx + 3} ${ty}Q${cx + 4} ${cy} ${x + 6} ${y}Z" fill="#8a6440" ${SW} stroke-width="2.5"/>`;
  for (let i = 1; i < 8; i++) {
    const t = i / 8, px = (1 - t) * (1 - t) * x + 2 * (1 - t) * t * cx + t * t * tx, py = (1 - t) * (1 - t) * y + 2 * (1 - t) * t * cy + t * t * ty;
    s += line(`M${r(px - 4)} ${r(py)}L${r(px + 4)} ${r(py - 1)}`, '#5e4128', 1.4);
  }
  [[-42, 12], [-32, -14], [-8, -24], [16, -22], [36, -10], [44, 14], [-20, 22], [24, 24]].forEach(([dx, dy], i) => {
    s += `<path d="M${tx} ${ty}Q${tx + dx * .5} ${ty + dy * .5 - 14} ${tx + dx} ${ty + dy}Q${tx + dx * .5} ${ty + dy * .5 - 3} ${tx} ${ty}Z" fill="${i % 2 ? '#4f9a34' : '#5fae3e'}" ${SW} stroke-width="2"/>`;
  });
  return s + circ(tx - 4, ty + 5, 4.5, '#6b8e2a') + circ(tx + 5, ty + 6, 4.5, '#5d7f24') + circ(tx, ty + 9, 4.5, '#6b8e2a');
}

function spiritHouse(x, y) {
  return `<g><rect x="${x - 4}" y="${y - 58}" width="8" height="58" fill="#efe4cc" ${SW} stroke-width="2"/>
  <rect x="${x - 21}" y="${y - 65}" width="42" height="7" rx="2" fill="#e8c14a" ${SW} stroke-width="2"/>
  <rect x="${x - 13}" y="${y - 87}" width="26" height="22" fill="#c8372d" ${SW} stroke-width="2"/>
  <rect x="${x - 5}" y="${y - 82}" width="10" height="17" fill="#f2c14e" ${SW} stroke-width="1.5"/>
  <path d="M${x - 19} ${y - 85}L${x} ${y - 105}L${x + 19} ${y - 85}Z" fill="#f2b632" ${SW} stroke-width="2"/>
  <path d="M${x - 12} ${y - 101}L${x} ${y - 117}L${x + 12} ${y - 101}Z" fill="#d9542e" ${SW} stroke-width="2"/>
  ${line(`M${x} ${y - 117}L${x} ${y - 125}M${x - 19} ${y - 85}q-5 -1 -4 -6M${x + 19} ${y - 85}q5 -1 4 -6`, O, 2)}
  ${[-14, -7, 0, 7, 14].map(d => `<circle cx="${x + d}" cy="${y - 60}" r="2.3" fill="#f39c12" stroke="${O}" stroke-width=".8"/>`).join('')}
  <rect x="${x + 12}" y="${y - 12}" width="4.5" height="12" rx="1.5" fill="#e0342b" ${SW} stroke-width="1.2"/>
  <rect x="${x + 19}" y="${y - 12}" width="4.5" height="12" rx="1.5" fill="#e0342b" ${SW} stroke-width="1.2"/>
  ${line(`M${x + 14} ${y - 12}l2 -5M${x + 21} ${y - 12}l2 -5`, '#fff', 1)}
  ${ell(x - 15, y - 3, 6, 3.5, '#c9a15a', 0, 1.4)}${circ(x - 17, y - 7, 2.2, '#f39c12', 1)}${circ(x - 13, y - 7, 2.2, '#fff', 1)}</g>`;
}

function stiltHouse() {
  let s = '<g>';
  [586, 626, 666, 706, 746, 776].forEach(x => { s += `<rect x="${x - 4}" y="160" width="8" height="92" fill="#6e4526" ${SW} stroke-width="2"/>`; });
  s += oline('M706 196Q726 232 746 196', '#c0392b', 3);
  s += `<rect x="622" y="226" width="68" height="7" fill="#d9b36a" ${SW} stroke-width="2"/>` + line('M628 233v15M684 233v15', O, 3);
  s += ell(760, 240, 12, 10, '#6d3417', 0, 2) + ell(760, 231, 8, 3, '#4a2410', 0, 1.5);
  s += `<rect x="574" y="156" width="214" height="9" fill="#7a4a26" ${SW} stroke-width="2.5"/>`;
  s += `<rect x="588" y="96" width="188" height="61" fill="#b8763f" ${SW} stroke-width="3"/>`;
  let planks = '';
  for (let x = 598; x < 776; x += 10) planks += `M${x} 99V155`;
  s += line(planks, '#8e5a2d', 1.4);
  s += `<rect x="606" y="112" width="24" height="28" fill="#3d2414" ${SW} stroke-width="2.5"/><rect x="596" y="112" width="10" height="28" fill="#9a5e30" ${SW} stroke-width="2"/><rect x="630" y="112" width="10" height="28" fill="#9a5e30" ${SW} stroke-width="2"/>`;
  s += `<rect x="728" y="112" width="24" height="28" fill="#3d2414" ${SW} stroke-width="2.5"/><rect x="718" y="112" width="10" height="28" fill="#9a5e30" ${SW} stroke-width="2"/><rect x="752" y="112" width="10" height="28" fill="#9a5e30" ${SW} stroke-width="2"/>`;
  s += `<rect x="669" y="106" width="28" height="51" fill="#5a331b" ${SW} stroke-width="2.5"/>` + circ(691, 132, 1.8, '#f2c14e', 1);
  s += `<path d="M566 104L682 26L798 104Z" fill="#a44a2b" ${SW} stroke-width="3"/>`;
  s += `<path d="M602 99L682 45L762 99Z" fill="#d49a5a" ${SW} stroke-width="2.5"/>`;
  s += line('M682 99L640 71M682 99L661 58M682 99L682 47M682 99L703 58M682 99L724 71', '#a8703a', 1.6);
  s += line('M580 102L682 34L784 102', '#7d3520', 2);
  s += oline('M668 14L696 44M696 14L668 44', '#a44a2b', 4.5);
  s += line('M592 158L562 251M606 158L576 251', O, 3.5);
  let rungs = '';
  for (let i = 1; i <= 6; i++) { const y = 158 + i * 13, dx = (y - 158) * 30 / 93; rungs += `M${r(592 - dx)} ${y}L${r(606 - dx)} ${y}`; }
  s += line(rungs, '#7a4a26', 3);
  return s + '</g>';
}

function buffalo() {
  return `<g transform="translate(705 342)">
  <g class="btail">${line('M52 -42Q62 -30 58 -12', O, 3)}${ell(58, -10, 3, 5, '#3a3d42', 0, 1.5)}</g>
  ${[-36, -22, 26, 40].map(x => `<rect x="${x - 4}" y="-22" width="9" height="22" rx="2" fill="#555a63" ${SW} stroke-width="2"/>`).join('')}
  <path d="M-44 -46Q-40 -63 0 -61Q42 -63 55 -47Q61 -28 48 -18L-40 -18Q-52 -28 -44 -46Z" fill="#5d626b" ${SW} stroke-width="3"/>
  ${line('M-30 -30Q0 -24 34 -30', '#6c717b', 3)}
  <g transform="translate(14 -64)">${ell(0, 0, 8, 5, '#fff', -10, 1.6)}${line('M5 -2Q9 -9 7 -13', O, 3.4)}${line('M5 -2Q9 -9 7 -13', '#fff', 1.6)}<path d="M7 -13L13 -12L7 -11Z" fill="#f2c14e" ${SW} stroke-width="1"/>${line('M-2 4l-1 3M2 4l1 3', '#333', 1)}</g>
  <g class="bhead">
    <path d="M-50 -52Q-44 -72 -22 -72Q-40 -64 -44 -50Z" fill="#d9ccb4" ${SW} stroke-width="2"/>
    <path d="M-44 -50Q-66 -52 -71 -35Q-73 -22 -63 -18Q-54 -16 -50 -26Q-43 -34 -44 -50Z" fill="#5d626b" ${SW} stroke-width="2.6"/>
    ${ell(-65, -23, 7.5, 5.5, '#8a8f98', 0, 2)}<circle cx="-68" cy="-23" r="1.3" fill="${O}"/><circle cx="-63" cy="-22" r="1.3" fill="${O}"/>
    ${circ(-60, -39, 2.4, '#fff', 1.2)}<circle cx="-60.5" cy="-39" r="1.2" fill="${O}"/>
    ${ell(-44, -45, 7, 3, '#4a4e56', -20, 1.6)}
    <path d="M-56 -50Q-70 -72 -90 -64Q-72 -62 -62 -48Z" fill="#e2d6c0" ${SW} stroke-width="2"/>
  </g></g>`;
}

function fence(x1, x2, y) {
  let s = '';
  for (let x = x1; x <= x2; x += 32) s += `<rect x="${x - 3}" y="${y - 44}" width="7" height="48" fill="#9a6a3c" ${SW} stroke-width="2"/>`;
  return oline(`M${x1 - 10} ${y - 34}L${x2 + 10} ${y - 36}M${x1 - 10} ${y - 16}L${x2 + 10} ${y - 18}`, '#b88350', 4) + s;
}

function tufts(list) {
  return line(list.map(([x, y]) => `M${x} ${y}l-3 -7M${x} ${y}l0 -9M${x} ${y}l3 -7`).join(''), '#6f9a34', 1.8);
}
