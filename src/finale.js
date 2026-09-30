/* ============================================================
   finale.js — the last scene (desktop only)
   1. every window squares up into an even grid, slightly overlapping
   2. a cursor closes one window, and two pop-ups open in its place
   3. it closes another, three more open
   4. the last close floods the whole screen
   Every step undoes itself when the reader scrolls back up.
   ============================================================ */
(function () {
  'use strict';

  const Eco = window.Eco;
  const mon = document.getElementById('mon-screen');
  if (!Eco || !mon) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  const OVERLAP = 0.1;                       // how far each window reaches into its neighbours
  const POP_NAMES = ['mirror', 'reupload', 'backup', 'proxy', 'repost', 'fork', 'copy', 'relay'];

  let cells = [];                            // grid cells, in the same order as the windows
  let wins = [];
  const saved = new Map();                   // window → its inline geometry before the finale
  const undoStack = [];                      // one entry per finished stage
  let timers = [];
  let cursor = null;
  let zTop = 70;
  let popCount = 0;

  const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); return id; };
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

  /* ── geometry ─────────────────────────────────────────── */
  function area() {
    const reserve = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--notes-reserve')) || 0;
    const rail = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--rail')) || 0;
    const pad = 14;
    return { x: pad + rail, y: pad, w: mon.clientWidth - pad * 2 - reserve - rail, h: mon.clientHeight - pad * 2 };
  }

  // the flood also covers the strip behind the Notes window
  function fullArea() {
    const a = area();
    return { x: 14, y: a.y, w: mon.clientWidth - 28, h: a.h };
  }

  function layout(n) {
    const a = area();
    let best = null;
    for (let cols = 2; cols <= 6; cols++) {
      const rows = Math.ceil(n / cols);
      const ratio = (a.w / cols) / (a.h / rows);
      const score = Math.abs(ratio - 1.35);            // cells a little wider than tall
      if (!best || score < best.score) best = { cols, rows, score };
    }
    const cw = a.w / best.cols, ch = a.h / best.rows;
    const out = [];
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / best.cols), col = i % best.cols;
      const inRow = row === best.rows - 1 ? n - row * best.cols : best.cols;
      const shift = (best.cols - inRow) * cw / 2;      // centre a short last row
      out.push({ x: a.x + col * cw + shift, y: a.y + row * ch, w: cw, h: ch });
    }
    return out;
  }

  const boxOf = (cell) => ({
    left: cell.x - cell.w * OVERLAP / 2, top: cell.y - cell.h * OVERLAP / 2,
    width: cell.w * (1 + OVERLAP), height: cell.h * (1 + OVERLAP),
  });

  function setBox(el, b) {
    el.style.left = Math.round(b.left) + 'px';
    el.style.top = Math.round(b.top) + 'px';
    el.style.width = Math.round(b.width) + 'px';
    el.style.height = Math.round(b.height) + 'px';
  }

  /* ── pop-up windows (abstract: a title bar and a hatched body) ── */
  function makePop(box, name) {
    const w = document.createElement('div');
    w.className = 'mac-window fin-pop';
    w.setAttribute('aria-hidden', 'true');
    w.innerHTML = `
      <div class="win-titlebar">
        <div class="win-traffic"><span class="wtl wtl-r"></span><span class="wtl wtl-y"></span><span class="wtl wtl-g"></span></div>
        <div class="win-title">${name}</div>
        <div class="win-url">${name}-${++popCount}.example</div>
      </div>
      <div class="win-content fin-pop-body">
        <span class="fp-line short"></span><span class="fp-line"></span><span class="fp-line"></span><span class="fp-line med"></span>
        <span class="fp-block"></span>
      </div>`;
    setBox(w, box);
    w.style.zIndex = ++zTop;
    mon.appendChild(w);
    requestAnimationFrame(() => requestAnimationFrame(() => w.classList.add('fin-in')));
    return w;
  }

  /* ── the cursor ───────────────────────────────────────── */
  function ensureCursor() {
    if (cursor) return cursor;
    cursor = document.createElement('div');
    cursor.className = 'fin-cursor';
    cursor.setAttribute('aria-hidden', 'true');
    cursor.innerHTML = '<svg viewBox="0 0 24 24" width="30" height="30"><path d="M3 2 L3 19 L8 14.5 L11.2 21.5 L14 20.2 L10.8 13.3 L17.5 13 Z" fill="#fff" stroke="#2b1d7a" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    mon.appendChild(cursor);
    return cursor;
  }

  function cursorTo(target, done) {
    const c = ensureCursor();
    const mr = mon.getBoundingClientRect();
    const tr = target.getBoundingClientRect();
    const x = tr.left - mr.left + tr.width / 2 - 6;
    const y = tr.top - mr.top + tr.height / 2 - 4;
    const fromX = parseFloat(c.dataset.x || (mon.clientWidth * 0.62));
    const fromY = parseFloat(c.dataset.y || (mon.clientHeight + 30));
    c.classList.add('show');
    if (reduced.matches) {
      c.style.transform = `translate(${x}px, ${y}px)`;
      c.dataset.x = x; c.dataset.y = y;
      done();
      return;
    }
    const anim = c.animate([
      { transform: `translate(${fromX}px, ${fromY}px)` },
      { transform: `translate(${(fromX + x) / 2 + 30}px, ${(fromY + y) / 2 - 40}px)`, offset: 0.6 },
      { transform: `translate(${x}px, ${y}px)` },
    ], { duration: 850, easing: 'cubic-bezier(0.45, 0, 0.2, 1)', fill: 'forwards' });
    c.dataset.x = x; c.dataset.y = y;
    anim.onfinish = () => { c.style.transform = `translate(${x}px, ${y}px)`; anim.cancel(); done(); };
  }

  function hideCursor() {
    if (!cursor) return;
    cursor.classList.remove('show');
    cursor.getAnimations().forEach(a => a.cancel());
    delete cursor.dataset.x; delete cursor.dataset.y;
  }

  /* Move to a window's close square, press it, and close the window */
  function closeWindow(win, then) {
    const btn = win.querySelector('.wtl-r');
    if (!btn) { then(); return; }
    cursorTo(btn, () => {
      btn.classList.add('fin-press');
      later(() => {
        win.classList.add('fin-closing');
        later(() => { win.classList.add('fin-gone'); then(); }, reduced.matches ? 0 : 330);
      }, reduced.matches ? 0 : 180);
    });
  }

  /* ── the windows leaving and the map arriving are driven by scroll position ── */
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const clearStep = document.querySelector('.step[data-fin="clear"]');
  let clearTicking = false;

  function resetClear() {
    mon.querySelectorAll('.fin-vanish').forEach(w => w.classList.remove('fin-vanish'));
    const card = mon.querySelector('.fin-final');
    if (card) card.classList.remove('fin-out');
    if (Eco.graph) Eco.graph.setProgress(0);
  }

  function applyClear(p) {
    const wins = Array.from(mon.querySelectorAll('.mac-window:not(.fin-gone)'))
      .sort((a, b) => (parseInt(b.style.zIndex, 10) || 0) - (parseInt(a.style.zIndex, 10) || 0));   // topmost leave first
    const hide = Math.floor(clamp01(p / 0.6) * wins.length + 0.0001);
    wins.forEach((w, i) => w.classList.toggle('fin-vanish', i < hide));
    const card = mon.querySelector('.fin-final');
    if (card) card.classList.toggle('fin-out', p > 0.04);
    if (Eco.graph) Eco.graph.setProgress(clamp01((p - 0.4) / 0.6));
    if (p > 0) hideCursor();
  }

  function driveClear() {
    clearTicking = false;
    if (!clearStep) return;
    if (done < ORDER.length) return;                         // nothing to clear until the flood has run
    const r = clearStep.getBoundingClientRect();
    applyClear(clamp01((window.innerHeight * 0.5 - r.top) / Math.max(1, r.height)));
  }
  window.addEventListener('scroll', () => {
    if (clearTicking) return;
    clearTicking = true;
    requestAnimationFrame(driveClear);
  }, { passive: true });

  /* ── stages ───────────────────────────────────────────── */
  function assemble() {
    wins = Eco.windows.all();
    cells = layout(wins.length);
    mon.classList.add('finale-mode');
    wins.forEach((w, i) => {
      saved.set(w, { left: w.style.left, top: w.style.top, width: w.style.width, height: w.style.height, zIndex: w.style.zIndex });
      w.style.setProperty('--i', reduced.matches ? 0 : i);
      w.style.zIndex = 10 + i;
      setBox(w, boxOf(cells[i]));
    });
    undoStack.push(() => {
      hideCursor();
      resetClear();
      wins.forEach((w) => {
        const s = saved.get(w);
        if (!s) return;
        Object.assign(w.style, s);
        w.style.removeProperty('--i');
      });
      saved.clear();
      mon.classList.remove('finale-mode');
    });
  }

  function closeAndPop(index, popsWanted) {
    const win = wins[index];
    if (!win) return;
    const record = { closed: win, pops: [] };
    closeWindow(win, () => {
      const cell = cells[index];
      for (let k = 0; k < popsWanted; k++) {
        later(() => {
          // the first one lands where the window was; the others spill onto the neighbours
          const shift = [[0, 0], [0.55, 0.35], [-0.5, 0.4], [0.3, -0.45]][k % 4];
          const b = boxOf(cell);
          const scale = 0.86;
          const w = b.width * scale, h = b.height * scale;
          record.pops.push(makePop({
            left: b.left + (b.width - w) / 2 + shift[0] * cell.w * 0.45,
            top: b.top + (b.height - h) / 2 + shift[1] * cell.h * 0.45,
            width: w, height: h,
          }, POP_NAMES[popCount % POP_NAMES.length]));
        }, reduced.matches ? 0 : 160 * k);
      }
    });
    undoStack.push(() => {
      clearTimers();
      hideCursor();
      record.pops.forEach(p => p.remove());
      win.classList.remove('fin-closing', 'fin-gone');
      win.querySelector('.wtl-r')?.classList.remove('fin-press');
    });
  }

  /* The last close: pop-ups pour in until nothing else is visible */
  function flood() {
    const target = wins[6] || wins[wins.length - 1];        // the search window
    const record = { closed: target, pops: [], card: null };
    closeWindow(target, () => {
      const a = fullArea();
      const sizeW = Math.max(200, a.w / 5), sizeH = Math.max(150, a.h / 4.2);
      const cols = Math.ceil(a.w / (sizeW * 0.62)) + 1, rows = Math.ceil(a.h / (sizeH * 0.62)) + 1;
      const order = [];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) order.push([r, c]);
      // spread out from the middle, so it fills like a spill
      const cx = (cols - 1) / 2, cy = (rows - 1) / 2;
      order.sort((p, q) => Math.hypot(p[1] - cx, p[0] - cy) - Math.hypot(q[1] - cx, q[0] - cy));
      order.forEach(([r, c], i) => {
        const delay = reduced.matches ? 0 : Math.round(i * 34 * (1 - i / (order.length * 1.6)));
        later(() => {
          const jitter = ((r * 7 + c * 13) % 5) - 2;
          record.pops.push(makePop({
            left: a.x + c * sizeW * 0.62 - sizeW * 0.2 + jitter * 3,
            top: a.y + r * sizeH * 0.62 - sizeH * 0.2 + jitter * 2,
            width: sizeW, height: sizeH,
          }, POP_NAMES[i % POP_NAMES.length]));
        }, delay);
      });
      const total = reduced.matches ? 0 : Math.round(order.length * 34 * 0.75) + 500;
      later(() => {
        const card = document.createElement('div');
        card.className = 'fin-final';
        card.innerHTML = '<div class="fin-final-title">Closing one window does not close the system.</div>';
        mon.appendChild(card);
        requestAnimationFrame(() => requestAnimationFrame(() => card.classList.add('fin-in')));
        record.card = card;
      }, total);
    });
    undoStack.push(() => {
      clearTimers();
      hideCursor();
      resetClear();
      record.pops.forEach(p => p.remove());
      if (record.card) record.card.remove();
      target.classList.remove('fin-closing', 'fin-gone');
      target.querySelector('.wtl-r')?.classList.remove('fin-press');
    });
  }

  /* ── the two entry points the scroll system calls ─────── */
  const ORDER = ['assemble', 'close1', 'close2', 'flood'];
  let done = 0;                                             // how many stages are applied

  Eco.finale = {
    step(name) {
      let idx = ORDER.indexOf(name);
      if (name === 'clear' || name === 'graph') idx = ORDER.length - 1;   // scroll-driven; needs the flood first
      if (idx < 0) return;
      while (done <= idx) {                                 // catch up if steps were skipped
        const stage = ORDER[done];
        if (stage === 'assemble') assemble();
        else if (stage === 'close1') closeAndPop(4, 2);     // the forum
        else if (stage === 'close2') closeAndPop(7, 3);     // the store
        else if (stage === 'flood') flood();
        done += 1;
      }
    },
    undo(name) {
      const idx = ORDER.indexOf(name);
      if (idx < 0) return;
      while (done > idx) {
        const revert = undoStack.pop();
        if (revert) revert();
        done -= 1;
      }
    },
  };

  window.addEventListener('resize', () => {
    if (!done || done > 1) return;                          // only re-tile while nothing has been closed yet
    cells = layout(wins.length);
    wins.forEach((w, i) => setBox(w, boxOf(cells[i])));
  });
})();
