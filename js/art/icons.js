/* Tool, HUD and weather icons. */
'use strict';

const ICON = {
  water: `<svg viewBox="0 0 36 36"><path d="M24 17L33 9L35 12L26 22Z" fill="#3aa0c8" ${SW} stroke-width="2"/>${circ(33.5, 9.5, 3, '#2c86ad', 2)}<path d="M11 14Q16 3 21 14" fill="none" stroke="${O}" stroke-width="2.6"/><path d="M7 14H25V28A3 3 0 0 1 22 31H10A3 3 0 0 1 7 28Z" fill="#3aa0c8" ${SW} stroke-width="2.2"/><path d="M10 18V27" stroke="#a5e0f5" stroke-width="2" stroke-linecap="round"/></svg>`,
  fertilize: `<svg viewBox="0 0 36 36"><path d="M9 10Q18 6 27 10L29 31Q18 34 7 31Z" fill="#e8d7a8" ${SW} stroke-width="2.2"/><path d="M10 10Q18 3 26 10" fill="#d9c28a" ${SW} stroke-width="2"/>${lf(18, 26, 0, 12, 5, '#4fa33a', 1.4)}<path d="M13 16H23" stroke="#b08a52" stroke-width="2"/></svg>`,
  spray: `<svg viewBox="0 0 36 36"><rect x="7" y="11" width="15" height="20" rx="4" fill="#e2573b" ${SW} stroke-width="2.2"/><path d="M22 14L30 8M30 8l4 -1" fill="none" stroke="${O}" stroke-width="2.4" stroke-linecap="round"/><path d="M11 11V6H18" fill="none" stroke="${O}" stroke-width="2.4" stroke-linecap="round"/><rect x="10" y="17" width="9" height="6" rx="1.5" fill="#fff4d6" ${SW} stroke-width="1.4"/><circle cx="33" cy="5" r="1.2" fill="#8fd3ef"/><circle cx="34" cy="10" r="1" fill="#8fd3ef"/></svg>`,
  cut: `<svg viewBox="0 0 36 36"><path d="M7 26L25 7Q31 4 30 11L12 30Z" fill="#cfd6dc" ${SW} stroke-width="2.2"/><path d="M11 25L26 10" stroke="#fff" stroke-width="1.5"/><rect x="2" y="26" width="12" height="6" rx="2" transform="rotate(-45 8 29)" fill="#7a4b2a" ${SW} stroke-width="2"/></svg>`,
  pick: `<svg viewBox="0 0 36 36"><path d="M9 16Q18 2 27 16" fill="none" stroke="${O}" stroke-width="2.6"/><path d="M5 16H31L27 31H9Z" fill="#d6ad62" ${SW} stroke-width="2.2"/><path d="M8 21H28M9 26H27M13 16V31M18 16V31M23 16V31" stroke="#9a7338" stroke-width="1.3"/>${circ(14, 14, 3.2, '#d8261d', 1.4)}${circ(20, 13, 3.2, '#f7c52b', 1.4)}</svg>`,
  sun: `<svg viewBox="0 0 34 34" width="30" height="30"><g stroke="${O}" stroke-width="2" stroke-linecap="round">${[0, 45, 90, 135, 180, 225, 270, 315].map(a => `<path d="M17 3V7" transform="rotate(${a} 17 17)"/>`).join('')}</g>${circ(17, 17, 7.5, '#ffd54a', 2)}</svg>`,
  rain: `<svg viewBox="0 0 34 34" width="30" height="30"><path d="M8 20Q3 20 4 15Q5 11 9 12Q10 6 16 6Q22 6 23 11Q29 10 30 15Q30 20 25 20Z" fill="#e8eef5" ${SW} stroke-width="2"/><path d="M11 24l-2 4M17 24l-2 4M23 24l-2 4" stroke="#6ec3ec" stroke-width="2.4" stroke-linecap="round"/></svg>`,
  sound: `<svg viewBox="0 0 24 24" width="22" height="22"><path d="M4 9H8L13 5V19L8 15H4Z" fill="${O}"/><path d="M16 9Q18 12 16 15M18.5 6.5Q22 12 18.5 17.5" fill="none" stroke="${O}" stroke-width="2" stroke-linecap="round"/></svg>`,
  mute: `<svg viewBox="0 0 24 24" width="22" height="22"><path d="M4 9H8L13 5V19L8 15H4Z" fill="${O}"/><path d="M16 9L22 15M22 9L16 15" stroke="#c8372d" stroke-width="2.4" stroke-linecap="round"/></svg>`,
  menu: `<svg viewBox="0 0 24 24" width="20" height="20"><path d="M4 6H20M4 12H20M4 18H20" stroke="${O}" stroke-width="2.6" stroke-linecap="round"/></svg>`,
  feed: `<svg viewBox="0 0 24 24" width="17" height="17"><path d="M6 7Q12 4 18 7L19 20Q12 22 5 20Z" fill="#e8c77a" ${SW} stroke-width="1.8"/><circle cx="10" cy="14" r="1.2" fill="#8a5a22"/><circle cx="14" cy="12" r="1.2" fill="#8a5a22"/><circle cx="13" cy="16" r="1.2" fill="#8a5a22"/></svg>`,
  duck: `<svg viewBox="-20 -34 42 38" width="19" height="17">${duckShape()}</svg>`,
};
ICON.fertS = ICON.fertilize.replace('<svg viewBox="0 0 36 36">', '<svg viewBox="0 0 36 36" width="17" height="17">');
ICON.sprayS = ICON.spray.replace('<svg viewBox="0 0 36 36">', '<svg viewBox="0 0 36 36" width="17" height="17">');

function duckShape() {
  return line('M-5 0L-7 3M4 0L6 3', '#e8932a', 2.4) +
    `<path d="M-17 -12Q-19 -25 -2 -25L10 -23Q17 -20 16 -11Q12 -1 -4 -1Q-15 -1 -17 -12Z" fill="#b8874f" ${SW} stroke-width="2"/>` +
    `<path d="M-17 -15L-22 -19L-15 -19Z" fill="#8c6538" ${SW} stroke-width="1.6"/>` +
    `<path d="M-10 -16Q-2 -21 7 -15Q0 -8 -9 -11Z" fill="#8c6538" ${SW} stroke-width="1.6"/>` +
    `<path d="M8 -22Q6 -31 13 -32Q20 -32 19 -25Q18 -21 13 -20Z" fill="#5c4a2f" ${SW} stroke-width="2"/>` +
    `<path d="M18 -28L26 -26.5L18 -24Z" fill="#e8a23a" ${SW} stroke-width="1.5"/><circle cx="14.5" cy="-27.5" r="1.3" fill="${O}"/>`;
}
