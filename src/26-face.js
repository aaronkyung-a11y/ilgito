// ───────────────────────── anime faces ─────────────────────────
// Anime face painter. One drawing routine feeds both the 3D head texture and the 2D cut-in art, so the two always match.
// Face space is 512×256 (the head sphere's UV unwrap): the face front is centred on x = 128, eyes at y ≈ 113, mouth at y ≈ 170.
// Canvas left is the character's right.
const FACE = (() => {
  const cache = {};
  const col = (c) => new T.Color(c);
  const hx = (c) => '#' + col(c).getHexString();
  // w: half width, hu/hl: upper/lower lid height, rot: lift of the outer corner, ri: iris radius, lid: how far the upper lid cuts into the iris
  const EYES = {
    sharp: { w: 19, hu: 9.6, hl: 5.4, rot: 0.2, ri: 7.6, lid: 0.3 },
    round: { w: 16.5, hu: 13, hl: 9.6, rot: 0.07, ri: 7.2, lid: 0 },
    cold: { w: 20, hu: 7.6, hl: 4.4, rot: 0.16, ri: 7.2, lid: 0.5 },
    wild: { w: 17.5, hu: 11.5, hl: 7.6, rot: 0.25, ri: 5.2, lid: 0 },
    phoenix: { w: 21, hu: 7.2, hl: 4, rot: 0.27, ri: 7, lid: 0.45 },
    young: { w: 18, hu: 12.6, hl: 7.2, rot: 0.1, ri: 9.4, lid: 0.15 },
  };
  const EXPR = {
    idle: { open: 1, brow: 0, pupil: 1, mouth: 'set' },
    kiai: { open: 1.1, brow: 1, pupil: 0.74, mouth: 'shout', strain: 1 },
    hurt: { open: 0.55, brow: -0.8, pupil: 0.9, mouth: 'grit', wince: 1 },
    rage: { open: 1.18, brow: 1.35, pupil: 0.5, mouth: 'snarl', strain: 1, dark: 1 },
  };
  const keyOf = (look) => JSON.stringify([look.skin, look.hair, look.beard, look.patch, look.helm, look.face, look.armor2]);
  const bare = (look) => look.helm === 'crown' || look.helm === 'none';

  function paint(g, look, ex) {
    const F = look.face || {}, E = EXPR[ex] || EXPR.idle, eye = EYES[F.eye || 'sharp'];
    const W = 512, cx = 128, ink = '#1c0f0a';
    const skin = col(look.skin || 0xdcab82), hair = hx(look.hair || 0x1c1614), iris = col(F.iris || 0x6a3a1c);
    const sk = (m, red) => '#' + skin.clone().multiplyScalar(m).lerp(col(0xb04a34), red || 0).getHexString();
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.fillStyle = sk(1); g.fillRect(0, 0, W, 256);
    // flat shadow shapes: under the brow, one side of the nose, under the jaw, and a hard terminator down the character's left cheek
    g.fillStyle = sk(0.8, 0.13);
    [-1, 1].forEach((k) => { g.beginPath(); g.moveTo(cx + k * 5, 102); g.quadraticCurveTo(cx + k * 26, 94, cx + k * 49, 93); g.quadraticCurveTo(cx + k * 46, 104, cx + k * 30, 105); g.quadraticCurveTo(cx + k * 15, 106, cx + k * 5, 111); g.closePath(); g.fill(); });
    g.beginPath(); g.moveTo(cx + 2, 108); g.lineTo(cx + 9, 141); g.lineTo(cx + 13, 148); g.lineTo(cx + 3, 150); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(cx - 62, 150); g.quadraticCurveTo(cx - 50, 197, cx - 20, 213); g.lineTo(cx + 20, 213); g.quadraticCurveTo(cx + 50, 197, cx + 62, 150); g.lineTo(cx + 70, 256); g.lineTo(cx - 70, 256); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(cx + 64, 92); g.quadraticCurveTo(cx + 48, 128, cx + 51, 150); g.quadraticCurveTo(cx + 45, 178, cx + 30, 200); g.lineTo(cx + 74, 200); g.lineTo(cx + 80, 92); g.closePath(); g.fill();
    if (E.dark) {   // rage: the upper face falls into shadow and the eyes burn through it
      const gr = g.createLinearGradient(0, 74, 0, 134); gr.addColorStop(0, 'rgba(24,6,14,0.66)'); gr.addColorStop(0.72, 'rgba(24,6,14,0.5)'); gr.addColorStop(1, 'rgba(24,6,14,0)');
      g.fillStyle = gr; g.fillRect(cx - 72, 56, 144, 80);
    }
    // hair on the sides and back
    g.fillStyle = hair; g.beginPath(); g.moveTo(232, 0); g.quadraticCurveTo(222, 80, 226, 128); g.quadraticCurveTo(232, 150, 222, 172); g.lineTo(236, 256); g.lineTo(W, 256); g.lineTo(W, 0); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(24, 0); g.quadraticCurveTo(34, 80, 30, 128); g.quadraticCurveTo(24, 150, 34, 172); g.lineTo(20, 256); g.lineTo(0, 256); g.lineTo(0, 0); g.closePath(); g.fill();
    // eyes
    const open = E.open * (F.open || 1);
    [-1, 1].forEach((k) => {
      if (look.patch && k === 1) return;
      g.save(); g.translate(cx + k * 28, 113); g.scale(k, 1); g.rotate(-eye.rot);
      const w = eye.w, hu = eye.hu * open, hl = eye.hl * open;
      if (E.wince && k === -1) {     // squeezed shut
        g.strokeStyle = ink; g.lineWidth = 3.4; g.beginPath(); g.moveTo(-w, 1); g.quadraticCurveTo(-1, 6.5, w + 2, -3.5); g.stroke();
        g.lineWidth = 1.5; g.beginPath(); g.moveTo(w + 1, -2.5); g.lineTo(w + 8, -6.5); g.moveTo(w + 1, -1); g.lineTo(w + 8.5, 2); g.stroke();
      } else {
        const lid = () => { g.beginPath(); g.moveTo(-w, 1.5); g.bezierCurveTo(-w * 0.55, -hu * 1.15, w * 0.35, -hu * 1.2, w, -1.5); g.bezierCurveTo(w * 0.5, hl * 1.1, -w * 0.4, hl * 1.25, -w, 1.5); g.closePath(); };
        g.fillStyle = '#fbf6ec'; lid(); g.fill();
        g.save(); lid(); g.clip();
        const ir = eye.ri * lerp(1, E.pupil, 0.7), ix = -1.2, iy = -hu * 0.12 - eye.lid * 2.4;
        if (E.dark) { g.shadowColor = hx(iris.clone().lerp(col(0xffffff), 0.3)); g.shadowBlur = 7; }
        g.fillStyle = hx(iris.clone().multiplyScalar(0.42)); g.beginPath(); g.arc(ix, iy, ir, 0, TAU); g.fill();
        g.shadowBlur = 0;
        g.fillStyle = hx(iris); g.beginPath(); g.arc(ix, iy + ir * 0.1, ir * 0.84, 0, TAU); g.fill();
        g.fillStyle = hx(iris.clone().lerp(col(0xffffff), 0.42)); g.beginPath(); g.arc(ix, iy + ir * 0.46, ir * 0.5, 0, TAU); g.fill();
        g.fillStyle = '#0c0606'; g.beginPath(); g.arc(ix, iy, ir * 0.44 * E.pupil, 0, TAU); g.fill();
        g.fillStyle = 'rgba(46,18,12,0.4)'; g.fillRect(-w - 2, -hu * 1.3 - 2, 2 * w + 4, hu * 0.72 + 2);       // the lid's shadow on the eye
        g.fillStyle = '#ffffff'; g.beginPath(); g.arc(ix + ir * 0.44, iy - ir * 0.36, ir * 0.27, 0, TAU); g.fill();
        g.beginPath(); g.arc(ix - ir * 0.42, iy + ir * 0.44, ir * 0.13, 0, TAU); g.fill();
        g.restore();
        // upper lash: a tapered wedge with a flick past the outer corner
        g.fillStyle = ink; g.beginPath(); g.moveTo(-w - 1.5, 2.4); g.bezierCurveTo(-w * 0.55, -hu * 1.15 - 1.6, w * 0.35, -hu * 1.2 - 3.6, w + 4, -5);
        g.lineTo(w, -1.5); g.bezierCurveTo(w * 0.35, -hu * 1.2, -w * 0.55, -hu * 1.15, -w, 1.5); g.closePath(); g.fill();
        g.strokeStyle = ink; g.lineWidth = 1.3; g.beginPath(); g.moveTo(w * 0.1, hl * 1.06); g.quadraticCurveTo(w * 0.62, hl * 0.98, w * 0.99, -0.6); g.stroke();
        if (F.eye === 'young' || F.eye === 'round') { g.lineWidth = 1; g.beginPath(); g.moveTo(-w * 0.6, -hu * 1.05 - 3.4); g.quadraticCurveTo(w * 0.1, -hu * 1.3 - 4.6, w * 0.8, -hu * 0.9 - 4.2); g.stroke(); }
      }
      g.restore();
    });
    // brows: thick at the nose, sweeping up and out to a point. They slam down for a shout and tilt the other way in pain
    const b = E.brow, bt = F.brow || 1;
    g.fillStyle = hair;
    [-1, 1].forEach((k) => {
      const xi = cx + k * (7.5 - 2.2 * Math.max(b, 0)), yi = 100.5 + 5.2 * b, xo = cx + k * (F.browLong ? 56 : 50), yo = 87.5 - 2.6 * b, th = 7.2 * bt, dn = b < 0 ? 3 : 0;
      const mx = (xi + xo) / 2, my = (yi + yo) / 2;
      g.beginPath(); g.moveTo(xi, yi - th * 0.6); g.quadraticCurveTo(mx - k * 4, my - 6.5 - th * 0.35 + dn, xo, yo);
      g.quadraticCurveTo(mx, my - 1 + th * 0.2 + dn, xi + k * 1.2, yi + th * 0.5); g.closePath(); g.fill();
      if (bt > 1.4) for (let i = 0; i < 3; i++) {    // bushy: tufts along the top edge
        const u = 0.22 + i * 0.22, px = lerp(xi, xo, u), py = lerp(yi, yo, u) - 5 - th * 0.3;
        g.beginPath(); g.moveTo(px - k * 3.5, py + 3.5); g.lineTo(px + k * 1.5, py - 4); g.lineTo(px + k * 5, py + 3.5); g.closePath(); g.fill();
      }
    });
    // frown and strain lines, nose
    g.strokeStyle = ink;
    if (E.strain) {
      g.lineWidth = 1.7; g.beginPath(); g.moveTo(cx - 3.8, 95); g.lineTo(cx - 2.2, 106); g.moveTo(cx + 3.8, 95); g.lineTo(cx + 2.2, 106); g.moveTo(cx, 97); g.lineTo(cx, 103); g.stroke();
      g.lineWidth = 1.3;
      [-1, 1].forEach((k) => { g.beginPath(); g.moveTo(cx + k * 19, 128); g.lineTo(cx + k * 30, 131.5); g.moveTo(cx + k * 21, 133); g.lineTo(cx + k * 30, 136); g.moveTo(cx + k * 9.5, 117); g.lineTo(cx + k * 6.5, 124); g.stroke(); });
    } else { g.lineWidth = 1.4; g.beginPath(); g.moveTo(cx - 3.4, 98); g.lineTo(cx - 2.5, 105); g.moveTo(cx + 3.4, 98); g.lineTo(cx + 2.5, 105); g.stroke(); }
    g.lineWidth = 1.3; g.beginPath(); g.moveTo(cx + 5, 120); g.lineTo(cx + 8.5, 139); g.stroke();
    g.lineWidth = 1.8; g.beginPath(); g.moveTo(cx - 8, 146.5); g.quadraticCurveTo(cx - 5.5, 150, cx - 2, 148); g.moveTo(cx + 9, 146); g.quadraticCurveTo(cx + 6, 150.5, cx + 2, 148); g.stroke();
    g.strokeStyle = sk(0.62, 0.2); g.lineWidth = 1.5;
    [-1, 1].forEach((k) => { g.beginPath(); g.moveTo(cx + k * 43, 133); g.quadraticCurveTo(cx + k * 37, 141, cx + k * 28, 144); g.stroke(); });
    // beard (under the mouth, so the mouth always reads)
    const bd = look.beard || 0;
    g.fillStyle = hair;
    if (bd === 1 || bd === 2) {
      [-1, 1].forEach((k) => { g.beginPath(); g.moveTo(cx + k * 1, 156); g.quadraticCurveTo(cx + k * 14, 153, cx + k * 29, 168 + (bd === 2 ? 9 : 2)); g.quadraticCurveTo(cx + k * 14, 162, cx + k * 1, 163); g.closePath(); g.fill(); });
      g.beginPath(); g.moveTo(cx - 54, 148); g.quadraticCurveTo(cx - 46, 196, cx - 16, 212); g.lineTo(cx + 16, 212); g.quadraticCurveTo(cx + 46, 196, cx + 54, 148);
      g.quadraticCurveTo(cx + 36, 180, cx + 14, 184); g.quadraticCurveTo(cx, 177, cx - 14, 184); g.quadraticCurveTo(cx - 36, 180, cx - 54, 148); g.fill();
      g.beginPath(); g.moveTo(cx - 5, 178); g.lineTo(cx + 5, 178); g.lineTo(cx + 3, 192); g.lineTo(cx - 3, 192); g.closePath(); g.fill();
      g.fillRect(cx - 30, 206, 60, 50);
      if (F.whisk) [-1, 1].forEach((k) => { for (let i = 0; i < 4; i++) { const y = 150 + i * 11; g.beginPath(); g.moveTo(cx + k * 50, y); g.lineTo(cx + k * (66 + i * 2), y - 9); g.lineTo(cx + k * 52, y + 9); g.closePath(); g.fill(); } });   // bristling "tiger whiskers"
    } else if (bd === 3) {     // thin moustache and a goatee
      [-1, 1].forEach((k) => { g.beginPath(); g.moveTo(cx + k * 1.5, 157); g.quadraticCurveTo(cx + k * 14, 155, cx + k * 23, 177); g.quadraticCurveTo(cx + k * 13, 162.5, cx + k * 1.5, 162); g.closePath(); g.fill(); });
      g.beginPath(); g.moveTo(cx - 7, 184); g.quadraticCurveTo(cx, 181, cx + 7, 184); g.lineTo(cx + 2.5, 216); g.lineTo(cx - 2.5, 216); g.closePath(); g.fill();
    } else if (bd === 4) {     // mutton chops and stubble
      [-1, 1].forEach((k) => { g.beginPath(); g.moveTo(cx + k * 66, 108); g.lineTo(cx + k * 53, 118); g.quadraticCurveTo(cx + k * 51, 160, cx + k * 34, 188); g.lineTo(cx + k * 47, 198); g.quadraticCurveTo(cx + k * 63, 172, cx + k * 72, 140); g.closePath(); g.fill(); });
      const r = mulberry(7); g.fillStyle = 'rgba(28,18,14,0.5)';
      for (let i = 0; i < 110; i++) { const a = r() * PI, rr = 20 + r() * 24; g.fillRect(cx + Math.cos(a) * rr * 1.25, 170 + Math.sin(a) * rr * 0.9, 1.1, 1.7); }
    }
    // mouth
    const mo = E.mouth === 'set' ? F.mouth || 'set' : E.mouth, my = 170;
    g.strokeStyle = ink;
    if (mo === 'set' || mo === 'smirk') {
      const up = mo === 'smirk' ? 4 : 0;
      g.lineWidth = 2.6; g.beginPath(); g.moveTo(cx - 16, my + 1); g.quadraticCurveTo(cx - 8, my - 3.2, cx, my - 1.6); g.quadraticCurveTo(cx + 8, my - 3.2, cx + 16, my + 1 - up); g.stroke();
      g.lineWidth = 1.4; g.beginPath(); g.moveTo(cx - 18, my - 1.5); g.lineTo(cx - 20, my + 3); g.moveTo(cx + 18, my - 1.5 - up); g.lineTo(cx + 20.5, my + 2.5 - up * 1.4); g.stroke();
      if (!bd || bd > 2) { g.fillStyle = sk(0.8, 0.13); g.beginPath(); g.moveTo(cx - 10, my + 8); g.quadraticCurveTo(cx, my + 13, cx + 10, my + 8); g.quadraticCurveTo(cx, my + 10, cx - 10, my + 8); g.fill(); }
    } else if (mo === 'grin') {
      const path = () => { g.beginPath(); g.moveTo(cx - 17, my - 3); g.quadraticCurveTo(cx, my - 0.5, cx + 17, my - 5.5); g.quadraticCurveTo(cx + 3, my + 8.5, cx - 17, my - 3); g.closePath(); };
      g.fillStyle = '#f6f0e4'; path(); g.fill();
      g.save(); path(); g.clip(); g.lineWidth = 1; for (let i = -2; i <= 3; i++) { g.beginPath(); g.moveTo(cx + i * 5, my - 6); g.lineTo(cx + i * 4.6, my + 8); g.stroke(); } g.restore();
      g.lineWidth = 2.1; path(); g.stroke();
    } else if (mo === 'shout') {
      const mw = 15.5, top = my - 9, bot = my + 19;
      const path = () => { g.beginPath(); g.moveTo(cx - mw, top + 3.5); g.quadraticCurveTo(cx, top - 3, cx + mw, top + 3.5); g.quadraticCurveTo(cx + mw * 0.92, bot - 7, cx + mw * 0.55, bot - 1.5); g.quadraticCurveTo(cx, bot + 3.5, cx - mw * 0.55, bot - 1.5); g.quadraticCurveTo(cx - mw * 0.92, bot - 7, cx - mw, top + 3.5); g.closePath(); };
      g.fillStyle = '#3b0d0d'; path(); g.fill();
      g.save(); path(); g.clip();
      g.fillStyle = '#c04a40'; g.beginPath(); g.ellipse(cx, bot - 3.5, mw * 0.62, 6.5, 0, 0, TAU); g.fill();
      g.fillStyle = '#f6f0e4'; g.beginPath(); g.moveTo(cx - mw, top); g.quadraticCurveTo(cx, top - 4, cx + mw, top); g.lineTo(cx + mw, top + 6.5); g.quadraticCurveTo(cx, top + 2.5, cx - mw, top + 6.5); g.closePath(); g.fill();
      if (F.fang) [-1, 1].forEach((k) => { g.beginPath(); g.moveTo(cx + k * 7.5, top + 4); g.lineTo(cx + k * 10.5, top + 12); g.lineTo(cx + k * 13, top + 4.5); g.closePath(); g.fill(); });
      g.beginPath(); g.moveTo(cx - mw * 0.7, bot - 6.5); g.quadraticCurveTo(cx, bot - 1.5, cx + mw * 0.7, bot - 6.5); g.lineTo(cx + mw * 0.7, bot - 9.5); g.quadraticCurveTo(cx, bot - 5, cx - mw * 0.7, bot - 9.5); g.closePath(); g.fill();
      g.restore();
      g.lineWidth = 2.3; path(); g.stroke();
      g.lineWidth = 1.4; [-1, 1].forEach((k) => { g.beginPath(); g.moveTo(cx + k * (mw + 3), top + 1); g.quadraticCurveTo(cx + k * (mw + 6.5), my + 4, cx + k * (mw + 2), bot - 4); g.stroke(); });
    } else {       // grit / snarl: clenched teeth
      const sn = mo === 'snarl' ? 1 : 0, mw = 16;
      const path = () => { g.beginPath(); g.moveTo(cx - mw, my - 4 - sn * 3.5); g.quadraticCurveTo(cx - 2, my - 7 - sn, cx + mw, my - 3.5); g.quadraticCurveTo(cx + mw + 1.5, my + 2, cx + mw - 1.5, my + 6.5); g.quadraticCurveTo(cx, my + 10.5, cx - mw + 1.5, my + 6.5 + sn); g.quadraticCurveTo(cx - mw - 1.5, my + 1, cx - mw, my - 4 - sn * 3.5); g.closePath(); };
      g.fillStyle = '#f6f0e4'; path(); g.fill();
      g.save(); path(); g.clip(); g.lineWidth = 1.1; g.strokeStyle = 'rgba(28,15,10,0.75)';
      g.beginPath(); g.moveTo(cx - mw, my + 1.2 - sn); g.quadraticCurveTo(cx, my - 1.2, cx + mw, my + 1.5); g.stroke();
      for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(cx + i * 4.6, my - 10); g.lineTo(cx + i * 4.4, my + 12); g.stroke(); }
      g.restore();
      g.strokeStyle = ink; g.lineWidth = 2.3; path(); g.stroke();
    }
    // marks
    if (F.mark === 'scarNose') {
      g.strokeStyle = sk(0.6, 0.55); g.lineWidth = 2.6; g.beginPath(); g.moveTo(cx - 36, 132); g.quadraticCurveTo(cx - 4, 122, cx + 30, 125); g.stroke();
      g.lineWidth = 1.4; for (let i = 0; i < 5; i++) { const x = cx - 28 + i * 13, y = 129.5 - i * 1.4; g.beginPath(); g.moveTo(x - 1, y - 4.5); g.lineTo(x + 1.5, y + 4.5); g.stroke(); }
    }
    if (F.mark === 'paint') {
      g.fillStyle = hx(F.paint || 0xb8281c);
      [-1, 1].forEach((k) => { for (let i = 0; i < 2; i++) { const x0 = cx + k * (17 + i * 2), y0 = 127 + i * 9; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + k * 27, y0 + 5 + i * 2); g.lineTo(x0 + k * 26, y0 + 9.5 + i * 2); g.lineTo(x0 + k * 1, y0 + 3.6); g.closePath(); g.fill(); } });
    }
    if (look.patch) {
      g.fillStyle = '#0e0b0a'; g.beginPath(); g.ellipse(cx + 27, 111, 20, 14, -0.1, 0, TAU); g.fill();
      g.strokeStyle = '#0e0b0a'; g.lineWidth = 5; g.beginPath(); g.moveTo(cx - 70, 70); g.lineTo(cx + 27, 108); g.lineTo(cx + 100, 122); g.stroke();
      g.strokeStyle = sk(0.6, 0.5); g.lineWidth = 2; g.beginPath(); g.moveTo(cx + 13, 84); g.lineTo(cx + 18, 94); g.moveTo(cx + 38, 128); g.lineTo(cx + 42, 138); g.stroke();
    }
    if (look.scar) { g.strokeStyle = sk(0.6, 0.5); g.lineWidth = 2.2; g.beginPath(); g.moveTo(cx - 44, 96); g.lineTo(cx - 30, 150); g.stroke(); }
    // hairline for bare heads: a widow's peak, or jagged bangs
    if (bare(look)) {
      g.fillStyle = hair; g.beginPath(); g.moveTo(0, 0); g.lineTo(W, 0); g.lineTo(W, 70); g.lineTo(232, 70);
      if (F.hairline === 'spiky') [[204, 62], [192, 86], [180, 62], [168, 92], [153, 60], [142, 88], [128, 58], [113, 90], [102, 60], [89, 86], [77, 62], [65, 84], [54, 62]].forEach((p) => g.lineTo(p[0], p[1]));
      else { g.quadraticCurveTo(190, 50, cx + 8, 62); g.lineTo(cx, 71); g.lineTo(cx - 8, 62); g.quadraticCurveTo(66, 50, 24, 70); }
      g.lineTo(24, 70); g.lineTo(0, 70); g.closePath(); g.fill();
    }
    if (E.dark) {      // the anger mark on the temple
      g.strokeStyle = '#e03a22'; g.lineWidth = 2.3; const vx = cx + 47, vy = 80;
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach((q) => { g.beginPath(); g.moveTo(vx + q[0] * 1.5, vy + q[1] * 6.5); g.quadraticCurveTo(vx + q[0] * 1.8, vy + q[1] * 1.8, vx + q[0] * 6.5, vy + q[1] * 1.5); g.stroke(); });
    }
  }

  // the head texture. Only the resting face is drawn at full size; the others are swapped in for moments
  function tex(look, ex) {
    ex = ex || 'idle'; const k = 't' + ex + keyOf(look);
    if (cache[k]) return cache[k];
    const c = document.createElement('canvas'); c.width = ex === 'idle' ? 1024 : 512; c.height = c.width / 2;
    const g = c.getContext('2d'); g.scale(c.width / 512, c.width / 512); paint(g, look, ex);
    const t = new T.CanvasTexture(c); t.anisotropy = 4;
    return (cache[k] = t);
  }

  // cut-in art: the face from brow to chin, with the helmet brim (or bangs) and its shadow drawn over it
  const CUT = { x: 60, y: 72, w: 136, h: 132, s: 5 };
  function cutin(look, ex) {
    const k = 'c' + ex + keyOf(look);
    if (cache[k]) return cache[k];
    const c = document.createElement('canvas'); c.width = CUT.w * CUT.s; c.height = CUT.h * CUT.s;
    const g = c.getContext('2d'); g.scale(CUT.s, CUT.s); g.translate(-CUT.x, -CUT.y);
    paint(g, look, ex);
    const F = look.face || {}, cx = 128, x0 = CUT.x, x1 = CUT.x + CUT.w, y0 = CUT.y, ink = '#1c0f0a';
    const shade = '#' + col(look.skin || 0xdcab82).multiplyScalar(0.6).lerp(col(0x5a2a4a), 0.25).getHexString();
    const hair = hx(look.hair || 0x1c1614);
    if (F.bangs) {      // locks of hair falling over the brow
      g.fillStyle = hair; g.strokeStyle = ink; g.lineWidth = 1; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0, 90);
      const tips = F.bangs;
      for (let i = 0; i < tips.length; i++) { g.lineTo(cx + tips[i][0], tips[i][1]); const nx = i + 1 < tips.length ? tips[i + 1][0] : x1 - cx; g.lineTo(cx + (tips[i][0] + nx) / 2, 82); }
      g.lineTo(x1, 90); g.lineTo(x1, y0); g.closePath(); g.fill(); g.stroke();
    }
    if (!bare(look) || F.band) {      // helmet brim, head wrap or headband, and the shadow it throws
      const brim = hx(F.brim || celC(look.armor2 || 0x2a2622, 0.72)), trim = hx(F.trim || 0xdcae4a), by = F.band ? 76 : 80;
      const edge = (dy) => { g.moveTo(x0, by + dy); g.quadraticCurveTo(cx, by + 11 + dy, x1, by + dy); };
      if (!F.band) { g.globalAlpha = 0.55; g.fillStyle = shade; g.beginPath(); edge(13); g.lineTo(x1, y0); g.lineTo(x0, y0); g.closePath(); g.fill(); g.globalAlpha = 1; }
      g.fillStyle = brim; g.beginPath(); edge(0); g.lineTo(x1, F.band ? by - 12 : y0); g.quadraticCurveTo(cx, F.band ? by - 1 : y0, x0, F.band ? by - 12 : y0); g.closePath(); g.fill();
      g.strokeStyle = trim; g.lineWidth = F.band ? 1.4 : 3; g.beginPath(); edge(0); g.stroke();
      g.strokeStyle = ink; g.lineWidth = 1.2; g.beginPath(); edge(F.band ? 0.8 : 2.2); g.stroke();
      if (!F.band) { g.fillStyle = trim; g.beginPath(); g.moveTo(cx, 77); g.lineTo(cx + 6, 85); g.lineTo(cx, 94); g.lineTo(cx - 6, 85); g.closePath(); g.fill(); g.stroke(); }
    }
    return (cache[k] = c);
  }
  function purge() { for (const k in cache) { if (cache[k].isTexture) cache[k].dispose(); delete cache[k]; } }
  return { paint, tex, cutin, purge, CUT };
})();
