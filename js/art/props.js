/* Clickable farm props: dragon jar, ox cart and signposts. */
'use strict';

function dragonJar(x, top) {
  const b = top + 88;
  return `<g data-act="jar" class="jar"><title>โอ่งมังกร · Dragon jar</title>
  <ellipse cx="${x}" cy="${b}" rx="32" ry="6" fill="rgba(0,0,0,.2)"/>
  <path d="M${x - 20} ${top + 8}Q${x - 46} ${top + 40} ${x - 22} ${b}L${x + 22} ${b}Q${x + 46} ${top + 40} ${x + 20} ${top + 8}Z" fill="#7b3a1a" ${SW} stroke-width="3"/>
  ${oline(`M${x - 28} ${top + 48}Q${x - 14} ${top + 30} ${x - 2} ${top + 48}T${x + 24} ${top + 44}`, '#f2c14e', 4)}
  ${circ(x + 26, top + 42, 5.5, '#f2c14e', 2)}<circle cx="${x + 27}" cy="${top + 41}" r="1.2" fill="${O}"/>
  ${line(`M${x + 30} ${top + 38}l5 -4M${x - 26} ${top + 48}l-5 5M${x - 12} ${top + 38}l-1 -5M${x + 8} ${top + 50}l1 5`, '#f2c14e', 2.2)}
  ${line(`M${x - 24} ${top + 64}Q${x} ${top + 70} ${x + 24} ${top + 64}`, '#5a2a12', 2)}
  ${line(`M${x - 27} ${top + 26}Q${x - 32} ${top + 48} ${x - 22} ${top + 72}`, 'rgba(255,255,255,.3)', 4)}
  ${ell(x, top + 8, 21, 6, '#5a2a12', 0, 2.5)}${ell(x, top + 9, 16, 3.5, '#5fb3dd', 0, 1.2)}
  <path d="M${x + 8} ${top + 4}q10 -4 12 4" fill="#8a6440" ${SW} stroke-width="1.6"/></g>`;
}

function oxCart(x, y, glow) {
  let s = `<g data-act="cart" class="hot ${glow ? 'glow' : ''}"><title>เกวียน · Market cart</title>`;
  s += `<ellipse cx="${x + 85}" cy="${y + 2}" rx="75" ry="6" fill="rgba(0,0,0,.18)"/>`;
  s += oline(`M${x + 30} ${y - 46}L${x - 12} ${y - 36}Q${x - 20} ${y - 36} ${x - 20} ${y - 46}`, '#9a6a3c', 5);
  s += `<path d="M${x + 22} ${y - 66}L${x + 150} ${y - 66}L${x + 146} ${y - 42}L${x + 26} ${y - 42}Z" fill="#a8693a" ${SW} stroke-width="2.6"/>`;
  s += line(`M${x + 30} ${y - 58}H${x + 144}M${x + 30} ${y - 50}H${x + 144}`, '#7a4a26', 1.4);
  s += ell(x + 58, y - 70, 18, 9, '#d6ad62', 0, 2) + ell(x + 108, y - 70, 20, 10, '#d6ad62', 0, 2);
  s += `<g transform="translate(${x + 50} ${y - 78}) scale(.7)">${produceIcon(7)}</g><g transform="translate(${x + 66} ${y - 76}) scale(.6)">${produceIcon(6)}</g>`;
  s += `<g transform="translate(${x + 100} ${y - 80}) scale(.6)">${produceIcon(3)}</g><g transform="translate(${x + 116} ${y - 78}) scale(.6)">${produceIcon(5)}</g>`;
  s += `<path d="M${x + 24} ${y - 66}V${y - 86}M${x + 148} ${y - 66}V${y - 86}" stroke="${O}" stroke-width="3.5"/><path d="M${x + 20} ${y - 88}H${x + 152}" stroke="${O}" stroke-width="6" stroke-linecap="round"/><path d="M${x + 20} ${y - 88}H${x + 152}" stroke="#b88350" stroke-width="3" stroke-linecap="round"/>`;
  const wx = x + 88, wy = y - 28;
  s += circ(wx, wy, 29, '#8a5a2e', 3) + circ(wx, wy, 23, '#d6b277', 2);
  let sp = '';
  for (let a = 0; a < 180; a += 22.5) { const rad = a * Math.PI / 180; sp += `M${r(wx + Math.cos(rad) * 23)} ${r(wy + Math.sin(rad) * 23)}L${r(wx - Math.cos(rad) * 23)} ${r(wy - Math.sin(rad) * 23)}`; }
  s += line(sp, '#7a4a26', 2.6) + circ(wx, wy, 6, '#5a3a1e', 2);
  s += `<g transform="translate(${x + 110} ${y - 132})"><path d="M8 26V52" stroke="${O}" stroke-width="3"/><rect x="-26" y="0" width="68" height="30" rx="6" fill="#fff4d6" ${SW} stroke-width="2.4"/>` +
    `<text x="8" y="15" text-anchor="middle" font-family="Kanit" font-weight="600" font-size="13" fill="${O}">ขายผลผลิต</text>` +
    `<text x="8" y="26" text-anchor="middle" font-family="Sarabun" font-size="9" fill="${O}">Sell produce</text></g>`;
  return s + '</g>';
}

function signpost(dim) {
  const board = (act, y, th, en) => `<g data-act="${act}" class="sign ${dim ? 'dim' : ''}"><title>${en}</title><path d="M706 ${y}H780L796 ${y + 18}L780 ${y + 36}H706Z" fill="#c98c4a" ${SW} stroke-width="2.6"/>` +
    `<text x="746" y="${y + 17}" text-anchor="middle" font-family="Kanit" font-weight="600" font-size="14" fill="${O}">${th}</text>` +
    `<text x="746" y="${y + 29}" text-anchor="middle" font-family="Sarabun" font-size="9" fill="${O}">${en} · −5⚡</text></g>`;
  return `<rect x="748" y="400" width="8" height="132" fill="#8a5a2e" ${SW} stroke-width="2"/>` +
    board('go-market', 408, 'ไปตลาด', 'Market') + board('go-pen', 460, 'คอกเป็ด', 'Duck pen');
}
