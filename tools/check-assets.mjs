#!/usr/bin/env node
// Validates assets/manifest.json and the files it points to.
//   node tools/check-assets.mjs            -> check everything, print a status summary
//   node tools/check-assets.mjs --queue    -> also list the next assets to make (todo / needs_changes, by priority)
// Exit code 1 if there are errors.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STATUSES = ['todo', 'in_progress', 'done', 'needs_changes', 'approved', 'blocked'];
const REQUIRED = ['id', 'category', 'priority', 'name_th', 'name_en', 'output', 'format', 'canvas', 'anchor', 'prompt',
  'status', 'file', 'agent', 'updated_at', 'notes', 'review'];

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

    if (a.status === 'done' || a.status === 'approved') {
      if (!a.file) { errors.push(`${where} status ${a.status} but "file" is empty`); continue; }
      const abs = path.join(root, a.file);
      if (!fs.existsSync(abs)) { errors.push(`${where} file not found: ${a.file}`); continue; }
      const size = fs.statSync(abs).size, limit = a.category === 'background' ? 200e3 : 40e3;
      if (size > limit) warnings.push(`${where} ${a.file} is ${Math.round(size / 1024)} KB (limit ${limit / 1000} KB)`);
      if (a.file.endsWith('.svg')) {
        const svg = fs.readFileSync(abs, 'utf8');
        if (!/<svg[\s>]/.test(svg)) errors.push(`${where} ${a.file} has no <svg> root`);
        if (/<script/i.test(svg)) errors.push(`${where} ${a.file} must not contain <script>`);
        if (/(href|src)\s*=\s*["'](https?:|\/\/)/i.test(svg)) errors.push(`${where} ${a.file} links to external resources`);
        if (/<image[\s>]/i.test(svg)) warnings.push(`${where} ${a.file} embeds a raster <image>`);
        const vb = svg.match(/viewBox\s*=\s*["']\s*([-\d.]+)[\s,]+([-\d.]+)[\s,]+([-\d.]+)[\s,]+([-\d.]+)/);
        if (!vb) warnings.push(`${where} ${a.file} has no viewBox`);
        else if (+vb[3] !== w || +vb[4] !== h) warnings.push(`${where} viewBox ${vb[3]}×${vb[4]} differs from canvas ${w}×${h}`);
      } else if (!a.file.endsWith('.png')) {
        errors.push(`${where} file must be .svg (or .png fallback)`);
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
  for (const w of warnings) console.log('warning: ' + w);
  for (const e of errors) console.log('ERROR:   ' + e);
  if (errors.length) process.exit(1);
  console.log(warnings.length ? 'OK, with warnings.' : 'OK');
}
