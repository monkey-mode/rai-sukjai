/* Reusable scenery: trees, clouds, spirit house, stilt house, buffalo, fences. */
'use strict';

function cloud(x, y, sc, cls) {
  if (Assets.has('scenery.cloud')) return `<g class="drift ${cls}"><g transform="translate(${x} ${y}) scale(${sc})">${Assets.image('scenery.cloud', 3, -8)}</g></g>`;
  return `<g class="drift ${cls}"><g transform="translate(${x} ${y}) scale(${sc})"><path d="M-30 8Q-35 -6 -18 -6Q-14 -20 2 -16Q10 -27 22 -14Q37 -14 34 0Q41 9 29 10Z" fill="#fffaf0" ${SW} stroke-width="2.5"/></g></g>`;
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

// Pivots of the buffalo asset's head and tail, relative to the body's ground anchor (see animal.buffalo_* in the manifest).
const BUFFALO_PARTS = { head: [30, -29], tail: [-39, -61] };   // printed by tools/export-models.mjs

// Water buffalo standing at ground point (x, y). The 3/4-view asset is three parts so the head can graze
// and the tail can swish; the code-drawn fallback is a side view.
function buffalo(x = 705, y = 342) {
  if (Assets.has('animal.buffalo')) {
    const part = (id, [dx, dy], cls) => Assets.has(id) ? `<g transform="translate(${dx} ${dy})"><g class="${cls}">${Assets.image(id)}</g></g>` : '';
    return `<g transform="translate(${x} ${y})"><ellipse cx="4" cy="2" rx="46" ry="14" fill="rgba(58,34,19,.18)"/>${part('animal.buffalo_tail', BUFFALO_PARTS.tail, 'atail')}${Assets.image('animal.buffalo')}${part('animal.buffalo_head', BUFFALO_PARTS.head, 'ahead')}</g>`;
  }
  return `<g transform="translate(${x} ${y})">
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

function tufts(list) {
  return line(list.map(([x, y]) => `M${x} ${y}l-3 -7M${x} ${y}l0 -9M${x} ${y}l3 -7`).join(''), '#6f9a34', 1.8);
}
