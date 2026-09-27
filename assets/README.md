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
  "reference": "assets/reference/crop.phrik.s5.svg",  // current code-drawn placeholder (may be null)
  "reference_render": "plantArt(3,5)",         // how the reference was drawn (tooling only)

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

1. Read `style_guide`, the asset's `categories` entry, its `prompt` and its `reference` SVG. The reference shows the current placeholder's size, pose and framing. Improve on its look, but keep the subject and proportions.
2. Work in priority order: `node tools/check-assets.mjs --queue` lists what's next (`needs_changes` first).
3. Before starting an asset, stamp `"status": "in_progress"`, `"agent": "<your name>"` and `"updated_at": "<ISO time>"`.
4. Save the file exactly at `output`, using a `viewBox` equal to `canvas` and placing the subject so `anchor` lands on the right spot.
5. Stamp `"status": "done"`, `"file": "<output path>"` and `"updated_at"`. Use `notes` for anything the reviewer should know.
6. Edit **only** the stamp fields. Keep the JSON valid with 2-space indentation, and don't reorder entries, so diffs stay small.
7. Run `node tools/check-assets.mjs`. It must print `OK` before you hand back.
8. Never overwrite a file whose status is `approved` unless its status was moved back.

Background references in `assets/reference/bg.*.svg` are the current full scenes, including characters and props. The final backgrounds must leave those out and respect the **KEEP CLEAR** zones in each prompt.

## Kickoff prompt for the asset agent

Copy this into the other AI (give it this repository or these files):

> You are the asset artist for the browser game "ไร่สุขใจ (Rai Sukjai)". Your task list is `assets/manifest.json`, and the working rules are in `assets/README.md`: read both first. For each asset whose status is `needs_changes` or `todo`, in priority order: stamp it `in_progress` with your agent name and the current UTC time, create the file at its `output` path following `style_guide`, its category notes, its `prompt` and its `reference` SVG, then stamp it `done` with `file` set to the path you wrote. Only edit the fields `status`, `file`, `agent`, `updated_at` and `notes`. Hand-author clean, self-contained SVG (viewBox equal to `canvas`, no text unless asked, no external links). Work in batches (for example one crop's five stages together, so they match) and run `node tools/check-assets.mjs` after each batch.

## How the game uses assets

`js/art/assets.js` loads finished files at startup. The art functions draw an asset when its file is available and fall back to the code-drawn art otherwise, so assets can arrive in any order.

- **Served over http(s)** (e.g. `python3 -m http.server`): the game reads this manifest and uses the `file` of every asset whose status is `done` or `approved` (`Assets.USE_STATUSES`).
- **Opened from disk** (`file://`): browsers block reading the manifest, so the game tries loading each expected `output` path and uses whatever exists. Each missing file logs a harmless "file not found" console error; serve the folder to avoid them.

Wired in so far: crop stages, withered, bugs, produce icons, egg, seed packets, tool icons, HUD icons, soil tiles and the fertilized overlay. Characters, animals, props, scenery, backgrounds and the logo need layout work and will be wired when their files arrive. The game's asset list must match this manifest; `tests/assets.test.mjs` checks it.

## Tools

- `node tools/check-assets.mjs [--queue]`: validates the manifest and every file marked `done` / `approved`, and prints the status summary. The test suite runs it too.
- `node tools/export-references.mjs`: regenerates `assets/reference/*.svg` from the game code. Needs Playwright with Chromium. The mechanics agent runs it after changing art code.
