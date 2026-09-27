/* Shared DOM handles, the live game state `S` and transient UI state. */
'use strict';

const $ = s => document.querySelector(s);

const stage = $('#stage'), bgEl = $('#bg'), animEl = $('#anim'), dynEl = $('#dyn'), fxEl = $('#fx'), panel = $('#panel'),
  hud = $('#hud'), toolbar = $('#toolbar'), toastEl = $('#toast'), handEl = $('#hand'), nightEl = $('#night'), modal = $('#modal');

let S = null;

const ui = { tool: 'water', bgScene: null, animKey: null, px: 400, py: 300, scale: 1, busy: false, greet: 0 };

const fmt = n => n.toLocaleString('en-US');
