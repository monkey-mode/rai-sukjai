/* SVG drawing primitives shared by all art (thick dark outline style). */
'use strict';

const O = '#3a2213';

const SW = `stroke="${O}" stroke-linejoin="round" stroke-linecap="round"`;

const r = n => Math.round(n * 10) / 10;

function lf(x, y, rot, len, w, fill, sw = 1.6) {
  return `<path d="M0 0Q${r(w)} ${r(-len * .5)} 0 ${r(-len)}Q${r(-w)} ${r(-len * .5)} 0 0Z" transform="translate(${r(x)} ${r(y)}) rotate(${r(rot)})" fill="${fill}" ${SW} stroke-width="${sw}"/>`;
}

function circ(x, y, rad, fill, sw = 1.6) {
  return `<circle cx="${r(x)}" cy="${r(y)}" r="${r(rad)}" fill="${fill}" ${SW} stroke-width="${sw}"/>`;
}

function ell(x, y, rx, ry, fill, rot = 0, sw = 1.6) {
  return `<ellipse rx="${r(rx)}" ry="${r(ry)}" transform="translate(${r(x)} ${r(y)}) rotate(${rot})" fill="${fill}" ${SW} stroke-width="${sw}"/>`;
}

function line(d, col, w) { return `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`; }

function oline(d, col, w) { return line(d, O, w + 2.4) + line(d, col, w); } // outlined stroke

function heart(x, y, rot, z, fill) {
  return `<path d="M0 0C${r(z)} ${r(-z * .25)} ${r(z * .9)} ${r(-z)} 0 ${r(-z * .72)}C${r(-z * .9)} ${r(-z)} ${r(-z)} ${r(-z * .25)} 0 0Z" transform="translate(${r(x)} ${r(y)}) rotate(${rot})" fill="${fill}" ${SW} stroke-width="1.5"/>`;
}

function trifol(x, y, rot, z, fill) {
  return `<g transform="translate(${r(x)} ${r(y)}) rotate(${rot})">${line(`M0 0L0 ${r(-z)}`, '#4b8a2c', 1.6)}` +
    ell(0, -z * 1.45, z * .36, z * .5, fill, 0, 1.3) + ell(-z * .42, -z * 1.12, z * .33, z * .45, fill, -50, 1.3) +
    ell(z * .42, -z * 1.12, z * .33, z * .45, fill, 50, 1.3) + `</g>`;
}
