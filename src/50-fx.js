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
  function clear() { pops.length = streaks.length = bursts.length = nums.length = 0; flashA = 0; wipe.on = false; speed = 0; }

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
  return { resize, pop, streak, burst, flash, num, setSpeed, startWipe, clear, draw, get W() { return W; }, get H() { return H; }, get wiping() { return wipe.on; } };
})();
