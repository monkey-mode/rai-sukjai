#!/usr/bin/env node
// Renders the game's current code-drawn art into assets/reference/<id>.svg, one file per manifest
// entry that has a `reference_render` expression. The asset agent uses these as placeholders to
// match size, pose and anchor. Re-run after changing art code:  node tools/export-references.mjs
// Needs Playwright with Chromium (npm i -D playwright, or a global install).
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function loadPlaywright() {
  try { return await import('playwright'); } catch (e) { /* fall back to a global install */ }
  const globalRoot = execSync('npm root -g').toString().trim();
  return createRequire(path.join(globalRoot, 'noop.js'))('playwright');
}

const { chromium } = await loadPlaywright();
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/manifest.json'), 'utf8'));
const jobs = manifest.assets.filter(a => a.reference_render).map(a => ({ id: a.id, expr: a.reference_render, full: a.category === 'background' }));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
await page.goto(pathToFileURL(path.join(ROOT, 'index.html')).href);

const out = await page.evaluate(jobs => {
  Assets.found = {}; // references are the code-drawn placeholders
  // Pen props are only drawn inside renderPen(); render a pen scene and cut the pieces out.
  window.penPart = name => {
    S = newGame(() => 1); S.scene = 'pen'; S.trough = 0; S.eggs = 0;
    renderPen();
    const act = { trough: 'trough', nest: 'egg', basket: 'basket' }[name];
    return dynEl.querySelector(`[data-act="${act}"]`).outerHTML;
  };
  const NS = 'http://www.w3.org/2000/svg';
  const host = document.createElementNS(NS, 'svg');
  host.setAttribute('width', '800'); host.setAttribute('height', '600');
  host.style.cssText = 'position:fixed;left:0;top:0;visibility:hidden';
  document.body.appendChild(host);
  const result = {};
  for (const { id, expr, full } of jobs) {
    let markup = (0, eval)(expr);
    if (markup.startsWith('<svg')) {
      result[id] = markup.replace('<svg', `<svg xmlns="${NS}"`);
      continue;
    }
    let vb = '0 0 800 600';
    if (!full) {
      host.innerHTML = `<g>${markup}</g>`;
      const b = host.firstChild.getBBox(), p = 3;
      vb = [b.x - p, b.y - p, b.width + 2 * p, b.height + 2 * p].map(n => Math.round(n * 10) / 10).join(' ');
    }
    const [, , w, h] = vb.split(' ');
    result[id] = `<svg xmlns="${NS}" viewBox="${vb}" width="${w}" height="${h}">${markup}</svg>`;
  }
  return result;
}, jobs);
await browser.close();

const dir = path.join(ROOT, 'assets/reference');
fs.mkdirSync(dir, { recursive: true });
for (const [id, svg] of Object.entries(out)) {
  const clean = svg.replace(/ (class|data-act|data-f|data-p)="[^"]*"/g, '').replace(/<title>.*?<\/title>/g, '');
  fs.writeFileSync(path.join(dir, `${id}.svg`), '<?xml version="1.0" encoding="UTF-8"?>\n<!-- Placeholder reference rendered from the game code. Not the final asset. -->\n' + clean + '\n');
}
console.log(`Wrote ${Object.keys(out).length} reference SVGs to assets/reference/`);
