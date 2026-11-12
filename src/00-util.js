// ───────────────────────── util ─────────────────────────
const T = THREE;
const PI = Math.PI, TAU = PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const sat = (v) => clamp(v, 0, 1);
const lerp = (a, b, t) => a + (b - a) * t;
const rad = (d) => (d * PI) / 180;
const smooth = (t) => { t = sat(t); return t * t * (3 - 2 * t); };
const damp = (a, b, l, dt) => lerp(a, b, 1 - Math.exp(-l * dt));
const rnd = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
const EASE = {
  lin: (t) => t,
  in: (t) => t * t * t,
  in2: (t) => t * t,
  out: (t) => 1 - Math.pow(1 - t, 3),
  out2: (t) => 1 - (1 - t) * (1 - t),
  io: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  back: (t) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
};
function mulberry(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
class Spring {
  constructor(k = 120, c = 14) { this.x = 0; this.v = 0; this.k = k; this.c = c; }
  kick(v) { this.v += v; }
  update(dt) {
    const a = -this.k * this.x - this.c * this.v;
    this.v += a * dt; this.x += this.v * dt;
    return this.x;
  }
  reset() { this.x = 0; this.v = 0; }
}
const REDUCED = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
const $ = (id) => document.getElementById(id);
const V3 = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
const UP = V3(0, 1, 0);
const _a = V3(), _b = V3(), _c = V3(), _d = V3(), _e = V3();
const _m4 = new T.Matrix4(), _q = new T.Quaternion();

// material / mesh helpers (r128: Lambert is per-vertex, so flat look = non-indexed geometry)
const ALLMATS = [];
function mLam(color, o) { const m = new T.MeshLambertMaterial(Object.assign({ color }, o)); return m; }
function mPhong(color, spec = 0x444444, shin = 40, o) {
  return new T.MeshPhongMaterial(Object.assign({ color, specular: spec, shininess: shin, flatShading: true }, o));
}
function flat(g) { const n = g.index ? g.toNonIndexed() : g; n.computeVertexNormals(); return n; }
function mesh(g, m, x = 0, y = 0, z = 0, parent) {
  const o = new T.Mesh(g, m); o.position.set(x, y, z); if (parent) parent.add(o); return o;
}
function boxG(w, h, d) { return flat(new T.BoxGeometry(w, h, d)); }
function cylG(rt, rb, h, seg = 7) { return flat(new T.CylinderGeometry(rt, rb, h, seg)); }
// unit segment: base at origin, tip at +y(1). aimSeg stretches it between two points.
function segG(rBase, rTip, seg = 6) { const g = new T.CylinderGeometry(rTip, rBase, 1, seg); g.translate(0, 0.5, 0); return flat(g); }
function aimSeg(o, A, B) {
  o.position.copy(A);
  _e.subVectors(B, A); const len = _e.length() || 1e-4;
  o.quaternion.setFromUnitVectors(UP, _e.multiplyScalar(1 / len));
  o.scale.set(1, len, 1);
}
// two-bone IK. writes elbow, returns (possibly clamped) hand in `hand`
function solveIK(S, hand, l1, l2, pole, elbow) {
  _a.subVectors(hand, S); let L = _a.length();
  const maxL = (l1 + l2) * 0.995;
  if (L > maxL) { _a.multiplyScalar(maxL / L); L = maxL; hand.copy(S).add(_a); }
  if (L < 1e-4) L = 1e-4;
  const a = (l1 * l1 - l2 * l2 + L * L) / (2 * L);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  _b.copy(_a).multiplyScalar(1 / L);
  _c.copy(pole).addScaledVector(_b, -pole.dot(_b));
  if (_c.lengthSq() < 1e-6) _c.set(0, -1, 0).addScaledVector(_b, _b.y);
  _c.normalize();
  elbow.copy(S).addScaledVector(_b, a).addScaledVector(_c, h);
}
// orient object so local +y -> dir and local +x -> edge (projected)
const _X = V3(), _Y = V3(), _Z = V3();
function orientYX(o, dir, edge) {
  _Y.copy(dir).normalize();
  _X.copy(edge).addScaledVector(_Y, -edge.dot(_Y));
  if (_X.lengthSq() < 1e-6) { _X.set(1, 0, 0).addScaledVector(_Y, -_Y.x); if (_X.lengthSq() < 1e-6) _X.set(0, 0, 1); }
  _X.normalize(); _Z.crossVectors(_X, _Y);
  _m4.makeBasis(_X, _Y, _Z);
  o.quaternion.setFromRotationMatrix(_m4);
}
function hex(c) { return new T.Color(c); }
function mixHex(a, b, t) { return hex(a).lerp(hex(b), t); }
