// usage: node test/run.mjs <scenario> [w] [h]
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const scenario = process.argv[2] || 'title';
const W = +(process.argv[3] || 390), H = +(process.argv[4] || 800);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: true, isMobile: W < H });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', (e) => { errs.push('PAGEERROR ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')); });
p.on('console', (m) => { const t = m.text(); if (m.type() === 'error' || (m.type() === 'warning' && !/GPU stall|ReadPixels|WebGL-/.test(t))) errs.push(m.type() + ': ' + t.slice(0, 300)); });
await p.route('**/three.min.js', (r) => r.fulfill({ path: '/home/claude/ilgito/node_modules/three/build/three.min.js', contentType: 'application/javascript' }));
await p.goto('file://' + (process.env.ILGITO_HTML || '/home/claude/ilgito/dist/index.html'));
const shot = async (name) => { await p.screenshot({ path: `shots/${name}.png` }); };
const wait = (ms) => p.waitForTimeout(ms);
const ev = (f, a) => p.evaluate(f, a);
const st = () => ev(() => { const g = window.__ilgito.G; return { mode: g.mode, t: +g.t.toFixed(2), d: +g.d.toFixed(1), round: g.round, php: g.p && Math.round(g.p.hp), ehp: g.e && Math.round(g.e.hp), est: g.e && g.e.state, post: g.e && Math.round(g.e.post), ki: g.p && Math.round(g.p.ki) }; });
await p.waitForFunction('window.__ilgito && window.__ilgito.G.mode === "title"', null, { timeout: 15000 }).catch(() => errs.push('never reached title'));
await wait(1200);
const S = {
  async title() { await shot('title_' + W); },
  async model() {
    await ev(() => { const I = window.__ilgito; I.UI.show(null); I.G.dbgStop = true; });
    const views = [['front', 0.5, 5.2, 2.0, -0.02, 44], ['side', 0.5 + Math.PI / 2, 5.6, 1.6, 0.0, 44], ['q34', 0.5 + 0.8, 5.0, 2.2, -0.06, 44], ['back', 0.5 + Math.PI, 5.2, 2.0, -0.02, 44], ['close', 0.5 + 0.25, 2.4, 2.5, -0.1, 60]];
    const pal = process.argv[5] || 'noon', stage = +(process.argv[6] || 0);
    await ev(({ pal, stage }) => { const I = window.__ilgito; const S = I.STAGES[stage]; I.Rig.build(S).anim.snap(I.EP[window.__pose || 'guard']); I.World.applyPalette(I.PALS[pal]); I.World.setArmy('foe', I.ARMY[S.army]); I.G.needMotes = true; }, { pal, stage });
    for (const v of views) {
      await ev((v) => { const I = window.__ilgito; I.G.theta = v[1]; I.G.dbg = { r: v[2], y: v[3], pitch: v[4], fov: v[5] }; I.G.thetaLock = v[1]; }, v);
      await wait(350); await shot('model_' + v[0] + '_' + stage);
    }
  },
  // close-ups of the built rig: node test/run.mjs view W H <pal> <stage> <pose> [names]
  async view() {
    const pal = process.argv[5] || 'noon', stage = +(process.argv[6] || 0), pose = process.argv[7] || 'guard', only = process.argv[8] ? process.argv[8].split(',') : null;
    await ev(() => { const I = window.__ilgito; I.UI.show(null); I.G.dbgStop = true; });
    await ev(({ pal, stage, pose }) => { const I = window.__ilgito; const S = I.STAGES[stage]; const p = pose.split('.').reduce((o, k) => o[k], I.EP); I.Rig.build(S).anim.snap(p); I.World.applyPalette(I.PALS[pal]); I.World.setArmy('foe', I.ARMY[S.army]); }, { pal, stage, pose });
    await wait(300);
    // name: [part, local point, theta offset from the front, distance, camera height above the target, fov]
    const V = { face: ['rhead', [0, 0, 0], 0.15, 1.0, 0.05, 34], faceS: ['rhead', [0, 0, 0], 1.2, 1.1, 0.05, 34], bust: ['waist', [0, 0.4, 0], 0.3, 2.0, 0.3, 40], bustB: ['waist', [0, 0.4, 0], 2.6, 2.2, 0.3, 40],
      handR: ['handR', [0, 0, 0], 0.5, 0.55, 0.12, 40], handL: ['handL', [0, 0, 0], -0.6, 0.55, 0.12, 40], hhead: ['hhead', [0, 0.25, 0], 0.7, 1.5, 0.15, 40], hheadF: ['hhead', [0, 0.25, 0], 0.0, 1.6, 0.0, 40],
      neckL: ['neck', [0, 0.4, 0], 1.57, 2.2, 0.2, 40], neckR: ['neck', [0, 0.4, 0], -1.57, 2.2, 0.2, 40], legs: ['body', [0, 0.6, 0], 1.2, 3.2, 0.3, 44], legsF: ['body', [0, 0.6, 0.5], 0.35, 3.0, 0.2, 44],
      horseL: ['body', [0, 1.2, 0], 1.57, 4.4, 0.4, 44], horseR: ['body', [0, 1.2, 0], -1.57, 4.4, 0.4, 44], top: ['body', [0, 1.6, 0.4], 3.14, 2.6, 2.2, 50], blade: ['weapon', [0, 1.5, 0], 0.4, 1.3, 0.1, 40], seat: ['seat', [0, -0.2, 0.1], 1.0, 1.8, 0.4, 44] };
    for (const name of Object.keys(V)) {
      if (only && !only.includes(name)) continue;
      await ev(({ v }) => {
        const I = window.__ilgito, E = I.Rig.E, T = THREE;
        const part = { rhead: E.rider.head, waist: E.rider.waist, handR: E.rider.armR.hand, handL: E.rider.armL.hand, hhead: E.horse.head, neck: E.horse.neck, body: E.horse.body, weapon: E.weapon.g, seat: E.rider.seat }[v[0]];
        E.root.updateMatrixWorld(true);
        const p = part.localToWorld(new T.Vector3(v[1][0], v[1][1], v[1][2]));
        const th = E.root.rotation.y + v[2];
        I.G.theta = th; I.G.thetaLock = th; I.G.dbg = { at: [p.x, p.y, p.z], r: v[3], y: p.y + v[4], fov: v[5] };
      }, { v: V[name] });
      await wait(300); await shot(`view_${name}_${stage}`);
    }
  },
  // which single-sided pieces face inwards, and how heavy is the rig: node test/run.mjs geo W H <stage>
  async geo() {
    const stage = +(process.argv[5] || 0);
    const res = await ev(({ stage }) => {
      const I = window.__ilgito, T = THREE; I.G.dbgStop = true; const E = I.Rig.build(I.STAGES[stage]);
      const out = { meshes: 0, tris: 0, inward: [], vm: { meshes: 0, tris: 0 } };
      const a = new T.Vector3(), b = new T.Vector3(), c = new T.Vector3(), n = new T.Vector3(), cen = new T.Vector3(), fc = new T.Vector3();
      const scan = (root, acc, check) => root.traverse((m) => {
        if (!m.isMesh) return; const g = m.geometry, pos = g.attributes.position, ix = g.index, cnt = ix ? ix.count : pos.count;
        acc.meshes++; acc.tris += cnt / 3;
        if (!check || m.material.side === T.DoubleSide) return;
        g.computeBoundingBox(); g.boundingBox.getCenter(cen);
        let s = 0, tot = 0;
        for (let k = 0; k < cnt; k += 3) {
          a.fromBufferAttribute(pos, ix ? ix.getX(k) : k); b.fromBufferAttribute(pos, ix ? ix.getX(k + 1) : k + 1); c.fromBufferAttribute(pos, ix ? ix.getX(k + 2) : k + 2);
          n.subVectors(b, a).cross(fc.subVectors(c, a)); fc.addVectors(a, b).add(c).multiplyScalar(1 / 3).sub(cen);
          s += n.dot(fc); tot += Math.abs(n.dot(fc));
        }
        if (tot > 0 && s / tot < -0.2) out.inward.push((m.parent && m.parent.type) + ' tris=' + cnt / 3 + ' score=' + (s / tot).toFixed(2) + ' mat=' + m.material.type + '#' + m.material.color.getHexString());
      });
      scan(E.root, out, true); scan(I.VM.scene, out.vm, false);
      return out;
    }, { stage });
    console.log(JSON.stringify(res, null, 1));
  },
  // step through one enemy attack frame by frame: node test/run.mjs atk 390 800 L [heavy]
  async atk() {
    const dir = process.argv[5] || 'L', mode = process.argv[6] || 'hit';
    await p.click('#btnGo'); await wait(500);
    await ev(() => { const I = window.__ilgito; I.G.tut.on = false; I.G.manual = true; I.Game.tap(); });
    // fast-forward into melee, parrying the charge
    await ev(() => { const I = window.__ilgito, G = I.G; let n = 0; G.auto = true; G.autoSkill = { perfect: 0, good: 1 }; while (G.mode !== 'melee' && n++ < 800) I.step(0.033); G.auto = false; for (let i = 0; i < 30; i++) I.step(0.033); });
    console.log(await st());
    await ev(({ dir }) => { const I = window.__ilgito, G = I.G; G.e.state = 'idle'; G.e.stT = 0; G.e.nextAct = 0.05; G.e.strings = [[dir]]; G.e.ai.wind = 0.8; G.p.hp = 9999; }, { dir });
    const names = [];
    for (let i = 0; i < 16; i++) {
      await ev(({ i, mode, dir }) => { const I = window.__ilgito, G = I.G; I.step(0.0167, 4);
        if (mode === 'parry' && G.e.atk && !G.e.atk.parry && G.e.atk.tHit - G.t < 0.1 && G.e.state === 'windup' && (!G.e.atk.feint || G.e.atk.feinted)) I.Game.swipe(G.e.atk.dir, 100, 300, 300, 300);
        if (mode === 'guard') I.Game.guard(true);
      }, { i, mode, dir });
      await wait(60); await shot(`atk_${dir}_${mode}_${String(i).padStart(2, '0')}`);
    }
    console.log(await st());
  },
  async slash() {
    const hero = +(process.argv[5] || 0);
    await ev(({ hero }) => { const I = window.__ilgito; I.G.hero = I.HEROES[hero]; }, { hero });
    await p.click('#btnGo'); await wait(500);
    await ev(() => { const I = window.__ilgito; I.G.tut.on = false; I.G.manual = true; I.Game.tap(); });
    await ev(() => { const I = window.__ilgito, G = I.G; let n = 0; G.auto = true; G.autoSkill = { perfect: 0, good: 1 }; while (G.mode !== 'melee' && n++ < 800) I.step(0.033); G.auto = false; for (let i = 0; i < 45; i++) I.step(0.033); G.e.state = 'recover'; G.e.stT = 0; G.e.stDur = 99; I.Rig.E.anim.play([{ p: I.EP.open, d: 0.2 }]); for (let i = 0; i < 10; i++) I.step(0.033); });
    const seq = ['L', 'R', 'U', 'D'];
    let k = 0;
    for (const d of seq) {
      await ev(({ d }) => { const I = window.__ilgito; const v = { L: [-1, 0], R: [1, 0], U: [0, -1], D: [0, 1] }[d]; I.Game.swipe(d, 195 - v[0] * 150, 380 - v[1] * 150, 195 + v[0] * 150, 380 + v[1] * 150); }, { d });
      for (let i = 0; i < 6; i++) { await ev(() => window.__ilgito.step(0.0167, 2)); await wait(40); await shot(`slash_${String(k++).padStart(2, '0')}`); }
    }
    console.log(await st());
  },
  // fast logic-only simulation: node test/run.mjs sim 390 800 <stage> <skill:novice|avg|expert> <runs> <hero>
  async sim() {
    const stage = +(process.argv[5] || 0), skill = process.argv[6] || 'avg', runs = +(process.argv[7] || 6), hero = +(process.argv[8] || 0);
    const SK = { novice: { mu: 0.52, sd: 0.11, miss: 0.18, aim: 0.2, jit: 0.12, rate: 0.36, greed: 1 }, avg: { mu: 0.42, sd: 0.08, miss: 0.08, aim: 0.13, jit: 0.08, rate: 0.3, greed: 2 }, expert: { mu: 0.33, sd: 0.06, miss: 0.03, aim: 0.08, jit: 0.05, rate: 0.26, greed: 3 } }[skill];
    const boost = +(process.argv[9] || 0);
    const res = await ev(({ stage, SK, runs, hero, boost }) => {
      const I = window.__ilgito, G = I.G; const out = [];
      G.manual = true; G.noRender = true; G.hero = I.HEROES[hero];
      for (let r = 0; r < runs; r++) {
        I.Save.d.cleared = stage; I.Save.d.tut = true; I.Game.toTitle(); I.Game.startRun();
        if (boost) { G.retries = boost - 1; I.Game.retry(true); }
        G.auto = true; G.autoSkill = SK; G.tut.on = false;
        let n = 0;
        while (G.mode !== 'result' && n++ < 60000) I.step(1 / 60);
        out.push({ win: !G.p.dead, t: +G.stats.time.toFixed(1), rounds: G.round, taken: Math.round(G.stats.taken), perfect: G.stats.perfect, parry: G.stats.parry, combo: G.stats.maxCombo, ehp: Math.round(G.e.hp), n });
      }
      return { out, snd: I.Snd.errs ? I.Snd.errs() : null };
    }, { stage, SK, runs, hero, boost });
    const all = res.out, wins = all.filter((r) => r.win), avg = (a, k) => (a.reduce((s, r) => s + r[k], 0) / Math.max(1, a.length)).toFixed(1);
    console.log(`stage ${stage} ${skill.padEnd(6)}: win ${wins.length}/${all.length}  T(win)=${avg(wins, 't')}s T(all)=${avg(all, 't')}s rounds=${avg(all, 'rounds')} taken=${avg(all, 'taken')} perfect=${avg(all, 'perfect')} parry=${avg(all, 'parry')} sndErr=${JSON.stringify(res.snd)}`);
  },
  // stepped sequences: node test/run.mjs seq 390 800 <charge|super|kill|defeat|round|rage> [stage] [hero]
  async seq() {
    const what = process.argv[5] || 'charge', stage = +(process.argv[6] || 0), hero = +(process.argv[7] || 0);
    await ev(({ stage, hero }) => { const I = window.__ilgito; I.G.hero = I.HEROES[hero]; I.Save.d.cleared = stage; I.Save.d.tut = true; I.Game.toTitle(); }, { stage, hero });
    await p.click('#btnGo'); await wait(400);
    await ev(() => { const I = window.__ilgito, G = I.G; G.tut.on = false; G.manual = true; G.auto = true; G.autoSkill = { mu: 0.3, sd: 0.02, miss: 0, aim: 0.05, jit: 0.01, rate: 0.26, greed: 3 }; I.Game.tap(); for (let i = 0; i < 20 && G.mode === 'intro'; i++) I.step(0.033); });
    const grab = async (n, steps, tag) => { for (let i = 0; i < n; i++) { await ev((steps) => window.__ilgito.step(0.0167, steps), steps); await wait(50); await shot(`seq_${what}_${tag}${String(i).padStart(2, '0')}`); } };
    const until = (cond, max = 3000) => ev(({ cond, max }) => { const I = window.__ilgito, G = I.G; const f = new Function('G', 'I', 'return ' + cond); let n = 0; while (!f(G, I) && n++ < max) I.step(0.0167); return n; }, { cond, max });
    if (what === 'charge') { await grab(28, 6, 'a'); }
    else if (what === 'super') {
      await until("G.mode==='melee'"); await ev(() => { const G = window.__ilgito.G; G.p.ki = 100; G.e.hp = G.e.hpMax; });
      await until("G.mode==='super'"); await grab(26, 8, 'a');
    } else if (what === 'kill') {
      await until("G.mode==='melee'"); await ev(() => { const G = window.__ilgito.G; G.e.hp = 6; G.e.state = 'recover'; G.e.stT = 0; G.e.stDur = 9; });
      await until("G.mode==='victory'", 600); await grab(24, 10, 'a');
      await until("G.mode==='result'"); await wait(200); await shot('seq_kill_result');
    } else if (what === 'defeat') {
      await until("G.mode==='melee'"); await ev(() => { const G = window.__ilgito.G; G.p.hp = 3; G.auto = false; });
      await until("G.mode==='defeat'", 1200); await grab(16, 10, 'a');
      await until("G.mode==='result'"); await wait(200); await shot('seq_defeat_result');
    } else if (what === 'round') {
      await until("G.mode==='melee'"); await ev(() => { const G = window.__ilgito.G; G.e.stringsDone = 9; G.auto = false; });
      await until("G.mode==='transition'", 1500); await grab(24, 6, 'a');
    } else if (what === 'rage') {
      await until("G.mode==='melee'"); await ev(() => { const G = window.__ilgito.G; G.e.hp = G.e.hpMax * 0.3; G.e.rageDue = true; G.auto = false; });
      await until("G.e.state==='roar'", 1500); await grab(16, 6, 'a');
    }
    console.log(await st());
  },
  // real pointer input through the tutorial: node test/run.mjs input
  async input() {
    await ev(() => { const I = window.__ilgito; I.Save.d.tut = false; I.Save.d.cleared = 0; I.Game.toTitle(); });
    await p.click('#btnGo'); await wait(600);
    await p.mouse.click(W / 2, H * 0.4);            // skip intro by tapping the vs card
    console.log('after tap', (await st()).mode);
    const drag = async (dir) => { const v = { L: [-1, 0], R: [1, 0], U: [0, -1], D: [0, 1] }[dir]; const x = W / 2, y = H * 0.5; await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.move(x + v[0] * 30, y + v[1] * 30, { steps: 2 }); await p.mouse.move(x + v[0] * 90, y + v[1] * 90, { steps: 3 }); await p.mouse.up(); };
    await p.waitForFunction('window.__ilgito.G.freeze === true', null, { timeout: 60000 }).catch(() => errs.push('no freeze'));
    await shot('input_freeze1');
    let d = await ev(() => window.__ilgito.G.e.atk.dir); await drag(d === 'L' ? 'R' : 'L'); await wait(100);
    console.log('wrong dir keeps freeze:', await ev(() => window.__ilgito.G.freeze));
    await drag(d); await wait(150);
    console.log('right dir unfreezes:', await ev(() => !window.__ilgito.G.freeze), JSON.stringify(await st()), JSON.stringify(await ev(() => window.__ilgito.G.stats)));
    await p.waitForFunction('window.__ilgito.G.freeze === true', null, { timeout: 60000 }).catch(() => errs.push('no freeze2'));
    d = await ev(() => window.__ilgito.G.e.atk.dir); await drag(d); await wait(300);
    console.log('2nd freeze cleared:', await ev(() => !window.__ilgito.G.freeze), JSON.stringify(await ev(() => window.__ilgito.G.stats)));
    // hold = guard
    await p.mouse.move(W / 2, H * 0.5); await p.mouse.down(); await wait(400);
    console.log('guard on hold:', await ev(() => window.__ilgito.G.p.guard)); await shot('input_guard');
    await p.mouse.up(); await wait(100);
    console.log('guard off on release:', await ev(() => !window.__ilgito.G.p.guard));
    // zig-zag continuous swipe without lifting: expect several slashes
    const before = await ev(() => window.__ilgito.G.p.lock);
    await ev(() => { window.__sw = 0; const I = window.__ilgito; const o = I.Game.swipe; });
    await p.mouse.move(100, 400); await p.mouse.down();
    for (const x of [300, 100, 300, 100]) { await p.mouse.move(x, 400, { steps: 4 }); await wait(120); }
    await p.mouse.up();
    // super button
    await ev(() => { const G = window.__ilgito.G; G.p.ki = 100; G.e.state = 'idle'; G.e.stT = 0; G.e.nextAct = 9; G.e.atk = null; });
    await wait(200); await p.click('#btnSuper', { force: true }); await wait(200);
    console.log('super via button:', (await st()).mode);
    // pause
    await p.waitForFunction('window.__ilgito.G.mode === "melee" || window.__ilgito.G.mode === "charge" || window.__ilgito.G.mode==="transition"', null, { timeout: 60000 }).catch(() => {});
    await p.click('#btnPause'); await wait(200); console.log('paused:', await ev(() => window.__ilgito.G.paused)); await shot('input_pause');
    await p.click('#pResume'); await wait(200); console.log('resumed:', await ev(() => !window.__ilgito.G.paused));
    console.log('render info', JSON.stringify(await ev(() => window.__ilgito.info())), 'snd', await ev(() => window.__ilgito.Snd.state()), JSON.stringify(await ev(() => window.__ilgito.Snd.errs())));
  },
  async perf() {
    await p.click('#btnGo'); await wait(500);
    await ev(() => { const I = window.__ilgito, G = I.G; G.tut.on = false; G.manual = true; G.auto = true; I.Game.tap(); let n = 0; while (G.mode !== 'melee' && n++ < 900) I.step(0.033); });
    console.log('melee', JSON.stringify(await ev(() => window.__ilgito.info())));
    // stage cycling leak check
    const mem = await ev(() => { const I = window.__ilgito, G = I.G; const out = []; G.noRender = true; for (let k = 0; k < 6; k++) { I.Game.startStage(k % 5); let n = 0; while (G.mode !== 'melee' && n++ < 900) I.step(0.033); G.noRender = false; out.push(I.info().geo + '/' + I.info().tex); G.noRender = true; } return out; });
    console.log('geo/tex per stage restart', mem.join(' '));
    // timing of one frame (software GL, only relative)
    const t = await ev(() => { const I = window.__ilgito; I.G.noRender = true; const t0 = performance.now(); I.step(1 / 60, 300); return (performance.now() - t0) / 300; });
    console.log('logic+anim ms/frame (no GL):', t.toFixed(3));
  },
  // contact sheet of the painted faces: rows = characters, columns = idle/kiai/hurt/rage.  node test/run.mjs faces
  async faces() {
    const url = await ev(() => {
      const I = window.__ilgito, ex = ['idle', 'kiai', 'hurt', 'rage'], who = I.HEROES.map((h) => h.look).concat(I.STAGES.map((s) => s.look));
      const cw = 160, ch = 202, c = document.createElement('canvas'); c.width = cw * 8; c.height = ch * who.length;
      const g = c.getContext('2d'); g.fillStyle = '#35607e'; g.fillRect(0, 0, c.width, c.height);
      who.forEach((look, r) => ex.forEach((e, q) => {
        g.drawImage(I.FACE.cutin(look, e), q * cw, r * ch, cw, ch);                       // the ink cut-in panel, as shown in the band
        const t = I.FACE.tex(look, e).image, k = t.width / 512;                            // the colour head texture, front part only
        g.drawImage(t, 58 * k, 66 * k, 140 * k, 152 * k, (4 + q) * cw, r * ch, cw, ch);
      }));
      return c.toDataURL('image/png');
    });
    fs.writeFileSync('shots/faces.png', Buffer.from(url.split(',')[1], 'base64'));
  },
  // geometry leak check: uploaded geometries vs geometries still reachable from the scene, over 4 full stage cycles
  async leak() {
    await p.click('#btnGo'); await wait(500);
    const out = await ev(() => {
      const I = window.__ilgito, G = I.G; G.tut.on = false; G.manual = true; G.auto = true; I.Game.tap();
      const scene = I.World.scene, res = [];
      const count = () => { const s = new Set(); scene.traverse((o) => { if (o.geometry) s.add(o.geometry); }); return s.size; };
      G.noRender = true;
      for (let k = 0; k < 21; k++) {
        I.Game.startStage(k % 5); let n = 0; while (G.mode !== 'melee' && n++ < 900) I.step(0.033);
        G.noRender = false; const m = I.info(); G.noRender = true; res.push((k % 5) + ':' + m.geo + '/' + count() + '/' + m.tex);
      }
      return res;
    });
    console.log('stage:uploaded/inScene/tex  ' + out.join(' '));
  },
  // offline-render each cue to WAV so it can be inspected as a spectrogram: node test/run.mjs audio
  async audio() {
    const cues = {
      swing: [2.0, `E.at(0.1,()=>E.swing(1,-0.3)); E.at(0.7,()=>E.swing(1,0.3)); E.at(1.3,()=>E.swing(1.3,0));`],
      clang: [2.4, `E.at(0.1,()=>E.clang(1,1,-0.5)); E.at(0.9,()=>E.clang(1,1,0.5)); E.at(1.7,()=>E.clang(0.6,1.1,0));`],
      block: [1.8, `E.at(0.1,()=>E.block(1.2,0)); E.at(0.9,()=>E.block(0.9,0.3));`],
      perfect: [2.4, `E.at(0.1,()=>E.perfect(0));`],
      hit: [2.0, `E.at(0.1,()=>E.hit(1,0)); E.at(0.6,()=>E.hit(1,0)); E.at(1.1,()=>E.hit(1,0));`],
      hurt: [2.2, `E.at(0.1,()=>E.hurt());`],
      glint: [1.6, `E.at(0.1,()=>E.glint(false,0.9)); E.at(0.9,()=>E.glint(false,0.6));`],
      heavy: [2.6, `E.at(0.1,()=>E.glint(true,1.2)); E.at(1.3,()=>E.hurt());`],
      gallop: [3.0, `for(let k=0;k<7;k++){ const b=0.1+k*0.42; [0,0.05,0.21,0.26].forEach((o,i)=>E.at(b+o,()=>{E.hoof(0.85,i<2?-0.25:0.25,0); if(i===1)E.jingle(1,0);})); [0.1,0.15,0.31,0.36].forEach((o)=>E.at(b+o,()=>E.hoof(0.7,0.1,0.6))); }`],
      snort: [1.4, `E.at(0.1,()=>E.snort(1,0)); E.at(0.8,()=>E.snort(0.5,0.4));`],
      gong: [4.5, `E.at(0.1,()=>E.gong());`],
      horn: [3.0, `E.at(0.1,()=>E.horn(1,1)); E.at(1.6,()=>E.horn(1,0.7));`],
      cheer: [3.5, `E.at(0.2,()=>E.cheer(2.6,0.3));`],
      super: [5.0, `E.at(0.1,()=>E.superStart()); for(let k=0;k<16;k++) E.at(0.75+k*0.14,()=>{ if(k%2)E.hit(0.85,0); else E.clang(0.55,1.1,0); E.swing(0.6,0); }); E.at(3.3,()=>E.finisher(true));`],
      brk: [2.2, `E.at(0.1,()=>E.breakSfx());`],
      wipe: [3.0, `E.at(0.1,()=>E.wipe());`],
      win: [5.0, `E.at(0.1,()=>E.fanfare(true));`],
      lose: [5.0, `E.at(0.1,()=>E.fanfare(false));`],
      ui: [1.0, `E.at(0.1,()=>E.ui()); E.at(0.5,()=>E.heartbeat());`],
      m_title: [14.6, `E.setMode('title'); E.pump(0.1,14.5,'title',0);`],
      m_duel: [8.0, `E.pump(0.1,7.9,'duel',0);`],
      m_hot: [8.0, `E.pump(0.1,7.9,'duel',1);`],
      m_charge: [3.2, `E.at(0,()=>E.setWind(0.3)); E.at(1,()=>E.setWind(1)); E.pump(0.1,3.0,'charge',0);`],
      mix: [12.0, `E.at(0,()=>E.setWind(0.4)); E.at(1.2,()=>E.setWind(1)); E.pump(0.05,2.9,'charge',0);
        for(let k=0;k<7;k++){ const b=0.1+k*0.42; [0,0.05,0.21,0.26].forEach((o,i)=>E.at(b+o,()=>E.hoof(0.85,i<2?-0.25:0.25,0))); }
        E.at(1.9,()=>E.glint(false,1.1)); E.at(2.9,()=>E.swing(1.3,-0.5)); E.at(3.0,()=>{E.setWind(0); E.perfect(-0.4); E.cheer(2,0.22);});
        E.pump(3.3,11.9,'duel',0.3);
        E.at(3.6,()=>{E.swing(1,0.3);}); E.at(3.68,()=>E.hit(1,0)); E.at(3.9,()=>E.swing(1,-0.3)); E.at(3.98,()=>E.hit(1,0)); E.at(4.2,()=>E.swing(1,0)); E.at(4.28,()=>E.hit(1,0));
        E.at(5.2,()=>E.glint(false,0.75)); E.at(5.85,()=>E.swing(1.3,0.5)); E.at(5.95,()=>E.clang(1,1,0.5));
        E.at(6.5,()=>E.glint(false,0.6)); E.at(7.0,()=>E.swing(1.3,-0.5)); E.at(7.1,()=>E.block(1.2,-0.5));
        E.at(7.8,()=>E.glint(true,1.1)); E.at(8.8,()=>E.swing(1.3,0)); E.at(8.9,()=>E.hurt());
        E.at(10.0,()=>{E.swing(1,0.3);}); E.at(10.08,()=>E.block(0.9,0)); E.at(10.4,()=>E.swing(1,-0.3)); E.at(10.48,()=>E.block(0.9,0)); E.at(10.8,()=>E.swing(1,0)); E.at(10.88,()=>E.hit(1,0));`],
    };
    const only = process.argv[5] ? process.argv[5].split(',') : Object.keys(cues);
    for (const name of only) {
      const [dur, code] = cues[name];
      const b64 = await ev(async ({ dur, code }) => {
        const sr = 44100, oc = new OfflineAudioContext(2, Math.ceil(sr * dur), sr);
        const E = window.__ilgito.makeAudio(oc); await E.load();
        new Function('E', code)(E);
        const buf = await oc.startRendering();
        const L = buf.getChannelData(0), R = buf.getChannelData(1), n = L.length, out = new DataView(new ArrayBuffer(44 + n * 4));
        const w = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
        w(0, 'RIFF'); out.setUint32(4, 36 + n * 4, true); w(8, 'WAVEfmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 2, true);
        out.setUint32(24, sr, true); out.setUint32(28, sr * 4, true); out.setUint16(32, 4, true); out.setUint16(34, 16, true); w(36, 'data'); out.setUint32(40, n * 4, true);
        let clip = 0;
        for (let i = 0; i < n; i++) { const l = Math.max(-1, Math.min(1, L[i])), r = Math.max(-1, Math.min(1, R[i])); if (Math.abs(L[i]) > 0.999) clip++; out.setInt16(44 + i * 4, l * 32767, true); out.setInt16(46 + i * 4, r * 32767, true); }
        const u8 = new Uint8Array(out.buffer); let bin = ''; for (let i = 0; i < u8.length; i += 8192) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 8192));
        return JSON.stringify({ clip, errs: E.errs(), b64: btoa(bin) });
      }, { dur, code });
      const r = JSON.parse(b64);
      fs.writeFileSync(`audio/render/${name}.wav`, Buffer.from(r.b64, 'base64'));
      if (r.clip || r.errs.length) console.log(name, 'clip', r.clip, 'errs', r.errs);
    }
    console.log('rendered', only.length);
  },
  async intro() {
    await p.click('#btnGo'); await wait(1300); await shot('intro_' + W); console.log(await st());
  },
  // the intro as a strip of frames: node test/run.mjs introseq W H [stage] [hero]
  async introseq() {
    const stage = +(process.argv[5] || 0), hero = +(process.argv[6] || 0);
    await ev(({ stage, hero }) => { const I = window.__ilgito; I.G.hero = I.HEROES[hero]; I.Save.d.cleared = stage; I.Save.d.tut = true; I.Game.toTitle(); }, { stage, hero });
    await p.click('#btnGo'); await wait(150);
    await ev(() => { window.__ilgito.G.manual = true; });
    for (let i = 0; i < 12; i++) { await ev(() => window.__ilgito.step(0.0167, 13)); await wait(60); await shot('introseq_' + String(i).padStart(2, '0')); }
  },
  async charge() {
    await p.click('#btnGo'); await wait(600);
    await ev(() => { window.__ilgito.Game.tap(); });
    await wait(400); await ev(() => window.__ilgito.Game.tap());
    for (let i = 0; i < 4; i++) { await wait(700); await shot('charge' + i + '_' + W); console.log(await st()); }
  },
  async melee() {
    const stage = +(process.argv[5] || 0), hero = +(process.argv[6] || 0), tag = process.argv[5] ? '_s' + stage : '';
    if (process.argv[5]) await ev(({ stage, hero }) => { const I = window.__ilgito; I.G.hero = I.HEROES[hero]; I.Save.d.cleared = stage; I.Save.d.tut = true; I.Game.toTitle(); }, { stage, hero });
    await p.click('#btnGo'); await wait(700);
    await ev(() => { const I = window.__ilgito; I.G.tut.on = false; I.Game.tap(); });
    await p.waitForFunction('window.__ilgito.G.mode === "melee"', null, { timeout: 60000 }).catch(() => errs.push('no melee'));
    for (let i = 0; i < 6; i++) { await wait(900); await shot('melee' + i + '_' + W + tag); console.log(await st()); }
  },
  async auto() {
    const stage = +(process.argv[5] || 0), hero = +(process.argv[6] || 0);
    await ev(({ stage, hero }) => { const I = window.__ilgito; I.G.hero = I.HEROES[hero]; I.Save.d.cleared = stage; I.Save.d.tut = true; I.Game.toTitle(); }, { stage, hero });
    await p.click('#btnGo'); await wait(300);
    await ev(() => { const I = window.__ilgito; I.G.tut.on = false; I.G.auto = true; });
    const t0 = Date.now(); let lastMode = '', k = 0;
    while (Date.now() - t0 < 200000) {
      await wait(1200); const s = await st();
      if (s.mode !== lastMode) { console.log(JSON.stringify(s)); lastMode = s.mode; await shot(`auto_${stage}_${hero}_${k++}_${s.mode}`); }
      if (s.mode === 'result') break;
    }
    console.log('final', JSON.stringify(await st()), JSON.stringify(await ev(() => window.__ilgito.G.stats)), JSON.stringify(await ev(() => window.__ilgito.Snd.errs())));
  },
};
try { await S[scenario](); } catch (e) { errs.push('SCENARIO ' + e.message); }
console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no errors');
await b.close();
