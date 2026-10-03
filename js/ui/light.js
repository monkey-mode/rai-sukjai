/* Moving light (docs/map-design-guide.md, section 6). The SVG scene stays as it is; this adds two WebGL layers over
   it: a multiply layer (time-of-day colour and normal-map shading) and a screen layer (sunlit edges and lamp glow).
   After each render the normal maps of every sprite in #bg and #dyn are drawn, at exactly their on-screen transform,
   into a "normal buffer" in scene coordinates; mirrored sprites get mirrored normals and sprites without a normal map
   cover what is behind them as flat. Only the farm and the duck pen are lit. ?light=0 turns it off. */
'use strict';

const Light = {
  K: 2,                                   // normal buffer pixels per scene unit
  on: typeof location === 'undefined' || !/[?&]light=0\b/.test(location.search),
  bakedNormal: new Map(),                 // baked image data URL (the grass layer) -> its normal canvas
  imgs: new Map(),                        // url -> loaded HTMLImageElement
  flipped: new Map(),                     // url -> canvas with the red (x) channel mirrored
  flats: new Map(),                       // url + size -> flat-normal silhouette canvas
  gen: 0,

  init() {
    if (!this.on || this.layers) return;
    this.nb = document.createElement('canvas'); this.nb.width = 1400 * this.K; this.nb.height = 600 * this.K;
    this.sm = document.createElement('canvas'); this.sm.width = this.nb.width; this.sm.height = this.nb.height;   // shadow mask
    this.layers = ['multiply', 'screen'].map(mode => {
      const c = document.createElement('canvas');
      c.className = 'light-layer'; c.style.mixBlendMode = mode;
      const gl = c.getContext('webgl', { premultipliedAlpha: false, alpha: true });
      if (!gl) return null;
      const prog = this.program(gl, mode === 'multiply' ? 0 : 1);
      dynEl.after(c);
      return { c, gl, prog, tex: gl.createTexture(), stex: gl.createTexture() };
    });
    if (this.layers.some(l => !l)) { this.layers.forEach(l => l && l.c.remove()); this.layers = null; this.on = false; }
  },

  program(gl, mode) {
    const vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
    const fs = `precision mediump float;
uniform sampler2D uN, uS; uniform vec4 uVB; uniform vec2 uRes; uniform vec3 uSun, uTint; uniform float uSunK, uRelief, uLamps, uShadow;
uniform vec4 uL[8]; uniform vec3 uLC[8];
const vec3 L0 = vec3(-0.55, 0.55, 0.63);
void main(){
  vec2 sp = vec2(uVB.x + gl_FragCoord.x / uRes.x * uVB.z, uVB.y + (1.0 - gl_FragCoord.y / uRes.y) * uVB.w);
  vec2 tc = vec2((sp.x + 300.0) / 1400.0, sp.y / 600.0);
  vec3 n = normalize(texture2D(uN, tc).rgb * 2.0 - 1.0);
  float sh = texture2D(uS, tc).a * uShadow;            // cast shadow (0 = sunlit)
  float ref = 0.55 + 0.45 * max(dot(vec3(0.0, 0.0, 1.0), normalize(L0)), 0.0);
  float lit = 0.55 + 0.45 * uSunK * max(dot(n, uSun), 0.0) + (1.0 - uSunK) * 0.12;
  float shade = mix(1.0, lit / ref, uRelief) * mix(0.82, 1.0, uSunK);
  vec3 lamp = vec3(0.0);
  for (int i = 0; i < 8; i++) {
    if (uL[i].z <= 0.0) continue;
    vec2 d = sp - uL[i].xy; float a = clamp(1.0 - length(d) / uL[i].z, 0.0, 1.0);
    vec3 dir = normalize(vec3(-d.x, d.y, 40.0));
    lamp += uLC[i] * a * a * (0.45 + 0.55 * max(dot(n, dir), 0.0));
  }
  lamp *= uLamps;
  vec3 c = uTint * shade * mix(vec3(1.0), vec3(0.46, 0.52, 0.74), sh);   // shadows are cool, not black
  ${mode === 0
    ? 'gl_FragColor = vec4(min(c + lamp * 0.9, vec3(1.0)), 1.0);'
    : 'gl_FragColor = vec4(max(c - 1.0, 0.0) * 0.7 + lamp * 0.55, 1.0);'}
}`;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.useProgram(p); const loc = gl.getAttribLocation(p, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    return p;
  },

  idOf(href) {
    if (!this.ids) this.ids = new Map(Object.entries(Assets.found).map(([id, f]) => [f, id]));
    return this.ids.get(href) || null;
  },
  load(url) {
    if (!this.imgs.has(url)) this.imgs.set(url, new Promise(ok => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = url; }));
    return this.imgs.get(url);
  },
  // the normal map as an image, mirrored (red channel inverted) for sprites drawn flipped
  async normalImage(url, flip) {
    const img = await this.load(url);
    if (!img || !flip) return img;
    if (!this.flipped.has(url)) {
      const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
      const g = c.getContext('2d'); g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height);
      for (let i = 0; i < d.data.length; i += 4) d.data[i] = 255 - d.data[i];
      g.putImageData(d, 0, 0); this.flipped.set(url, c);
    }
    return this.flipped.get(url);
  },
  // a sprite without a normal map still covers what is behind it: its silhouette as a flat normal
  async flat(url, w, h) {
    const key = `${url}|${w}|${h}`;
    if (!this.flats.has(key)) {
      const img = await this.load(url); if (!img) return null;
      const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * this.K)); c.height = Math.max(1, Math.round(h * this.K));
      const g = c.getContext('2d'); g.drawImage(img, 0, 0, c.width, c.height);
      g.globalCompositeOperation = 'source-in'; g.fillStyle = 'rgb(128,128,255)'; g.fillRect(0, 0, c.width, c.height);
      this.flats.set(key, c);
    }
    return this.flats.get(key);
  },

  // a sprite's silhouette in black (for its shadow, and to keep shadows off itself)
  async silhouette(url) {
    if (!this.sils) this.sils = new Map();
    if (!this.sils.has(url)) this.sils.set(url, (async () => {
      const img = await this.load(url); if (!img) return null;
      const c = document.createElement('canvas'); c.width = img.naturalWidth || 64; c.height = img.naturalHeight || 64;
      const g = c.getContext('2d'); g.drawImage(img, 0, 0, c.width, c.height);
      g.globalCompositeOperation = 'source-in'; g.fillRect(0, 0, c.width, c.height);
      return c;
    })());
    return this.sils.get(url);
  },
  // Which sprites cast shadows: standing things, not ground cover, ground layers, soil tiles, eggs in the nest or clouds.
  casts(id) { return !!id && !/^(ground\.|bg\.|tile\.|kit\.grass_|prop\.egg_pile|prop\.nest|scenery\.cloud)/.test(id); },

  // Rebuild the normal buffer from what is on screen, then draw.
  async rebuild() {
    const gen = ++this.gen, K = this.K, g = this.nb.getContext('2d');
    const jobs = [];
    for (const svg of [bgEl, dynEl]) {
      const root = svg.getScreenCTM(); if (!root) continue;
      const inv = root.inverse();
      for (const el of svg.querySelectorAll('image')) {
        if (el.closest('.duck, .drift')) continue;                     // moving sprites keep the light of the ground
        const ctm = el.getScreenCTM(); if (!ctm) continue;
        const m = inv.multiply(ctm), href = el.getAttribute('href');
        const x = +el.getAttribute('x') || 0, y = +el.getAttribute('y') || 0, w = +el.getAttribute('width'), h = +el.getAttribute('height');
        const flip = m.a * m.d - m.b * m.c < 0, nUrl = Assets.normal[href];
        const baked = this.bakedNormal.get(href), id = baked ? null : this.idOf(href);
        jobs.push((async () => [m, x, y, w, h, baked || (nUrl ? await this.normalImage(nUrl, flip) : await this.flat(href, w, h)),
          id, this.casts(id) ? await this.silhouette(href) : null])());
      }
    }
    const items = await Promise.all(jobs);
    if (gen !== this.gen) return;                                        // a newer render superseded this one
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = 'rgb(128,128,255)'; g.fillRect(0, 0, this.nb.width, this.nb.height);
    for (const [m, x, y, w, h, src] of items) {
      if (!src) continue;
      g.setTransform(K * m.a, K * m.b, K * m.c, K * m.d, K * (m.e + 300), K * m.f);
      g.drawImage(src, x, y, w, h);
    }
    // Cast shadows, back to front: each sprite adds its shadow (its silhouette laid on the ground away from the sun,
    // skewed about its ground point) and then erases shadows from its own silhouette, so shadows fall on the ground and
    // on things behind, never on the caster itself or on things in front of it.
    const D = daylight(dayHour(S)), { skew, squash } = D.shadow, s2 = this.sm.getContext('2d');
    s2.setTransform(1, 0, 0, 1, 0, 0); s2.clearRect(0, 0, this.sm.width, this.sm.height);
    if (D.shadow.strength > 0) {
      for (const [m, x, y, w, h, , id, sil] of items) {
        if (!sil) continue;
        const sp = ASSET_SPECS[id], lx = x + sp.ax * w / sp.w, ly = y + sp.ay * h / sp.h;
        const ay = m.b * lx + m.d * ly + m.f;                          // the ground point on screen (its height is 0)
        s2.globalCompositeOperation = 'source-over'; s2.globalAlpha = .9; s2.filter = 'blur(3px)';   // soft edges
        s2.setTransform(K * (m.a - skew * m.b), K * squash * m.b, K * (m.c - skew * m.d), K * squash * m.d,
          K * (m.e - skew * m.f + skew * ay + 300), K * (squash * m.f + (1 - squash) * ay));
        s2.drawImage(sil, x, y, w, h);
        s2.globalCompositeOperation = 'destination-out'; s2.globalAlpha = 1; s2.filter = 'none';
        s2.setTransform(K * m.a, K * m.b, K * m.c, K * m.d, K * (m.e + 300), K * m.f);
        s2.drawImage(sil, x, y, w, h);
      }
    }
    for (const l of this.layers) {
      const { gl, tex, stex } = l;
      for (const [t, src] of [[tex, this.nb], [stex, this.sm]]) {
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      }
    }
    this.ready = true;
    this.draw();
  },

  // Shade with the current time of day and camera (cheap: one full-screen pass per layer).
  draw() {
    if (!this.layers || !this.ready) return;
    const lit = S && (S.scene === 'farm' || S.scene === 'pen');
    for (const l of this.layers) l.c.style.display = lit ? '' : 'none';
    if (!lit) return;
    const D = daylight(dayHour(S)), lamps = sceneLamps(S.scene).slice(0, 8);
    const vb = bgEl.getAttribute('viewBox').split(/\s+/).map(Number);
    const dpr = Math.min(2, window.devicePixelRatio || 1), W = Math.round(stage.clientWidth * dpr), H = Math.round(600 * dpr);
    for (const { c, gl, prog, tex, stex } of this.layers) {
      if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
      gl.viewport(0, 0, W, H); gl.useProgram(prog);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, stex);
      const u = n => gl.getUniformLocation(prog, n);
      gl.uniform1i(u('uN'), 0); gl.uniform1i(u('uS'), 1); gl.uniform1f(u('uShadow'), D.shadow.strength); gl.uniform4f(u('uVB'), ...vb); gl.uniform2f(u('uRes'), W, H);
      gl.uniform3f(u('uSun'), ...D.sun); gl.uniform3f(u('uTint'), ...D.tint);
      gl.uniform1f(u('uSunK'), D.sunStrength); gl.uniform1f(u('uRelief'), D.relief); gl.uniform1f(u('uLamps'), D.lamps);
      const L = new Float32Array(32), C = new Float32Array(24);
      lamps.forEach(([x, y, rad, r, g2, b], i) => { L.set([x, y, rad, 0], i * 4); C.set([r, g2, b], i * 3); });
      gl.uniform4fv(u('uL'), L); gl.uniform3fv(u('uLC'), C);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
  },

  // After each render: rebuild the normal buffer on the next frame (several renders in a row cost one rebuild).
  update() {
    if (!this.on) return;
    this.init();
    if (!this.layers) return;
    if (this.pending) return;
    this.pending = true;
    requestAnimationFrame(() => { this.pending = false; this.rebuild(); });
  },
};
