#!/usr/bin/env node
// Validates finished scene-kit SVGs after tracing, palette reduction and export: renders each one and measures what
// the style contract (docs/style-contract.md) promises. Needs Playwright + Chromium.
//   node tools/validate-kit.mjs [id ...]        default: every kit/ground entry whose file is an SVG
// Per piece:
//   geometry  stands on its anchor; height ≈ height_px; no clipping at the canvas edge; footprint coverage (blockers)
//   outline   the silhouette edge is the locked outline colour (a closed bold outline)
//   detail    interior edge density (shape complexity) and colour count
//   source    if assets/painted/_source/<id>.png exists (the approved pre-trace art): silhouette IoU and detail kept
//   anchors   once style anchors are locked: detail density within range of the anchors
// Exit code 1 on any error. Writes assets/painted/_layout/kit_validation.json.
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
async function loadPlaywright() {
  try { return await import('playwright'); } catch (e) { /* fall back to a global install */ }
  return createRequire(path.join(execSync('npm root -g').toString().trim(), 'noop.js'))('playwright');
}
const LIMITS = {
  height: [0.8, 1.25],        // measured height / height_px
  outline: 0.6,               // share of silhouette edge pixels in the outline colour
  footprintBlock: 0.45,       // share of the footprint diamond covered, for `block` buildings
  sourceIoU: 0.85,            // silhouette overlap with the approved pre-trace source
  sourceDetail: 0.6,          // interior edge density kept from the source
  anchorDetail: [0.45, 2.2],  // interior edge density relative to the style anchors' median
};

const { chromium } = await loadPlaywright();
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/manifest.json'), 'utf8'));
const want = process.argv.slice(2);
const pieces = manifest.assets.filter(a => (a.category === 'kit' || a.category === 'ground') && a.file && a.file.endsWith('.svg') && (!want.length || want.includes(a.id)));
const anchors = (manifest.paint_style.style_anchors && manifest.paint_style.style_anchors.locked) ? manifest.paint_style.style_anchors.ids : [];
const outline = manifest.paint_style.palette.line.outline;

const browser = await chromium.launch();
const page = await browser.newPage();
const S = 2;                                              // measure at 2× canvas
async function analyse(a, svgText, sourcePng) {
  return page.evaluate(async ({ a, svgText, sourcePng, S, outline }) => {
    const load = src => new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = src; });
    const [w, h] = a.canvas.map(v => v * S), [ax, ay] = a.anchor.map(v => v * S);
    const draw = img => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.drawImage(img, 0, 0, w, h); return g.getImageData(0, 0, w, h).data; };
    const px = draw(await load(URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml' }))));
    const alpha = i => px[i * 4 + 3] > 127;
    const ol = [1, 3, 5].map(k => parseInt(outline.slice(k, k + 2), 16));
    let top = h, area = 0, edge = 0, edgeOutline = 0, inner = 0, clip = 0; const colours = new Map();
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; if (!alpha(i)) continue;
      area++; if (y < top) top = y;
      if (x === 0 || y === 0 || x === w - 1) clip++;
      { const q = (px[i * 4] >> 3) << 10 | (px[i * 4 + 1] >> 3) << 5 | (px[i * 4 + 2] >> 3); colours.set(q, (colours.get(q) || 0) + 1); }
      const nb = [i - 1, i + 1, i - w, i + w].filter(j => j >= 0 && j < w * h);
      if (nb.some(j => !alpha(j)) || x === 0 || x === w - 1 || y === 0 || y === h - 1) {
        edge++; if (Math.abs(px[i * 4] - ol[0]) + Math.abs(px[i * 4 + 1] - ol[1]) + Math.abs(px[i * 4 + 2] - ol[2]) < 60) edgeOutline++;
      } else if (x + 1 < w && alpha(i + 1)) {
        const d = Math.abs(px[i * 4] - px[i * 4 + 4]) + Math.abs(px[i * 4 + 1] - px[i * 4 + 5]) + Math.abs(px[i * 4 + 2] - px[i * 4 + 6]);
        if (d > 40) inner++;
      }
    }
    // ground contact: opaque pixels inside the footprint diamond centred (or, for fence spans, starting) on the anchor
    const [fu, fv] = a.footprint || [0, 0], span = a.id.startsWith('kit.fence_span');
    const P = (u, v) => [ax + (u - v) * 32 * S, ay + (u + v) * 16 * S];
    const [u0, v0, u1, v1] = span ? [0, 0, fu, fv] : [-fu / 2, -fv / 2, fu / 2, fv / 2];
    const dia = [P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1)];
    const inside = (x, y) => { let c = false; for (let k = 0, j = 3; k < 4; j = k++) { const [xi, yi] = dia[k], [xj, yj] = dia[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
    let fpIn = 0, fpAll = 0;
    for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) if (inside(x, y)) { fpAll++; if (alpha(y * w + x)) fpIn++; }
    let standing = false;
    for (let y = Math.max(0, ay - 6 * S); y < Math.min(h, ay + 6 * S) && !standing; y++) for (let x = Math.max(0, ax - 16 * S); x < Math.min(w, ax + 16 * S); x++) if (alpha(y * w + x)) { standing = true; break; }
    const res = { height: (ay - top) / S, area, outlineShare: edge ? edgeOutline / edge : 0, detail: area ? inner / area : 0, colours: [...colours.values()].filter(n => n >= area * .003).length, clipped: clip, footprint: fpAll ? fpIn / fpAll : 0, standing };
    if (sourcePng) {
      const sp = draw(await load(sourcePng));
      let both = 0, either = 0, sInner = 0, sArea = 0;
      for (let i = 0; i < w * h; i++) {
        const A = alpha(i), B = sp[i * 4 + 3] > 127; if (A && B) both++; if (A || B) either++;
        if (B) { sArea++; if ((i % w) + 1 < w && sp[i * 4 + 7] > 127 && Math.abs(sp[i * 4] - sp[i * 4 + 4]) + Math.abs(sp[i * 4 + 1] - sp[i * 4 + 5]) + Math.abs(sp[i * 4 + 2] - sp[i * 4 + 6]) > 40) sInner++; }
      }
      res.sourceIoU = either ? both / either : 0;
      res.sourceDetail = sArea && res.detail ? res.detail / (sInner / sArea) : 0;
    }
    return res;
  }, { a, svgText, sourcePng, S, outline });
}

const results = {}, errors = [], warnings = [];
for (const a of pieces) {
  const svg = fs.readFileSync(path.join(ROOT, a.file), 'utf8');
  const srcFile = path.join(ROOT, 'assets/painted/_source', `${a.id}.png`);
  const source = fs.existsSync(srcFile) ? 'data:image/png;base64,' + fs.readFileSync(srcFile).toString('base64') : null;
  const r = results[a.id] = await analyse(a, svg, source);
  const tag = `[${a.id}]`, kit = a.category === 'kit';
  if (kit && !r.standing) errors.push(`${tag} nothing stands on the anchor: the base must sit on the guide's anchor cross`);
  if (kit && a.height_px) {
    const k = r.height / a.height_px;
    if (k < LIMITS.height[0] || k > LIMITS.height[1]) errors.push(`${tag} ${Math.round(r.height)} px tall, contract says ~${a.height_px} px`);
  }
  if (kit && r.clipped > 4) warnings.push(`${tag} touches the canvas edge (${r.clipped} px): it may be clipped`);
  if (kit && r.outlineShare < LIMITS.outline) errors.push(`${tag} only ${Math.round(r.outlineShare * 100)}% of the silhouette edge is the outline colour: redraw the closed outline`);
  if (kit && (a.tags || []).includes('block') && /house|hut|shed/.test(a.id) && r.footprint < LIMITS.footprintBlock) errors.push(`${tag} covers ${Math.round(r.footprint * 100)}% of its footprint diamond: the building must fill its footprint`);
  if (r.sourceIoU !== undefined) {
    if (r.sourceIoU < LIMITS.sourceIoU) errors.push(`${tag} silhouette changed after tracing (IoU ${r.sourceIoU.toFixed(2)} vs the approved source)`);
    if (r.sourceDetail < LIMITS.sourceDetail) errors.push(`${tag} lost detail after tracing/palette reduction (${Math.round(r.sourceDetail * 100)}% of the source's interior edges)`);
  }
}
if (anchors.length) {
  const ad = anchors.map(id => results[id]).filter(Boolean).map(r => r.detail).sort((x, y) => x - y);
  const med = ad.length ? ad[Math.floor(ad.length / 2)] : 0;
  for (const [id, r] of Object.entries(results)) {
    if (!med || anchors.includes(id) || id === 'ground.pen') continue;
    const k = r.detail / med;
    if (k < LIMITS.anchorDetail[0]) warnings.push(`[${id}] much plainer than the style anchors (detail ×${k.toFixed(2)})`);
    if (k > LIMITS.anchorDetail[1]) warnings.push(`[${id}] much busier than the style anchors (detail ×${k.toFixed(2)})`);
  }
}
await browser.close();
fs.writeFileSync(path.join(ROOT, 'assets/painted/_layout/kit_validation.json'), JSON.stringify({ limits: LIMITS, results }, null, 2) + '\n');
for (const [id, r] of Object.entries(results))
  console.log(`${id.padEnd(22)} h ${String(Math.round(r.height)).padStart(4)}  outline ${String(Math.round(r.outlineShare * 100)).padStart(3)}%  detail ${r.detail.toFixed(3)}  colours ${String(r.colours).padStart(3)}  footprint ${String(Math.round(r.footprint * 100)).padStart(3)}%` + (r.sourceIoU !== undefined ? `  IoU ${r.sourceIoU.toFixed(2)} kept ${Math.round(r.sourceDetail * 100)}%` : ''));
for (const w of warnings) console.log('warning: ' + w);
for (const e of errors) console.log('ERROR:   ' + e);
if (errors.length) process.exit(1);
console.log(warnings.length ? 'OK, with warnings.' : 'OK');
