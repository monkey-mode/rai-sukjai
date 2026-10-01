#!/usr/bin/env node
// Locks the owner-approved style anchors as permanent references. Every id in paint_style.style_anchors.ids must be
// `approved`. Writes, for each anchor:
//   assets/painted/_style/anchors/<id>.png      at game size (what the player sees)
//   assets/painted/_style/anchors/<id>@4x.png   4x, to attach as a style reference image
// and records the SVG's sha256 in paint_style.style_anchors.files. tests/assets.test.mjs fails if a locked anchor's
// file changes afterwards; re-locking needs the owner's approval again.
//   node tools/lock-style-anchors.mjs            (needs Playwright + Chromium)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
async function loadPlaywright() {
  try { return await import('playwright'); } catch (e) { /* fall back to a global install */ }
  return createRequire(path.join(execSync('npm root -g').toString().trim(), 'noop.js'))('playwright');
}
const mpath = path.join(ROOT, 'assets/manifest.json');
const manifest = JSON.parse(fs.readFileSync(mpath, 'utf8'));
const sa = manifest.paint_style.style_anchors;
const byId = Object.fromEntries(manifest.assets.map(a => [a.id, a]));
const notApproved = sa.ids.filter(id => !byId[id] || byId[id].status !== 'approved');
if (notApproved.length) { console.error(`Not approved by the owner yet: ${notApproved.join(', ')}. Nothing locked.`); process.exit(1); }

const { chromium } = await loadPlaywright();
const browser = await chromium.launch();
const page = await browser.newPage();
const dir = path.join(ROOT, 'assets/painted/_style/anchors');
fs.mkdirSync(dir, { recursive: true });
sa.files = {};
for (const id of sa.ids) {
  const a = byId[id], svg = fs.readFileSync(path.join(ROOT, a.file));
  const rel = k => `assets/painted/_style/anchors/${id}${k === 1 ? '' : `@${k}x`}.png`;
  for (const k of [1, 4]) {
    const url = await page.evaluate(async ([text, w, h]) => {
      const img = new Image(); img.src = URL.createObjectURL(new Blob([text], { type: 'image/svg+xml' })); await img.decode();
      const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(img, 0, 0, w, h);
      return c.toDataURL('image/png');
    }, [svg.toString('utf8'), a.canvas[0] * k, a.canvas[1] * k]);
    fs.writeFileSync(path.join(ROOT, rel(k)), Buffer.from(url.split(',')[1], 'base64'));
  }
  sa.files[id] = { svg: a.file, sha256: crypto.createHash('sha256').update(svg).digest('hex'), render: rel(1), render_4x: rel(4) };
}
await browser.close();
sa.locked = true;
sa.status = 'locked';
sa.locked_at = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
fs.writeFileSync(mpath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`Locked ${sa.ids.length} style anchors: ${sa.ids.join(', ')}`);
