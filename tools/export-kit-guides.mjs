#!/usr/bin/env node
// Guide images for scene-kit assets (manifest entries with a `footprint`), drawn from the layout data rather than art:
//   assets/painted/_layout/<id>.png                 canvas × scale, transparent: canvas border, anchor cross, ground
//                                                    footprint diamond (isometric), height line and the piece's name
//   assets/painted/_layout/pen_kit_composition.jpg  the duck pen assembled with a labelled box per piece (?kit=1)
// The asset agent paints each piece to fit its guide.   node tools/export-kit-guides.mjs   (needs Playwright + Chromium)
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
const { chromium } = await loadPlaywright();
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/manifest.json'), 'utf8'));
const browser = await chromium.launch();
const page = await browser.newPage();
const save = (rel, url) => { const out = path.join(ROOT, rel); fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64')); };

const pieces = manifest.assets.filter(a => a.footprint && a.layout);
for (const a of pieces) {
  const url = await page.evaluate(a => {
    const k = a.scale, [w, h] = a.canvas, [ax, ay] = a.anchor, [fu, fv] = a.footprint;
    const c = document.createElement('canvas'); c.width = w * k; c.height = h * k;
    const g = c.getContext('2d'); g.scale(k, k); g.lineJoin = 'round';
    g.strokeStyle = '#6b3fa0'; g.lineWidth = 1 / k * 2; g.setLineDash([4, 3]); g.strokeRect(.5, .5, w - 1, h - 1); g.setLineDash([]);
    // ground footprint: fence spans start at the anchor, everything else is centred on it
    const P = (u, v) => [ax + (u - v) * 32, ay + (u + v) * 16];
    const span = a.id.startsWith('kit.fence_span');
    const [u0, v0] = span ? [0, 0] : [-fu / 2, -fv / 2], [u1, v1] = span ? [fu, fv] : [fu / 2, fv / 2];
    g.fillStyle = 'rgba(120,180,80,.35)'; g.strokeStyle = '#3f7a26'; g.lineWidth = 1;
    g.beginPath(); [P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1)].forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill(); g.stroke();
    if (span) { g.strokeStyle = '#8a5a2e'; g.lineWidth = 2; g.beginPath(); g.moveTo(...P(0, 0)); g.lineTo(...P(fu, fv)); g.stroke(); }
    // height and anchor
    g.strokeStyle = '#c0392b'; g.lineWidth = 1; g.setLineDash([3, 2]);
    g.beginPath(); g.moveTo(ax, ay); g.lineTo(ax, ay - a.height_px); g.stroke(); g.setLineDash([]);
    g.beginPath(); g.moveTo(ax - 5, ay - a.height_px); g.lineTo(ax + 5, ay - a.height_px); g.stroke();
    g.strokeStyle = '#6b3fa0'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(ax - 6, ay); g.lineTo(ax + 6, ay); g.moveTo(ax, ay - 6); g.lineTo(ax, ay + 6); g.stroke();
    g.fillStyle = '#4a2a70'; g.font = `${Math.max(5, Math.min(10, w / 9))}px sans-serif`; g.textAlign = 'center';
    g.fillText(a.id.replace('kit.', ''), w / 2, 10);
    g.fillStyle = '#c0392b'; g.fillText(`${a.height_px}px`, Math.min(w - 12, ax + 14), Math.max(18, ay - a.height_px + 4));
    return c.toDataURL('image/png');
  }, a);
  save(a.layout, url);
}

// the assembled pen with placeholder boxes, at 21:9 so the bleed shows
const game = await browser.newPage({ viewport: { width: 1400, height: 600 } });
const server = await import('node:http').then(({ createServer }) => new Promise(done => {
  const s = createServer((req, res) => {
    const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    const type = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp' }[path.extname(f)] || 'application/octet-stream';
    res.writeHead(200, { 'content-type': type }); fs.createReadStream(f).pipe(res);
  }).listen(0, () => done(s));
}));
await game.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
await game.goto(`http://localhost:${server.address().port}/index.html?kit=1`);
await game.waitForTimeout(1500);
await game.evaluate(() => {
  save = () => {}; S = newGame(() => .99); S.scene = 'pen'; S.ducks = 5; S.eggs = 4; S.trough = 2; closeModal(); ui.bgScene = null; render();
  for (const sel of ['#hud', '#toolbar', '#panel', '#zoom']) { const el = document.querySelector(sel); if (el) el.style.visibility = 'hidden'; }
});
await game.waitForTimeout(400);
fs.writeFileSync(path.join(ROOT, 'assets/painted/_layout/pen_kit_composition.jpg'), await game.screenshot({ type: 'jpeg', quality: 85 }));
// the farm, same way: placeholders for every kit piece the farm recipe places
await game.evaluate(() => { S.scene = 'farm'; ui.bgScene = null; cam.z = 1; render(); for (const sel of ['#hud', '#toolbar', '#panel', '#zoom']) { const el = document.querySelector(sel); if (el) el.style.visibility = 'hidden'; } });
await game.waitForTimeout(400);
fs.writeFileSync(path.join(ROOT, 'assets/painted/_layout/farm_kit_composition.jpg'), await game.screenshot({ type: 'jpeg', quality: 85 }));
// the paddy redraw guide: the approved farm ground (canvas 1400×600, canvas x = scene x + 300) with FARM_PADDIES drawn
// on top: field outlines and states, dike centre lines and widths, the mound, and planted rice positions
const paddies = await game.evaluate(async () => {
  const img = await new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = 'assets/backgrounds/ground_farm.svg'; });
  const K = 2, c = document.createElement('canvas'); c.width = 1400 * K; c.height = 600 * K;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0, c.width, c.height); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(0, 0, c.width, c.height);
  g.setTransform(K, 0, 0, K, 300 * K, 0);
  const P = (u, v) => isoPt(u, v), quad = (u0, v0, u1, v1) => { g.beginPath(); [P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1)].forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); };
  const d = FARM_PADDIES.dike / 2;
  for (const [u0, v0, u1, v1, st] of FARM_PADDIES.fields) {
    quad(u0, v0, u1, v1); g.fillStyle = st === 'ripe' ? 'rgba(224,189,94,.45)' : 'rgba(95,187,226,.45)'; g.fill();
    // the dike: a band of the dike width centred on the field edge
    g.strokeStyle = 'rgba(63,122,38,.9)'; g.lineWidth = 2; quad(u0 - d, v0 - d, u1 + d, v1 + d); g.stroke(); quad(u0 + d, v0 + d, u1 - d, v1 - d); g.stroke();
    g.strokeStyle = '#3a2213'; g.lineWidth = .8; g.setLineDash([4, 3]); quad(u0, v0, u1, v1); g.stroke(); g.setLineDash([]);
    const [x, y] = P((u0 + u1) / 2, (v0 + v1) / 2); g.fillStyle = '#1d3a5a'; g.font = 'bold 11px sans-serif'; g.textAlign = 'center';
    g.fillText(st === 'ripe' ? 'RIPE (drained, mud)' : 'FLOODED (water)', x, y);
  }
  for (const [mu, mv, ru, rv] of FARM_MOUNDS) {
    g.beginPath(); for (let a = 0; a <= 64; a++) { const t = a / 64 * Math.PI * 2, [x, y] = P(mu + ru * Math.cos(t), mv + rv * Math.sin(t)); a ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.strokeStyle = '#6b3fa0'; g.lineWidth = 1.5; g.setLineDash([5, 3]); g.stroke(); g.setLineDash([]);
    const [x, y] = P(mu, mv); g.fillStyle = '#4a2a70'; g.fillText('MOUND (keep)', x, y);
  }
  g.fillStyle = 'rgba(29,58,90,.8)';
  for (const [id, u, v] of FARM_RICE) { const [x, y] = P(u, v); g.fillRect(x - 1, y - 1, 2, 2); }
  return c.toDataURL('image/png');
});
save('assets/painted/_layout/ground.farm.paddies.png', paddies);
server.close();
await browser.close();
console.log(`${pieces.length} kit guides, pen_kit_composition.jpg farm_kit_composition.jpg and ground.farm.paddies.png in assets/painted/_layout/`);
