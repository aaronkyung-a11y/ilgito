// ───────────────────────── game: duel state machine, enemy AI, judgement ─────────────────────────
const D_MELEE = 2.45, D_CLASH = 2.7, D_START = 48, STRIKE_D = 0.11, LATE_GRACE = 0.045, SWING_CD = 0.22, PSI = rad(36);
const BASE_DMG = 8;
const Save = {
  d: { tut: false, cleared: 0, hero: 'guanyu', snd: true },
  load() { try { const s = localStorage.getItem('ilgito.v1'); if (s) Object.assign(this.d, JSON.parse(s)); } catch (e) {} },
  save() { try { localStorage.setItem('ilgito.v1', JSON.stringify(this.d)); } catch (e) {} },
};
const G = {
  mode: 'boot', paused: false, t: 0, rt: 0, timeScale: 1, slowT: 0, slowTo: 1, hitStop: 0, freeze: false, focus: 1,
  theta: 0, d: 7, omega: 0, psi: 0, psiT: 0, cV: 0, cT: 0,
  lunge: new Spring(90, 14), push: new Spring(70, 13),
  pPhase: 0, ePhase: 0, pGait: 0, eGait: 0, pGaitT: 0, eGaitT: 0, pRear: 0, eRear: 0, pRearT: 0, eRearT: 0, eToss: 0,
  round: 1, roundStrings: 3, stageIdx: 0, startIdx: 0, hero: HEROES[0], stage: STAGES[0],
  p: null, e: null, stats: null, q: [], su: null, tut: { on: false, froze: 0, seen: {} },
  cut: null, retries: 0, auto: false, autoSkill: { mu: 0.42, sd: 0.08, miss: 0.08, aim: 0.13, jit: 0.08, rate: 0.3, greed: 2 }, introT: 0, endT: 0, camFall: 0, needMotes: true, hbT: 0,
};
function josa(w, a, b) { const c = w.charCodeAt(w.length - 1); if (c < 0xac00 || c > 0xd7a3) return a; return (c - 0xac00) % 28 ? a : b; }
function buzz(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} }

const Game = (() => {
  const _cp = V3(), _v = V3();
  const after = (d, fn) => G.q.push({ t: G.t + d, fn });
  const slow = (to, dur) => { G.slowTo = to; G.slowT = dur; };
  const stop = (d) => { G.hitStop = Math.max(G.hitStop, d); };
  const rndInt = (r) => r[0] + ((Math.random() * (r[1] - r[0] + 1)) | 0);
  const DIRS = ['L', 'R', 'U', 'D'];
  const DIRV = { L: [-1, 0], R: [1, 0], U: [0, 1], D: [0, -1] };

  // ── anime direction: shouts, focus lines, cut-ins
  function eShout(big, dir) {      // dir: where the parry marker is drawn, so the balloon keeps clear of it
    const d = G.e.def, sc = Cam.project(Rig.headPos(_v)), W = F2.W, H = F2.H, side = dir === 'L' ? 1 : dir === 'R' ? -1 : sc.x < W / 2 ? 1 : -1;
    F2.kiai(big ? d.roar : pick(d.kiai), { px: true, x: clamp(sc.x + side * W * (dir === 'U' ? 0.3 : 0.17), W * 0.25, W * 0.75), y: clamp(sc.y - H * (G.cut ? 0.25 : dir === 'U' ? -0.04 : 0.12), H * 0.12, H * 0.5), size: big ? 13 : 9.5, dur: big ? 1.1 : 0.6 });
    Snd.voice('e', big);
  }
  function pShout(big) {
    const h = G.hero;
    F2.kiai(big ? h.shout : pick(h.kiai), { x: rnd(0.32, 0.68), y: rnd(0.66, 0.73), size: big ? 13 : 9, dur: big ? 1 : 0.5 });
    Snd.voice('p', big);
  }
  function eFocus(v, hold) { const sc = Cam.project(Rig.headPos(_v)); F2.focus(v, sc.x / F2.W, sc.y / F2.H, hold); }
  function heroCut(ex, text, sub, o) { F2.cutin(Object.assign({ art: FACE.cutin(G.hero.look, ex), rgb: G.hero.rgb, text, sub, side: 1 }, o)); }
  function newPlayer(h) { return { hp: h.hp, hpMax: h.hp, st: 100, ki: 0, guard: false, guardLock: 0, lock: 0, buf: null, combo: 0, comboT: 0, dirs: [], lastBlockDir: '', dead: false, stWait: 0 }; }
  function newEnemy(stage) {
    const ai = stage.ai;
    return { def: stage, ai, hp: ai.hp, hpMax: ai.hp, post: 0, postT: 0, state: 'idle', stT: 0, stDur: 0, atk: null, string: null, si: 0, nextAct: 1.2, pressure: 0, pressMax: 3,
      enraged: false, rageDue: false, vuln: 1, dead: false, stringsDone: 0, strings: ai.strings, windMul: 1 };
  }

  // ── stage flow
  function toTitle() {
    G.mode = 'title'; G.paused = false; G.q.length = 0; F2.clear(); FX.clear(); Input.cancel(); G.cut = null;
    G.timeScale = 1; G.slowT = 0; G.hitStop = 0; G.freeze = false; G.camFall = 0;
    const idx = Math.min(Save.d.cleared, STAGES.length - 1), stage = STAGES[idx];
    G.stage = stage;
    World.applyPalette(PALS[stage.pal]); World.setArmy('foe', ARMY[stage.army]); World.setArmy('ally', ARMY.ally); VM.syncLights();
    const E = Rig.build(stage); E.anim.snap(EP.guard);
    G.e = null; G.p = null; G.needMotes = true;
    G.theta = 0; G.d = 0; G.psi = 0; G.eGait = G.pGait = 0; G.eGaitT = G.pGaitT = 0; G.eRear = G.pRear = 0; G.eRearT = G.pRearT = 0;
    UI.hud(false); UI.show('title'); UI.buildTitle();
    Snd.setMode('title'); Snd.setWind(0); F2.setSpeed(0);
  }
  function startRun() {
    Snd.init(); Snd.resume(); Snd.ui();
    VM.setHero(G.hero);
    Save.d.hero = G.hero.id; Save.save();
    G.retries = 0;
    startStage(G.startIdx);
  }
  function startStage(idx) {
    G.stageIdx = idx; const stage = (G.stage = STAGES[idx]);
    G.q.length = 0; F2.clear(); FX.clear(); Input.cancel(); G.cut = null;
    World.applyPalette(PALS[stage.pal]); World.setArmy('foe', ARMY[stage.army]); World.setArmy('ally', ARMY.ally); VM.syncLights();
    Rig.build(stage);
    G.p = newPlayer(G.hero); G.e = newEnemy(stage);
    // each lost attempt at the same foe steadies the hand a little (up to three times)
    const boost = Math.min(3, G.retries);
    G.p.hpMax = G.p.hp = Math.round(G.hero.hp * (1 + 0.15 * boost)); G.e.windMul = 1 + 0.06 * boost; G.e.baseWind = G.e.windMul;
    G.stats = { perfect: 0, parry: 0, taken: 0, maxCombo: 0, time: 0 };
    G.round = 1; G.theta = rnd(-0.3, 0.3); G.d = 30; G.omega = 0; G.psi = 0; G.psiT = 0; G.cV = 0;
    G.pGait = G.eGait = 0; G.pGaitT = G.eGaitT = 0; G.pRear = G.eRear = 0; G.pRearT = G.eRearT = 0;
    G.timeScale = 1; G.slowT = 0; G.hitStop = 0; G.freeze = false; G.paused = false; G.camFall = 0;
    G.lunge.reset(); G.push.reset(); G.su = null; G.needMotes = true;
    G.tut.on = idx === 0 && !Save.d.tut; G.tut.froze = 0; G.tut.seen = {};
    UI.setFoe(stage); UI.setHero(G.hero); UI.setRound(1); UI.hud(false);
    enterIntro();
  }
  function enterIntro() {
    G.mode = 'intro'; G.introT = 0;
    const E = Rig.E; E.anim.snap(EP.ready);
    E.anim.play([{ p: EP.ready, d: 0.7, e: 'lin' }, { p: EP.taunt, d: 0.45, e: 'out' }, { p: EP.taunt, d: 1.2, e: 'lin' }, { p: EP.ready, d: 0.5, e: 'io' }]);
    Snd.setMode('intro'); Snd.gong();
    UI.showVs(G.stage, G.stageIdx);
    VM.rest(); VM.setBase('idle');
    G.cut = { kind: 'low', t: 0, dur: 1.15, side: -1, next: { kind: 'face', t: 0, dur: 1.25, side: 1, expr: 'kiai' } };
    after(1.3, () => { if (G.mode === 'intro') { eShout(true); F2.focus(0.9, 0.5, 0.36, 0.7); Snd.hitDrum(0.8); Cam.shake(0.35); } });
  }
  function beginDuel() {
    G.cut = null;
    UI.show(null); UI.hud(true); Snd.cheer(1.6, 0.14);
    startCharge(true);
  }
  function startCharge(first) {
    G.mode = 'charge'; G.cT = 0; G.cV = first ? 3 : 13;
    if (!first) G.d = D_START;
    const e = G.e; e.state = 'charge'; e.atk = null; e.stringsDone = 0;
    after(0.45, () => { if (G.mode !== 'charge') return; if (first) { heroCut('kiai', G.hero.shout, '', { mode: 'eyes', dur: 0.8, y: 0.64 }); Snd.voice('p', true); } else pShout(true); });
    G.roundStrings = 3 + (Math.random() < 0.4 ? 1 : 0);
    G.pGaitT = G.eGaitT = 1; G.psiT = 0; G.omega = 0;
    Rig.E.anim.play([{ p: EP.ready, d: 0.3, e: 'io' }]); Rig.E.heavy = 0;
    VM.rest(); VM.setBase('gallop');
    Snd.setMode('charge'); Snd.snort(0.8);
    UI.setRound(G.round);
    if (G.tut.on && !G.tut.seen.charge) { G.tut.seen.charge = 1; UI.hint('적장이 달려온다! 빛나는 쪽으로 스와이프해 쳐내라', 5); }
  }
  function nextRound() {
    if (G.mode !== 'melee' || G.e.dead || G.p.dead) return;
    G.mode = 'transition'; G.round++;
    const e = G.e; e.state = 'charge'; e.atk = null;
    guard(false);
    G.push.kick(5); G.eRearT = 0.6; Snd.wipe(); Cam.shake(0.3);
    Rig.E.anim.play([{ p: EP.blkU, d: 0.12, e: 'out' }, { p: EP.ready, d: 0.4, e: 'io' }]);
    F2.startWipe('第' + hjNum(G.round) + '合', '말머리를 돌려 다시 맞선다', () => {
      G.theta += rnd(1.2, 2.6) * (Math.random() < 0.5 ? -1 : 1);
      G.psi = 0; G.lunge.reset(); G.push.reset(); G.eRearT = 0; G.eRear = 0;
      e.post *= 0.7; G.p.st = 100; G.p.guardLock = 0;
      FX.clear();
      startCharge(false);
    }, null);
  }

  // ── enemy
  function enterIdle() {
    const e = G.e; e.state = 'idle'; e.stT = 0; e.atk = null; e.pressure = 0; e.pressMax = rndInt(e.ai.counterAfter);
    e.nextAct = rnd(e.ai.idle[0], e.ai.idle[1]) * (e.enraged ? 0.7 : 1);
    Rig.E.anim.play([{ p: EP.guard, d: 0.26, e: 'io' }]); Rig.E.heavy = 0;
    if (e.rageDue) { e.rageDue = false; return rage(); }
    if (e.stringsDone >= G.roundStrings) return nextRound();
    if (e.nextAct > 1.25 && Math.random() < 0.4) { // a taunt while he sizes you up
      Rig.E.anim.add([{ p: EP.guard, d: 0.25, e: 'lin' }, { p: EP.taunt, d: 0.28, e: 'out' }, { p: EP.taunt, d: 0.35, e: 'lin' }, { p: EP.guard, d: 0.3, e: 'io' }]);
      G.eToss = 1;
    }
  }
  function enterRecover() {
    const e = G.e; e.state = 'recover'; e.stT = 0; e.stDur = e.ai.recover; e.vuln = 1; e.atk = null; e.stringsDone++;
    Rig.E.anim.play([{ p: EP.open, d: 0.22, e: 'out' }]); Rig.E.heavy = 0;
    F2.pop('', '틈!', { size: 22, color: '#d2a850', y: 0.26, dur: 0.7 });
    if (G.tut.on && !G.tut.seen.gap) { G.tut.seen.gap = 1; UI.hint('틈이다! 아무 쪽으로나 마구 베어라', 2.6); }
  }
  function startString(str, counter) {
    const e = G.e; e.string = str; e.si = 0;
    attackFromToken(str[0], counter ? e.ai.windNext * 1.1 : e.ai.wind);
  }
  function attackFromToken(tok, baseWind) {
    const a = parseAtk(tok);
    beginAttack(a, Math.max(0.4, baseWind * a.mul * G.e.windMul * (a.heavy ? 1.35 : 1)), false); // never faster than a person can react
  }
  function nextInString() {
    const e = G.e; e.si++;
    if (e.si < e.string.length) attackFromToken(e.string[e.si], e.ai.windNext); else enterRecover();
  }
  function beginAttack(a, wind, charge) {
    const e = G.e, E = Rig.E;
    const atk = (e.atk = { dir: a.dir, real: a.feint || a.dir, feint: !!a.feint, feinted: false, heavy: !!a.heavy, charge, t0: G.t, tHit: G.t + wind, fakeHit: G.t + wind, wind, wind2: wind, parry: null, striking: false, resolved: false, d0: G.d });
    let showT = wind;
    if (atk.feint) { atk.feintAt = G.t + wind * 0.5; atk.wind2 = Math.max(0.52, wind * 0.8); atk.tHit = atk.feintAt + atk.wind2; showT = wind * 0.5; }
    e.state = 'windup'; e.stT = 0;
    if (G.tut.on && G.tut.froze >= 2 && !G.tut.seen.guard && !charge) { G.tut.seen.guard = 1; UI.hint('급하면 화면을 길게 눌러 막아라 (기력이 닳는다)', 3.2); }
    E.anim.play([{ p: EP[atk.dir].w, d: Math.min(0.3, showT * 0.6), e: 'out' }]);
    E.glintT = 0.34; E.glintBig = atk.heavy ? 1.9 : 1; E.heavy = atk.heavy ? 1 : 0;
    Snd.glint(atk.heavy, atk.tHit - G.t);
    if (atk.heavy) { eShout(true, atk.dir); eFocus(0.9, Math.max(0.2, atk.tHit - G.t - 0.15)); Cam.tilt(atk.dir === 'L' ? 0.15 : -0.15, atk.tHit - G.t); }
    else if (charge || Math.random() < 0.3) eShout(!!charge, atk.dir);
    if (atk.heavy) {
      if (!Save.d.hv) { Save.d.hv = 1; Save.save(); UI.hint('危 — 막을 수 없다. 쳐내야만 한다!', 2.8); }
    }
  }
  function updateWindup() {
    const e = G.e, atk = e.atk, E = Rig.E;
    if (!atk || atk.resolved) return;
    if (atk.feint && !atk.feinted && G.t >= atk.feintAt) {
      atk.feinted = true; atk.dir = atk.real;
      E.anim.play([{ p: EP[atk.dir].w, d: 0.15, e: 'out' }]); E.glintT = 0.3; Snd.glint(false, atk.wind2);
    }
    const rem = atk.tHit - G.t, live = !atk.feint || atk.feinted;
    if (!atk.striking && live && rem <= STRIKE_D) {
      atk.striking = true;
      E.anim.play([{ p: EP[atk.dir].h, d: Math.max(0.03, rem), e: 'in2' }]);
      E.trailT = 0.3; Snd.swing(1.3, DIRV[atk.dir][0] * 0.6); Cam.punch(2.2);
      if (!atk.charge) G.lunge.kick(-3.4);
    }
    if (G.tut.on && G.tut.froze < 2 && live && !atk.parry && rem <= 0.07) {
      if (!G.freeze) { G.freeze = true; UI.hint(G.tut.froze === 0 ? '지금이다! 빛나는 쪽으로 스와이프' : '닿는 순간에 맞추면 완벽한 쳐내기', 99); }
      return;
    }
    if (G.t >= atk.tHit + (atk.parry ? 0 : LATE_GRACE)) resolveAttack();
  }
  function resolveAttack() {
    const e = G.e, atk = e.atk, p = G.p, E = Rig.E, h = G.hero;
    atk.resolved = true; E.heavy = 0;
    let out = atk.parry ? atk.parry : (p.guard && !atk.heavy && G.t >= p.guardLock) ? 'guard' : 'hit';
    const dmg = e.ai.dmg * (atk.heavy ? 1.6 : 1) * (atk.charge ? 1.45 : 1) * (e.enraged ? 1.12 : 1);
    const dv = DIRV[atk.dir];
    Cam.front(_cp, 0.95, dv[0] * 0.22, dv[1] * 0.16 - 0.05);
    const sc = Cam.project(_cp);
    if (out === 'perfect') {
      Snd.perfect(dv[0] * 0.5); FX.sparkBurst(_cp, atk.charge ? 70 : 46, 1.3); F2.flash(atk.charge ? 0.5 : 0.3); F2.burst(sc.x, sc.y, '255,244,214', atk.charge ? 2 : 1.4);
      World.skyFlash(0.5);
      stop(atk.charge ? 0.14 : 0.1); slow(0.2, atk.charge ? 0.6 : 0.36); Cam.shake(atk.charge ? 0.85 : 0.55); Cam.punch(-7); buzz(35);
      VM.kick(1.4, 0.3);
      F2.impact(atk.charge ? 0.13 : 0.085, sc.x / F2.W, sc.y / F2.H); Cam.tilt(dv[0] ? dv[0] * -0.13 : 0.09, 0.25);
      if (atk.charge || atk.heavy) pShout(true); else if (Math.random() < 0.5) pShout(false);
      G.stats.perfect++; addKi(14); p.combo++; p.comboT = 2.4;
      addPosture(atk.charge ? 40 : atk.heavy ? 50 : 34);
      if (atk.charge) { F2.pop('破', '선제 일격!', { size: 34, color: '#fff3d6', dur: 1.1 }); damageEnemy(16 * h.atk, atk.dir, true); Snd.cheer(2, 0.22); }
      else F2.pop('彈', '완벽한 쳐내기', { size: 26, color: '#fff3d6', dur: 0.8 });
      if (!e.dead && e.state !== 'broken') {
        e.state = 'parried'; e.stT = 0; e.stDur = atk.charge ? 1.1 : 0.6; e.vuln = 1.15; e.stringsDone++;
        E.anim.play([{ p: EP['def' + atk.dir], d: 0.1, e: 'out' }, { p: EP['def' + atk.dir], d: 0.3, e: 'lin' }, { p: EP.open, d: 0.25, e: 'io' }]);
        G.eRearT = atk.charge ? 0.4 : 0; G.push.kick(2.2);
      }
      if (G.tut.on && !G.tut.seen.gap) { G.tut.seen.gap = 1; UI.hint('틈이다! 아무 쪽으로나 마구 베어라', 2.6); }
    } else if (out === 'good') {
      Snd.clang(1, 1, dv[0] * 0.5); FX.sparkBurst(_cp, atk.charge ? 40 : 20, 0.95); F2.burst(sc.x, sc.y, '255,226,170', atk.charge ? 1.5 : 0.9);
      stop(atk.charge ? 0.09 : 0.05); Cam.shake(atk.charge ? 0.6 : 0.32); buzz(18); VM.kick(1.0, 0.2);
      G.stats.parry++; addKi(6); addPosture(atk.charge ? 15 : 13);
      if (atk.charge) { F2.pop('合', '격돌!', { size: 34, dur: 1.0 }); slow(0.3, 0.35); Snd.cheer(1.4, 0.15); }
      else F2.pop('', '쳐냈다', { size: 18, y: 0.3, dur: 0.5 });
      if (!e.dead && e.state !== 'broken') {
        E.anim.play([{ p: EP['def' + atk.dir], d: 0.09, e: 'out' }, { p: EP.guard, d: 0.2, e: 'io' }]);
        e.state = 'follow'; e.stT = 0; e.stDur = 0.24;
      }
    } else if (out === 'guard') {
      Snd.block(1.2, dv[0] * 0.5); FX.sparkBurst(_cp, 9, 0.6); Cam.shake(0.42); VM.kick(2.2, -0.4); buzz(25);
      Cam.hitKick(atk.dir, 0.35);
      p.st -= 24 + dmg * 0.9; const chip = dmg * 0.12; hurtPlayer(chip, true);
      if (p.st <= 0) {
        p.st = 0; p.guardLock = G.t + 1.6; guard(false);
        F2.pop('裂', '방어가 깨졌다!', { size: 24, color: '#ff6a4a', dur: 0.9 }); Snd.breakSfx(); Cam.shake(0.8);
        hurtPlayer(dmg * 0.35, false);
      }
      followThrough(atk);
    } else {
      if (p.guard && atk.heavy) F2.pop('', '막을 수 없다!', { size: 22, color: '#ff6a4a', y: 0.3, dur: 0.8 });
      Snd.hurt(); Cam.shake(0.95); Cam.hitKick(atk.dir, 1); stop(0.07); VM.hurt(); buzz(90);
      UI.hurt(0.9); F2.flash(0.25, '200,40,24');
      p.combo = 0; addKi(6);
      hurtPlayer(dmg, false);
      followThrough(atk);
    }
    if (atk.charge) endCharge(out);
  }
  function followThrough(atk) {
    const e = G.e;
    if (e.dead) return;
    Rig.E.anim.play([{ p: EP[atk.dir].e, d: 0.12, e: 'out' }]);
    e.state = 'follow'; e.stT = 0; e.stDur = 0.24;
  }
  function endCharge(out) {
    const e = G.e;
    G.pGaitT = G.eGaitT = 0; G.psiT = PSI; G.omega = -1.5; G.cV = 0;
    VM.setBase('idle'); Snd.snort(0.7, 0.3);
    _v.set(0, 0, 0); FX.dustBurst(_v, 26, 1.6, 1.4, 1.3);
    if (G.p.dead || e.dead) return;
    G.mode = 'melee'; Snd.setMode('duel');
    G.pRearT = out === 'hit' ? 0.45 : 0;
    if (out === 'good') { e.state = 'idle'; e.stT = 0; e.atk = null; e.nextAct = 0.9; e.pressure = 0; e.pressMax = rndInt(e.ai.counterAfter); }
    else if (out === 'hit' || out === 'guard') { e.string = pick(e.strings); e.si = -1; e.state = 'follow'; e.stT = 0; e.stDur = 0.55; }
  }
  function rage() {
    const e = G.e, E = Rig.E, r = e.ai.rage;
    e.enraged = true; e.state = 'roar'; e.stT = 0; e.stDur = 1.3; e.atk = null; e.post = 0;
    e.strings = r.strings; e.windMul = r.windMul * (e.baseWind || 1);
    E.anim.play([{ p: EP.roar, d: 0.28, e: 'out' }, { p: EP.roar, d: 0.72, e: 'lin' }, { p: EP.guard, d: 0.3, e: 'io' }]);
    E.aura = 1; G.eRearT = 0.8; G.push.kick(3);
    Snd.horn(1, 0.7); Snd.snort(1, 0.2); Snd.hitDrum(1); Cam.shake(0.7);
    F2.pop('怒', e.def.kr + josa(e.def.kr, '이', '가') + ' 격노했다!', { size: 30, color: '#ff4a2a', dur: 1.3, y: 0.66 });
    F2.flash(0.3, '200,40,24');
    G.cut = { kind: 'low', t: 0, dur: 0.62, side: 1, expr: 'rage', next: { kind: 'face', t: 0, dur: 0.62, side: -1, expr: 'rage' } };
    F2.impact(0.1, 0.5, 0.4);
    after(0.1, () => { if (!e.dead) { eShout(true); F2.focus(1, 0.5, 0.38, 1); } });
  }
  function addPosture(v) {
    const e = G.e;
    if (e.dead || e.state === 'broken' || e.state === 'roar' || e.state === 'stun') return;
    e.post = Math.min(100, e.post + v); e.postT = 0;
    if (e.post >= 100) breakPosture();
  }
  function breakPosture() {
    const e = G.e, E = Rig.E;
    e.state = 'broken'; e.stT = 0; e.stDur = 2.0; e.vuln = 1.3; e.atk = null; E.heavy = 0;
    E.anim.play([{ p: EP.stag, d: 0.22, e: 'out' }]);
    Snd.breakSfx(); Snd.cheer(2.2, 0.24); slow(0.3, 0.45); Cam.shake(0.65); G.eRearT = 0.3; G.push.kick(2.5);
    eFocus(0.85, 0.35); F2.impact(0.1); Cam.tilt(0.17, 0.5);
    G.cut = { kind: 'face', t: 0, dur: 0.38, side: 1, expr: 'hurt' };       // a beat on his face as his guard gives way
    F2.pop('崩', '자세가 무너졌다! 몰아쳐라', { size: 32, color: '#ffd27a', dur: 1.2 });
    if (G.tut.on) UI.hint('지금이다! 마구 베어라', 2.2);
  }
  function damageEnemy(dmg, dir, quiet) {
    const e = G.e;
    if (e.dead) return;
    if (G.mode === 'super' && G.su && G.su.phase < 2) dmg = Math.min(dmg, e.hp - 1);
    if (dmg <= 0) return;
    e.hp -= dmg; Rig.hitFlash(0.75);
    Rig.chest(_v); const sc = Cam.project(_v);
    F2.num(sc.x + rnd(-24, 24), sc.y - 30, String(Math.round(dmg)), dmg >= 14 ? '#ffd27a' : '#eadfc8', dmg >= 14 ? 26 : 19);
    if (e.hp <= 0) { e.hp = 0; return killEnemy(dir); }
    if (!e.enraged && e.ai.rage && e.hp / e.hpMax <= e.ai.rage.at) e.rageDue = true;
  }
  function hitEnemy(dir, mul, label) {
    const e = G.e, p = G.p, h = G.hero;
    const dmg = BASE_DMG * h.atk * mul * (1 + Math.min(p.combo, 20) * 0.012);
    p.combo++; p.comboT = 2.4; if (p.combo > G.stats.maxCombo) G.stats.maxCombo = p.combo;
    addKi(2.2);
    Rig.chest(_cp); _cp.x += rnd(-0.12, 0.12); _cp.y += rnd(-0.15, 0.2);
    const dv = DIRV[dir];
    FX.sparkBurst(_cp, 10, 0.75); FX.shardBurst(_cp, 5, 0.85, 0.16, 0.1, Cam.right(_v).multiplyScalar(dv[0]));
    const sc = Cam.project(_cp); F2.burst(sc.x, sc.y, G.hero.rgb, 0.8);
    Snd.hit(1); stop(0.045); Cam.shake(0.26); Cam.punch(-2.5); buzz(12);
    if (p.combo % 4 === 1) pShout(false);
    Rig.flinch(dir, 1); G.push.kick(1.1);
    if (label) F2.pop('', label, { size: 18, y: 0.28, color: '#ffd27a', dur: 0.55 });
    damageEnemy(dmg, dir);
  }
  function enemyBlock(dir) {
    const e = G.e, p = G.p, E = Rig.E;
    E.anim.play([{ p: EP['blk' + dir], d: 0.055, e: 'out' }, { p: EP['blk' + dir], d: 0.1, e: 'lin' }, { p: EP.guard, d: 0.22, e: 'io' }]);
    Rig.blade(_cp, 0.3);
    FX.sparkBurst(_cp, 7, 0.6); Snd.block(0.9); stop(0.025); Cam.shake(0.13); VM.kick(0.9, 0.1);
    addKi(1.2);
    addPosture(dir !== p.lastBlockDir ? 3 : 1); p.lastBlockDir = dir;
    if (G.tut.on && !G.tut.seen.blk && G.tut.froze >= 2) { G.tut.seen.blk = 1; UI.hint('막혔다! 방향을 바꿔 가며 세 번 베면 뚫린다', 3.2); }
  }
  function slashContact(dir) {
    const e = G.e, p = G.p;
    if (G.mode !== 'melee' || e.dead || p.dead) return;
    const st = e.state;
    if (st === 'recover' || st === 'parried' || st === 'broken') return hitEnemy(dir, e.vuln);
    if (st === 'idle') {
      p.dirs.push({ dir, t: G.t });
      while (p.dirs.length > 3) p.dirs.shift();
      const d = p.dirs, pierce = d.length === 3 && G.t - d[0].t < 1.5 && d[0].dir !== d[1].dir && d[1].dir !== d[2].dir && d[0].dir !== d[2].dir;
      e.pressure++;
      if (pierce) { p.dirs.length = 0; hitEnemy(dir, 0.7, '연격 돌파!'); e.pressure = e.pressMax; }
      else enemyBlock(dir);
      if (!e.dead && e.state === 'idle' && e.pressure >= e.pressMax) {
        e.pressure = 0; e.pressMax = rndInt(e.ai.counterAfter);
        after(0.14, () => { if (G.mode === 'melee' && e.state === 'idle' && !e.dead) startString(pick(e.strings), true); });
      }
      return;
    }
    // armoured (mid-attack / roaring): glance off
    Rig.blade(_cp, 0.3); FX.sparkBurst(_cp, 4, 0.4); Snd.block(0.5);
  }
  function killEnemy(dir) {
    const e = G.e;
    e.dead = true; e.state = 'dead'; e.atk = null; G.mode = 'victory'; G.endT = 0; G.freeze = false;
    guard(false);
    stop(0.2); slow(0.12, 1.5); F2.flash(0.85); Cam.shake(1); Cam.punch(-10); buzz(140); World.skyFlash(0.9);
    F2.impact(0.15, 0.5, 0.42); Cam.tilt(dir === 'L' ? 0.2 : -0.2, 0.9); Snd.voice('e', 'die');
    after(0.05, () => heroCut('idle', '', '', { mode: 'eyes', dur: 1.0, y: 0.7 }));
    if (G.su && G.su.phase === 3) Snd.gong(); else Snd.finisher(true);
    Snd.cheer(4.5, 0.32); Snd.setMode('none');
    Cam.fwd(_v); _v.y = 0; _v.normalize();
    Rig.kill(_v);
    Rig.chest(_cp); FX.sparkBurst(_cp, 60, 1.4); FX.shardBurst(_cp, 16, 0.85, 0.16, 0.1);
    F2.pop('討', '적장 ' + e.def.kr + ', 쓰러뜨렸다!', { size: 44, color: '#fff3d6', dur: 2.6, y: 0.36, rot: -0.06 });
    after(0.25, () => Snd.fanfare(true));
    after(0.5, () => VM.cheer());
    if (G.stageIdx + 1 > Save.d.cleared) Save.d.cleared = G.stageIdx + 1;
    Save.d.tut = true; Save.save();
    UI.hint('', 0);
  }
  function hurtPlayer(dmg, quiet) {
    const p = G.p;
    if (p.dead) return;
    p.hp -= dmg; G.stats.taken += dmg;
    if (p.hp <= 0) { p.hp = 0; defeat(); }
  }
  function defeat() {
    const p = G.p;
    p.dead = true; G.mode = 'defeat'; G.endT = 0; G.freeze = false; guard(false);
    slow(0.3, 1.3); Snd.setMode('none'); Snd.fanfare(false); VM.drop(); UI.hurt(1);
    F2.pop('落馬', '말에서 떨어졌다…', { size: 34, color: '#ff6a4a', dur: 2.4, y: 0.36 });
    UI.hint('', 0);
  }
  function addKi(v) {
    const p = G.p, was = p.ki;
    p.ki = Math.min(100, p.ki + v * G.hero.ki);
    if (was < 100 && p.ki >= 100) {
      Snd.glint(false); F2.pop('', '奧義 준비!', { size: 20, y: 0.74, color: '#ffd27a', dur: 0.9 });
      if (!Save.d.kh || G.tut.on) { Save.d.kh = 1; Save.save(); UI.hint('기세가 찼다! 오른쪽 아래 奧義를 눌러라', 3.2); }
    }
  }

  // ── player actions
  function guard(on) {
    const p = G.p;
    if (!p) return;
    if (on && (p.dead || G.paused || (G.mode !== 'melee' && G.mode !== 'charge') || G.t < p.guardLock || G.freeze)) on = false;
    if (p.guard === on) return;
    p.guard = on; VM.setGuard(on);
  }
  function swipe(dir, x0, y0, x1, y1) {
    if (G.paused || !G.p || !DIRV[dir]) return;
    if (G.mode === 'super') return superSwipe(dir, x0, y0, x1, y1);
    if ((G.mode !== 'melee' && G.mode !== 'charge') || G.p.dead) return;
    const p = G.p;
    if (G.freeze) {
      const atk = G.e.atk;
      if (atk && dir === atk.dir) { G.freeze = false; G.tut.froze++; UI.hint('', 0); p.lock = 0; }
      else { Cam.shake(0.1); return; }
    }
    if (G.t < p.lock) { p.buf = { dir, x0, y0, x1, y1, rt: G.rt }; return; }
    doSwipe(dir, x0, y0, x1, y1);
  }
  function doSwipe(dir, x0, y0, x1, y1) {
    const p = G.p, e = G.e, h = G.hero, atk = e.atk;
    if (p.guard) guard(false);
    F2.streak(x0, y0, x1, y1, h.rgb, 1);
    if (e.state === 'windup' && atk && !atk.resolved) {
      const rem = atk.tHit - G.t, live = !atk.feint || atk.feinted;
      const win = (atk.charge ? 0.52 : 0.4) * h.parry, pw = (atk.charge ? 0.19 : 0.14) * h.parry;
      if (live && dir === atk.dir && rem <= win && rem >= -LATE_GRACE && !atk.parry) {
        atk.parry = rem <= pw ? 'perfect' : 'good';
        if (atk.charge) VM.slashAt(dir, Math.max(0, rem - 0.1));
        else { atk.tHit = Math.min(atk.tHit, G.t + 0.06); VM.slash(dir); }
        Snd.swing(1, DIRV[dir][0] * 0.3); p.lock = G.t + 0.14;
        return;
      }
      VM.slash(dir); Snd.swing(0.8, DIRV[dir][0] * 0.3); p.lock = G.t + 0.26;
      if (live && dir === atk.dir && rem > win) F2.pop('', '이르다!', { size: 17, y: 0.3, color: '#9a9083', dur: 0.45 });
      return;
    }
    VM.slash(dir); Snd.swing(1, DIRV[dir][0] * 0.3);
    Cam.swingKick(dir);
    if (G.mode === 'charge') { p.lock = G.t + 0.3; return; }
    p.lock = G.t + SWING_CD;
    after(0.075, () => slashContact(dir));
  }
  function special() {
    const p = G.p, e = G.e;
    if (!p || G.paused || G.mode !== 'melee' || p.ki < 100 || p.dead || e.dead || e.state === 'roar' || G.freeze) return;
    p.ki = 0; guard(false);
    G.mode = 'super'; G.su = { t: 0, phase: 0, hits: 0, last: -1 };
    e.atk = null; e.state = 'stun'; Rig.E.heavy = 0;
    Rig.E.anim.play([{ p: EP.stag, d: 0.2, e: 'out' }]);
    Snd.superStart(); Snd.setMode('super'); F2.flash(0.6, G.hero.rgb); Cam.shake(0.5); Cam.punch(9); buzz(60);
    F2.pop(G.hero.superHj, G.hero.superKr + '!', { size: 24, color: '#fff3d6', dur: 1.1, y: 0.22, rot: -0.05 });
    heroCut('kiai', G.hero.shout, '', { dur: 0.85, y: 0.5 }); Snd.voice('p', true);
    F2.focus(1, 0.5, 0.42, 3); Cam.tilt(-0.11, 3);
    UI.hint('사방으로 마구 베어라!', 2.6);
  }
  function superSwipe(dir, x0, y0, x1, y1) {
    const su = G.su, e = G.e;
    if (!su || su.phase !== 1 || G.rt - su.last < 0.07 || su.hits >= 16) return;
    su.last = G.rt; su.hits++;
    VM.slash(dir, true); F2.streak(x0, y0, x1, y1, G.hero.rgb, 1.5);
    const p = G.p; p.combo++; p.comboT = 3; if (p.combo > G.stats.maxCombo) G.stats.maxCombo = p.combo;
    Rig.chest(_cp); _cp.x += rnd(-0.2, 0.2); _cp.y += rnd(-0.2, 0.3);
    FX.sparkBurst(_cp, 12, 0.9); const sc = Cam.project(_cp); F2.burst(sc.x, sc.y, G.hero.rgb, 1);
    if (su.hits % 2) Snd.hit(0.85); else Snd.clang(0.55, 1.1, rnd(-0.4, 0.4));
    Snd.swing(0.6); Cam.shake(0.3); Cam.punch(-1.5); buzz(10);
    Rig.flinch(dir, 0.8);
    damageEnemy(3.4 * G.hero.atk, dir);
  }
  function updateSuper(rdt) {
    const su = G.su, e = G.e;
    su.t += rdt;
    if (su.phase === 0) { G.focus = 0.06; if (su.t >= 0.55) { su.phase = 1; su.t = 0; } }
    else if (su.phase === 1) {
      G.focus = 0.4;
      if (su.t >= 2.3 || su.hits >= 16) { su.phase = 2; su.t = 0; VM.raise(0.2); Snd.swing(0.6); }
    } else if (su.phase === 2) {
      G.focus = 0.12;
      if (su.t >= 0.34) {
        su.phase = 3; su.t = 0;
        VM.slash('D'); F2.streak(F2.W * 0.62, -F2.H * 0.1, F2.W * 0.34, F2.H * 1.05, G.hero.rgb, 3);
        Rig.chest(_cp); FX.sparkBurst(_cp, 70, 1.5); const sc = Cam.project(_cp); F2.burst(sc.x, sc.y, '255,244,214', 2.2);
        F2.flash(0.9); World.skyFlash(0.8); stop(0.18); slow(0.2, 0.7); Cam.shake(1); Cam.punch(-9); buzz(120);
        F2.impact(0.13, sc.x / F2.W, sc.y / F2.H); Cam.tilt(0.22, 0.45);
        G.cut = { kind: 'low', t: 0, dur: 0.55, side: -1, expr: 'hurt' };
        Snd.finisher(false); Snd.cheer(2.4, 0.26); Rig.flinch('D', 1.6); G.push.kick(5);
        F2.pop('斬', '', { size: 46, color: '#fff3d6', dur: 0.9, y: 0.34 });
        damageEnemy((16 + su.hits * 1.2) * G.hero.atk, 'D');
      }
    } else if (su.t >= 0.6) {
      G.su = null;
      if (G.mode === 'super') {
        G.mode = 'melee'; Snd.setMode('duel');
        e.state = 'broken'; e.stT = 0; e.stDur = 0.7; e.vuln = 1.2; e.post = 0;
      }
    }
  }

  // ── per-frame
  function updateEnemy(dt) {
    const e = G.e;
    e.stT += dt; e.postT += dt;
    if (e.postT > 2 && (e.state === 'idle' || e.state === 'windup' || e.state === 'follow')) e.post = Math.max(0, e.post - e.ai.postDecay * dt);
    switch (e.state) {
      case 'idle': if (e.stT >= e.nextAct) startString(pick(e.strings), false); break;
      case 'windup': updateWindup(); break;
      case 'follow': if (e.stT >= e.stDur) nextInString(); break;
      case 'recover': case 'parried': if (e.stT >= e.stDur) enterIdle(); break;
      case 'broken': if (e.stT >= e.stDur) { e.post = 0; e.stringsDone = 99; enterIdle(); } break;
      case 'roar': if (e.stT >= e.stDur) { enterIdle(); e.nextAct = 0.35; } break;
    }
  }
  function updatePlayer(dt, rdt) {
    const p = G.p;
    if (p.guard) p.stWait = 0.7; else { p.stWait -= dt; if (p.stWait <= 0) p.st = Math.min(100, p.st + 30 * dt); }
    if (p.comboT > 0) { p.comboT -= dt; if (p.comboT <= 0) p.combo = 0; }
    if (p.buf && G.t >= p.lock) { const b = p.buf; p.buf = null; if (G.rt - b.rt < 0.18) doSwipe(b.dir, b.x0, b.y0, b.x1, b.y1); }
    if (p.hp / p.hpMax < 0.3 && !p.dead) { G.hbT -= rdt; if (G.hbT <= 0) { G.hbT = 0.85; Snd.heartbeat(); } }
  }
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) * 2; // ~N(0,1)
  function bot() {
    const p = G.p, e = G.e, atk = e.atk, sk = G.autoSkill;
    if (G.mode === 'super') { if (G.su.phase === 1 && G.rt - (G.botLast || 0) > 0.11) { G.botLast = G.rt; botSwipe(pick(DIRS)); } return; }
    if (G.mode !== 'melee' && G.mode !== 'charge') return;
    if (e.state === 'windup' && atk && !atk.resolved) {
      if (atk.parry || (atk.feint && !atk.feinted)) return;
      if (atk.botAt === undefined) {
        // human-like: choice-reaction delay from the moment the real direction shows, then swipe near the intended moment
        const see = G.t + Math.max(0.16, sk.mu + gauss() * sk.sd);
        const want = atk.tHit - Math.max(0, sk.aim + gauss() * sk.jit);
        atk.botAt = Math.random() < sk.miss ? -1 : Math.max(see, want);
        atk.botGuardAt = see; atk.botGuard = Math.random() < 0.5;
      }
      if (G.freeze) return botSwipe(atk.dir);
      if (atk.botAt >= 0) { if (G.t >= atk.botAt && G.t >= p.lock) botSwipe(atk.dir); }
      else if (atk.botGuard && !atk.heavy && G.t >= atk.botGuardAt) guard(true);
      return;
    }
    if (p.guard) guard(false);
    if (G.mode === 'melee') {
      const open = e.state === 'recover' || e.state === 'parried' || e.state === 'broken';
      if (p.ki >= 100 && (e.state === 'idle' || open)) return special();
      if (!open && (e.state !== 'idle' || e.pressure >= sk.greed)) return;
      if (G.t >= p.lock && G.t - (G.botLastS || 0) > sk.rate) { G.botLastS = G.t; G.botDir = ((G.botDir || 0) + 1) % 4; botSwipe(DIRS[G.botDir]); }
    }
  }
  function botSwipe(dir) {
    const v = { L: [-1, 0], R: [1, 0], U: [0, -1], D: [0, 1] }[dir], cx = F2.W / 2, cy = F2.H * 0.45, L = Math.min(F2.W, F2.H) * 0.4;
    swipe(dir, cx - v[0] * L, cy - v[1] * L, cx + v[0] * L, cy + v[1] * L);
  }
  function update(dt, rdt) {
    G.focus = 1;
    for (let i = G.q.length - 1; i >= 0; i--) if (G.t >= G.q[i].t) { const it = G.q[i]; G.q.splice(i, 1); it.fn(); }
    const m = G.mode, e = G.e, p = G.p;
    G.pGait = damp(G.pGait, G.pGaitT, 3.2, dt); G.eGait = damp(G.eGait, G.eGaitT, 3.2, dt);
    G.psi = damp(G.psi, G.psiT, 3.5, dt);
    if (G.eRearT > 0) G.eRearT -= dt; if (G.pRearT > 0) G.pRearT -= dt;
    G.eRear = damp(G.eRear, G.eRearT > 0 ? 1 : 0, G.eRearT > 0 ? 7 : 4, dt);
    G.pRear = damp(G.pRear, G.pRearT > 0 ? 1 : 0, G.pRearT > 0 ? 7 : 4, dt);
    G.lunge.update(dt); G.push.update(dt); G.eToss = damp(G.eToss, 0, 3, dt);
    if (m === 'title') { if (G.thetaLock === undefined) G.theta += rdt * 0.12; else G.theta = G.thetaLock; return; }
    if (m === 'intro') {
      G.introT += rdt;
      if (G.introT >= 1.5 && G.introT - rdt < 1.5) { G.eRearT = 0.5; Snd.snort(0.9); Snd.horn(0.8, 1); }
      if (G.introT >= 3.4 || (G.auto && G.introT > 0.4)) beginDuel();
      return;
    }
    if (G.auto && p && !p.dead && e && !e.dead) bot();
    if (m === 'charge') {
      G.stats.time += dt; G.cT += dt;
      const atk = e.atk;
      if (!atk) {
        G.cV = damp(G.cV, 21, 2.2, dt);
        G.d = Math.max(D_CLASH + 0.4, G.d - G.cV * dt);
        const ttc = (G.d - D_CLASH) / Math.max(4, G.cV);
        if (ttc <= e.ai.chargeWind) beginAttack({ dir: pick(DIRS), heavy: false, feint: null }, Math.max(0.35, ttc), true);
      } else if (!atk.resolved) {
        const k = sat((G.t - atk.t0) / Math.max(0.001, atk.tHit - atk.t0));
        G.d = lerp(atk.d0, D_CLASH, k);
        const rem = atk.tHit - G.t;
        if (rem < 0.5) G.focus = lerp(0.45, 1, sat(rem / 0.5));
        updateWindup();
      }
      G.pPhase += (G.cV / 2 / 5.2) * dt; G.ePhase += (G.cV / 2 / 5.2) * dt;
      updatePlayer(dt, rdt);
    } else if (m === 'melee') {
      G.stats.time += dt;
      G.d = damp(G.d, D_MELEE, 5, dt);
      G.omega = damp(G.omega, -0.17 - (e.enraged ? 0.07 : 0), 1.5, dt);
      G.theta += G.omega * dt;
      G.pPhase += Math.abs(G.omega) * 0.5 * dt; G.ePhase += Math.abs(G.omega) * 0.5 * dt;
      updateEnemy(dt); updatePlayer(dt, rdt);
    } else if (m === 'transition') {
      G.d = damp(G.d, D_MELEE + 2.5, 3, dt); G.theta += G.omega * dt;
    } else if (m === 'super') {
      G.d = damp(G.d, D_MELEE, 5, dt); G.theta += G.omega * dt;
      updateSuper(rdt);
      if (p.comboT > 0) p.comboT -= dt;
    } else if (m === 'victory') {
      G.endT += rdt; G.theta += -0.1 * dt;
      if (G.endT >= 3.7) { G.mode = 'result'; UI.showResult(true); }
    } else if (m === 'defeat') {
      G.endT += rdt; G.camFall = sat(G.endT / 1.5);
      if (G.endT >= 2.7) { G.mode = 'result'; UI.showResult(false); }
    }
  }
  function tap() { if (G.mode === 'intro' && G.introT > 0.5) beginDuel(); }
  function pause(on) {
    if (on === undefined) on = !G.paused;
    if (on && (G.mode === 'title' || G.mode === 'result' || G.mode === 'boot')) return;
    G.paused = on; Input.cancel(); if (G.p) guard(false);
    UI.show(on ? 'pause' : null);
    if (on) Snd.suspend(); else Snd.resume();
  }
  return { toTitle, startRun, startStage, swipe, guard, tap, special, pause, update, next() { G.retries = 0; startStage(G.stageIdx + 1); }, retry(lost) { G.retries = lost ? G.retries + 1 : 0; startStage(G.stageIdx); } };
})();
