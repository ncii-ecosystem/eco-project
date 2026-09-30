/* ============================================================
   windows.js — every story window can be moved and resized (desktop only)
   - drag a title bar to move; drag any edge or corner to resize
   - click a window to bring it to the front
   - double-click a title bar to put the window back where the story placed it
   The story keeps working: when it moves on, it takes the stacking order back.
   ============================================================ */
(function () {
  'use strict';

  const mon = document.getElementById('mon-screen');
  if (!mon) return;

  const MIN_W = 280, MIN_H = 190;
  const DIRS = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
  let raiseZ = 100;
  let interaction = null;

  const windows = () => Array.from(mon.querySelectorAll('.mac-window:not(.fin-pop)'));

  /* bring a window to the front and make it look like a live window again (.dimmed is kept: it is what keeps it visible) */
  function raise(win) {
    win.classList.add('raised');                     // looks live, but the story's own state classes stay untouched
    win.style.zIndex = String(++raiseZ);
    if (raiseZ > 280) {                              // keep the numbers small: re-rank everything
      windows().sort((a, b) => (+a.style.zIndex || 0) - (+b.style.zIndex || 0))
        .forEach((w, i) => { if (w.style.zIndex) w.style.zIndex = String(100 + i); });
      raiseZ = 100 + windows().length;
    }
  }

  /* freeze the current on-screen box as plain pixels, so nothing recalculates it afterwards */
  function freeze(win) {
    const mr = mon.getBoundingClientRect();
    const r = win.getBoundingClientRect();
    Object.assign(win.style, {
      left: (r.left - mr.left) + 'px', top: (r.top - mr.top) + 'px',
      width: r.width + 'px', height: r.height + 'px',
    });
  }

  function begin(win, mode, e) {
    if (e.button !== 0 || mon.classList.contains('finale-mode')) return;
    raise(win);
    freeze(win);
    const r = win.getBoundingClientRect();
    const mr = mon.getBoundingClientRect();
    interaction = {
      win, mode, id: e.pointerId, sx: e.clientX, sy: e.clientY,
      left: r.left - mr.left, top: r.top - mr.top, width: r.width, height: r.height,
    };
    win.classList.add('win-dragging');
    document.body.classList.add('win-busy');
    e.preventDefault();
  }

  function move(e) {
    if (!interaction || e.pointerId !== interaction.id) return;
    const { win, mode, sx, sy, left, top, width, height } = interaction;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    const W = mon.clientWidth, H = mon.clientHeight;

    if (mode === 'move') {
      const l = Math.min(Math.max(left + dx, 120 - width), W - 120);
      const t = Math.min(Math.max(top + dy, 0), H - 44);
      win.style.left = Math.round(l) + 'px';
      win.style.top = Math.round(t) + 'px';
      return;
    }
    // resize: each edge that the handle names moves, the opposite edge stays put
    let l = left, t = top, w = width, h = height;
    if (mode.includes('e')) w = Math.min(Math.max(width + dx, MIN_W), W - left);
    if (mode.includes('s')) h = Math.min(Math.max(height + dy, MIN_H), H - top);
    if (mode.includes('w')) {
      const right = left + width;
      l = Math.min(Math.max(left + dx, 0), right - MIN_W);
      w = right - l;
    }
    if (mode.includes('n')) {
      const bottom = top + height;
      t = Math.min(Math.max(top + dy, 0), bottom - MIN_H);
      h = bottom - t;
    }
    Object.assign(win.style, { left: Math.round(l) + 'px', top: Math.round(t) + 'px', width: Math.round(w) + 'px', height: Math.round(h) + 'px' });
  }

  function end(e) {
    if (!interaction || (e && e.pointerId !== interaction.id)) return;
    interaction.win.classList.remove('win-dragging');
    document.body.classList.remove('win-busy');
    interaction = null;
  }

  function setUp(win) {
    if (win.dataset.movable) return;
    win.dataset.movable = '1';
    // where the story put it, so a double-click can return it there
    win.dataset.home = JSON.stringify({ left: win.style.left, top: win.style.top, width: win.style.width, height: win.style.height });

    const bar = win.querySelector('.win-titlebar');
    if (bar) {
      bar.title = 'Drag to move · double-click to put it back';
      bar.addEventListener('pointerdown', (e) => {
        if (e.target.closest('.wtl')) return;
        bar.setPointerCapture(e.pointerId);
        begin(win, 'move', e);
      });
      bar.addEventListener('pointermove', move);
      bar.addEventListener('pointerup', end);
      bar.addEventListener('pointercancel', end);
      bar.addEventListener('dblclick', (e) => {
        if (e.target.closest('.wtl')) return;
        const home = JSON.parse(win.dataset.home);
        raise(win);
        Object.assign(win.style, home);
      });
    }

    DIRS.forEach((dir) => {
      const h = document.createElement('span');
      h.className = 'win-rz win-rz-' + dir;
      h.setAttribute('aria-hidden', 'true');
      h.addEventListener('pointerdown', (e) => { h.setPointerCapture(e.pointerId); begin(win, dir, e); });
      h.addEventListener('pointermove', move);
      h.addEventListener('pointerup', end);
      h.addEventListener('pointercancel', end);
      win.appendChild(h);
    });

    // any click inside brings it forward
    win.addEventListener('pointerdown', () => { if (!interaction && !mon.classList.contains('finale-mode')) raise(win); });

    // when the story makes a window the live one, the story's stacking order takes over again
    new MutationObserver(() => {
      if (win.classList.contains('active') && !mon.classList.contains('finale-mode')) {
        windows().forEach((w) => {
          w.style.zIndex = '';
          if (w.classList.contains('raised')) w.classList.remove('raised');   // only when present: remove() on its own rewrites the attribute and re-fires this observer
        });
      }
    }).observe(win, { attributes: true, attributeFilter: ['class'] });
  }

  new MutationObserver((records) => {
    records.forEach((r) => r.addedNodes.forEach((n) => {
      if (n.nodeType === 1 && n.classList.contains('mac-window') && !n.classList.contains('fin-pop')) setUp(n);
    }));
  }).observe(mon, { childList: true });
  windows().forEach(setUp);
})();
