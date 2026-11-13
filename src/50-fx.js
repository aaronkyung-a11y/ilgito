// ───────────────────────── fx: world particles + 2D brush layer ─────────────────────────
const FX = (() => {
  const sparks = new Particles(460, true, 0.08, 1);
  const dust = new Particles(280, false, 0.0);
  dust.points.renderOrder = 5; sparks.points.renderOrder = 6;
  World.scene.add(dust.points, sparks.points);
  function sparkBurst(p, n, power, dir) {
    for (let i = 0; i < n; i++) {
      let vx = rnd(-1, 1), vy = rnd(-0.5, 1), vz = rnd(-1, 1);
      const l = Math.hypot(vx, vy, vz) || 1, sp = rnd(1.5, 10) * power;
      vx = (vx / l) * sp; vy = (vy / l) * sp + 1.5; vz = (vz / l) * sp;
      if (dir) { vx += dir.x * 3.5 * power; vy += dir.y * 3.5 * power; vz += dir.z * 3.5 * power; }
      const hot = Math.random();
      sparks.emit(p.x + rnd(-0.05, 0.05), p.y + rnd(-0.05, 0.05), p.z + rnd(-0.05, 0.05), vx, vy, vz,
        rnd(0.25, 0.8), rnd(0.05, 0.14), 1, 0.5 + hot * 0.45, 0.12 + hot * 0.55, 1, 12, 1.3, 0);
    }
    sparks.emit(p.x, p.y, p.z, 0, 0, 0, 0.11, 0.34 * power, 1, 0.95, 0.82, 0.85, 0, 0, 0.5 * power);     // the impact star
  }
  function shardBurst(p, n, r, g, b, dir) {
    for (let i = 0; i < n; i++) {
      const sp = rnd(1.5, 6);
      sparks.emit(p.x, p.y, p.z, rnd(-1, 1) * sp + (dir ? dir.x * 3 : 0), rnd(0.2, 1.2) * sp, rnd(-1, 1) * sp + (dir ? dir.z * 3 : 0),
        rnd(0.3, 0.7), rnd(0.1, 0.22), r, g, b, 0.9, 11, 0.8, 0);
    }
  }
  function dustBurst(p, n, spread, up, big) {
    const c = World.dust; big = big || 1;
    for (let i = 0; i < n; i++) {
      dust.emit(p.x + rnd(-spread, spread), rnd(0.1, 0.5), p.z + rnd(-spread, spread), rnd(-1.4, 1.4) * big, rnd(0.3, 1.5) * up, rnd(-1.4, 1.4) * big,
        rnd(0.8, 1.7), rnd(0.32, 0.72) * big, c.r, c.g, c.b, rnd(0.3, 0.5), -0.12, 1.1, rnd(0.6, 1.5) * big);
    }
  }
  function update(dt) { sparks.update(dt); dust.update(dt); }
  function clear() { sparks.clear(); dust.clear(); }
  return { sparkBurst, shardBurst, dustBurst, update, clear };
})();

const F2 = (() => {
  const cv = $('fx'), g = cv.getContext('2d');
  let W = 1, H = 1, dpr = 1, U = 4;
  const pops = [], streaks = [], bursts = [], nums = [];
  let flashA = 0, flashRGB = '255,255,255', speed = 0, lineT = 0, tAll = 0;
  const lines = [], jag = [];
  for (let i = 0; i < 40; i++) lines.push({ a: rnd(TAU), r: Math.random(), l: Math.random(), w: Math.random(), o: Math.random() });
  for (let i = 0; i < 52; i++) jag.push(Math.random());
  const wipe = { on: false, t: 0, dur: 1.2, text: '', sub: '', mid: null, done: null, midFired: false };
  const BR = '"Yuji Boku","Noto Serif KR","AppleMyungjo",serif', HD = '"East Sea Dokdo","Yuji Boku","Noto Serif KR",cursive', BD = '"Hahmlet","Noto Serif KR",sans-serif';
  function resize(w, h) {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5); W = w; H = h;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); U = Math.min(w, h) / 100;
  }
  function pop(text, sub, o) {
    o = o || {};
    // one big calligraphy stamp at a time: a new one pushes the old one out quickly
    if (text) for (let i = 0; i < pops.length; i++) if (pops[i].text && pops[i].t < pops[i].dur * 0.72) pops[i].t = pops[i].dur * 0.8;
    pops.push({ text, sub, t: 0, dur: o.dur || 0.95, size: o.size || 30, color: o.color || '#eadfc8', x: o.x === undefined ? 0.5 : o.x, y: o.y === undefined ? 0.33 : o.y, rot: o.rot === undefined ? rnd(-0.12, 0.12) : o.rot, ink: o.ink !== false });
    if (pops.length > 5) pops.shift();
  }
  function streak(x0, y0, x1, y1, rgb, wide) {
    streaks.push({ x0, y0, x1, y1, t: 0, dur: 0.22, rgb: rgb || '255,255,255', wide: wide || 1, bend: rnd(-0.12, 0.12) });
    if (streaks.length > 14) streaks.shift();
  }
  function burst(x, y, rgb, size) {
    const rays = []; const n = 9 + ((Math.random() * 5) | 0);
    for (let i = 0; i < n; i++) rays.push({ a: (i / n) * TAU + rnd(-0.25, 0.25), l: rnd(0.5, 1.5) });
    bursts.push({ x, y, t: 0, dur: 0.3, rgb: rgb || '255,240,200', size: size || 1, rays });
    if (bursts.length > 10) bursts.shift();
  }
  function flash(a, rgb) { a *= REDUCED ? 0.4 : 1; if (a > flashA) { flashA = a; flashRGB = rgb || '255,255,255'; } }
  function num(x, y, text, color, size) { nums.push({ x, y, text, color: color || '#eadfc8', size: size || 20, t: 0, dur: 0.7, vx: rnd(-18, 18) }); if (nums.length > 16) nums.shift(); }
  function setSpeed(v) { speed = v; }
  function startWipe(text, sub, mid, done) { wipe.on = true; wipe.t = 0; wipe.text = text; wipe.sub = sub || ''; wipe.mid = mid; wipe.done = done; wipe.midFired = false; }
  function clear() { pops.length = streaks.length = bursts.length = nums.length = 0; flashA = 0; wipe.on = false; speed = 0; kiais.length = 0; cut.on = false; focusA = focusHold = impT = 0; if (glFilter) glCv.style.filter = glFilter = ''; }
  // ── anime layer: focus lines (집중선), impact frames, shout balloons and cut-in bands
  const glCv = $('gl'), kiais = [], cut = { on: false, t: 0 };
  let focusA = 0, focusHold = 0, focusX = 0.5, focusY = 0.42, impT = 0, impDur = 1, impInv = true, glFilter = '';
  function focus(v, x, y, hold) { if (REDUCED) v *= 0.5; focusA = Math.max(focusA, v); if (x !== undefined) { focusX = x; focusY = y; } focusHold = Math.max(focusHold, hold || 0); }
  // a few frames of stark black-and-white: first inverted, then hard contrast
  function impact(dur, x, y) { if (REDUCED) return; impT = impDur = dur || 0.1; if (x !== undefined) { focusX = x; focusY = y; } }
  function kiai(text, o) {
    o = o || {};
    kiais.push({ text, x: o.x === undefined ? 0.5 : o.x, y: o.y === undefined ? 0.3 : o.y, px: !!o.px, size: o.size || 11, t: 0, dur: o.dur || 0.6, rot: o.rot === undefined ? rnd(-0.2, 0.2) : o.rot, color: o.color || '#141010', fill: o.fill || '#fffdf4', seed: (Math.random() * 1e6) | 0 });
    if (kiais.length > 4) kiais.shift();
  }
  // o: { art (canvas from FACE.cutin), rgb, text, sub, side (1: face on the left, -1: on the right), dur, y, mode: 'face' | 'eyes' }
  function cutin(o) {
    kiais.length = 0;
    cut.on = true; cut.t = 0; cut.dur = o.dur || 0.85; cut.art = o.art; cut.rgb = o.rgb || '200,60,40'; cut.text = o.text || ''; cut.sub = o.sub || '';
    cut.side = o.side || 1; cut.y = o.y === undefined ? 0.4 : o.y; cut.eyes = o.mode === 'eyes'; cut.seed = (Math.random() * 1e6) | 0;
  }
  function drawFocus(a, dark) {
    const px = focusX * W, py = focusY * H, R = Math.hypot(W, H), m = Math.min(W, H), n = 72;
    const r = mulberry(((tAll * 20) | 0) * 131 + 7);       // re-rolled 20 times a second, like drawings shot on twos
    g.fillStyle = dark ? `rgba(14,10,10,${a})` : `rgba(255,252,244,${a})`;
    g.beginPath();
    for (let i = 0; i < n; i++) {
      const ang = ((i + r() * 0.9) / n) * TAU, wv = 0.004 + r() * r() * 0.022, r0 = m * (0.34 + r() * 0.3) * (1.25 - 0.4 * Math.min(1, a));
      g.moveTo(px + Math.cos(ang) * r0, py + Math.sin(ang) * r0);
      g.lineTo(px + Math.cos(ang - wv) * R, py + Math.sin(ang - wv) * R);
      g.lineTo(px + Math.cos(ang + wv) * R, py + Math.sin(ang + wv) * R);
    }
    g.fill();
  }
  function drawCutin(rdt) {
    cut.t += rdt;
    if (cut.t >= cut.dur) { cut.on = false; return; }
    const open = EASE.out(sat(cut.t / 0.09)) * (1 - sat((cut.t - (cut.dur - 0.11)) / 0.11));
    const bh = Math.max(H * 0.27, Math.min(W, H) * 0.36), sl = bh * 0.3 * cut.side, yc = cut.y * H, hh = bh * 0.5 * open, ang = -Math.atan2(2 * sl, W);
    const yAt = (x) => yc + sl * (1 - (2 * x) / W);
    g.fillStyle = `rgba(8,6,6,${0.4 * open})`; g.fillRect(0, 0, W, H);
    g.save();
    g.beginPath(); g.moveTo(-10, yAt(-10) - hh); g.lineTo(W + 10, yAt(W + 10) - hh); g.lineTo(W + 10, yAt(W + 10) + hh); g.lineTo(-10, yAt(-10) + hh); g.closePath(); g.clip();
    const gr = g.createLinearGradient(cut.side > 0 ? 0 : W, 0, cut.side > 0 ? W : 0, 0);
    gr.addColorStop(0, `rgb(${cut.rgb})`); gr.addColorStop(1, '#140e10');
    g.fillStyle = gr; g.fillRect(0, yc - bh - Math.abs(sl), W, 2 * (bh + Math.abs(sl)));
    const r = mulberry(cut.seed);
    g.save(); g.translate(W / 2, yc); g.rotate(ang);      // streaks rushing along the band
    for (let i = 0; i < 30; i++) {
      const yy = (r() - 0.5) * bh * 1.25, len = W * (0.2 + r() * 0.6), sp = 1.6 + r() * 2.6, th = 1 + r() * r() * bh * 0.07, u = (r() + cut.t * sp) % 1;
      g.fillStyle = i % 3 ? 'rgba(255,255,255,0.45)' : 'rgba(10,6,8,0.4)'; g.fillRect(lerp(-W, W, u) * -cut.side - len / 2, yy, len, th);
    }
    g.restore();
    const C = FACE.CUT, sc = bh / (cut.eyes ? 60 : 126), fy = cut.eyes ? 108 : 139;
    const xf = (cut.eyes ? W * 0.5 : W * (cut.side > 0 ? 0.36 : 0.64)) - cut.side * ((1 - EASE.out(sat(cut.t / 0.14))) * W * 0.7 - cut.t * 14);
    g.save(); g.translate(xf, yAt(xf)); g.rotate(ang);
    g.drawImage(cut.art, -(128 - C.x) * sc, -(fy - C.y) * sc, C.w * sc, C.h * sc);
    g.restore();
    g.restore();
    g.strokeStyle = '#0e0b09'; g.lineWidth = Math.max(4, bh * 0.05);
    g.beginPath(); g.moveTo(-10, yAt(-10) - hh); g.lineTo(W + 10, yAt(W + 10) - hh); g.moveTo(-10, yAt(-10) + hh); g.lineTo(W + 10, yAt(W + 10) + hh); g.stroke();
    g.strokeStyle = `rgb(${cut.rgb})`; g.lineWidth = Math.max(1.5, bh * 0.014); const d = bh * 0.05;
    g.beginPath(); g.moveTo(-10, yAt(-10) - hh - d); g.lineTo(W + 10, yAt(W + 10) - hh - d); g.moveTo(-10, yAt(-10) + hh + d); g.lineTo(W + 10, yAt(W + 10) + hh + d); g.stroke();
    if (cut.text) {
      const tx = cut.eyes ? W * 0.5 : W * (cut.side > 0 ? 0.74 : 0.26), fs0 = bh * (cut.eyes ? 0.34 : 0.4), pk = lerp(1.9, 1, EASE.out(sat((cut.t - 0.05) / 0.15)));
      g.save(); g.translate(tx + Math.sin(tAll * 80) * fs0 * 0.02, yAt(tx) + (cut.eyes ? hh + fs0 * 0.75 : bh * 0.02)); g.rotate(ang - 0.05); g.globalAlpha = open * sat((cut.t - 0.04) / 0.05);
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
      let fs = fs0 * pk; g.font = `400 ${fs}px ${HD}`;
      const tw = g.measureText(cut.text).width, maxW = W * (cut.eyes ? 0.9 : 0.5); if (tw > maxW) { fs *= maxW / tw; g.font = `400 ${fs}px ${HD}`; }
      g.lineWidth = fs * 0.22; g.strokeStyle = '#0e0b09'; g.strokeText(cut.text, 0, 0); g.fillStyle = '#fffdf2'; g.fillText(cut.text, 0, 0);
      if (cut.sub) { const ss = Math.max(15, fs0 * 0.34); g.font = `400 ${ss}px ${BR}`; g.lineWidth = ss * 0.24; g.strokeText(cut.sub, 0, fs * 0.74); g.fillStyle = '#ffd27a'; g.fillText(cut.sub, 0, fs * 0.74); }
      g.restore();
    }
  }
  function drawKiai(rdt) {
    for (let i = kiais.length - 1; i >= 0; i--) {
      const k = kiais[i]; k.t += rdt; const u = k.t / k.dur;
      if (u >= 1) { kiais.splice(i, 1); continue; }
      const sc = k.t < 0.07 ? lerp(0.3, 1.2, k.t / 0.07) : k.t < 0.14 ? lerp(1.2, 1, (k.t - 0.07) / 0.07) : 1 + (k.t - 0.14) * 0.06;
      const fs = k.size * U * sc, sh = k.t < 0.3 ? fs * 0.035 : 0;
      g.save(); g.translate((k.px ? k.x : k.x * W) + Math.sin(tAll * 95) * sh, (k.px ? k.y : k.y * H) + Math.cos(tAll * 83) * sh); g.rotate(k.rot); g.globalAlpha = u > 0.8 ? (1 - u) / 0.2 : 1;
      g.font = `400 ${fs}px ${HD}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      const tw = g.measureText(k.text).width, rx = tw * 0.5 + fs * 0.42, ry = fs * 0.74, n = 9 + Math.round(tw / fs) * 2, r = mulberry(k.seed);
      g.beginPath();       // a spiky shout balloon
      for (let j = 0; j < n * 2; j++) { const a = (j / (n * 2)) * TAU, rr = j % 2 ? 0.86 + r() * 0.08 : 1.2 + r() * 0.34, x = Math.cos(a) * rx * rr, y = Math.sin(a) * ry * rr; if (j) g.lineTo(x, y); else g.moveTo(x, y); }
      g.closePath(); g.fillStyle = k.fill; g.fill(); g.lineJoin = 'miter'; g.lineWidth = Math.max(2.5, fs * 0.07); g.strokeStyle = '#141010'; g.stroke();
      g.fillStyle = k.color; g.fillText(k.text, 0, fs * 0.05);
      g.restore();
    }
  }


  function drawIndicator(ind) {
    const R0 = clamp(Math.min(W, H) * 0.085, 30, 54);
    const top = Math.max(H * 0.2, 128);
    const pos = { L: [W * 0.17, H * 0.43], R: [W * 0.83, H * 0.43], U: [W * 0.5, top], D: [W * 0.5, H * 0.66] }[ind.dir];
    const x = pos[0], y = pos[1], k = sat(ind.remain / ind.wind), hot = ind.remain <= ind.pw;
    const rgb = hot ? '255,250,225' : ind.heavy ? '226,62,36' : '226,180,86';
    const pulse = 1 + (ind.heavy ? 0.07 * Math.sin(tAll * 26) : 0) + (hot ? 0.12 : 0);
    const gr = g.createRadialGradient(x, y, R0 * 0.3, x, y, R0 * 2.3);
    gr.addColorStop(0, `rgba(${rgb},${hot ? 0.55 : 0.34})`); gr.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, R0 * 2.3, 0, TAU); g.fill();
    g.fillStyle = 'rgba(14,11,9,0.62)'; g.beginPath(); g.arc(x, y, R0 * pulse, 0, TAU); g.fill();
    g.lineWidth = hot ? 5 : 3.5; g.strokeStyle = `rgba(${rgb},1)`; g.stroke();
    // chevrons pointing where to swipe
    const ang = { L: PI, R: 0, U: -PI / 2, D: PI / 2 }[ind.dir];
    g.save(); g.translate(x, y); g.rotate(ang); g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = `rgba(${rgb},1)`; g.lineWidth = R0 * 0.17;
    const slide = ((tAll * 2.2) % 1) * R0 * 0.22;
    for (let i = 0; i < 2; i++) {
      const ox = -R0 * 0.3 + i * R0 * 0.42 + slide;
      g.globalAlpha = i ? 1 : 0.55;
      g.beginPath(); g.moveTo(ox - R0 * 0.2, -R0 * 0.36); g.lineTo(ox + R0 * 0.16, 0); g.lineTo(ox - R0 * 0.2, R0 * 0.36); g.stroke();
    }
    g.globalAlpha = 1; g.restore();
    // closing ring = timing
    g.strokeStyle = `rgba(255,250,235,${0.35 + 0.6 * (1 - k)})`; g.lineWidth = 3;
    g.beginPath(); g.arc(x, y, R0 * (1 + 1.8 * k), 0, TAU); g.stroke();
    if (ind.heavy) {
      const fs = R0 * 1.25 * (1 + 0.06 * Math.sin(tAll * 20));
      g.font = `400 ${fs}px ${BR}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      const ty = ind.dir === 'U' ? y + R0 * 2.2 : y - R0 * 2.0;
      g.lineWidth = fs * 0.14; g.strokeStyle = 'rgba(14,11,9,0.95)'; g.lineJoin = 'round'; g.strokeText('危', x, ty);
      g.fillStyle = '#ff4a2a'; g.fillText('危', x, ty);
    }
    if (ind.tut) { // ghost finger
      const ph = (tAll * 1.1) % 1, dx = Math.cos(ang), dy = Math.sin(ang), tr = R0 * 2.6;
      const fx = x - dx * tr * 0.2 + dx * tr * EASE.out(ph), fy = y - dy * tr * 0.2 + dy * tr * EASE.out(ph);
      g.fillStyle = `rgba(234,223,200,${0.85 * (1 - ph)})`; g.beginPath(); g.arc(fx, fy, R0 * 0.32, 0, TAU); g.fill();
      g.strokeStyle = `rgba(234,223,200,${0.5 * (1 - ph)})`; g.lineWidth = R0 * 0.2; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x - dx * tr * 0.2, y - dy * tr * 0.2); g.lineTo(fx, fy); g.stroke();
    }
  }
  function draw(rdt, ind) {
    tAll += rdt;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    const M = Math.max(W, H);
    // speed lines
    if (speed > 0.03 && !REDUCED) {
      lineT += rdt * (0.9 + speed * 1.6);
      const cx = W / 2, cy = H * 0.44;
      g.lineCap = 'round';
      for (let i = 0; i < lines.length; i++) {
        const L = lines[i], ph = (lineT * (0.7 + L.r) + L.o) % 1;
        const r0 = lerp(0.2, 0.95, ph) * M * 0.72, len = (0.05 + 0.2 * L.l) * M * speed * (0.4 + ph);
        const a = speed * (0.1 + 0.3 * L.w) * Math.sin(PI * ph);
        g.strokeStyle = `rgba(255,246,228,${a})`; g.lineWidth = 1 + 2.6 * L.w;
        const ca = Math.cos(L.a), sa = Math.sin(L.a);
        g.beginPath(); g.moveTo(cx + ca * r0, cy + sa * r0); g.lineTo(cx + ca * (r0 + len), cy + sa * (r0 + len)); g.stroke();
      }
    }
    if (focusA > 0.02) { drawFocus(Math.min(1, focusA) * 0.85, false); if (focusHold > 0) focusHold -= rdt; else focusA = Math.max(0, focusA - rdt * 2.6); }
    if (ind) drawIndicator(ind);
    // slash streaks
    for (let i = streaks.length - 1; i >= 0; i--) {
      const s = streaks[i]; s.t += rdt; const k = s.t / s.dur;
      if (k >= 1) { streaks.splice(i, 1); continue; }
      const dx = s.x1 - s.x0, dy = s.y1 - s.y0, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
      const a = 1 - k;
      for (let pass = 0; pass < 2; pass++) {
        const wMax = (pass ? 1.3 : 3.4) * U * s.wide * (1 - k * 0.5);
        g.fillStyle = pass ? `rgba(255,255,255,${a})` : `rgba(${s.rgb},${a * 0.5})`;
        g.beginPath();
        const N = 10;
        for (let j = 0; j <= N; j++) { const u = j / N, w = wMax * Math.pow(Math.sin(PI * u), 0.75), b = Math.sin(PI * u) * len * s.bend; const px = s.x0 + dx * u + nx * b, py = s.y0 + dy * u + ny * b; if (j === 0) g.moveTo(px + nx * w, py + ny * w); else g.lineTo(px + nx * w, py + ny * w); }
        for (let j = N; j >= 0; j--) { const u = j / N, w = wMax * Math.pow(Math.sin(PI * u), 0.75), b = Math.sin(PI * u) * len * s.bend; g.lineTo(s.x0 + dx * u + nx * b - nx * w, s.y0 + dy * u + ny * b - ny * w); }
        g.closePath(); g.fill();
      }
    }
    // impact bursts
    for (let i = bursts.length - 1; i >= 0; i--) {
      const b = bursts[i]; b.t += rdt; const k = b.t / b.dur;
      if (k >= 1) { bursts.splice(i, 1); continue; }
      const R = 9 * U * b.size, a = 1 - k;
      g.fillStyle = `rgba(${b.rgb},${a})`;
      for (let j = 0; j < b.rays.length; j++) {
        const r = b.rays[j], r0 = R * (0.25 + k * 1.3), r1 = r0 + R * r.l * (1 - k * 0.6), wv = 0.07 * (1 - k);
        g.beginPath();
        g.moveTo(b.x + Math.cos(r.a - wv) * r0, b.y + Math.sin(r.a - wv) * r0);
        g.lineTo(b.x + Math.cos(r.a) * r1, b.y + Math.sin(r.a) * r1);
        g.lineTo(b.x + Math.cos(r.a + wv) * r0, b.y + Math.sin(r.a + wv) * r0);
        g.closePath(); g.fill();
      }
      g.strokeStyle = `rgba(${b.rgb},${a * 0.6})`; g.lineWidth = 2 + 4 * (1 - k);
      g.beginPath(); g.arc(b.x, b.y, R * (0.4 + 2.2 * k), 0, TAU); g.stroke();
    }
    // floating numbers
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let i = nums.length - 1; i >= 0; i--) {
      const n = nums[i]; n.t += rdt; const k = n.t / n.dur;
      if (k >= 1) { nums.splice(i, 1); continue; }
      const a = k > 0.6 ? (1 - k) / 0.4 : 1, sc = k < 0.12 ? lerp(1.7, 1, k / 0.12) : 1;
      g.font = `800 ${n.size * sc}px ${BD}`; g.lineWidth = n.size * 0.2; g.lineJoin = 'round';
      g.strokeStyle = `rgba(14,11,9,${a * 0.9})`; g.globalAlpha = a;
      const px = n.x + n.vx * n.t, py = n.y - 46 * EASE.out(k);
      g.strokeText(n.text, px, py); g.fillStyle = n.color; g.fillText(n.text, px, py); g.globalAlpha = 1;
    }
    // calligraphy pops
    for (let i = pops.length - 1; i >= 0; i--) {
      const p = pops[i]; p.t += rdt; const k = p.t / p.dur;
      if (k >= 1) { pops.splice(i, 1); continue; }
      const sc = p.t < 0.1 ? lerp(2.3, 1, EASE.out(p.t / 0.1)) : 1 + (p.t - 0.1) * 0.07;
      const a = p.t < 0.04 ? p.t / 0.04 : k > 0.72 ? (1 - k) / 0.28 : 1;
      const fit = p.text ? Math.min(1, (W * 0.88) / (p.size * U * p.text.length)) : 1;
      const fs = p.size * U * sc * fit, px = p.x * W, py = p.y * H - p.t * 10;
      g.save(); g.translate(px, py); g.rotate(p.rot); g.globalAlpha = a;
      if (p.text) {
        if (p.ink) { g.fillStyle = 'rgba(14,11,9,0.45)'; g.beginPath(); g.ellipse(0, 0, fs * (0.36 + 0.32 * p.text.length), fs * 0.62, 0, 0, TAU); g.fill(); }
        g.font = `400 ${fs}px ${BR}`; g.lineJoin = 'round'; g.lineWidth = fs * 0.11; g.strokeStyle = 'rgba(14,11,9,0.95)';
        g.strokeText(p.text, 0, 0); g.fillStyle = p.color; g.fillText(p.text, 0, 0);
      }
      if (p.sub) {
        let ss = Math.max(22, p.size * U * 0.42) * (p.text ? 1 : sc);
        g.font = `400 ${ss}px ${HD}`;
        const tw = g.measureText(p.sub).width;
        if (tw > W * 0.9) { ss *= (W * 0.9) / tw; g.font = `400 ${ss}px ${HD}`; }
        g.lineWidth = ss * 0.2; g.lineJoin = 'round'; g.strokeStyle = 'rgba(14,11,9,0.9)';
        const sy = p.text ? fs * 0.66 : 0;
        g.strokeText(p.sub, 0, sy); g.fillStyle = p.text ? '#eadfc8' : p.color; g.fillText(p.sub, 0, sy);
      }
      g.restore();
    }
    if (cut.on) drawCutin(rdt);
    if (kiais.length) drawKiai(rdt);
    if (impT > 0) {
      impT -= rdt;
      const inv = impT > impDur * 0.5, f = impT > 0 ? (inv ? 'grayscale(1) contrast(8) invert(1)' : 'grayscale(1) contrast(8)') : '';
      if (f !== glFilter) glCv.style.filter = glFilter = f;
      if (impT > 0) drawFocus(1, inv);
    }
    // flash
    if (flashA > 0.004) { g.fillStyle = `rgba(${flashRGB},${Math.min(1, flashA)})`; g.fillRect(0, 0, W, H); flashA = Math.max(0, flashA - rdt * 4.5 - flashA * rdt * 5); }
    // ink wipe between rounds
    if (wipe.on) {
      wipe.t += rdt; const u = wipe.t / wipe.dur;
      let xl = -80, xr = W + 80;
      if (u < 0.26) xl = lerp(W + 80, -80, EASE.out2(u / 0.26));
      else if (u > 0.74) xr = lerp(W + 80, -80, EASE.in2(sat((u - 0.74) / 0.26)));
      if (!wipe.midFired && u >= 0.3) { wipe.midFired = true; if (wipe.mid) wipe.mid(); }
      g.fillStyle = '#0e0b09';
      g.beginPath();
      const N = 24;
      for (let j = 0; j <= N; j++) { const yy = (j / N) * H; const jx = (jag[j] - 0.5) * 70 + Math.sin(j * 1.7 + tAll * 3) * 6; if (j === 0) g.moveTo(xl + jx, yy); else g.lineTo(xl + jx, yy); }
      for (let j = N; j >= 0; j--) { const yy = (j / N) * H; const jx = (jag[j + 24] - 0.5) * 70; g.lineTo(xr + jx, yy); }
      g.closePath(); g.fill();
      const ta = sat((u - 0.18) / 0.1) * sat((0.82 - u) / 0.1);
      if (ta > 0.01) {
        g.globalAlpha = ta; g.textAlign = 'center'; g.textBaseline = 'middle';
        const fs = 19 * U * (1 + (u - 0.5) * 0.08);
        g.font = `400 ${fs}px ${BR}`; g.fillStyle = '#eadfc8'; g.fillText(wipe.text, W / 2, H * 0.44);
        if (wipe.sub) { g.font = `400 ${Math.max(24, 7 * U)}px ${HD}`; g.fillStyle = '#d2a850'; g.fillText(wipe.sub, W / 2, H * 0.44 + fs * 0.8); }
        g.fillStyle = '#c8321e'; g.fillRect(W / 2 - 5 * U, H * 0.44 - fs * 0.78, 10 * U, 3);
        g.globalAlpha = 1;
      }
      if (u >= 1) { wipe.on = false; if (wipe.done) wipe.done(); }
    }
  }
  return { resize, pop, streak, burst, flash, num, setSpeed, startWipe, clear, draw, focus, impact, kiai, cutin, get W() { return W; }, get H() { return H; }, get wiping() { return wipe.on; } };
})();
