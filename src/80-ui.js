// ───────────────────────── ui: DOM hud, title, result ─────────────────────────
const UI = (() => {
  const hudEl = $('hud');
  const scr = { title: $('scrTitle'), vs: $('scrVs'), result: $('scrResult'), pause: $('scrPause') };
  const foeFill = $('foeHp').querySelector('.fill'), foeLagEl = $('foeHp').querySelector('.lag');
  const postEl = $('foePost'), postFill = postEl.querySelector('.fill');
  const meFill = $('meHp').querySelector('.fill'), meLagEl = $('meHp').querySelector('.lag');
  const stEl = $('meSt'), stFill = stEl.querySelector('.fill');
  const btnSuper = $('btnSuper'), comboEl = $('combo'), comboN = $('comboN'), hintEl = $('hint'), vig = $('vig'), hurtEl = $('hurt');
  let foeLag = 1, meLag = 1, hurtA = 0, hintT = 0, lastKi = -1, lastCombo = 0, comboPop = 0, lastVig = -1, lastHurt = -1;
  const setX = (el, v) => { el.style.transform = 'scaleX(' + v.toFixed(3) + ')'; };
  function show(name) { for (const k in scr) scr[k].classList.toggle('hidden', k !== name); }
  function hud(on) { hudEl.classList.toggle('hidden', !on); }
  function setFoe(s) { $('foeHj').textContent = s.hj; $('foeKr').textContent = s.kr; $('foeTtl').textContent = s.ttl; foeLag = 1; }
  function setHero(h) { $('meHj').textContent = h.hj; meLag = 1; lastKi = -1; }
  function setRound(n) { $('round').textContent = '第' + hjNum(n) + '合'; }
  function hint(text, dur) {
    if (!text) { hintEl.classList.remove('on'); hintT = 0; return; }
    hintEl.textContent = text; hintEl.classList.add('on'); hintT = dur;
  }
  function hurt(v) { hurtA = Math.max(hurtA, v); }
  function frame(rdt) {
    if (hintT > 0 && hintT < 90) { hintT -= rdt; if (hintT <= 0) hintEl.classList.remove('on'); }
    hurtA = Math.max(0, hurtA - rdt * 2.2);
    const hv = Math.round(hurtA * 50);
    if (hv !== lastHurt) { lastHurt = hv; hurtEl.style.opacity = (hv / 50).toFixed(2); }
    const p = G.p, e = G.e;
    if (!p || !e) { if (lastVig !== 0) { lastVig = 0; vig.style.opacity = '0'; } return; }
    const fk = sat(e.hp / e.hpMax); foeLag = Math.max(fk, foeLag - rdt * 0.28);
    setX(foeFill, fk); setX(foeLagEl, foeLag);
    const pk = sat(e.post / 100); setX(postFill, pk); postEl.classList.toggle('hot', pk > 0.7);
    const mk = sat(p.hp / p.hpMax); meLag = Math.max(mk, meLag - rdt * 0.28);
    setX(meFill, mk); setX(meLagEl, meLag);
    setX(stFill, sat(p.st / 100)); stEl.classList.toggle('low', p.st < 28 || G.t < p.guardLock);
    const ki = Math.round(p.ki);
    if (ki !== lastKi) { lastKi = ki; btnSuper.style.setProperty('--ki', ki); btnSuper.classList.toggle('ready', ki >= 100); }
    if (p.combo !== lastCombo) { if (p.combo > lastCombo) comboPop = 1; lastCombo = p.combo; if (p.combo > 0) comboN.textContent = p.combo; }
    comboPop = Math.max(0, comboPop - rdt * 6);
    comboEl.style.opacity = (p.combo >= 2 ? sat(p.comboT / 0.5) : 0).toFixed(2);
    comboEl.style.transform = 'scale(' + (1 + comboPop * 0.35).toFixed(3) + ')';
    const low = sat((0.38 - mk) / 0.38), vv = Math.round(low * (0.65 + 0.35 * Math.sin(G.rt * 6)) * 40);
    if (vv !== lastVig) { lastVig = vv; vig.style.opacity = (vv / 40).toFixed(2); }
  }
  function syncSnd() {
    const on = Snd.isOn();
    $('btnSnd').textContent = on ? '소리 켬' : '소리 끔'; $('btnSnd').setAttribute('aria-pressed', String(on));
    $('pSnd').textContent = on ? '소리 켬' : '소리 끔';
  }
  function toggleSnd() { Snd.init(); Snd.resume(); Snd.setOn(!Snd.isOn()); Save.d.snd = Snd.isOn(); Save.save(); syncSnd(); Snd.ui(); }
  function buildTitle() {
    const wrap = $('heroes'); wrap.innerHTML = '';
    HEROES.forEach((h) => {
      const b = document.createElement('button'); b.className = 'hero'; b.type = 'button';
      b.setAttribute('aria-pressed', String(h === G.hero));
      b.innerHTML = '<span class="hj">' + h.hj + '</span><b>' + h.kr + '</b><span>' + h.wname + '<br>' + h.trait + '</span>';
      b.addEventListener('click', () => {
        G.hero = h; Snd.init(); Snd.resume(); Snd.ui();
        Array.prototype.forEach.call(wrap.children, (c, i) => c.setAttribute('aria-pressed', String(HEROES[i] === h)));
      });
      wrap.appendChild(b);
    });
    const kills = $('kills'); kills.innerHTML = '';
    G.startIdx = Save.d.cleared >= STAGES.length ? 0 : Save.d.cleared;
    STAGES.forEach((s, i) => {
      const b = document.createElement('i'); b.textContent = s.hj[0]; b.title = s.kr;
      if (i < Save.d.cleared) b.className = 'done';
      kills.appendChild(b);
    });
    syncSnd();
  }
  function showVs(stage, idx) {
    $('vsStage').textContent = '第' + hjNum(idx + 1) + '戰 · ' + stage.placeKr + ' ' + stage.place;
    $('vsHj').textContent = stage.hj; $('vsKr').textContent = stage.kr; $('vsTtl').textContent = stage.ttl;
    $('vsQuote').textContent = '“' + stage.quote + '”';
    show('vs');
  }
  function fmtTime(s) { const m = (s / 60) | 0, r = Math.round(s - m * 60); return m + ':' + (r < 10 ? '0' : '') + r; }
  function showResult(win) {
    const s = G.stats, st = G.stage, last = G.stageIdx >= STAGES.length - 1, big = $('rBig');
    hud(false); hint('', 0);
    big.textContent = win ? (last ? '無雙' : '勝') : '敗';
    big.classList.toggle('win', win);
    big.style.fontSize = win && last ? 'clamp(84px,26vw,150px)' : '';
    $('rLine').textContent = win
      ? (last ? '천하무쌍! 다섯 적장을 모두 꺾었다' : '적장 ' + st.kr + josa(st.kr, '을', '를') + ' 쓰러뜨렸다')
      : st.kr + '의 ' + ({ glaive: '대도', spear: '창', halberd: '방천화극', serpent: '사모' }[st.weapon]) + '에 당했다';
    const rows = [['겨룬 합', G.round + '합'], ['걸린 시간', fmtTime(s.time)], ['완벽한 쳐내기', s.perfect + '회'], ['최대 연격', s.maxCombo + '연격'], ['받은 피해', String(Math.round(s.taken))]];
    $('rStats').innerHTML = rows.map((r) => '<dt>' + r[0] + '</dt><dd>' + r[1] + '</dd>').join('');
    const rank = $('rRank');
    if (win) {
      const score = 100 - (s.taken / G.p.hpMax) * 60 - Math.max(0, s.time - 70) * 0.2 + s.perfect * 2.2;
      const r = score >= 96 ? ['神', '신기에 가까운 솜씨'] : score >= 76 ? ['甲', '빼어난 승리'] : score >= 52 ? ['乙', '무난한 승리'] : ['丙', '가까스로 이겼다'];
      rank.innerHTML = '<span class="hj">' + r[0] + '</span><span>' + r[1] + '</span>';
    } else rank.innerHTML = G.retries < 3 ? '<span>다시 맞서면 체력이 15% 늘고, 적의 공격이 조금 더 잘 보인다</span>' : '<span>이미 기세는 오를 만큼 올랐다. 이번에는 벤다</span>';
    const next = $('rNext');
    next.classList.toggle('hidden', !win || last);
    if (win && !last) { const n = STAGES[G.stageIdx + 1]; next.innerHTML = '<b>다음 상대</b><span class="hj">' + n.hj + '</span>'; }
    $('rRetry').textContent = win ? '다시 겨루기' : '재도전';
    $('rRetry').className = win ? 'ghost' : 'go';
    if (!win) $('rRetry').innerHTML = '<b>재도전</b>';
    show('result');
  }
  $('btnGo').addEventListener('click', () => Game.startRun());
  $('btnSnd').addEventListener('click', toggleSnd);
  $('pSnd').addEventListener('click', toggleSnd);
  $('btnPause').addEventListener('click', () => Game.pause(true));
  $('pResume').addEventListener('click', () => Game.pause(false));
  $('pHome').addEventListener('click', () => { Snd.resume(); Game.toTitle(); });
  $('rNext').addEventListener('click', () => { Snd.ui(); Game.next(); });
  $('rRetry').addEventListener('click', () => { Snd.ui(); Game.retry(!!(G.p && G.p.dead)); });
  $('rHome').addEventListener('click', () => { Snd.ui(); Game.toTitle(); });
  scr.vs.addEventListener('pointerdown', () => Game.tap());
  btnSuper.addEventListener('pointerdown', (e) => { e.preventDefault(); Game.special(); });
  return { show, hud, setFoe, setHero, setRound, hint, hurt, frame, buildTitle, showVs, showResult, syncSnd };
})();
