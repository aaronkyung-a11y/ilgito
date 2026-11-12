// ───────────────────────── first-person view model: own horse, arms, weapon ─────────────────────────
const VM_KEYS = ['wx', 'wy', 'wz', 'az', 'el', 'lh'];
function Vz(wx, wy, wz, az, el, lh = 0) { return { wx, wy, wz, az, el, lh }; }
// camera space: +x right, +y up, -z forward. az>0 = blade to the right, el = elevation
const VP = {
  idle: Vz(0.3, -0.44, -0.46, 6, 54, 0),
  gallop: Vz(0.33, -0.4, -0.44, 16, 30, 0),
  guard: Vz(0.22, -0.2, -0.48, -80, 12, 1),
  L: { s: Vz(0.34, -0.3, -0.46, 78, 24, 0), e: Vz(-0.02, -0.4, -0.47, -72, 4, 0) },
  R: { s: Vz(0.02, -0.34, -0.5, -78, 24, 0), e: Vz(0.4, -0.38, -0.46, 72, 4, 0) },
  U: { s: Vz(0.26, -0.52, -0.44, 10, -38, 0), e: Vz(0.2, -0.2, -0.5, 2, 84, 0) },
  D: { s: Vz(0.22, -0.14, -0.44, 4, 100, 0), e: Vz(0.2, -0.46, -0.5, 0, -22, 0) },
  hurt: Vz(0.36, -0.58, -0.38, 34, 26, 0),
  raise: Vz(0.3, -0.2, -0.46, -2, 97, 0),
  cheer: Vz(0.36, -0.3, -0.5, 6, 80, 0),
  low: Vz(0.34, -0.62, -0.4, 40, 4, 0),
};
const EYE_H = 2.5;
const VM = (() => {
  const scene = new T.Scene();
  const cam = new T.PerspectiveCamera(70, 1, 0.03, 40);
  const hemi = new T.HemisphereLight(0xffffff, 0x444444, 0.9), sun = new T.DirectionalLight(0xffffff, 1), fill = new T.DirectionalLight(0xffffff, 0.3);
  scene.add(hemi, sun, sun.target, fill, fill.target);
  fill.position.set(0, 2, 4);
  const level = new T.Group(); level.rotation.order = 'ZXY'; scene.add(level);
  const yaw = new T.Group(); level.add(yaw);
  const rig = new T.Group(); scene.add(rig);
  let horse = null, weapon = null;
  const anim = new PoseAnim(VP.idle, VM_KEYS);
  const edge = V3(1, 0, 0), prevTip = V3(), tA = V3(), tB = V3();
  const trail = new Trail(20, 0xffffff, 0.2); scene.add(trail.mesh);
  const recoil = new Spring(260, 20), recoilY = new Spring(200, 18);
  let slashT = 0, slashDelay = 0, kx = 1, base = 'idle', guardOn = false;
  const skinM = mLam(0xd7a57c), sleeveM = new T.MeshLambertMaterial({ color: 0x2f6b48, map: TEX.cloth }), reinM = mLam(0x3a261a);
  const bracerM = new T.MeshPhongMaterial({ color: 0x8a7a4a, specular: 0x3a342c, shininess: 22, map: TEX.lamellar, bumpMap: TEX.lamellarBump, bumpScale: 0.006 }), cuffM = goldMat();
  const arm = (k, right) => {
    const a = makeArm(right, 0.31, 0.3, { sleeve: sleeveM, bracer: bracerM, gold: cuffM, skin: skinM });
    rig.add(a.up, a.lo, a.hand);
    return { S: V3(k * 0.21, -0.34, 0.08), E: V3(), H: V3(), k, up: a.up, lo: a.lo, hand: a.hand, pole: V3(k * 0.6, -0.8, 0.5).normalize() };
  };
  const aR = arm(1, true), aL = arm(-1, false);
  const reins = [mesh(segG(0.008, 0.008, 4), reinM, 0, 0, 0, scene), mesh(segG(0.008, 0.008, 4), reinM, 0, 0, 0, scene)];
  const restL = V3(-0.15, -0.52, -0.38);

  function setHero(h) {
    const junk = (o) => o.traverse((n) => { if (n.geometry && n.geometry !== FIST_R && n.geometry !== FIST_L) n.geometry.dispose(); if (n.material && n.material.dispose) n.material.dispose(); });
    if (horse) { yaw.remove(horse.root); junk(horse.root); }
    if (weapon) { rig.remove(weapon.g); junk(weapon.g); }
    horse = makeHorse(h.horse);
    horse.root.position.set(0, -EYE_H - 0.16, -0.1);
    yaw.add(horse.root);
    weapon = makeWeapon(h.weapon, h.weaponOpt);
    rig.add(weapon.g);
    sleeveM.color.set(h.sleeve); bracerM.color.set(h.bracer);
    trail.setColor(h.trail);
    anim.snap(VP.idle); base = 'idle';
  }
  function syncLights() {
    hemi.color.copy(World.hemi.color); hemi.groundColor.copy(World.hemi.groundColor); hemi.intensity = World.hemi.intensity;
    sun.color.copy(World.sun.color); sun.intensity = World.sun.intensity;
    fill.color.copy(World.fill.color); fill.intensity = World.fill.intensity + 0.15;
  }
  function slash(dir, fast) {
    const sp = VP[dir], k = fast ? 0.7 : 1;
    anim.play([{ p: sp.s, d: 0.035 * k, e: 'out2' }, { p: sp.e, d: 0.12 * k, e: 'in2' }, { p: sp.e, d: 0.05 * k, e: 'lin' }, { p: VP[guardOn ? 'guard' : base], d: 0.2, e: 'io' }]);
    slashT = 0.22 * k; slashDelay = 0;
  }
  function slashAt(dir, delay) {
    const sp = VP[dir];
    anim.play([{ p: sp.s, d: 0.09, e: 'out' }, { p: sp.s, d: Math.max(0, delay - 0.09), e: 'lin' }, { p: sp.e, d: 0.105, e: 'in2' }, { p: sp.e, d: 0.08, e: 'lin' }, { p: VP[base], d: 0.25, e: 'io' }]);
    slashDelay = Math.max(0.09, delay); slashT = 0.2;
  }
  function setGuard(on) {
    if (guardOn === on) return;
    guardOn = on;
    anim.play([{ p: VP[on ? 'guard' : base], d: on ? 0.08 : 0.16, e: 'out' }]);
  }
  function setBase(name) {
    if (base === name) return;
    base = name;
    if (!guardOn && !anim.busy) anim.play([{ p: VP[name], d: 0.35, e: 'io' }]);
  }
  function kick(z, y) { recoil.kick(z); recoilY.kick(y || 0); }
  function hurt() { anim.play([{ p: VP.hurt, d: 0.07, e: 'out' }, { p: VP.hurt, d: 0.12, e: 'lin' }, { p: VP[guardOn ? 'guard' : base], d: 0.3, e: 'io' }]); }
  function raise(d) { anim.play([{ p: VP.raise, d: d, e: 'out' }]); }
  function cheer() { anim.play([{ p: VP.cheer, d: 0.6, e: 'back' }]); }
  function drop() { anim.play([{ p: VP.low, d: 0.5, e: 'io' }]); }
  function rest() { anim.play([{ p: VP[base], d: 0.3, e: 'io' }]); guardOn = false; }

  function update(dt, t, s) {
    kx = clamp(0.56 + s.aspect * 0.4, 0.72, 1.5);
    anim.update(dt);
    const p = anim.cur, g = weapon.g;
    const rc = recoil.update(dt), ry = recoilY.update(dt);
    const bob = s.gait * 0.02 * Math.sin(s.phase * TAU * 2 + 1) + 0.004 * Math.sin(t * 1.8);
    g.position.set(p.wx * kx, p.wy + bob + ry, p.wz + rc);
    const az = rad(p.az), el = rad(p.el), ce = Math.cos(el);
    _d.set(Math.sin(az) * ce, Math.sin(el), -Math.cos(az) * ce);
    _tip.copy(_d).multiplyScalar(weapon.tipY).add(g.position);
    _hl.subVectors(_tip, prevTip);
    if (_hl.lengthSq() > 0.0009) edge.lerp(_hl.normalize(), 0.7);
    prevTip.copy(_tip);
    orientYX(g, _d, edge);
    aR.S.x = 0.21 * kx; aL.S.x = -0.21 * kx;
    aR.H.copy(g.position);
    solveIK(aR.S, aR.H, 0.31, 0.3, aR.pole, aR.E);
    aimLimb(aR.up, aR.S, aR.E); aimLimb(aR.lo, aR.E, aR.H);
    tA.subVectors(aR.H, aR.E); aR.hand.position.copy(aR.H); orientXY(aR.hand, _d, tA);
    _hl.copy(g.position).addScaledVector(_d, 0.42);
    aL.H.set(restL.x * kx, restL.y + s.gait * 0.012 * Math.sin(s.phase * TAU * 2), restL.z).lerp(_hl, sat(p.lh));
    solveIK(aL.S, aL.H, 0.31, 0.3, aL.pole, aL.E);
    aimLimb(aL.up, aL.S, aL.E); aimLimb(aL.lo, aL.E, aL.H);
    tA.subVectors(aL.H, aL.E); tB.set(1, 0.2, 0).lerp(_d, sat(p.lh)); aL.hand.position.copy(aL.H); orientXY(aL.hand, tB, tA);
    // own horse, kept level with the world while the camera pitches/rolls
    level.rotation.set(-s.pitch, 0, -s.roll);
    level.position.set(0, -s.headBob, 0);
    yaw.rotation.y = PI + s.psi;
    animHorse(horse, t, { phase: s.phase, gait: s.gait, rear: s.rear, idle: 1, toss: s.toss });
    scene.updateMatrixWorld(true);
    for (let i = 0; i < 2; i++) {
      tA.copy(horse.bits[i]); horse.head.localToWorld(tA);
      aimSeg(reins[i], aL.H, tA);
    }
    if (slashDelay > 0) slashDelay -= dt;
    else if (slashT > 0) {
      slashT -= dt;
      tA.set(0, weapon.baseY + 0.1, 0); g.localToWorld(tA);
      tB.set(0, weapon.tipY, 0); g.localToWorld(tB);
      trail.push(tA, tB);
    }
    trail.update(dt);
    sun.position.copy(World.sunDir).applyQuaternion(s.invQ).multiplyScalar(10);
  }
  return { scene, cam, setHero, syncLights, slash, slashAt, setGuard, setBase, kick, hurt, raise, cheer, drop, rest, update, get guarding() { return guardOn; } };
})();
