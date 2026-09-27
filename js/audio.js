/* WebAudio: generated luk thung / pong lang loop, khaen drone and sound effects. */
'use strict';

const Sound = {
  ctx: null, master: null, music: null, noise: null, timer: 0, playing: false, step: 0, next: 0,
  muted: store.get(MUTE_KEY) === '1',
  init() {
    if (this.ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : .55;
    this.master.connect(this.ctx.destination);
    this.music = this.ctx.createGain(); this.music.gain.value = .5; this.music.connect(this.master);
    const len = this.ctx.sampleRate;
    this.noise = this.ctx.createBuffer(1, len, len);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return true;
  },
  hz: m => 440 * Math.pow(2, (m - 69) / 12),
  env(t, peak, dur, dest, attack = .005) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(dest);
    return g;
  },
  tone(freq, t, dur, type, peak, dest) {
    const o = this.ctx.createOscillator();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    o.connect(this.env(t, peak, dur, dest));
    o.start(t); o.stop(t + dur + .05);
    return o;
  },
  hit(t, dur, peak, hp, dest) {
    const n = this.ctx.createBufferSource(); n.buffer = this.noise;
    const f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
    n.connect(f); f.connect(this.env(t, peak, dur, dest, .002));
    n.start(t, Math.random() * .5); n.stop(t + dur + .02);
  },
  // pong lang (wooden xylophone) melody in a minor-pentatonic "lai"
  MEL: [69, 72, 74, 0, 72, 69, 67, 69, 74, 0, 77, 74, 72, 69, 67, 0, 65, 67, 69, 72, 69, 67, 65, 62, 64, 65, 67, 0, 62, 0, 0, 0,
    74, 77, 79, 0, 77, 74, 72, 74, 69, 72, 74, 77, 74, 72, 69, 0, 67, 69, 72, 69, 67, 65, 62, 65, 67, 69, 67, 65, 62, 0, 0, 0],
  playStep(i, t) {
    const m = this.MEL[i];
    if (m) { this.tone(this.hz(m), t, .45, 'triangle', .22, this.music); this.tone(this.hz(m) * 4.01, t, .12, 'sine', .04, this.music); }
    if (i % 4 === 0) this.tone(this.hz(i % 8 === 0 ? 38 : 45), t, .35, 'triangle', .3, this.music);   // phin bass
    if (i % 4 === 2) this.hit(t, .06, .08, 7000, this.music);   // ching
    if (i % 8 === 4) this.hit(t, .18, .06, 4000, this.music);   // chap
  },
  startDrone() { // khaen-like reed drone on D + A
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 850;
    const g = this.ctx.createGain(); g.gain.value = .045;
    const lfo = this.ctx.createOscillator(), lg = this.ctx.createGain();
    lfo.frequency.value = 4.2; lg.gain.value = .012; lfo.connect(lg); lg.connect(g.gain); lfo.start();
    [50, 57, 62.05].forEach(m => { const o = this.ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = this.hz(m); o.connect(f); o.start(); });
    f.connect(g); g.connect(this.music);
  },
  startMusic() {
    if (this.playing || this.muted || !this.init()) return;
    this.ctx.resume();
    this.playing = true;
    this.startDrone();
    this.next = this.ctx.currentTime + .1;
    this.timer = setInterval(() => {
      while (this.next < this.ctx.currentTime + .3) {
        this.playStep(this.step, this.next);
        this.step = (this.step + 1) % this.MEL.length;
        this.next += .23;
      }
    }, 60);
  },
  toggle() {
    this.muted = !this.muted;
    store.set(MUTE_KEY, this.muted ? '1' : '0');
    if (this.ctx) this.master.gain.setTargetAtTime(this.muted ? 0 : .55, this.ctx.currentTime, .05);
    if (!this.muted) this.startMusic();
  },
  sfx(kind) {
    if (this.muted || !this.init()) return;
    const t = this.ctx.currentTime, m = this.master;
    switch (kind) {
      case 'water': this.hit(t, .25, .15, 900, m); break;
      case 'cut': this.hit(t, .09, .2, 2500, m); break;
      case 'pop': this.tone(660, t, .1, 'sine', .25, m); this.tone(990, t + .05, .12, 'sine', .2, m); break;
      case 'coin': this.tone(1320, t, .12, 'square', .08, m); this.tone(1760, t + .08, .25, 'square', .08, m); break;
      case 'plant': this.tone(392, t, .12, 'triangle', .25, m); this.tone(523, t + .07, .15, 'triangle', .22, m); break;
      case 'err': this.tone(160, t, .15, 'square', .06, m); break;
      case 'night': [74, 69, 65, 62].forEach((n, i) => this.tone(this.hz(n), t + i * .14, .6, 'triangle', .18, m)); break;
    }
  },
};
