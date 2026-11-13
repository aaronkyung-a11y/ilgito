// ───────────────────────── models: weapons, horse, rider (v0.2 — lofted forms, painted textures) ─────────────────────────
// characters are lit mostly by a key light fixed to the camera, so faces and armour keep a readable light side
const KEY = 0.6;
function steelMat(c, env) { return toonMat({ color: c, flat: true, env, key: KEY, edge: -0.02, spec: 1, shin: 20, rim: 1, rimCut: 0.5 }); }
function goldMat(env) { return toonMat({ color: 0xdcae4a, env, key: KEY, edge: 0.12, hi: 0.18, spec: 0.9, shin: 18, specCol: 0xfff7d2, rim: 0.9 }); }
// a hanging tuft of hair (root at the origin, falls along -y); meant for the alpha-tested hair texture
function tuftG(len, r) { return loftG(ringsY([[0, r * 0.3, r * 0.3, 0, 0, 1, 0], [-len * 0.16, r * 0.8, r * 0.8, 0, 0, 1, 0.16], [-len * 0.55, r, r, 0, 0, 1, 0.55], [-len, r * 0.85, r * 0.85, 0, 0, 1, 1]]), 9, { cap: false, ur: 2 }); }
// a fist closed round a shaft that runs along local x through the origin. +y: from the wrist to the knuckles. right hand; left = mirrored in z
function fistG(left) {
  const M = new Merge(), R = 0.037;
  M.add(loftG(ringsY([[-0.09, 0.028, 0.02, -0.034], [-0.05, 0.04, 0.021, -0.04], [0.0, 0.049, 0.02, -0.044], [0.03, 0.048, 0.018, -0.041], [0.046, 0.04, 0.012, -0.034]], 3), 10));
  const ang = [-0.75, -0.2, 0.45, 1.1, 1.8, 2.5, 3.2, 3.75];
  for (let i = 0; i < 4; i++) {
    const x = -0.036 + i * 0.024, s = [0.86, 0.97, 1.0, 0.94][i], pts = [];
    for (let q = 0; q < 8; q++) { const a = ang[q] * (0.9 + 0.1 * s), k = q === 0 ? 1.15 : 1; pts.push([x, R * Math.cos(a) * k, R * Math.sin(a) * k]); }
    M.add(tubeG(pts, pts.map((_, q) => lerp(0.0128, 0.0098, q / 7) * (0.9 + 0.1 * s)), 6, { ref: [1, 0, 0] }));
  }
  M.add(tubeG([[0.044, -0.05, -0.03], [0.058, -0.03, -0.006], [0.06, -0.008, 0.02], [0.05, 0.012, 0.04], [0.036, 0.026, 0.05]], [0.0145, 0.0145, 0.0135, 0.0125, 0.0105], 6, { ref: [1, 0, 0] }));
  if (!left) return M.geo();
  return new Merge().add(M.geo(), new T.Matrix4().makeScale(1, 1, -1)).geo();
}
const FIST_R = fistG(false), FIST_L = fistG(true);

// steel painted in the blade's own coordinates (ExtrudeGeometry cap uv = x, y): a bright ground edge, a dark line inside it, grind marks
const BLADE_TEX = {};
function bladeTex(type, shapes) {
  if (BLADE_TEX[type]) return BLADE_TEX[type];
  const W = 256, H = 512, X0 = -0.34, XW = 0.68, Y0 = -0.02, YH = 0.82;
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  g.fillStyle = '#b8c0c8'; g.fillRect(0, 0, W, H);
  const px = (x) => ((x - X0) / XW) * W, py = (y) => H - ((y - Y0) / YH) * H;
  shapes.forEach((sp) => {
    const pts = sp.s.getPoints(14); let cx = 0, cy = 0; pts.forEach((p) => { cx += p.x; cy += p.y; }); cx /= pts.length; cy /= pts.length;
    const path = (k) => { g.beginPath(); pts.forEach((p, i) => { const x = px(cx + (p.x - cx) * k), y = py(cy + (p.y - cy) * k); if (i) g.lineTo(x, y); else g.moveTo(x, y); }); g.closePath(); };
    g.save(); path(1); g.clip();
    g.fillStyle = '#c4ccd4'; g.fillRect(0, 0, W, H);
    if (sp.b !== 0) {
      g.fillStyle = '#eef2f6';        // two diagonal glints across the flat
      for (let q = 0; q < 2; q++) { const y0 = py(cy) + (q ? 34 : -46), wd = q ? 9 : 26; g.beginPath(); g.moveTo(0, y0 + 60); g.lineTo(W, y0 - 60); g.lineTo(W, y0 - 60 + wd); g.lineTo(0, y0 + 60 + wd); g.closePath(); g.fill(); }
      g.lineJoin = 'round';
      path(1); g.strokeStyle = '#3c4654'; g.lineWidth = 16; g.stroke();
      path(1); g.strokeStyle = '#ffffff'; g.lineWidth = 11.5; g.stroke();
      path(0.46); g.strokeStyle = 'rgba(60,70,84,0.7)'; g.lineWidth = 1.8; g.stroke();
    }
    g.restore();
  });
  const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.ClampToEdgeWrapping; t.repeat.set(1 / XW, 1 / YH); t.offset.set(-X0 / XW, -Y0 / YH); t.anisotropy = 4;
  return (BLADE_TEX[type] = t);
}
function makeWeapon(type, o) {
  o = o || {};
  const g = new T.Group();
  const env = o.env || 'W';
  const shaftM = toonMat({ color: celC(o.shaft || 0x40281a, 0.75), env, key: KEY, spec: 0.35, shin: 14, specCol: 0xd8c8b0, rim: 0.5 });
  const steelM = steelMat(o.steel || 0xe6ecf1, env), goldM = goldMat(env);
  const redM = toonMat({ color: o.tassel || 0xd2351f, map: TEX.hairA, alphaTest: 0.5, side: T.DoubleSide, env, key: KEY, edge: -0.15, rim: 0.2 });
  const D = { glaive: { top: 1.1, butt: -0.72 }, spear: { top: 1.44, butt: -0.78 }, serpent: { top: 1.36, butt: -0.78 }, halberd: { top: 1.32, butt: -0.78 } }[type];
  const len = D.top - D.butt;
  mesh(new T.CylinderGeometry(0.0205, 0.0235, len, 10), shaftM, 0, (D.top + D.butt) / 2, 0, g);
  const G = new Merge(), S = new Merge();
  S.add(flat(new T.ConeGeometry(0.03, 0.14, 6)), M4(0, D.butt - 0.065, 0, PI, 0, 0));
  G.add(latheG([[0.0235, 0], [0.031, 0.006], [0.031, 0.034], [0.027, 0.04], [0.027, 0.07], [0.0235, 0.076]], 10), M4(0, D.butt - 0.005, 0));
  G.add(latheG([[0.021, -0.17], [0.028, -0.164], [0.028, -0.138], [0.0245, -0.132], [0.0245, -0.078], [0.033, -0.068], [0.036, -0.022], [0.047, -0.002], [0.047, 0.016], [0.03, 0.03], [0.001, 0.03]], 12), M4(0, D.top, 0));
  for (let i = 0; i < 3; i++) G.add(latheG([[0.022, 0], [0.0268, 0.004], [0.0268, 0.018], [0.022, 0.022]], 10), M4(0, lerp(D.butt + 0.3, D.top - 0.34, i / 2), 0));
  const shapes = []; let bladeLen = 0.5;
  if (type === 'glaive') {
    const s = new T.Shape();
    s.moveTo(-0.03, 0); s.lineTo(0.048, 0);
    s.quadraticCurveTo(0.225, 0.2, 0.165, 0.47);
    s.quadraticCurveTo(0.115, 0.64, -0.04, 0.75);
    s.quadraticCurveTo(0.02, 0.58, -0.035, 0.44);
    s.quadraticCurveTo(-0.07, 0.42, -0.135, 0.4); s.quadraticCurveTo(-0.075, 0.36, -0.042, 0.3); s.lineTo(-0.03, 0);
    shapes.push({ s }); bladeLen = 0.75;
    // a small ring guard under the blade, as on the Green Dragon blade
    G.add(new T.TorusGeometry(0.03, 0.008, 5, 12), M4(-0.058, D.top + 0.2, 0));
  } else if (type === 'spear') {
    const s = new T.Shape();
    s.moveTo(-0.018, 0); s.lineTo(-0.064, 0.11); s.lineTo(0, 0.48); s.lineTo(0.064, 0.11); s.lineTo(0.018, 0); s.lineTo(-0.018, 0);
    shapes.push({ s }); bladeLen = 0.48;
  } else if (type === 'serpent') {
    const L = [[0.02, 0], [0.072, 0.07], [0.03, 0.17], [0.077, 0.27], [0.03, 0.37], [0.066, 0.47], [0.025, 0.56], [0.046, 0.68], [0, 0.61]];
    const s = new T.Shape(); s.moveTo(-L[0][0], L[0][1]);
    for (let i = 1; i < L.length; i++) s.lineTo(-L[i][0], L[i][1]);
    for (let i = L.length - 2; i >= 0; i--) s.lineTo(L[i][0], L[i][1]);
    s.lineTo(-L[0][0], L[0][1]);
    shapes.push({ s, b: 0.01 }); bladeLen = 0.68;
  } else {
    const s = new T.Shape();
    s.moveTo(-0.018, 0); s.lineTo(-0.052, 0.14); s.lineTo(0, 0.54); s.lineTo(0.052, 0.14); s.lineTo(0.018, 0); s.lineTo(-0.018, 0);
    shapes.push({ s });
    [1, -1].forEach((k) => {
      const c = new T.Shape();
      c.moveTo(k * 0.078, 0.0); c.quadraticCurveTo(k * 0.3, 0.175, k * 0.078, 0.36); c.quadraticCurveTo(k * 0.17, 0.175, k * 0.078, 0.0);
      shapes.push({ s: c, b: 0.01 });
      [0.1, 0.225].forEach((y) => {
        const b = new T.Shape();
        b.moveTo(k * 0.012, y); b.lineTo(k * 0.128, y); b.lineTo(k * 0.128, y + 0.03); b.lineTo(k * 0.012, y + 0.03); b.lineTo(k * 0.012, y);
        shapes.push({ s: b, b: 0 });
      });
    });
    bladeLen = 0.54;
  }
  shapes.forEach((sp) => {
    const b = sp.b === undefined ? 0.014 : sp.b;
    const bg = new T.ExtrudeGeometry(sp.s, { depth: b > 0 ? 0.006 : 0.016, bevelEnabled: b > 0, bevelThickness: b * 0.62, bevelSize: b, bevelOffset: -b, bevelSegments: 1, curveSegments: 10 });
    bg.translate(0, 0, b > 0 ? -0.003 : -0.008);
    S.add(flat(bg), M4(0, D.top, 0));
  });
  const bt = bladeTex(type, shapes); bt.updateMatrix(); steelM.defines.T_MAP = ''; steelM.uniforms.map = { value: bt }; steelM.uniforms.uUvT = { value: bt.matrix };
  S.mesh(steelM, g); G.mesh(goldM, g);
  mesh(tuftG(type === 'spear' ? 0.27 : 0.22, type === 'spear' ? 0.085 : 0.062), redM, 0, D.top - 0.07, 0, g);
  return { g, type, tipY: D.top + bladeLen, baseY: D.top - 0.05, steelM };
}

// ── horse. body space: +z = head, +x = the horse's left, ground at y = 0
const HB_E = 2.3;
const HB = resampleRows([      // trunk sections: [z, topline, underline, half-width]
  [1.075, 1.3, 1.14, 0.04], [1.05, 1.39, 1.05, 0.115], [0.99, 1.49, 0.98, 0.2], [0.88, 1.6, 0.93, 0.262], [0.72, 1.68, 0.905, 0.3], [0.5, 1.72, 0.89, 0.322],
  [0.22, 1.69, 0.885, 0.338], [-0.1, 1.665, 0.9, 0.348], [-0.35, 1.685, 0.97, 0.338], [-0.58, 1.725, 1.02, 0.355], [-0.8, 1.69, 1.03, 0.33], [-0.95, 1.58, 1.08, 0.255], [-1.04, 1.45, 1.16, 0.14], [-1.07, 1.36, 1.23, 0.05],
], 27);
const NK = resampleRows([[-0.24, 0.2, 0.3, -0.02], [-0.05, 0.19, 0.3, 0.0], [0.15, 0.152, 0.262, 0.004], [0.38, 0.12, 0.212, -0.004], [0.6, 0.102, 0.172, -0.006], [0.78, 0.094, 0.148, 0.0], [0.9, 0.086, 0.122, 0.012], [0.97, 0.064, 0.082, 0.02]], 15);   // neck: [y, rx, rz, zc]
const HD_E = 2.5;
const HD = resampleRows([[-0.12, 0.07, 0.085, -0.01], [-0.04, 0.098, 0.125, 0.02], [0.06, 0.112, 0.15, 0.048], [0.17, 0.105, 0.135, 0.04], [0.3, 0.082, 0.105, 0.018], [0.42, 0.066, 0.088, 0.005], [0.52, 0.064, 0.082, 0.004], [0.6, 0.07, 0.08, 0.006], [0.655, 0.056, 0.06, 0.012]], 17);   // head: [y, rx, rz, zc]
const LEG = {
  fu: [[0.16, 0.085, 0.15, 0.0], [0.0, 0.092, 0.152, 0.0], [-0.12, 0.084, 0.126, 0.006], [-0.26, 0.067, 0.093, 0.006], [-0.4, 0.052, 0.068, 0.0], [-0.5, 0.047, 0.057, 0.0], [-0.56, 0.05, 0.06, 0.002]],
  fl: [[0.03, 0.05, 0.06, 0.002], [-0.03, 0.052, 0.062, 0.004], [-0.1, 0.038, 0.046, 0.0], [-0.3, 0.034, 0.042, 0.0], [-0.4, 0.042, 0.052, -0.004], [-0.445, 0.036, 0.042, 0.008]],
  hu: [[0.18, 0.1, 0.2, 0.02], [0.0, 0.108, 0.205, 0.02], [-0.14, 0.094, 0.165, 0.026], [-0.3, 0.067, 0.102, 0.01], [-0.44, 0.05, 0.07, -0.005], [-0.56, 0.05, 0.066, -0.012]],
  hl: [[0.04, 0.05, 0.068, -0.012], [-0.02, 0.05, 0.07, -0.016], [-0.1, 0.038, 0.05, -0.004], [-0.3, 0.035, 0.045, 0.0], [-0.4, 0.043, 0.054, -0.004], [-0.445, 0.037, 0.043, 0.008]],
  hoof: [[-0.487, 0.045, 0.05, 0.02], [-0.492, 0.047, 0.052, 0.021], [-0.59, 0.062, 0.07, 0.034]],
};
// a point on the trunk skin. th: 0 = the +x flank, PI/2 = the spine. off = lift off the skin
function hbPt(z, th, off, out) {
  const s = rowAt(HB, z), cy = (s[1] + s[2]) / 2, ry = (s[1] - s[2]) / 2 + off, hw = s[3] + off, pw = 2 / HB_E, c = Math.cos(th), sn = Math.sin(th);
  out[0] = Math.sign(c) * Math.pow(Math.abs(c), pw) * hw; out[1] = cy + Math.sign(sn) * Math.pow(Math.abs(sn), pw) * ry; out[2] = z; return out;
}
// half-width of the trunk at (z, y)
function hbX(z, y, off) {
  const s = rowAt(HB, z), cy = (s[1] + s[2]) / 2, ry = (s[1] - s[2]) / 2 + off, k = Math.abs((y - cy) / ry);
  return k >= 1 ? 0 : (s[3] + off) * Math.pow(1 - Math.pow(k, HB_E), 1 / HB_E);
}
// a band wrapped round the breast (or the quarters) from one flank to the other
function hbWrap(zSide, zEnd, yLo, yHi, off, n, m, o) {
  const dir = zEnd > zSide ? 1 : -1, c = 0.14;
  return surfG((u, v, out) => {
    const y = lerp(yLo, yHi, v), a = Math.abs(u - 0.5) * 2, z = a < c ? zEnd : lerp(zEnd, zSide, (a - c) / (1 - c));
    out[0] = (u < 0.5 ? -1 : 1) * hbX(z, y, off) * (a < c ? a / c : 1); out[1] = y; out[2] = z + dir * 0.034 * (a < c ? 1 : Math.max(0, 1 - (a - c) * 5));
  }, n, m, o);
}
// a point on a [y, rx, rz, zc] section at "angle" a from the -z side (crest / forehead)
function seP(s, a, e, off) {
  const pw = 2 / e, sn = Math.sin(a), c = Math.cos(a);
  return [(s[1] + off) * Math.sign(sn) * Math.pow(Math.abs(sn), pw), s[3] - (s[2] + off) * Math.sign(c) * Math.pow(Math.abs(c), pw)];
}
const REIN_G = segG(0.007, 0.007, 4);
function makeHorse(pal, o) {
  o = o || {};
  const mats = [], reg = (m) => { mats.push(m); return m; };
  const cc = celC(pal.coat, 0.68), pale = cc.r * 0.3 + cc.g * 0.59 + cc.b * 0.11 > 0.62;
  const rel = (c) => { const t = hex(c); return [Math.min(4, t.r / Math.max(0.03, cc.r)), Math.min(4, t.g / Math.max(0.03, cc.g)), Math.min(4, t.b / Math.max(0.03, cc.b))]; };
  const mix3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)], ONE = [1, 1, 1];
  const ptsC = pale ? rel(mixHex(cc, 0x8a8478, 0.3)) : rel(mixHex(cc, 0x16110f, 0.7));      // dark "points" on the lower legs
  const hoofC = rel(pale ? 0x5a544c : 0x241c18), muzC = rel(mixHex(cc, pale ? 0x9a8f88 : 0x16110f, 0.5));
  const env = o.env || 'W';
  const coat = reg(toonMat({ color: cc, vcol: true, env, key: KEY, edge: 0.04, hi: 0.12, hiEdge: 0.78, rim: 0.7 }));
  const hairM = reg(toonMat({ color: celC(pal.mane, 0.8), map: TEX.hairA, alphaTest: 0.5, side: T.DoubleSide, env, key: KEY, edge: -0.1, rim: 0.3 }));
  const clothM = reg(toonMat({ map: TEX.blanket(celC(pal.cloth, 0.72).getHex(), pal.trim || 0xd2a850), side: T.DoubleSide, env, key: KEY, rim: 0.25 }));
  const leather = reg(toonMat({ color: 0x8a5630, side: T.DoubleSide, env, key: KEY, rim: 0.3 }));
  const gold = reg(goldMat(env));
  const redM = reg(toonMat({ color: pal.tassel || 0xd2351f, map: TEX.hairA, alphaTest: 0.5, side: T.DoubleSide, env, key: KEY, edge: -0.15, rim: 0.2 }));
  const eyeM = reg(toonMat({ color: 0x100b08, env, key: KEY, spec: 1, shin: 40, rim: 0 }));
  const root = new T.Group();
  const rear = new T.Group(); rear.position.set(0, 0.55, -0.62); root.add(rear);
  const body = new T.Group(); body.position.set(0, -0.55, 0.62); rear.add(body);
  mesh(tintG(loftG(ringsZ(HB, HB_E), 18, { ur: 3, vr: 4 }), (x, y) => lerp(0.68, 1, smooth((y - 0.87) / 0.45))), coat, 0, 0, 0, body);
  // neck
  const neck = new T.Group(); neck.position.set(0, 1.46, 0.74); body.add(neck);
  mesh(tintG(loftG(ringsY(NK), 14, { ur: 2, vr: 2 }), (x, y, z) => lerp(0.8, 1, sat(0.6 - z * 1.6))), coat, 0, 0, 0, neck);
  const mane = [], mOff = pal.barding ? 0.03 : 0.012;
  for (let i = 0; i < 9; i++) {
    const y0 = 0.03 + i * 0.1, s = rowAt(NK, y0), cz = s[3] - s[2] - 0.004, off = mOff + (i % 2) * 0.007;
    mane.push(mesh(surfG((u, v, out) => {
      const a = v * 1.35, yy = (u - 0.5) * lerp(0.25, 0.13, v) - 0.07 * Math.pow(v, 1.5), q = rowAt(NK, y0 + yy);
      out[0] = -(q[1] + off) * Math.sin(a) * (1 + 0.1 * v); out[1] = yy; out[2] = q[3] - (q[2] + off) * Math.cos(a) - cz;
    }, 2, 5), hairM, 0, y0, cz, neck));
  }
  {   // a low ridge of hair along the whole crest, so the roots read as one mass
    const rg = surfG((u, v, out) => { const y = lerp(-0.02, 0.9, v), q = rowAt(NK, y), w = 2 * u - 1; out[0] = w * 0.034; out[1] = y; out[2] = q[3] - q[2] - 0.026 * (1 - w * w) + 0.004; }, 4, 12);
    const a = rg.attributes.uv; for (let i = 0; i < a.count; i++) a.setXY(i, a.getY(i) * 6, 0.06);
    mesh(rg, hairM, 0, 0, 0, neck);
  }
  // head
  const head = new T.Group(); head.position.set(0, 0.86, 0.03); neck.add(head);
  mesh(tintG(loftG(ringsY(HD, HD_E), 14, { ur: 2, vr: 2 }), (x, y) => mix3(ONE, muzC, smooth((y - 0.42) / 0.18))), coat, 0, 0, 0, head);
  const hx = (y, z) => { const s = rowAt(HD, y), k = Math.abs((z - s[3]) / s[2]); return k >= 1 ? 0 : s[1] * Math.pow(1 - Math.pow(k, HD_E), 1 / HD_E); };
  const DK = new Merge();
  [1, -1].forEach((k) => {
    DK.add(new T.SphereGeometry(0.025, 10, 8), M4(k * (hx(0.13, -0.035) - 0.009), 0.13, -0.035));
    DK.add(new T.SphereGeometry(0.017, 8, 6), M4(k * (hx(0.615, -0.045) - 0.007), 0.615, -0.045, 0, 0, 0, 0.8, 1.4, 0.7));
  });
  DK.mesh(eyeM, head);
  const earG = tintG(loftG(ringsY([[0, 0.032, 0.02], [0.05, 0.036, 0.018], [0.11, 0.024, 0.012], [0.165, 0.004, 0.003]]), 8), () => 0.86);
  const earL = mesh(earG, coat, 0.058, -0.045, -0.088, head), earR = mesh(earG, coat, -0.058, -0.045, -0.088, head);
  earL.userData.dyn = earR.userData.dyn = true;
  earL.rotation.x = earR.rotation.x = rad(-100);
  mesh(surfG((u, v, out) => { const y = lerp(-0.09, 0.2, v), p = seP(rowAt(HD, y), (u - 0.5) * 1.5, HD_E, 0.013); out[0] = p[0]; out[1] = y; out[2] = p[1]; }, 3, 4), hairM, 0, 0, 0, head);   // forelock
  // bridle
  const BL = new Merge(), BG = new Merge();
  const band = (y0, y1, off) => loftG(ringsY([y0, y1].map((y) => { const s = rowAt(HD, y); return [y, s[1] + off, s[2] + off, s[3]]; }), HD_E), 14, { cap: false });
  BL.add(band(0.385, 0.425, 0.007)); BL.add(band(-0.015, 0.022, 0.007));
  const bs = rowAt(HD, 0.52), bx = bs[1] + 0.012, bz = bs[3] + 0.03;
  [1, -1].forEach((k) => {
    BL.add(surfG((u, v, out) => { const y = lerp(0.0, 0.5, v), s = rowAt(HD, y); out[0] = k * (s[1] + 0.008); out[1] = y; out[2] = s[3] + (u - 0.5) * 0.026; }, 1, 6));
    BG.add(new T.TorusGeometry(0.03, 0.007, 6, 12), M4(k * bx, 0.52, bz, 0, PI / 2, 0));
  });
  BL.add(surfG((u, v, out) => { const y = 0.075 + (v - 0.5) * 0.026, p = seP(rowAt(HD, y), (u - 0.5) * 2.9, HD_E, 0.008); out[0] = p[0]; out[1] = y; out[2] = p[1]; }, 10, 1));
  const bits = [V3(bx, 0.52, bz), V3(-bx, 0.52, bz)];
  BG.add(surfG((u, v, out) => { const y = lerp(0.0, 0.19, v), p = seP(rowAt(HD, y), (u - 0.5) * 0.62 * Math.pow(Math.sin(PI * (0.08 + v * 0.84)), 0.8), HD_E, 0.013); out[0] = p[0]; out[1] = y; out[2] = p[1]; }, 4, 6, { flip: true }));   // frontlet (當盧)
  [0.0, 0.405].forEach((y) => [1, -1].forEach((k) => { const q = rowAt(HD, y); BG.add(new T.SphereGeometry(0.016, 6, 5), M4(k * (q[1] + 0.008), y, q[3], 0, 0, 0, 0.6, 1, 1)); }));
  // tack on the trunk
  const TL = new Merge(), TG = new Merge(), TC = new Merge(), TR = new Merge(), tmp = [0, 0, 0];
  TC.add(surfG((u, v, out) => hbPt(lerp(0.36, -0.46, v), PI / 2 + (0.5 - u) * 3.9, 0.014, out), 14, 6));                         // saddle cloth
  TL.add(surfG((u, v, out) => hbPt(lerp(0.22, -0.32, v), PI / 2 + (0.5 - u) * 2.1, 0.03, out), 8, 4, { ur: 2, vr: 2 }));           // saddle flaps
  TL.add(new T.SphereGeometry(1, 12, 8), M4(0, rowAt(HB, -0.05)[1] + 0.035, -0.05, 0, 0, 0, 0.17, 0.05, 0.27));                   // seat
  TL.add(new T.TorusGeometry(0.14, 0.036, 8, 12, PI), M4(0, rowAt(HB, 0.2)[1] - 0.085, 0.2));                                     // pommel
  TL.add(new T.TorusGeometry(0.185, 0.04, 8, 12, PI), M4(0, rowAt(HB, -0.3)[1] - 0.08, -0.3, -0.25, 0, 0));                       // cantle
  TL.add(loftG(ringsZ([0.26, 0.19].map((z) => { const s = rowAt(HB, z); return [z, s[1] + 0.01, s[2] - 0.01, s[3] + 0.01]; }), HB_E), 18, { cap: false }));   // girth
  TL.add(hbWrap(0.3, 1.05, 1.235, 1.3, 0.016, 22, 1));                                                                              // breast collar
  TL.add(hbWrap(-0.36, -1.04, 1.33, 1.39, 0.016, 22, 1));                                                                           // breeching
  TL.add(surfG((u, v, out) => { const z = lerp(-0.36, -1.0, v); out[0] = (u - 0.5) * 0.05; out[1] = rowAt(HB, z)[1] + 0.014; out[2] = z; }, 1, 6));   // crupper
  for (let i = 0; i < 9; i++) { const a = (i - 4) / 4, z = Math.abs(a) < 0.2 ? 1.05 : lerp(1.05, 0.34, (Math.abs(a) - 0.2) / 0.8); TG.add(new T.SphereGeometry(0.013, 6, 5), M4(Math.sign(a) * hbX(z, 1.268, 0.02) * (Math.abs(a) < 0.2 ? Math.abs(a) / 0.2 : 1), 1.268, z + (Math.abs(a) < 0.2 ? 0.036 : 0))); }
  const tuft = tuftG(0.2, 0.045);
  [-0.15, 0, 0.15].forEach((x) => { const z = 1.094 - Math.abs(x) * 0.3; TR.add(tuft, M4(x, 1.24, z)); TG.add(new T.SphereGeometry(0.024, 8, 6), M4(x, 1.25, z)); });
  [1, -1].forEach((k) => {
    const hxp = k * (hbX(-0.6, 1.36, 0.024));
    TG.add(new T.SphereGeometry(0.038, 8, 6), M4(hxp, 1.36, -0.6, 0, 0, 0, 0.5, 1, 1)); TR.add(tuft, M4(hxp + k * 0.012, 1.34, -0.6));
    const sx = k * 0.45, sy = 0.925, sz = 0.227;       // stirrups, where the rider's feet come to rest
    TG.add(new T.TorusGeometry(0.07, 0.011, 6, 14), M4(sx, sy, sz, 0, k * 0.25, 0));
    TG.add(boxG(0.13, 0.014, 0.06), M4(sx, sy - 0.066, sz, 0, k * 0.25, 0));
    TL.add(new T.BoxGeometry(0.03, 1, 0.008).translate(0, 0.5, 0), segM4(V3(sx, sy + 0.07, sz), V3(k * hbX(0.08, 1.56, 0.03), 1.56, 0.08)));
    if (pal.caparison) TC.add(surfG((u, v, out) => {
      const z = lerp(0.82, -0.96, u);
      if (v < 0.55) hbPt(z, lerp(1.2, -0.1, v / 0.55), 0.022, out);
      else { hbPt(z, -0.1, 0.022, out); out[1] = lerp(out[1], 0.76, (v - 0.55) / 0.45); out[0] *= 1.03; }
      out[0] *= k;
    }, 12, 7));
  });
  if (pal.barding) {
    const met = reg(toonMat({ color: celC(pal.bardMetal || 0x55504a, 0.6), map: TEX.lamellar, side: T.DoubleSide, env, key: KEY, spec: 0.3, shin: 16, rim: 0.7 }));
    const plate = reg(toonMat({ color: celC(pal.bardMetal || 0x55504a, 0.66), side: T.DoubleSide, env, key: KEY, spec: 0.8, shin: 22, rim: 0.9 }));
    mesh(surfG((u, v, out) => { const y = lerp(-0.05, 0.5, v), p = seP(rowAt(HD, y), (u - 0.5) * 1.9 * lerp(1, 0.8, v), HD_E, 0.014); out[0] = p[0]; out[1] = y; out[2] = p[1]; }, 8, 6), plate, 0, 0, 0, head);   // chanfron
    const f = rowAt(HD, 0.06); BG.add(new T.SphereGeometry(0.03, 8, 6), M4(0, 0.06, f[3] - f[2] - 0.016, 0, 0, 0, 1, 1, 0.5));
    mesh(loftG(ringsY(NK.filter((r) => r[0] > -0.06 && r[0] < 0.8).map((r) => [r[0], r[1] + 0.018, r[2] + 0.018, r[3]])), 14, { cap: false, ur: 3, vr: 2.4 }), met, 0, 0, 0, neck);   // crinet
    mesh(hbWrap(0.42, 1.05, 1.085, 1.37, 0.022, 20, 4, { ur: 4, vr: 1 }), met, 0, 0, 0, body);                                          // peytral
    TG.add(hbWrap(0.42, 1.05, 1.055, 1.09, 0.027, 20, 1));
  }
  BL.mesh(leather, head); BG.mesh(gold, head);
  TL.mesh(leather, body); TG.mesh(gold, body); TC.mesh(clothM, body); TR.mesh(redM, body);
  const tt = mesh(tuftG(0.2, 0.05), redM, 0, 0.64, rowAt(NK, 0.64)[3] + rowAt(NK, 0.64)[2] + 0.012, neck); tt.rotation.x = rad(-40);
  // legs
  const legs = [], legCol = (y) => mix3(ONE, ptsC, smooth((-y - 0.18) / 0.34));
  function leg(x, y, z, front) {
    const hip = new T.Group(); hip.position.set(x, y, z); body.add(hip);
    mesh(loftG(ringsY(resampleRows(front ? LEG.fu : LEG.hu, 11).map((r) => [r[0], r[1], r[2], r[3], 0, legCol(r[0])])), 10, { colors: true, ur: 2, vr: 2 }), coat, 0, 0, 0, hip);
    const knee = new T.Group(); knee.position.y = -0.55; hip.add(knee);
    const rows = resampleRows(front ? LEG.fl : LEG.hl, 9).map((r) => [r[0], r[1], r[2], r[3], 0, ptsC]).concat(LEG.hoof.map((r, i) => [r[0], r[1], r[2], r[3], 0, i === 0 ? ptsC : hoofC]));
    mesh(loftG(ringsY(rows), 10, { colors: true, ur: 2, vr: 2 }), coat, 0, 0, 0, knee);
    legs.push({ hip, knee, front, x, z });
  }
  leg(0.2, 1.1, 0.56, true); leg(-0.2, 1.1, 0.56, true); leg(0.22, 1.1, -0.62, false); leg(-0.22, 1.1, -0.62, false);
  // tail
  const tail = new T.Group(); tail.position.set(0, 1.44, -1.0); body.add(tail);
  mesh(loftG(ringsY([[0.06, 0.045, 0.045, 0, 0, 1, 0], [-0.06, 0.062, 0.058, 0, 0, 1, 0.07], [-0.26, 0.085, 0.072, 0, 0, 1, 0.22], [-0.5, 0.098, 0.078, 0, 0, 1, 0.4]]), 10, { ur: 3, cap: false }), hairM, 0, 0, 0, tail);
  const tail2 = new T.Group(); tail2.position.y = -0.48; tail.add(tail2);
  mesh(loftG(ringsY([[0.03, 0.097, 0.078, 0, 0, 1, 0.38], [-0.2, 0.105, 0.08, 0, 0, 1, 0.58], [-0.42, 0.095, 0.07, 0, 0, 1, 0.8], [-0.64, 0.075, 0.05, 0, 0, 1, 1]]), 10, { ur: 3, cap: false }), hairM, 0, 0, 0, tail2);
  let reins = null;
  if (o.reins) { reins = []; for (let i = 0; i < 4; i++) { const rn = mesh(REIN_G, leather, 0, 0, 0, body); rn.userData.noInk = true; reins.push(rn); } }
  if (o.shadow) {
    const sh = mesh(new T.PlaneGeometry(2.0, 3.8), new T.MeshBasicMaterial({ map: TEX.shadow, transparent: true, depthWrite: false, color: 0x000000 }), 0, 0.035, -0.05, root);
    sh.rotation.x = -PI / 2; sh.renderOrder = -1;
  }
  return { root, rear, body, neck, head, legs, tail, tail2, mane, earL, earR, mats, bits, reins, reinTo: V3(0, rowAt(HB, 0.2)[1] + 0.1, 0.2), seed: rnd(100), saddleY: 1.74 };
}
const _hr = V3(), _hm = V3();
function rotX(v, a) { const c = Math.cos(a), s = Math.sin(a), y = v.y * c - v.z * s, z = v.y * s + v.z * c; v.y = y; v.z = z; return v; }
// s: { phase (stride cycles), gait 0..1, rear 0..1, idle 0..1 (restlessness), toss }
function animHorse(h, t, s) {
  const g = s.gait, ph = s.phase * TAU, ra = s.rear || 0, idle = s.idle === undefined ? 1 : s.idle;
  h.rear.rotation.x = -ra * 0.44 + g * 0.05 * Math.sin(ph + 0.9);
  h.rear.position.y = 0.55 + g * 0.09 * Math.sin(ph - 0.6) + (1 - g) * 0.012 * Math.sin(t * 2.1 + h.seed);
  const offs = [0.5, 0.6, 0.0, 0.1];
  const it = t * 1.25 + h.seed;
  for (let i = 0; i < 4; i++) {
    const L = h.legs[i], p = ph + offs[i] * TAU;
    const swingG = (L.front ? 0.95 : 0.8) * Math.sin(p);
    const bendG = (L.front ? 1.3 : 1.0) * Math.max(0, Math.sin(p + 1.9));
    const lift = Math.pow(Math.max(0, Math.sin(it + i * 1.9)), 8) * idle;
    const swingI = -0.3 * lift + 0.04 * Math.sin(it * 0.7 + i);
    const bendI = 1.0 * lift;
    let hip = lerp(swingI, swingG, g), knee = lerp(bendI, bendG, g);
    if (L.front) { hip = lerp(hip, -1.0 + 0.25 * Math.sin(t * 10 + i * 2.2), ra); knee = lerp(knee, 1.75, ra); }
    else { hip += ra * 0.44; hip = lerp(hip, hip + 0.12, 1 - g); }
    L.hip.rotation.x = hip;
    L.knee.rotation.x = L.front ? knee : -knee * 0.75 - (1 - g) * 0.16;
  }
  h.neck.rotation.x = rad(40) + g * (0.3 + 0.13 * Math.sin(ph + 2.4)) + (1 - g) * 0.045 * Math.sin(t * 1.3 + h.seed) - ra * 0.3 - (s.toss || 0) * 0.35 + (s.low || 0) * 0.42;
  h.head.rotation.x = rad(88) - g * 0.22 + 0.05 * Math.sin(t * 1.7 + h.seed * 2) + (s.toss || 0) * 0.3 - ra * 0.2 - (s.low || 0) * 0.2;
  h.tail.rotation.x = 0.3 + g * 1.0 + ra * 0.3 + 0.1 * Math.sin(t * 3 + h.seed);
  h.tail.rotation.z = 0.2 * Math.sin(t * 2.2 + h.seed) * (1 - g * 0.6);
  h.tail2.rotation.x = 0.15 + g * 0.25 + 0.15 * Math.sin(t * 4.1 + h.seed);
  for (let i = 0; i < h.mane.length; i++) h.mane[i].rotation.x = g * (0.34 + 0.16 * Math.sin(t * 13 + i * 1.1)) + 0.05 * Math.sin(t * 2 + i);
  const tw = Math.pow(Math.max(0, Math.sin(t * 0.9 + h.seed * 3)), 20);
  h.earL.rotation.z = -0.15 - tw * 0.5; h.earR.rotation.z = 0.15 + tw * 0.4;
  if (h.reins) for (let i = 0; i < 2; i++) {     // slack reins from the bit to the saddle bow
    _hr.copy(h.bits[i]); rotX(_hr, h.head.rotation.x).add(h.head.position); rotX(_hr, h.neck.rotation.x).add(h.neck.position);
    _hm.addVectors(_hr, h.reinTo).multiplyScalar(0.5); _hm.y -= 0.1; _hm.x += i ? -0.07 : 0.07;
    aimSeg(h.reins[i * 2], _hr, _hm); aimSeg(h.reins[i * 2 + 1], _hm, h.reinTo);
  }
}

// ── rider
// half-widths of the shaped head at height y: [side, front, chin shift]
// the lower face, shared by the head mesh and whatever wraps it (beards). d runs from 0 at the cheekbones to 1 under the chin.
// faceW: the width — nearly straight down to the angle of the jaw, in sharply to a square chin, then closed off underneath.
// faceZ: the profile — the chin stays forward under the mouth instead of rolling away like a ball.
function faceW(d) { return d < 0.55 ? 1 - 0.18 * d : d < 0.92 ? lerp(0.901, 0.4, (d - 0.55) / 0.37) : 0.4 * Math.sqrt(Math.max(0, 1 - Math.pow((d - 0.92) / 0.08, 2))); }
function faceZ(d) { const q = Math.min(d, 0.92), z = 1 - 0.05 * q - 0.22 * q * q * q; return d < 0.92 ? z : z * Math.sqrt(Math.max(0, 1 - Math.pow((d - 0.92) / 0.08, 2))); }
const HEAD_X = 0.0975, HEAD_Z = 0.1225;
function headR(y) {
  const t = clamp(y / 0.1425, -1, 1), s = Math.sqrt(1 - t * t);
  return t >= 0 ? [HEAD_X * s, HEAD_Z * s, 0] : [HEAD_X * faceW(-t), HEAD_Z * faceZ(-t), 0];
}
function headG() {
  const WS = 44, HS = 30, g = new T.SphereGeometry(0.125, WS, HS), p = g.attributes.position, uv = g.attributes.uv;
  const A0 = 1.047, C = 0.74, K = (PI - A0 * C) / (PI - A0), E = 2 / 2.25;
  for (let i = 0; i < p.count; i++) {
    // crowd the columns toward the face (and the back of the head) so the nose has something to be made of
    const ph0 = uv.getX(i) * TAU, ph = ph0 + 0.2 * Math.sin(2 * ph0), th = (1 - uv.getY(i)) * PI, st = Math.sin(th);
    // texture: the face is painted within ±44° of the front; spread it over ±60° of the head so the features fill the face instead of floating in it
    const dl = ph - PI / 2, al = Math.abs(dl);
    uv.setX(i, 0.25 + (Math.sign(dl) * (al < A0 ? al * C : A0 * C + (al - A0) * K)) / TAU);
    const cs = Math.cos(ph), sn = Math.sin(ph), y = 0.1425 * Math.cos(th), d = y < 0 ? -y / 0.1425 : 0;
    // the front half is a squarer section than an ellipse: flat cheeks, cheekbones at the corners
    let x = -HEAD_X * (sn > 0 ? Math.sign(cs) * Math.pow(Math.abs(cs), E) : cs) * (d ? faceW(d) : st);
    let z = sn > 0 ? Math.pow(sn, E) * HEAD_Z * (d ? faceZ(d) : st) : sn * 0.13 * st;
    if (z > 0) {
      const front = sat(z / 0.04), ax = Math.abs(x);
      z += 0.006 * Math.exp(-Math.pow((y - 0.052) / 0.016, 2)) * sat(1 - ax / 0.08) * front;                               // brow ridge
      z -= 0.007 * Math.exp(-Math.pow((y - 0.028) / 0.014, 2)) * Math.exp(-Math.pow((ax - 0.043) / 0.022, 2)) * front;      // eye sockets
      z += 0.004 * Math.exp(-Math.pow((y + 0.07) / 0.02, 2)) * Math.exp(-Math.pow(x / 0.03, 2)) * front;                    // the mouth sits forward a little
      const nn = sat((0.04 - y) / 0.075), h = y >= -0.035 ? 0.004 + 0.03 * Math.pow(nn, 1.3) : 0.034 * (1 - sat((-0.035 - y) / 0.012));
      z += h * Math.exp(-Math.pow(x / (0.009 + 0.007 * nn), 2)) * front;                                                    // nose: a wedge from between the brows to its tip
    }
    p.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  const nr = g.attributes.normal;
  for (let r = 0; r <= HS; r++) {
    const a = r * (WS + 1), b = a + WS, x = nr.getX(a) + nr.getX(b), y = nr.getY(a) + nr.getY(b), z = nr.getZ(a) + nr.getZ(b), l = Math.hypot(x, y, z) || 1;
    nr.setXYZ(a, x / l, y / l, z / l); nr.setXYZ(b, x / l, y / l, z / l);
  }
  return g;
}
function beardG(long) {
  return surfG((u, v, out) => {
    const ph = (u - 0.5) * 2.6, a = Math.abs(ph) / 1.3;
    const yT = -0.09 + 0.066 * Math.pow(a, 1.5), yB = long ? -0.42 + 0.3 * a * a : -0.2 + 0.11 * a * a;
    const y = lerp(yT, yB, v), h = headR(Math.max(y, -0.128)), k = lerp(1, long ? 0.25 : 0.4, v * v);
    out[0] = Math.sin(ph) * (h[0] + 0.013) * k; out[1] = y; out[2] = Math.cos(ph) * (h[1] + 0.013) * k + h[2] * sat(Math.cos(ph) / 0.4) + (long ? 0.03 * v : 0);
  }, 12, 5, { ur: 4, vr: 1 });
}
// arm pieces authored at their true length: +y runs shoulder → elbow → wrist. M: { sleeve, armor?, armor2?, bracer, gold, skin }
function makeArm(right, L1, L2, M) {
  const up = new T.Group(), lo = new T.Group(), hand = new T.Group();
  mesh(limbG(L1, [[-0.14, 0.078], [0.12, 0.09], [0.55, 0.082], [0.9, 0.072], [1.08, 0.068]], 10, { ur: 2, vr: 2 }), M.sleeve, 0, 0, 0, up);
  if (M.armor) mesh(loftG(ringsY([[-0.03, 0.098], [0.075, 0.118], [0.079, 0.1], [0.15, 0.115], [0.154, 0.097], [0.218, 0.108], [0.224, 0.086]]), 12, { cap: false, ur: 2, vr: 1.3 }), M.armor, 0, 0, 0, up);
  mesh(limbG(L2, [[-0.08, 0.07], [0.18, 0.076], [0.4, 0.068], [0.46, 0.06]], 10, { ur: 2, vr: 1 }), M.sleeve, 0, 0, 0, lo);
  mesh(limbG(L2, [[0.32, 0.064], [0.44, 0.067], [0.72, 0.056], [0.8, 0.05]], 10, { ur: 2, vr: 1.4 }), M.bracer, 0, 0, 0, lo);
  const g = new Merge(), bandG = (y, r, h, t) => loftG(ringsY([[y, r], [y + 0.004, r + t], [y + h - 0.004, r + t], [y + h, r]]), 10, { cap: false });
  g.add(bandG(L2 * 0.3, 0.064, 0.024, 0.016)); g.add(bandG(L2 * 0.76, 0.05, 0.02, 0.01));
  g.mesh(M.gold, lo);
  if (M.armor2) mesh(new T.SphereGeometry(0.074, 10, 8), M.armor2, 0, 0, 0, lo);
  mesh(right ? FIST_R : FIST_L, M.skin, 0, 0, 0, hand);
  return { up, lo, hand };
}
// rider look: { armor, armor2, cloth, sash, skin, hair, cape, plume, helm:'plume'|'horn'|'crown', beard:0|1|2, patch, scale }
function makeRider(look) {
  const mats = [], reg = (m) => { mats.push(m); return m; };
  const armor = reg(toonMat({ color: celC(look.armor, 0.6), map: TEX.lamellar, side: T.DoubleSide, key: KEY, edge: 0.08, spec: 0.35, shin: 14, rim: 0.75 }));
  const armor2 = reg(toonMat({ color: celC(look.armor2 || 0x2a2622, 0.72), key: KEY, edge: 0.1, spec: 0.85, shin: 22, specCol: 0xe8eef6, rim: 0.9 }));
  const cloth = reg(toonMat({ color: celC(look.cloth, 0.68), key: KEY, rim: 0.4 }));
  const sash = reg(toonMat({ color: celC(look.sash || 0xc8321e, 0.82), side: T.DoubleSide, key: KEY, rim: 0.4 }));
  const skin = reg(toonMat({ color: look.skin || 0xdcab82, key: KEY, edge: 0.0, rim: 0.45, rimCut: 0.66 }));
  const faceM = reg(toonMat({ map: FACE.tex(look), key: KEY, edge: 0.0, rim: 0.45, rimCut: 0.66 }));
  const gold = reg(goldMat());
  const boot = reg(toonMat({ color: 0x3a2a22, key: KEY, spec: 0.3, shin: 14, specCol: 0xb8a898, rim: 0.4 }));
  const hairM = reg(toonMat({ color: look.hair || 0x1c1614, map: TEX.hair, side: T.DoubleSide, key: KEY, rim: 0.3 }));
  const capeM = reg(toonMat({ map: TEX.cape(celC(look.cape, 0.7).getHex(), look.capeTrim || 0xd2a850), side: T.DoubleSide, key: KEY, edge: 0.0, rim: 0.2 }));
  const capeP = reg(toonMat({ color: celC(look.cape, 0.7), key: KEY, rim: 0.3 }));
  const crown = look.helm === 'crown';
  const plumeM = reg(toonMat({ color: crown ? 0xffffff : look.plume || 0xc8321e, map: crown ? TEX.feather : TEX.hairA, alphaTest: crown ? 0 : 0.5, side: T.DoubleSide, key: KEY, edge: -0.15, rim: 0.25 }));
  // seat: pelvis, legs, skirts (fixed to the saddle)
  const seat = new T.Group();
  const C = new Merge(), A = new Merge(), G = new Merge(), B = new Merge(), A2 = new Merge(), SS = new Merge();
  C.add(loftG(ringsY([[-0.1, 0.15, 0.12], [-0.02, 0.19, 0.15], [0.08, 0.195, 0.148], [0.17, 0.178, 0.134]], 2.5), 18, { ur: 3 }));
  [1, -1].forEach((k) => {
    const H = V3(k * 0.13, 0.03, 0.02), K = V3(k * 0.36, -0.2, 0.3), An = V3(k * 0.385, -0.72, 0.17);
    C.add(limbG(1, [[-0.1, 0.115], [0.3, 0.125, 0.118], [0.78, 0.1], [1.05, 0.09]], 10, { ur: 2, vr: 2 }), segM4(H, K));
    B.add(limbG(1, [[-0.06, 0.092], [0.14, 0.095, 0.104], [0.6, 0.072, 0.08], [0.98, 0.058, 0.066]], 10, { ur: 2, vr: 2 }), segM4(K, An));
    A2.add(new T.SphereGeometry(0.074, 10, 8), M4(K.x + k * 0.012, K.y - 0.03, K.z + 0.05, 0, 0, 0, 0.9, 1, 0.8));
    B.add(loftG(ringsZ([[-0.09, 0.025, -0.05, 0.032], [-0.04, 0.045, -0.062, 0.046], [0.06, 0.03, -0.064, 0.052], [0.15, 0.004, -0.06, 0.045], [0.22, 0.004, -0.03, 0.022]]), 10, { ur: 2 }), M4(An.x, An.y, An.z, 0, k * 0.25, 0));
    const tm = M4(k * 0.2, 0.03, 0.05, rad(-56), 0, rad(k * 20));
    A.add(surfG((u, v, out) => { out[0] = (u - 0.5) * 0.3 * (1 + 0.14 * v); out[1] = -v * 0.38; out[2] = 0.05 * (1 - Math.pow(2 * u - 1, 2)); }, 4, 4, { ur: 0.9, vr: 2.0 }), tm);
    G.add(surfG((u, v, out) => { out[0] = (u - 0.5) * 0.3 * 1.14; out[1] = -0.38 - v * 0.032; out[2] = 0.05 * (1 - Math.pow(2 * u - 1, 2)) + 0.004; }, 4, 1, { flip: true }), tm);
  });
  SS.add(surfG((u, v, out) => { out[0] = (u - 0.5) * 0.17 * (1 + 0.2 * v); out[1] = -v * 0.34; out[2] = 0.02 * Math.sin(v * PI); }, 2, 4, { ur: 1, vr: 2 }), M4(0, 0.07, 0.15, rad(-38), 0, 0));
  A.add(surfG((u, v, out) => { out[0] = (u - 0.5) * 0.42 * (1 + 0.1 * v); out[1] = -v * 0.36; out[2] = 0.04 * (1 - Math.pow(2 * u - 1, 2)); }, 4, 3, { ur: 1.3, vr: 1.9 }), M4(0, 0.08, -0.13, rad(26), PI, 0));
  C.mesh(cloth, seat); B.mesh(boot, seat); A.mesh(armor, seat); G.mesh(gold, seat); A2.mesh(armor2, seat); SS.mesh(sash, seat);
  // torso (turns at the waist)
  const waist = new T.Group(); waist.position.y = 0.1; waist.rotation.order = 'YXZ'; seat.add(waist);
  if (look.bulk) waist.scale.x = look.bulk;
  const wA = new Merge(), wG = new Merge(), wS = new Merge(), wK = new Merge(), wA2 = new Merge(), wP = new Merge();
  wS.add(loftG(ringsY([[-0.04, 0.2, 0.152], [0.06, 0.198, 0.151], [0.17, 0.204, 0.154]], 2.5), 18, { ur: 3, cap: false }));
  wS.add(new T.SphereGeometry(0.035, 8, 6), M4(0.03, 0.1, 0.16, 0, 0, 0, 1.2, 0.9, 0.7));
  [0.02, 0.07].forEach((x, i) => wS.add(surfG((u, v, out) => { out[0] = (u - 0.5) * 0.05; out[1] = -v * (0.2 + i * 0.05); out[2] = 0.012 * Math.sin(v * 5); }, 1, 4), M4(x, 0.09, 0.165, rad(-22), 0, rad(i ? -8 : 6))));
  wG.add(loftG(ringsY([[0.142, 0.206, 0.156], [0.147, 0.219, 0.169], [0.19, 0.22, 0.17], [0.195, 0.208, 0.158]], 2.5), 18, { cap: false }));
  wG.add(new T.SphereGeometry(0.036, 10, 6), M4(0, 0.169, 0.168, 0, 0, 0, 1.3, 1, 0.5));
  wA.add(loftG(ringsY([[0.165, 0.207, 0.157], [0.26, 0.236, 0.172], [0.36, 0.272, 0.187], [0.45, 0.29, 0.182], [0.515, 0.268, 0.165], [0.56, 0.18, 0.125], [0.592, 0.095, 0.085]], 2.5), 18, { ur: 4, vr: 2.2 }));
  wG.add(new T.SphereGeometry(0.1, 14, 5, 0, TAU, 0, 0.62), M4(0, 0.385, 0.105, PI / 2, 0, 0));       // mirror plate
  wG.add(new T.TorusGeometry(0.059, 0.008, 6, 16), M4(0, 0.385, 0.188));
  wG.add(new T.SphereGeometry(0.02, 8, 6), M4(0, 0.385, 0.207));
  wK.add(loftG(ringsY([[0.54, 0.07, 0.066], [0.68, 0.062, 0.06]]), 10, { cap: false }));
  wS.add(new T.TorusGeometry(0.083, 0.032, 6, 14), M4(0, 0.592, 0.004, PI / 2, 0, 0, 1.08, 1, 1));
  [1, -1].forEach((k) => {
    const m = M4(k * 0.315, 0.465, 0, 0, 0, -k * 0.38, 1.18, 0.74, 1.18);
    wA2.add(new T.SphereGeometry(0.135, 12, 6, 0, TAU, 0, PI / 2), m);
    wG.add(new T.TorusGeometry(0.135, 0.011, 5, 16), m.clone().multiply(M4(0, 0, 0, PI / 2, 0, 0)));
    wG.add(new T.SphereGeometry(0.032, 8, 6), m.clone().multiply(M4(0, 0.118, 0.06)));
    wG.add(new T.SphereGeometry(0.028, 8, 6), M4(k * 0.17, 0.52, 0.125));
  });
  wP.add(new T.TorusGeometry(0.2, 0.04, 6, 14, PI), M4(0, 0.535, -0.01, -PI / 2, 0, 0, 1.05, 0.8, 1));     // the cloak gathered behind the neck
  wA.mesh(armor, waist); wG.mesh(gold, waist); wS.mesh(sash, waist); wK.mesh(skin, waist); wA2.mesh(armor2, waist); wP.mesh(capeP, waist);
  // head
  const head = new T.Group(); head.position.set(0, 0.68, 0.02); head.rotation.order = 'YXZ'; waist.add(head);
  head.scale.set(0.9 / (look.bulk || 1), 0.9, 0.9);       // a smaller head on the shoulders: taller, more heroic proportions
  mesh(headG(), faceM, 0, 0, 0, head);
  const hK = new Merge(), hG = new Merge(), hA2 = new Merge(), hA = new Merge();
  hK.add(loftG(ringsY([[0.036, 0.007, 0.006, 0.117], [0.005, 0.0105, 0.011, 0.124], [-0.022, 0.016, 0.016, 0.131], [-0.036, 0.0165, 0.008, 0.122]]), 8));
  [1, -1].forEach((k) => hK.add(new T.SphereGeometry(0.03, 8, 6), M4(k * 0.096, -0.005, -0.005, 0, 0, 0, 0.35, 1, 0.65)));
  hK.mesh(skin, head);
  if (look.beard === 1 || look.beard === 2) mesh(beardG(look.beard === 2), hairM, 0, 0, 0, head);
  const plumes = [];
  if (crown) {
    // bare-headed: hair, a topknot in a gold crown, two long pheasant tail feathers
    mesh(new T.SphereGeometry(0.131, 16, 6, 0, TAU, 0, 0.92), hairM, 0, 0.004, -0.006, head).scale.set(0.9, 1.13, 1.02);
    mesh(new T.SphereGeometry(0.131, 12, 6, PI, PI, 0.9, 1.15), hairM, 0, 0.004, -0.006, head).scale.set(0.9, 1.13, 1.02);
    mesh(new T.SphereGeometry(0.048, 8, 6), hairM, 0, 0.165, -0.025, head);
    if (look.hairBack === 'tail') mesh(tubeG([[0, 0.17, -0.045], [0, 0.205, -0.12], [0, 0.14, -0.21], [0, 0.0, -0.255], [0, -0.17, -0.275], [0, -0.33, -0.25]], [0.028, 0.034, 0.037, 0.033, 0.025, 0.004], 7, { ref: [1, 0, 0] }), hairM, 0, 0, 0, head);
    hG.add(latheG([[0.118, 0.066], [0.125, 0.071], [0.125, 0.094], [0.118, 0.099]], 18), M4(0, 0, 0.002, -0.12, 0, 0, 0.84, 1, 0.93));
    hG.add(latheG([[0.05, 0.0], [0.058, 0.012], [0.046, 0.04], [0.062, 0.062], [0.05, 0.07]], 12), M4(0, 0.135, -0.025));
    for (let i = 0; i < 3; i++) hG.add(new T.ConeGeometry(0.014, 0.06, 5), M4(Math.sin((i - 1) * 0.9) * 0.055, 0.225, -0.025 + Math.cos((i - 1) * 0.9) * 0.055));
    mesh(new T.SphereGeometry(0.03, 8, 6), reg(toonMat({ color: 0xd2351f, key: KEY })), 0, 0.245, -0.025, head);
    [1, -1].forEach((k) => {
      let parent = head; const chain = [];
      for (let i = 0; i < 6; i++) {
        const sg = new T.Group(); sg.position.set(i === 0 ? k * 0.05 : 0, 0.2, i === 0 ? -0.03 : 0);
        const w0 = lerp(0.056, 0.02, i / 6), w1 = lerp(0.056, 0.02, (i + 1) / 6);
        const fg = surfG((u, v, out) => { out[0] = (u - 0.5) * lerp(w0, w1, v); out[1] = v * 0.2; out[2] = 0.006 * Math.sin(u * PI); }, 2, 1);
        const a = fg.attributes.uv; for (let q = 0; q < a.count; q++) a.setY(q, (i + a.getY(q)) / 6);
        mesh(fg, plumeM, 0, 0, 0, sg);
        parent.add(sg); parent = sg; chain.push(sg);
      }
      plumes.push({ chain, k, feather: true });
    });
  } else if (look.helm === 'none') {
    // bare-headed: a cap of hair with a crown of spikes swept up and back
    const hH = new Merge(), r = mulberry(31), up = V3(0, 1, 0), d = V3(), q = new T.Quaternion();
    hH.add(new T.SphereGeometry(0.131, 16, 6, 0, TAU, 0, 0.92), M4(0, 0.004, -0.006, 0, 0, 0, 0.9, 1.13, 1.02));
    hH.add(new T.SphereGeometry(0.131, 12, 6, PI, PI, 0.9, 1.15), M4(0, 0.004, -0.006, 0, 0, 0, 0.9, 1.13, 1.02));
    for (let i = 0; i < 15; i++) {
      const az = (i / 15) * TAU + r() * 0.3, front = Math.cos(az) > 0.25, el = front ? 0.95 + r() * 0.4 : 0.2 + r() * 0.9, len = (front ? 0.08 : 0.11) + r() * 0.07;
      d.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
      const px = d.x * 0.112, py = 0.004 + d.y * 0.142, pz = -0.006 + d.z * 0.128;
      d.z -= 0.35; d.normalize();          // every spike leans back, as if blown by the charge
      q.setFromUnitVectors(up, d);
      hH.add(new T.ConeGeometry(0.034, len, 5), new T.Matrix4().compose(V3(px + d.x * len * 0.4, py + d.y * len * 0.4, pz + d.z * len * 0.4), q, V3(1, 1, 1)));
    }
    hH.mesh(hairM, head);
  } else {
    const hm = M4(0, 0, -0.004, 0, 0, 0, 1, 1, 1.07), bowl = [[0.15, 0.072], [0.152, 0.1], [0.144, 0.135], [0.123, 0.168], [0.09, 0.193], [0.05, 0.208], [0.026, 0.213]];
    hA2.add(latheG(bowl, 18), hm);
    hG.add(latheG([[0.151, 0.056], [0.159, 0.06], [0.159, 0.086], [0.151, 0.09]], 18), hm);
    hG.add(new T.SphereGeometry(0.036, 4, 2), M4(0, 0.12, 0.158, 0, 0, 0, 0.8, 1.35, 0.28));
    hG.add(latheG([[0.034, 0.2], [0.03, 0.212], [0.016, 0.222], [0.013, 0.262], [0.02, 0.268], [0.02, 0.276], [0.001, 0.282]], 10));
    for (let i = 0; i < 4; i++) {
      const ph = (i + 0.5) * PI / 2, sn = Math.sin(ph), cs = Math.cos(ph);
      hG.add(tubeG(bowl.map((p) => [p[0] * 1.004 * sn, p[1], p[0] * 1.004 * cs * 1.07 - 0.004]), 0.0065, 4, { ref: [cs, 0, -sn] }));
    }
    hA.add(uvScale(new T.CylinderGeometry(0.156, 0.255, 0.2, 16, 2, true, PI - 1.95, 3.9), 2.6, 1.3), M4(0, -0.035, -0.006, 0, 0, 0, 1, 1, 1.05));
    if (look.helm === 'horn') [1, -1].forEach((k) => hG.add(tubeG([[k * 0.13, 0.11, 0], [k * 0.19, 0.125, 0], [k * 0.245, 0.17, 0], [k * 0.275, 0.24, 0.005], [k * 0.28, 0.31, 0.01]], [0.032, 0.03, 0.024, 0.015, 0.003], 7, { ref: [0, 0, 1] })));
    const pg = new T.Group(); pg.position.set(0, 0.276, -0.004); head.add(pg);
    mesh(loftG(ringsY([[0, 0.014, 0.014, 0, 0, 1, 0], [0.06, 0.03, 0.03, 0, 0, 1, 0.1], [0.14, 0.05, 0.05, 0, 0, 1, 0.22]]), 10, { cap: false, ur: 3 }), plumeM, 0, 0, 0, pg);
    const pg2 = new T.Group(); pg2.position.set(0, 0.13, 0); pg.add(pg2);
    mesh(tubeG([[0, 0, 0], [0, 0.09, -0.02], [0, 0.16, -0.08], [0, 0.19, -0.17], [0, 0.17, -0.27], [0, 0.11, -0.36], [0, 0.03, -0.42]], [0.05, 0.062, 0.066, 0.062, 0.054, 0.042, 0.03], 10, { ref: [1, 0, 0], cap: false, ur: 3, v: [0.2, 0.32, 0.45, 0.58, 0.72, 0.86, 1] }), plumeM, 0, 0, 0, pg2);
    plumes.push({ chain: [pg, pg2], k: 0, feather: false });
    if (look.helm === 'wing') [1, -1].forEach((k) => hG.add(loftG(ringsY([[0.07, 0.006, 0.03, 0.0, k * 0.15], [0.13, 0.008, 0.078, -0.03, k * 0.176], [0.22, 0.008, 0.09, -0.078, k * 0.202], [0.31, 0.006, 0.064, -0.135, k * 0.218], [0.4, 0.003, 0.012, -0.2, k * 0.224]]), 8)));
    if (look.hairBack === 'mane') {       // wild hair spilling out from under the helmet
      const hH = new Merge(), r = mulberry(57);
      for (let i = 0; i < 9; i++) {
        const az = PI + (i / 8 - 0.5) * 2.9, sn = Math.sin(az), cs = Math.cos(az), dl = r() * 0.12;
        hH.add(tubeG([[sn * 0.13, 0.0, cs * 0.14], [sn * 0.2, -0.09, cs * 0.21], [sn * 0.235, -0.22 - dl * 0.5, cs * 0.25], [sn * 0.22, -0.36 - dl, cs * 0.27]], [0.04, 0.052, 0.04, 0.003], 6, { ref: [cs, 0, -sn] }));
      }
      hH.mesh(hairM, head);
    }
  }
  if (!hG.empty) hG.mesh(gold, head); if (!hA2.empty) hA2.mesh(armor2, head); if (!hA.empty) hA.mesh(armor, head);
  // arms
  const arm = (k, right) => {
    const a = makeArm(right, 0.3, 0.29, { sleeve: cloth, armor, armor2, bracer: armor, gold, skin });
    waist.add(a.up, a.lo, a.hand);
    return { S: V3(k * 0.27, 0.46, 0), E: V3(), H: V3(), up: a.up, lo: a.lo, hand: a.hand, pole: V3(k * 0.7, -1, -0.35).normalize() };
  };
  const armR = arm(-1, true), armL = arm(1, false);
  // cape
  const capeC = 7, capeR = 9, capeG = new T.PlaneGeometry(0.86, 1.2, capeC - 1, capeR - 1);
  const cape = mesh(capeG, capeM, 0, 0, 0, waist); cape.frustumCulled = false; cape.userData.noInk = true;
  return { seat, waist, head, armR, armL, cape, capeG, capeC, capeR, plumes, mats, faceM, look, seed: rnd(100), edge: V3(1, 0, 0), prevTip: V3(), restL: V3(0.14, 0.12, 0.3) };
}
function updateCape(R, t, wind) {
  const p = R.capeG.attributes.position.array, cols = R.capeC, rows = R.capeR, seg = 1.15 / (rows - 1);
  let y = 0.52, z = -0.2;
  for (let r = 0; r < rows; r++) {
    const k = r / (rows - 1);
    const ang = 0.16 + wind * 1.2 * Math.pow(k, 0.7) + Math.sin(t * (4.5 + wind * 7) - r * 0.7 + R.seed) * (0.05 + wind * 0.17) * k;
    if (r > 0) { y -= seg * Math.cos(ang); z -= seg * Math.sin(ang); }
    for (let c = 0; c < cols; c++) {
      const u = c / (cols - 1) - 0.5, i = (r * cols + c) * 3;
      p[i] = u * 0.62 * (1 + 0.45 * k);
      p[i + 1] = y;
      p[i + 2] = z + Math.sin(t * 7.3 + c * 0.9 + r * 0.55) * 0.03 * k * (0.5 + wind) + u * u * 0.46 * (1 - k) * (1 - k);
    }
  }
  R.capeG.attributes.position.needsUpdate = true; R.capeG.computeVertexNormals();
}
const _tip = V3(), _hl = V3(), _fa = V3(), _ga = V3();
// pose: { ty,tp,tr, wx,wy,wz, az,el, lh, hy,hp } degrees / metres in waist space (+z = toward the foe, +x = own left)
function poseRider(R, W, p, o) {
  const w = R.waist;
  w.rotation.set(rad(p.tp) + (o.flP || 0), (o.baseYaw || 0) + rad(p.ty) + (o.flY || 0), rad(p.tr) + (o.flR || 0));
  W.g.position.set(p.wx, p.wy, p.wz);
  const az = rad(p.az), el = rad(p.el), ce = Math.cos(el);
  _d.set(Math.sin(az) * ce, Math.sin(el), Math.cos(az) * ce);
  _tip.copy(_d).multiplyScalar(W.tipY).add(W.g.position);
  _hl.subVectors(_tip, R.prevTip);
  if (_hl.lengthSq() > 0.0009) R.edge.lerp(_hl.normalize(), 0.65);
  R.prevTip.copy(_tip);
  orientYX(W.g, _d, R.edge);
  const aR = R.armR, aL = R.armL, lh = sat(p.lh);
  aR.H.copy(W.g.position);
  solveIK(aR.S, aR.H, 0.3, 0.29, aR.pole, aR.E);
  aimLimb(aR.up, aR.S, aR.E); aimLimb(aR.lo, aR.E, aR.H);
  _fa.subVectors(aR.H, aR.E); aR.hand.position.copy(aR.H); orientXY(aR.hand, _d, _fa);
  _hl.copy(W.g.position).addScaledVector(_d, 0.38);
  aL.H.copy(R.restL).lerp(_hl, lh);
  solveIK(aL.S, aL.H, 0.3, 0.29, aL.pole, aL.E);
  aimLimb(aL.up, aL.S, aL.E); aimLimb(aL.lo, aL.E, aL.H);
  _fa.subVectors(aL.H, aL.E); _ga.set(-1, 0, 0).lerp(_d, lh); aL.hand.position.copy(aL.H); orientXY(aL.hand, _ga, _fa);
  R.head.rotation.set(rad(p.hp) - (o.flP || 0) * 0.5, rad(p.hy) - rad(p.ty) * 0.62 - (o.flY || 0) * 0.5, 0);
  const t = o.t || 0, wind = o.wind || 0;
  updateCape(R, t, wind);
  for (let i = 0; i < R.plumes.length; i++) {
    const pl = R.plumes[i];
    for (let j = 0; j < pl.chain.length; j++) {
      const sw = Math.sin(t * (pl.feather ? 3.4 : 5) - j * 0.7 + R.seed + i) * (0.05 + wind * 0.1);
      if (pl.feather) { pl.chain[j].rotation.x = (j === 0 ? -0.55 : -0.2 - wind * 0.08) + sw; pl.chain[j].rotation.z = (j === 0 ? -pl.k * 0.5 : -pl.k * 0.05) + sw * 0.5; }
      else { pl.chain[j].rotation.x = (j === 0 ? -0.1 - wind * 0.25 + sw : -0.12 - wind * 0.55 + sw * 2); }
    }
  }
}

const POSE_KEYS = ['ty', 'tp', 'tr', 'wx', 'wy', 'wz', 'az', 'el', 'lh', 'hy', 'hp'];
function Pz(ty, tp, tr, wx, wy, wz, az, el, lh = 1, hy = 0, hp = 0) { return { ty, tp, tr, wx, wy, wz, az, el, lh, hy, hp }; }
class PoseAnim {
  constructor(init, keys) { this.keys = keys || POSE_KEYS; this.cur = Object.assign({}, init); this.from = Object.assign({}, init); this.q = []; this.seg = null; this.t = 0; }
  play(list) { this.q.length = 0; this.seg = null; for (let i = 0; i < list.length; i++) this.q.push(list[i]); this._next(); }
  add(list) { for (let i = 0; i < list.length; i++) this.q.push(list[i]); if (!this.seg) this._next(); }
  snap(p) { Object.assign(this.cur, p); this.q.length = 0; this.seg = null; }
  _next() { this.seg = this.q.shift() || null; if (this.seg) { Object.assign(this.from, this.cur); this.t = 0; } }
  get busy() { return !!this.seg; }
  update(dt) {
    let rem = dt, guard = 0;
    while (this.seg && guard++ < 6) {
      const s = this.seg, left = s.d - this.t;
      if (rem < left) { this.t += rem; rem = 0; } else { this.t = s.d; rem -= left; }
      const k = s.d <= 0 ? 1 : this.t / s.d, e = EASE[s.e || 'io'](k);
      for (let i = 0; i < this.keys.length; i++) { const key = this.keys[i]; this.cur[key] = lerp(this.from[key], s.p[key], e); }
      if (this.t >= s.d) this._next(); else break;
    }
  }
}
// enemy poses (waist space, facing the player)
const EP = {
  guard: Pz(-12, 6, 0, -0.2, 0.22, 0.3, 32, 58, 1, 8, 0),
  ready: Pz(-10, 16, 0, -0.34, 0.26, 0.12, -12, 30, 0, 6, -6),
  taunt: Pz(-14, -4, 0, -0.3, 0.38, 0.34, -6, 10, 0, 0, -4),
  L: { w: Pz(-42, -4, -6, -0.22, 0.44, 0.2, -150, 38, 1, 30, 0), h: Pz(26, 20, 6, 0.02, 0.36, 0.44, 12, 20, 1, -8, 4), e: Pz(58, 22, 10, 0.18, 0.28, 0.3, 80, -8, 1, -28, 6) },
  R: { w: Pz(46, -4, 6, 0.2, 0.44, 0.22, 150, 38, 1, -30, 0), h: Pz(-24, 20, -6, -0.06, 0.36, 0.44, -12, 20, 1, 8, 4), e: Pz(-55, 22, -10, -0.22, 0.28, 0.28, -80, -8, 1, 28, 6) },
  U: { w: Pz(-6, -14, 0, -0.06, 0.86, 0.02, 0, 128, 1, 0, -12), h: Pz(0, 24, 0, -0.02, 0.42, 0.46, 0, 14, 1, 0, 6), e: Pz(0, 34, 0, -0.02, 0.2, 0.4, 0, -28, 1, 0, 10) },
  D: { w: Pz(-34, 2, -4, -0.34, 0.26, -0.1, 6, 6, 1, 28, 0), h: Pz(18, 26, 0, -0.06, 0.34, 0.52, 0, 6, 1, -6, 6), e: Pz(22, 28, 0, -0.04, 0.32, 0.54, 0, 4, 1, -6, 6) },
  defL: Pz(-30, -12, -10, -0.3, 0.5, 0.18, -70, 62, 0.3, 10, -10),
  defR: Pz(30, -12, 10, 0.1, 0.52, 0.24, 70, 62, 1, -10, -10),
  defU: Pz(0, -18, 0, -0.1, 0.7, 0.1, 20, 100, 1, 0, -14),
  defD: Pz(-10, 14, 0, -0.2, 0.2, 0.4, 25, -38, 1, 0, 10),
  stag: Pz(-20, 30, -14, -0.36, 0.06, 0.16, -50, -30, 0, 0, 34),
  blkL: Pz(-22, 2, 0, -0.3, 0.24, 0.34, -4, 82, 1, 10, 0),
  blkR: Pz(20, 2, 0, 0.1, 0.26, 0.36, 6, 80, 1, -10, 0),
  blkU: Pz(0, -4, 0, -0.26, 0.6, 0.34, 86, 4, 1, 0, -6),
  roar: Pz(0, -22, 0, -0.34, 0.7, 0.0, -30, 80, 0, 0, -24),
  open: Pz(10, 14, 0, -0.32, 0.12, 0.26, 62, -12, 0.5, 0, 8),
};
EP.blkD = EP.blkU;
