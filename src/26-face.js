// ───────────────────────── faces: pen-and-ink (gekiga) ─────────────────────────
// One drawing routine feeds both the 3D head texture (in colour) and the 2D cut-in panels (ink on paper), so the two always match.
// Lean, angular adult faces: narrow hooded eyes, low heavy brows, a drawn nose and lips, tapered pen strokes and hatching for shade.
// Face space is 512×256 (the head sphere's UV unwrap): the face front is centred on x = 128, eyes at y ≈ 112, mouth at y ≈ 168.
// Canvas left is the character's right.
const FACE = (() => {
  const cache = {};
  const col = (c) => new T.Color(c);
  const hx = (c) => '#' + col(c).getHexString();
  const INK = '#17100c';
  // w: half width, hu/hl: upper/lower lid height, rot: lift of the outer corner, ri: iris radius, lid: how far the upper lid hoods the iris
  const EYES = {
    sharp: { w: 12, hu: 4.6, hl: 2.6, rot: 0.16, ri: 4.3, lid: 0.35 },
    round: { w: 11.5, hu: 6.4, hl: 4.4, rot: 0.05, ri: 3.4, lid: 0 },          // 고리눈: white all round a small iris
    cold: { w: 12.5, hu: 3.6, hl: 2.3, rot: 0.1, ri: 4.2, lid: 0.6 },
    wild: { w: 11.5, hu: 5.6, hl: 3.6, rot: 0.2, ri: 3.1, lid: 0 },
    phoenix: { w: 13.5, hu: 3.8, hl: 2.2, rot: 0.24, ri: 4.1, lid: 0.5 },
    young: { w: 12, hu: 5.2, hl: 3, rot: 0.11, ri: 4.7, lid: 0.25 },
  };
  const EXPR = {
    idle: { open: 1, brow: 0.3, pupil: 1, mouth: 'set' },
    kiai: { open: 0.95, brow: 1, pupil: 0.8, mouth: 'shout', strain: 1, sweat: 1 },
    hurt: { open: 0.62, brow: -0.6, pupil: 0.9, mouth: 'grit', wince: 1, strain: 1, sweat: 1 },
    rage: { open: 1.3, brow: 1.3, pupil: 0.55, mouth: 'snarl', strain: 1, dark: 1 },
  };
  const keyOf = (look) => JSON.stringify([look.skin, look.hair, look.beard, look.patch, look.helm, look.face, look.armor2]);
  const bare = (look) => look.helm === 'crown' || look.helm === 'none';
  // a pen stroke along a quadratic curve, swelling in the middle and tapering at the ends (t0 / t1: share of the length spent tapering in / out)
  function br(g, x0, y0, cx, cy, x1, y1, w, t0, t1) {
    t0 = t0 === undefined ? 0.3 : t0; t1 = t1 === undefined ? 0.3 : t1;
    const N = 12, L = [], R = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N, a = 1 - t, x = a * a * x0 + 2 * a * t * cx + t * t * x1, y = a * a * y0 + 2 * a * t * cy + t * t * y1;
      const dx = a * (cx - x0) + t * (x1 - cx), dy = a * (cy - y0) + t * (y1 - cy), l = Math.hypot(dx, dy) || 1;
      const k = Math.min(1, t0 ? t / t0 : 1, t1 ? (1 - t) / t1 : 1), hw = w * 0.5 * (0.12 + 0.88 * Math.sqrt(Math.max(k, 0)));
      L.push(x - (dy / l) * hw, y + (dx / l) * hw); R.push(x + (dy / l) * hw, y - (dx / l) * hw);
    }
    g.beginPath(); g.moveTo(L[0], L[1]);
    for (let i = 1; i <= N; i++) g.lineTo(L[i * 2], L[i * 2 + 1]);
    for (let i = N; i >= 0; i--) g.lineTo(R[i * 2], R[i * 2 + 1]);
    g.closePath(); g.fill();
  }
  const ln = (g, x0, y0, x1, y1, w, t0, t1) => br(g, x0, y0, (x0 + x1) / 2, (y0 + y1) / 2, x1, y1, w, t0, t1);
  // n hatching strokes starting along the line a→b, each running (dx, dy), a little irregular like a hand
  function hatch(g, r, ax, ay, bx, by, dx, dy, n, w) {
    for (let i = 0; i < n; i++) {
      const t = (i + r() * 0.7) / n, sx = lerp(ax, bx, t), sy = lerp(ay, by, t), k = 0.65 + r() * 0.55;
      br(g, sx, sy, sx + dx * k * 0.5 + dy * 0.07, sy + dy * k * 0.5 - dx * 0.07, sx + dx * k, sy + dy * k, w * (0.7 + r() * 0.6), 0.08, 0.65);
    }
  }
  const poly = (g, pts) => { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); g.fill(); };

  // mono: ink on paper, for the cut-in panels
  function paint(g, look, ex, mono) {
    const F = look.face || {}, E = EXPR[ex] || EXPR.idle, eye = EYES[F.eye || 'sharp'], r = mulberry(11);
    const W = 512, cx = 128;
    const skin = mono ? col(0xefe6d6) : col(look.skin || 0xdcab82), hair = mono ? INK : hx(look.hair || 0x1c1614), iris = col(F.iris || 0x6a3a1c);
    const sk = (m, red) => '#' + skin.clone().multiplyScalar(m).lerp(col(mono ? 0x6e675e : 0xa8503c), red || 0).getHexString();
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.fillStyle = sk(1); g.fillRect(0, 0, W, 256);
    // flat planes of shade: eye sockets, the far side of the nose, under the nose and lip, the hollow of the far cheek, under the jaw
    g.fillStyle = sk(0.8, 0.1);
    [-1, 1].forEach((k) => poly(g, [cx + k * 4, 101, cx + k * 24, 98, cx + k * 46, 99.5, cx + k * 44, 108, cx + k * 30, 105.5, cx + k * 10, 109, cx + k * 5.5, 119]));
    poly(g, [cx + 1.5, 110, cx + 8, 140, cx + 12.5, 147, cx + 4, 150.5, cx + 2, 146]);
    poly(g, [cx - 7, 150.5, cx + 8, 150.5, cx + 0.5, 155.5]);
    poly(g, [cx - 9, 177, cx, 179.5, cx + 9, 177, cx + 5, 182.5, cx - 5, 182.5]);
    poly(g, [cx + 50, 122, cx + 39, 141, cx + 33, 168, cx + 41, 187, cx + 62, 172, cx + 68, 122]);
    if (!mono) poly(g, [cx - 62, 144, cx - 49, 172, cx - 34, 196, cx - 16, 210, cx + 16, 210, cx + 34, 196, cx + 49, 172, cx + 62, 144, cx + 74, 256, cx - 74, 256]);
    if (E.dark) {   // rage: the upper face goes into shadow
      const gr = g.createLinearGradient(0, 78, 0, 132); gr.addColorStop(0, mono ? 'rgba(20,14,12,0.5)' : 'rgba(24,8,12,0.55)'); gr.addColorStop(0.75, mono ? 'rgba(20,14,12,0.35)' : 'rgba(24,8,12,0.4)'); gr.addColorStop(1, 'rgba(24,8,12,0)');
      g.fillStyle = gr; g.fillRect(cx - 72, 60, 144, 76);
    }
    // hatching over the shade, heavier on the far (character's left) side
    g.fillStyle = mono ? 'rgba(23,16,12,0.85)' : 'rgba(23,16,12,0.5)';
    hatch(g, r, cx + 57, 126, cx + 45, 182, -10.5, 6.5, 11, 1.1);
    hatch(g, r, cx + 60, 94, cx + 63, 120, -7, 4, 5, 0.9);
    hatch(g, r, cx + 9.5, 118, cx + 12, 143, -4.4, 2.8, 6, 0.8);
    hatch(g, r, cx - 7, 178.5, cx + 7, 178.5, 0.6, 4.2, 6, 0.8);
    hatch(g, r, cx + 56, 150, cx + 22, 208, 2.5, 10, 10, 1);
    hatch(g, r, cx - 56, 152, cx - 24, 207, -1.5, 8, 7, 0.8);
    if (E.dark) { hatch(g, r, cx - 62, 84, cx + 62, 84, -9, 26, 30, 1.1); hatch(g, r, cx - 62, 88, cx + 62, 88, 10, 22, 22, 0.9); }
    // hair on the sides and back
    g.fillStyle = hair; g.beginPath(); g.moveTo(232, 0); g.quadraticCurveTo(222, 80, 226, 128); g.quadraticCurveTo(232, 150, 222, 172); g.lineTo(236, 256); g.lineTo(W, 256); g.lineTo(W, 0); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(24, 0); g.quadraticCurveTo(34, 80, 30, 128); g.quadraticCurveTo(24, 150, 34, 172); g.lineTo(20, 256); g.lineTo(0, 256); g.lineTo(0, 0); g.closePath(); g.fill();
    // eyes: narrow and hooded; the upper lid is one heavy stroke
    const open = E.open * (F.open || 1);
    [-1, 1].forEach((k) => {
      if (look.patch && k === 1) return;
      g.save(); g.translate(cx + k * 25, 112); g.scale(k, 1); g.rotate(-eye.rot);
      const w = eye.w, hu = eye.hu * open, hl = eye.hl * open;
      g.fillStyle = INK;
      if (E.wince && k === -1) {     // screwed shut
        br(g, -w, 0.6, 0, 4.4, w + 1.5, -2.4, 2.7, 0.2, 0.2);
        ln(g, w, -2, w + 6, -5.5, 1); ln(g, w + 0.5, -1, w + 6.5, -1.2, 1); ln(g, w, 0.4, w + 5.5, 3.4, 1);
        br(g, -w * 0.6, 4.6, 0, 6.6, w * 0.7, 3.4, 0.9);
      } else {
        const lid = () => { g.beginPath(); g.moveTo(-w, 0.8); g.bezierCurveTo(-w * 0.5, -hu * 1.25, w * 0.3, -hu * 1.3, w, -1.2); g.bezierCurveTo(w * 0.55, hl * 1.15, -w * 0.35, hl * 1.3, -w, 0.8); g.closePath(); };
        g.fillStyle = mono ? '#f8f3e8' : '#efe9de'; lid(); g.fill();
        g.save(); lid(); g.clip();
        const ir = eye.ri * lerp(1, E.pupil, 0.6), ix = -0.6, iy = -hu * 0.2 - eye.lid * 1.6;
        const ic = mono ? iris.clone().lerp(col(0x3a342e), 0.55) : iris;
        g.fillStyle = hx(ic.clone().multiplyScalar(0.45)); g.beginPath(); g.arc(ix, iy, ir, 0, TAU); g.fill();
        g.fillStyle = hx(E.dark ? ic.clone().lerp(col(0xffffff), 0.25) : ic); g.beginPath(); g.arc(ix, iy + ir * 0.08, ir * 0.8, 0, TAU); g.fill();
        g.fillStyle = '#0a0606'; g.beginPath(); g.arc(ix, iy, ir * 0.46 * E.pupil, 0, TAU); g.fill();
        g.fillStyle = 'rgba(20,10,8,0.5)'; g.fillRect(-w - 2, -hu * 1.4 - 2, 2 * w + 4, hu * 0.75 + 2);       // the lid's shadow on the eye
        g.fillStyle = '#ffffff'; g.beginPath(); g.arc(ix + ir * 0.38, iy - ir * 0.2, 0.85, 0, TAU); g.fill();
        g.restore();
        g.fillStyle = INK;
        g.beginPath(); g.moveTo(-w - 1.2, 1.6); g.bezierCurveTo(-w * 0.5, -hu * 1.25 - 1.3, w * 0.3, -hu * 1.3 - 2.3, w + 1, -2.6);        // upper lid
        g.lineTo(w, -1.2); g.bezierCurveTo(w * 0.3, -hu * 1.3, -w * 0.5, -hu * 1.25, -w, 0.8); g.closePath(); g.fill();
        ln(g, w - 0.5, -1.8, w + 4.6, -3.8, 1.5, 0, 0.8);
        if (F.eye !== 'cold' && F.eye !== 'phoenix') br(g, -w * 0.7, -hu * 1.2 - 2, w * 0.1, -hu * 1.45 - 2.6, w * 0.9, -hu * 0.9 - 2.6, 0.7);
        br(g, w * 0.98, -0.8, w * 0.55, hl * 1.12, w * 0.02, hl * 1.16, 0.9, 0.1, 0.6);
        ln(g, -w, 0.8, -w - 2.2, 2.2, 0.8, 0, 0.7);
        if (F.eye !== 'young') { g.fillStyle = mono ? 'rgba(23,16,12,0.6)' : 'rgba(23,16,12,0.42)'; br(g, -w * 0.55, hl + 3.6, 0, hl + 4.9, w * 0.62, hl + 3.1, 0.7); }
      }
      g.restore();
    });
    // brows: low, heavy, angular; stray hairs at the root
    const b = E.brow, bt = F.brow || 1;
    [-1, 1].forEach((k) => {
      const xi = cx + k * (7 - 1.6 * Math.max(b, 0)), yi = 103 + 3.2 * b, xp = cx + k * 33, yp = 97 - 1.2 * b, xt = cx + k * (F.browLong ? 50 : 45), yt = 99.5 - 0.6 * b + (b < 0 ? 2 : 0);
      g.fillStyle = hair;
      poly(g, [xi, yi + 2.2, xi - k * 0.6, yi - 3.3 * bt, xp, yp - 2.3 * bt, xt, yt, xp, yp + 1.7 * bt]);
      for (let i = 0; i < (bt > 1.4 ? 7 : 4); i++) { const u = i / (bt > 1.4 ? 7 : 4), px = lerp(xi, xp, u * (bt > 1.4 ? 1 : 0.45)), py = lerp(yi, yp, u * (bt > 1.4 ? 1 : 0.45)) - 2.4 * bt; ln(g, px, py + 1.5, px + k * (2.2 + r() * 1.6), py - 2.6 - bt * 1.6 * r(), 1.1 + 0.5 * bt * r(), 0, 0.8); }
    });
    // frown, nose
    g.fillStyle = INK;
    ln(g, cx - 3, 96, cx - 2.2, E.strain ? 106 : 103.5, E.strain ? 1.6 : 1.1); ln(g, cx + 3, 96, cx + 2.2, E.strain ? 106 : 103.5, E.strain ? 1.6 : 1.1);
    if (E.strain) { ln(g, cx, 97.5, cx, 103, 1.1); br(g, cx - 4.5, 108.5, cx, 107, cx + 4.5, 108.5, 1); [-1, 1].forEach((k) => { ln(g, cx + k * 9, 116, cx + k * 6.4, 122, 0.9); ln(g, cx + k * 18, 127.5, cx + k * 27, 130.5, 0.9); }); }
    br(g, cx + 3.5, 109, cx + 6.6, 124, cx + 7.5, 139, 1.3, 0.35, 0.25);
    br(g, cx - 7.5, 146.5, cx - 3, 151.6, cx + 1.5, 149.6, 1.5, 0.3, 0.1); br(g, cx + 1.5, 149.6, cx + 5, 151.6, cx + 9, 146, 1.5, 0.1, 0.3);
    g.beginPath(); g.ellipse(cx - 5.2, 148.7, 2.5, 1.25, 0.35, 0, TAU); g.fill(); g.beginPath(); g.ellipse(cx + 5.8, 148.5, 2.5, 1.25, -0.35, 0, TAU); g.fill();
    br(g, cx + 10.5, 141.5, cx + 13.2, 145.5, cx + 10, 149.6, 1.1); br(g, cx - 10, 142.5, cx - 12.2, 146, cx - 9.5, 149.6, 0.8);
    g.fillStyle = sk(0.62, 0.15);
    [-1, 1].forEach((k) => { ln(g, cx + k * 2.3, 152.5, cx + k * 3, 159.5, 0.8); br(g, cx + k * 46, 124.5, cx + k * 41, 133, cx + k * 34, 139, 1.2); });     // philtrum, cheekbones
    // the folds from the nose past the mouth: faint at rest, cut deep when he strains
    g.fillStyle = E.strain ? INK : sk(0.62, 0.15);
    [-1, 1].forEach((k) => br(g, cx + k * 13, 150, cx + k * 17.5, 158, cx + k * (E.strain ? 20.5 : 17.5), E.strain ? 174 : 162, E.strain ? 1.3 : 0.9, 0.15, 0.6));
    // beard (under the mouth, so the mouth always reads)
    const bd = look.beard || 0;
    g.fillStyle = hair;
    if (bd === 1 || bd === 2) {
      [-1, 1].forEach((k) => { g.beginPath(); g.moveTo(cx + k * 1, 156); g.quadraticCurveTo(cx + k * 14, 153, cx + k * 29, 168 + (bd === 2 ? 9 : 2)); g.quadraticCurveTo(cx + k * 14, 162, cx + k * 1, 163); g.closePath(); g.fill(); });
      g.beginPath(); g.moveTo(cx - 54, 148); g.quadraticCurveTo(cx - 46, 196, cx - 16, 212); g.lineTo(cx + 16, 212); g.quadraticCurveTo(cx + 46, 196, cx + 54, 148);
      g.quadraticCurveTo(cx + 36, 180, cx + 14, 184); g.quadraticCurveTo(cx, 177, cx - 14, 184); g.quadraticCurveTo(cx - 36, 180, cx - 54, 148); g.fill();
      poly(g, [cx - 5, 178, cx + 5, 178, cx + 3, 192, cx - 3, 192]);
      g.fillRect(cx - 30, 206, 60, 50);
      [-1, 1].forEach((k) => { for (let i = 0; i < 12; i++) { const u = i / 11, x = cx + k * lerp(53, 15, u), y = lerp(150, 184, Math.pow(u, 0.7)); ln(g, x, y + 2, x - k * (1 + r() * 2), y - 3.5 - r() * 3, 1.4, 0, 0.8); } });      // a ragged upper edge
      if (F.whisk) [-1, 1].forEach((k) => { for (let i = 0; i < 5; i++) { const y = 148 + i * 10; poly(g, [cx + k * 50, y, cx + k * (65 + i * 2), y - 8, cx + k * 52, y + 8]); } });   // bristling whiskers
    } else if (bd === 3) {     // a thin moustache and a goatee
      [-1, 1].forEach((k) => br(g, cx + k * 1.2, 158.6, cx + k * 11, 156.5, cx + k * 20.5, 171.5, 4.4, 0.1, 0.75));
      poly(g, [cx - 6, 185.5, cx, 183.5, cx + 6, 185.5, cx + 1.6, 214, cx - 1.6, 214]);
      for (let i = 0; i < 5; i++) ln(g, cx - 5 + i * 2.5, 186, cx - 3 + i * 1.5, 196 + r() * 8, 1.1, 0, 0.8);
    } else if (bd === 4) {     // mutton chops and stubble
      [-1, 1].forEach((k) => { g.beginPath(); g.moveTo(cx + k * 66, 108); g.lineTo(cx + k * 53, 118); g.quadraticCurveTo(cx + k * 51, 160, cx + k * 34, 188); g.lineTo(cx + k * 47, 198); g.quadraticCurveTo(cx + k * 63, 172, cx + k * 72, 140); g.closePath(); g.fill(); });
      g.fillStyle = mono ? 'rgba(23,16,12,0.8)' : 'rgba(28,18,14,0.6)';
      for (let i = 0; i < 90; i++) { const a = r() * PI, rr = 18 + r() * 26, x = cx + Math.cos(a) * rr * 1.25, y = 168 + Math.sin(a) * rr * 0.92; ln(g, x, y, x + r() - 0.5, y + 1.8 + r(), 0.7, 0, 0.5); }
      for (let i = 0; i < 16; i++) { const x = cx - 13 + r() * 26, y = 154 + r() * 9; ln(g, x, y, x + r() - 0.5, y + 1.6, 0.7, 0, 0.5); }
    }
    // mouth
    const mo = E.mouth === 'set' ? F.mouth || 'set' : E.mouth, my = 168, teeth = mono ? '#f8f3e8' : '#efe9dc';
    g.fillStyle = INK;
    if (mo === 'set' || mo === 'smirk') {
      const up = mo === 'smirk' ? 2.6 : 0;
      br(g, cx - 13.5, my + 1.5, cx - 6, my - 1.4, cx, my + 0.2, 1.9, 0.3, 0); br(g, cx, my + 0.2, cx + 6, my - 1.4 - up * 0.4, cx + 13.5, my + 1.5 - up, 1.9, 0, 0.3);
      ln(g, cx - 13.5, my + 1.5, cx - 15.6, my + 4, 1.1, 0, 0.7); ln(g, cx + 13.5, my + 1.5 - up, cx + 15.8, my + 3.4 - up * 1.8, 1.1, 0, 0.7);
      if (!bd || bd > 2) { g.fillStyle = mono ? 'rgba(23,16,12,0.7)' : 'rgba(23,16,12,0.5)'; br(g, cx - 6.5, my + 7.2, cx, my + 9.4, cx + 6.5, my + 7.2, 1.1); g.fillStyle = sk(0.62, 0.15); br(g, cx - 8, my - 4.5, cx - 3, my - 6.6, cx, my - 4.6, 0.8); br(g, cx, my - 4.6, cx + 3, my - 6.6, cx + 8, my - 4.5, 0.8); }
    } else if (mo === 'grin') {
      const path = () => { g.beginPath(); g.moveTo(cx - 14, my - 1); g.quadraticCurveTo(cx, my - 2.6, cx + 14.5, my - 3.4); g.quadraticCurveTo(cx + 3, my + 7, cx - 14, my - 1); g.closePath(); };
      g.fillStyle = teeth; path(); g.fill();
      g.save(); path(); g.clip(); g.fillStyle = INK; for (let i = -2; i <= 3; i++) ln(g, cx + i * 4.4, my - 5, cx + i * 4.1, my + 7, 0.7, 0, 0); g.restore();
      g.strokeStyle = INK; g.lineWidth = 1.6; path(); g.stroke();
      ln(g, cx + 14.5, my - 3.4, cx + 17.5, my - 6, 1.1, 0, 0.7);
    } else if (mo === 'shout') {
      const mw = 16, top = my - 9.5, bot = my + 23;
      const path = () => { g.beginPath(); g.moveTo(cx - mw, top + 3.5); g.quadraticCurveTo(cx - 6, top - 1.5, cx, top + 0.5); g.quadraticCurveTo(cx + 6, top - 1.5, cx + mw, top + 3.5); g.quadraticCurveTo(cx + mw + 1, bot - 12, cx + mw * 0.66, bot - 3); g.quadraticCurveTo(cx, bot + 2.5, cx - mw * 0.66, bot - 3); g.quadraticCurveTo(cx - mw - 1, bot - 12, cx - mw, top + 3.5); g.closePath(); };
      g.fillStyle = mono ? '#120c0a' : '#2a0b0a'; path(); g.fill();
      g.save(); path(); g.clip();
      g.fillStyle = mono ? '#5e564e' : '#8e3a32'; g.beginPath(); g.ellipse(cx, bot - 5.5, mw * 0.6, 6, 0, 0, TAU); g.fill();
      g.fillStyle = teeth; g.beginPath(); g.moveTo(cx - mw, top); g.quadraticCurveTo(cx, top - 3.5, cx + mw, top); g.lineTo(cx + mw, top + 6.2); g.quadraticCurveTo(cx, top + 3.6, cx - mw, top + 6.2); g.closePath(); g.fill();
      if (F.fang) [-1, 1].forEach((k) => poly(g, [cx + k * 7.4, top + 4.5, cx + k * 9.6, top + 10.5, cx + k * 11.8, top + 5]));
      g.beginPath(); g.moveTo(cx - mw * 0.72, bot - 7); g.quadraticCurveTo(cx, bot - 3.2, cx + mw * 0.72, bot - 7); g.lineTo(cx + mw * 0.72, bot - 10); g.quadraticCurveTo(cx, bot - 6.6, cx - mw * 0.72, bot - 10); g.closePath(); g.fill();
      g.fillStyle = 'rgba(23,16,12,0.7)'; for (let i = -2; i <= 2; i++) { ln(g, cx + i * 4.6 + 2.3, top - 2, cx + i * 4.5 + 2.3, top + 6, 0.6, 0, 0); ln(g, cx + i * 3.4 + 1.7, bot - 10.5, cx + i * 3.4 + 1.7, bot - 4, 0.6, 0, 0); }
      g.restore();
      g.strokeStyle = INK; g.lineWidth = 1.8; path(); g.stroke();
      g.fillStyle = INK; br(g, cx - 7, bot + 3.4, cx, bot + 5.6, cx + 7, bot + 3.4, 1.1);
    } else {       // grit / snarl: lips drawn back off clenched teeth
      const sn = mo === 'snarl' ? 1 : 0, mw = 15;
      const path = () => { g.beginPath(); g.moveTo(cx - mw, my - 4.5 - sn * 2.5); g.quadraticCurveTo(cx - 1, my - 7 - sn, cx + mw, my - 4.5); g.lineTo(cx + mw + 1, my + 2); g.quadraticCurveTo(cx + mw, my + 8, cx + mw - 2, my + 9); g.quadraticCurveTo(cx, my + 12, cx - mw + 2, my + 9 + sn); g.quadraticCurveTo(cx - mw, my + 8, cx - mw - 1, my + 2); g.closePath(); };
      g.fillStyle = teeth; path(); g.fill();
      g.save(); path(); g.clip(); g.fillStyle = 'rgba(23,16,12,0.8)';
      br(g, cx - mw - 1, my + 2 - sn, cx, my + 0.6, cx + mw + 1, my + 2.2, 1.2, 0, 0);
      for (let i = -3; i <= 3; i++) ln(g, cx + i * 4.3, my - 9, cx + i * 4.1, my + 13, 0.7, 0, 0);
      if (F.fang) { g.fillStyle = teeth; [-1, 1].forEach((k) => poly(g, [cx + k * 7.6, my - 3, cx + k * 9.6, my + 4.6, cx + k * 11.6, my - 3])); }
      g.restore();
      g.strokeStyle = INK; g.lineWidth = 1.8; path(); g.stroke();
    }
    // marks
    if (F.mark === 'scarNose') {
      g.fillStyle = mono ? INK : sk(0.55, 0.6); br(g, cx - 36, 132, cx - 4, 122, cx + 30, 125, 2.6, 0.2, 0.2);
      for (let i = 0; i < 5; i++) { const x = cx - 28 + i * 13, y = 129.5 - i * 1.4; ln(g, x - 1, y - 4.5, x + 1.5, y + 4.5, 1.3); }
    }
    if (F.mark === 'paint') {
      g.fillStyle = hx(F.paint || 0xb8281c);
      [-1, 1].forEach((k) => { for (let i = 0; i < 2; i++) { const x0 = cx + k * (16 + i * 2), y0 = 126 + i * 9; br(g, x0, y0 + 1, x0 + k * 14, y0 + 3.5 + i, x0 + k * 28, y0 + 8 + i * 2, 5.4, 0.08, 0.5); } });
    }
    if (look.patch) {
      g.fillStyle = '#0e0b0a'; g.beginPath(); g.ellipse(cx + 26, 111, 18.5, 13, -0.1, 0, TAU); g.fill();
      g.strokeStyle = '#0e0b0a'; g.lineWidth = 4.6; g.beginPath(); g.moveTo(cx - 70, 70); g.lineTo(cx + 26, 108); g.lineTo(cx + 100, 122); g.stroke();
      g.fillStyle = mono ? INK : sk(0.55, 0.55); ln(g, cx + 12, 84, cx + 17, 95, 1.8); ln(g, cx + 37, 127, cx + 42, 139, 1.8);
    }
    if (look.scar) { g.fillStyle = mono ? INK : sk(0.55, 0.55); ln(g, cx - 44, 96, cx - 30, 150, 2); }
    // hairline for bare heads: a widow's peak, or jagged bangs
    if (bare(look)) {
      g.fillStyle = hair; g.beginPath(); g.moveTo(0, 0); g.lineTo(W, 0); g.lineTo(W, 70); g.lineTo(232, 70);
      if (F.hairline === 'spiky') [[204, 62], [192, 86], [180, 62], [168, 92], [153, 60], [142, 88], [128, 58], [113, 90], [102, 60], [89, 86], [77, 62], [65, 84], [54, 62]].forEach((p) => g.lineTo(p[0], p[1]));
      else { g.quadraticCurveTo(190, 50, cx + 8, 62); g.lineTo(cx, 71); g.lineTo(cx - 8, 62); g.quadraticCurveTo(66, 50, 24, 70); }
      g.lineTo(24, 70); g.lineTo(0, 70); g.closePath(); g.fill();
    }
    if (E.dark) {      // a vein standing out on the temple
      g.fillStyle = mono ? INK : '#7a1c16'; br(g, cx + 52, 74, cx + 47, 80, cx + 49, 88, 1.6); br(g, cx + 48.4, 82, cx + 43, 84, cx + 41, 90, 1.2, 0.05, 0.6); br(g, cx + 49, 86, cx + 53, 90, cx + 52, 95, 1, 0.05, 0.6);
    }
    if (E.sweat) {      // beads of sweat
      [[cx - 39, 121, 3.1, 0.3], [cx + 33, 90, 2.6, -0.2], [cx - 23, 151, 2.4, 0.2], [cx + 45, 152, 2.9, -0.35], [cx - 50, 96, 2.2, 0.4]].forEach((s) => {
        g.save(); g.translate(s[0], s[1]); g.rotate(s[3]);
        g.beginPath(); g.moveTo(0, -s[2] * 1.7); g.quadraticCurveTo(s[2] * 1.15, s[2] * 0.2, 0, s[2]); g.quadraticCurveTo(-s[2] * 1.15, s[2] * 0.2, 0, -s[2] * 1.7); g.closePath();
        g.fillStyle = mono ? '#fbf8f0' : 'rgba(236,244,250,0.92)'; g.fill(); g.strokeStyle = INK; g.lineWidth = 0.8; g.stroke();
        g.restore();
      });
    }
  }

  // the head texture. Only the resting face is drawn at full size; the others are swapped in for moments
  function tex(look, ex) {
    ex = ex || 'idle'; const k = 't' + ex + keyOf(look);
    if (cache[k]) return cache[k];
    const c = document.createElement('canvas'); c.width = ex === 'idle' ? 1024 : 512; c.height = c.width / 2;
    const g = c.getContext('2d'); g.scale(c.width / 512, c.width / 512); paint(g, look, ex, false);
    const t = new T.CanvasTexture(c); t.anisotropy = 4; t.wrapS = T.RepeatWrapping;       // the head's UVs run a little past the seam
    return (cache[k] = t);
  }

  // cut-in panel: the face cut out along its contour, drawn in ink, with the helmet brim (or bangs) over the brow
  const CUT = { x: 58, y: 66, w: 140, h: 152, s: 5 };
  function cutin(look, ex) {
    const k = 'c' + ex + keyOf(look);
    if (cache[k]) return cache[k];
    const c = document.createElement('canvas'); c.width = CUT.w * CUT.s; c.height = CUT.h * CUT.s;
    const g = c.getContext('2d'); g.scale(CUT.s, CUT.s); g.translate(-CUT.x, -CUT.y);
    const F = look.face || {}, cx = 128, x0 = CUT.x, x1 = CUT.x + CUT.w, y0 = CUT.y;
    // the contour: temples, cheekbones, the angle of the jaw, a square chin
    const jw = [[58, 66], [57, 120], [54, 150], [49, 172], [36, 194], [20, 208], [10, 212]];
    const contour = () => { g.beginPath(); g.moveTo(cx - jw[0][0], jw[0][1]); for (let i = 1; i < jw.length; i++) g.lineTo(cx - jw[i][0], jw[i][1]); for (let i = jw.length - 1; i >= 0; i--) g.lineTo(cx + jw[i][0], jw[i][1]); g.closePath(); };
    g.save(); contour(); g.clip();
    paint(g, look, ex, true);
    // spot blacks: the far edge of the face falls into solid shadow
    g.fillStyle = INK; poly(g, [cx + 58, 66, cx + 50, 100, cx + 52, 128, cx + 48, 150, cx + 43, 172, cx + 31, 194, cx + 16, 208, cx + 10, 212, cx + 40, 214, cx + 70, 180, cx + 70, 66]);
    g.restore();
    g.fillStyle = INK;
    for (let i = 0; i < jw.length - 1; i++) [-1, 1].forEach((k) => ln(g, cx + k * jw[i][0], jw[i][1], cx + k * jw[i + 1][0], jw[i + 1][1], i < 2 ? 1.8 : 2.6, i ? 0 : 0.3, 0));
    ln(g, cx - 10, 212, cx + 10, 212, 2.4, 0, 0);
    if (F.bangs) {      // locks of hair falling over the brow
      g.fillStyle = INK; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0, 90);
      const tips = F.bangs;
      for (let i = 0; i < tips.length; i++) { g.lineTo(cx + tips[i][0], tips[i][1]); const nx = i + 1 < tips.length ? tips[i + 1][0] : x1 - cx; g.lineTo(cx + (tips[i][0] + nx) / 2, 80); }
      g.lineTo(x1, 90); g.lineTo(x1, y0); g.closePath(); g.fill();
      g.fillStyle = '#efe6d6'; for (let i = 0; i < tips.length - 1; i++) ln(g, cx + (tips[i][0] + tips[i + 1][0]) / 2 - 3, 72, cx + tips[i][0] + 2, tips[i][1] - 9, 0.9);      // a few strands picked out
    }
    if (!bare(look) || F.band) {      // helmet brim, head wrap or headband, and the shadow it throws
      const by = F.band ? 76 : 80, edge = (dy) => { g.moveTo(x0, by + dy); g.quadraticCurveTo(cx, by + 11 + dy, x1, by + dy); };
      if (!F.band) { g.save(); contour(); g.clip(); g.fillStyle = 'rgba(23,16,12,0.5)'; g.beginPath(); edge(12); g.lineTo(x1, y0); g.lineTo(x0, y0); g.closePath(); g.fill(); const r = mulberry(5); g.fillStyle = INK; hatch(g, r, x0 + 6, by + 6, x1 - 6, by + 6, -3, 9, 34, 1); g.restore(); }
      g.fillStyle = F.band ? '#3a3632' : '#262220'; g.beginPath(); edge(0); g.lineTo(x1, F.band ? by - 12 : y0); g.quadraticCurveTo(cx, F.band ? by - 1 : y0, x0, F.band ? by - 12 : y0); g.closePath(); g.fill();
      g.strokeStyle = '#efe6d6'; g.lineWidth = F.band ? 1 : 2.2; g.beginPath(); edge(F.band ? -1.6 : -2.6); g.stroke();
      g.strokeStyle = INK; g.lineWidth = 1.6; g.beginPath(); edge(0.6); g.stroke();
      if (!F.band) { g.fillStyle = '#efe6d6'; poly(g, [cx, 76, cx + 6, 84.5, cx, 93.5, cx - 6, 84.5]); g.strokeStyle = INK; g.lineWidth = 1.3; g.stroke(); }
    }
    return (cache[k] = c);
  }
  function purge() { for (const k in cache) { if (cache[k].isTexture) cache[k].dispose(); delete cache[k]; } }
  return { paint, tex, cutin, purge, CUT };
})();
