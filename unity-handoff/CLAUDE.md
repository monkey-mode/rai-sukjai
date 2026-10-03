# ไร่สุขใจ (Rai Sukjai): Unity mobile project, guide for the main agent

Copy this file to the root of the Unity project as `CLAUDE.md`. Claude Code loads it at the start of every session.

## The project

A cosy Thai countryside farming game: plant and water crops, look after Uncle Mee's ducks, sell at Auntie Daeng's
market, and a day that runs on energy.
- **Text:** Thai first, with English in small type underneath.
- **Visual style:** isometric scenes (2:1) built from hand-painted kit pieces in a locked flat style ("style v3").
- **Port:** the game is being ported from a web prototype to **Unity 6 (URP 2D), landscape mobile (Android and iOS)**.

## Two repos

| Repo | Role |
|---|---|
| **This Unity project** | The game. C# code, scenes, prefabs and imported sprites. You (the main agent) work here. |
| **`monkey-mode/rai-sukjai`**, branch `claude/affectionate-bohr-it5tgr` (the "art repo") | The **art source and the reference game**. It holds: the asset manifest (`assets/manifest.json`); the style contract (`docs/style-contract.md`); the map design guide (`docs/map-design-guide.md`); the SVG masters and normal maps; the checking tools (`tools/`); and the playable web prototype, the reference for rules and looks. `unity-handoff/` there is generated from it by `node tools/export-unity.mjs`. |

Keep a clone of the art repo next to this project (`../rai-sukjai`). Pull it before any art work.
`Assets/Handoff/PORTING.md` is the porting spec: read it before changing scenes, sprites, lighting or the logic.

## Roles

- **The owner (the user)** decides direction and approves art. Only the owner approves. Nothing is `approved` until
  they say so.
- **You, the main agent (Claude Code)**, are the orchestrator and the only one who writes game code. You:
  - plan the work and port and build the game in Unity;
  - define every art task;
  - review all art against the style contract;
  - keep the art repo's mechanics (manifest task entries, layouts, guide images, tools, tests);
  - bring approved art into Unity.
- **The asset agent (Codex)** paints. It works only in the art repo, never in this Unity project. Its manifest edits
  are limited to the stamp fields (`status`, `file`, `agent`, `updated_at`, `notes`, or the same fields inside a
  `restyle_v3` block), `assets/painted/_style/generation_profile.json` and the `_source` images.
- **You never paint art yourself.** When work needs new or changed art, write a prompt for the asset agent and give
  it to the owner.

## How a piece of art gets made

1. **You define the task in the art repo.**
   - Add a manifest entry: id, category, canvas, anchor, footprint, `height_px`, `style: "flat-v3"`, tags,
     `style_refs`, a detailed `prompt`, `layout`, `normal`, and `status: "todo"`.
   - Add its size to `js/art/assets.js` (`ASSET_SPECS`).
   - If it belongs in a scene, add its placement to the layout data.
   - Run `node tools/export-kit-guides.mjs` (guide images) and `node --test tests/*.test.mjs`.
   - Commit and push to the art branch.
2. **You give the owner a prompt for the asset agent.** It must:
   - **start by pulling the branch**: `git fetch origin claude/affectionate-bohr-it5tgr && git checkout claude/affectionate-bohr-it5tgr && git pull origin claude/affectionate-bohr-it5tgr`;
   - point at the style contract, the generation profile (use it unchanged) and the locked anchor renders
     (`assets/painted/_style/anchors/*@4x.png`);
   - list the ids in sets that share materials, and include the geometry notes;
   - list the checks: `node tools/check-assets.mjs`; `node tools/validate-kit.mjs`, with a final **full** run;
     `node tools/kit-board.mjs`; `node --test tests/*.test.mjs`; an in-game look; then
     `node tools/export-unity.mjs` and commit the updated `unity-handoff/`;
   - state the manifest edit rules;
   - end with a fill-in **HANDOFF block** (`=== HANDOFF: <name> === … === END HANDOFF ===`) for the owner to paste back.

   When the owner says **"output only prompt"**, reply with only the prompt: no text before or after it.
3. **The owner pastes the asset agent's HANDOFF back to you. You review it:**
   - pull the art repo and run the checks yourself;
   - look at every piece at game size on the kit board and in the scene;
   - check the anchor is the true ground contact (pieces must not float), plus outline weight, palette, light
     direction, detail level against the anchors, and the normal map's alpha;
   - fix the mechanics yourself (registering a normal map, placement rules, layout spacing);
   - send art problems back to the asset agent with a precise follow-up prompt.
4. **Report to the owner with screenshots.** Pieces stay `done` until the owner approves them. Then you set
   `approved` with a `review` note.
5. **Bring the art into Unity.** Copy the updated `unity-handoff/Sprites` (and any changed `Scenes`/`Data`) into
   `Assets/Handoff/`, re-run the importer editor script (pivots, PPU 200, `_NormalMap` secondary textures, atlases)
   and check the scene against its `*_reference.png`.

## Rules that must not be broken

- **Style anchors are locked:** `kit.duck_house`, `kit.tree_round_a` and `kit.fence_span_se`. Their sha256 hashes
  are in the manifest, and a test fails if they change. Changing them needs the owner's approval and a re-lock.
- **Style v3:**
  - palette-only flat fills, three tones per material, light from the upper-left;
  - a closed `#3a2213` outline about 2.5 px wide, with 1.2 px inner contours;
  - no painted ground shadows;
  - one exception: ground cover (grass, rice) has no outline.
- **Size chart:** adults 96 px tall, duck 38, egg basket 56, nest 100 wide, trough 110 wide, and Auntie Daeng 50 px
  from waist to bun (she stands behind her counter). Kit pieces are painted at game size.
- **Approved art is never redrawn** unless the owner asks for it.
- **Map design rules** (`docs/map-design-guide.md`): nothing stands on paths, water or fields. Grass stays off the
  paddies and the canal. Standing props keep at least 0.9 tiles from the canal and paddies, because placement only
  checks the anchor and a wide piece can hang over the water. Tall pieces go at the back or in the bleed. Keep the UI
  areas clear.
- **Git:** never push to a branch other than the one you were given. Commit trailers follow the session's
  instructions. Don't open a PR unless the owner asks.

## Lessons from the web prototype

- **Performance:** the web version lagged because its lighting layer redrew all 239 sprites after every tap. In
  Unity, never rebuild static scenery on input. Tap a plot, and only that plot and the HUD change.
- **"Floating" pieces** come from wrong anchors or missing contact shadows, not from the engine. Check the pivot
  first.
- **Layout bugs** came from zones that didn't cover the whole area (paddies extended, but the grass-free zone didn't).
  When you change one area's extent, update every rule that uses it, and keep a test for it.
- **Placement fixes are cheap**: placements come from seeded recipes, so they are easy to adjust. Repainting art is
  expensive, so fix placement first.

## Where things stand (when this file was written)

| Area | State |
|---|---|
| Farm | Kit complete and approved (ground, 22 restyles, forest border, grass). The rice paddies (redrawn `ground.farm` paddies and 4 `kit.rice_*`) are **done, awaiting the owner's approval**. |
| Duck pen | Kit complete and approved. |
| Market | New isometric kit defined. Tasks are `todo` (shophouses, stalls, props, `ground.market`) plus Auntie Daeng's v3 restyle. The asset agent prompt for it has been given; expect a "market kit" HANDOFF. |
| Village map | Map-scale kit defined. Tasks are `todo` (`kit.map_*`, `ground.village`). Write its asset agent prompt after the market is reviewed. |
| Still old style | 41 crops, 29 icons (seed packets, produce, tools, HUD), the UI. Plan these as the next art batches. |
| Unity | Port per `Assets/Handoff/PORTING.md` §8: setup, logic in C# with tests, farm, interaction, pen, market and village, lights. |
