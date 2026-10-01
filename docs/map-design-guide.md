# Game Map Design Guide: Kit + Recipe + Rules

How every scene in ไร่สุขใจ (Rai Sukjai) is built, lit and shipped. A scene is never one painted picture. It is a **kit** of painted pieces, a short **recipe** that says what goes where, and **rules** that both the painter and the game follow, so the whole thing reads as one place and stays playable.

The method follows Night Camp EP3, "ทำแมพเกมให้ถูกวิธี" (making game maps the right way: beautiful, light, and readable to the game). This guide adapts it to our isometric Thai-countryside scenes. The duck pen is the first scene built this way (see `PEN_LAYOUT` in `js/art/iso.js`).

**Roles.**
- **The mechanics agent (Claude Code)** owns the kit list, the recipes, the rules and the game code.
- **The asset agent (the painter)** owns the pixels.
- Everything is handed over through `assets/manifest.json` (see `assets/README.md`).

---

## 1. Pieces, not one picture

| | One painted image | Kit of pieces |
|---|---|---|
| What the game knows | Nothing. A tree, a roof and the pond are all just pixels, so a duck walks over the roof and across the water. | Every piece knows what it is: the house blocks, the tree hides whoever walks behind it, the pond is water. |
| Changing the layout | Repaint everything. Asking an image model again moves every road and building. | Move one entry in the recipe. |
| Reuse | None. | The same fence, trees and rocks serve the pen, the farm, the market and the village. |
| Light | Baked in, so it can't change with the time of day. | Each piece has a normal map, so the game can light it from any direction (section 6). |
| Variety | One fixed picture. | New arrangements from the same kit. |

**When one image is fine:** an overview or illustration that nothing walks on. In our game that's the **village map** (`bg.village`): it only has tappable places, so it can stay a single painting. **Any scene where characters, animals or the player move uses a kit.**

**Don't stack a character on a single AI-painted background.** The picture has no idea what it contains, so you'd end up hand-drawing invisible walls for every house and tree. That is the kit's job, done backwards.

---

## 2. The kit

A kit is a small set of pieces painted together under one style lock. Night Camp's whole forest map uses **14 pieces (2.6 MB)** to place **1,118 objects**. Ours grows the same way: a few pieces per scene, shared between scenes.

### 2.1 Piece types

| Type | Category / ids | Notes |
|---|---|---|
| **Ground** | `ground.<scene>` | Everything flat: grass, floors, paths, water, plus a distant hazy edge. Shadowless, nothing standing. One per scene. |
| **Big landmarks** | `kit.duck_house`, `scenery.thai_house_iso`, `scenery.spirit_house_iso` | Placed by hand. Block movement, and characters can pass behind them. |
| **Trees and tall plants** | `kit.tree_round_a/b`, `kit.bamboo_clump`, `scenery.palm_*_iso`, `scenery.banana_*_iso` | Frame the scene's edges. Characters can pass behind them. |
| **Low plants** | `kit.bush_a/b`, `kit.reeds` | Filler, softening edges and fences. |
| **Small props** | `kit.rock_a/b`, `kit.haystack`, `kit.water_jar` | Filler with a story. |
| **Fences and edges** | `kit.fence_span_se/sw`, `kit.fence_post` | Built along grid lines from runs, never placed one by one. |
| **Life** | `kit.egret`, ducks, buffalo | May animate. |
| **Lights** (to add) | `kit.lantern`, `kit.oil_lamp`, window glow | Light sources for evening and night (section 6.3). |

### 2.2 Tags: what each piece *is*

Every kit entry should carry `tags`, so the builder and the game know how to treat it without guessing:

| Tag | Meaning | Examples |
|---|---|---|
| `block` | Nothing walks through its footprint | house, tree trunk, jar, haystack, rock_a |
| `occlude` | Depth-sorted with characters (they can be in front of or behind it) | house, trees, fences, bamboo |
| `walkable` | Characters may stand on it | ground, paths, floors |
| `water` | Only water pieces go here | pond area of the ground |
| `edge` | Belongs on a boundary (fence line, pond rim, clearing edge) | fences, reeds, bushes |
| `light` | Emits light at night (`light: {color, radius}`) | lantern, lamp, windows |
| `decor` | Pure decoration, never blocks | flowers, small rocks, egret |
| `flip` | May be mirrored (only if the shader also mirrors its normal map, see rule R11) | bushes, rocks, haystack |

### 2.3 The style lock: these rules make pieces fit together

Night Camp's kit has four locked rules: **outline weight, light and shadow, camera angle, and size relative to the character**. With all four locked, pieces "snap together without falling apart". Ours, with the values in `paint_style`:

1. **Outline:** thin warm dark-brown line art (`#4a2e1a`), lighter and thinner where the light hits, never thick black.
2. **Light:** one soft sun from the upper-left, gentle shading, **no shadow on the ground** (the game draws shadows), a faint darkening only where the piece touches the ground.
3. **Camera:** our 2:1 isometric game camera. Ground lines run diagonally and vertical edges stay vertical. Every piece is seen from the same height.
4. **Scale relative to the farmer:** the farmer is about 67 px tall in the game (about 2× life size). Use these sizes:

   | Piece | Height in game |
   |---|---|
   | fence post | 36 px |
   | haystack | 52 px |
   | duck house | 105 px |
   | banana clump | 120–150 px |
   | round tree | 140–170 px |
   | bamboo | 185 px |
   | Thai house | about 250 px |

   Each kit entry's `height_px` and `footprint` are the contract.
5. **Palette and texture:** the soft painted brushwork and warm palette of `assets/painted/_style/target.jpg`.
6. **Delivery:**
   - colour PNG with clean transparency, at canvas × `scale`;
   - an OpenGL normal map at the same size (section 6.2);
   - anchor on the ground point under the piece.

**What happens without the lock:** one piece is lit from the left, another from the right; one has thick outlines, another thin; one is seen from above, another from the side. Each looks fine alone, but put them together and the scene falls apart. So:
- **Paint variants of one thing in one session** with the same settings (a crop's 5 stages, the 10 egg piles, the 5 banana clumps).
- **Always attach the approved kit pieces as references** when painting new ones.

---

## 3. The recipe

A scene's recipe is a small piece of data, about 2 KB, that says *what* goes *where*. Night Camp's is roughly:

```text
woods: { name, lvText, seed: 23, W: 5200, H: 4000, biome: 'woods',
         roads: [4], ponds: [1], landmarks: [11 placed by hand], safe: [2 camps],
         zones: [...], spawns: [28 × 4], warps: [4] }
```

From that, the builder placed 1,118 objects: 11 by hand, the rest by rules. Changing the `seed` gives a whole new forest in under a second, with the same kit and the same style.

### 3.1 Our recipe format

Our scenes are single screens on an iso grid, so the recipe is smaller. Fields:

| Field | What it holds | Pen example (current values) |
|---|---|---|
| `grid` | origin and tile size of the scene's iso grid | `penPt`: (520, 200), 32 × 16 px per tile |
| `ground` | the ground asset | `ground.pen` |
| `floors` | walkable areas | pen floor u, v 0–12.5 |
| `water` | ponds as ellipses on the grid | centre (7.5, −4.2), radii 4.6 × 2.6 |
| `paths` | polylines on the grid, kept clear | (none yet) |
| `fences` | runs along grid lines | `PEN_FENCES`: 4 runs → 31 sprites |
| `landmarks` | hand-placed pieces | the duck house at (−1.4, 3.6) |
| `keepClear` | screen rects nothing may cover | nest, trough, basket, Uncle Mee, the UI |
| `scatter` | rule-placed filler: pieces, count, area, spacing | trees on the clearing edge, bushes along fences, reeds on the pond rim, haystacks in the margins |
| `lights` | lantern spots for evening and night | (to add) |
| `seed` | random seed for the scatter | one number |

Today the pen's recipe is written out by hand in `PEN_LAYOUT`: 27 pieces plus 31 generated fence sprites. The next step is to move the hand-placed parts into a recipe object and let a seeded **builder** place the scatter by the rules below. The duck house, the nest and the trough stay hand-placed, like Night Camp's 11 landmarks.

---

## 4. Rules (for the builder, and for anyone placing pieces by hand)

| # | Rule | Why |
|---|---|---|
| R1 | Nothing stands on a `keepClear` rect: interactive props, characters, speech bubbles, HUD and buttons. | The player must always see and tap what matters. (Tested in `tests/assets.test.mjs`.) |
| R2 | Nothing `block` or tall stands on a path, and no tree crown covers a path. | Night Camp: tree tops must not block roads. |
| R3 | Only water pieces in water. Reeds, lotus and lily pads go **on the rim or on the water**. Rocks and plants never sit in the pond. | We had two rocks in the pond; the painted pond came out bigger than planned. Read the real water area from the painted ground before placing. |
| R4 | Tall pieces (trees, bamboo, palms) go toward the **back and the edges** of the scene. The middle and the front stay open. | Tall things in front hide the action. The clearing edge frames the scene. |
| R5 | Footprints never overlap. Keep at least `max(footprint)` × 0.75 tiles between neighbours, and 1.5 tiles between tall plants. | No trunks merging, no doubled shadows. (Bananas and palms are already tested.) |
| R6 | Never put the same variant next to itself. Alternate a/b and young/ripe, and vary scale ±10%. | Repetition is the first thing the eye notices. |
| R7 | Bushes and reeds soften hard edges: along fences, at the pond rim, where the floor meets grass. | Edge pieces make pieces look grown into the ground, not dropped on it. |
| R8 | Fences only along grid lines, built from runs (span + end post). Gaps are deliberate (gates, the duck house). | Keeps the isometric grid readable. |
| R9 | Crowns stay below the HUD (screen y ≥ 46) unless the piece is part of the far backdrop. | Tested for palms. |
| R10 | Lights at night follow the life: lanterns along paths at a steady spacing, at doors, on the market stalls. | Night Camp places lamps along the roads, and the scene still reads at night. |
| R11 | Flip only pieces tagged `flip`. When a piece is mirrored, the shader must mirror its normal map too (negate red), or the light comes from the wrong side. | Built-in light comes from the upper-left; a flip moves it to the upper-right. |
| R12 | Depth: everything tagged `occlude` sorts by its ground y with characters and props. Flat decor is drawn with the ground. | Ducks pass behind the fence and the house. |

---

## 5. File weight

Night Camp's forest map, at 5,200 × 4,000 px:

| Approach | Size |
|---|---|
| one PNG | 35 MB |
| one JPEG | 5.4 MB, and lossy |
| kit of 14 pieces plus a 2 KB recipe | **2.6 MB, reused across 33 maps** |
| normal maps at half size | +0.7 MB |

**Our duck pen today:**

| File | Size |
|---|---|
| ground (WebP) | 445 KB |
| 16 kit pieces | 1.47 MB |
| their normal maps | 0.96 MB |
| the old single painted pen | 567 KB |

For one small screen, the single image is *lighter*. The kit pays off when the same pieces build the farm, the market and the village, and it is what makes light, depth and movement possible. To keep it light:

- **Kit pieces → WebP with alpha** (lossy, quality about 0.85), which is typically 50–70% smaller than PNG. The checker already accepts WebP.
- **Normal maps at half size**, as Night Camp does. Normals are smooth, so half resolution is not visible. The shader samples them scaled.
- **Budget per scene:** ground ≤ 600 KB; each kit piece ≤ 300 KB; a new scene should add only the pieces it really needs.

---

## 6. Light and atmosphere

### 6.1 The shader in one line

```glsl
vec3  n     = normalMap(uv);          // which way this pixel faces
float sun   = max(dot(n, sunDir), 0); // facing the sun → bright
vec3  lamp  = nearLights(pos);        // lanterns, windows, glowing things
color = art * (ambient + sunColor * sun + lamp);
```

A flat 2D painting doesn't know which way its surfaces face, so the normal map supplies that.

### 6.2 Normal maps

Each piece's normal map uses the OpenGL convention:

| Colour | Surface faces |
|---|---|
| pink / red | right |
| blue-green | left |
| light green | up |
| purple-blue | the camera |

A flat surface facing the camera is (128, 128, 255).

There are two ways to make them:
1. Model the piece in 3D (Blender) and bake the normal map.
2. Generate it from the painting, from estimated thickness plus segmenting the piece into parts. Night Camp does this, and so does our painter with Laigter.

Planes must read clearly: roofs, walls and posts follow the isometric faces, while canopies and haystacks are rounded.

### 6.3 Light through the day

Our game counts days and seasons, and the light can follow the player's day (energy spent, from morning to evening):

| Time | Light |
|---|---|
| 06:30 morning | low pinkish sun, long shadows toward the west, a little mist |
| 11:45 noon | sun overhead, short shadows, the pond reflects the sky |
| 15:00 afternoon | golden light, shadows long on the other side, light shafts through the trees |
| 18:30 evening | orange and pink, the first lanterns |
| 21:00 night | blue ambient; lanterns, windows and fireflies become the light sources |

Seasons tint it: the hot season is brighter and yellower, the rainy season greyer, softer and wet, the cool season clearer and bluer.

### 6.4 Layer stack (in this order)

1. art
2. sun + normal map
3. cast shadows
4. point lights (lanterns, windows)
5. bloom on bright lights
6. mist and light shafts
7. colour grading for the time of day
8. vignette
9. depth of field (DOF)

Each layer can be turned off.

### 6.5 Depth of field

A tilt-shift blur on the top and bottom edges, sharp in the middle, makes the scene look like a miniature diorama and pulls the eye to the action. Use it lightly: our scenes are single screens with tappable things near the edges, so keep the blur outside the safe area, or blur only the far backdrop.

### 6.6 Frame cost

Night Camp's full effect stack costs about 4.5 ms per frame on their test machine, out of the 16.7 ms a 60 fps frame allows. Ours must:
- fit in about 5 ms on a mid-range phone;
- scale down per device (drop bloom, then DOF, then point-light count);
- always keep the plain art path working, which is what the game draws today.

---

## 7. Making a new scene: checklist

1. **Decide:** kit or single image? If anything moves on it, use a kit.
2. **Write the recipe:**
   - the grid;
   - floors, water and paths;
   - fences;
   - landmarks;
   - keep-clear rects (including the UI);
   - scatter rules;
   - lights.
3. **List the kit:** reuse existing pieces first. For each new piece, add a manifest task with `footprint`, `height_px`, `tags`, `scale`, `normal` and a prompt. Run `node tools/export-kit-guides.mjs` for its guide image.
4. **Hand the painter** the ground first (shadowless, flat only), then the pieces, with the style lock (section 2.3).
5. **Check on arrival:**
   - `node tools/check-assets.mjs` for size, alpha and normal map;
   - screenshots in the game;
   - rule R3 against the real painted water;
   - the tests.
6. **Light:** add `light` spots, then check the scene at morning, noon, evening and night.
7. **Weigh it** against the budget (section 5).

---

## 8. Where we are

| Scene | State |
|---|---|
| Duck pen | Kit done: ground + 16 pieces + 5 bananas, all with normal maps. Recipe hand-written in `PEN_LAYOUT`. |
| Farm | Old SVG art plus painted bananas. **Next scene to convert to a kit.** |
| Market interior | Front view, so it gets its own small kit later. |
| Village map | Single painted image is fine (overview only, rule in section 1). |
| Light | Normal maps exist; the WebGL lighting renderer is not built yet. |
| Builder | Not built; the pen recipe is placed by hand. |
