# ไร่สุขใจ (Rai Sukjai)

A small browser farming game set in the central Thai countryside. It remakes the classic 2007 Flash game *The Farmer*: the rules are the same, and the setting, art and names are new.

**Play:** open `index.html` in a browser, straight from disk or from any static server. There is no build step: the scripts are plain `<script>` tags, not ES modules, so `file://` works. The art is SVG asset files (with code-drawn fallbacks), and the only external asset is Google Fonts (Kanit and Sarabun).

- The farm, the village map and the duck pen are isometric; the market stall is a front-view interior. The farm's signpost opens the village map (free); tapping a place on it walks there (5 energy). The temple and the neighbours' houses are marked "soon". 4 fields × 12 plots. Tools: water, fertilize, spray, clear and pick. Pick a ripe plot to carry the produce, then click the ox cart (เกวียน) to sell it.
- The market has two sellers: Auntie Daeng (ป้าแดง) sells seeds, fertilizer and bug spray; Uncle Mee (ลุงมี) sells ducks and feed at his duck pen. New sellers are added in `SELLERS` (js/ui/shop.js).
- Rain chance follows the Thai seasons. Day 1 is 1 January, and the game ends after day 365.
- Autosaves to `localStorage` (one slot). The WebAudio luk thung / pong lang loop has a mute toggle.
- Keys 1–5 select the tools.

## Code layout

```
index.html            page markup + script tags (load order matters)
css/style.css         all styles
js/logic/             game rules, DOM-free and unit-tested
  config.js           CONFIG: every crop, shop and rule number
  calendar.js         dates, Thai seasons, rain chance
  state.js            newGame(), save sanitising, seeded RNG
  endDay.js           endDay(state, rng) -> newState (pure)
  actions.js          player actions (water, pick, buy, walk, …)
js/art/               SVG string builders
  draw.js             outline-style drawing primitives
  assets.js           loads finished asset files; art falls back to code drawings
  iso.js              isometric grid for the farm (projection, soil blocks, fences, prop spots)
  crops.js            crop stages, bugs, produce icons, seed packets
  icons.js            tool / HUD icons
  scenery.js          trees, houses, buffalo, fences
  characters.js       farmer, Auntie Daeng, Uncle Mee
  props.js            dragon jar, ox cart, signposts
  scenes.js           farm, village map, market and duck-pen backgrounds
js/ui/
  context.js          DOM handles, live state `S`, UI state
  storage.js          localStorage save slot
  render.js           farm, map, pen, HUD, toolbar, rain, carried item
  shop.js             market stall and duck-pen shop panels
  modals.js           toasts, title, how-to, morning report, year-end
js/audio.js           WebAudio music loop and sound effects
js/main.js            input handling, End Day flow, boot
```

- To restore the original flat 2% rain, set `CONFIG.RAIN_CHANCE = 0.02` in `js/logic/config.js`.
- `endDay` runs in this order: bug deaths, then growth and rot, then new bug rolls, then ducks, then the next day and its rain roll.

## Art assets (multi-agent)

All art comes from asset files coordinated through one central file, `assets/manifest.json` (124 assets, all done). Each entry has a prompt, size, anchor, output path and status; the game falls back to simple code-drawn art for anything missing. The workflow and a kickoff prompt for the asset AI are in [`assets/README.md`](assets/README.md). `node tools/check-assets.mjs --queue` shows progress.

`node tools/rasterize-backgrounds.mjs` renders the four backgrounds to WebP (1.5x). The game draws the WebP when it exists, since a big vector background is slow to redraw on phones; re-run it after changing a background SVG.

## Screens and controls

The stage is 600 high and 800–1400 wide, so it fills anything from 4:3 to 21:9 (see `style_guide.stage` in the manifest). On small screens the HUD, toolbar and shop panels are drawn larger. On the farm, zoom with the + / − buttons, the mouse wheel or a pinch, and drag to pan; phones start zoomed in on the fields.

## Tests

```sh
node --test tests/*.test.mjs
```

`assets.test.mjs` also validates the asset manifest.

The tests load the `js/logic/` scripts into a Node VM and drive it with seeded or stubbed RNGs.
