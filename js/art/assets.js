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
  add('prop.trough', 'assets/props/trough.svg', 150, 50, 75, 48);
  add('prop.nest', 'assets/props/nest.svg', 130, 46, 65, 23);
  add('prop.egg_basket', 'assets/props/egg_basket.svg', 90, 80, 45, 78);
  add('prop.market_counter', 'assets/props/market_counter.svg', 204, 120, 102, 120);
  add('animal.buffalo', 'assets/animals/buffalo.svg', 98, 100, 52, 78);
  add('animal.buffalo_head', 'assets/animals/buffalo_head.svg', 78, 68, 39, 27);
  add('animal.buffalo_tail', 'assets/animals/buffalo_tail.svg', 24, 42, 15, 8);
  add('scenery.cloud', 'assets/scenery/cloud.svg', 90, 44, 45, 22);
  ['farm', 'market', 'pen'].forEach(n => add(`bg.${n}`, `assets/backgrounds/${n}.svg`, 800, 600, 0, 0));
  return list;
})();

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
        if (ASSET_SPECS[a.id] && a.file && this.USE_STATUSES.includes(a.status)) this.found[a.id] = a.file;
      }
    } else {
      const probe = src => new Promise(done => {
        const im = new Image();
        im.onload = () => done(true);
        im.onerror = () => done(false);
        im.src = src;
      });
      await Promise.all(Object.entries(ASSET_SPECS).map(async ([id, sp]) => {
        if (await probe(sp.output)) this.found[id] = sp.output;
      }));
    }
    return Object.keys(this.found);
  },
};
