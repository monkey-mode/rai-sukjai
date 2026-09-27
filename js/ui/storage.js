/* localStorage wrapper and save / load of the single save slot. */
'use strict';

const SAVE_KEY = 'raiSukjai.save.v1', MUTE_KEY = 'raiSukjai.muted';

const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} },
};

function hasSave() { return !!store.get(SAVE_KEY); }

function save() { if (S) store.set(SAVE_KEY, JSON.stringify(S)); }

function load() {
  try { return sanitizeState(JSON.parse(store.get(SAVE_KEY))); } catch (e) { return null; }
}
