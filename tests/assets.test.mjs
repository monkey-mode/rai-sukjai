// Keeps the shared asset manifest valid while two agents edit it.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { checkManifest } from '../tools/check-assets.mjs';

test('assets/manifest.json is valid and every done/approved file exists', () => {
  const { errors } = checkManifest();
  assert.deepEqual(errors, []);
});

test('every crop has 5 stages and each reference file exists', () => {
  const { manifest } = checkManifest();
  const crops = manifest.assets.filter(a => a.category === 'crop' && /\.s\d$/.test(a.id));
  assert.equal(crops.length, 8 * 5);
  for (const a of manifest.assets) {
    if (a.reference) assert.ok(fs.existsSync(new URL('../' + a.reference, import.meta.url)), a.reference);
  }
});
