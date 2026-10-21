/* ============================================================
   finale.js — the last scene (desktop only)
   1. every window squares up into an even grid, slightly overlapping
   2. a cursor closes one window, and two pop-ups open in its place
   3. it closes another, three more open
   4. the last close floods the whole screen
   Every stage can be restored when the reader navigates backward.
   ============================================================ */
(function () {
  'use strict';

  const Eco = window.Eco;
  const { setTimeout, clearTimeout, requestAnimationFrame } =
    window.createStoryMotionScope(() => Eco.replaying);
  const mon = document.getElementById('mon-screen');
  if (!Eco || !mon) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  const OVERLAP = 0.1;                       // how far each window reaches into its neighbours
  const POP_NAMES = ['mirror', 'reupload', 'backup', 'proxy', 'repost', 'fork', 'copy', 'relay'];

  /* The grid always shows the same authored scene, whether the reader played every step or jumped here. */
  const initialHTML = new Map([...document.querySelectorAll('.scene[id]')].map((scene) => [scene.id, scene.innerHTML]));
  function applyCanon() {
    document.querySelectorAll('.mac-window .win-content > .scene[id]').forEach((scene) => {
      const html = initialHTML.get(scene.id);
      if (html == null || scene.classList.contains('fin-live')) return;
      const canon = scene.cloneNode(false);
      canon.removeAttribute('id');
      canon.innerHTML = html;
      canon.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
      canon.classList.add('fin-canon');
      canon.inert = true;
      const query = canon.querySelector('.google-search-input');
      if (query) query.textContent = 'undress AI app free';
      canon.querySelector('.google-chrome')?.classList.add('results-ready');
      canon.querySelector('.google-cursor')?.setAttribute('hidden', '');
      if (scene.id === 'dm') canon.querySelectorAll('.dm-step').forEach(message => message.classList.add('visible'));
      if (scene.id === 'reddit') canon.querySelectorAll('.rc-step').forEach((el) => el.classList.add('visible'));
      if (scene.id === 'devplat') {
        const rows = canon.querySelector('.dp-rows');
        if (rows) rows.appendChild(Eco.sceneBuilders.developerRows());
        rows?.querySelectorAll('.dp-row').forEach(row => row.classList.add('in'));
      }
      if (scene.id === 'cloud') canon.querySelector('.cloud-alert')?.classList.add('visible');
      if (scene.id === 'models') {
        canon.querySelectorAll('.md-panel').forEach(panel => panel.classList.add('run'));
        const copies = canon.querySelector('.md-copies');
        if (copies) copies.appendChild(Eco.sceneBuilders.modelCopies(8));
        copies?.querySelectorAll('.md-copy').forEach(copy => copy.classList.add('in'));
        const reqs = canon.querySelector('.md-reqs');
        if (reqs) {
          ['input', 'output'].forEach(direction => {
            [34, 46, 64].forEach((position, index) => {
              const req = document.createElement('span');
              req.className = 'md-req ' + direction + ' ok';
              req.style.setProperty('--lane-offset', '0px');
              req.style.left = position + '%';
              if (direction === 'input' && index === 1) req.style.background = 'var(--notification-red)';
              reqs.appendChild(req);
            });
          });
        }
      }
      if (scene.id === 'interface') {
        const body = canon.querySelector('.chat-body');
        if (body) body.appendChild(Eco.sceneBuilders.assistantTranscript());
      }
      scene.classList.add('fin-live');
      scene.after(canon);
    });
  }
  function clearCanon() {
    document.querySelectorAll('.scene.fin-canon').forEach((node) => node.remove());
    document.querySelectorAll('.scene.fin-live').forEach((scene) => scene.classList.remove('fin-live'));
  }

  let cells = [];                            // grid cells, in the same order as the windows
  let wins = [];
  const saved = new Map();                   // window → its inline geometry before the finale
  const undoStack = [];                      // one entry per finished stage
  let timers = [];
  let cursor = null;
  let zTop = 70;
  let popCount = 0;
  let floodCovered = false;

  const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); return id; };
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

  /* ── geometry ─────────────────────────────────────────── */
  function area() {
    const reserve = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--notes-reserve')) || 0;
    const pad = 14;
    const dock = 66;                                   // the dock stays on screen, so the grid stops above it
    return { x: pad, y: pad, w: mon.clientWidth - pad * 2 - reserve, h: mon.clientHeight - pad * 2 - dock };
  }

  // the flood also covers the strip behind the Notes window
  function fullArea() {
    const a = area();
    return { x: 14, y: a.y, w: mon.clientWidth - 28, h: mon.clientHeight - 28 };
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
    popCount += 1;
    const w = document.createElement('div');
    w.className = 'mac-window fin-pop';
    w.setAttribute('aria-hidden', 'true');
    w.innerHTML = `
      <div class="win-titlebar">
        <div class="win-traffic"><span class="wtl wtl-r"></span><span class="wtl wtl-y"></span><span class="wtl wtl-g"></span></div>
        <div class="win-title">${name}</div>
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
    cursor.innerHTML = '<i class="fas fa-arrow-pointer" aria-hidden="true"></i>';
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
    if ((Eco.replaying || reduced.matches)) {
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

  // the story uses the same cursor outside the finale (the click on the model picker)
  Eco.cursor = { to: cursorTo, hide: hideCursor };

  /* Move to a window's close square, press it, and close the window */
  function closeWindow(win, then) {
    const btn = win.querySelector('.wtl-r');
    if (!btn) { then(); return; }
    cursorTo(btn, () => {
      btn.classList.add('fin-press');
      later(() => {
        win.classList.add('fin-closing');
        later(() => { win.classList.add('fin-gone'); then(); }, (Eco.replaying || reduced.matches) ? 0 : 330);
      }, (Eco.replaying || reduced.matches) ? 0 : 180);
    });
  }

  /* ── the windows leaving and the map arriving are controlled by the active narrative step ── */
  const clamp01 = (v) => Math.max(0, Math.min(1, v));

  let clearCache = null, lastHide = -1;
  function resetClear() {
    mon.querySelectorAll('.fin-vanish').forEach(w => w.classList.remove('fin-vanish'));
    const card = mon.querySelector('.fin-final');
    if (card) card.classList.remove('fin-out');
    if (Eco.graph) Eco.graph.setProgress(0);
    clearCache = null; lastHide = -1;
  }

  /* the windows to clear, topmost first. Worked out once, then only the ones that change are touched on each scroll frame */
  function clearList() {
    const n = mon.children.length;
    if (!clearCache || clearCache.n !== n) {
      clearCache = { n, wins: Array.from(mon.querySelectorAll('.mac-window:not(.fin-gone)'))
        .sort((a, b) => (parseInt(b.style.zIndex, 10) || 0) - (parseInt(a.style.zIndex, 10) || 0)) };   // topmost leave first
      lastHide = -1;
    }
    return clearCache.wins;
  }

  function applyClear(p) {
    const wins = clearList();
    const hide = Math.floor(clamp01(p / 0.6) * wins.length + 0.0001);
    if (hide !== lastHide) {
      const from = lastHide < 0 ? 0 : Math.min(hide, lastHide);
      const to = lastHide < 0 ? wins.length : Math.max(hide, lastHide);
      for (let i = from; i < to; i++) wins[i].classList.toggle('fin-vanish', i < hide);
      lastHide = hide;
    }
    const card = mon.querySelector('.fin-final');
    if (card) card.classList.toggle('fin-out', p > 0.04);
    if (Eco.graph) Eco.graph.setProgress(clamp01((p - 0.4) / 0.6));
    if (p > 0) hideCursor();
  }

  function driveClear() {
    const state = Eco.navigation?.active?.dataset.fin;
    applyClear(state === 'clear' || state === 'graph' || Eco.policy?.STEPS.includes(state) || state === 'end' ? 1 : 0);
  }

  /* ── stages ───────────────────────────────────────────── */
  /* Moving many heavy windows by changing their size every frame is what made this choppy. Instead each window
     jumps to its final box at once and is animated there from where it was with a transform (FLIP), which the
     browser can do without re-laying-out the windows' contents. */
  function flipWindows(list, change, ms) {
    const first = list.map((w) => w.getBoundingClientRect());
    change();
    if ((Eco.replaying || reduced.matches)) return;
    list.forEach((w, i) => {
      const f = first[i], l = w.getBoundingClientRect();
      if (!l.width || !l.height) return;
      const dx = f.left - l.left, dy = f.top - l.top, sx = f.width / l.width, sy = f.height / l.height;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(sx - 1) < 0.01 && Math.abs(sy - 1) < 0.01) return;
      w.animate([
        { transformOrigin: '0 0', transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
        { transformOrigin: '0 0', transform: 'none' },
      ], { duration: ms, delay: i * 55, easing: 'cubic-bezier(0.2, 0.85, 0.2, 1)', fill: 'backwards' });
    });
  }

  function assemble() {
    popCount = 0;
    if (Eco.auxHide) Eco.auxHide();                     // the small pop-up windows belong to their own scenes, not to the grid
    wins = Eco.windows.all();
    cells = layout(wins.length);
    flipWindows(wins, () => {
      mon.classList.add('finale-mode');
      applyCanon();
      wins.forEach((w, i) => {
        saved.set(w, { left: w.style.left, top: w.style.top, width: w.style.width, height: w.style.height, zIndex: w.style.zIndex });
        w.style.zIndex = 10 + i;
        setBox(w, boxOf(cells[i]));
      });
      mon.querySelectorAll('.fin-canon .chat-body, .fin-canon .dm-messages').forEach(transcript => {
        transcript.scrollTop = transcript.scrollHeight;
      });
    }, 850);
    undoStack.push(() => {
      hideCursor();
      resetClear();
      flipWindows(wins, () => {
        clearCanon();
        wins.forEach((w) => {
          const s = saved.get(w);
          if (!s) return;
          Object.assign(w.style, s);
        });
        saved.clear();
        mon.classList.remove('finale-mode');
      }, 650);
    });
  }

  const indexOf = (chapter) => Math.max(0, wins.findIndex((w) => w.dataset.chapter === chapter));

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
        }, (Eco.replaying || reduced.matches) ? 0 : 160 * k);
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
    floodCovered = false;
    const target = wins[indexOf('search')] || wins[wins.length - 1];      // the search window
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
        const delay = (Eco.replaying || reduced.matches) ? 0 : Math.round(i * 34 * (1 - i / (order.length * 1.6)));
        later(() => {
          const jitter = ((r * 7 + c * 13) % 5) - 2;
          record.pops.push(makePop({
            left: a.x + c * sizeW * 0.62 - sizeW * 0.2 + jitter * 3,
            top: a.y + r * sizeH * 0.62 - sizeH * 0.2 + jitter * 2,
            width: sizeW, height: sizeH,
          }, POP_NAMES[i % POP_NAMES.length]));
        }, delay);
      });
      const total = (Eco.replaying || reduced.matches) ? 0 : Math.round(order.length * 34 * 0.75) + 500;
      later(() => {
        floodCovered = true;
        Eco.fadeNote?.();
        const card = document.createElement('div');
        card.className = 'fin-final';
        card.innerHTML = '<div class="fin-final-title">Closing one window does not close the system.<br>Structural problems need structural solutions.</div>';
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
      floodCovered = false;
      if (record.card) record.card.remove();
      target.classList.remove('fin-closing', 'fin-gone');
      target.querySelector('.wtl-r')?.classList.remove('fin-press');
    });
  }

  /* ── the two entry points the scroll system calls ─────── */
  const ORDER = ['assemble', 'close1', 'close2', 'flood'];
  let done = 0;                                             // how many stages are applied

  Eco.finale = {
    get covered() { return floodCovered; },
    step(name) {
      if (Eco.policy && Eco.policy.STEPS.includes(name)) {    // the last part: laws on the map (needs the map first)
        this.step('graph');
        driveClear();                                           // the map must be on screen, even after a jump straight here
        Eco.policy.step(name);
        return;
      }
      let idx = ORDER.indexOf(name);
      if (name === 'clear' || name === 'graph') idx = ORDER.length - 1;   // scroll-driven; needs the flood first
      if (idx < 0) return;
      while (done <= idx) {                                 // catch up if steps were skipped
        const stage = ORDER[done];
        if (stage === 'assemble') assemble();
        else if (stage === 'close1') closeAndPop(indexOf('reddit'), 2);     // the forum
        else if (stage === 'close2') closeAndPop(indexOf('appstore'), 3);   // the store
        else if (stage === 'flood') flood();
        done += 1;
      }
      if (name === 'clear' || name === 'graph') driveClear();   // after a jump straight here, the map must be drawn for the current scroll position
    },
    undo(name) {
      if (Eco.policy && Eco.policy.STEPS.includes(name)) { Eco.policy.undo(name); return; }
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
