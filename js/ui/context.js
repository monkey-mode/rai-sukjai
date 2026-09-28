/* Shared DOM handles, the live game state `S` and transient UI state. */
'use strict';

const $ = s => document.querySelector(s);

const zoomEl = $('#zoom'), stage = $('#stage'), bgEl = $('#bg'), animEl = $('#anim'), dynEl = $('#dyn'), fxEl = $('#fx'), panel = $('#panel'),
  hud = $('#hud'), toolbar = $('#toolbar'), toastEl = $('#toast'), handEl = $('#hand'), nightEl = $('#night'), modal = $('#modal');

let S = null;

const ui = { tool: 'water', bgScene: null, animKey: null, px: 400, py: 300, scale: 1, busy: false, greet: 0, shopOpen: false };      // shopOpen: false or the open seller's id
// The stage is 600 high and as wide as the screen's aspect allows, from the 800-wide safe area (everything
// interactive lives there, centred) up to 1400 (backgrounds are painted with bleed that wide).
const STAGE = { H: 600, SAFE_W: 800, MAX_W: 1400 };
// Farm camera: zoom factor and the stage point at the centre of the view (pinch / wheel / buttons; drag to pan).
const cam = { z: 1, cx: 400, cy: 300, w: 800, pad: 0 };

const fmt = n => n.toLocaleString('en-US');
