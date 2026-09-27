# ไร่สุขใจ (Rai Sukjai)

A small browser farming game set in the central Thai countryside. It remakes the classic 2007 Flash game *The Farmer*: the rules are the same, and the setting, art and names are new.

**Play:** open `index.html` in a browser. It is one self-contained file with no build step. All art is inline SVG, and the only external asset is Google Fonts (Kanit and Sarabun).

- 4 fields × 12 plots. Tools: water, fertilize, spray, clear and pick. Pick a ripe plot to carry the produce, then click the ox cart (เกวียน) to sell it.
- Buy seeds, fertilizer and bug spray at Auntie Daeng's stall (ป้าแดง). Buy ducks and feed at Uncle Mee's pen (ลุงมี).
- Rain chance follows the Thai seasons. Day 1 is 1 January, and the game ends after day 365.
- Autosaves to `localStorage` (one slot). The WebAudio luk thung / pong lang loop has a mute toggle.
- Keys 1–5 select the tools.

## Code layout

- `CONFIG` at the top of `<script id="game-logic">` holds every crop, shop and rule number. To restore the original flat 2% rain, set `CONFIG.RAIN_CHANCE = 0.02`.
- `endDay(state, rng) -> newState` is a pure function. It resolves bug deaths, then growth and rot, then rolls new bugs, then handles ducks, then advances the day and rolls rain.
- The player actions (`applyTool`, `sellHand`, `walk`, `buy*`, …) sit in the same DOM-free block.

## Tests

```sh
node --test tests/*.test.mjs
```

The tests load the `game-logic` block from `index.html` into a Node VM and drive it with seeded or stubbed RNGs.
