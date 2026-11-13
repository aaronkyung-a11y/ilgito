// ───────────────────────── toon: cel shading and ink outlines (v0.3) ─────────────────────────
// Every surface is shaded in flat steps (shade / lit / a small highlight step) and wrapped in an ink line.
// Two light environments: W = the world scene, V = the first-person view model (which lives in camera space).
function toonEnv() {
  return { sun: { value: V3(0.3, 0.6, -0.7).normalize() }, lit: { value: hex(0xffffff) }, shade: { value: hex(0x8a84a8) }, rim: { value: hex(0xffffff) }, ink: { value: hex(0x1a1210) } };
}
const TOON = { W: toonEnv(), V: toonEnv(), res: { value: new T.Vector2(800, 800) }, px: { value: 1.6 }, hs: { value: 7 } };
// palette colours were chosen for soft lighting; flat shading wants them lifted (dark ones gain the most)
function celC(c, g) { const k = hex(c); g = g || 0.72; k.r = Math.pow(k.r, g); k.g = Math.pow(k.g, g); k.b = Math.pow(k.b, g); return k; }

const TOON_VS = `
#include <common>
#include <fog_pars_vertex>
varying vec3 vN;
varying vec3 vV;
#ifdef T_MAP
  uniform mat3 uUvT;
  varying vec2 vUv;
#endif
#ifdef T_VCOL
  attribute vec3 color;
#endif
#if defined(T_VCOL) || defined(USE_INSTANCING_COLOR)
  varying vec3 vCol;
#endif
void main() {
  #include <beginnormal_vertex>
  #include <defaultnormal_vertex>
  #include <begin_vertex>
  #include <project_vertex>
  vN = transformedNormal;
  vV = -mvPosition.xyz;
  #ifdef T_MAP
    vUv = (uUvT * vec3(uv, 1.0)).xy;
  #endif
  #if defined(T_VCOL) || defined(USE_INSTANCING_COLOR)
    vCol = vec3(1.0);
  #endif
  #ifdef T_VCOL
    vCol *= color;
  #endif
  #ifdef USE_INSTANCING_COLOR
    vCol *= instanceColor;
  #endif
  #include <fog_vertex>
}`;
const TOON_FS = `
#include <common>
#include <fog_pars_fragment>
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 uSun;       // direction to the sun, in the scene's world space
uniform vec3 uLit;       // tint of lit areas
uniform vec3 uShade;     // tint of shaded areas (a colour, not just darker)
uniform vec3 uRim;       // rim light colour
uniform vec4 uP;         // x: terminator, y: softness, z: highlight step, w: highlight gain
uniform vec4 uS;         // x: specular strength, y: shininess, z: rim strength, w: rim cut
uniform vec3 uSpecCol;
uniform float uK;        // 0 = lit by the real sun, 1 = lit by a key light fixed to the camera (keeps faces readable)
uniform float uHs;       // hatching: spacing of the pen lines, in device pixels
uniform float uHa;       // hatching: strength (0 = flat cel shade)
varying vec3 vN;
varying vec3 vV;
#ifdef T_MAP
  uniform sampler2D map;
  varying vec2 vUv;
#endif
#if defined(T_VCOL) || defined(USE_INSTANCING_COLOR)
  varying vec3 vCol;
#endif
void main() {
  vec4 base = vec4(diffuse, 1.0);
  #ifdef T_MAP
    base *= texture2D(map, vUv);
  #endif
  #ifdef ALPHATEST
    if (base.a < ALPHATEST) discard;
  #endif
  #if defined(T_VCOL) || defined(USE_INSTANCING_COLOR)
    base.rgb *= vCol;
  #endif
  #ifdef T_FLAT
    vec3 N = normalize(cross(dFdx(vV), dFdy(vV)));
  #else
    vec3 N = normalize(vN);
    #ifdef DOUBLE_SIDED
      N *= gl_FrontFacing ? 1.0 : -1.0;
    #endif
  #endif
  vec3 V = normalize(vV);
  vec3 Ls = normalize((viewMatrix * vec4(uSun, 0.0)).xyz);
  vec3 L = normalize(mix(Ls, vec3(0.42, 0.56, 0.71), uK));
  float ndl = dot(N, L);
  float band = smoothstep(uP.x - uP.y, uP.x + uP.y, ndl);
  float hi = smoothstep(uP.z - uP.y, uP.z + uP.y, ndl);
  vec3 col = base.rgb * mix(uShade, uLit, band) * (1.0 + hi * uP.w);
  // one crisp highlight shape
  float nh = max(dot(N, normalize(L + V)), 0.0);
  float sp = smoothstep(0.46, 0.54, pow(nh, uS.y)) * uS.x * band;
  col = mix(col, uSpecCol, sp);
  // rim: a thin bright edge on the side that faces the real sun
  float fr = 1.0 - max(dot(N, V), 0.0);
  float rim = smoothstep(uS.w, uS.w + 0.045, fr) * smoothstep(-0.3, 0.3, dot(N, Ls)) * uS.z;
  col = mix(col, uRim * (0.55 + 0.45 * base.rgb), rim);
  // pen hatching in the shade: one set of diagonal strokes, and a second set crossing it where the surface turns well away from the light
  float hsh = (1.0 - band) * uHa;
  if (hsh > 0.001) {
    vec2 fc = gl_FragCoord.xy / uHs;
    float l1 = abs(fract(fc.x * 0.55 + fc.y) - 0.5) * 2.0, l2 = abs(fract(fc.x - fc.y * 0.45 + 0.25) - 0.5) * 2.0;
    float hm = (1.0 - smoothstep(0.16, 0.34, l1)) + (1.0 - smoothstep(0.16, 0.34, l2)) * smoothstep(-0.2, -0.55, ndl);
    col *= 1.0 - 0.46 * min(hm, 1.0) * hsh;
  }
  col += emissive;
  gl_FragColor = vec4(col, 1.0);
  #include <fog_fragment>
}`;
// o: color, map, vcol, flat, side, alphaTest, env ('W'|'V'), key (0..1), edge, soft, hiEdge, hi, spec, shin, specCol, rim, rimCut, fog,
//    hatch (0..1; by default the figures — anything lit by the key light — are hatched and the scenery is not)
function toonMat(o) {
  o = o || {};
  const world = (o.env || 'W') === 'W', env = TOON[world ? 'W' : 'V'], defs = {};
  if (o.map) defs.T_MAP = '';
  if (o.vcol) defs.T_VCOL = '';
  if (o.flat) defs.T_FLAT = '';
  const u = {
    diffuse: { value: hex(o.color === undefined ? 0xffffff : o.color) }, emissive: { value: hex(0x000000) },
    uSun: env.sun, uLit: env.lit, uShade: env.shade, uRim: env.rim,
    uP: { value: new T.Vector4(o.edge === undefined ? 0.06 : o.edge, o.soft === undefined ? 0.018 : o.soft, o.hiEdge === undefined ? 0.74 : o.hiEdge, o.hi || 0) },
    uS: { value: new T.Vector4(o.spec || 0, o.shin || 30, o.rim === undefined ? 0.5 : o.rim, o.rimCut === undefined ? 0.62 : o.rimCut) },
    uSpecCol: { value: hex(o.specCol === undefined ? 0xffffff : o.specCol) },
    uK: { value: o.key === undefined ? 0 : o.key },
    uHs: TOON.hs, uHa: { value: o.hatch === undefined ? (o.key ? 0.6 : 0) : o.hatch },
    fogColor: { value: new T.Color() }, fogNear: { value: 1 }, fogFar: { value: 1000 },
  };
  if (o.map) { o.map.updateMatrix(); u.map = { value: o.map }; u.uUvT = { value: o.map.matrix }; }
  const m = new T.ShaderMaterial({ uniforms: u, defines: defs, vertexShader: TOON_VS, fragmentShader: TOON_FS, side: o.side || T.FrontSide, fog: world && o.fog !== false });
  if (o.flat) m.extensions.derivatives = true;
  if (o.alphaTest) m.alphaTest = o.alphaTest;
  m.color = u.diffuse.value; m.emissive = u.emissive.value;
  return m;
}

// ── ink: the mesh drawn again inside-out, pushed out along its normals by a fixed number of pixels
const INK_VS = `
#include <common>
#include <fog_pars_vertex>
uniform vec2 uRes;
uniform float uPx;
uniform vec2 uW;         // x: width scale, y: smallest width factor far away
void main() {
  #include <beginnormal_vertex>
  #include <defaultnormal_vertex>
  #include <begin_vertex>
  #include <project_vertex>
  // sit a hair behind the surface (0.4% of the distance) so a sheet's own shell never fights it for depth.
  // (a slope-scaled polygon offset would throw the edge-on shell faces behind the far ground instead)
  mvPosition.xyz *= 1.004;
  gl_Position = projectionMatrix * mvPosition;
  vec3 n = normalize(transformedNormal);
  float w = max(gl_Position.w, 0.001);
  float px = uPx * uW.x * clamp(7.0 / w, uW.y, 1.0);
  gl_Position.xy += n.xy * (px * 2.0 * w) / uRes;
  #include <fog_vertex>
}`;
const INK_FS = `
#include <common>
#include <fog_pars_fragment>
uniform vec3 uInk;
void main() {
  gl_FragColor = vec4(uInk, 1.0);
  #include <fog_fragment>
}`;
function inkMat(o) {
  o = o || {};
  const world = (o.env || 'W') === 'W';
  const m = new T.ShaderMaterial({
    uniforms: { uInk: TOON[world ? 'W' : 'V'].ink, uRes: TOON.res, uPx: TOON.px, uW: { value: new T.Vector2(o.w || 1, o.far === undefined ? 0.34 : o.far) }, fogColor: { value: new T.Color() }, fogNear: { value: 1 }, fogFar: { value: 1000 } },
    vertexShader: INK_VS, fragmentShader: INK_FS, side: T.BackSide, fog: world,
  });
  m.userData.keep = true;
  return m;
}
const INK_W = inkMat({ env: 'W' }), INK_V = inkMat({ env: 'V' }), INK_FAR = inkMat({ env: 'W', w: 1.15, far: 0.62 });
const _iv = V3(), _im = new T.Matrix3();
// one welded shell for several pieces: vertices that share a position share one averaged normal, so hard edges do not split the line
function inkGeo(parts) {
  const P = [], N = [], I = [], seen = new Map();
  for (let q = 0; q < parts.length; q++) {
    const g = parts[q].g, m = parts[q].m, pos = g.attributes.position, nor = g.attributes.normal, ix = g.index, cnt = ix ? ix.count : pos.count;
    const flip = m && m.determinant() < 0, local = new Int32Array(pos.count).fill(-1);
    if (m) _im.getNormalMatrix(m);
    const vid = (k) => {
      if (local[k] >= 0) return local[k];
      _iv.fromBufferAttribute(pos, k); if (m) _iv.applyMatrix4(m);
      const key = Math.round(_iv.x * 2500) + '_' + Math.round(_iv.y * 2500) + '_' + Math.round(_iv.z * 2500);
      let id = seen.get(key);
      if (id === undefined) { id = P.length / 3; seen.set(key, id); P.push(_iv.x, _iv.y, _iv.z); N.push(0, 0, 0); }
      _iv.fromBufferAttribute(nor, k); if (m) _iv.applyMatrix3(_im).normalize();
      N[id * 3] += _iv.x; N[id * 3 + 1] += _iv.y; N[id * 3 + 2] += _iv.z;
      return (local[k] = id);
    };
    for (let k = 0; k < cnt; k += 3) {
      const a = vid(ix ? ix.getX(k) : k), b = vid(ix ? ix.getX(k + 1) : k + 1), c = vid(ix ? ix.getX(k + 2) : k + 2);
      if (a === b || b === c || a === c) continue;
      if (flip) I.push(a, c, b); else I.push(a, b, c);
    }
  }
  for (let i = 0; i < N.length; i += 3) { const l = Math.hypot(N[i], N[i + 1], N[i + 2]); if (l > 1e-6) { N[i] /= l; N[i + 1] /= l; N[i + 2] /= l; } else { N[i] = 0; N[i + 1] = 1; N[i + 2] = 0; } }
  const out = new T.BufferGeometry();
  out.setAttribute('position', new T.Float32BufferAttribute(P, 3));
  out.setAttribute('normal', new T.Float32BufferAttribute(N, 3));
  out.setIndex(I);
  return out;
}
// give every rigid group under root one ink shell made from its own solid meshes.
// skipped: cut-out hair cards (alphaTest), transparent things, meshes marked userData.noInk. userData.dyn = the mesh itself moves, so it gets its own shell
function addInk(root, mat) {
  const nodes = [];
  root.traverse((n) => nodes.push(n));
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i], parts = [];
    if (n.userData.ink) continue;
    for (let j = 0; j < n.children.length; j++) {
      const c = n.children[j], m = c.material;
      if (!c.isMesh || c.isInstancedMesh || c.userData.ink || c.userData.noInk || !m || m.alphaTest > 0 || m.transparent || !c.geometry.attributes.normal) continue;
      if (c.userData.dyn) { const s = new T.Mesh(inkGeo([{ g: c.geometry }]), mat); s.userData.ink = true; c.add(s); continue; }
      c.updateMatrix(); parts.push({ g: c.geometry, m: c.matrix });
    }
    if (parts.length) { const s = new T.Mesh(inkGeo(parts), mat); s.userData.ink = true; n.add(s); }
  }
}
// an ink shell for an InstancedMesh (shares its instance matrices)
function inkInstanced(im, mat) {
  const s = new T.InstancedMesh(inkGeo([{ g: im.geometry }]), mat, im.count);
  s.instanceMatrix = im.instanceMatrix; s.userData.ink = true; s.frustumCulled = im.frustumCulled;
  return s;
}
