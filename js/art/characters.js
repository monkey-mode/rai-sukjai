/* Characters: the farmer, Auntie Daeng (ป้าแดง) and Uncle Mee (ลุงมี). */
'use strict';

function farmer(x, y, tired) {
  const face = tired
    ? line(`M${x - 6} ${y - 64}l3 1M${x + 3} ${y - 63}l3 -1M${x - 3} ${y - 57}q3 -2 6 0`, O, 1.6) + `<path d="M${x + 10} ${y - 68}q2 4 0 6q-3 -2 0 -6Z" fill="#8fd3ef" stroke="${O}" stroke-width="1"/>`
    : `<circle cx="${x - 4}" cy="${y - 64}" r="1.5" fill="${O}"/><circle cx="${x + 4}" cy="${y - 64}" r="1.5" fill="${O}"/>` + line(`M${x - 4} ${y - 59}q4 3 8 0`, O, 1.6);
  let s = `<g class="farmer-idle">`;
  s += `<rect x="${x - 12}" y="${y - 28}" width="10" height="27" fill="#2c3e6b" ${SW} stroke-width="2"/><rect x="${x + 2}" y="${y - 28}" width="10" height="27" fill="#2c3e6b" ${SW} stroke-width="2"/>`;
  s += ell(x - 8, y, 6, 2.8, '#c98f5c', 0, 1.6) + ell(x + 8, y, 6, 2.8, '#c98f5c', 0, 1.6);
  s += oline(`M${x - 14} ${y - 50}Q${x - 22} ${y - 38} ${x - 19} ${y - 28}`, '#35507a', 5) + circ(x - 19, y - 27, 3.2, '#d9a066', 1.5);
  s += oline(`M${x + 14} ${y - 50}Q${x + 22} ${y - 40} ${x + 20} ${y - 30}`, '#35507a', 5) + circ(x + 20, y - 29, 3.2, '#d9a066', 1.5);
  s += `<path d="M${x - 14} ${y - 52}Q${x} ${y - 58} ${x + 14} ${y - 52}L${x + 13} ${y - 26}L${x - 13} ${y - 26}Z" fill="#35507a" ${SW} stroke-width="2.4"/>`;
  s += `<rect x="${x - 14}" y="${y - 32}" width="28" height="6" fill="#d8453a" ${SW} stroke-width="1.8"/>` + line(`M${x - 8} ${y - 32}v6M${x - 2} ${y - 32}v6M${x + 4} ${y - 32}v6M${x + 10} ${y - 32}v6M${x - 14} ${y - 29}h28`, '#fff', .9);
  s += circ(x, y - 62, 10, '#d9a066', 2) + face;
  s += `<path d="M${x - 25} ${y - 67}Q${x} ${y - 94} ${x + 25} ${y - 67}Q${x} ${y - 72} ${x - 25} ${y - 67}Z" fill="#e3c070" ${SW} stroke-width="2.4"/>`;
  s += line(`M${x - 14} ${y - 72}L${x} ${y - 86}L${x + 14} ${y - 72}M${x - 6} ${y - 70}L${x} ${y - 86}L${x + 6} ${y - 70}`, '#b8963f', 1.2);
  s += `</g>`;
  if (tired) {
    s += `<g transform="translate(${x - 72} ${y - 140})"><path d="M0 0H120V40H62L52 52L50 40H0Z" fill="#fff" ${SW} stroke-width="2.5"/>` +
      `<text x="60" y="19" text-anchor="middle" font-family="Kanit" font-size="16" font-weight="600" fill="${O}">เหนื่อยแล้ว…</text>` +
      `<text x="60" y="33" text-anchor="middle" font-family="Sarabun" font-size="10" fill="${O}" opacity=".8">I'm tired</text></g>`;
  }
  return s;
}

function auntieDaeng(x, y) {
  return `<g>
  ${circ(x + 4, y - 206, 12, '#2a1c15', 2)}
  <path d="M${x - 44} ${y - 30}L${x - 40} ${y - 104}Q${x - 38} ${y - 128} ${x - 18} ${y - 134}L${x + 18} ${y - 134}Q${x + 38} ${y - 128} ${x + 40} ${y - 104}L${x + 44} ${y - 30}Z" fill="#d6372c" ${SW} stroke-width="3"/>
  ${line(`M${x - 20} ${y - 128}Q${x} ${y - 110} ${x + 20} ${y - 128}`, '#f2c14e', 2.4)}${circ(x, y - 114, 3.5, '#f2c14e', 1.4)}
  ${line(`M${x - 30} ${y - 90}Q${x - 36} ${y - 70} ${x - 30} ${y - 54}`, '#a8261f', 2)}
  <rect x="${x - 8}" y="${y - 142}" width="16" height="12" fill="#e0a66e" ${SW} stroke-width="2"/>
  ${circ(x, y - 166, 27, '#e0a66e', 3)}
  <path d="M${x - 28} ${y - 164}Q${x - 30} ${y - 198} ${x} ${y - 196}Q${x + 30} ${y - 198} ${x + 28} ${y - 164}Q${x + 20} ${y - 184} ${x} ${y - 182}Q${x - 18} ${y - 184} ${x - 28} ${y - 164}Z" fill="#2a1c15" ${SW} stroke-width="2.4"/>
  ${circ(x + 22, y - 190, 5.5, '#f39c12', 1.6)}${circ(x + 22, y - 190, 2, '#d6372c', 0)}
  ${line(`M${x - 13} ${y - 168}q4 -4 8 0M${x + 5} ${y - 168}q4 -4 8 0M${x - 8} ${y - 154}q8 7 16 0`, O, 2.2)}
  ${ell(x - 15, y - 158, 5, 3, '#f08a7a', 0, 0)}${ell(x + 15, y - 158, 5, 3, '#f08a7a', 0, 0)}
  ${circ(x - 27, y - 160, 2.6, '#f2c14e', 1.2)}${circ(x + 27, y - 160, 2.6, '#f2c14e', 1.2)}
  ${oline(`M${x + 38} ${y - 104}Q${x + 60} ${y - 120} ${x + 58} ${y - 146}`, '#d6372c', 8)}${circ(x + 58, y - 148, 5, '#e0a66e', 2)}
  <path d="M${x + 58} ${y - 150}L${x + 40} ${y - 180}Q${x + 60} ${y - 192} ${x + 80} ${y - 176}Z" fill="#f2c14e" ${SW} stroke-width="2"/>
  ${line(`M${x + 58} ${y - 150}L${x + 50} ${y - 184}M${x + 58} ${y - 150}L${x + 62} ${y - 186}M${x + 58} ${y - 150}L${x + 72} ${y - 180}`, '#c9901e', 1.3)}
  </g>`;
}

function uncleMee(x, y) {
  return `<g>
  ${oline(`M${x + 30} ${y}L${x + 38} ${y - 150}`, '#c9a15a', 3)}
  <path d="M${x + 38} ${y - 150}L${x + 62} ${y - 142}L${x + 37} ${y - 132}Z" fill="#d6372c" ${SW} stroke-width="2"/>
  <rect x="${x - 16}" y="${y - 52}" width="14" height="50" fill="#2d2d2d" ${SW} stroke-width="2"/><rect x="${x + 2}" y="${y - 52}" width="14" height="50" fill="#2d2d2d" ${SW} stroke-width="2"/>
  ${ell(x - 10, y, 9, 3.5, '#8a5a2e', 0, 1.8)}${ell(x + 10, y, 9, 3.5, '#8a5a2e', 0, 1.8)}
  <path d="M${x - 22} ${y - 106}Q${x} ${y - 114} ${x + 22} ${y - 106}L${x + 20} ${y - 50}L${x - 20} ${y - 50}Z" fill="#f4f1e8" ${SW} stroke-width="2.6"/>
  <path d="M${x - 20} ${y - 108}L${x + 22} ${y - 60}L${x + 16} ${y - 54}L${x - 24} ${y - 98}Z" fill="#3a6fb0" ${SW} stroke-width="2"/>
  ${line(`M${x - 14} ${y - 100}l6 -5M${x - 4} ${y - 88}l6 -5M${x + 6} ${y - 76}l6 -5`, '#d8453a', 2)}
  ${oline(`M${x - 22} ${y - 104}Q${x - 32} ${y - 80} ${x - 26} ${y - 62}`, '#c98f5c', 6)}
  ${oline(`M${x + 22} ${y - 104}Q${x + 32} ${y - 94} ${x + 32} ${y - 76}`, '#c98f5c', 6)}
  ${circ(x, y - 130, 21, '#c98f5c', 3)}
  <path d="M${x - 21} ${y - 134}Q${x - 24} ${y - 148} ${x - 12} ${y - 146}M${x + 21} ${y - 134}Q${x + 24} ${y - 148} ${x + 12} ${y - 146}" fill="#dcd8d0" ${SW} stroke-width="2"/>
  <path d="M${x - 30} ${y - 142}Q${x} ${y - 176} ${x + 30} ${y - 142}Q${x} ${y - 148} ${x - 30} ${y - 142}Z" fill="#e3c070" ${SW} stroke-width="2.4"/>
  ${line(`M${x - 8} ${y - 132}h3M${x + 5} ${y - 132}h3`, O, 2.4)}
  <path d="M${x - 10} ${y - 122}Q${x} ${y - 128} ${x + 10} ${y - 122}Q${x} ${y - 118} ${x - 10} ${y - 122}Z" fill="#eeeae2" ${SW} stroke-width="1.6"/>
  ${line(`M${x - 4} ${y - 116}q4 3 8 0`, O, 1.6)}</g>`;
}
