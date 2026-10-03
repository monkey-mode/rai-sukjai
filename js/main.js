/* Input handling, End Day flow and boot. Loaded last. */
'use strict';

function startGame(s) {
  S = s; ui.tool = 'water'; ui.bgScene = null; ui.animKey = null;
  save(); closeModal(); render();
}
function handleAct(act, ds) {
  switch (act) {
    case 'mute': Sound.toggle(); if (S) renderHUD(); return;
    case 'menu': return showMenu();
    case 'close': closeModal(); if (S && S.gameOver) showGameOver(); return;
    case 'title': return showTitle();
    case 'how': return showHow();
    case 'continue': { const s = load(); if (s) { startGame(s); if (s.gameOver) showGameOver(); } return; }
    case 'confirm-new': return showConfirmNew();
    case 'shop-open': ui.shopOpen = ds.seller || 'daeng'; return renderPanel();
    case 'shop-close': ui.shopOpen = false; return renderPanel();
    case 'new-game': store.del(SAVE_KEY); return startGame(newGame());
  }
  if (!S || S.gameOver || ui.busy) return;
  let r = null, fx = null;
  switch (act) {
    case 'tool': {
      ui.tool = ds.tool;
      if (ds.tool.startsWith('seed:')) {
        const i = +ds.tool.slice(5), c = CONFIG.CROPS[i];
        toast(S.inventory.seeds[i] ? { ok: true, th: `เลือกเมล็ด${c.th} — คลิกแปลงว่างเพื่อปลูก`, en: `Click an empty field to plant ${c.en}` }
          : { ok: false, th: `ไม่มีเมล็ด${c.th} ไปซื้อที่ตลาดก่อน`, en: 'No seeds — buy some at the market' });
      } else {
        const t = TOOLS.find(x => x[0] === ds.tool), cost = CONFIG.COST[ds.tool];
        toast({ ok: true, th: `${t[1]}${cost ? ` · ใช้แรง ${cost}` : ' · ไม่ใช้แรง'}`, en: `${t[2]}${cost ? ` — ${cost} energy` : ' — free'}` });
      }
      renderToolbar();
      return;
    }
    case 'plot': {
      r = applyTool(S, ui.tool, +ds.f, +ds.p);
      fx = { water: 'water', cut: 'cut', pick: 'pop', fertilize: 'cut', spray: 'water' }[ui.tool] || 'plant';
      break;
    }
    case 'jar': ui.tool = 'water'; r = { ok: true, th: 'ตักน้ำจากโอ่งมังกร — พร้อมรดน้ำ', en: 'Water tool selected' }; fx = 'water'; break;
    case 'cart': r = sellHand(S, 'cart'); fx = 'coin'; break;
    case 'basket': r = sellHand(S, 'basket'); fx = 'coin'; break;
    case 'go-map': r = walk(S, 'map'); ui.shopOpen = false; break;
    case 'go-place':
      if (ds.soon) { r = res(false, `${ds.th} — เร็ว ๆ นี้`, 'Coming soon'); break; }
      r = walk(S, ds.place); if (ds.place === 'market') ui.greet++; ui.shopOpen = false; break;
    case 'buy-seed': r = buySeed(S, +ds.c); fx = 'coin'; break;
    case 'buy-supply': r = buySupply(S, ds.k); fx = 'coin'; break;
    case 'buy-duck': r = buyDuck(S); fx = 'coin'; break;
    case 'buy-feed': r = buyFeed(S); fx = 'coin'; break;
    case 'trough': r = feedTrough(S); fx = 'plant'; break;
    case 'egg': r = pickEgg(S); fx = 'pop'; break;
    case 'endday': return doEndDay();
    default: return;
  }
  if (!r) return;
  Sound.sfx(r.ok ? fx : 'err');
  save(); render();
  if (r.th) toast(r);
  else if (r.ok && S.energy < CONFIG.TIRED_BELOW && S.energy > 0 && act === 'plot') toast({ ok: false, th: 'เหนื่อยแล้ว…', en: "I'm tired" });
}
function doEndDay() {
  if (S.hand) return toast({ ok: false, th: 'เอาของในมือไปขายที่เกวียนก่อนนอน', en: 'Sell what you carry before bed' });
  ui.busy = true;
  Sound.sfx('night');
  nightEl.classList.add('on');
  setTimeout(() => {
    S = endDay(S, Math.random);
    save(); render();
    setTimeout(() => {
      nightEl.classList.remove('on');
      ui.busy = false;
      if (S.gameOver) showGameOver(); else showReport();
    }, 450);
  }, 700);
}

stage.addEventListener('click', e => {
  if (drag && drag.moved) return;                              // the end of a pan or pinch, not a tap
  Sound.startMusic();
  const t = e.target.closest('[data-act]');
  if (!t || !stage.contains(t)) return;
  handleAct(t.dataset.act, t.dataset);
});
function trackPointer(e) {
  const rc = stage.getBoundingClientRect();
  ui.px = (e.clientX - rc.left) / ui.scale; ui.py = (e.clientY - rc.top) / ui.scale;   // #hand is an HTML layer: stage px
  if (S && S.hand) posHand();
}
stage.addEventListener('pointermove', trackPointer);
stage.addEventListener('pointerdown', trackPointer);
document.addEventListener('keydown', e => {
  if (!S || modal.classList.contains('on') || S.scene !== 'farm') return;
  const i = '12345'.indexOf(e.key);
  if (i >= 0 && S.energy > 0) { ui.tool = TOOLS[i][0]; renderToolbar(); }
});

function fit() {
  const w = Math.round(Math.min(STAGE.MAX_W, Math.max(STAGE.SAFE_W, STAGE.H * window.innerWidth / window.innerHeight)));
  const pad = (w - STAGE.SAFE_W) / 2;
  ui.scale = Math.min(window.innerWidth / w, window.innerHeight / STAGE.H);
  stage.style.width = w + 'px';
  stage.style.setProperty('--pad', pad + 'px');
  // on small screens the HUD and toolbar are drawn larger so text stays readable and buttons stay >= ~44 px
  stage.style.setProperty('--ui', Math.min(1.45, Math.max(1, .82 / ui.scale)).toFixed(3));
  cam.w = w; cam.pad = pad;
  if (ui.scale < .8 && !cam.touched) { cam.z = 1.45; cam.cx = 330; cam.cy = 330; }   // phones start zoomed on the fields
  applyCam();
  stage.style.transform = `scale(${ui.scale})`;
}

// ---- farm camera: widen every SVG layer around the safe area, zoomed and panned on the farm
function applyCam() {
  const z = S && S.scene !== 'farm' ? 1 : cam.z, w = cam.w / z, h = STAGE.H / z;
  if (z === 1) { cam.cx = cam.w / 2 - cam.pad; cam.cy = STAGE.H / 2; }
  cam.cx = Math.min(Math.max(cam.cx, -cam.pad + w / 2), cam.w - cam.pad - w / 2);
  cam.cy = Math.min(Math.max(cam.cy, h / 2), STAGE.H - h / 2);
  const vb = `${(cam.cx - w / 2).toFixed(1)} ${(cam.cy - h / 2).toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`;
  for (const el of stage.querySelectorAll(':scope > svg')) el.setAttribute('viewBox', vb);
  if (typeof Light !== 'undefined') Light.draw();   // the light follows the camera
  zoomEl.innerHTML = S && S.scene === 'farm' && !modal.classList.contains('on')
    ? `<button data-cam="in" title="ซูมเข้า · Zoom in">+</button><button data-cam="out" title="ซูมออก · Zoom out" ${cam.z <= 1 ? 'disabled' : ''}>−</button>` : '';
}
function zoomBy(f, sx = cam.cx, sy = cam.cy) {
  const z = Math.min(2.4, Math.max(1, cam.z * f));
  cam.cx = sx + (cam.cx - sx) * cam.z / z; cam.cy = sy + (cam.cy - sy) * cam.z / z;   // keep the point under the cursor fixed
  cam.z = z; cam.touched = true; applyCam();
}
// screen point -> scene point under the current camera
function scenePt(e) {
  const rc = stage.getBoundingClientRect(), k = cam.z * ui.scale;
  const w = cam.w / cam.z, h = STAGE.H / cam.z;
  return [cam.cx - w / 2 + (e.clientX - rc.left) / k, cam.cy - h / 2 + (e.clientY - rc.top) / k];
}
zoomEl.addEventListener('click', e => { const b = e.target.closest('[data-cam]'); if (b) zoomBy(b.dataset.cam === 'in' ? 1.35 : 1 / 1.35); e.stopPropagation(); });
stage.addEventListener('wheel', e => { if (!S || S.scene !== 'farm' || modal.classList.contains('on')) return; e.preventDefault(); zoomBy(e.deltaY < 0 ? 1.12 : 1 / 1.12, ...scenePt(e)); }, { passive: false });
const pointers = new Map();
let drag = null;
stage.addEventListener('pointerdown', e => {
  pointers.set(e.pointerId, [e.clientX, e.clientY]);
  if (S && S.scene === 'farm' && !e.target.closest('#hud,#toolbar,#zoom,#modal')) drag = { x: e.clientX, y: e.clientY, cx: cam.cx, cy: cam.cy, moved: false, pinch: pointers.size === 2 ? null : undefined };
});
stage.addEventListener('pointermove', e => {
  if (!pointers.has(e.pointerId) || !drag) return;
  pointers.set(e.pointerId, [e.clientX, e.clientY]);
  if (pointers.size === 2) {                                   // pinch to zoom
    const [a, b] = [...pointers.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
    if (drag.pinch) zoomBy(d / drag.pinch); drag.pinch = d; drag.moved = true; return;
  }
  const k = cam.z * ui.scale, dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  if (!drag.moved && Math.hypot(dx, dy) < 8) return;           // a tap, not a drag
  if (cam.z > 1) { drag.moved = true; cam.cx = drag.cx - dx / k; cam.cy = drag.cy - dy / k; cam.touched = true; applyCam(); }
});
const endPtr = e => { pointers.delete(e.pointerId); if (!pointers.size) setTimeout(() => { drag = null; }, 0); };
stage.addEventListener('pointerup', endPtr); stage.addEventListener('pointercancel', endPtr);
window.addEventListener('resize', fit);
fit();

// Title screen over the farm backdrop.
bgEl.innerHTML = farmBG();
ui.bgScene = 'farm';
showTitle();

// Swap in finished asset files; anything missing keeps the code-drawn art.
Assets.load().then(ids => {
  if (!ids.length) return;
  for (const k in plantCache) delete plantCache[k];
  ui.bgScene = null; ui.animKey = null;
  if (S) render();
  else { bgEl.innerHTML = farmBG(); ui.bgScene = 'farm'; if (Assets.has('ui.logo') && document.querySelector('.title-card')) showTitle(); }
});
window.__raiSukjai = { get state() { return S; } };
