#!/usr/bin/env node
// Renders the current art of every asset that has a `paint` block into paint.layout, at exactly paint.size.
// The painter uses it as the composition input (img2img / ControlNet) and to line the painted subject up
// with the canvas and anchor the game expects. Sprites become transparent PNGs, backgrounds JPGs.
//   node tools/export-layouts.mjs            (needs Playwright with Chromium; re-run after changing art)
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
let n = 0;
for (const a of manifest.assets.filter(a => a.paint && (a.file || a.reference))) {
  const src = a.file || a.reference, [w, h] = a.paint.size, jpg = a.paint.layout.endsWith('.jpg');
  const svg = fs.readFileSync(path.join(ROOT, src), 'utf8');
  const url = await page.evaluate(async ([svg, w, h, jpg]) => {
    // a same-origin blob keeps the canvas exportable (file:// images would taint it)
    const img = new Image(); img.src = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })); await img.decode();
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    c.getContext('2d').drawImage(img, 0, 0, w, h);
    return jpg ? c.toDataURL('image/jpeg', .85) : c.toDataURL('image/png');
  }, [svg, w, h, jpg]);
  const out = path.join(ROOT, a.paint.layout);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
  n++;
}
await browser.close();
console.log(`${n} layout images in assets/painted/_layout/`);
