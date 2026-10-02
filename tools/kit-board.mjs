#!/usr/bin/env node
// Consistency board: every scene-kit piece at its real in-game size, standing on one isometric grid next to the
// characters and props it shares scenes with. Pieces that look heavier, brighter, bigger or differently lit than their
// neighbours stand out at a glance.   node tools/kit-board.mjs  ->  assets/painted/_layout/kit_board.png
// Needs Playwright + Chromium. Uses whatever file the game currently draws for each asset.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
async function loadPlaywright() {
  try { return await import('playwright'); } catch (e) { /* fall back to a global install */ }
  return createRequire(path.join(execSync('npm root -g').toString().trim(), 'noop.js'))('playwright');
}
const { chromium } = await loadPlaywright();
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg' };
const server = await new Promise(done => {
  const s = http.createServer((req, res) => {
    const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
  }).listen(0, () => done(s));
});
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 600 }, deviceScaleFactor: 2 });
await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
await page.goto(`http://localhost:${server.address().port}/index.html`);
await page.waitForTimeout(1500);
const anchors = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/manifest.json'), 'utf8')).paint_style.style_anchors;
await page.evaluate(a => { window.__anchors = a; }, anchors);
const html = await page.evaluate(() => {
  // [id, in-game scale] — the reference row first, then the kit
  const refs = ['character.farmer', 'character.uncle_mee', 'animal.duck', 'prop.nest', 'prop.egg_pile_6', 'prop.trough', 'prop.egg_basket'].map(id => [id, gameScale(id)])
    .concat([['scenery.banana_ripe_iso', .8]]);   // the size chart (js/art/assets.js); bananas at their scene scale
  const sa = window.__anchors || { ids: [] };
  const kit = Object.keys(ASSET_SPECS).filter(id => id.startsWith('kit.')).map(id => [id, 1])
    .sort((p, q) => sa.ids.includes(q[0]) - sa.ids.includes(p[0]));              // style anchors first
  // lay pieces out left to right, wrapping into rows; each row's baseline sits under its tallest piece
  const W = 1400, rows = [];
  for (const [label, list] of [['scale', refs], ['kit', kit]]) {
    let cur = [], x = 20;
    for (const [id, k] of list) {
      const sp = ASSET_SPECS[id], w = Math.max(sp.w * k, 60) + 22;
      if (x + w > W - 10 && cur.length) { rows.push(cur); cur = []; x = 20; }
      cur.push([id, k, x]); x += w;
    }
    rows.push(cur);
  }
  let y = 40, body = '';
  for (const r of rows) {
    const up = Math.max(...r.map(([id, k]) => ASSET_SPECS[id].ay * k)), down = Math.max(...r.map(([id, k]) => (ASSET_SPECS[id].h - ASSET_SPECS[id].ay) * k));
    y += up;
    body += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="#8aa860"/>`;
    for (const [id, k, x] of r) {
      const sp = ASSET_SPECS[id], ax = x + sp.ax * k, has = Assets.has(id);
      body += `<g transform="translate(${ax} ${y}) scale(${k})">${has ? Assets.image(id) : `<rect x="${-sp.ax}" y="${-sp.ay}" width="${sp.w}" height="${sp.h}" fill="none" stroke="#c0392b" stroke-dasharray="4 3"/>`}</g>` +
        `<text x="${x + sp.w * k / 2}" y="${y + Math.max(down, 0) + 14}" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#3a2213">${id.replace(/^(kit|character|animal|prop|scenery)\./, '')}${sa.ids.includes(id) ? (sa.locked ? ' ★ anchor' : ' ☆ anchor (candidate)') : ''}</text>`;
    }
    y += Math.max(down, 0) + 30;
  }
  const H = Math.ceil(y);
  let grid = '';
  for (let i = -40; i < 80; i++) grid += `M${i * 32} 0l${H * 2} ${H}M${i * 32} 0l${-H * 2} ${H}`;
  window.__boardH = H;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#cfe3a8"/>` +
    `<path d="${grid}" stroke="#b5cf86" stroke-width="1"/>` +
    `<text x="12" y="22" font-family="sans-serif" font-size="13" font-weight="bold" fill="#3a2213">Kit board: every piece at in-game size (top row = characters and props for scale)</text>` +
    body + '</svg>';
});
await page.evaluate(html => { document.body.innerHTML = html; document.body.style.margin = '0'; document.body.style.overflow = 'hidden'; }, html);
await page.waitForTimeout(800);
const out = path.join(ROOT, 'assets/painted/_layout/kit_board.png');
const height = await page.evaluate(() => window.__boardH);
await page.setViewportSize({ width: 1400, height });
fs.writeFileSync(out, await page.screenshot({ clip: { x: 0, y: 0, width: 1400, height } }));
await browser.close(); server.close();
console.log('assets/painted/_layout/kit_board.png');
