// ───────────────────────── particles & trails ─────────────────────────
const uPScale = { value: 600 }; // px per metre at 1m (set on resize)
// shape: 0 = flat disc with a crisp edge (dust, motes), 1 = four-point star (sparks)
function partMat(additive, soft, shape) {
  return new T.ShaderMaterial({
    uniforms: { uScale: uPScale, uSoft: { value: soft }, uShape: { value: shape || 0 } },
    vertexShader: `
      attribute float aSize; attribute vec4 aColor; varying vec4 vColor; uniform float uScale;
      void main(){
        vColor = aColor;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * uScale / max(0.2, -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying vec4 vColor; uniform float uSoft; uniform float uShape;
      void main(){
        vec2 q = abs(gl_PointCoord - 0.5) * 2.0;
        float d = uShape > 0.5 ? (pow(q.x, 0.55) + pow(q.y, 0.55)) * 0.5 : length(q) * 0.5;
        float a = smoothstep(0.5, max(uSoft, 0.42), d) * vColor.a;
        if (a < 0.004) discard;
        gl_FragColor = vec4(vColor.rgb, a);
      }`,
    transparent: true, depthWrite: false, fog: false,
    blending: additive ? T.AdditiveBlending : T.NormalBlending,
  });
}
class Particles {
  constructor(n, additive, soft, shape) {
    this.n = n; this.i = 0; this.dirty = true;
    this.pos = new Float32Array(n * 3); this.col = new Float32Array(n * 4); this.size = new Float32Array(n);
    this.vel = new Float32Array(n * 3); this.life = new Float32Array(n); this.max = new Float32Array(n);
    this.par = new Float32Array(n * 4); this.s0 = new Float32Array(n);
    const g = (this.geo = new T.BufferGeometry());
    g.setAttribute('position', new T.BufferAttribute(this.pos, 3).setUsage(T.DynamicDrawUsage));
    g.setAttribute('aColor', new T.BufferAttribute(this.col, 4).setUsage(T.DynamicDrawUsage));
    g.setAttribute('aSize', new T.BufferAttribute(this.size, 1).setUsage(T.DynamicDrawUsage));
    this.points = new T.Points(g, partMat(additive, soft, shape));
    this.points.frustumCulled = false;
  }
  emit(x, y, z, vx, vy, vz, life, size, r, g, b, a, grav = 0, drag = 0, grow = 0) {
    const i = this.i; this.i = (i + 1) % this.n;
    const i3 = i * 3, i4 = i * 4;
    this.pos[i3] = x; this.pos[i3 + 1] = y; this.pos[i3 + 2] = z;
    this.vel[i3] = vx; this.vel[i3 + 1] = vy; this.vel[i3 + 2] = vz;
    this.life[i] = life; this.max[i] = life; this.s0[i] = size; this.size[i] = size;
    this.col[i4] = r; this.col[i4 + 1] = g; this.col[i4 + 2] = b; this.col[i4 + 3] = a;
    this.par[i4] = grav; this.par[i4 + 1] = drag; this.par[i4 + 2] = grow; this.par[i4 + 3] = a;
    this.dirty = true;
  }
  update(dt) {
    let any = false;
    const { pos, vel, life, max, par, col, size, s0 } = this;
    for (let i = 0; i < this.n; i++) {
      let l = life[i];
      if (l <= 0) continue;
      any = true; l -= dt;
      const i3 = i * 3, i4 = i * 4;
      if (l <= 0) { life[i] = 0; size[i] = 0; col[i4 + 3] = 0; continue; }
      life[i] = l;
      const k = l / max[i];
      const dr = Math.max(0, 1 - par[i4 + 1] * dt);
      vel[i3] *= dr; vel[i3 + 1] = vel[i3 + 1] * dr - par[i4] * dt; vel[i3 + 2] *= dr;
      pos[i3] += vel[i3] * dt; pos[i3 + 1] += vel[i3 + 1] * dt; pos[i3 + 2] += vel[i3 + 2] * dt;
      if (par[i4] > 2 && pos[i3 + 1] < 0.03) { pos[i3 + 1] = 0.03; vel[i3 + 1] *= -0.35; vel[i3] *= 0.6; vel[i3 + 2] *= 0.6; }
      size[i] = s0[i] + par[i4 + 2] * (1 - k);
      col[i4 + 3] = par[i4 + 3] * (k < 0.7 ? k / 0.7 : 1) * (k > 0.92 ? (1 - k) / 0.08 : 1);
    }
    if (any || this.dirty) {
      this.geo.attributes.position.needsUpdate = true;
      this.geo.attributes.aColor.needsUpdate = true;
      this.geo.attributes.aSize.needsUpdate = true;
    }
    this.dirty = any;
  }
  clear() { this.life.fill(0); this.size.fill(0); this.dirty = true; }
}

class Trail {
  constructor(n, color, lifeT = 0.16) {
    this.n = n; this.lifeT = lifeT; this.s = [];
    this.pos = new Float32Array(n * 6); this.al = new Float32Array(n * 2);
    const edge = new Float32Array(n * 2); const idx = [];
    for (let i = 0; i < n; i++) { edge[i * 2] = 0; edge[i * 2 + 1] = 1; }
    for (let i = 0; i < n - 1; i++) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    const g = (this.geo = new T.BufferGeometry());
    g.setAttribute('position', new T.BufferAttribute(this.pos, 3).setUsage(T.DynamicDrawUsage));
    g.setAttribute('aAlpha', new T.BufferAttribute(this.al, 1).setUsage(T.DynamicDrawUsage));
    g.setAttribute('aEdge', new T.BufferAttribute(edge, 1));
    g.setIndex(idx);
    this.mat = new T.ShaderMaterial({
      uniforms: { uColor: { value: hex(color) }, uGain: { value: 1 } },
      vertexShader: `attribute float aAlpha; attribute float aEdge; varying float vA; varying float vE;
        void main(){ vA = aAlpha; vE = aEdge; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform vec3 uColor; uniform float uGain; varying float vA; varying float vE;
        void main(){
          // cel look: a white blade edge, a flat band of the trail colour behind it, hard steps between
          float core = smoothstep(0.9, 0.94, vE), b2 = smoothstep(0.62, 0.66, vE), b1 = smoothstep(0.3, 0.34, vE), cut = smoothstep(0.05, 0.22, vA);
          gl_FragColor = vec4(mix(mix(uColor, vec3(1.0), 0.35 * b2), vec3(1.0), core), cut * (0.2 * b1 + 0.2 * b2 + 0.52 * core) * uGain);
        }`,
      transparent: true, depthWrite: false, side: T.DoubleSide, fog: false,
    });
    this.mesh = new T.Mesh(g, this.mat);
    this.mesh.frustumCulled = false;
  }
  setColor(c) { this.mat.uniforms.uColor.value.set(c); }
  push(a, b) {
    let s = this.s.length >= this.n ? this.s.pop() : { a: V3(), b: V3(), age: 0 };
    s.a.copy(a); s.b.copy(b); s.age = 0;
    this.s.unshift(s);
  }
  update(dt) {
    const { s, n, pos, al, lifeT } = this;
    let lx = 0, ly = 0, lz = 0, any = false;
    for (let i = 0; i < n; i++) {
      const k = i * 6, sm = s[i];
      if (sm) sm.age += dt;
      if (sm && sm.age < lifeT) {
        any = true;
        pos[k] = sm.a.x; pos[k + 1] = sm.a.y; pos[k + 2] = sm.a.z;
        pos[k + 3] = sm.b.x; pos[k + 4] = sm.b.y; pos[k + 5] = sm.b.z;
        lx = sm.b.x; ly = sm.b.y; lz = sm.b.z;
        const a = Math.pow(1 - sm.age / lifeT, 1.4);
        al[i * 2] = a; al[i * 2 + 1] = a;
      } else {
        pos[k] = pos[k + 3] = lx; pos[k + 1] = pos[k + 4] = ly; pos[k + 2] = pos[k + 5] = lz;
        al[i * 2] = al[i * 2 + 1] = 0;
      }
    }
    this.mesh.visible = any;
    if (any) { this.geo.attributes.position.needsUpdate = true; this.geo.attributes.aAlpha.needsUpdate = true; }
  }
  clear() { this.s.length = 0; this.mesh.visible = false; }
}
