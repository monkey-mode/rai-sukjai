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
    case 'go-market': r = walk(S, 'market'); ui.greet++; break;
    case 'go-pen': r = walk(S, 'pen'); break;
    case 'go-home': r = walk(S, 'farm'); break;
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
  Sound.startMusic();
  const t = e.target.closest('[data-act]');
  if (!t || !stage.contains(t)) return;
  handleAct(t.dataset.act, t.dataset);
});
function trackPointer(e) {
  const rc = stage.getBoundingClientRect();
  ui.px = (e.clientX - rc.left) / ui.scale; ui.py = (e.clientY - rc.top) / ui.scale;
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
  ui.scale = Math.min(window.innerWidth / 800, window.innerHeight / 600);
  stage.style.transform = `scale(${ui.scale})`;
}
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
  else { bgEl.innerHTML = farmBG(); ui.bgScene = 'farm'; }
});
window.__raiSukjai = { get state() { return S; } };
