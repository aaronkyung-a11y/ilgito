// ───────────────────────── enemy rig (horse + rider + weapon in the world) ─────────────────────────
const Rig = (() => {
  let E = null;
  const starTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.18, 'rgba(255,240,210,0.55)'); gr.addColorStop(1, 'rgba(255,220,160,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#fff';
    [[64, 3], [3, 64]].forEach(([w, hh], i) => {
      g.beginPath();
      if (i === 0) { g.moveTo(64, 0); g.lineTo(68, 64); g.lineTo(64, 128); g.lineTo(60, 64); } else { g.moveTo(0, 64); g.lineTo(64, 60); g.lineTo(128, 64); g.lineTo(64, 68); }
      g.closePath(); g.fill();
    });
    return new T.CanvasTexture(c);
  })();
  const _p = V3(), _q2 = V3(), tmpPose = {};
  function dispose() {
    if (!E) return;
    [E.root, E.trail.mesh, E.rider.seat, E.fallSh].forEach((o) => {
      if (o.parent) o.parent.remove(o);
      o.traverse((n) => { if (n.geometry && n.geometry !== FIST_R && n.geometry !== FIST_L && n.geometry !== REIN_G) n.geometry.dispose(); if (n.material && n.material.dispose && !n.material.userData.keep) n.material.dispose(); });
    });
    E = null;
  }
  function build(stage) {
    dispose();
    const horse = makeHorse(stage.horse, { shadow: true, reins: true }), rider = makeRider(stage.look), weapon = makeWeapon(stage.weapon, stage.weaponOpt);
    rider.waist.add(weapon.g);
    rider.seat.position.set(0, horse.saddleY, -0.04); rider.seat.scale.setScalar(1.12); horse.body.add(rider.seat);
    const root = new T.Group(); root.add(horse.root); root.scale.setScalar(stage.scale || 1);
    addInk(root, INK_W);
    World.scene.add(root);
    const trail = new Trail(16, 0xff6a3a, 0.14); World.scene.add(trail.mesh);
    const fallSh = mesh(new T.PlaneGeometry(2.0, 2.0), new T.MeshBasicMaterial({ map: TEX.shadow, transparent: true, depthWrite: false, color: 0x000000 }), 0, 0.03, 0, World.scene);
    fallSh.rotation.x = -PI / 2; fallSh.visible = false; fallSh.renderOrder = -1;
    const glint = new T.Sprite(new T.SpriteMaterial({ map: starTex, blending: T.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true, opacity: 0, fog: false }));
    glint.position.set(0, weapon.tipY - 0.22, 0); glint.scale.setScalar(0.01); weapon.g.add(glint);
    E = {
      root, horse, rider, weapon, trail, glint, fallSh, anim: new PoseAnim(EP.ready), scale: stage.scale || 1,
      mats: horse.mats.concat(rider.mats), flP: new Spring(150, 13), flY: new Spring(150, 13), flR: new Spring(150, 13),
      flash: 0, aura: 0, heavy: 0, glintT: 0, glintBig: 1, trailT: 0, fall: null, bolt: -1, wasLit: true,
    };
    return E;
  }
  function update(dt, rdt, t, s) {
    if (!E) return;
    E.anim.update(dt);
    const flP = E.flP.update(dt), flY = E.flY.update(dt), flR = E.flR.update(dt);
    if (E.bolt < 0) {
      E.root.position.copy(s.pos); E.root.rotation.y = s.yaw + s.psi;
      animHorse(E.horse, t, s);
    } else {
      E.bolt += dt;
      const sp = Math.min(13, Math.max(0, E.bolt - 0.25) * 10);
      let dy = E.boltYaw - E.yaw0; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      const ry = (E.root.rotation.y = E.yaw0 + dy * smooth(E.bolt / 0.8));
      E.root.position.x += Math.sin(ry) * sp * dt; E.root.position.z += Math.cos(ry) * sp * dt;
      E.boltPhase = (E.boltPhase || 0) + (sp / 5.2) * dt;
      animHorse(E.horse, t, { phase: E.boltPhase, gait: sat((E.bolt - 0.3) * 2), rear: sat(1 - Math.abs(E.bolt - 0.18) * 5), idle: 1 });
    }
    if (!E.fall) {
      // a little life on top of the keyed pose: breathing, weapon sway, weight shifts
      const c = E.anim.cur, live = E.anim.busy ? 0.35 : 1;
      Object.assign(tmpPose, c);
      tmpPose.az += Math.sin(t * 1.3 + 0.4) * 3.2 * live; tmpPose.el += Math.sin(t * 1.7 + 1.1) * 2.6 * live;
      tmpPose.ty += Math.sin(t * 0.9) * 2.4 * live; tmpPose.tr += Math.sin(t * 0.63 + 2) * 1.6 * live; tmpPose.wy += Math.sin(t * 1.9 + 1) * 0.012;
      poseRider(E.rider, E.weapon, tmpPose, { baseYaw: -s.psi, flP: flP + Math.sin(t * 1.9 + 1) * 0.014, flY, flR, t, wind: s.wind });
    } else {
      const f = E.fall, seat = E.rider.seat;
      if (!f.landed) {
        f.vel.y -= 9.8 * dt;
        seat.position.addScaledVector(f.vel, dt);
        seat.rotateX(f.spin.x * dt); seat.rotateZ(f.spin.z * dt);
        if (seat.position.y <= 0.42 * E.scale) {
          f.landed = true; seat.position.y = 0.42 * E.scale;
          seat.rotation.set(-PI / 2 + 0.12, seat.rotation.y, 0.3);
          FX.dustBurst(seat.position, 16, 0.5, 1.2, 1.1); Snd.hit(0.9);
          E.fallSh.position.set(seat.position.x, 0.03, seat.position.z); E.fallSh.visible = true;
          if (s.onLand) s.onLand();
        }
      }
      updateCape(E.rider, t, 0.05);
    }
    const lit = E.flash > 0.002 || E.aura > 0.002;
    if (lit || E.wasLit) {
      const f = E.flash, a = E.aura * (0.11 + 0.07 * Math.sin(t * 9));
      for (let i = 0; i < E.mats.length; i++) E.mats[i].emissive.setRGB(f + a, f * 0.92, f * 0.82);
      E.flash = Math.max(0, E.flash - rdt * 8);
    }
    E.wasLit = lit;
    const hv = E.heavy * (0.75 + 0.25 * Math.sin(t * 30));
    E.weapon.steelM.emissive.setRGB(E.flash + hv, E.flash * 0.9 + hv * 0.12, E.flash * 0.8 + hv * 0.05);
    if (E.glintT > 0) {
      E.glintT -= rdt; const k = sat(E.glintT / 0.34), sc = (0.25 + (1 - k) * 1.5) * E.glintBig;
      E.glint.scale.setScalar(sc); E.glint.material.opacity = Math.sin(PI * k); E.glint.material.rotation = t * 3;
      E.glint.material.color.setRGB(1, E.heavy > 0.1 ? 0.35 : 0.95, E.heavy > 0.1 ? 0.2 : 0.8);
    } else if (E.glint.material.opacity !== 0) E.glint.material.opacity = 0;
    E.root.updateMatrixWorld(true);
    if (E.trailT > 0 && !E.fall) {
      E.trailT -= dt;
      _p.set(0, E.weapon.baseY + 0.12, 0); E.weapon.g.localToWorld(_p);
      _q2.set(0, E.weapon.tipY, 0); E.weapon.g.localToWorld(_q2);
      E.trail.push(_p, _q2);
    }
    E.trail.update(dt);
  }
  function fallen(out) { return E && E.fall ? out.copy(E.rider.seat.position) : null; }
  function blade(out, k) { out.set(0, lerp(E.weapon.baseY, E.weapon.tipY, k), 0); return E.weapon.g.localToWorld(out); }
  function chest(out) { out.set(0, 0.36, 0.16); return E.rider.waist.localToWorld(out); }
  function headPos(out) { out.set(0, 0.05, 0); return E.rider.head.localToWorld(out); }
  function hitFlash(v) { E.flash = Math.max(E.flash, v); }
  function flinch(dir, power) {
    const k = power || 1;
    E.flP.kick(-2.6 * k);
    if (dir === 'L') { E.flY.kick(3.2 * k); E.flR.kick(-1.6 * k); }
    else if (dir === 'R') { E.flY.kick(-3.2 * k); E.flR.kick(1.6 * k); }
    else if (dir === 'U') E.flP.kick(-2.4 * k);
    else E.flP.kick(4.6 * k);
  }
  // fwd: the player's horizontal view direction. the rider is thrown to the player's left, the horse wheels away to the right
  function kill(fwd) {
    E.root.updateMatrixWorld(true);
    const seat = E.rider.seat; World.scene.attach(seat);
    const lx = fwd.z, lz = -fwd.x;
    E.fall = { vel: V3(lx * 1.1 + fwd.x * 0.5, 3.3, lz * 1.1 + fwd.z * 0.5), spin: V3(-1.2, 0, 3.6), landed: false };
    E.bolt = 0; E.aura = 0; E.heavy = 0; E.yaw0 = E.root.rotation.y;
    E.boltYaw = Math.atan2(fwd.x * 0.75 - lx * 0.65, fwd.z * 0.75 - lz * 0.65);
    E.anim.play([{ p: EP.stag, d: 0.2, e: 'out' }]);
  }
  return { build, update, dispose, blade, chest, headPos, flinch, hitFlash, kill, fallen, get E() { return E; } };
})();
