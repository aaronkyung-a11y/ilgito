// ───────────────────────── camera, loop, boot ─────────────────────────
const Cam = (() => {
  const cam = new T.PerspectiveCamera(70, 1, 0.04, 1500);
  cam.rotation.order = 'YXZ';
  let trauma = 0, baseFov = 70, W = 1, H = 1, aspect = 1, zoomK = 0, chargeK = 0, headBob = 0;
  const sp = { pitch: new Spring(150, 15), yaw: new Spring(150, 15), roll: new Spring(120, 12), z: new Spring(170, 17), fov: new Spring(120, 13) };
  const P = V3(), Epos = V3(), invQ = new T.Quaternion(), _p = V3(), scr = { x: 0, y: 0 };
  function resize(w, h) {
    W = w; H = h; aspect = w / h;
    baseFov = clamp((2 * Math.atan(Math.tan(rad(31)) / aspect) * 180) / PI, 52, 74);
    cam.aspect = aspect; cam.fov = baseFov; cam.updateProjectionMatrix();
  }
  function shake(v) { v *= REDUCED ? 0.35 : 1; trauma = Math.min(1.25, Math.max(trauma, v)); }
  function punch(v) { sp.fov.kick(v * 20); }
  function hitKick(dir, k) {
    if (dir === 'L') { sp.roll.kick(-2.4 * k); sp.yaw.kick(-1.8 * k); }
    else if (dir === 'R') { sp.roll.kick(2.4 * k); sp.yaw.kick(1.8 * k); }
    else if (dir === 'U') sp.pitch.kick(-2.6 * k);
    else sp.pitch.kick(1.8 * k);
    sp.z.kick(3.6 * k);
  }
  function swingKick(dir) {
    const v = { L: [0.55, 0], R: [-0.55, 0], U: [0, 0.45], D: [0, -0.45] }[dir];
    sp.yaw.kick(v[0]); sp.pitch.kick(v[1]); sp.roll.kick(v[0] * 0.7);
  }
  function update(dt, rdt, t) {
    trauma = Math.max(0, trauma - rdt * 1.9);
    const tr = trauma * trauma, tt = G.rt;
    const nz = (a, b) => Math.sin(tt * a + b) * 0.6 + Math.sin(tt * a * 1.83 + b * 2.1) * 0.4;
    const shY = nz(41, 0.3) * tr * 0.05, shP = nz(47, 1.7) * tr * 0.042, shR = nz(37, 4.1) * tr * 0.07;
    const kP = sp.pitch.update(rdt) * 0.3, kY = sp.yaw.update(rdt) * 0.3, kR = sp.roll.update(rdt) * 0.3, kZ = sp.z.update(rdt) * 0.55, kF = sp.fov.update(rdt);
    const s = Math.sin(G.theta), c = Math.cos(G.theta);
    let fov = baseFov;
    if (G.mode === 'title') {
      Epos.set(0, 0, 0); P.set(s * 6.4, 0, c * 6.4);
      const port = aspect < 1, dc = G.dbg;
      cam.position.set(P.x, 2.05, P.z);
      cam.rotation.set(port ? -0.02 : 0.03, G.theta + (port ? 0 : -0.26), 0);
      fov = port ? 46 : 34;
      if (dc) {
        if (dc.at) { cam.position.set(dc.at[0] + s * dc.r, dc.y, dc.at[2] + c * dc.r); cam.lookAt(dc.at[0], dc.at[1], dc.at[2]); }
        else { cam.position.set(s * dc.r, dc.y, c * dc.r); cam.rotation.set(dc.pitch, G.theta, 0); }
        fov = dc.fov;
      }
      headBob = 0;
    } else {
      const hd = G.d / 2, dEff = Math.max(1.6, G.d + G.lunge.x + G.push.x);
      P.set(s * hd, 0, c * hd); Epos.set(s * (hd - dEff), 0, c * (hd - dEff));
      const scale = Rig.E ? Rig.E.scale : 1, ph = G.pPhase * TAU;
      headBob = G.pGait * 0.085 * Math.sin(ph - 0.6) + (1 - G.pGait) * 0.012 * Math.sin(t * 2.1);
      let eyeY = EYE_H + headBob + G.pRear * 0.28;
      let pitch = -Math.atan2(EYE_H - 2.2 * scale, Math.max(2.2, dEff)) * sat(8 / dEff) + G.pGait * 0.012 * Math.sin(ph + 0.9) + G.pRear * 0.26;
      let roll = G.pGait * 0.014 * Math.sin(ph * 0.5) + clamp(G.omega, -1.2, 1.2) * 0.05 + (1 - G.pGait) * 0.006 * Math.sin(t * 0.83);
      pitch += (1 - G.pGait) * 0.004 * Math.sin(t * 1.13 + 1);
      if (G.camFall > 0) { const k = EASE.in2(G.camFall); eyeY = lerp(eyeY, 0.5, k); roll += k * 1.2; pitch += k * 0.3; }
      cam.position.set(P.x + s * kZ, eyeY, P.z + c * kZ);
      let yaw = G.theta;
      if (G.mode === 'victory' && Rig.fallen(_p)) { // follow the fallen general
        const k = smooth(G.endT / 0.9), dx = _p.x - cam.position.x, dz = _p.z - cam.position.z;
        let dyaw = Math.atan2(-dx, -dz) - yaw; dyaw = Math.atan2(Math.sin(dyaw), Math.cos(dyaw));
        yaw += dyaw * k * 0.85;
        pitch = lerp(pitch, Math.atan2(_p.y + 0.3 - eyeY, Math.hypot(dx, dz)), k * 0.8);
      }
      cam.rotation.set(pitch + kP + shP, yaw + kY + shY, roll + kR + shR);
      zoomK = damp(zoomK, G.mode === 'intro' ? 1 : 0, G.mode === 'intro' ? 3 : 5, rdt);
      // charge: dolly-zoom — long lens while the foe is far, widening as the gap closes
      const far = G.mode === 'charge' ? smooth((dEff - 5) / 34) : 0;
      chargeK = damp(chargeK, far, 6, rdt);
      fov = lerp(lerp(baseFov + G.pGait * 8, 40, chargeK) - (1 - G.focus) * 16 + (G.p && G.p.guard ? -3 : 0), 23, zoomK);
    }
    fov = clamp(fov + kF, 12, 100);
    if (Math.abs(fov - cam.fov) > 0.01) { cam.fov = fov; cam.updateProjectionMatrix(); }
    cam.updateMatrixWorld(true);
    invQ.copy(cam.quaternion).invert();
  }
  function front(out, dist, side, up) {
    out.set(side || 0, up || 0, -dist).applyQuaternion(cam.quaternion).add(cam.position);
    return out;
  }
  function project(v) { _p.copy(v).project(cam); scr.x = (_p.x + 1) * 0.5 * W; scr.y = (1 - _p.y) * 0.5 * H; return scr; }
  const right = (out) => out.set(1, 0, 0).applyQuaternion(cam.quaternion);
  const fwd = (out) => out.set(0, 0, -1).applyQuaternion(cam.quaternion);
  return { cam, P, Epos, invQ, resize, shake, punch, hitKick, swingKick, update, front, project, right, fwd,
    get baseFov() { return baseFov; }, get aspect() { return aspect; }, get headBob() { return headBob; } };
})();

const Main = (() => {
  let renderer, PR = 1, last = 0, fAcc = 0, fN = 0, lastP = 0, lastE = 0, windV = -1, stepT = 0, tossT = 3, ok = false;
  const _f = V3(), rigS = { pos: Cam.Epos, yaw: 0, psi: 0, phase: 0, gait: 0, rear: 0, toss: 0, wind: 0, low: 0 };
  const vmS = { aspect: 1, pitch: 0, roll: 0, psi: 0, phase: 0, gait: 0, rear: 0, toss: 0, headBob: 0, invQ: Cam.invQ };
  const BEATS = [0, 0.12, 0.5, 0.62];
  function resize() {
    const w = Math.max(1, window.innerWidth), h = Math.max(1, window.innerHeight);
    renderer.setPixelRatio(PR); renderer.setSize(w, h, false);
    TOON.res.value.set(w * PR, h * PR); TOON.px.value = 1.5 * PR;      // ink line: 1.5 CSS px
    Cam.resize(w, h);
    VM.cam.aspect = w / h; VM.cam.fov = Cam.baseFov; VM.cam.updateProjectionMatrix();
    F2.resize(w, h);
    if (ok && G.paused) tick(0.0001); // keep the frozen frame matched to the new size
  }
  function hooves(dt) {
    const pv = G.pGait, ev = G.eGait;
    if (pv > 0.25) for (let i = 0; i < 4; i++) if (Math.floor(G.pPhase - BEATS[i]) !== Math.floor(lastP - BEATS[i])) {
      Snd.hoof(0.85 * pv, i < 2 ? -0.25 : 0.25, 0);
      if (i === 1) Snd.jingle(pv, 0);
    }
    if (ev > 0.25 && G.mode !== 'title') {
      const far = sat(G.d / 45);
      for (let i = 0; i < 4; i++) if (Math.floor(G.ePhase - BEATS[i]) !== Math.floor(lastE - BEATS[i])) {
        Snd.hoof(0.7 * ev, 0.1, far);
        if (i % 2 === 0) FX.dustBurst(Cam.Epos, 3, 0.5, 1, 0.9);
      }
    }
    lastP = G.pPhase; lastE = G.ePhase;
    if (G.mode === 'melee' || G.mode === 'super') {
      stepT -= dt;
      if (stepT <= 0) {
        stepT = rnd(0.35, 0.9); const foe = Math.random() < 0.6;
        Snd.hoof(0.3, foe ? 0.35 : -0.3, foe ? 0.15 : 0); FX.dustBurst(foe ? Cam.Epos : Cam.P, 2, 0.6, 0.7, 0.7);
        if (Math.random() < 0.12) Snd.snort(0.45, foe ? 0.4 : -0.4);
      }
    }
  }
  function frame(now) {
    requestAnimationFrame(frame);
    const rdt = clamp((now - last) / 1000, 0.001, 0.05); last = now;
    if (!ok || G.paused || G.mode === 'boot' || G.manual) return;
    tick(rdt);
  }
  function tick(rdt) {
    G.rt += rdt;
    if (G.slowT > 0) { G.slowT -= rdt; G.timeScale = G.slowTo; } else G.timeScale = damp(G.timeScale, 1, 7, rdt);
    let dt = rdt * G.timeScale * G.focus;
    if (G.hitStop > 0) { G.hitStop -= rdt; dt = 0; }
    if (G.freeze) dt = 0;
    G.t += dt;
    Game.update(dt, rdt);
    Cam.update(dt, rdt, G.t);
    hooves(dt);
    const title = G.mode === 'title';
    const speedK = G.mode === 'charge' ? sat(G.cV / 21) * G.pGait : 0;
    tossT -= dt; if (tossT <= 0) { tossT = rnd(2.5, 6); if (G.mode === 'melee') G.eToss = Math.max(G.eToss, 0.8); }
    rigS.toss = G.eToss;
    rigS.yaw = title ? 0.5 : G.theta; rigS.psi = title ? 0 : G.psi * 1.45; rigS.low = title ? 0 : sat(G.psi / PSI) * (1 - G.eRear); rigS.phase = G.ePhase; rigS.gait = G.eGait; rigS.rear = G.eRear;
    rigS.wind = title ? 0.22 : clamp(speedK * 0.9 + Math.abs(G.lunge.v) * 0.12 + 0.06, 0, 1);
    Rig.update(dt, rdt, G.t, rigS);
    Cam.fwd(_f);
    if (G.needMotes) { G.needMotes = false; World.seedMotes(Cam.cam.position); }
    World.update(dt, G.t, Cam.cam.position, _f);
    FX.update(dt);
    uPScale.value = (renderer.domElement.height) / (2 * Math.tan(rad(Cam.cam.fov) / 2));
    const draw3d = !G.noRender;
    if (draw3d) { renderer.clear(); renderer.render(World.scene, Cam.cam); }
    if (!title) {
      vmS.aspect = Cam.aspect; vmS.pitch = Cam.cam.rotation.x; vmS.roll = Cam.cam.rotation.z; vmS.psi = G.psi * clamp(Cam.aspect * 0.8, 0.36, 1);
      vmS.phase = G.pPhase; vmS.gait = G.pGait; vmS.rear = G.pRear; vmS.headBob = Cam.headBob * 0.35;
      VM.update(dt, G.t, vmS);
      if (draw3d) { renderer.clearDepth(); renderer.render(VM.scene, VM.cam); }
    }
    // 2D layer
    let ind = null; const e = G.e;
    if (e && e.atk && !e.atk.resolved && !e.atk.parry && e.state === 'windup' && (G.mode === 'melee' || G.mode === 'charge')) {
      const a = e.atk, real = !a.feint || a.feinted;
      ind = { dir: a.dir, remain: Math.max(0, (real ? a.tHit : a.fakeHit) - G.t), wind: real && a.feint ? a.wind2 : a.wind, heavy: a.heavy, pw: (a.charge ? 0.19 : 0.14) * G.hero.parry, tut: G.freeze };
    }
    F2.setSpeed(speedK);
    F2.draw(rdt, ind);
    UI.frame(rdt);
    const wv = Math.round(speedK * 12);
    if (wv !== windV) { windV = wv; Snd.setWind(wv / 12); }
    Snd.update(e ? (e.enraged ? 1 : (1 - e.hp / e.hpMax) * 0.7) : 0);
    // adaptive resolution
    fAcc += rdt; fN++;
    if (fN >= 100) { const avg = fAcc / fN; fAcc = 0; fN = 0; if (avg > 0.027 && PR > 1) { PR = Math.max(1, PR - 0.25); resize(); } }
  }
  function fatal(msg) { const f = $('fatal'); f.textContent = msg; f.classList.remove('hidden'); }
  function boot(data) {
    try {
      renderer = new T.WebGLRenderer({ canvas: $('gl'), antialias: true, powerPreference: 'high-performance' });
    } catch (err) { return fatal('이 기기에서는 3D 화면(WebGL)을 열 수 없습니다. 다른 브라우저로 다시 열어 주세요.'); }
    renderer.autoClear = false;
    PR = Math.min(window.devicePixelRatio || 1, 2);
    Save.load();
    G.hero = HEROES.find((h) => h.id === Save.d.hero) || HEROES[0];
    Snd.setOn(Save.d.snd !== false);
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', () => setTimeout(resize, 120));
    document.addEventListener('visibilitychange', () => { if (document.hidden && (G.mode === 'melee' || G.mode === 'charge' || G.mode === 'super' || G.mode === 'transition' || G.mode === 'intro')) Game.pause(true); });
    window.addEventListener('pointerdown', () => { if (!G.paused) { Snd.init(); Snd.resume(); } }, { passive: true });
    Input.bind({ swipe: Game.swipe, guard: Game.guard, tap: Game.tap, special: Game.special, pause: () => Game.pause() });
    VM.setHero(G.hero);
    Game.toTitle();
    if (data && data.inRun && typeof data.stage === 'number') {
      const h = HEROES.find((x) => x.id === data.hero); if (h) G.hero = h;
      G.startIdx = clamp(data.stage | 0, 0, STAGES.length - 1); Game.startRun();
    }
    ok = true; last = performance.now();
    requestAnimationFrame(frame);
    if (document.fonts && document.fonts.load) {
      Promise.all([document.fonts.load('400 40px "Yuji Boku"', '一騎討合斬破崩危討彈裂怒第落馬董袁曹呂劉'), document.fonts.load('400 30px "East Sea Dokdo"', '완벽한 쳐내기')])
        .then(() => { World.setArmy('foe', ARMY[G.stage.army]); World.setArmy('ally', ARMY.ally); }).catch(() => {});
    }
  }
  function info() {
    renderer.info.autoReset = false; renderer.info.reset(); tick(0.016);
    const r = { calls: renderer.info.render.calls, tris: renderer.info.render.triangles, points: renderer.info.render.points, geo: renderer.info.memory.geometries, tex: renderer.info.memory.textures, pr: PR };
    renderer.info.autoReset = true; return r;
  }
  return { boot, resize, tick, info };
})();
window.__ilgito = { G, Game, Rig, Cam, VM, Snd, Save, F2, UI, World, EP, VP, STAGES, PALS, ARMY, HEROES, makeAudio, step(dt, n) { for (let i = 0; i < (n || 1); i++) Main.tick(dt); }, info: () => Main.info() };
try { if (window.claude && window.claude.hot && window.claude.hot.snapshot) window.claude.hot.snapshot(() => ({ hero: G.hero.id, stage: G.stageIdx, inRun: G.mode !== 'title' && G.mode !== 'boot' })); } catch (e) {}
if (window.claude && window.claude.hot && window.claude.hot.ready) window.claude.hot.ready(Main.boot);
else Main.boot((window.claude && window.claude.hot && window.claude.hot.data) || {});
