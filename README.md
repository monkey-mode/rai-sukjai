# ไร่สุขใจ (Rai Sukjai)

A small browser farming game set in the central Thai countryside. It remakes the classic 2007 Flash game *The Farmer*: the rules are the same, and the setting, art and names are new.

**Play:** open `index.html` in a browser, straight from disk or from any static server. There is no build step: the scripts are plain `<script>` tags, not ES modules, so `file://` works. All art is SVG drawn in code, and the only external asset is Google Fonts (Kanit and Sarabun).

- The farm is drawn in isometric view (market and duck pen are front view). 4 fields × 12 plots. Tools: water, fertilize, spray, clear and pick. Pick a ripe plot to carry the produce, then click the ox cart (เกวียน) to sell it.
- Buy seeds, fertilizer and bug spray at Auntie Daeng's stall (ป้าแดง). Buy ducks and feed at Uncle Mee's pen (ลุงมี).
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
  scenes.js           farm, market and duck-pen backgrounds
js/ui/
  context.js          DOM handles, live state `S`, UI state
  storage.js          localStorage save slot
  render.js           farm, pen, HUD, toolbar, rain, carried item
  shop.js             market stall and duck-pen shop panels
  modals.js           toasts, title, how-to, morning report, year-end
js/audio.js           WebAudio music loop and sound effects
js/main.js            input handling, End Day flow, boot
```

- To restore the original flat 2% rain, set `CONFIG.RAIN_CHANCE = 0.02` in `js/logic/config.js`.
- `endDay` runs in this order: bug deaths, then growth and rot, then new bug rolls, then ducks, then the next day and its rain roll.

## Art assets (multi-agent)

The art is currently drawn in code. Replacement asset files are produced by a separate asset AI, coordinated through one central file, `assets/manifest.json`. It lists 93 assets, each with a prompt, size, anchor, output path and status. The workflow and a kickoff prompt for the asset AI are in [`assets/README.md`](assets/README.md). `node tools/check-assets.mjs --queue` shows progress.

## Tests

```sh
node --test tests/*.test.mjs
```

`assets.test.mjs` also validates the asset manifest.

The tests load the `js/logic/` scripts into a Node VM and drive it with seeded or stubbed RNGs.
