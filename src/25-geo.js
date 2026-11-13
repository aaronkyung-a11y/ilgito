// ───────────────────────── geometry lofts & painted textures ─────────────────────────
// loft a smooth skin over elliptical rings. ring: { c:[x,y,z], ax:[..], ay:[..], rx, ry, e (superellipse), col (vertex tint), v }
function loftG(rings, seg, o) {
  o = o || {}; seg = seg || 12;
  const n = rings.length, cols = seg + 1, pos = [], uv = [], idx = [], col = o.colors ? [] : null;
  for (let i = 0; i < n; i++) {
    const r = rings[i], pw = 2 / (r.e || o.e || 2);
    for (let j = 0; j <= seg; j++) {
      const th = (j / seg) * TAU, cs = Math.cos(th), sn = Math.sin(th);
      const u = Math.sign(cs) * Math.pow(Math.abs(cs), pw) * r.rx, v = Math.sign(sn) * Math.pow(Math.abs(sn), pw) * r.ry;
      pos.push(r.c[0] + r.ax[0] * u + r.ay[0] * v, r.c[1] + r.ax[1] * u + r.ay[1] * v, r.c[2] + r.ax[2] * u + r.ay[2] * v);
      uv.push((j / seg) * (o.ur || 1), (r.v === undefined ? i / (n - 1) : r.v) * (o.vr || 1));
      if (col) { const k = r.col === undefined ? 1 : r.col; if (k.length) col.push(k[0], k[1], k[2]); else col.push(k, k, k); }
    }
  }
  // winding: outward when (ax × ay) points along the loft direction
  const a0 = rings[0], a1 = rings[1];
  const cx = a0.ax[1] * a0.ay[2] - a0.ax[2] * a0.ay[1], cy = a0.ax[2] * a0.ay[0] - a0.ax[0] * a0.ay[2], cz = a0.ax[0] * a0.ay[1] - a0.ax[1] * a0.ay[0];
  const fwd = cx * (a1.c[0] - a0.c[0]) + cy * (a1.c[1] - a0.c[1]) + cz * (a1.c[2] - a0.c[2]) >= 0;
  const tri = (a, b, c) => { if (fwd) idx.push(a, b, c); else idx.push(a, c, b); };
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < seg; j++) { const a = i * cols + j, b = a + 1, c = a + cols, d = c + 1; tri(a, b, c); tri(b, d, c); }
  const cap = (ri, start) => {
    const r = rings[ri], ci = pos.length / 3;
    pos.push(r.c[0], r.c[1], r.c[2]); uv.push(0.5, (r.v === undefined ? (start ? 0 : 1) : r.v) * (o.vr || 1)); if (col) { const k = r.col === undefined ? 1 : r.col; if (k.length) col.push(k[0], k[1], k[2]); else col.push(k, k, k); }
    for (let j = 0; j < seg; j++) { const a = ri * cols + j, b = a + 1; if (start) tri(ci, b, a); else tri(ci, a, b); }
  };
  if (o.cap !== false) { cap(0, true); cap(n - 1, false); }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  if (col) g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
  g.setIndex(idx); g.computeVertexNormals();
  // weld the normals along the seam so the shading has no visible line
  const nr = g.attributes.normal;
  for (let i = 0; i < n; i++) {
    const a = i * cols, b = a + seg;
    const x = nr.getX(a) + nr.getX(b), y = nr.getY(a) + nr.getY(b), z = nr.getZ(a) + nr.getZ(b), l = Math.hypot(x, y, z) || 1;
    nr.setXYZ(a, x / l, y / l, z / l); nr.setXYZ(b, x / l, y / l, z / l);
  }
  return g;
}
// rings stacked along +y: rows of [y, rx, rz, zc, xc, col]
function ringsY(rows, e) { return rows.map((r) => ({ c: [r[4] || 0, r[0], r[3] || 0], ax: [1, 0, 0], ay: [0, 0, 1], rx: r[1], ry: r[2] === undefined ? r[1] : r[2], e, col: r[5], v: r[6] })); }
// rings along z (front to back): rows of [z, top, bottom, halfWidth, col]
function ringsZ(rows, e) { return rows.map((r) => ({ c: [0, (r[1] + r[2]) / 2, r[0]], ax: [1, 0, 0], ay: [0, 1, 0], rx: r[3], ry: (r[1] - r[2]) / 2, e, col: r[4] })); }
// a tapered limb along +y from 0 to len. prof: rows of [t, rx, rz]
function limbG(len, prof, seg, o) { return loftG(ringsY(prof.map((p) => [p[0] * len, p[1], p[2] === undefined ? p[1] : p[2], p[3] || 0, 0, p[4]]), o && o.e), seg || 8, o); }
function smoothG(g) { g.computeVertexNormals(); return g; }

// Catmull-Rom resample of a table of numeric rows (uniform in row index)
function resampleRows(rows, n) {
  const out = [], m = rows.length, w = rows[0].length;
  for (let i = 0; i < n; i++) {
    const f = (i / (n - 1)) * (m - 1), i1 = Math.min(m - 2, Math.floor(f)), t = f - i1;
    const p0 = rows[Math.max(0, i1 - 1)], p1 = rows[i1], p2 = rows[i1 + 1], p3 = rows[Math.min(m - 1, i1 + 2)], r = [];
    for (let k = 0; k < w; k++) { const a = p0[k], b = p1[k], c = p2[k], d = p3[k]; r.push(0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t)); }
    out.push(r);
  }
  return out;
}
// linear lookup in a table whose first column is monotonic
function rowAt(rows, x) {
  const n = rows.length, inc = rows[n - 1][0] > rows[0][0];
  if (inc ? x <= rows[0][0] : x >= rows[0][0]) return rows[0];
  if (inc ? x >= rows[n - 1][0] : x <= rows[n - 1][0]) return rows[n - 1];
  for (let i = 0; i < n - 1; i++) {
    const a = rows[i], b = rows[i + 1];
    if (inc ? x <= b[0] : x >= b[0]) { const t = (x - a[0]) / (b[0] - a[0]); return a.map((v, k) => v + (b[k] - v) * t); }
  }
  return rows[n - 1];
}
// parametric sheet: fn(u, v, out[3]); u across (nu steps), v along (nv steps)
function surfG(fn, nu, nv, o) {
  o = o || {};
  const pos = [], uv = [], idx = [], out = [0, 0, 0], W = nu + 1;
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
    const u = i / nu, v = j / nv; fn(u, v, out); pos.push(out[0], out[1], out[2]); uv.push(u * (o.ur || 1), v * (o.vr || 1));
  }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = j * W + i, b = a + 1, c = a + W, d = c + 1;
    if (o.flip) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c);
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
// a tube along a polyline. pts: [[x,y,z]…], radii: number | [..], ref: a vector not parallel to the path
function tubeG(pts, radii, seg, o) {
  o = o || {};
  const ref = o.ref || [1, 0, 0], rings = [], n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let tx = b[0] - a[0], ty = b[1] - a[1], tz = b[2] - a[2]; const tl = Math.hypot(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl;
    let ax = [ref[1] * tz - ref[2] * ty, ref[2] * tx - ref[0] * tz, ref[0] * ty - ref[1] * tx]; const al = Math.hypot(ax[0], ax[1], ax[2]) || 1; ax = [ax[0] / al, ax[1] / al, ax[2] / al];
    const ay = [ty * ax[2] - tz * ax[1], tz * ax[0] - tx * ax[2], tx * ax[1] - ty * ax[0]];
    const r = radii.length ? radii[i] : radii;
    rings.push({ c: pts[i], ax, ay, rx: r * (o.sx || 1), ry: r, col: o.col, v: o.v ? o.v[i] : undefined });
  }
  return loftG(rings, seg || 6, o);
}
function latheG(prof, seg) { return new T.LatheGeometry(prof.map((p) => new T.Vector2(p[0], p[1])), seg || 14); }
function uvScale(g, su, sv) { const a = g.attributes.uv; for (let i = 0; i < a.count; i++) a.setXY(i, a.getX(i) * su, a.getY(i) * sv); return g; }
// paint vertex colours from a function of position: fn(x, y, z) -> number | [r,g,b]
function tintG(g, fn) {
  const p = g.attributes.position, c = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const k = fn(p.getX(i), p.getY(i), p.getZ(i)); if (k.length) { c[i * 3] = k[0]; c[i * 3 + 1] = k[1]; c[i * 3 + 2] = k[2]; } else c[i * 3] = c[i * 3 + 1] = c[i * 3 + 2] = k; }
  g.setAttribute('color', new T.BufferAttribute(c, 3)); return g;
}
function M4(x, y, z, rx, ry, rz, sx, sy, sz) {
  if (sx === undefined) sx = 1; if (sy === undefined) sy = sx; if (sz === undefined) sz = sx;
  return new T.Matrix4().compose(V3(x || 0, y || 0, z || 0), new T.Quaternion().setFromEuler(new T.Euler(rx || 0, ry || 0, rz || 0)), V3(sx, sy, sz));
}
// matrix that lays the unit +y segment from A to B (y scaled to the length)
function segM4(A, B) {
  const d = V3().subVectors(B, A), len = d.length() || 1e-4;
  return new T.Matrix4().compose(A, new T.Quaternion().setFromUnitVectors(UP, d.multiplyScalar(1 / len)), V3(1, len, 1));
}
const _mv = V3(), _mn = new T.Matrix3();
// bake several static pieces into one mesh (one draw call per material)
class Merge {
  constructor() { this.p = []; this.n = []; this.u = []; this.c = []; this.i = []; }
  add(g, m, col) {
    const pos = g.attributes.position, nor = g.attributes.normal, uv = g.attributes.uv, gc = g.attributes.color, base = this.p.length / 3;
    const flip = m && m.determinant() < 0; if (m) _mn.getNormalMatrix(m);
    const cr = col === undefined ? 1 : col.length ? col[0] : col, cg = col === undefined ? 1 : col.length ? col[1] : col, cb = col === undefined ? 1 : col.length ? col[2] : col;
    for (let k = 0; k < pos.count; k++) {
      _mv.fromBufferAttribute(pos, k); if (m) _mv.applyMatrix4(m); this.p.push(_mv.x, _mv.y, _mv.z);
      _mv.fromBufferAttribute(nor, k); if (m) _mv.applyMatrix3(_mn).normalize(); this.n.push(_mv.x, _mv.y, _mv.z);
      if (uv) this.u.push(uv.getX(k), uv.getY(k)); else this.u.push(0, 0);
      if (gc) this.c.push(gc.getX(k) * cr, gc.getY(k) * cg, gc.getZ(k) * cb); else this.c.push(cr, cg, cb);
    }
    const ix = g.index, cnt = ix ? ix.count : pos.count;
    for (let k = 0; k < cnt; k += 3) {
      const a = base + (ix ? ix.getX(k) : k), b = base + (ix ? ix.getX(k + 1) : k + 1), c = base + (ix ? ix.getX(k + 2) : k + 2);
      if (flip) this.i.push(a, c, b); else this.i.push(a, b, c);
    }
    return this;
  }
  get empty() { return !this.i.length; }
  geo() {
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new T.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(this.u, 2));
    g.setAttribute('color', new T.Float32BufferAttribute(this.c, 3));
    g.setIndex(this.i); return g;
  }
  mesh(mat, parent) { const o = new T.Mesh(this.geo(), mat); if (parent) parent.add(o); return o; }
}
// limb placement without scaling (geometry is authored at its true length)
function aimLimb(o, A, B) { o.position.copy(A); _e.subVectors(B, A); const l = _e.length() || 1e-4; o.quaternion.setFromUnitVectors(UP, _e.multiplyScalar(1 / l)); }
// orient so that local +x is exactly xdir and local +y is yhint projected off it
function orientXY(o, xdir, yhint) {
  _X.copy(xdir).normalize();
  _Y.copy(yhint).addScaledVector(_X, -yhint.dot(_X));
  if (_Y.lengthSq() < 1e-5) { _Y.set(0, 1, 0).addScaledVector(_X, -_X.y); if (_Y.lengthSq() < 1e-5) _Y.set(0, 0, 1); }
  _Y.normalize(); _Z.crossVectors(_X, _Y);
  _m4.makeBasis(_X, _Y, _Z); o.quaternion.setFromRotationMatrix(_m4);
}

// ── painted textures (canvas), cel style: flat fills and ink lines. greyscale ones are tinted by the material colour
const TEX = (() => {
  const mk = (w, h, fn, rep) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h);
    const t = new T.CanvasTexture(c); if (rep) { t.wrapS = t.wrapT = T.RepeatWrapping; } t.anisotropy = 4; return t;
  };
  const r = mulberry(99);
  // lamellar (찰갑): rows of plates read as a quiet pattern — one flat fill, a soft edge and a thin shadow band under the row above
  const lamellar = mk(256, 256, (g, W, H) => {
    const pw = W / 8, ph = H / 6;
    g.fillStyle = '#8c8c8c'; g.fillRect(0, 0, W, H);
    g.lineJoin = 'round'; g.lineCap = 'round';
    for (let row = 6; row >= -1; row--) for (let c = -1; c < 9; c++) {
      const x = c * pw + (row % 2 ? pw / 2 : 0), y = row * ph, x0 = x + 0.8, x1 = x + pw - 0.8, y1 = y + ph * 1.2, rr = pw * 0.34;
      const path = () => { g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.lineTo(x1, y1 - rr); g.quadraticCurveTo(x1, y1, x1 - rr, y1); g.lineTo(x0 + rr, y1); g.quadraticCurveTo(x0, y1, x0, y1 - rr); g.closePath(); };
      path(); g.fillStyle = '#e4e4e4'; g.fill();
      g.save(); path(); g.clip(); g.fillStyle = '#c2c2c2'; g.fillRect(x, y, pw, ph * 0.16); g.restore();
      path(); g.strokeStyle = '#8c8c8c'; g.lineWidth = 1.6; g.stroke();
    }
  }, true);
  // hair for beards and hair caps: a flat tone with a few bold strands
  const hairT = mk(64, 128, (g, W, H) => {
    g.fillStyle = '#d2d2d2'; g.fillRect(0, 0, W, H); g.lineCap = 'round';
    for (let i = 0; i < 9; i++) { const x = (i + 0.5) / 9 * W + (r() - 0.5) * 5; g.strokeStyle = i % 3 === 1 ? '#ffffff' : '#767676'; g.lineWidth = i % 3 === 1 ? 1.6 : 2 + r() * 1.6; g.beginPath(); g.moveTo(x, -4); g.quadraticCurveTo(x + (r() - 0.5) * 10, H * 0.5, x + (r() - 0.5) * 8, H + 4); g.stroke(); }
  }, true);
  // cut-out hair (manes, tails, plumes, tassels): the root is at the bottom of the canvas (v = 0), clumps taper to points at v = 1
  const hairA = mk(64, 128, (g, W, H) => {
    g.clearRect(0, 0, W, H); g.lineCap = 'round';
    g.fillStyle = '#d0d0d0'; g.fillRect(0, H * 0.6, W, H * 0.4);
    const n = 5;
    for (let pass = 0; pass < 2; pass++) for (let i = -1; i <= n; i++) {
      const x0 = (i / n) * W - 3 + pass * (W / n / 2), x1 = x0 + W / n + 6, xm = (x0 + x1) / 2 + (r() - 0.5) * 9, top = H * (0.03 + r() * (pass ? 0.3 : 0.42));
      g.fillStyle = pass ? '#dadada' : '#c2c2c2';
      g.beginPath(); g.moveTo(x0, H * 0.68); g.quadraticCurveTo(x0 + 1, H * 0.4, xm, top); g.quadraticCurveTo(x1 - 1, H * 0.4, x1, H * 0.68); g.closePath(); g.fill();
      g.strokeStyle = pass ? '#ffffff' : '#9c9c9c'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x0 + 2, H); g.quadraticCurveTo(x0 + 2.5, H * 0.45, xm, top + 3); g.stroke();
    }
  }, true);
  hairA.wrapT = T.ClampToEdgeWrapping;
  // ground shadow: a flat, hard-edged ellipse
  const shadow = mk(128, 128, (g, W, H) => {
    const gr = g.createRadialGradient(W / 2, H / 2, 4, W / 2, H / 2, W / 2);
    gr.addColorStop(0, 'rgba(0,0,0,0.5)'); gr.addColorStop(0.8, 'rgba(0,0,0,0.5)'); gr.addColorStop(0.86, 'rgba(0,0,0,0.0)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  });
  const feather = mk(32, 256, (g, W, H) => {
    g.fillStyle = '#f4e8c8'; g.fillRect(0, 0, W, H);
    for (let y = 6; y < H; y += 17) { g.fillStyle = '#3a2416'; g.beginPath(); g.moveTo(0, y); g.quadraticCurveTo(W / 2, y + 7, W, y); g.lineTo(W, y + 5.5); g.quadraticCurveTo(W / 2, y + 12.5, 0, y + 5.5); g.fill(); }
    g.fillStyle = '#3a2416'; g.fillRect(W / 2 - 1.2, 0, 2.4, H); g.fillRect(0, 0, 2.2, H); g.fillRect(W - 2.2, 0, 2.2, H);
  });
  const css = (c) => '#' + new T.Color(c).getHexString();
  const cache = {};
  const memo = (key, make) => cache[key] || (cache[key] = make());
  // cape: flat colour, an ink edge and a gold key-pattern border
  function cape(color, trim) {
    return memo('c' + color + ',' + trim, () => mk(256, 256, (g, W, H) => {
      const t = css(trim || 0xd2a850);
      g.fillStyle = css(color); g.fillRect(0, 0, W, H);
      g.strokeStyle = '#' + new T.Color(color).multiplyScalar(0.3).getHexString(); g.lineWidth = 6; g.strokeRect(0, 0, W, H);
      g.strokeStyle = t; g.lineWidth = 4.5; g.strokeRect(10, 10, W - 20, H - 20);
      g.lineWidth = 2.6; g.lineJoin = 'miter';
      for (let x = 24; x < W - 30; x += 22) { g.beginPath(); g.moveTo(x, H - 22); g.lineTo(x, H - 38); g.lineTo(x + 14, H - 38); g.lineTo(x + 14, H - 28); g.lineTo(x + 6, H - 28); g.stroke(); }
      g.beginPath(); g.moveTo(10, H - 46); g.lineTo(W - 10, H - 46); g.stroke();
    }));
  }
  // saddle cloth / caparison: flat colour, an ink edge, a trimmed and patterned border
  function blanket(color, trim) {
    return memo('b' + color + ',' + trim, () => mk(128, 128, (g, W, H) => {
      const t = css(trim || 0xd2a850);
      g.fillStyle = css(color); g.fillRect(0, 0, W, H);
      g.strokeStyle = '#' + new T.Color(color).multiplyScalar(0.3).getHexString(); g.lineWidth = 5; g.strokeRect(0, 0, W, H);
      g.strokeStyle = t; g.lineWidth = 5; g.strokeRect(7, 7, W - 14, H - 14);
      g.lineWidth = 2; g.strokeRect(15, 15, W - 30, H - 30);
      g.fillStyle = t;
      for (let x = 27; x < W - 20; x += 19) for (let y = 27; y < H - 20; y += 19) { g.beginPath(); g.moveTo(x, y - 3.8); g.lineTo(x + 3.8, y); g.lineTo(x, y + 3.8); g.lineTo(x - 3.8, y); g.fill(); }
    }));
  }
  return { lamellar, hair: hairT, hairA, shadow, feather, cape, blanket };
})();
