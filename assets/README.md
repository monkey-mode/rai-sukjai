# Asset pipeline

Two agents work on this game:

| Agent | Role | Writes |
|---|---|---|
| **Mechanics agent** (Claude Code) | Game rules and code. Decides which assets exist, their sizes and anchors, and the prompt for each. Reviews finished assets. | Everything in `assets/manifest.json` except the stamp fields; `review` when reviewing |
| **Asset agent** (any image / SVG AI) | Creates the art files and stamps progress back. | The files under `assets/…` and the stamp fields `status`, `file`, `agent`, `updated_at`, `notes` |

**`assets/manifest.json` is the single central file.** Everything is coordinated through it.

## Manifest layout

- **`style_guide`**: rules that apply to every asset (look, palette, file rules, anchors). Read it before making anything.
- **`categories`**: size and placement notes shared by each kind of asset.
- **`assets[]`**: one entry per file to make:

```jsonc
{
  "id": "crop.phrik.s5",                       // stable id, never changes
  "category": "crop",
  "priority": 1,                               // 1 = needed first
  "name_th": "พริก · สุก", "name_en": "Chili (bird's-eye) — stage 5 (ripe)",
  "output": "assets/crops/phrik/stage5.svg",   // where to save the file
  "format": "svg",
  "canvas": [64, 64],                          // viewBox / pixel size
  "anchor": [32, 56],                          // point the game places on the target spot
  "prompt": "…what to draw…",
  "reference": "assets/crops/phrik/stage5.svg",  // the current version of this asset (null for a brand-new one)
  "reference_render": null,                    // code expression that draws a placeholder (tooling only, for new assets)

  // ↓ stamp fields, written by the asset agent
  "status": "todo",
  "file": null,
  "agent": null,
  "updated_at": null,
  "notes": "",
  "review": null                               // written by the reviewer
}
```

Some entries have extra fields such as `packet_color` or `animated_parts` (named `<g id>` groups the game animates).

## Status flow

```
todo ──► in_progress ──► done ──► approved
              ▲            │
              └── needs_changes (see `review`)
   any ──► blocked (explain in `notes`)
```

| Status | Set by | Meaning |
|---|---|---|
| `todo` | mechanics agent | Not started |
| `in_progress` | asset agent | Claimed. Set `agent` and `updated_at` |
| `done` | asset agent | File saved at `output`, `file` = that path. Waiting for review. **The game already uses it** |
| `needs_changes` | reviewer | Fix what `review` says, then set `done` again |
| `approved` | reviewer | Accepted. The game may switch to it |
| `blocked` | asset agent | Can't be done as written. Say why in `notes` |

If the mechanics agent changes an asset's `prompt`, `canvas` or `anchor` after it was made, it sets `status` back to `todo` and explains the change in `review`.

## Rules for the asset agent

1. Read `style_guide`, the asset's `categories` entry, its `prompt` and its `reference` SVG. For an existing asset the reference is its current file: it shows the size, pose, framing and style the game expects. When redrawing, keep the subject, proportions, canvas and anchor unless the prompt says otherwise.
2. Work in priority order: `node tools/check-assets.mjs --queue` lists what's next (`needs_changes` first).
3. Before starting an asset, stamp `"status": "in_progress"`, `"agent": "<your name>"` and `"updated_at": "<ISO time>"`.
4. Save the file exactly at `output`, using a `viewBox` equal to `canvas` and placing the subject so `anchor` lands on the right spot.
5. Stamp `"status": "done"`, `"file": "<output path>"` and `"updated_at"`. Use `notes` for anything the reviewer should know.
6. Edit **only** the stamp fields. Keep the JSON valid with 2-space indentation, and don't reorder entries, so diffs stay small.
7. Run `node tools/check-assets.mjs`. It must print `OK` before you hand back.
8. Never overwrite a file whose status is `approved` unless its status was moved back.

Backgrounds must leave out the characters, sprites and props the game draws on top, and respect the **KEEP CLEAR** zones in each prompt.

## Kickoff prompt for the asset agent

Copy this into the other AI (give it this repository or these files):

> You are the asset artist for the browser game "ไร่สุขใจ (Rai Sukjai)". Your task list is `assets/manifest.json`, and the working rules are in `assets/README.md`: read both first. For each asset whose status is `needs_changes` or `todo`, in priority order: stamp it `in_progress` with your agent name and the current UTC time, create the file at its `output` path following `style_guide`, its category notes, its `prompt` and its `reference` SVG, then stamp it `done` with `file` set to the path you wrote. Only edit the fields `status`, `file`, `agent`, `updated_at` and `notes`. Hand-author clean, self-contained SVG (viewBox equal to `canvas`, no text unless asked, no external links). Work in batches (for example one crop's five stages together, so they match) and run `node tools/check-assets.mjs` after each batch.

## Isometric farm

The farm scene is isometric (2:1). `style_guide.isometric` in the manifest gives the projection, and `bg.farm` lists the exact yard, bund and keep-clear geometry the game expects (defined in `js/art/iso.js`). Crop, produce and icon assets stay upright sprites. Soil tiles, the ox cart and the farm background are drawn in isometric 3/4 view. The market and duck pen backgrounds are isometric too (each on its own grid, see `style_guide.isometric`); characters and the pen props stay upright sprites.

## Stage size and bleed

The stage is 600 px high and between 800 (4:3) and 1400 (21:9) px wide, depending on the screen. The centred 800×600 area is the safe area: everything the player taps stays there, and all coordinates in prompts are safe-area coordinates. Full-stage backgrounds are painted 1400×600 with anchor (300, 0), so they have 300 px of bleed on each side. An 800-wide background still works: the game mirrors it into the margins. See `style_guide.stage` in the manifest.

## How the game uses assets

`js/art/assets.js` loads finished files at startup. The art functions draw an asset when its file is available and fall back to the code-drawn art otherwise, so assets can arrive in any order.

- **Served over http(s)** (e.g. `python3 -m http.server`): the game reads this manifest and uses the `file` of every asset whose status is `done` or `approved` (`Assets.USE_STATUSES`).
- **Opened from disk** (`file://`): browsers block reading the manifest, so the game tries loading each expected `output` path and uses whatever exists. Each missing file logs a harmless "file not found" console error; serve the folder to avoid them.

Wired in so far: crop stages, withered, bugs, produce icons, egg, seed packets, tool icons, HUD icons, soil tiles, the fertilized overlay, all props, the cloud and the three backgrounds. With an asset background the game still draws the moving or foreground pieces on top (clouds, buffalo, the farm fence, characters, the market counter and the interactive props). Characters, animals and the logo will be wired when their files arrive. The game's asset list must match this manifest; `tests/assets.test.mjs` checks it.

## Tools

- `node tools/check-assets.mjs [--queue]`: validates the manifest and every file marked `done` / `approved`, and prints the status summary. The test suite runs it too.
- `node tools/export-references.mjs`: renders placeholder references into `assets/reference/` for entries that have a `reference_render` expression (new assets without a file yet). Needs Playwright with Chromium.

## Painted art pass

The current art is flat SVG drawn from code. The next step is a **painted** look: soft brush texture, warm sunlight, chibi characters. `assets/painted/_style/target.jpg` shows the target. An image model paints it, not the mechanics agent.

Each asset the game uses has a `paint` block in the manifest. That block is the task:

```jsonc
"paint": {
  "status": "todo",                    // same statuses as above
  "batch": 0,                          // 0 = style anchors, paint and review these first
  "output": "assets/painted/characters/farmer.png",
  "scale": 6,                          // pixels per canvas unit
  "size": [312, 654],                  // exact pixel size of the file (canvas × scale)
  "anchor_px": [150, 630],             // the anchor in file pixels
  "layout": "assets/painted/_layout/character.farmer.png",  // the current art at that exact size
  "prompt": "…what to paint…",         // add paint_style.prompt_suffix; use paint_style.negative_prompt
  "file": null, "agent": null, "updated_at": null, "notes": "", "review": null
}
```

- `paint_style` in the manifest has the look, the light, the camera, the character style, the file rules and the workflow.
- The **layout image** is the composition guide. Feed it to img2img or ControlNet, and match its footprint, base point and pose, so the painted file drops into the game with no code changes.
- The game prefers `paint.file` once `paint.status` is `done` or `approved`. Until then it keeps the SVG, so painted assets can arrive one at a time.
- Sprites are PNGs with transparency. Backgrounds are WebP at 2×. `node tools/check-assets.mjs` checks each finished file's pixel size and alpha channel.
- `node tools/check-assets.mjs --paint` lists the next painted tasks. Re-run `node tools/export-layouts.mjs` if the SVG art changes.
- The asset agent edits only `paint.status`, `paint.file`, `paint.agent`, `paint.updated_at` and `paint.notes`.

### Kickoff prompt for the painting AI

> You are the painter for the browser game "ไร่สุขใจ (Rai Sukjai)", a cozy farming game set in the Thai countryside.
> 1. Read `assets/README.md` (the "Painted art pass" section) and `paint_style` in `assets/manifest.json`.
> 2. Use `assets/painted/_style/target.jpg` as the style reference for everything.
> 3. Run `node tools/check-assets.mjs --paint` to get the queue. Start with **batch 0 only** (the style anchors), then stop and ask for review.
> 4. For each asset:
>    - Stamp `paint.status: "in_progress"` with your name and the UTC time.
>    - Paint `paint.prompt` + `paint_style.prompt_suffix`, avoiding `paint_style.negative_prompt`. Use `paint.layout` as the composition input (img2img or ControlNet), so the subject sits exactly where the layout shows it.
>    - Save the file at exactly `paint.size` pixels to `paint.output`: a PNG with a clean transparent background for sprites, WebP for backgrounds.
>    - Stamp `paint.status: "done"` and `paint.file`.
> 5. Paint variants of the same thing (a crop's 5 stages, the 10 egg piles, a character's poses) in one session with the same settings.
> 6. Edit only the `paint` stamp fields.
> 7. Run `node tools/check-assets.mjs` after each batch; it must print OK.

## Scene kits (duck pen pilot)

Scenes are moving from one big painted background to a **kit**:
- a painted **ground** layer: everything flat, plus the far backdrop;
- separate **pieces** the game places on the scene's grid and depth-sorts: fences, the duck house, trees, bushes, rocks, haystacks and so on.

This lets pieces be reused across scenes, lets ducks and characters walk behind things, and gives each piece its own normal map for moving light.

- The kit tasks are ordinary manifest entries in the categories `ground` and `kit`. They are painted directly, so there's no SVG: `format` png (the ground is WebP), `status: "todo"`. Each entry has:
  - `scale`: file pixels per canvas unit;
  - `footprint`: its size on the ground in tiles, `[down-right, down-left]`;
  - `height_px`: roughly how tall it stands;
  - `layout`: its guide image;
  - `normal`: where its normal map goes.
- **Guides:**
  - `assets/painted/_layout/kit.<name>.png` shows each piece's canvas, anchor cross, ground footprint and height.
  - `assets/painted/_layout/pen_kit_composition.jpg` shows where every piece stands in the pen.
  - Re-run `node tools/export-kit-guides.mjs` after changing the layout (`PEN_LAYOUT` and `PEN_FENCES` in `js/art/iso.js`).
- **Delivery:**
  - Save the colour file at `output`, at exactly canvas × `scale` pixels, transparent for pieces.
  - Save the normal map at `normal`, at the same size. `paint_style.normal_maps` has the convention and tools.
  - Stamp `status: "done"` and `file`. `node tools/check-assets.mjs` checks the size, the alpha channel and the normal map.
- **When the game switches:** it assembles the pen from the kit only once `ground.pen` and every piece are done. Until then it keeps the single painted `bg.pen`. Open `index.html?kit=1` to see the assembled pen with a labelled box for each missing piece.

### Kickoff prompt for the duck pen kit

> You are the painter for "ไร่สุขใจ (Rai Sukjai)". Work on branch `claude/affectionate-bohr-it5tgr`.
>
> **Read first:**
> - the "Painted art pass" and "Scene kits" sections of `assets/README.md`;
> - `paint_style` in `assets/manifest.json`, especially `normal_maps` and `kits`.
>
> **Task:** paint the duck pen kit, the 16 entries with category `ground` or `kit` (`node tools/check-assets.mjs --queue` lists them).
> 1. Start with `ground.pen`. It is the flat layer only: grass, the pen floor, the pond water and the far forest wall. It has no fences, house, trees or props, because those are separate pieces.
> 2. Then paint the pieces in this order: fences (`kit.fence_span_se`, `kit.fence_span_sw`, `kit.fence_post`), `kit.duck_house`, then the trees, bamboo, bushes, rocks, haystack, water jar, reeds and egret.
>
> **For each piece:**
> - Match the look of the painted pen you did before (`assets/painted/backgrounds/pen.webp` and `assets/painted/_style/target.jpg`), but with SOFT built-in light and no shadow on the ground. The game adds shadows and moving light.
> - Paint ONE isolated object that fits its guide image (`layout`): the base on the anchor cross, the footprint on the green diamond, and about `height_px` tall. Save it at exactly canvas × `scale` pixels to `output`, with a clean transparent background.
> - Make its normal map (OpenGL convention: flat facing the viewer = 128,128,255, green = up) at the same size, and save it to `normal`.
> - Stamp `status` `"done"`, `file`, `agent` and `updated_at`. Only edit those fields and `notes`.
>
> **Finish:** after each few pieces run `node tools/check-assets.mjs`; it must print OK. When all 16 are done, open `index.html?kit=1` (served, e.g. `python3 -m http.server`) to check the assembled pen, then commit and push. Report anything that didn't fit its guide.
