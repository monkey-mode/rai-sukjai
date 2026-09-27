/* Static backgrounds for the three scenes. */
'use strict';

function farmBG() {
  let s = `<defs><linearGradient id="gSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#86cdea"/><stop offset=".8" stop-color="#fbe6b2"/></linearGradient></defs>`;
  s += `<rect width="800" height="260" fill="url(#gSky)"/>`;
  s += circ(120, 94, 24, '#ffd54a', 3);
  s += cloud(260, 88, 1, '') + cloud(440, 70, .75, 'd2') + cloud(40, 128, .6, 'd2');
  s += `<path d="M0 170Q30 152 60 164Q90 148 125 162Q160 146 200 160Q240 148 280 162Q320 150 360 162Q400 148 440 160Q480 150 520 162Q560 152 600 162L800 162L800 190L0 190Z" fill="#5f8f3e" ${SW} stroke-width="2.5"/>`;
  s += `<rect x="0" y="176" width="800" height="76" fill="#a8d04e"/>`;
  s += `<rect x="92" y="196" width="140" height="20" fill="#bfe27a"/><rect x="380" y="178" width="130" height="16" fill="#c3dfe8" opacity=".7"/>`;
  s += line('M0 196L800 192M0 216L800 211M0 238L800 232M90 176L72 252M230 176L212 252M370 176L352 252M520 176L502 252', '#dcc67c', 3);
  let rice = [];
  [186, 205, 227, 247].forEach((y, row) => { for (let x = 6 + row * 7; x < 560; x += 21) rice.push([x, y]); });
  s += line(rice.map(([x, y]) => `M${x} ${y}l-2 -5M${x} ${y}l0 -6M${x} ${y}l2 -5`).join(''), '#6a9a2e', 1.3);
  s += sugarPalm(60, 190, 1) + sugarPalm(168, 194, .85) + sugarPalm(300, 188, 1.1) + sugarPalm(396, 196, .8) + sugarPalm(545, 186, .9);
  s += `<path d="M0 250Q150 242 300 248T600 246T800 248L800 600L0 600Z" fill="#bccb6c" ${SW} stroke-width="3"/>`;
  s += `<rect x="8" y="248" width="462" height="290" rx="18" fill="#d6b277" ${SW} stroke-width="2.5"/>`;
  s += `<path d="M470 530Q600 500 800 470L800 540Q600 548 470 540Z" fill="#d6b277"/>`;
  s += tufts([[480, 270], [540, 262], [600, 380], [790, 380], [480, 520], [720, 540], [560, 380], [640, 540], [700, 390]]);
  s += stiltHouse();
  s += coconutTree(24, 262, 150, 18) + coconutTree(462, 256, 116, -12);
  s += spiritHouse(518, 252);
  s += buffalo();
  s += fence(610, 800, 350);
  return s;
}

function marketBG() {
  let s = `<rect width="800" height="600" fill="#c78b52"/>`;
  let pl = '';
  for (let y = 70; y < 470; y += 22) pl += `M0 ${y}H800`;
  s += line(pl, '#a8703f', 2);
  s += `<rect y="470" width="800" height="130" fill="#8a5a33"/>` + line('M0 470H800M0 520H800M100 470L80 600M300 470L290 600M500 470L510 600M700 470L720 600', '#6e4526', 2.5);
  // hanging goods along the back
  s += line('M200 60Q500 80 800 60', O, 1.6);
  [240, 330, 420, 510, 600, 690, 770].forEach((x, i) => {
    s += line(`M${x} 66v12`, O, 1.4) + (i % 2 ? circ(x, 86, 8, '#f39c12', 2) + circ(x - 6, 96, 6, '#f7c52b', 1.6) : `<path d="M${x - 8} 78Q${x} 104 ${x + 8} 78Z" fill="#f2d26b" ${SW} stroke-width="1.8"/>`);
  });
  // stall frame, awning & counter on the left
  s += `<rect x="12" y="46" width="10" height="440" fill="#6e4526" ${SW} stroke-width="2"/><rect x="186" y="46" width="10" height="440" fill="#6e4526" ${SW} stroke-width="2"/>`;
  for (let i = 0; i < 5; i++) {
    const x = 4 + i * 40, col = i % 2 ? '#fff4e0' : '#d6372c';
    s += `<rect x="${x}" y="46" width="40" height="50" fill="${col}"/><path d="M${x} 96A20 16 0 0 0 ${x + 40} 96Z" fill="${col}" ${SW} stroke-width="2.4"/>`;
  }
  s += `<path d="M4 46H204V96" fill="none" stroke="${O}" stroke-width="3"/>`;
  s += `<g transform="translate(104 122)"><rect x="-70" y="-14" width="140" height="30" rx="6" fill="#fff4d6" ${SW} stroke-width="2.6"/>` +
    `<text x="0" y="4" text-anchor="middle" font-family="Kanit" font-size="17" font-weight="700" fill="#c8372d">แผงป้าแดง</text></g>`;
  s += auntieDaeng(104, 440);
  s += `<rect x="4" y="380" width="200" height="100" fill="#a8693a" ${SW} stroke-width="3"/>` + line('M4 404H204M4 440H204', '#7a4a26', 2);
  s += ell(44, 380, 30, 10, '#d6ad62', 0, 2) + ell(116, 382, 32, 10, '#d6ad62', 0, 2) + ell(176, 380, 24, 9, '#d6ad62', 0, 2);
  [[34, 372, 3], [48, 370, 3], [58, 374, 3], [104, 372, 6], [120, 370, 6], [132, 374, 6], [168, 372, 2], [182, 373, 2]].forEach(([x, y, c]) => { s += `<g transform="translate(${x} ${y}) scale(.6)">${produceIcon(c)}</g>`; });
  return s;
}

function penBG() {
  let s = `<rect width="800" height="160" fill="#9fd6ee"/>` + cloud(640, 80, .8, '') + cloud(360, 70, .6, 'd2');
  s += `<path d="M0 150Q60 120 120 140Q190 110 260 138Q330 112 400 136Q470 114 540 138Q620 116 700 136Q760 120 800 132V170H0Z" fill="#5f8f3e" ${SW} stroke-width="2.5"/>`;
  s += `<rect y="160" width="800" height="440" fill="#a9c95e"/>` + line('M0 160H800', O, 2.5);
  s += `<rect x="215" y="250" width="585" height="300" fill="#b7cf6b"/>`;
  // pond
  s += ell(660, 205, 122, 44, '#5fb3dd', 0, 3) + ell(640, 198, 80, 22, '#8fd0ee', 0, 0);
  s += ell(600, 214, 14, 6, '#4f9a34', 0, 1.6) + ell(700, 196, 12, 5, '#4f9a34', 0, 1.6) + circ(700, 190, 5, '#f4a6c0', 1.6) + ell(740, 220, 11, 5, '#4f9a34', 0, 1.6);
  s += line('M548 212l-4 -24M556 214l2 -26M770 200l4 -24M778 204l-2 -22', '#4d7a2a', 2.4) + ell(544, 186, 2, 6, '#7a4a26', 0, 1) + ell(774, 176, 2, 6, '#7a4a26', 0, 1);
  // shed
  s += `<rect x="236" y="170" width="8" height="70" fill="#7a4a26" ${SW} stroke-width="2"/><rect x="350" y="170" width="8" height="70" fill="#7a4a26" ${SW} stroke-width="2"/>`;
  s += `<rect x="240" y="196" width="114" height="44" fill="#5a3a22" ${SW} stroke-width="2"/>`;
  s += `<path d="M222 182L297 128L372 182Z" fill="#d9b25a" ${SW} stroke-width="3"/>` + line('M240 176L297 136M260 180L297 140M280 182L297 146M314 182L297 146M334 180L297 140M354 176L297 136', '#b08a3a', 1.6);
  // fences
  let fp = '';
  for (let x = 215; x <= 800; x += 26) fp += `<rect x="${x - 3}" y="236" width="6" height="26" fill="#c9a15a" ${SW} stroke-width="1.6"/>`;
  s += fp + oline('M205 246H800', '#d6b16a', 3);
  let lp = '';
  for (let y = 260; y <= 540; y += 26) lp += `<rect x="212" y="${y - 3}" width="6" height="22" fill="#c9a15a" ${SW} stroke-width="1.6"/>`;
  s += lp;
  s += tufts([[260, 520], [540, 540], [760, 300], [380, 280], [720, 520], [100, 180], [150, 240], [60, 260]]);
  s += uncleMee(96, 318);
  return s;
}
