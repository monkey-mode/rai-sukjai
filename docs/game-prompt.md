# ไร่สุขใจ (Rai Sukjai): full game prompt (browser version)

A complete description of the browser game as it is built in this repo. It works as a prompt that an agent can rebuild the game from, or as the design spec for a port. Every number below comes from `js/logic/config.js` and the logic files.

---

```
Build "ไร่สุขใจ (Rai Sukjai)": a cosy single-player farming game set in the Thai countryside, playable in the browser on desktop and phones. You run a small farm for one year (365 days). Grow crops, raise ducks, sell at the village market, and end the year with as much money as possible.

== TECH ==
- Plain HTML, CSS and vanilla JavaScript (no framework, no build step). One index.html loads the scripts in order: logic, then art, then UI, then main.js last.
- The scenes are drawn as SVG on a fixed stage, 600 px high. Everything interactive lives in a centred 800 × 600 safe area; the stage widens up to 1400 px on wide screens, and backgrounds are painted with bleed that wide. The stage scales to fit the window.
- Keep the logic pure and separate from the UI:
  - logic/config.js holds every number (below);
  - logic/state.js: newGame, sanitizeState (repairs old saves), and mulberry32, a seeded RNG for tests;
  - logic/actions.js: every player action; each one mutates the state and returns {ok, th, en} for a toast;
  - logic/endDay.js: endDay(state, rng) → new state, pure;
  - logic/calendar.js: dates and seasons.
- Unit-test the logic with Node's built-in test runner (node --test).
- Autosave to localStorage after every action. Remember the mute setting separately.
- Sound with WebAudio, all generated in code (no audio files): a looping luk thung / pong lang style tune (khaen-like drone, phin bass, ching cymbal), and sound effects for water, cut, pop (pick), coin (sell or buy), plant, error and night.
- All text is bilingual: Thai first, with English in smaller type underneath (fonts: Kanit for headings and numbers, Sarabun for body text).

== NUMBERS (config) ==
- Start: money ฿400, energy 100 (max 100). The game lasts 365 days. 4 fields × 12 plots each.
- Energy costs: water 1, fertilise 1, spray 1, clear 1, pick 0, plant 0, walk 5.
- Below 6 energy the farmer looks and says "เหนื่อยแล้ว…" (I'm tired).
- Crop stages: 1–4 growing, 5 ripe, 6 withered (must be cleared).
- Bugs: only stage-4 plants can catch them, 10% chance per plot each night. A bugged plant dies with chance 1/3 each night.
- Rain chance per day by season: hot 3%, rainy 25%, cool 5%.
- Crops, as id, Thai name, English name, seed price, sell price per item, k, and harvests per plant (a stage needs k+1 growth points):

  | id | Thai | English | seed ฿ | sell ฿ | k | harvests |
  |---|---|---|---|---|---|---|
  | phakbung | ผักบุ้ง | Morning glory | 100 | 50 | 0 | 1 |
  | khana | คะน้า | Chinese kale | 200 | 60 | 0 | 1 |
  | manthet | มันเทศ | Sweet potato | 300 | 75 | 1 | 1 |
  | phrik | พริก | Chili | 500 | 150 | 2 | 4 |
  | thua | ถั่วฝักยาว | Long bean | 600 | 160 | 3 | 5 |
  | strawberry | สตรอว์เบอร์รี่ดอย | Highland strawberry | 800 | 200 | 3 | 4 |
  | mango | มะม่วงน้ำดอกไม้ | Nam Dok Mai mango | 1200 | 350 | 5 | 6 |
  | watermelon | แตงโม | Watermelon | 900 | 500 | 4 | 1 |

  Each crop also has a short Thai shop description.
- Supplies: fertiliser (ปุ๋ยคอก) ฿200 for 50 uses; bug spray (ยาฉีดแมลง) ฿200 for 20 uses.
- Ducks: ฿1000 each, at most 5. Feed is ฿200 for 20 portions. The trough holds at most 5 portions a day. An egg sells for ฿50. If the trough is empty at night, there is a 10% chance one duck starves.

== CALENDAR ==
- Day 1 is 1 January (non-leap year). Show the date in Thai and English month names.
- Seasons: hot = March–May, rainy = June–October, cool = November–February.
- The HUD clock follows energy: 06:00 at full energy, moving on to 21:00 when energy runs out.

== STATE ==
{ version, day, money, energy, scene ('farm'|'map'|'market'|'pen'), rain, fields: [{crop: index|null, plots: [{stage, progress, watered, fertilized, bug, harvests}]}], inventory: {seeds[8], fertilizer, spray, feed}, ducks, trough, eggs, hand: null | {type:'crop', crop, n} | {type:'egg', n}, gameOver, lastReport, stats: {cropsSold, eggsSold, earned, spent} }
A new game rolls for rain on day 1.

== PLAYER ACTIONS (each returns a bilingual message on failure) ==
- Tools, chosen on the farm's toolbar (keys 1–5): water, fertilise, spray, clear, pick. The toolbar also has the 8 seed packets, each with a count. Choosing a tool shows its energy cost in a toast.
- Plant: select a seed packet, then tap a field. It needs the WHOLE field empty (crop === null). One packet plants all 12 plots at stage 1. Plots start watered if it is raining. Harvest counters reset.
- Water (1 energy):
  - only growing plants (stages 1–5);
  - not when it rains (the rain already watered them);
  - once a day per plot.
- Fertilise (1 energy plus 1 fertiliser): growing plants only, once a day per plot.
- Spray (1 energy plus 1 spray): only plots with bugs; removes the bug.
- Clear (1 energy): resets any non-empty plot to empty. When all 12 plots are empty, the field becomes free to plant.
- Pick (0 energy): only ripe plants (stage 5). The produce goes into your hand, and you can stack only the same crop.
  - single-harvest crops: the plot empties;
  - multi-harvest crops: the plant goes back to stage 4 with progress 0, until its harvests are used up; then it withers.
  - Yellow pips on the plot show the harvests left.
- Sell:
  - tap the ox cart on the farm to sell carried produce (crops only);
  - in the duck pen, tap the egg basket to sell carried eggs (eggs only);
  - money += price × count, and the stats update.
- Hands full: you cannot pick a different item, walk anywhere, or end the day while carrying something.
- Running out of energy:
  - at 0 energy every action is blocked ("หมดแรงแล้ว… กด 'จบวัน' เพื่อพักผ่อน", out of energy, end the day to rest);
  - with too little energy for an action, it says "เหนื่อยแล้ว…" (I'm tired).
- Dragon jar (โอ่งมังกร) on the farm: tapping it selects the water tool.
- Walking. The village map is the hub:
  - farm → map: the signpost, free;
  - map → market or duck pen: 5 energy, and you need MORE than 5;
  - back to the farm: 5 energy, always allowed even when tired (energy floors at 0);
  - every scene other than the farm has a "← หมู่บ้าน" (back to the village map) button.
- Shops:
  - Auntie Daeng's stall (market): seeds and supplies;
  - Uncle Mee (duck pen): ducks and feed, plus a "coming soon" water buffalo card.
  - Buying fails with "เงินไม่พอ" (not enough money) when you can't afford it.
- Duck pen:
  - tap the trough to add one feed portion (up to 5 a day);
  - tap the nest to pick one egg into your hand (stacks with eggs);
  - tap the egg basket to sell the eggs.
- End Day (button on the farm toolbar): refused while carrying something. The screen fades to night, the night runs, then a morning report appears.

== NIGHT (endDay, pure, with an rng) ==
1. For every planted plot that is growing (stages 1–5):
   - if it has a bug and rng < 1/3, it withers (stage 6) and counts as a bug death;
   - otherwise progress += (watered ? 1 : 0) + (fertilized ? 1 : 0). While progress ≥ k+1, take k+1 off and go up one stage. Going past stage 5 makes it rot (withered). Count grew and ripened.
   - Every plot then resets watered and fertilized.
   - Note: watering or fertilising a ripe plant makes it rot overnight. That's the risk the player must learn.
2. Only after that, new bugs: each stage-4 plot without a bug catches one with chance 0.10.
3. Ducks:
   - fed = min(ducks, trough);
   - if there are ducks and the trough is empty, there is a 10% chance one duck dies;
   - eggs += fed, then the trough empties.
4. Morning:
   - day + 1, or game over after day 365;
   - energy back to full, scene back to the farm;
   - roll for rain with the new day's season chance; rain waters every growing plot.
   - Save a report: grew, ripened, rotted, bug deaths, new bugs, eggs laid, duck died, rain.

== SCREENS AND UI ==
- Title: logo "ไร่สุขใจ / RAI SUKJAI", a one-line pitch, and the buttons Continue (if there's a save), New game (asks for confirmation if a save exists) and How to play.
- How to play: one card with the rules above, in short Thai paragraphs plus an English summary.
- Menu (pause): Resume, How to play, New game (with a confirmation that the current farm will be lost).
- Morning report: "อรุณสวัสดิ์!" (good morning), the date and season, then bullet lines for whatever happened: rain, ripened or grew, rotted, bug deaths, new bugs ("รีบฉีดยา!", spray them quickly), eggs laid, a duck died, or "คืนนี้เงียบสงบ" (a quiet night).
- Year end: final money, profit or loss against ฿400, crops and eggs sold, earned and spent, ducks left, and a title by final money:
  - ≥ 100,000: "เศรษฐีบ้านไร่!" (farm tycoon)
  - ≥ 20,000: "ชาวไร่มือทอง" (golden-handed farmer)
  - ≥ 2,000: "พออยู่พอกิน สุขใจ" (enough to live on, and happy)
  - else: "ปีหน้าเอาใหม่นะ" (try again next year)
  - then a "Play again" button.
- HUD (top bar):
  - weather icon (sun or rain);
  - day X / 365, with the Thai and English date and the clock;
  - season chip;
  - money;
  - energy bar, turning red with "เหนื่อย!" (tired) below 6;
  - inventory counts: fertiliser, spray, feed, ducks;
  - mute and menu buttons.
- Toolbar (farm only, bottom): the 5 tools (fertiliser and spray show their counts as badges), a separator, the 8 seed packets with counts (dimmed at 0), and a big red "จบวัน / End Day" button. Tools are disabled at 0 energy.
- Toasts: a short bilingual message for 2 seconds, red when an action failed.
- The carried item follows the pointer as an icon with ×n.
- Field badge on each field's outer corner: the field number plus the crop's icon, or "ว่าง" (empty).
- Farm camera:
  - zoom 1–2.4× with pinch, mouse wheel or the +/− buttons; drag to pan when zoomed;
  - a drag of under 8 px still counts as a tap;
  - phones start zoomed to 1.45× on the fields.
- On small screens the HUD and toolbar scale up so text stays readable and buttons stay at least about 44 px.

== SCENES (isometric 2:1, tiles 64 × 32 px) ==
- FARM: a forest clearing.
  - The fields: 4 fields of 4 × 3 plots, laid out 2 × 2 with a one-tile path between them, on a raised dirt yard with grass bunds.
    - Each plot is a soil block, darker when watered and showing fertiliser specks when fertilised.
    - Plants are drawn per crop and stage, with bugs on infested plants and harvest pips.
  - Around the yard:
    - a traditional Thai teak stilt house with a veranda and stair;
    - a Phra Phum spirit house;
    - a dragon water jar;
    - an ox cart for selling, with a "ขายผลผลิต / Sell produce" sign;
    - a signpost "ไปหมู่บ้าน" leading to the village;
    - a buffalo in a fenced paddock;
    - banana plants and palms (coconut, sugar palm, betel);
    - haystacks, a field hut and a scarecrow.
  - At the back: flooded rice paddies with dikes, rows of young and ripe rice and a grassy mound, plus an irrigation canal with a plank footbridge.
  - Also: a lotus pond with reeds and egrets, and a dirt path.
  - A dense forest border along the two back edges: rows of shuffled trees, bamboo and bushes, darker the deeper they stand.
  - Grass tufts cover the open ground, with dry versions in the hot season.
  - Clouds drift by. Rain falls when it rains.
  - The farmer stands near the jar and looks tired at low energy.
- VILLAGE MAP (the hub):
  - an isometric village with two dirt lanes crossing at the market;
  - tappable places, each with a name plate and its walk cost: ไร่ของเรา (our farm), ตลาด (market), คอกเป็ดลุงมี (Uncle Mee's ducks);
  - วัด (the temple) and บ้านเพื่อนบ้าน (the neighbours) are shown but say "soon";
  - trees, palms and bamboo fill the rest; the farmer, Uncle Mee and the buffalo appear small.
- MARKET:
  - Auntie Daeng (ป้าแดง) behind her stall, holding a golden fan, with a rotating greeting bubble ("มาแล้วเหรอหลาน วันนี้เอาอะไรดีจ๊ะ" and two others);
  - a "🛒 ซื้อของป้าแดง / Seeds & supplies" button opens her shop board: seed cards with descriptions and prices, plus the fertiliser and spray cards.
  - The new isometric market square has wooden shophouses, neighbour stalls, lantern posts, baskets, crates, rice sacks and a sleeping dog.
- DUCK PEN:
  - a fenced pen floor with Uncle Mee's bamboo duck house on stilts;
  - the nest with an egg pile (the pile grows up to 10, with darker piles behind past 10 and 20), labelled with the egg count;
  - the trough showing its feed level and count, and the egg basket labelled with the egg price;
  - ducks (as many as you own) wander around and depth-sort with the props;
  - Uncle Mee with a speech bubble ("เป็ดกินอิ่ม ไข่ก็ดกนะหลาน", well-fed ducks lay every day) and a "🦆 ซื้อสัตว์ลุงมี" (buy from Uncle Mee) shop button;
  - a pond with reeds and egrets, trees, bamboo, haystacks and jars around it.
  - If you have no ducks: "ยังไม่มีเป็ด — ซื้อจากลุงมีได้เลย" (no ducks yet, buy some from Uncle Mee).

== ART DIRECTION ("style v3") ==
- Hand-painted kit pieces assembled into scenes. Each piece stands on its ground point and is depth-sorted with the others.
- Flat colours from a locked palette with three tones per material (light, base, shadow), cel-shaded with light from the upper-left.
- A bold closed dark-brown outline (#3a2213, about 2.5 px) with thinner 1.2 px inner lines. Ground cover (grass, rice) has no outline.
- Natural, sculpted, hand-made detail, never a generic flat cartoon. No painted ground shadows (the game adds them).
- Size chart: adults 96 px tall, duck 38, egg basket 56, nest 100 wide, trough 110 wide, duck house about 105, trees 140–170.
- Each piece has a normal map for moving light.

== LIGHT AND ATMOSPHERE ==
- A time-of-day tint follows the energy clock: cool and pinkish at dawn, neutral mid-morning to afternoon, golden then orange at dusk, blue and dim at night (still playable).
- The sun moves left to right and lights the normal maps. Cast shadows are long in the morning and evening and short at noon.
- Windows, the shrine candles, the cart lamp and the duck-house door glow warm at dusk.
- A night fade plays at End Day.

== QUALITY BAR ==
- Every action responds instantly. Never rebuild static scenery on a tap: only the changed plot and the HUD update.
- Nothing floats or overlaps wrongly: every sprite stands on the ground, and nothing stands on paths, water or fields.
- Thai text renders correctly (tone marks and vowels).
- The game is fully playable with a mouse, touch, or keys 1–5 for the tools.
```
