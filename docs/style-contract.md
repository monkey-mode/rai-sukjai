# Style Contract: scene-kit art (style v3)

This contract makes every kit piece look like it came from the same hand, and makes every batch match the last one. It applies to everything in categories `kit` and `ground` (`style: "flat-v3"` in `assets/manifest.json`).

- **Owner:** the owner approves the style anchors and any change to this contract.
- **Mechanics agent (Claude Code):** keeps the contract, the checks and the layouts.
- **Asset agent:** produces art to it and records how in `assets/painted/_style/generation_profile.json`.

**Quality target.** The owner's Night Camp asset board sets the bar:
- natural silhouettes;
- layered botanical foliage;
- sculpted forms;
- convincing construction;
- readable material detail.

It is a quality target only. Never trace or copy it.

---

## 1. Style anchors

The anchors are finished kit pieces the owner has approved **at game size**. They are the reference for everything after them.

| Anchor | Shows |
|---|---|
| `kit.duck_house` | construction: thatch, woven bamboo, timber frame, planks |
| `kit.tree_round_a` | foliage: layered leaf clusters, trunk, roots |
| `kit.fence_span_se` | small hand-made props: timber, bamboo, rope |

**State: candidates** (`paint_style.style_anchors.status`). They are being refined until the owner approves them. **No other kit piece is produced until then.**

On approval, `node tools/lock-style-anchors.mjs`:
- renders each anchor to `assets/painted/_style/anchors/<id>.png` (game size) and `<id>@4x.png` (the image to attach as a style reference);
- records each SVG's sha256 in the manifest.

`tests/assets.test.mjs` then fails if a locked anchor changes. Changing one needs the owner's approval and a re-lock.

---

## 2. The contract

| Topic | Rule |
|---|---|
| **Camera** | The game's isometric view, 2:1. Ground edges run along the 26.6° diagonals and verticals stay vertical, seen from about 30° above. Build each piece on the iso grid of its layout guide. |
| **Lighting** | One sun, upper-left, for every piece. Surfaces facing up or left take the material's light tone, front faces the base tone, faces down or right the shadow tone. Hard edges between tones (cel shading). One small hard highlight only on glossy things. **No shadow on the ground**: the game draws it, and moving light comes from the normal map. |
| **Palette** | Fills only from `paint_style.palette`. Each material has exactly three tones `[light, base, shadow]`; use the tones **of that material** (roof → straw, walls → bamboo, frame → wood_dark), not just the nearest hex. No other colours, gradients, filters, patterns, masks, blur, glow or noise. |
| **Line weights** | **Outer outline:** `#3a2213`, 2.5 canvas px, closed around the whole silhouette and between major parts (roof/wall, trunk/crown), round joins. **Inner lines:** `#6b4428`, 1.2 canvas px, for planks, weave, thatch rows, leaf veins and rope. The same widths on every piece, so line weight matches in the game. |
| **Shape complexity** | Natural, readable silhouettes: no blobs, no geometric primitives, no noise. Detail is **grouped**: leaves in defined clusters, each built as dark base silhouette + mid layer + light top; thatch in layered rows with irregular tips; planks and weave as clean shapes or inner lines. No trace leftovers: no islands under about 4 px² and no jagged contours. |
| **Material detail** | **Wood:** 2–3 thin grain lines and cut ends. **Bamboo:** node collars and a light–base–shadow roll. **Thatch/straw:** rows and loose tips. **Woven walls:** a regular weave in inner lines. **Leaves:** cluster shapes with a lit top. **Stone:** 2–3 facets plus moss on top. **Water edges:** a reed base at the water line. |
| **Scale (relative to the characters)** | Canvas units are game pixels. The farmer is about 67 px tall in the game (the character size chart is still to be unified: Uncle Mee is currently drawn about 2.7× larger). Reference heights: fence post 36, haystack 52, duck house 105, banana 120–150, round tree 140–170, bamboo 185, Thai house about 250. Each entry's `height_px` is binding (±20%, checked). |
| **Canvas** | The entry's `canvas` (SVG `viewBox`). The whole piece fits inside with a few px to spare; nothing is clipped. |
| **Anchor** | The ground point under the piece sits exactly on the guide's anchor cross. The validator checks that the piece actually stands there. |
| **Footprint** | The entry's `footprint` diamond, in tiles (down-right × down-left), is where the piece touches the ground. Buildings fill it (at least 45% coverage, checked); fence spans run along it. |
| **Normal map** | A PNG at canvas × 2 saved to `normal`, OpenGL convention (flat facing the camera = 128,128,255; green = up), made from the final SVG with the recorded Laigter settings. Planes follow the iso faces, while foliage and straw are rounded. |

---

## 3. How a piece is made

### 3.1 One prompt, four labelled parts (`paint_style.prompt_template`)

| Part | Controls | Source |
|---|---|---|
| **STYLE** | the look, only | the locked anchor renders (`assets/painted/_style/anchors/*@4x.png`) plus this contract |
| **GEOMETRY** | placement, only | the entry's `layout` guide: canvas, anchor cross, footprint diamond, height line. It has no style; never copy its colours or flat shapes. |
| **SUBJECT** | what the object is | the entry's `prompt` |
| **SETTINGS** | how it is generated | `paint_style.prompt_suffix` / `negative_prompt` plus the fixed generation profile |

Approved assets control style. Layout guides control geometry. Never the other way round.

### 3.2 A fixed generation profile

`assets/painted/_style/generation_profile.json` records everything that makes batches match:
- the model and its exact version, the interface, image size, sampler, steps and guidance;
- the seed policy;
- how the style references and the geometry reference are supplied, and their weights or denoise;
- the trace tool and its settings, the palette-snap method, the clean-up rules, the outline redraw and the export settings;
- the Laigter settings.

The asset agent fills it **before the next batch**, and uses the same values for every related batch. **A shared seed alone does not give consistency.** The model version, the reference images and their weights, and the finishing steps all have to stay the same. Any change bumps `profile_version` and needs a fresh style test against the locked anchors.

### 3.3 Finishing without losing the approved look

1. Commit the approved pre-trace image to `assets/painted/_source/<id>.png` (canvas × 2).
2. Trace, then snap each fill to its material's three tones, then remove islands and smooth jagged contours.
3. Redraw the outline and the inner lines as strokes at the locked widths.
4. Export the SVG (`viewBox` = canvas), then render the normal map.
5. Validate:
   - `node tools/check-assets.mjs`: format, palette, no forbidden SVG features, normal map size;
   - `node tools/validate-kit.mjs`: anchor, height, outline share of the silhouette edge, footprint fill for buildings, and against the source: **silhouette IoU ≥ 0.85** and **≥ 60% of the interior detail kept**. Once the anchors are locked it also compares each piece's detail density with theirs.

Tracing, palette reduction and export must keep the approved silhouette and detail. If the validator says detail was lost, fix the SVG; don't loosen the check.

### 3.4 Compare every batch at game size

`node tools/kit-board.mjs` writes `assets/painted/_layout/kit_board.png`: every kit piece at its actual in-game size, on one isometric grid, next to the characters and props. Check every batch on it before stamping `done`. A piece that looks heavier, brighter, busier, plainer, bigger, or lit differently from the anchors is not done.

---

## 4. Order of work

1. Refine the three anchor candidates until the owner approves them at game size.
2. Lock them with `node tools/lock-style-anchors.mjs`.
3. Fill and fix the generation profile.
4. Make `ground.pen` (flat layer only).
5. Make the remaining 12 pieces in sets that share materials:
   - fences (`kit.fence_span_sw`, `kit.fence_post`);
   - foliage (`kit.tree_round_b`, `kit.bamboo_clump`, `kit.bush_a`, `kit.bush_b`, `kit.reeds`);
   - props (`kit.rock_a`, `kit.rock_b`, `kit.haystack`, `kit.water_jar`, `kit.egret`).

   Each set is made in one session with the fixed profile, then validated and checked on the kit board.

**Manifest edits during asset work:** only the stamp fields (`status`, `file`, `agent`, `updated_at`, `notes`), plus `generation_profile.json` and the `_source` images.
