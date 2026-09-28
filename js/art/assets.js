/* Finished asset files from the asset pipeline (assets/manifest.json). Art functions call
   Assets.has(id) and draw the file when it exists, otherwise they fall back to the code-drawn art. */
'use strict';

// Assets the game can swap in, with the canvas size and anchor from the manifest.
// tests/assets.test.mjs checks these match assets/manifest.json.
const ASSET_SPECS = (() => {
  const list = {};
  const add = (id, output, w, h, ax, ay) => { list[id] = { output, w, h, ax, ay }; };
  CONFIG.CROPS.forEach(c => {
    for (let s = 1; s <= 5; s++) add(`crop.${c.id}.s${s}`, `assets/crops/${c.id}/stage${s}.svg`, 64, 64, 32, 56);
    add(`produce.${c.id}`, `assets/produce/${c.id}.svg`, 32, 32, 16, 16);
    add(`seed.${c.id}`, `assets/seeds/${c.id}.svg`, 36, 40, 0, 0);
  });
  add('crop.withered', 'assets/crops/withered.svg', 64, 64, 32, 56);
  add('crop.bugs', 'assets/crops/bugs.svg', 64, 64, 32, 56);
  add('produce.egg', 'assets/produce/egg.svg', 32, 32, 16, 16);
  ['water', 'fertilize', 'spray', 'cut', 'pick'].forEach(t => add(`tool.${t}`, `assets/tools/${t}.svg`, 36, 36, 18, 18));
  ['sun', 'rain', 'sound_on', 'sound_off', 'menu', 'feed', 'duck'].forEach(t => add(`hud.${t}`, `assets/hud/${t}.svg`, 24, 24, 12, 12));
  add('tile.soil_dry', 'assets/tiles/soil_dry.svg', 64, 40, 32, 16);
  add('tile.soil_wet', 'assets/tiles/soil_wet.svg', 64, 40, 32, 16);
  add('tile.fertilized', 'assets/tiles/fertilized.svg', 64, 40, 32, 16);
  add('prop.dragon_jar', 'assets/props/dragon_jar.svg', 97, 100, 49, 84);
  add('prop.ox_cart', 'assets/props/ox_cart.svg', 180, 152, 78, 110);
  add('prop.signboard', 'assets/props/signboard.svg', 92, 40, 0, 0);
  add('prop.signpole', 'assets/props/signpole.svg', 12, 134, 6, 134);
  add('prop.trough', 'assets/props/trough.svg', 162, 112, 81, 75);
  add('prop.nest', 'assets/props/nest.svg', 139, 72, 70, 36);
  for (let n = 1; n <= 10; n++) add(`prop.egg_pile_${n}`, `assets/props/egg_pile_${n}.svg`, 50, 50, 24, 35);
  add('prop.egg_basket', 'assets/props/egg_basket.svg', 112, 114, 56, 92);
  add('animal.buffalo', 'assets/animals/buffalo.svg', 98, 100, 52, 78);
  add('animal.buffalo_head', 'assets/animals/buffalo_head.svg', 78, 68, 39, 27);
  add('animal.buffalo_tail', 'assets/animals/buffalo_tail.svg', 24, 42, 15, 8);
  ['young', 'fruiting', 'ripe', 'old', 'harvested'].forEach(v => add(`scenery.banana_${v}_iso`, `assets/scenery/banana_${v}_iso.svg`, 190, 190, 95, 150));
  add('scenery.palm_betel_cluster_iso', 'assets/scenery/palm_betel_cluster_iso.svg', 119, 185, 61, 177);
  add('scenery.palm_coconut_dwarf_iso', 'assets/scenery/palm_coconut_dwarf_iso.svg', 105, 101, 51, 93);
  add('scenery.palm_coconut_lean_iso', 'assets/scenery/palm_coconut_lean_iso.svg', 129, 191, 100, 183);
  add('scenery.palm_coconut_twin_iso', 'assets/scenery/palm_coconut_twin_iso.svg', 176, 181, 92, 174);
  add('scenery.palm_sugar_ladder_iso', 'assets/scenery/palm_sugar_ladder_iso.svg', 82, 188, 41, 180);
  add('scenery.palm_sugar_pair_iso', 'assets/scenery/palm_sugar_pair_iso.svg', 110, 198, 57, 189);
  add('scenery.palm_sugar_tall_iso', 'assets/scenery/palm_sugar_tall_iso.svg', 84, 199, 42, 191);
  add('scenery.spirit_house_iso', 'assets/scenery/spirit_house_iso.svg', 76, 170, 38, 157);
  add('scenery.thai_house_iso', 'assets/scenery/thai_house_iso.svg', 277, 252, 126, 146);
  add('character.farmer', 'assets/characters/farmer.svg', 52, 109, 25, 105);
  add('character.farmer_tired', 'assets/characters/farmer_tired.svg', 60, 109, 25, 105);
  add('character.auntie_daeng', 'assets/characters/auntie_daeng.svg', 58, 79, 38, 74);
  add('character.uncle_mee', 'assets/characters/uncle_mee.svg', 47, 104, 24, 100);
  add('animal.duck', 'assets/animals/duck.svg', 51, 45, 26, 41);
  add('scenery.cloud', 'assets/scenery/cloud.svg', 90, 44, 45, 22);
  add('ui.logo', 'assets/ui/logo.svg', 480, 150, 240, 75);
  // 800x600 safe area with 300 px of bleed each side
  ['farm', 'village', 'market', 'pen'].forEach(n => add(`bg.${n}`, `assets/backgrounds/${n}.svg`, 1400, 600, 300, 0));
  return list;
})();

// Where the painted-art pass saves an asset (manifest `paint.output`): PNG sprites, WebP backgrounds.
const paintedPath = output => output.replace(/^assets\//, 'assets/painted/').replace(/\.svg$/, output.startsWith('assets/backgrounds/') ? '.webp' : '.png');

const Assets = {
  // Manifest statuses whose files the game uses. Everything else keeps the code-drawn art.
  USE_STATUSES: ['done', 'approved'],
  found: {}, // id -> file path

  has(id) { return Object.prototype.hasOwnProperty.call(this.found, id); },

  // <image> for use inside SVG, placed so the asset's anchor lands on (x, y).
  image(id, x = 0, y = 0) {
    const sp = ASSET_SPECS[id];
    return `<image href="${this.found[id]}" x="${x - sp.ax}" y="${y - sp.ay}" width="${sp.w}" height="${sp.h}"/>`;
  },

  // <img> for use in HTML.
  img(id, w, h, cls = '') {
    return `<img class="${cls}" src="${this.found[id]}" width="${w}" height="${h}" alt="" draggable="false">`;
  },

  // Served over http(s): trust the manifest statuses. Opened from file:// (fetch is blocked there):
  // probe each expected file and use whatever exists.
  async load() {
    let entries = null;
    try {
      const res = await fetch('assets/manifest.json', { cache: 'no-cache' });
      if (res.ok) entries = (await res.json()).assets;
    } catch (e) { /* file:// page, probe instead */ }
    if (entries) {
      for (const a of entries) {
        if (!ASSET_SPECS[a.id]) continue;
        // a finished painted version wins; otherwise the SVG, or its pre-rendered raster (tools/rasterize-backgrounds.mjs),
        // which is cheaper to draw on phones than a big SVG
        if (a.paint && a.paint.file && this.USE_STATUSES.includes(a.paint.status)) this.found[a.id] = a.paint.file;
        else if (a.file && this.USE_STATUSES.includes(a.status)) this.found[a.id] = a.raster || a.file;
      }
    } else {
      const probe = src => new Promise(done => {
        const im = new Image();
        im.onload = () => done(true);
        im.onerror = () => done(false);
        im.src = src;
      });
      await Promise.all(Object.entries(ASSET_SPECS).map(async ([id, sp]) => {
        const webp = sp.output.startsWith('assets/backgrounds/') && sp.output.replace(/\.svg$/, '.webp');
        if (await probe(paintedPath(sp.output))) this.found[id] = paintedPath(sp.output);
        else if (webp && await probe(webp)) this.found[id] = webp;
        else if (await probe(sp.output)) this.found[id] = sp.output;
      }));
    }
    return Object.keys(this.found);
  },
};
