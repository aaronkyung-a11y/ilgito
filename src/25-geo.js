// ───────────────────────── geometry lofts & painted textures (v0.2 models) ─────────────────────────
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

// ── painted textures (canvas). greyscale ones are tinted by material.color
const TEX = (() => {
  const mk = (w, h, fn, rep) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h);
    const t = new T.CanvasTexture(c); if (rep) { t.wrapS = t.wrapT = T.RepeatWrapping; } t.anisotropy = 4; return t;
  };
  const r = mulberry(99);
  // lamellar (찰갑): rows of small laced plates
  function lam(g, W, H, bump) {
    const pw = W / 8, ph = H / 6;
    g.fillStyle = bump ? '#202020' : '#5a5650'; g.fillRect(0, 0, W, H);
    for (let row = -1; row < 7; row++) for (let c = -1; c < 9; c++) {
      const x = c * pw + (row % 2 ? pw / 2 : 0), y = row * ph, v = bump ? 205 : 168 + ((r() * 40) | 0);
      const gr = g.createLinearGradient(x, y, x, y + ph * 1.18);
      if (bump) { gr.addColorStop(0, '#6a6a6a'); gr.addColorStop(0.35, '#e8e8e8'); gr.addColorStop(1, '#ffffff'); }
      else { gr.addColorStop(0, `rgb(${v - 70},${v - 72},${v - 76})`); gr.addColorStop(0.3, `rgb(${v},${v},${v - 4})`); gr.addColorStop(0.85, `rgb(${v + 14},${v + 13},${v + 8})`); gr.addColorStop(1, `rgb(${v - 30},${v - 32},${v - 36})`); }
      g.fillStyle = gr;
      const x0 = x + 1.2, x1 = x + pw - 1.2, y0 = y, y1 = y + ph * 1.16, rr = pw * 0.3;
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y0); g.lineTo(x1, y1 - rr); g.quadraticCurveTo(x1, y1, x1 - rr, y1); g.lineTo(x0 + rr, y1); g.quadraticCurveTo(x0, y1, x0, y1 - rr); g.closePath(); g.fill();
      g.fillStyle = bump ? '#303030' : 'rgba(30,22,16,0.8)';
      g.fillRect(x + pw * 0.3, y + ph * 0.34, 2.2, 2.2); g.fillRect(x + pw * 0.62, y + ph * 0.34, 2.2, 2.2);
      if (!bump) { g.fillStyle = 'rgba(150,40,26,0.55)'; g.fillRect(x + pw * 0.28, y + ph * 0.52, pw * 0.44, 1.6); }
    }
  }
  const lamellar = mk(256, 256, (g, W, H) => lam(g, W, H, false), true);
  const lamellarBump = mk(256, 256, (g, W, H) => lam(g, W, H, true), true);
  const cloth = mk(128, 128, (g, W, H) => {
    g.fillStyle = '#e4e4e4'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 2600; i++) { const v = 190 + ((r() * 60) | 0); g.fillStyle = `rgba(${v},${v},${v},0.5)`; g.fillRect(r() * W, r() * H, 1 + r() * 2, 1); }
    for (let x = 0; x < W; x += 2) { g.fillStyle = `rgba(0,0,0,${0.03 + r() * 0.05})`; g.fillRect(x, 0, 1, H); }
  }, true);
  const leather = mk(128, 128, (g, W, H) => {
    g.fillStyle = '#d0d0d0'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 500; i++) { const v = 150 + ((r() * 90) | 0); g.fillStyle = `rgba(${v},${v},${v},0.35)`; g.beginPath(); g.arc(r() * W, r() * H, 1 + r() * 5, 0, TAU); g.fill(); }
  }, true);
  const coat = mk(256, 256, (g, W, H) => {
    g.fillStyle = '#e9e9e9'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 90; i++) { const v = 205 + ((r() * 45) | 0); g.fillStyle = `rgba(${v},${v},${v},0.3)`; g.beginPath(); g.ellipse(r() * W, r() * H, 8 + r() * 26, 6 + r() * 16, r() * 3, 0, TAU); g.fill(); }
    g.lineCap = 'round';
    for (let i = 0; i < 5200; i++) { const x = r() * W, y = r() * H, v = r() < 0.5 ? 150 : 255; g.strokeStyle = `rgba(${v},${v},${v},${0.1 + r() * 0.12})`; g.lineWidth = 0.7; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 2, y + 3 + r() * 4); g.stroke(); }
  }, true);
  const hairT = mk(64, 128, (g, W, H) => {
    g.fillStyle = '#c8c8c8'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 260; i++) { const x = r() * W, v = 90 + ((r() * 165) | 0); g.strokeStyle = `rgba(${v},${v},${v},0.55)`; g.lineWidth = 0.6 + r(); g.beginPath(); g.moveTo(x, 0); g.lineTo(x + (r() - 0.5) * 6, H); g.stroke(); }
  }, true);
  const hairA = mk(64, 128, (g, W, H) => {
    g.clearRect(0, 0, W, H); g.lineCap = 'round';
    g.fillStyle = '#c4c4c4'; g.fillRect(0, H * 0.6, W, H * 0.4);
    for (let i = 0; i < 46; i++) { const x = r() * W, v = 150 + ((r() * 90) | 0); g.strokeStyle = `rgb(${v},${v},${v})`; g.lineWidth = 1 + r() * 1.5; g.beginPath(); g.moveTo(x, H); g.lineTo(x + (r() - 0.5) * 5, H * 0.6); g.stroke(); }
    for (let i = 0; i < 130; i++) {
      const x = r() * W, len = H * (0.5 + r() * 0.5), v = 158 + ((r() * 97) | 0);
      g.strokeStyle = `rgb(${v},${v},${v})`; g.lineWidth = 2.4 + r() * 3.2;
      g.beginPath(); g.moveTo(x, H); g.quadraticCurveTo(x + (r() - 0.5) * 8, H - len * 0.5, x + (r() - 0.5) * 14, H - len); g.stroke();
    }
  }, true);
  hairA.wrapT = T.ClampToEdgeWrapping;
  // a small sky for metal to mirror (equirectangular)
  const env = mk(256, 128, (g, W, H) => {
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#9fb4c8'); gr.addColorStop(0.38, '#e8e4d8'); gr.addColorStop(0.5, '#fff6e0'); gr.addColorStop(0.56, '#6a5a48'); gr.addColorStop(1, '#1c1612');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    const sg = g.createRadialGradient(W * 0.3, H * 0.3, 2, W * 0.3, H * 0.3, 46); sg.addColorStop(0, 'rgba(255,255,255,1)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = sg; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 7; i++) { g.fillStyle = `rgba(40,32,26,${0.25 + r() * 0.3})`; g.fillRect(r() * W, H * 0.47, 6 + r() * 26, H * 0.1); }
  });
  env.mapping = T.EquirectangularReflectionMapping;
  const shadow = mk(128, 128, (g, W, H) => {
    const gr = g.createRadialGradient(W / 2, H / 2, 4, W / 2, H / 2, W / 2);
    gr.addColorStop(0, 'rgba(0,0,0,0.82)'); gr.addColorStop(0.45, 'rgba(0,0,0,0.6)'); gr.addColorStop(0.8, 'rgba(0,0,0,0.16)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  });
  const feather = mk(32, 256, (g, W, H) => {
    const gr = g.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, '#b89a6a'); gr.addColorStop(0.5, '#f2e6c8'); gr.addColorStop(1, '#b89a6a');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    for (let y = 6; y < H; y += 17) { g.fillStyle = 'rgba(40,24,14,0.85)'; g.beginPath(); g.moveTo(0, y); g.quadraticCurveTo(W / 2, y + 7, W, y); g.lineTo(W, y + 5); g.quadraticCurveTo(W / 2, y + 12, 0, y + 5); g.fill(); }
    g.fillStyle = 'rgba(60,40,24,0.9)'; g.fillRect(W / 2 - 1, 0, 2, H);
  });
  const css = (c) => '#' + new T.Color(c).getHexString();
  const cache = {};
  const memo = (key, make) => cache[key] || (cache[key] = make());
  // face: SphereGeometry maps the front of the head to u = 0.25
  function face(look) {
    return memo('f' + [look.skin, look.hair, look.beard, look.patch, look.scar, look.helm === 'crown'].join(), () => mk(512, 256, (g, W, H) => {
      const skin = new T.Color(look.skin || 0xd7a57c), hair = css(look.hair || 0x15110f), cx = 128;
      const sk = (m) => '#' + skin.clone().multiplyScalar(m).getHexString();
      g.fillStyle = sk(1); g.fillRect(0, 0, W, H);
      // hair round the back and sides
      g.fillStyle = hair; g.fillRect(232, 0, 280, H); g.fillRect(0, 0, 24, H);
      let gr = g.createLinearGradient(196, 0, 236, 0); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, hair); g.fillStyle = gr; g.fillRect(196, 0, 40, H);
      gr = g.createLinearGradient(60, 0, 20, 0); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, hair); g.fillStyle = gr; g.fillRect(20, 0, 40, H);
      // modelling: cheek hollows, brow shadow, forehead light
      gr = g.createRadialGradient(cx, 118, 20, cx, 118, 82); gr.addColorStop(0, 'rgba(255,236,210,0.28)'); gr.addColorStop(0.6, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(60,24,10,0.35)');
      g.fillStyle = gr; g.fillRect(40, 30, 176, 190);
      g.fillStyle = 'rgba(70,30,14,0.3)'; g.beginPath(); g.ellipse(cx, 102, 46, 9, 0, 0, TAU); g.fill();
      [-1, 1].forEach((k) => {
        const ex = cx + k * 27, ey = 111;
        g.save(); g.translate(ex, ey); g.rotate(k * -0.16);
        g.fillStyle = 'rgba(40,16,8,0.45)'; g.beginPath(); g.ellipse(0, 0, 15, 8, 0, 0, TAU); g.fill();                 // socket
        g.fillStyle = '#efe6d8'; g.beginPath(); g.moveTo(-12, 1); g.quadraticCurveTo(0, -7, 12, -1); g.quadraticCurveTo(0, 6, -12, 1); g.fill(); // white
        g.fillStyle = '#2a160c'; g.beginPath(); g.arc(k * -1, -0.5, 4.6, 0, TAU); g.fill();
        g.fillStyle = '#000'; g.beginPath(); g.arc(k * -1, -0.5, 2.2, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.8)'; g.fillRect(k * -1 + 1, -3, 1.6, 1.6);
        g.strokeStyle = '#140a06'; g.lineWidth = 2.6; g.lineCap = 'round'; g.beginPath(); g.moveTo(-13, 1.5); g.quadraticCurveTo(0, -8.5, 13, -1.5); g.stroke(); // upper lid
        g.lineWidth = 1; g.strokeStyle = 'rgba(60,24,10,0.7)'; g.beginPath(); g.moveTo(-11, 2.5); g.quadraticCurveTo(0, 7, 11, 0.5); g.stroke();
        g.restore();
        // brow: inner end low, outer end high
        g.strokeStyle = hair; g.lineCap = 'round'; g.lineWidth = 6.5;
        g.beginPath(); g.moveTo(cx + k * 9, 100); g.quadraticCurveTo(cx + k * 24, 92, cx + k * 43, 89); g.stroke();
        g.lineWidth = 3; g.beginPath(); g.moveTo(cx + k * 40, 89); g.lineTo(cx + k * 48, 91); g.stroke();
      });
      // frown lines, nose, mouth
      g.strokeStyle = 'rgba(70,30,14,0.55)'; g.lineWidth = 1.4;
      g.beginPath(); g.moveTo(cx - 4, 96); g.lineTo(cx - 3, 104); g.moveTo(cx + 4, 96); g.lineTo(cx + 3, 104); g.stroke();
      g.strokeStyle = 'rgba(70,30,14,0.5)'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(cx - 6, 112); g.quadraticCurveTo(cx - 10, 134, cx - 12, 142); g.stroke();
      g.beginPath(); g.moveTo(cx + 6, 112); g.quadraticCurveTo(cx + 10, 134, cx + 12, 142); g.stroke();
      g.fillStyle = 'rgba(40,14,8,0.75)'; g.beginPath(); g.ellipse(cx - 6, 145, 3.6, 2.2, 0.3, 0, TAU); g.ellipse(cx + 6, 145, 3.6, 2.2, -0.3, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(70,30,14,0.45)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(cx - 15, 146); g.quadraticCurveTo(cx - 21, 158, cx - 20, 168); g.moveTo(cx + 15, 146); g.quadraticCurveTo(cx + 21, 158, cx + 20, 168); g.stroke();
      g.strokeStyle = '#3a130c'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx - 16, 169); g.quadraticCurveTo(cx, 164, cx + 16, 169); g.stroke();
      g.strokeStyle = 'rgba(120,50,36,0.6)'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx - 10, 174); g.quadraticCurveTo(cx, 178, cx + 10, 174); g.stroke();
      // facial hair
      if (look.beard) {
        g.strokeStyle = hair; g.lineCap = 'round';
        g.lineWidth = 6; g.beginPath(); g.moveTo(cx - 2, 158); g.quadraticCurveTo(cx - 14, 157, cx - 25, 168 + (look.beard === 2 ? 8 : 0)); g.moveTo(cx + 2, 158); g.quadraticCurveTo(cx + 14, 157, cx + 25, 168 + (look.beard === 2 ? 8 : 0)); g.stroke();
        g.fillStyle = hair; g.beginPath(); g.moveTo(cx - 52, 150); g.quadraticCurveTo(cx - 44, 196, cx - 16, 210); g.lineTo(cx + 16, 210); g.quadraticCurveTo(cx + 44, 196, cx + 52, 150);
        g.quadraticCurveTo(cx + 34, 178, cx + 14, 182); g.quadraticCurveTo(cx, 176, cx - 14, 182); g.quadraticCurveTo(cx - 34, 178, cx - 52, 150); g.fill();
        g.fillRect(cx - 5, 178, 10, 14);
        g.fillStyle = hair; g.fillRect(cx - 30, 205, 60, 51);
      } else {
        g.fillStyle = 'rgba(40,24,16,0.14)'; g.beginPath(); g.ellipse(cx, 186, 40, 24, 0, 0, TAU); g.fill();
      }
      if (look.patch) {
        g.fillStyle = '#0b0908'; g.beginPath(); g.ellipse(cx + 27, 111, 19, 13, -0.1, 0, TAU); g.fill();
        g.strokeStyle = '#0b0908'; g.lineWidth = 5; g.beginPath(); g.moveTo(cx - 70, 70); g.lineTo(cx + 27, 108); g.lineTo(cx + 96, 122); g.stroke();
        g.strokeStyle = 'rgba(120,40,30,0.7)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(cx + 12, 86); g.lineTo(cx + 40, 136); g.stroke();
      }
      if (look.scar) { g.strokeStyle = 'rgba(130,50,40,0.8)'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx - 44, 96); g.lineTo(cx - 30, 150); g.stroke(); }
      if (look.helm === 'crown') {   // bare-headed: hair over the crown with a widow's peak
        g.fillStyle = hair; g.beginPath(); g.moveTo(0, 0); g.lineTo(W, 0); g.lineTo(W, 70); g.lineTo(232, 70);
        g.quadraticCurveTo(190, 50, cx + 8, 62); g.lineTo(cx, 70); g.lineTo(cx - 8, 62); g.quadraticCurveTo(66, 50, 24, 70); g.lineTo(0, 70); g.closePath(); g.fill();
      }
    }));
  }
  // cape: the cloak colour with fold shading and a gold key-pattern border
  function cape(color, trim) {
    return memo('c' + color + ',' + trim, () => mk(256, 256, (g, W, H) => {
      g.fillStyle = css(color); g.fillRect(0, 0, W, H);
      for (let x = 0; x < W; x += 16) { const gr = g.createLinearGradient(x, 0, x + 16, 0); gr.addColorStop(0, 'rgba(0,0,0,0.22)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.07)'); gr.addColorStop(1, 'rgba(0,0,0,0.22)'); g.fillStyle = gr; g.fillRect(x, 0, 16, H); }
      g.strokeStyle = css(trim || 0xd2a850); g.lineWidth = 4;
      g.strokeRect(9, 9, W - 18, H - 18);
      g.lineWidth = 2.5;
      for (let x = 22; x < W - 30; x += 22) { g.beginPath(); g.moveTo(x, H - 20); g.lineTo(x, H - 36); g.lineTo(x + 14, H - 36); g.lineTo(x + 14, H - 26); g.lineTo(x + 6, H - 26); g.stroke(); }
      g.strokeRect(9, H - 44, W - 18, 0.1);
    }));
  }
  // saddle cloth / caparison: cloth colour with a trimmed, patterned edge
  function blanket(color, trim) {
    return memo('b' + color + ',' + trim, () => mk(128, 128, (g, W, H) => {
      g.fillStyle = css(color); g.fillRect(0, 0, W, H);
      for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.12})`; g.fillRect(r() * W, r() * H, 2, 1); }
      g.strokeStyle = css(trim || 0xd2a850); g.lineWidth = 5; g.strokeRect(6, 6, W - 12, H - 12);
      g.lineWidth = 2; g.strokeRect(14, 14, W - 28, H - 28);
      g.fillStyle = css(trim || 0xd2a850);
      for (let x = 26; x < W - 20; x += 19) for (let y = 26; y < H - 20; y += 19) { g.beginPath(); g.moveTo(x, y - 3.5); g.lineTo(x + 3.5, y); g.lineTo(x, y + 3.5); g.lineTo(x - 3.5, y); g.fill(); }
    }));
  }
  return { lamellar, lamellarBump, cloth, leather, coat, hair: hairT, hairA, env, shadow, feather, face, cape, blanket };
})();
