// ───────────────────────── audio v2: recorded percussion & metal + noise foley + reverb ─────────────────────────
// No oscillators. Every pitched or struck sound is a real recording (see 05-samples.js); air, dirt and crowd are filtered noise.
function makeAudio(ctx) {
  const A = {}, bufs = {}, sr = ctx.sampleRate, errLog = [];
  let shift = 0, ready = false;
  const now = () => ctx.currentTime + shift;

  // ── master chain: everything → muffle filter → compressor → soft clip → out
  const out = ctx.createGain(); out.gain.value = 0.85;
  const sat = ctx.createWaveShaper();
  { const n = 2048, c = new Float32Array(n), k = 1.4, nk = Math.tanh(k); for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.tanh(k * x) / nk; } sat.curve = c; sat.oversample = '2x'; }
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -12; comp.knee.value = 6; comp.ratio.value = 3; comp.attack.value = 0.006; comp.release.value = 0.18;
  const rumble = ctx.createBiquadFilter(); rumble.type = 'highpass'; rumble.frequency.value = 42; rumble.Q.value = 0.7; // sub-bass no phone can play only eats headroom
  rumble.connect(comp); comp.connect(sat); sat.connect(out); out.connect(ctx.destination);
  const sfx = ctx.createGain(); sfx.connect(rumble);
  // the bed (music + ambience + reverb) goes dull for a moment when the player is struck
  const muf = ctx.createBiquadFilter(); muf.type = 'lowpass'; muf.frequency.value = 20000; muf.Q.value = 0.5; muf.connect(rumble);
  const duck = ctx.createGain(); duck.connect(muf);
  // music EQ: trim the boom that small speakers lose anyway, lift the stick attack
  const musLo = ctx.createBiquadFilter(); musLo.type = 'lowshelf'; musLo.frequency.value = 140; musLo.gain.value = -5;
  const musHi = ctx.createBiquadFilter(); musHi.type = 'peaking'; musHi.frequency.value = 3000; musHi.Q.value = 0.7; musHi.gain.value = 4;
  const mus = ctx.createGain(); mus.gain.value = 0.56; mus.connect(musLo); musLo.connect(musHi); musHi.connect(duck);
  const amb = ctx.createGain(); amb.connect(duck);

  // ── reverb: an open plain with a wall somewhere behind the armies (diffuse tail + one slap)
  const revSend = ctx.createGain(), conv = ctx.createConvolver(), revOut = ctx.createGain();
  {
    const len = Math.floor(sr * 1.9), b = ctx.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch); let lp = 0, e = 0;
      for (let i = 0; i < len; i++) {
        const t = i / sr, env = t < 0.012 ? 0 : Math.exp(-(t - 0.012) / 0.36);
        lp += (0.75 * Math.exp(-t / 0.5) + 0.07) * (Math.random() * 2 - 1 - lp);
        d[i] = lp * env;
      }
      const taps = [[0.021, 0.5], [0.034, -0.4], [0.052, 0.34], [0.079, -0.27], [0.118, 0.2], [0.214 + ch * 0.011, 0.3], [0.43 + ch * 0.017, 0.1]];
      for (let k = 0; k < taps.length; k++) { const i0 = Math.floor(taps[k][0] * sr); for (let j = 0; j < 36; j++) d[i0 + j] += taps[k][1] * 0.2 * (1 - j / 36) * (j % 2 ? -0.6 : 1); }
      for (let i = 0; i < len; i++) e += d[i] * d[i];
      const nrm = 0.5 / Math.sqrt(e); for (let i = 0; i < len; i++) d[i] *= nrm;
    }
    conv.normalize = false; conv.buffer = b;
  }
  revSend.connect(conv); conv.connect(revOut); revOut.connect(muf);

  // ── noise beds
  const white = ctx.createBuffer(1, sr * 2, sr), pink = ctx.createBuffer(1, sr * 2, sr);
  {
    const w = white.getChannelData(0), p = pink.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < w.length; i++) {
      const x = Math.random() * 2 - 1; w[i] = x;
      b0 = 0.99886 * b0 + x * 0.0555179; b1 = 0.99332 * b1 + x * 0.0750759; b2 = 0.969 * b2 + x * 0.153852;
      b3 = 0.8665 * b3 + x * 0.3104856; b4 = 0.55 * b4 + x * 0.5329522; b5 = -0.7616 * b5 - x * 0.016898;
      p[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + x * 0.5362) * 0.11; b6 = x * 0.115926;
    }
  }
  function tail(node, o) { // pan + route + reverb send
    if (o.pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = clamp(o.pan, -1, 1); node.connect(p); node = p; }
    node.connect(o.dest || sfx);
    if (o.send) { const s = ctx.createGain(); s.gain.value = o.send; node.connect(s); s.connect(revSend); }
  }
  // filtered-noise burst
  function nz(o) {
    const t = o.t === undefined ? now() : o.t, a = o.a || 0.004, dur = o.dur;
    const s = ctx.createBufferSource(); s.buffer = o.pink ? pink : white; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = o.type || 'bandpass'; f.Q.value = o.q || 1;
    f.frequency.setValueAtTime(o.f0, t); if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(o.gain, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); tail(g, o);
    s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
  }
  // recorded sample
  function play(name, o) {
    const s = bufs[name]; if (!s) return null;
    o = o || {};
    const t = o.t === undefined ? now() : o.t, rate = o.rate || 1, gain = o.gain === undefined ? 1 : o.gain;
    const src = ctx.createBufferSource(); src.buffer = s.b; src.playbackRate.value = rate;
    let node = src;
    if (o.lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; f.Q.value = 0.6; node.connect(f); node = f; }
    if (o.hp) { const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = o.hp; f.Q.value = 0.6; node.connect(f); node = f; }
    const g = ctx.createGain(); g.gain.setValueAtTime(gain, t);
    if (o.fin) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + o.fin); }
    node.connect(g);
    if (o.loop) { src.loop = true; src.loopStart = s.off; src.loopEnd = s.off + s.len; }
    src.start(t, s.off + (o.offset || 0));
    if (o.dur) {
      const fd = o.fade || 0.03;
      g.gain.setValueAtTime(gain, t + Math.max(o.fin || 0, o.dur - fd)); g.gain.linearRampToValueAtTime(0.0001, t + o.dur);
      src.stop(t + o.dur + 0.02);
    }
    tail(g, o);
    return { src, g };
  }
  function duckBy(to, rec) { const t = now(); duck.gain.cancelScheduledValues(t); duck.gain.setValueAtTime(to, t); duck.gain.linearRampToValueAtTime(1, t + rec); }
  function muffle(hz, rec) { const t = now(); muf.frequency.cancelScheduledValues(t); muf.frequency.setValueAtTime(hz, t); muf.frequency.exponentialRampToValueAtTime(20000, t + rec); }

  // ── continuous beds: wind in the ears, the armies, the rumble of a charge
  const wind = ctx.createBufferSource(); wind.buffer = pink; wind.loop = true;
  const windF = ctx.createBiquadFilter(); windF.type = 'bandpass'; windF.frequency.value = 420; windF.Q.value = 0.45;
  const windG = ctx.createGain(); windG.gain.value = 0;
  wind.connect(windF); windF.connect(windG); windG.connect(amb); wind.start();
  const crowd = ctx.createBufferSource(); crowd.buffer = pink; crowd.loop = true; crowd.playbackRate.value = 0.8;
  const crowdG = ctx.createGain(); crowdG.gain.value = 0;
  const forms = [[520, 2.4, 1], [1150, 3, 0.7], [2450, 3.5, 0.2]].map((q) => {
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = q[0]; f.Q.value = q[1];
    const g = ctx.createGain(); g.gain.value = q[2]; crowd.connect(f); f.connect(g); g.connect(crowdG); return f;
  });
  // slow surging of the crowd: low-passed noise wobbling the gain
  const surge = ctx.createBufferSource(); surge.buffer = white; surge.loop = true; surge.playbackRate.value = 0.5;
  const surgeF = ctx.createBiquadFilter(); surgeF.type = 'lowpass'; surgeF.frequency.value = 3;
  const surgeG = ctx.createGain(); surgeG.gain.value = 0;
  surge.connect(surgeF); surgeF.connect(surgeG); surgeG.connect(crowdG.gain);
  const crowdS = ctx.createGain(); crowdS.gain.value = 0.5; crowdG.connect(amb); crowdG.connect(crowdS); crowdS.connect(revSend);
  crowd.start(); surge.start();
  const CROWD_BASE = 0.014;
  let rollNode = null, droneNode = null;

  // ── load
  A.load = function () {
    const names = Object.keys(SAMPLE_B64);
    const jobs = names.map((nm) => new Promise((res) => {
      try {
        const bin = atob(SAMPLE_B64[nm]), u8 = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
        ctx.decodeAudioData(u8.buffer, (b) => {
          // skip the decoder's leading padding so hits land on time
          const d = b.getChannelData(0); let i0 = 0;
          while (i0 < d.length && Math.abs(d[i0]) < 0.004) i0++;
          const off = Math.max(0, i0 / b.sampleRate - 0.0006);
          bufs[nm] = { b, off, len: SAMPLE_LEN[nm] || b.duration - off };
          res();
        }, () => { errLog.push('decode ' + nm); res(); });
      } catch (e) { errLog.push('decode ' + nm + ' ' + e.message); res(); }
    }));
    return Promise.all(jobs).then(() => { ready = true; crowdG.gain.value = CROWD_BASE; surgeG.gain.value = 0.03; });
  };

  // ── sfx
  A.swing = (p = 1, pan = 0) => {
    const t = now();
    nz({ t, dur: 0.19, gain: 1.0 * p, f0: 170, f1: 1500, q: 0.8, a: 0.06, pink: true, pan, send: 0.2 });
    nz({ t: t + 0.02, dur: 0.13, gain: 0.3 * p, f0: 900, f1: 2800, q: 1.2, a: 0.05, pan });
    play('scrape', { t: t + 0.02, gain: 0.05 * p, rate: rnd(1.3, 1.6), dur: 0.16, fade: 0.1, pan, hp: 2000 });
  };
  A.clang = (p = 1, bright = 1, pan = 0) => {
    const t = now();
    play(pick(['anv1', 'anv2']), { t, gain: 0.85 * p, rate: rnd(0.6, 0.85) * bright, pan, send: 0.3 });
    play(pick(['brk1', 'brk2']), { t, gain: 0.85 * p, rate: rnd(0.95, 1.3) * bright, pan, send: 0.25 });
    play('crack', { t, gain: 0.3 * p, rate: rnd(0.9, 1.1), pan });
    play('tomH', { t, gain: 0.25 * p, rate: rnd(1.1, 1.3), lp: 900, pan });
    play('scrape', { t: t + 0.01, gain: 0.24 * p, rate: rnd(0.9, 1.2), dur: 0.4, fade: 0.25, pan, send: 0.3 });
  };
  A.block = (p = 1, pan = 0) => {
    const t = now();
    play('anv3', { t, gain: 0.7 * p, rate: rnd(0.8, 1.0), pan, send: 0.15 });
    play('brk1', { t, gain: 0.35 * p, rate: rnd(0.7, 0.85), pan });
    play('thud2', { t, gain: 0.5 * p, rate: rnd(0.9, 1.2), pan });
  };
  A.perfect = (pan = 0) => {
    const t = now();
    play('anv1', { t, gain: 1.0, rate: 0.8, pan, send: 0.5 }); play('anv2', { t, gain: 0.85, rate: 1.05, pan, send: 0.5 });
    play('brk1', { t, gain: 0.8, rate: 1.25, pan, send: 0.4 });
    play('bell', { t, gain: 0.45, rate: 1.0, pan, send: 0.5 });
    play('scrape', { t: t + 0.01, gain: 0.4, rate: 1.0, pan, send: 0.5 });
    play('boom', { t, gain: 0.75, rate: 1.05, send: 0.3 }); play('crack', { t, gain: 0.45 });
    play('crash', { t: t + 0.01, gain: 0.2, rate: 1.1, send: 0.4 });
    duckBy(0.5, 0.4);
  };
  A.hit = (p = 1, pan = 0) => {
    const t = now();
    play('cajon', { t, gain: 1.0 * p, rate: rnd(0.85, 1.05), pan }); play('thud2', { t, gain: 0.8 * p, rate: rnd(0.8, 1), pan });
    play('crack', { t, gain: 0.5 * p, rate: rnd(0.8, 1), pan }); play('anv3', { t, gain: 0.3 * p, rate: rnd(1.2, 1.5), pan, send: 0.2 });
    nz({ t, dur: 0.08, gain: 0.4 * p, f0: 1600, q: 0.6, pan });
  };
  A.hurt = () => {
    const t = now();
    play('boom', { t, gain: 0.8, rate: 0.9, send: 0.2 }); play('cajon', { t, gain: 1.0, rate: 0.8 }); play('thud2', { t, gain: 0.8, rate: 0.8 });
    play('crack', { t, gain: 0.6, rate: 0.75 }); play('sub', { t, gain: 0.3 }); play('anv3', { t, gain: 0.45, rate: 0.75, send: 0.2 });
    nz({ t, dur: 0.13, gain: 0.5, f0: 900, q: 0.6, pink: true });
    muffle(500, 0.8); duckBy(0.3, 0.7);
  };
  // wind = seconds until the blow lands; a heavy blow gets a real cymbal swell timed to crest on impact
  A.glint = (heavy, wind) => {
    const t = now();
    if (heavy) {
      const w = Math.max(0.5, wind || 1);
      play('swell', { t, gain: 0.55, rate: clamp(1.05 / w, 0.6, 1.9), send: 0.3 });
      play('roll', { t, gain: 0.18, dur: w, fade: 0.1, lp: 900, fin: 0.15 });
      play('bell', { t, gain: 0.3, rate: 0.7, dur: 0.6, fade: 0.4, send: 0.4 });
    } else {
      play('bell', { t, gain: 0.42, rate: rnd(1.3, 1.5), dur: 0.42, fade: 0.28, send: 0.4 });
      play('anv2', { t, gain: 0.16, rate: rnd(1.3, 1.5), dur: 0.3, fade: 0.2, send: 0.3 });
    }
  };
  A.hoof = (v = 1, pan = 0, far = 0) => {
    const t = now();
    play(pick(['log', 'thud', 'thud2']), { t, gain: 0.55 * v * (1 - far * 0.6), rate: rnd(0.75, 1.0), lp: 2600 - far * 1500, pan, send: 0.1 + far * 0.4 });
    nz({ t, dur: 0.05, gain: 0.06 * v * (1 - far), f0: 2600, q: 0.6, pan });
  };
  A.jingle = (v = 1, pan = 0) => { play('jingle', { gain: 0.09 * v, rate: rnd(0.9, 1.2), pan }); };
  A.snort = (v = 1, pan = 0) => { // a horse blowing: breath noise with a lip flutter
    const t = now(), dur = 0.42;
    const s = ctx.createBufferSource(); s.buffer = pink; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 0.9;
    f.frequency.setValueAtTime(950, t); f.frequency.exponentialRampToValueAtTime(520, t + dur);
    const g = ctx.createGain(), n = 11;
    g.gain.setValueAtTime(0.0001, t);
    for (let i = 0; i < n; i++) { const tt = t + 0.03 + (i * (dur - 0.05)) / n, a = 0.55 * v * (1 - i / n) + 0.05; g.gain.linearRampToValueAtTime(a, tt); g.gain.linearRampToValueAtTime(a * 0.25, tt + 0.016); }
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); tail(g, { pan, send: 0.2 });
    s.start(t, Math.random()); s.stop(t + dur + 0.05);
  };
  A.gong = () => { const t = now(); play('gonglow', { t, gain: 0.9, send: 0.5 }); play('boom', { t, gain: 0.7, rate: 0.9, send: 0.4 }); };
  A.horn = (v = 1, rate = 1) => { play('horn', { gain: 0.36 * v, rate, send: 0.6 }); };
  A.cheer = (dur = 1.6, v = 0.2) => {
    const t = now(), top = Math.min(0.5, v * 1.5);
    crowdG.gain.cancelScheduledValues(t); crowdG.gain.setValueAtTime(Math.max(0.001, crowdG.gain.value), t);
    crowdG.gain.linearRampToValueAtTime(top, t + 0.3); crowdG.gain.linearRampToValueAtTime(top * 0.7, t + dur * 0.6); crowdG.gain.linearRampToValueAtTime(CROWD_BASE, t + dur);
    forms.forEach((f, i) => { const b = [520, 1150, 2450][i]; f.frequency.cancelScheduledValues(t); f.frequency.setValueAtTime(b, t); f.frequency.linearRampToValueAtTime(b * 1.3, t + 0.35); f.frequency.linearRampToValueAtTime(b, t + dur); });
    // the armies beat their drums and shields
    const n = 4 + ((v * 14) | 0);
    for (let i = 0; i < n; i++) play(pick(['tomL', 'tomH', 'frame', 'thud']), { t: t + 0.06 + i * rnd(0.08, 0.15), gain: 0.5 * v + 0.05, rate: rnd(0.8, 1.15), send: 0.9, lp: 2600, pan: rnd(-0.8, 0.8) });
  };
  A.setWind = (v) => {
    const t = now();
    windG.gain.setTargetAtTime(v * 0.3, t, 0.1); windF.frequency.setTargetAtTime(380 + v * 700, t, 0.12);
    // the ground-shaking rumble of the charge: a looped timpani roll
    if (v > 0.05 && !rollNode && bufs.roll) rollNode = play('roll', { gain: 0.0001, loop: true, lp: 900, dest: amb });
    if (rollNode) rollNode.g.gain.setTargetAtTime(v * 0.2, t, 0.15);
    if (v <= 0.01 && rollNode) { const r = rollNode; rollNode = null; try { r.src.stop(t + 0.8); } catch (e) {} }
  };
  A.superStart = () => {
    const t = now();
    play('swell', { t, gain: 0.7, rate: 2.0, send: 0.4 });
    play('gong', { t: t + 0.5, gain: 0.8, send: 0.5 }); play('boom', { t: t + 0.5, gain: 1, send: 0.3 }); play('anv1', { t: t + 0.5, gain: 0.6, rate: 0.9, send: 0.5 });
  };
  A.finisher = (kill) => {
    const t = now();
    play('boom', { t, gain: 1.1, rate: 0.9, send: 0.4 }); play('sub', { t, gain: 1 }); play('bigcrash', { t, gain: 0.6, send: 0.5 });
    play('anv2', { t, gain: 0.8, rate: 0.8, send: 0.5 }); play('cajon', { t, gain: 0.9, rate: 0.75 }); play('scrape', { t, gain: 0.35, rate: 0.9, send: 0.5 });
    if (kill) play('gong', { t: t + 0.05, gain: 0.85, send: 0.6 });
    duckBy(0.3, 0.9);
  };
  A.breakSfx = () => {
    const t = now();
    play('crash', { t, gain: 0.5, send: 0.4 }); play('anv3', { t, gain: 0.8, rate: 0.7, send: 0.3 }); play('boom', { t, gain: 0.8, rate: 1.2 });
    play('crack', { t, gain: 0.5 }); play('brk2', { t: t + 0.06, gain: 0.4, rate: 0.6, send: 0.4 });
  };
  A.wipe = () => {
    const t = now();
    nz({ t, dur: 0.6, gain: 0.3, f0: 2800, f1: 300, q: 0.8, a: 0.05, pink: true });
    play('roll', { t, gain: 0.3, dur: 1.0, fade: 0.5, fin: 0.1, lp: 1200 });
    play('horn', { t: t + 0.35, gain: 0.32, rate: 0.75, send: 0.7 }); play('boom', { t: t + 0.36, gain: 0.8, send: 0.5 });
  };
  A.ui = () => { play('wood', { gain: 0.3, rate: rnd(0.95, 1.05) }); };
  A.heartbeat = () => { const t = now(); play('thud', { t, gain: 0.6, rate: 0.7, lp: 520 }); play('thud', { t: t + 0.18, gain: 0.45, rate: 0.64, lp: 480 }); };
  A.fanfare = (win) => {
    const t = now();
    if (win) {
      [0, 0.42, 0.66, 0.86].forEach((d, i) => play('boom', { t: t + d, gain: 0.8 + i * 0.07, rate: 1 - i * 0.02, send: 0.5, dest: mus }));
      play('gong', { t: t + 0.86, gain: 0.7, send: 0.5, dest: mus }); play('gliss', { t: t + 0.95, gain: 0.55, send: 0.5, dest: mus });
      play('horn', { t: t + 0.1, gain: 0.4, rate: 1.0, send: 0.7, dest: mus });
    } else {
      play('gonglow', { t, gain: 0.8, rate: 0.8, send: 0.6, dest: mus }); play('timp', { t: t + 0.05, gain: 0.7, rate: 0.7, send: 0.5, dest: mus });
      play('horn', { t: t + 0.6, gain: 0.35, rate: 0.6, send: 0.8, dest: mus });
    }
  };
  A.hitDrum = (v = 1) => { play('boom', { gain: 0.9 * v, send: 0.4 }); };

  // ── war drums & zither: all recorded hits, sequenced
  const st = { mode: 'none', step: 0, nextT: 0, inten: 0 };
  const NOTE = { Fs2: ['zB2', 0.7492], B2: ['zB2', 1], Cs3: ['zB2', 1.1225], Ds3: ['zB2', 1.2599], Fs3: ['zFs3', 1], Gs3: ['zFs3', 1.1225], B3: ['zCs4', 0.8909], Cs4: ['zCs4', 1], Ds4: ['zCs4', 1.1225], Fs4: ['zCs4', 1.3348] };
  const zither = (t, n, v) => { const q = NOTE[n]; if (q) play(q[0], { t, gain: v, rate: q[1], send: 0.45, dest: mus }); };
  const hitD = (t, nm, v, rate, send) => play(nm, { t, gain: v, rate: rate || 1, send: send === undefined ? 0.35 : send, dest: mus });
  const TITLE = [
    ['Fs3', 0, 'Gs3', 0, 'B3', 0, 0, 0, 'Gs3', 0, 'Fs3', 0, 'Ds3', 0, 0, 0],
    ['B3', 0, 'Cs4', 0, 'Ds4', 0, 'Cs4', 0, 'B3', 0, 'Gs3', 0, 'Fs3', 0, 0, 0],
    ['Ds3', 0, 'Fs3', 0, 'Gs3', 0, 0, 'Fs3', 'Ds3', 0, 'Cs3', 0, 'B2', 0, 0, 0],
    ['Fs3', 0, 0, 'Gs3', 'B3', 0, 'Cs4', 0, 'B3', 0, 0, 0, 'Fs3', 0, 0, 0],
  ];
  const OST = [
    ['B2', 0, 0, 'Fs2', 0, 0, 'B2', 0, 'Cs3', 0, 0, 'B2', 0, 0, 'Fs2', 0],
    ['B2', 0, 0, 'B2', 0, 0, 'Ds3', 0, 'Cs3', 0, 0, 'B2', 0, 'Fs2', 0, 0],
    ['Fs2', 0, 0, 'B2', 0, 0, 'Cs3', 0, 'Ds3', 0, 0, 'Cs3', 0, 0, 'B2', 0],
  ];
  const BOOM = [1, 0, 0, 0, 0, 0, 0, 0, 0.85, 0, 0, 0.55, 0, 0, 0, 0];
  const FRAME = [0, 0, 0, 0.6, 0, 0, 0.7, 0, 0, 0, 0, 0, 0.7, 0, 0.5, 0];
  const TOML = [0, 0, 0, 0, 0.8, 0, 0, 0, 0, 0, 0.6, 0, 0, 0, 0, 0.6];
  const TOMH = [0, 0, 0.45, 0, 0, 0, 0, 0.45, 0, 0.45, 0, 0, 0, 0.45, 0, 0];
  function stepDur() {
    const m = st.mode;
    const bpm = m === 'title' ? 66 : m === 'intro' ? 80 : m === 'charge' ? 158 : m === 'super' ? 168 : 124 + st.inten * 12;
    return 60 / bpm / 4;
  }
  function schedule(s, t) {
    const m = st.mode, i = s % 16, bar = (s / 16) | 0;
    if (m === 'title') {
      if (i === 0) hitD(t, 'boom', 0.55, 0.92, 0.6);
      if (i === 8) hitD(t, 'frame', 0.35, 0.9, 0.6);
      if (i === 14 && bar % 2 === 1) hitD(t, 'frame', 0.22, 1.1, 0.6);
      const ph = TITLE[(bar >> 1) % TITLE.length], n = bar % 2 === 0 ? ph[i] : 0;
      if (bar % 2 === 0 && i === 0) zither(t, 'B2', 0.3);
      if (n) zither(t, n, 0.42);
      if (bar % 8 === 7 && i === 8) play('gliss', { t, gain: 0.3, send: 0.5, dest: mus });
    } else if (m === 'intro') {
      if (i % 8 === 0) hitD(t, 'timp', 0.8, 0.9, 0.5);
      if (i % 8 === 3 || i % 8 === 6) hitD(t, 'frame', 0.3, 1, 0.5);
    } else if (m === 'charge') {
      const v = Math.min(1, 0.35 + s * 0.022);
      if (i % 4 === 0) hitD(t, 'boom', v * 0.85, 1, 0.3);
      hitD(t, i % 2 ? 'tomH' : 'tomL', v * (i % 4 === 0 ? 0.75 : 0.42), i % 2 ? 1 : 0.95, 0.3);
    } else if (m === 'duel') {
      const hot = st.inten > 0.5, fill = bar % 4 === 3 && i >= 12;
      if (BOOM[i]) hitD(t, 'boom', BOOM[i] * 0.9, 1, 0.3);
      if (!fill) {
        if (FRAME[i]) hitD(t, 'frame', FRAME[i] * 0.6, 1, 0.3);
        if (TOML[i]) hitD(t, 'tomL', TOML[i] * 0.65, 0.95, 0.3);
        if (TOMH[i] && (hot || bar % 2 === 1)) hitD(t, 'tomH', TOMH[i] * 0.5, 1.05, 0.3);
      } else hitD(t, i < 14 ? 'tomH' : 'tomL', 0.55 + (i - 12) * 0.08, i < 14 ? 1.05 : 0.95, 0.3);
      if (i % 2 === 0) hitD(t, 'rim', i % 4 === 0 ? 0.3 : 0.2, 1, 0.2);
      else if (hot) hitD(t, 'rim', 0.14, 1.1, 0.2);
      if (hot && i === 0) hitD(t, 'timp', 0.6, 0.9, 0.4);
      const o = OST[(bar >> 1) % OST.length][i];
      if (o && bar % 2 === 1) zither(t, o, 0.3);
    } else if (m === 'super') {
      hitD(t, i % 2 ? 'tomH' : 'tomL', i % 4 === 0 ? 0.8 : 0.5, 1, 0.3);
      if (i % 4 === 0) hitD(t, 'boom', 0.8, 1.05, 0.3);
    }
  }
  function drone(want) {
    const t = now();
    if (want && !droneNode && bufs.drone) droneNode = play('drone', { gain: 0.0001, loop: true, dest: mus, send: 0.3 });
    if (droneNode) {
      droneNode.g.gain.setTargetAtTime(want ? 0.09 : 0.0001, t, 0.4);
      if (!want) { const d = droneNode; droneNode = null; try { d.src.stop(t + 2.5); } catch (e) {} }
    }
  }
  A.setMode = (m) => {
    if (st.mode === m) return;
    st.mode = m; st.step = 0; st.nextT = now() + 0.06;
    drone(m === 'title' || m === 'intro');
  };
  A.update = (inten) => {
    if (!ready) return;
    st.inten = inten || 0;
    const t = now();
    if (st.nextT < t - 0.4) st.nextT = t + 0.05;
    let guard = 0;
    while (st.nextT < t + 0.14 && guard++ < 12) {
      if (st.mode !== 'none') schedule(st.step, st.nextT);
      st.nextT += stepDur(); st.step++;
    }
  };
  // shouts. Voice clips are looked up by prefix: vp* (the hero), ve* (the enemy general), with L for a long cry and D for a death cry.
  A.voice = (who, kind) => {
    const find = (pre, any) => Object.keys(bufs).filter((n) => n.indexOf(pre) === 0 && (any || !/^v.[LD]/.test(n)));
    let names = find('v' + who + (kind === 'die' ? 'D' : kind ? 'L' : ''), kind), slow = 1;
    if (!names.length && kind) { names = find('v' + who, false); slow = 0.9; }        // no long cry on file: a short one, pitched down and louder
    if (!names.length) return;
    play(names[(Math.random() * names.length) | 0], { gain: kind ? 1 : 0.8, rate: slow * (0.97 + Math.random() * 0.06), pan: who === 'e' ? 0 : 0.05, send: 0.22 });
  };
  A.neigh = (v = 1, pan = 0) => { play('neigh', { gain: 0.8 * v, rate: 0.96 + Math.random() * 0.08, pan, send: 0.2 }); };
  // offline rendering helpers (the test harness uses these to "look at" the sound)
  A.at = (t, fn) => { const s = shift; shift = t; try { fn(); } finally { shift = s; } };
  A.pump = (t0, t1, mode, inten) => { st.mode = mode; st.step = 0; st.nextT = t0; st.inten = inten || 0; let g = 0; while (st.nextT < t1 && g++ < 4000) { schedule(st.step, st.nextT); st.nextT += stepDur(); st.step++; } };
  A.play = play;          // the test harness plays single samples through this
  A.errs = () => errLog.slice();
  A.isReady = () => ready;
  A.master = out;
  return A;
}

const Snd = (() => {
  let ctx = null, eng = null, on = true, warmUntil = 0, pendingMode = 'none';
  const errLog = [];
  function init() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try {
      ctx = new AC();
      eng = makeAudio(ctx);
      eng.master.gain.value = on ? 0.85 : 0;
      eng.load().then(() => { try { eng.setMode(pendingMode); } catch (e) { errLog.push('mode ' + e.message); } });
    } catch (e) { errLog.push('init ' + (e && e.message)); ctx = null; eng = null; return false; }
    return true;
  }
  function resume() { if (ctx && ctx.state === 'suspended') { warmUntil = performance.now() + 1200; try { ctx.resume(); } catch (e) {} } }
  function suspend() { if (ctx && ctx.state === 'running') { try { ctx.suspend(); } catch (e) {} } }
  function setOn(v) { on = v; if (eng) eng.master.gain.setTargetAtTime(v ? 0.85 : 0, ctx.currentTime, 0.03); }
  const ok = () => eng && on && eng.isReady() && (ctx.state === 'running' || (ctx.state === 'suspended' && performance.now() < warmUntil));
  const api = { init, resume, suspend, setOn, isOn: () => on, errs: () => errLog.concat(eng ? eng.errs() : []), state: () => (ctx ? ctx.state : 'none'), ready: () => !!(eng && eng.isReady()) };
  ['swing', 'clang', 'block', 'perfect', 'hit', 'hurt', 'glint', 'hoof', 'jingle', 'snort', 'gong', 'horn', 'cheer', 'setWind', 'superStart', 'finisher', 'breakSfx', 'wipe', 'ui', 'heartbeat', 'fanfare', 'hitDrum', 'voice', 'neigh', 'update'].forEach((k) => {
    api[k] = function () { if (!ok()) return; try { eng[k].apply(null, arguments); } catch (e) { if (errLog.length < 20) errLog.push(k + ': ' + (e && e.message)); } };
  });
  api.setMode = (m) => { pendingMode = m; if (eng && eng.isReady()) { try { eng.setMode(m); } catch (e) { if (errLog.length < 20) errLog.push('mode: ' + e.message); } } };
  return api;
})();
