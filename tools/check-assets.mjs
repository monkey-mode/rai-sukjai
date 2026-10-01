#!/usr/bin/env node
// Validates assets/manifest.json and the files it points to.
//   node tools/check-assets.mjs            -> check everything, print a status summary
//   node tools/check-assets.mjs --queue    -> also list the next assets to make (todo / needs_changes, by priority)
//   node tools/check-assets.mjs --paint    -> also list the next painted-art tasks (paint.batch, then priority)
// Exit code 1 if there are errors.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STATUSES = ['todo', 'in_progress', 'done', 'needs_changes', 'approved', 'blocked'];
const REQUIRED = ['id', 'category', 'priority', 'name_th', 'name_en', 'output', 'format', 'canvas', 'anchor', 'prompt',
  'status', 'file', 'agent', 'updated_at', 'notes', 'review'];

const PAINT_REQUIRED = ['status', 'batch', 'output', 'scale', 'size', 'anchor_px', 'layout', 'prompt', 'file', 'agent', 'updated_at', 'notes', 'review'];
// Same rule as paintedPath() in js/art/assets.js.
export const paintedPath = output => output.replace(/^assets\//, 'assets/painted/').replace(/\.svg$/, output.startsWith('assets/backgrounds/') ? '.webp' : '.png');

// Pixel size (and, for PNG, whether it has an alpha channel) read from the file header.
export function imageInfo(buf) {
  if (buf.length > 26 && buf.readUInt32BE(0) === 0x89504e47) {
    const type = buf[25];
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20), alpha: type === 4 || type === 6 || buf.includes('tRNS') };
  }
  if (buf.length > 30 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    const kind = buf.toString('ascii', 12, 16);
    if (kind === 'VP8X') return { w: 1 + buf.readUIntLE(24, 3), h: 1 + buf.readUIntLE(27, 3), alpha: !!(buf[20] & 16) };
    if (kind === 'VP8L') { const b = buf.readUInt32LE(21); return { w: 1 + (b & 0x3fff), h: 1 + ((b >> 14) & 0x3fff), alpha: !!((b >> 28) & 1) }; }
    if (kind === 'VP8 ') return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff, alpha: false };
  }
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) return { w: null, h: null, alpha: false };
  return null;
}

// Art style v3 (flat): the palette in manifest paint_style.palette, kept in sync by tests/assets.test.mjs.
export const FLAT_PALETTE = new Set(["#2a2018", "#2c5a24", "#3a2213", "#3a8fbf", "#3d63a6", "#3e7f2c", "#3f3226", "#3f7a2e", "#55331b", "#5a4a3a", "#5a7a2c", "#5a9a3e", "#5f8fd6", "#5f9038", "#5fae3c", "#5fbbe2", "#6a5233", "#6b4428", "#77715f", "#7a3c21", "#7a4b27", "#7d4f2a", "#7fa040", "#82b84a", "#8f2a22", "#8f7348", "#8fd05c", "#97803a", "#9edcf2", "#9fc4f0", "#a39d8c", "#a6c45a", "#a8703e", "#a8d468", "#a97f4a", "#ad5e35", "#b07a45", "#b8913a", "#b89a6a", "#c0661a", "#c45f84", "#c8372d", "#c8c0ad", "#c9ad52", "#d08f62", "#d09a12", "#d2cdbd", "#d4ab6c", "#d8875a", "#dba56a", "#e0bd5e", "#ead47e", "#ec8cae", "#ecd09a", "#ece7dc", "#ee6152", "#f08a2c", "#f2b98a", "#f4dc8e", "#f7c52b", "#f9c2d6", "#ffb05a", "#ffd9b8", "#ffe680", "#ffffff"]);
// Flat-style kit SVGs: palette-only colours, and none of the effects that give the "AI-generated" look.
export function flatLint(svg, where, errors, warnings) {
  for (const tag of ['linearGradient', 'radialGradient', 'filter', 'pattern', 'image', 'mask'])
    if (new RegExp(`<${tag}[\\s>/]`, "i").test(svg)) errors.push(`${where} style flat-v3 forbids <${tag}>`);
  const used = new Set([...svg.matchAll(/(?:fill|stroke|stop-color)\s*[:=]\s*["']?\s*(#[0-9a-f]{3,8})/gi)].map(m => m[1].toLowerCase()));
  const off = [...used].filter(c => !FLAT_PALETTE.has(c));
  if (off.length) errors.push(`${where} colours outside the flat-v3 palette: ${off.slice(0, 8).join(', ')}${off.length > 8 ? ' …' : ''}`);
  if (/opacity\s*[:=]\s*["']?0?\.\d/.test(svg)) warnings.push(`${where} uses partial opacity; flat-v3 prefers solid palette tones`);
}

function checkPaint(root, a, errors, warnings) {
  const p = a.paint, where = `[${a.id}] paint`;
  for (const k of PAINT_REQUIRED) if (!(k in p)) errors.push(`${where} missing field "${k}"`);
  if (!STATUSES.includes(p.status)) errors.push(`${where} unknown status "${p.status}"`);
  if (p.output !== paintedPath(a.output)) errors.push(`${where}.output must be ${paintedPath(a.output)}`);
  const [w, h] = a.canvas || [];
  if (!p.size || p.size[0] !== w * p.scale || p.size[1] !== h * p.scale) errors.push(`${where}.size must be canvas × scale`);
  if (p.layout && !fs.existsSync(path.join(root, p.layout))) warnings.push(`${where} layout image missing: ${p.layout} (run node tools/export-layouts.mjs)`);
  if (p.status === 'in_progress' && !p.agent) errors.push(`${where} in_progress needs "agent"`);
  if (p.status === 'needs_changes' && !p.review) errors.push(`${where} needs_changes needs a "review" note`);
  if (p.status === 'blocked' && !p.notes) errors.push(`${where} blocked needs an explanation in "notes"`);
  if (p.status !== 'done' && p.status !== 'approved') return;
  if (!p.file) { errors.push(`${where} status ${p.status} but "file" is empty`); return; }
  const abs = path.join(root, p.file);
  if (!fs.existsSync(abs)) { errors.push(`${where} file not found: ${p.file}`); return; }
  const buf = fs.readFileSync(abs), info = imageInfo(buf), bg = a.category === 'background';
  if (!info || info.w === null) { errors.push(`${where} ${p.file} must be a PNG${bg ? ' or WebP' : ''}`); return; }
  if (info.w !== p.size[0] || info.h !== p.size[1]) errors.push(`${where} ${p.file} is ${info.w}×${info.h}, expected ${p.size[0]}×${p.size[1]}`);
  if (!bg && !info.alpha) errors.push(`${where} ${p.file} needs a transparent background (alpha channel)`);
  const limit = bg ? 1.5e6 : 300e3;
  if (buf.length > limit) warnings.push(`${where} ${p.file} is ${Math.round(buf.length / 1024)} KB (budget ${limit / 1000} KB)`);
}

export function checkManifest(root = ROOT) {
  const errors = [], warnings = [];
  let m;
  try {
    m = JSON.parse(fs.readFileSync(path.join(root, 'assets/manifest.json'), 'utf8'));
  } catch (e) {
    return { errors: ['assets/manifest.json is not valid JSON: ' + e.message], warnings, manifest: null };
  }
  if (m.schema_version !== 1) errors.push('schema_version must be 1');
  if (!Array.isArray(m.assets)) return { errors: [...errors, 'assets must be an array'], warnings, manifest: m };

  const ids = new Set();
  for (const a of m.assets) {
    const where = `[${a.id || '?'}]`;
    for (const k of REQUIRED) if (!(k in a)) errors.push(`${where} missing field "${k}"`);
    if (ids.has(a.id)) errors.push(`${where} duplicate id`);
    ids.add(a.id);
    if (!STATUSES.includes(a.status)) errors.push(`${where} unknown status "${a.status}" (use ${STATUSES.join(', ')})`);
    if (!m.categories || !(a.category in m.categories)) errors.push(`${where} unknown category "${a.category}"`);
    const [w, h] = a.canvas || [];
    if (!(w > 0 && h > 0)) errors.push(`${where} canvas must be [width, height]`);
    const [ax, ay] = a.anchor || [];
    if (!(ax >= 0 && ay >= 0 && ax <= w && ay <= h)) errors.push(`${where} anchor must lie inside the canvas`);
    if (typeof a.output !== 'string' || !a.output.startsWith('assets/')) errors.push(`${where} output must be a path under assets/`);
    if (a.updated_at !== null && isNaN(Date.parse(a.updated_at))) errors.push(`${where} updated_at must be ISO 8601 or null`);
    if (a.status === 'in_progress' && !a.agent) errors.push(`${where} in_progress needs "agent"`);
    if (a.status === 'needs_changes' && !a.review) errors.push(`${where} needs_changes needs a "review" note`);
    if (a.status === 'blocked' && !a.notes) errors.push(`${where} blocked needs an explanation in "notes"`);

    if (a.paint) checkPaint(root, a, errors, warnings);

    if (a.status === 'done' || a.status === 'approved') {
      if (!a.file) { errors.push(`${where} status ${a.status} but "file" is empty`); continue; }
      const abs = path.join(root, a.file);
      if (!fs.existsSync(abs)) { errors.push(`${where} file not found: ${a.file}`); continue; }
      const raster = /\.(png|webp)$/.test(a.file);
      const size = fs.statSync(abs).size, limit = raster ? (a.category === 'ground' ? 1.5e6 : 300e3) : a.category === 'background' ? 200e3 : 40e3;
      if (size > limit) warnings.push(`${where} ${a.file} is ${Math.round(size / 1024)} KB (limit ${limit / 1000} KB)`);
      if (raster && a.scale) {
        // painted-first assets (scene kits): exact pixel size, transparency for pieces, and their normal map
        const info = imageInfo(fs.readFileSync(abs)), want = [w * a.scale, h * a.scale];
        if (!info || info.w === null) errors.push(`${where} ${a.file} is not a readable PNG / WebP`);
        else {
          if (info.w !== want[0] || info.h !== want[1]) errors.push(`${where} ${a.file} is ${info.w}×${info.h}, expected ${want.join('×')}`);
          if (a.category !== 'ground' && !info.alpha) errors.push(`${where} ${a.file} needs a transparent background (alpha channel)`);
        }
      }
      if (a.normal) {
        const k = a.normal_scale || a.scale || 1, want = [w * k, h * k], nabs = path.join(root, a.normal);
        if (!fs.existsSync(nabs)) errors.push(`${where} normal map not found: ${a.normal}`);
        else { const n = imageInfo(fs.readFileSync(nabs)); if (!n || n.w !== want[0] || n.h !== want[1]) errors.push(`${where} normal map ${a.normal} must be ${want.join('×')}`); }
      }
      if (a.style === 'flat-v3' && a.file.endsWith('.svg')) flatLint(fs.readFileSync(abs, 'utf8'), where, errors, warnings);
      if (a.file.endsWith('.svg')) {
        const svg = fs.readFileSync(abs, 'utf8');
        if (!/<svg[\s>]/.test(svg)) errors.push(`${where} ${a.file} has no <svg> root`);
        if (/<script/i.test(svg)) errors.push(`${where} ${a.file} must not contain <script>`);
        if (/(href|src)\s*=\s*["'](https?:|\/\/)/i.test(svg)) errors.push(`${where} ${a.file} links to external resources`);
        if (/<image[\s>]/i.test(svg)) warnings.push(`${where} ${a.file} embeds a raster <image>`);
        const vb = svg.match(/viewBox\s*=\s*["']\s*([-\d.]+)[\s,]+([-\d.]+)[\s,]+([-\d.]+)[\s,]+([-\d.]+)/);
        if (!vb) warnings.push(`${where} ${a.file} has no viewBox`);
        else if (+vb[3] !== w || +vb[4] !== h) warnings.push(`${where} viewBox ${vb[3]}×${vb[4]} differs from canvas ${w}×${h}`);
      } else if (!raster) {
        errors.push(`${where} file must be .svg, .png or .webp`);
      }
    }
  }
  return { errors, warnings, manifest: m };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { errors, warnings, manifest } = checkManifest();
  if (manifest && Array.isArray(manifest.assets)) {
    const count = {};
    for (const a of manifest.assets) count[a.status] = (count[a.status] || 0) + 1;
    console.log(`${manifest.assets.length} assets: ` + STATUSES.filter(s => count[s]).map(s => `${s} ${count[s]}`).join(' · '));
    if (process.argv.includes('--queue')) {
      const q = manifest.assets.filter(a => a.status === 'needs_changes' || a.status === 'todo')
        .sort((a, b) => (a.status === 'needs_changes' ? -1 : 0) - (b.status === 'needs_changes' ? -1 : 0) || a.priority - b.priority);
      console.log('\nNext up:');
      for (const a of q.slice(0, 20)) console.log(`  P${a.priority}  ${a.status.padEnd(13)} ${a.id.padEnd(26)} -> ${a.output}`);
      if (q.length > 20) console.log(`  … and ${q.length - 20} more`);
    }
  }
  if (manifest && Array.isArray(manifest.assets)) {
    const painted = manifest.assets.filter(a => a.paint), count = {};
    for (const a of painted) count[a.paint.status] = (count[a.paint.status] || 0) + 1;
    console.log(`${painted.length} paint tasks: ` + STATUSES.filter(s => count[s]).map(s => `${s} ${count[s]}`).join(' · '));
    if (process.argv.includes('--paint')) {
      const q = painted.filter(a => a.paint.status === 'needs_changes' || a.paint.status === 'todo')
        .sort((a, b) => (a.paint.status === 'needs_changes' ? -1 : 0) - (b.paint.status === 'needs_changes' ? -1 : 0) || a.paint.batch - b.paint.batch || a.priority - b.priority);
      console.log('\nNext paint tasks:');
      for (const a of q.slice(0, 25)) console.log(`  batch ${a.paint.batch}  ${a.paint.status.padEnd(13)} ${a.id.padEnd(30)} ${a.paint.size.join('×').padEnd(10)} -> ${a.paint.output}`);
      if (q.length > 25) console.log(`  … and ${q.length - 25} more`);
    }
  }
  for (const w of warnings) console.log('warning: ' + w);
  for (const e of errors) console.log('ERROR:   ' + e);
  if (errors.length) process.exit(1);
  console.log(warnings.length ? 'OK, with warnings.' : 'OK');
}
