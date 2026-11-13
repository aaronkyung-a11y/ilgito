// ───────────────────────── world: sky, ground, armies, fortress ─────────────────────────
const World = (() => {
  const scene = new T.Scene();
  scene.fog = new T.Fog(0xc98e62, 40, 520);
  const hemi = new T.HemisphereLight(0xffffff, 0x333333, 0.9);
  const sun = new T.DirectionalLight(0xffffff, 1);
  const fill = new T.DirectionalLight(0x8899bb, 0.3);
  const sunDir = V3(0.2, 0.25, -1).normalize();

  // ── sky dome
  const skyU = {
    uTop: { value: hex(0x1b1f3a) }, uMid: { value: hex(0x7a3b3b) }, uHor: { value: hex(0xf0a35a) },
    uSun: { value: hex(0xffb46b) }, uSunCore: { value: hex(0xfff0d0) }, uSunDir: { value: sunDir.clone() },
    uCloudDark: { value: hex(0x3a2030) }, uCloudLit: { value: hex(0xff9a5a) },
    uCloud: { value: 0.6 }, uTime: { value: 0 }, uSunSize: { value: 0.9972 }, uFlash: { value: 0 },
  };
  const sky = new T.Mesh(new T.SphereGeometry(600, 28, 18), new T.ShaderMaterial({
    uniforms: skyU, side: T.BackSide, depthWrite: false, depthTest: false, fog: false,
    vertexShader: `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform vec3 uTop, uMid, uHor, uSun, uSunCore, uSunDir, uCloudDark, uCloudLit;
      uniform float uCloud, uTime, uSunSize, uFlash;
      varying vec3 vDir;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
        return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
      float fbm(vec2 p){ return 0.5*vnoise(p) + 0.25*vnoise(p*2.03+7.1) + 0.125*vnoise(p*4.1+3.3) + 0.0625*vnoise(p*8.3); }
      void main(){
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 col = mix(uHor, uMid, smoothstep(0.0, 0.2, h));
        col = mix(col, uTop, smoothstep(0.12, 0.7, h));
        float sd = max(dot(d, normalize(uSunDir)), 0.0);
        float hasSun = step(uSunSize, 0.99999);
        col = mix(col, uSun, (0.15 * smoothstep(0.953, 0.956, sd) + 0.2 * smoothstep(0.984, 0.9856, sd)) * hasSun + pow(sd, 5.0) * 0.22);
        col = mix(col, uSunCore, smoothstep(uSunSize, uSunSize + 0.0005, sd));
        vec2 uv = d.xz / (abs(d.y) + 0.22);
        float c = fbm(uv * 1.15 + vec2(uTime * 0.006, 0.0));
        float thr = 0.66 - uCloud * 0.2;
        float m1 = smoothstep(thr, thr + 0.01, c) * smoothstep(0.02, 0.09, h);
        float m2 = smoothstep(thr + 0.05, thr + 0.06, c);
        float toSun = clamp(pow(sd, 2.0) * 0.9 + (1.0 - smoothstep(0.0, 0.5, h)) * 0.3, 0.0, 1.0);
        vec3 body = mix(uCloudDark, uCloudLit, toSun * 0.7);
        vec3 cc = mix(mix(uCloudLit, vec3(1.0), 0.3), body, m2);
        col = mix(col, cc, m1 * min(1.0, uCloud * 1.4));
        col = mix(col, uHor, smoothstep(0.03, -0.06, h));
        col += uFlash;
        gl_FragColor = vec4(col, 1.0);
      }`,
  }));
  sky.renderOrder = -10; sky.frustumCulled = false; scene.add(sky);

  // ── ground
  function wrapDraw(g, S, x, y, r, fn) {
    for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
      const px = x + ox * S, py = y + oy * S;
      if (px < -r || px > S + r || py < -r || py > S + r) continue;
      fn(px, py);
    }
  }
  function makeGroundTex() {
    const S = 512, c = document.createElement('canvas'); c.width = c.height = S;
    const g = c.getContext('2d'); const r = mulberry(7);
    g.fillStyle = '#b6b6b6'; g.fillRect(0, 0, S, S);
    const blob = (px, py, s, e, rot, n) => {
      g.beginPath();
      for (let k = 0; k <= n; k++) { const a = (k / n) * TAU, rr = s * (0.72 + 0.28 * Math.sin(a * 3 + rot * 5) + 0.12 * Math.sin(a * 5 + rot)); const x = Math.cos(a) * rr, y = Math.sin(a) * rr * e, cs = Math.cos(rot), sn = Math.sin(rot); if (k) g.lineTo(px + x * cs - y * sn, py + x * sn + y * cs); else g.moveTo(px + x * cs - y * sn, py + x * sn + y * cs); }
      g.closePath(); g.fill();
    };
    for (let i = 0; i < 46; i++) {     // broad flat patches, hard-edged
      const x = r() * S, y = r() * S, s = 26 + r() * 62, e = 0.35 + r() * 0.4, rot = r() * PI, lt = r() < 0.5;
      g.fillStyle = lt ? '#c8c8c8' : '#a2a2a2';
      wrapDraw(g, S, x, y, s, (px, py) => blob(px, py, s, e, rot, 18));
    }
    for (let i = 0; i < 60; i++) {     // small darker clumps
      const x = r() * S, y = r() * S, s = 4 + r() * 10, e = 0.5 + r() * 0.4, rot = r() * PI;
      g.fillStyle = '#8e8e8e';
      wrapDraw(g, S, x, y, s, (px, py) => blob(px, py, s, e, rot, 10));
    }
    g.lineCap = 'round';
    for (let i = 0; i < 84; i++) {    // ink strokes: tufts of dry grass, scuffs
      const x = r() * S, y = r() * S, l = 5 + r() * 12, a = -PI / 2 + (r() - 0.5) * 1.3;
      g.strokeStyle = 'rgba(84,84,84,' + (0.45 + r() * 0.3) + ')'; g.lineWidth = 1.2 + r() * 1.3;
      for (let k = -1; k <= 1; k++) { const aa = a + k * (0.25 + r() * 0.2); g.beginPath(); g.moveTo(x + k * 2.5, y); g.quadraticCurveTo(x + k * 2.5 + Math.cos(aa) * l * 0.5, y + Math.sin(aa) * l * 0.5, x + k * 3 + Math.cos(aa + k * 0.3) * l, y + Math.sin(aa + k * 0.3) * l); g.stroke(); }
    }
    const t = new T.CanvasTexture(c);
    t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(150, 150); t.anisotropy = 4;
    return t;
  }
  const gTex = makeGroundTex();
  const gGeo = new T.PlaneGeometry(1800, 1800, 44, 44); gGeo.rotateX(-PI / 2);
  {
    const n = gGeo.attributes.position.count, cols = new Float32Array(n * 3), rr = mulberry(11);
    for (let i = 0; i < n; i++) { const v = 0.74 + rr() * 0.34; cols[i * 3] = v; cols[i * 3 + 1] = v * (0.95 + rr() * 0.07); cols[i * 3 + 2] = v * (0.9 + rr() * 0.08); }
    gGeo.setAttribute('color', new T.BufferAttribute(cols, 3));
  }
  const gMat = toonMat({ map: gTex, vcol: true, edge: -2, rim: 0 });
  const ground = new T.Mesh(gGeo, gMat); scene.add(ground);

  // ── mountains
  const ridges = [];
  function ridge(radius, hMin, hMax, seed) {
    const seg = 120, pos = [], idx = [], r = mulberry(seed), ink = radius * 0.0026;
    const ph = [r() * TAU, r() * TAU, r() * TAU, r() * TAU, r() * TAU];
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * TAU;
      let h = 0.45 + 0.24 * Math.sin(a * 3 + ph[0]) + 0.17 * Math.sin(a * 7 + ph[1]) + 0.13 * Math.sin(a * 13 + ph[2]) + 0.09 * Math.sin(a * 23 + ph[3]) + 0.06 * Math.sin(a * 41 + ph[4]);
      h = hMin + (hMax - hMin) * sat(h);
      const mid = Math.max(1.5, h * (0.4 + 0.16 * Math.sin(a * 11 + ph[1]) + 0.08 * Math.sin(a * 29 + ph[2])));
      const x = Math.sin(a) * radius, z = Math.cos(a) * radius;
      pos.push(x, -8, z, x, mid, z, x, mid, z, x, h, z, x, h, z, x, h + ink, z);      // haze, haze | body, body | ink, ink
    }
    for (let i = 0; i < seg; i++) for (let q = 0; q < 6; q += 2) { const k = i * 6 + q; idx.push(k, k + 1, k + 6, k + 1, k + 7, k + 6); }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
    g.setAttribute('color', new T.BufferAttribute(new Float32Array((seg + 1) * 18), 3));
    const m = new T.Mesh(g, new T.MeshBasicMaterial({ vertexColors: true, fog: false, side: T.DoubleSide }));
    m.frustumCulled = false; scene.add(m); ridges.push(m);
  }
  function tintRidge(m, top, bottom, ink) {
    const c = m.geometry.attributes.color, n = c.count;
    for (let i = 0; i < n; i += 6) {
      c.setXYZ(i, bottom.r, bottom.g, bottom.b); c.setXYZ(i + 1, bottom.r, bottom.g, bottom.b);
      c.setXYZ(i + 2, top.r, top.g, top.b); c.setXYZ(i + 3, top.r, top.g, top.b);
      c.setXYZ(i + 4, ink.r, ink.g, ink.b); c.setXYZ(i + 5, ink.r, ink.g, ink.b);
    }
    c.needsUpdate = true;
  }
  ridge(560, 22, 120, 3); ridge(470, 10, 74, 5); ridge(390, 4, 40, 9);
  ridges.forEach((m, i) => (m.renderOrder = -9 + i));
  ridges.forEach((m) => { m.material.depthWrite = false; });

  // ── props (speed cues)
  const propM = toonMat({ color: 0x7a705e, rim: 0 }), rockM = toonMat({ color: 0x6b6359, rim: 0.15 });
  {
    const r = mulberry(21);
    const tuftG = flat(new T.ConeGeometry(0.13, 0.24, 4)); tuftG.translate(0, 0.11, 0);
    const tufts = new T.InstancedMesh(tuftG, propM, 620);
    const o = new T.Object3D();
    for (let i = 0; i < 620; i++) {
      const a = r() * TAU, d = 2 + Math.pow(r(), 0.6) * 100;
      o.position.set(Math.sin(a) * d, 0, Math.cos(a) * d); o.rotation.set(rnd(-0.3, 0.3), r() * TAU, rnd(-0.3, 0.3));
      const s = 0.6 + r() * 1.3; o.scale.set(s, s * (0.7 + r()), s); o.updateMatrix(); tufts.setMatrixAt(i, o.matrix);
    }
    scene.add(tufts);
    const rockG = flat(new T.IcosahedronGeometry(0.3, 0));
    const rocks = new T.InstancedMesh(rockG, rockM, 260);
    for (let i = 0; i < 260; i++) {
      const a = r() * TAU, d = 3 + Math.pow(r(), 0.7) * 120;
      o.position.set(Math.sin(a) * d, 0.02, Math.cos(a) * d); o.rotation.set(r() * 3, r() * 3, r() * 3);
      const s = 0.3 + r() * 1.1; o.scale.set(s, s * 0.45, s); o.updateMatrix(); rocks.setMatrixAt(i, o.matrix);
    }
    scene.add(rocks, inkInstanced(rocks, INK_W));
    const stickG = new T.BoxGeometry(0.03, 1.5, 0.03); stickG.translate(0, 0.6, 0);
    const sticks = new T.InstancedMesh(stickG, toonMat({ color: 0x2c221c, rim: 0 }), 110);
    for (let i = 0; i < 110; i++) {
      const a = r() * TAU, d = 38 + r() * 46;
      o.position.set(Math.sin(a) * d, 0, Math.cos(a) * d); o.rotation.set(rnd(-0.6, 0.6), r() * TAU, rnd(-0.6, 0.6));
      o.scale.set(1, 0.5 + r() * 1.2, 1); o.updateMatrix(); sticks.setMatrixAt(i, o.matrix);
    }
    scene.add(sticks);
  }

  // ── armies
  const flags = [];
  const flagTex = {};
  function drawFlagTex(key, bg, fg, ch) {
    let t = flagTex[key];
    if (!t) { const c = document.createElement('canvas'); c.width = 128; c.height = 224; t = flagTex[key] = new T.CanvasTexture(c); }
    const c = t.image, g = c.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, 128, 224);
    g.strokeStyle = fg; g.globalAlpha = 0.55; g.lineWidth = 7; g.strokeRect(8, 8, 112, 208); g.globalAlpha = 1;
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '400 92px "Yuji Boku","Noto Serif KR",serif';
    g.fillText(ch, 64, 116);
    t.needsUpdate = true;
    return t;
  }
  function makeFlag(key, x, z, face, hgt, big) {
    const grp = new T.Group(); grp.position.set(x, 0, z); grp.rotation.y = face;
    const w = big ? 3.4 : 1.5, h = big ? 6 : 2.6;
    mesh(new T.CylinderGeometry(0.05, 0.07, hgt, 5), toonMat({ color: 0x2a211b, rim: 0 }), 0, hgt / 2, 0, grp);
    const geo = new T.PlaneGeometry(w, h, 5, 4); geo.translate(w / 2, 0, 0);
    const m = toonMat({ map: drawFlagTex(key, '#444', '#ddd', '軍'), side: T.DoubleSide, rim: 0, edge: -0.3 });
    const f = mesh(geo, m, 0, hgt - h / 2 - 0.1, 0, grp);
    flags.push({ geo, base: geo.attributes.position.array.slice(), w, ph: rnd(TAU), m });
    scene.add(grp);
    return grp;
  }
  const armies = {};
  function buildArmy(key, side) {
    const rows = 5, cols = 62, n = rows * cols, r = mulberry(side > 0 ? 31 : 47);
    const bodyG = boxG(0.52, 1.5, 0.34); bodyG.translate(0, 0.85, 0);
    const headG = flat(new T.IcosahedronGeometry(0.17, 0)); headG.translate(0, 1.74, 0);
    const spearG = new T.BoxGeometry(0.035, 2.9, 0.035); spearG.translate(0.3, 1.45, 0.08);
    const shieldG = flat(new T.CylinderGeometry(0.32, 0.32, 0.06, 7)); shieldG.rotateX(PI / 2); shieldG.translate(-0.1, 1.02, 0.22);
    const bodyM = toonMat({ rim: 0 }), headM = toonMat({ color: 0x2b2622, rim: 0 }), spearM = toonMat({ color: 0x1e1814, rim: 0 }), shieldM = toonMat({ rim: 0 });
    const bodies = new T.InstancedMesh(bodyG, bodyM, n), heads = new T.InstancedMesh(headG, headM, n);
    const spears = new T.InstancedMesh(spearG, spearM, n), shields = new T.InstancedMesh(shieldG, shieldM, cols * 2);
    const o = new T.Object3D(); let si = 0;
    const tint = [];
    for (let row = 0; row < rows; row++) for (let c = 0; c < cols; c++) {
      const i = row * cols + c;
      const x = (c - (cols - 1) / 2) * 2.5 + rnd(-0.5, 0.5) + (row % 2) * 1.2;
      const z = side * (96 + row * 2.7 + rnd(-0.4, 0.4));
      o.position.set(x, 0, z); o.rotation.set(0, (side > 0 ? PI : 0) + rnd(-0.25, 0.25), 0);
      const s = 0.94 + r() * 0.14; o.scale.set(s, s, s); o.updateMatrix();
      bodies.setMatrixAt(i, o.matrix); heads.setMatrixAt(i, o.matrix); spears.setMatrixAt(i, o.matrix);
      if (row < 2) shields.setMatrixAt(si++, o.matrix);
      tint.push(0.62 + r() * 0.5);
    }
    scene.add(bodies, heads, spears, shields);
    const fl = [];
    for (let k = 0; k < 13; k++) {
      const x = (k - 6) * 12.5 + rnd(-2, 2);
      fl.push(makeFlag(key, x, side * (100 + rnd(0, 6)), side > 0 ? PI / 2 : -PI / 2, 5.2 + rnd(0, 1.6), false));
    }
    fl.push(makeFlag(key, side * 9, side * 112, side > 0 ? PI / 2 : -PI / 2, 13, true));
    armies[key] = { bodies, shields, tint, n, shieldN: cols * 2 };
  }
  buildArmy('foe', -1); buildArmy('ally', 1);
  function setArmy(key, spec) {
    const a = armies[key], c = new T.Color(), base = hex(spec.color), dark = hex(spec.dark);
    for (let i = 0; i < a.n; i++) { c.copy(base).multiplyScalar(a.tint[i]); a.bodies.setColorAt(i, c); }
    for (let i = 0; i < a.shieldN; i++) { c.copy(dark).multiplyScalar(0.8 + (i % 5) * 0.08); a.shields.setColorAt(i, c); }
    a.bodies.instanceColor.needsUpdate = true; a.shields.instanceColor.needsUpdate = true;
    drawFlagTex(key, spec.flag, spec.ink, spec.ch);
  }

  // ── fortress (foe side) & camp (ally side)
  const stoneM = toonMat({ color: 0x4d443c, rim: 0 }), woodM = toonMat({ color: 0x5c2c22, rim: 0 }), roofM = toonMat({ color: 0x26221f, rim: 0 }), darkM = toonMat({ color: 0x0c0a09, rim: 0 });
  function roofG(w, h, d, inset, ridgeK) {
    const g = new T.BoxGeometry(w, h, d), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) { p.setX(i, p.getX(i) * inset); p.setZ(i, p.getZ(i) * ridgeK); }
    return flat(g);
  }
  {
    const f = new T.Group(); f.position.z = -168; scene.add(f);
    mesh(boxG(420, 19, 10), stoneM, 0, 9.5, 0, f);
    const merG = boxG(2.4, 2.6, 1.4), mer = new T.InstancedMesh(merG, stoneM, 90), o = new T.Object3D();
    for (let i = 0; i < 90; i++) { o.position.set((i - 44.5) * 4.7, 20.2, 4.4); o.updateMatrix(); mer.setMatrixAt(i, o.matrix); }
    f.add(mer);
    mesh(boxG(50, 30, 18), stoneM, 0, 15, 4, f);
    mesh(boxG(13, 15, 2), darkM, 0, 7.5, 13.2, f);
    mesh(boxG(42, 8, 13), woodM, 0, 34, 4, f);
    mesh(roofG(58, 6, 24, 0.62, 0.3), roofM, 0, 41, 4, f);
    mesh(boxG(28, 6.5, 10), woodM, 0, 47, 4, f);
    mesh(roofG(42, 7, 18, 0.5, 0.18), roofM, 0, 53.5, 4, f);
    [-150, 150].forEach((x) => {
      mesh(boxG(24, 26, 15), stoneM, x, 13, 2, f);
      mesh(boxG(18, 6, 10), woodM, x, 29, 2, f);
      mesh(roofG(28, 6, 17, 0.5, 0.2), roofM, x, 35, 2, f);
    });
    addInk(f, INK_FAR);
  }
  {
    const cmp = new T.Group(); cmp.position.z = 150; scene.add(cmp);
    const tentM = toonMat({ color: 0xb9ab8c, rim: 0 }), r = mulberry(77);
    const tentG = flat(new T.ConeGeometry(1, 1, 6)); tentG.translate(0, 0.5, 0);
    const tents = new T.InstancedMesh(tentG, tentM, 26), o = new T.Object3D();
    for (let i = 0; i < 26; i++) {
      o.position.set((r() - 0.5) * 300, 0, 8 + r() * 70); const s = 5 + r() * 5; o.scale.set(s, s * (0.8 + r() * 0.5), s);
      o.rotation.y = r() * TAU; o.updateMatrix(); tents.setMatrixAt(i, o.matrix);
    }
    cmp.add(tents, inkInstanced(tents, INK_FAR));
    const palG = flat(new T.ConeGeometry(0.28, 4.4, 5)); palG.translate(0, 2.2, 0);
    const pal = new T.InstancedMesh(palG, toonMat({ color: 0x3a2c22, rim: 0 }), 150);
    for (let i = 0; i < 150; i++) { o.position.set((i - 74.5) * 2.2, 0, -8 + Math.sin(i * 0.7) * 0.4); o.scale.set(1, 0.85 + r() * 0.3, 1); o.rotation.set(0, r() * 3, 0); o.updateMatrix(); pal.setMatrixAt(i, o.matrix); }
    cmp.add(pal);
  }

  // ── drifting motes (dust / embers)
  const MOTES = 150, moteR = 16;
  const motes = new Particles(MOTES, false, 0.0);
  const motesAdd = new Particles(MOTES, true, 0.0);
  scene.add(motes.points, motesAdd.points);
  const moteV = new Float32Array(MOTES * 3);
  let moteSpec = { color: [1, 1, 1], add: false, a: 0.3, size: 0.05, rise: 0 };
  function seedMotes(cam) {
    const P = moteSpec.add ? motesAdd : motes, Q = moteSpec.add ? motes : motesAdd;
    Q.size.fill(0); Q.col.fill(0); Q.dirty = true; Q.geo.attributes.aSize.needsUpdate = true; Q.geo.attributes.aColor.needsUpdate = true;
    for (let i = 0; i < MOTES; i++) {
      P.pos[i * 3] = cam.x + rnd(-moteR, moteR); P.pos[i * 3 + 1] = rnd(0.2, 9); P.pos[i * 3 + 2] = cam.z + rnd(-moteR, moteR);
      moteV[i * 3] = rnd(-0.5, 0.5) + 0.6; moteV[i * 3 + 1] = moteSpec.rise * rnd(0.4, 1.4) + rnd(-0.1, 0.1); moteV[i * 3 + 2] = rnd(-0.5, 0.5);
      P.size[i] = moteSpec.size * rnd(0.5, 1.6);
      P.col[i * 4] = moteSpec.color[0]; P.col[i * 4 + 1] = moteSpec.color[1]; P.col[i * 4 + 2] = moteSpec.color[2];
      P.col[i * 4 + 3] = moteSpec.a * rnd(0.3, 1);
    }
    P.geo.attributes.aSize.needsUpdate = true; P.geo.attributes.aColor.needsUpdate = true;
  }
  function updateMotes(dt, cam) {
    const P = moteSpec.add ? motesAdd : motes, p = P.pos;
    for (let i = 0; i < MOTES; i++) {
      const k = i * 3;
      p[k] += moteV[k] * dt; p[k + 1] += moteV[k + 1] * dt; p[k + 2] += moteV[k + 2] * dt;
      if (p[k] - cam.x > moteR) p[k] -= moteR * 2; else if (p[k] - cam.x < -moteR) p[k] += moteR * 2;
      if (p[k + 2] - cam.z > moteR) p[k + 2] -= moteR * 2; else if (p[k + 2] - cam.z < -moteR) p[k + 2] += moteR * 2;
      if (p[k + 1] > 9.5) p[k + 1] = 0.2; else if (p[k + 1] < 0.1) p[k + 1] = 9.4;
    }
    P.geo.attributes.position.needsUpdate = true;
  }

  const dust = { r: 0.8, g: 0.7, b: 0.55 };
  let flashV = 0;
  function applyPalette(p) {
    skyU.uTop.value.set(p.top); skyU.uMid.value.set(p.mid); skyU.uHor.value.set(p.hor);
    skyU.uSun.value.set(p.sun); skyU.uSunCore.value.set(p.sunCore);
    skyU.uCloudDark.value.set(p.cloudDark); skyU.uCloudLit.value.set(p.cloudLit);
    skyU.uCloud.value = p.cloud; skyU.uSunSize.value = p.sunSize || 0.9972;
    sunDir.set(p.sunDir[0], p.sunDir[1], p.sunDir[2]).normalize(); skyU.uSunDir.value.copy(sunDir);
    scene.fog.color.set(p.fog); scene.fog.near = p.fogNear; scene.fog.far = p.fogFar;
    gMat.color.set(p.ground); propM.color.set(p.ground).multiplyScalar(0.8); rockM.color.set(p.ground).multiplyScalar(0.62);
    hemi.color.set(p.hemiSky); hemi.groundColor.set(p.hemiGround); hemi.intensity = p.hemiI;
    sun.color.set(p.sunLight); sun.intensity = p.sunI;
    fill.color.set(p.fill); fill.intensity = p.fillI;
    ridges.forEach((m, i) => tintRidge(m, mixHex(p.hor, p.ridge, [0.34, 0.55, 0.78][i]), mixHex(p.hor, p.ridge, [0.14, 0.26, 0.4][i]), mixHex(p.ridge, p.ink, [0.35, 0.55, 0.8][i])));
    const E = TOON.W, EV = TOON.V, ex = p.tExp || 1;
    E.sun.value.copy(sunDir); E.lit.value.set(p.tLit).multiplyScalar(ex); E.shade.value.set(p.tShade).multiplyScalar(ex); E.rim.value.set(p.tRim); E.ink.value.set(p.ink);
    EV.lit.value.copy(E.lit.value); EV.shade.value.copy(E.shade.value); EV.rim.value.copy(E.rim.value); EV.ink.value.copy(E.ink.value);
    stoneM.color.copy(mixHex(0x4d443c, p.fog, 0.15));
    const d = mixHex(p.ground, p.fog, 0.5); dust.r = d.r; dust.g = d.g; dust.b = d.b;
    moteSpec = p.mote;
  }
  function update(dt, t, cam, camFwd) {
    skyU.uTime.value = t;
    sky.position.copy(cam);
    flashV = Math.max(0, flashV - dt * 5); skyU.uFlash.value = flashV * flashV * 0.6;
    // light follows the duel so it stays stable
    sun.position.copy(cam).addScaledVector(sunDir, 60); sun.target.position.copy(cam);
    fill.position.copy(cam).addScaledVector(camFwd, -30); fill.position.y += 14; fill.target.position.copy(cam);
    for (let i = 0; i < flags.length; i++) {
      const f = flags[i], p = f.geo.attributes.position.array, b = f.base;
      for (let k = 0; k < p.length; k += 3) {
        const x = b[k], u = x / f.w;
        p[k + 2] = (Math.sin(x * 2.6 - t * 5.2 + f.ph) * 0.2 + Math.sin(x * 5.4 - t * 8.3 + f.ph * 2) * 0.06) * u * (f.w > 2 ? 1.8 : 1);
        p[k + 1] = b[k + 1] - u * u * 0.12;
      }
      f.geo.attributes.position.needsUpdate = true;
    }
    updateMotes(dt, cam);
  }
  return { scene, sunDir, hemi, sun, fill, applyPalette, setArmy, update, seedMotes, dust, skyFlash: (v) => { flashV = Math.max(flashV, v); } };
})();
