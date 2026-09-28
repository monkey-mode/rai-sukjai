#!/usr/bin/env node
// Renders each full-stage background SVG to a WebP next to it (1.5x, quality 0.86) and records it as the
// asset's `raster` in assets/manifest.json. The game draws the raster when present: a big vector background
// is slow to redraw on phones, a bitmap is not. The SVG stays the source of truth; re-run after changing it.
//   node tools/rasterize-backgrounds.mjs            (needs Playwright with Chromium)
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCALE = 1.5, QUALITY = 0.86;

async function loadPlaywright() {
  try { return await import('playwright'); } catch (e) { /* fall back to a global install */ }
  return createRequire(path.join(execSync('npm root -g').toString().trim(), 'noop.js'))('playwright');
}
const { chromium } = await loadPlaywright();
const mpath = path.join(ROOT, 'assets/manifest.json');
const manifest = JSON.parse(fs.readFileSync(mpath, 'utf8'));
const browser = await chromium.launch();
const page = await browser.newPage();
for (const a of manifest.assets.filter(a => a.category === 'background' && a.file)) {
  const [w, h] = a.canvas;
  const svg = fs.readFileSync(path.join(ROOT, a.file), 'utf8');
  const url = await page.evaluate(async ([svg, w, h, k, q]) => {
    // a same-origin blob keeps the canvas exportable (file:// images would taint it)
    const img = new Image(); img.src = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })); await img.decode();
    const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/webp', q);
  }, [svg, w, h, SCALE, QUALITY]);
  const out = a.file.replace(/\.svg$/, '.webp');
  fs.writeFileSync(path.join(ROOT, out), Buffer.from(url.split(',')[1], 'base64'));
  a.raster = out;
  console.log(`${out}  ${Math.round(fs.statSync(path.join(ROOT, out)).size / 1024)} KB (svg ${Math.round(fs.statSync(path.join(ROOT, a.file)).size / 1024)} KB)`);
}
await browser.close();
fs.writeFileSync(mpath, JSON.stringify(manifest, null, 2) + '\n');
