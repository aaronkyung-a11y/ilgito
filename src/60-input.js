// ───────────────────────── input: swipe = slash/parry, hold = guard ─────────────────────────
const Input = (() => {
  const el = $('app');
  let h = { swipe() {}, guard() {}, tap() {} };
  let active = null; // the one pointer we follow
  const HOLD_MS = 105;
  let holdTimer = 0;
  const keys = {};
  function thresh() { return clamp(Math.min(window.innerWidth, window.innerHeight) * 0.06, 20, 34); }
  function isUi(t) { return !!(t && t.closest && t.closest('button, a, .screen')); }
  function armHold(ms) {
    clearTimeout(holdTimer);
    holdTimer = setTimeout(() => { if (active && !active.guard) { active.guard = true; h.guard(true); } }, ms);
  }
  function down(e) {
    if (active || isUi(e.target)) return;
    if (e.cancelable) e.preventDefault();
    active = { id: e.pointerId, ax: e.clientX, ay: e.clientY, sx: e.clientX, sy: e.clientY, lx: 0, ly: 0, fired: false, guard: false };
    try { el.setPointerCapture(e.pointerId); } catch (err) {}
    armHold(HOLD_MS);
    h.tap(e.clientX, e.clientY);
  }
  function move(e) {
    const a = active; if (!a || e.pointerId !== a.id) return;
    if (e.cancelable) e.preventDefault();
    const x = e.clientX, y = e.clientY, th = thresh();
    if (Math.hypot(x - a.sx, y - a.sy) > 10) { a.sx = x; a.sy = y; if (!a.guard) armHold(HOLD_MS + 60); }
    const dx = x - a.ax, dy = y - a.ay, dist = Math.hypot(dx, dy);
    if (a.fired) {
      // while the finger keeps going the same way the anchor trails it; a turn or reversal fires a new swipe
      const along = dx * a.lx + dy * a.ly;
      if (along > 0 && along >= dist * 0.5) { a.ax = x; a.ay = y; return; }
    }
    if (dist >= th) {
      const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'R' : 'L') : (dy > 0 ? 'D' : 'U');
      if (a.guard) { a.guard = false; h.guard(false); }
      a.fired = true; a.lx = dx / dist; a.ly = dy / dist;
      h.swipe(dir, a.ax - dx * 1.6, a.ay - dy * 1.6, a.ax + dx * 3.2, a.ay + dy * 3.2);
      a.ax = x; a.ay = y;
    }
  }
  function up(e) {
    const a = active; if (!a || e.pointerId !== a.id) return;
    clearTimeout(holdTimer);
    if (a.guard) h.guard(false);
    active = null;
  }
  el.addEventListener('pointerdown', down, { passive: false });
  el.addEventListener('pointermove', move, { passive: false });
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  el.addEventListener('contextmenu', (e) => e.preventDefault());
  el.addEventListener('touchmove', (e) => { if (e.cancelable) e.preventDefault(); }, { passive: false });
  el.addEventListener('gesturestart', (e) => e.preventDefault());
  const KEYDIR = { ArrowLeft: 'L', ArrowRight: 'R', ArrowUp: 'U', ArrowDown: 'D', a: 'L', d: 'R', w: 'U', s: 'D', A: 'L', D: 'R', W: 'U', S: 'D' };
  window.addEventListener('keydown', (e) => {
    const d = KEYDIR[e.key];
    if (e.repeat) { if (d || e.key === ' ') e.preventDefault(); return; }
    if (d) {
      e.preventDefault();
      const cx = window.innerWidth / 2, cy = window.innerHeight * 0.45, L = Math.min(window.innerWidth, window.innerHeight) * 0.42;
      const v = { L: [-1, 0], R: [1, 0], U: [0, -1], D: [0, 1] }[d];
      h.swipe(d, cx - v[0] * L, cy - v[1] * L, cx + v[0] * L, cy + v[1] * L);
    } else if (e.key === ' ') { e.preventDefault(); if (!keys.sp) { keys.sp = true; h.guard(true); } h.tap(); }
    else if (e.key === 'Enter' || e.key === 'f' || e.key === 'F') { if (h.special) h.special(); }
    else if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') { if (h.pause) h.pause(); }
  });
  window.addEventListener('keyup', (e) => { if (e.key === ' ' && keys.sp) { keys.sp = false; h.guard(false); } });
  return {
    bind(o) { h = Object.assign(h, o); },
    cancel() { clearTimeout(holdTimer); if (active && active.guard) h.guard(false); active = null; },
  };
})();
