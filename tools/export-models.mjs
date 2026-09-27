#!/usr/bin/env node
// Exports the 3D buffalo and dragon jar from iso-models-prototype.html as SVG assets, and prints the
// canvas/anchor/pivot numbers that assets/manifest.json and js/art (ASSET_SPECS, BUFFALO_PARTS) must use.
//   node tools/export-models.mjs            (needs Playwright with Chromium)
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
async function loadPlaywright() {
  try { return await import('playwright'); } catch (e) { /* fall back to a global install */ }
  return createRequire(path.join(execSync('npm root -g').toString().trim(), 'noop.js'))('playwright');
}
const { chromium } = await loadPlaywright();
const browser = await chromium.launch();
const page = await browser.newPage();
await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
await page.goto(pathToFileURL(path.join(ROOT, 'iso-models-prototype.html')).href);
const out = await page.evaluate(() => window.__exportModels());
await browser.close();

const files = { 'animal.buffalo': 'assets/animals/buffalo.svg', 'animal.buffalo_head': 'assets/animals/buffalo_head.svg',
  'animal.buffalo_tail': 'assets/animals/buffalo_tail.svg', 'prop.dragon_jar': 'assets/props/dragon_jar.svg' };
const summary = {};
for (const [id, file] of Object.entries(files)) {
  fs.writeFileSync(path.join(ROOT, file), out[id].svg);
  summary[id] = { file, canvas: out[id].canvas, anchor: out[id].anchor, bytes: out[id].svg.length };
}
summary.BUFFALO_PARTS = { head: out.parts.head, tail: out.parts.tail };
console.log(JSON.stringify(summary, null, 1));
