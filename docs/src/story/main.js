/* ============================================================
   The Ecosystem Behind the Image — main.js
   Lofi desk + monitor scroll system
   ============================================================ */
(function () {
  'use strict';

  const Eco = window.Eco;
  const { prefersReducedMotion, scrollBehavior, escapeHtml, onActivate, store } = Eco;

  /* ── DOM refs ─────────────────────────────────────── */
  const monScreen    = document.getElementById('mon-screen');
  const progressFill = document.getElementById('progress-bar-fill');
  const cwOverlay    = document.getElementById('cw-overlay');
  const cwBtn        = document.getElementById('cw-btn');
  const sceneNotif   = document.getElementById('scene-notif');

  /* ── Exit: back to the content warning, with the story reset ── */
  function quickExit() {
    try { document.body.innerHTML = ''; } catch (e) { /* ignore */ }   // the story disappears at once
    window.location.replace(window.location.href);
  }
  document.getElementById('quick-exit')?.addEventListener('click', quickExit);
  let escCount = 0, escTimer = null;
  document.addEventListener('keydown', (e) => {   // Esc three times in a row also exits
    if (e.key !== 'Escape') return;
    escCount += 1;
    clearTimeout(escTimer);
    escTimer = setTimeout(() => { escCount = 0; }, 900);
    if (escCount >= 3) quickExit();
  });

  /* ── Content warning ──────────────────────────────── */
  document.getElementById('cw-resources')?.focus();   // the coloured default choice
  cwBtn.addEventListener('click', () => {
    const navbar = document.querySelector('.site-topnav');
    navbar.classList.remove('is-open');
    navbar.classList.add('is-hidden');
    navbar.inert = true;
    cwOverlay.classList.add('hidden');
    setTimeout(startOpening, 700);
  });

  const { CHAPTERS, NOTIF_CONFIG } = Eco;

  /* ── Scroll gate state ────────────────────────────── */
  // 'cover' pre-unlocked — its gate is the intro notification, not #scene-notif
  const unlockedChapters = new Set(['intro', 'desk1', 'finale']);
  const visitedChapters = new Set();   // apps the reader has opened, for the dock   // the finale has no gate
  let scrollLocked = false;
  let lockedScrollY = 0;
  let pendingChapter = null;
  let snClickHandler = null;

  // Locking only stops the reader from going *forward* past the point they are at.
  // Scrolling back up (or jumping back to an earlier app) always works.
  let touchStartY = 0;
  const atLimit = () => window.scrollY >= lockedScrollY - 1;

  function snapBackIfLocked() {
    if (scrollLocked && window.scrollY > lockedScrollY + 1) {
      window.scrollTo({ top: lockedScrollY, behavior: 'instant' });
    }
  }
  function blockDownWheel(e) { if (e.deltaY > 0 && atLimit()) e.preventDefault(); }
  function noteTouch(e) { touchStartY = e.touches[0].clientY; }
  function blockDownTouch(e) {
    const dy = touchStartY - e.touches[0].clientY;     // finger moving up = page moving down
    if (dy > 0 && atLimit()) e.preventDefault();
  }
  function blockDownKeys(e) {
    if (['Space', 'PageDown', 'ArrowDown', 'End'].includes(e.code) && atLimit()) {
      const tag = (e.target && e.target.tagName) || '';
      if (!/^(INPUT|TEXTAREA|SELECT)$/.test(tag)) e.preventDefault();
    }
  }

  function lockScroll() {
    if (scrollLocked) return;
    scrollLocked = true;
    lockedScrollY = window.scrollY;
    document.documentElement.classList.add('scroll-locked');
    window.addEventListener('scroll', snapBackIfLocked, { passive: true });
    window.addEventListener('wheel', blockDownWheel, { passive: false });
    window.addEventListener('touchstart', noteTouch, { passive: true });
    window.addEventListener('touchmove', blockDownTouch, { passive: false });
    window.addEventListener('keydown', blockDownKeys);
  }

  function unlockScroll() {
    scrollLocked = false;
    document.documentElement.classList.remove('scroll-locked');
    window.removeEventListener('scroll', snapBackIfLocked);
    window.removeEventListener('wheel', blockDownWheel);
    window.removeEventListener('touchstart', noteTouch);
    window.removeEventListener('touchmove', blockDownTouch);
    window.removeEventListener('keydown', blockDownKeys);
  }

  /* ── Scroll holds: while a step's animation plays, scrolling pauses ──
     so nothing can be scrolled past. Gates keep priority over holds. */
  let holdUntil = 0, holdTimer = null, holdOwnsLock = false, navUntil = 0;
  const markNavigating = () => { navUntil = performance.now() + 2200; };   // programmatic jumps (dots, note list) never hold

  function releaseHold() {
    holdUntil = 0;
    if (!holdOwnsLock) return;
    holdOwnsLock = false;
    if (pendingChapter) return;   // a gate took over while we were waiting: leave it locked
    unlockScroll();
    // cue that scrolling is free again; it stays until the reader scrolls
    showHint('Scroll to continue ↓');
    hintBaseY = window.scrollY; scrollHintPending = true;
  }

  function holdFor(ms) {
    if (!ms || prefersReducedMotion() || performance.now() < navUntil) return;
    const end = performance.now() + ms;
    if (end <= holdUntil) return;
    holdUntil = end;
    if (!scrollLocked) { lockScroll(); holdOwnsLock = true; }
    clearTimeout(holdTimer);
    holdTimer = setTimeout(releaseHold, ms);
  }

  // how long each step's animation takes (ms); steps with a note also wait for the note to type out
  const HOLD_MS = {
    news:   { h0: 1500, h1: 1500, h2: 1500, h3: 1500, h4: 1500 },   // the marker sweep, the pop-up and the comments
    chat:   { type: 1300, send: 400, think: 900, respond: 700, dataset: 2500, scan: 2100, return: 3300, model: 2000 },
    md:     { open: 2400, closed: 2400, move: 2200 },
    dm:     { msg0: 800, msg1: 800, msg2: 500, 'annotate-imessage': 1800, switchemail: 600, 'annotate-email': 500 },
    rc:     { 0: 500, 1: 500, 2: 500, 3: 500, 4: 500, ban: 600, mdf: 600, 'annotate-mdf': 700 },
    search: { results: 1200, ads: 2200 },
    as:     { fill: 700, highlight: 600, overlay: 500 },
    pay:    { site: 600, logos: 600, sheet: 800 },
    cloud:  { stats: 1000, alert: 600 },
    fin:    { assemble: 1500, close1: 2200, close2: 2600, flood: 4000 },
  };
  function animMs(el) {                                              // how long the step's own animation runs
    const ds = el.dataset;
    let ms = 0;
    Object.keys(HOLD_MS).forEach((key) => { if (ds[key] !== undefined) ms = Math.max(ms, HOLD_MS[key][ds[key]] || 0); });
    return ms;
  }
  function holdMs(el) {
    let ms = animMs(el);
    if (el.classList.contains('step--k')) {                         // the note comes once the animation is done, then a beat to read it
      const words = (el.querySelector('.step-key-text')?.textContent || '').trim().split(/\s+/).length;
      const read = Math.min(2000, Math.max(900, 500 + words * 80));
      ms = Math.max(ms, Math.min(ms, 2400) + read);
    }
    return ms;
  }

  /* ── Reader hint (bottom-centre caption) ─────────── */
  const hintEl = document.getElementById('reader-hint');
  function showHint(text) {
    if (!hintEl) return;
    hintEl.textContent = text;
    hintEl.classList.add('show');
  }
  function hideHint() { if (hintEl) hintEl.classList.remove('show'); }

  /* ── Reader controls: sound + restart ────────── */
  const rcRestart = document.getElementById('rc-restart');

  const rcSound = document.getElementById('rc-sound');
  function renderSound() {
    if (!rcSound) return;
    rcSound.setAttribute('aria-pressed', String(Eco.sound.on));
    rcSound.textContent = 'Sound: ' + (Eco.sound.on ? 'on' : 'off');
  }
  renderSound();
  if (rcSound) rcSound.addEventListener('click', () => { Eco.sound.set(!Eco.sound.on); renderSound(); });

  if (rcRestart) rcRestart.addEventListener('click', () => {
    if (!window.confirm('Start over from the beginning?')) return;
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    window.location.reload();
  });

  function showSceneNotif(id) {
    const cfg = NOTIF_CONFIG[id];
    if (!cfg || !sceneNotif) return;
    document.getElementById('sn-icon').innerHTML    = cfg.icon;
    document.getElementById('sn-app').textContent   = cfg.app;
    document.getElementById('sn-title').textContent = cfg.title;
    document.getElementById('sn-body').textContent  = cfg.body;
    sceneNotif.setAttribute('aria-label', 'Open ' + cfg.app + ': ' + cfg.title);
    sceneNotif.classList.add('show', 'pulsing');
    Eco.sound.notify();
    // Remove any stale listener before adding a fresh one
    if (snClickHandler) sceneNotif.removeEventListener('click', snClickHandler);
    snClickHandler = () => unlockAndActivate(id);
    sceneNotif.addEventListener('click', snClickHandler, { once: true });
    sceneNotif.addEventListener('keydown', sceneNotifKey);
    sceneNotif.focus({ preventScroll: true });
  }

  function sceneNotifKey(e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sceneNotif.click(); }
  }

  function dismissSceneNotif() {
    if (!sceneNotif) return;
    sceneNotif.classList.remove('show', 'pulsing');
    sceneNotif.removeEventListener('keydown', sceneNotifKey);
    hideHint();
    if (snClickHandler) { sceneNotif.removeEventListener('click', snClickHandler); snClickHandler = null; }
  }

  function unlockAndActivate(id) {
    pendingChapter = null;
    unlockedChapters.add(id);
    dismissSceneNotif();
    unlockScroll();
    activateChapter(id);
  }

  // Lock scroll at page load — intro notification is the first gate
  lockScroll();

  /* ── Window tracking ─────────────────────────────── */
  let windowStack = [];               // chapter ids, most recent first
  const spawnedWindows = new Map();   // chapter id → .mac-window element
  const windowOverlay = document.getElementById('window-overlay');

  /* Per-chapter window geometry — staggered so windows overlap naturally */
  const WIN_POSITIONS = {
    cover:      { top: '24px',  left: '8px',   width: '90%', height: '88%' },
    interface:  { top: '34px',  left: '10%',   width: '84%', height: '84%' },
    models:     { top: '30px',  left: '8%',    width: '80%', height: '82%' },
    devplat:    { top: '46px',  left: '49%',   width: '48%', height: '78%' },
    dm:         { top: '18px',  left: '3%',    width: '42%', height: '84%' },
    'dm-email': { top: '36px',  left: '44%',   width: '52%', height: '80%' },
    reddit:     { top: '52px',  left: '2%',    width: '50%', height: '76%' },
    mdf:        { top: '28px',  left: '46%',   width: '51%', height: '78%' },
    search:     { top: '64px',  left: '4%',    width: '88%', height: '70%' },
    appstore:   { top: '30px',  left: '8%',    width: '86%', height: '82%' },
    payment:    { top: '72px',  left: '20%',   width: '74%', height: '60%' },
    cloud:      { top: '22px',  left: '4px',   width: '93%', height: '86%' },
  };

  /* Windows leave room for the Notes app: percentages are of the width that's
     left after --notes-reserve (set on <html> while Notes is open). */
  const usable = '(100% - var(--notes-reserve, 0px))';
  const fitLeft = (v) => (v.endsWith('%') ? `calc(${usable} * ${parseFloat(v) / 100})` : v);
  const fitWidth = (v) => (v.endsWith('%') ? `calc(${usable} * ${parseFloat(v) / 100})` : v);

  /* Companion windows — spawned alongside their parent chapter */
  const WIN_COMPANIONS = { dm: 'dm-email', reddit: 'mdf', models: 'devplat' };

  // While a gate or an animation holds the page, the reader can still go back but not ahead
  const canJumpTo = (y) => !scrollLocked || y <= lockedScrollY + 2;
  function scrollToChapter(id) {
    const el = document.querySelector(`.scroll-chapter[data-chapter="${id}"]`);
    if (!el || !canJumpTo(el.getBoundingClientRect().top + window.scrollY)) return;
    markNavigating();
    el.scrollIntoView({ behavior: farJump(el.getBoundingClientRect().top) });
  }
  // a long way: go there at once. Gliding through every app on the way would open and close each one, and that is what made it choppy
  const farJump = (deltaY) => (Math.abs(deltaY) > window.innerHeight * 1.5 ? 'instant' : scrollBehavior());

  /* ── Dock: each icon jumps back to (or ahead to) its app ── */
  const dockItems = Array.from(document.querySelectorAll('.dt-dock-item[data-go]'));
  function syncDock() {
    dockItems.forEach((item) => {
      item.classList.toggle('visited', visitedChapters.has(item.dataset.go));
      item.classList.toggle('current', item.dataset.go === activeChapter);
    });
  }
  function useDock(item) {
    const id = item.dataset.go;
    if (item.dataset.href) {
      if (window.parent.SiteRouter) window.parent.SiteRouter.navigate(item.dataset.href);
      else window.location.href = item.dataset.href;
      return;
    }   // the database page (Maja's) lives outside the story
    if (!unlockedChapters.has(id)) {                // not opened yet: nudge instead of skipping ahead
      item.classList.remove('nope'); void item.offsetWidth; item.classList.add('nope');
      showHint('That app opens further down the story');
      setTimeout(() => { if (!scrollLocked && !pendingChapter) hideHint(); }, 2200);
      return;
    }
    hideHint();
    if (item.dataset.step) {
      const target = document.querySelector(item.dataset.step);
      if (target && canJumpTo(target.getBoundingClientRect().top + window.scrollY)) { markNavigating(); target.scrollIntoView({ behavior: farJump(target.getBoundingClientRect().top), block: 'center' }); }
    } else {
      scrollToChapter(id);
    }
  }
  dockItems.forEach((item) => {
    item.tabIndex = 0;
    item.setAttribute('role', 'button');
    item.setAttribute('aria-label', 'Go to ' + item.title);
    onActivate(item, () => useDock(item));
    item.addEventListener('animationend', () => item.classList.remove('nope'));
  });

  /* ── Scene switching ─────────────────────────────── */
  let activeChapter = 'intro';

  const CHAPTER_NUM = { cover: 1, interface: 2, models: 3, devplat: 3, reddit: 4, mdf: 4, search: 5, appstore: 6, payment: 7, cloud: 8, dm: 9, 'dm-email': 9 };
  const CHAPTER_TOTAL = 9;
  function spawnWindow(wid, label, url, sceneId) {
    const pos = WIN_POSITIONS[wid] || { top: '44px', left: '4%', width: '88%', height: '80%' };
    const w = document.createElement('div');
    w.className = 'mac-window';
    w.dataset.chapter = wid;
    w.style.top    = pos.top;
    w.style.left   = fitLeft(pos.left);
    w.style.width  = fitWidth(pos.width);
    w.style.height = pos.height;
    w.innerHTML = `
      <div class="win-titlebar">
        <div class="win-traffic">
          <span class="wtl wtl-r"></span>
          <span class="wtl wtl-y"></span>
          <span class="wtl wtl-g"></span>
        </div>
        <div class="win-title">${escapeHtml(label)}</div>
        <div class="win-url">${escapeHtml(url || '')}</div>
        ${CHAPTER_NUM[wid] ? `<div class="win-chip" title="Chapter ${CHAPTER_NUM[wid]} of ${CHAPTER_TOTAL}">${String(CHAPTER_NUM[wid]).padStart(2, '0')} / ${String(CHAPTER_TOTAL).padStart(2, '0')}</div>` : ''}
      </div>
      <div class="win-content"></div>
    `;
    monScreen.appendChild(w);
    spawnedWindows.set(wid, w);
    const sceneEl = document.getElementById(sceneId);
    if (sceneEl) w.querySelector('.win-content').appendChild(sceneEl);
    return w;
  }

  /* Companion apps (email next to messages, the deepfake site next to the forum)
     open on their own scroll step, after the main app's note. */
  const COMP_META = {
    'dm-email': { label: 'Email',       url: 'mail.example/inbox' },
    mdf:        { label: 'NSFWFakes',    url: 'nsfwfakes.example' },
    devplat:    { label: 'Repos',       url: 'repohub.example/models' },
  };
  function openCompanion(parentId) {
    const companionId = WIN_COMPANIONS[parentId];
    if (!companionId || activeChapter !== parentId) return;
    let win = spawnedWindows.get(companionId);
    if (!win) {
      const meta = COMP_META[companionId];
      win = spawnWindow(companionId, meta.label, meta.url, companionId);
    } else {
      monScreen.appendChild(win);
    }
    requestAnimationFrame(() => requestAnimationFrame(() => {
      win.classList.remove('dimmed', 'buried');
      win.classList.add('active');
    }));
  }


  /* The models window slides left to make room for the developer platform, with an arrow between them */
  Eco.fx = {
    splitModels() {
      const m = spawnedWindows.get('models');
      if (!m || activeChapter !== 'models') return;
      m.style.left = fitLeft('2%');
      m.style.width = fitWidth('45%');
      openCompanion('models');
      setTimeout(() => { if (Eco.arrow) Eco.arrow.draw(); }, 1100);
    },
    unsplitModels() {
      const m = spawnedWindows.get('models');
      const d = spawnedWindows.get('devplat');
      if (Eco.arrow) Eco.arrow.clear();
      if (m) { m.style.left = fitLeft(WIN_POSITIONS.models.left); m.style.width = fitWidth(WIN_POSITIONS.models.width); }
      if (d) { d.classList.remove('active'); d.classList.add('buried'); }
    },
  };

  /* Jump ahead to a chapter the story itself opens (the cursor clicking the model picker) */
  Eco.advanceTo = (id) => {
    unlockedChapters.add(id);
    holdUntil = 0; clearTimeout(holdTimer); holdOwnsLock = false;
    if (pendingChapter === id) { pendingChapter = null; dismissSceneNotif(); }
    if (scrollLocked) unlockScroll();
    scrollToChapter(id);
  };

  /* Used by the finale: make sure every app has a window, in story order */
  const FINALE_ORDER = ['cover', 'interface', 'models', 'devplat', 'reddit', 'mdf', 'search', 'appstore', 'payment', 'cloud', 'dm', 'dm-email'];
  Eco.windows = {
    all() {
      FINALE_ORDER.forEach((wid) => {
        if (spawnedWindows.has(wid)) return;
        const ch = CHAPTERS.find(c => c.id === wid);
        const meta = ch ? { label: ch.label, url: ch.url, scene: ch.scene } : { ...COMP_META[wid], scene: wid };
        spawnWindow(wid, meta.label, meta.url, meta.scene);
      });
      return FINALE_ORDER.map(wid => spawnedWindows.get(wid)).filter(Boolean);
    },
  };

  function activateChapter(id) {
    if (activeChapter === id) return;
    activeChapter = id;

    const ch = CHAPTERS.find(c => c.id === id);
    if (!ch) return;

    visitedChapters.add(id);
    syncDock();
    // the empty desktop (the opening and the beat before search): the windows step aside; every pop-up note window goes away
    const wasDesk = monScreen.classList.contains('desk-mode'), nowDesk = id === 'intro';           // only the opening hides the windows
    if (wasDesk && !nowDesk) {                                  // the windows that were behind simply come back; only the new one animates
      spawnedWindows.forEach((w) => { w.classList.add('no-anim'); setTimeout(() => w.classList.remove('no-anim'), 120); });
    }
    monScreen.classList.toggle('desk-mode', nowDesk);
    monScreen.classList.toggle('flood-gone', id !== 'intro');           // the opening's flood of headlines is part of the desktop: it goes when the apps take over
    if (Eco.auxHide) Eco.auxHide();
    if (id === 'desk1') {
      // the empty-desktop beat: every window is still there, all of them dimmed
      spawnedWindows.forEach((w) => { w.classList.remove('active', 'buried'); w.classList.add('dimmed'); });
      if (windowOverlay) windowOverlay.classList.remove('active');
      setTimeout(() => syncNoteToChapter(id), 850);
      return;
    }

    if (Eco.arrow) Eco.arrow.visible(id === 'models');

    if (id !== 'finale') {                                               // coming back from the finale: windows back in place, pop-ups gone, law layer off
      if (Eco.finale) Eco.finale.undo('assemble');
      if (Eco.policy) Eco.policy.reset();
    }

    if (id === 'finale') {   // no window of its own: finale.js rearranges the ones that exist
      if (windowOverlay) windowOverlay.classList.remove('active');
      return;
    }

    if (id === 'intro') {
      if (windowOverlay) windowOverlay.classList.remove('active');
      return;
    }

    const companionId = WIN_COMPANIONS[id];

    // Dim all other windows in place (opacity only, no repositioning)
    spawnedWindows.forEach((win, winId) => {
      const isActive = winId === id || winId === companionId;
      if (!isActive) {
        win.classList.remove('active');
        win.classList.add('dimmed');
      }
    });

    setTimeout(() => syncNoteToChapter(id), 850);        // once the scroll has settled and the window has opened

    document.documentElement.classList.add('notes-open');   // every window is laid out with room for Notes from the start
    const isNew = !spawnedWindows.has(id);
    let win;

    if (isNew) {
      win = spawnWindow(id, ch.label, ch.url, ch.scene);
    } else {
      win = spawnedWindows.get(id);
      monScreen.appendChild(win);
    }

    // A companion that is already open comes back with its parent
    if (companionId && spawnedWindows.has(companionId)) {
      const compWin = spawnedWindows.get(companionId);
      monScreen.appendChild(compWin);
      compWin.classList.remove('dimmed');
      compWin.classList.add('active');
    }

    requestAnimationFrame(() => requestAnimationFrame(() => {
      win.classList.remove('dimmed');
      win.classList.add('active');
    }));

    // Keep only the two most recent background windows visible so old ones
    // don't pile up behind the current scene
    const current = new Set([id, companionId]);
    windowStack = [id, companionId, ...windowStack].filter((wid, i, a) => wid && a.indexOf(wid) === i);
    windowStack.filter(wid => !current.has(wid)).forEach((wid, i) => {
      spawnedWindows.get(wid)?.classList.toggle('buried', i >= 2);
    });
    current.forEach(wid => spawnedWindows.get(wid)?.classList.remove('buried'));
  }

  /* ── NOTES APP ───────────────────────────────────── */
  const notesApp    = document.getElementById('notes-app');
  const naSidebar   = document.getElementById('na-sidebar');
  const naEdDate    = document.getElementById('na-ed-date');
  const naEdTitle   = document.getElementById('na-ed-title');
  const naEdBody    = document.getElementById('na-ed-body');
  const naEdDetails = document.getElementById('na-ed-details');
  const naCursor    = document.getElementById('na-cursor');
  const naMoreBtn   = document.getElementById('na-more-btn');
  let notesOpen     = false;

  if (naMoreBtn) {
    naMoreBtn.addEventListener('click', () => {
      const expanding = !notesApp.classList.contains('centered');
      naMoreBtn.setAttribute('aria-expanded', String(expanding));
      if (expanding) {
        notesApp.classList.add('centered');
        if (naEdDetails) naEdDetails.classList.add('visible');
        naMoreBtn.textContent = '↑ less';
      } else {
        notesApp.classList.remove('centered');
        if (naEdDetails) naEdDetails.classList.remove('visible');
        naMoreBtn.textContent = '↓ more';
      }
    });
  }
  /* Notes can be moved around like a window: drag the title bar (arrow keys work too);
     double-click it, or press Home, to put it back. */
  const naBar = notesApp && notesApp.querySelector('.na-titlebar');
  if (naBar) {
    const root = document.documentElement;
    let drag = null;
    naBar.title = 'Drag to move · double-click to put it back';
    naBar.tabIndex = 0;
    naBar.setAttribute('role', 'group');
    naBar.setAttribute('aria-label', 'Notes title bar: drag, or use the arrow keys, to move the window. Home puts it back.');

    const clampTo = (x, y) => {
      const r = notesApp.getBoundingClientRect();
      return [Math.min(Math.max(x, 90 - r.width), window.innerWidth - 90), Math.min(Math.max(y, 0), window.innerHeight - 44)];
    };
    const place = (x, y) => {
      const [cx, cy] = clampTo(x, y);
      notesApp.style.left = cx + 'px';
      notesApp.style.top = cy + 'px';
    };
    const takeOver = () => {                       // switch from right-anchored to explicit left/top
      const r = notesApp.getBoundingClientRect();
      notesApp.style.left = r.left + 'px';
      notesApp.style.top = r.top + 'px';
      notesApp.style.right = 'auto';
      root.classList.add('notes-moved');
    };
    const putBack = () => {
      notesApp.style.left = notesApp.style.top = notesApp.style.right = '';
      root.classList.remove('notes-moved');
    };

    naBar.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || e.target.closest('.na-tl') || !notesApp.classList.contains('open')) return;
      takeOver();
      const r = notesApp.getBoundingClientRect();
      drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
      notesApp.classList.add('na-dragging');
      naBar.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    naBar.addEventListener('pointermove', (e) => { if (drag) place(e.clientX - drag.dx, e.clientY - drag.dy); });
    const endDrag = () => { drag = null; notesApp.classList.remove('na-dragging'); };
    naBar.addEventListener('pointerup', endDrag);
    naBar.addEventListener('pointercancel', endDrag);
    naBar.addEventListener('dblclick', (e) => { if (!e.target.closest('.na-tl')) putBack(); });
    naBar.addEventListener('keydown', (e) => {
      const step = e.shiftKey ? 80 : 24;
      const move = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
      if (move) {
        e.preventDefault();
        if (!root.classList.contains('notes-moved')) takeOver();
        const r = notesApp.getBoundingClientRect();
        place(r.left + move[0], r.top + move[1]);
      } else if (e.key === 'Home') { e.preventDefault(); putBack(); }
    });
    window.addEventListener('resize', () => {
      if (!root.classList.contains('notes-moved')) return;
      const r = notesApp.getBoundingClientRect();
      place(r.left, r.top);
    });
    // expanding or collapsing a note uses its own layout, so the window goes back first
    if (naMoreBtn) naMoreBtn.addEventListener('click', putBack);
  }

  // The first titlebar square (an x while a note is expanded) puts it back to less text
  const naClose = document.getElementById('na-close');
  if (naClose) onActivate(naClose, () => {
    if (notesApp && notesApp.classList.contains('centered') && naMoreBtn) naMoreBtn.click();
  });
  let curNote      = null;
  let noteTimer    = null;

  function openNotesApp() {
    if (notesOpen || !notesApp) return;
    notesOpen = true;
    notesApp.classList.add('open');
    document.documentElement.classList.add('notes-open');
  }

  /* Making a new note easy to notice: a brief veil over the scene, a soft sound, and a bigger card for the first few */
  let noteCount = 0, veilTimer = null;
  const veil = document.getElementById('note-veil');
  function flashVeil() {
    if (!veil || prefersReducedMotion()) return;
    veil.classList.remove('go'); void veil.offsetWidth; veil.classList.add('go');
  }
  /* A step with an animation shows its note when the animation is done; the previous note stays until then */
  let noteDelayTimer = null;
  function updateNotesApp(stepEl, delayMs) {
    clearTimeout(noteDelayTimer);
    if (delayMs > 0 && !prefersReducedMotion()) { noteDelayTimer = setTimeout(() => renderNote(stepEl), delayMs); return; }
    renderNote(stepEl);
  }
  function renderNote(stepEl) {
    if (!notesApp) return;
    // where the note sits: set while it is closed it just appears there; set while open it glides
    const pos = stepEl.dataset.pos || '';
    if (!notesOpen) notesApp.classList.add('na-snap', 'na-jump');   // closed: move to the new place without any animation...
    notesApp.classList.toggle('pos-center', pos === 'center');
    notesApp.classList.toggle('pos-top', pos === 'top');
    if (!notesOpen) { void notesApp.offsetWidth; notesApp.classList.remove('na-jump'); }   // ...then open from there, so it slides in from the side
    openNotesApp();
    if (notesApp.classList.contains('na-snap')) { void notesApp.offsetWidth; setTimeout(() => notesApp.classList.remove('na-snap'), 60); }
    if (curNote && curNote.stepEl === stepEl) return;          // already showing this note: don't type it out again
    const label   = stepEl.querySelector('.step-label')?.textContent.trim() || 'Note';
    const keyText = stepEl.querySelector('.step-key-text')?.innerHTML.trim() || '';
    const details = Array.from(stepEl.querySelectorAll('.step-detail p'))
                         .map(p => p.textContent.trim()).filter(Boolean);
    const fullBody = details.join('\n\n');

    if (curNote) pushNoteToSidebar(curNote, false);
    naSidebar.querySelectorAll('.na-sb-item').forEach(i => i.classList.remove('active'));
    curNote = { label, keyText, stepEl };

    // Collapse any expanded state from previous note
    notesApp.classList.remove('centered');

    const now = new Date();
    if (naEdDate)    naEdDate.textContent  = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
    if (naEdTitle)   naEdTitle.textContent = label;
    if (naEdBody)    naEdBody.textContent  = '';
    if (naEdDetails) { naEdDetails.textContent = fullBody; naEdDetails.classList.remove('visible'); }
    if (naMoreBtn)   { naMoreBtn.classList.toggle('visible', details.length > 0); naMoreBtn.textContent = '↓ more'; naMoreBtn.setAttribute('aria-expanded', 'false'); }
    if (naCursor)    naCursor.style.opacity = '1';

    pushNoteToSidebar(curNote, true);
    // flash the window so a change of note is noticed
    notesApp.classList.remove('na-flash');
    void notesApp.offsetWidth;
    notesApp.classList.add('na-flash');
    noteCount += 1;
    // the dim comes in as the note is typed out (never for the first notes, which come before the first notification)
    clearTimeout(veilTimer);
    if (!['n1', 'n2', 'n3', 'n4'].includes(stepEl.dataset.intro) && !stepEl.dataset.nkey) veilTimer = setTimeout(flashVeil, 120);
    if (Eco.sound && Eco.sound.note) Eco.sound.note();
    if (noteTimer) clearTimeout(noteTimer);
    typeNote(keyText);
  }


  /* ── Notes follow the scene ───────────────────────────────
     A chapter's first note comes up as soon as its window opens (not after the last animation), and scrolling back up
     brings back the note of the step above. The feed keeps its own rule: Notes first appears at the end of the feed. */
  const allNotes = Array.from(document.querySelectorAll('.step--k'));
  function syncNoteToChapter(id) {
    if (id === 'intro' || id === 'finale') return;
    if (id === 'cover' && !notesApp.classList.contains('open')) return;   // Notes has not appeared yet: the feed keeps it closed until its end
    const chapterEl = document.querySelector(`.scroll-chapter[data-chapter="${id}"]`);
    const ks = chapterEl ? Array.from(chapterEl.querySelectorAll('.step--k')) : [];
    if (!ks.length) return;
    const line = window.innerHeight * 0.5;
    let pick = null;
    ks.forEach((k) => { if (k.getBoundingClientRect().top <= line) pick = k; });   // the last note already passed
    if (!pick) {
      if (id === 'interface') { if (Eco.hideNote) Eco.hideNote(); return; }       // the chat types its message first; its note comes with the reply
      pick = ks[0];
    }
    updateNotesApp(pick);
  }
  function noteBack(element) {
    if (!element.classList.contains('step--k') || element.closest('.scroll-chapter')?.dataset.chapter === 'finale') return;
    const i = allNotes.indexOf(element);
    const prev = i > 0 ? allNotes[i - 1] : null;
    if (prev && prev.closest('.scroll-chapter')?.dataset.chapter !== 'intro') updateNotesApp(prev);
    else if (element.closest('.scroll-chapter')?.dataset.chapter === 'interface' && Eco.hideNote) Eco.hideNote();   // back above the chat's first note: the opening's notes belong to the desktop
  }

  function pushNoteToSidebar(note, isActive) {
    // Keyed by the step's position so two steps with similar labels never collide
    const key = note.stepEl.dataset.nkey || String(Array.from(document.querySelectorAll('.step--k')).indexOf(note.stepEl));
    let item = naSidebar.querySelector(`[data-nkey="${key}"]`);
    if (!item) {
      item = document.createElement('div');
      item.className = 'na-sb-item';
      item.dataset.nkey = key;
      item.tabIndex = 0;
      item.setAttribute('role', 'button');
      const title = document.createElement('div');
      title.className = 'na-sb-item-title';
      title.textContent = note.label;
      const preview = document.createElement('div');
      preview.className = 'na-sb-item-preview';
      preview.textContent = note.keyText.substring(0, 36) + '…';
      item.append(title, preview);
      onActivate(item, () => {
        const chapter = note.stepEl.closest('.scroll-chapter') || document.querySelector(`.scroll-chapter[data-chapter="${note.stepEl.dataset.chapter || 'finale'}"]`);
        if (!chapter || !canJumpTo(chapter.getBoundingClientRect().top + window.scrollY)) return;
        markNavigating();
        naSidebar.querySelectorAll('.na-sb-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        chapter.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
      });
      naSidebar.appendChild(item);
    }
    item.classList.toggle('active', isActive);
  }

  /* A note appears word by word. Every word is laid out from the start, so the card keeps its size while it fills in. */
  function typeNote(html) {
    naEdBody.innerHTML = html;
    if (naCursor) naCursor.style.opacity = '0';
    if (prefersReducedMotion()) return;
    const words = [];
    const walker = document.createTreeWalker(naEdBody, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      const frag = document.createDocumentFragment();
      node.nodeValue.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
        const sp = document.createElement('span');
        sp.className = 'nw';
        sp.textContent = part;
        frag.appendChild(sp);
        words.push(sp);
      });
      node.parentNode.replaceChild(frag, node);
    });
    let i = 0;
    const per = Math.max(28, Math.min(70, 1500 / Math.max(1, words.length)));
    (function step() {
      if (i >= words.length) return;
      words[i++].classList.add('on');
      noteTimer = setTimeout(step, per);
    })();
  }
  Eco.hideNote = function () {
    if (!notesApp) return;
    clearTimeout(noteTimer); clearTimeout(veilTimer); clearTimeout(noteDelayTimer);
    notesApp.classList.remove('open', 'centered');
    if (activeChapter === 'intro' || activeChapter === 'desk1') document.documentElement.classList.remove('notes-open');   // between apps the windows keep their room, so they do not resize
    notesOpen = false;
    curNote = null;
  };

  Eco.holdScroll = (ms) => holdFor(ms);
  Eco.showNote = updateNotesApp;   // graph.js opens a box's explanation here

  /* ── Desktop clock ───────────────────────────────── */
  function updateClock() {
    const el = document.getElementById('dt-clock');
    if (!el) return;
    const now = new Date();
    let h = now.getHours(), m = now.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    el.textContent = `${h}:${String(m).padStart(2,'0')} ${ampm}`;
  }
  updateClock();
  setInterval(updateClock, 10000);

  /* ── Opening notification ─────────────────────────── */
  let scrollHintPending = false;
  let hintBaseY = 0;
  /* The reader starts the story by scrolling: notes appear on the empty desktop one after another. */
  function startOpening() {
    // the desktop starts up (wallpaper, icons one by one, the dock), then the first note arrives from the side
    setTimeout(() => monScreen.classList.remove('booting'), 300);
    setTimeout(() => {
      openingDone = true;
      unlockScroll();
      storyStarted = true; armIdleHint();
      const first = document.querySelector('.step[data-intro="n1"]');
      if (first) requestStep(first);
      setTimeout(() => { showHint('Scroll to continue ↓'); hintBaseY = window.scrollY; scrollHintPending = true; }, 2200);
    }, 3000);
  }

  /* "Story starts here": the headline cards fade out one after another, and the new wallpaper sweeps across */
  function openFeedFromCards() {
    Eco.intro.flights = [];
    if (prefersReducedMotion()) return;
    document.querySelectorAll('#hl-grid .hl-card').forEach((c, i) => {
      Eco.intro.flights.push(c.animate(
        [{ transform: 'none', opacity: 1 }, { transform: 'scale(0.94) translateY(8px)', opacity: 0 }],
        { duration: 420, delay: i * 70, easing: 'ease-in', fill: 'forwards' }));
    });
  }

  /* A gate: a notification that waits for a click. The story is held at its step until then. */
  let gateKind = null;
  function openGate(kind, stepEl) {
    const notif = document.getElementById(kind === 'news' ? 'intro-notif' : 'story-notif');
    if (!notif || gateKind) return;
    gateKind = kind;
    nextStepAt = performance.now() + 1e9;                       // later steps wait in the queue
    const hold = stepEl.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.5 + 4;
    if (window.scrollY > hold + 30) window.scrollTo({ top: hold, behavior: 'instant' });
    lockScroll();
    hideHint();
    notif.classList.add('show');
    Eco.sound.notify();
    notif.focus({ preventScroll: true });
    onActivate(notif, () => {
      if (!notif.classList.contains('show')) return;
      notif.classList.remove('show');
      gateKind = null;
      if (kind === 'news') Eco.intro.newsOpen = true; else Eco.intro.storyOpen = true;
      if (kind === 'story') openFeedFromCards();
      Eco.intro.refresh();
      nextStepAt = 0;
      unlockScroll();
      markNavigating();
      const next = document.querySelector(kind === 'news' ? '.step[data-intro="flood"]' : '.step[data-intro="t2"]');
      const go = () => { if (next) next.scrollIntoView({ behavior: scrollBehavior(), block: 'center' }); drainSteps(); };
      if (kind === 'story' && !prefersReducedMotion()) setTimeout(go, 1900);    // let the new wallpaper sweep across first
      else go();
    });
  }


  /* ── Progress bar ────────────────────────────────── */
  function updateProgress() {
    const total = document.body.scrollHeight - window.innerHeight;
    const pct = total > 0 ? (window.scrollY / total) * 100 : 0;
    progressFill.style.transform = `scaleX(${pct / 100})`;
  }
  /* A reader who stops scrolling gets the cue again after a few seconds */
  let idleTimer = null, storyStarted = false;
  function armIdleHint() {
    clearTimeout(idleTimer);
    if (!storyStarted) return;
    idleTimer = setTimeout(() => {
      const atEnd = window.scrollY >= document.body.scrollHeight - window.innerHeight - 60;
      if (scrollLocked || pendingChapter || atEnd || monScreen.classList.contains('finale-mode')) return;
      showHint('Scroll to continue ↓');
      hintBaseY = window.scrollY; scrollHintPending = true;
    }, 4500);
  }
  window.addEventListener('scroll', armIdleHint, { passive: true });
  let progTicking = false;
  window.addEventListener('scroll', () => { if (!progTicking) { progTicking = true; requestAnimationFrame(() => { progTicking = false; updateProgress(); }); } }, { passive: true });
  window.addEventListener('scroll', () => {
    if (scrollHintPending && Math.abs(window.scrollY - hintBaseY) > 80) { scrollHintPending = false; hideHint(); }
  }, { passive: true });



  /* ── SCROLLAMA setup ─────────────────────────────── */
  const scroller = typeof scrollama === 'function' ? scrollama() : null;
  if (!scroller) console.warn('scrollama failed to load — scroll-driven animations are disabled.');

  /* Steps run in order, one at a time. Scrollama only reports a step when it happens to see it cross the
     trigger line, so a quick flick could skip one: every scroll frame also checks the steps of the open app,
     and any that were passed without playing are queued, then played in order (each after the last one's pause). */
  const entered = new WeakSet();      // steps that have played
  const queued = new Set();           // steps waiting for their turn
  let nextStepAt = 0, drainTimer = null;
  const stepOrder = new Map(Array.from(document.querySelectorAll('.step')).map((el, i) => [el, i]));

  function playStep(element, direction) {
    entered.add(element);
    Eco.handleStep(element.dataset, direction);
    if (['switchemail', 'annotate-email'].includes(element.dataset.dm)) openCompanion('dm');
    if (['mdf', 'annotate-mdf'].includes(element.dataset.rc)) openCompanion('reddit');
    if (['move', 'annotate-dev'].includes(element.dataset.md)) openCompanion('models');

    // Notes app — fires on every step--k regardless of which scene
    if (element.classList.contains('step--k') && !Eco.intro.floodRunning) updateNotesApp(element, Math.min(animMs(element), 2400));

    // the two notifications of the opening hold the story until the reader clicks them
    if (direction === 'down') {
      if (element.dataset.intro === 'newsfeed' && !Eco.intro.newsOpen) openGate('news', element);
      else if (element.dataset.intro === 'go' && !Eco.intro.storyOpen) openGate('story', element);
    }

    // pause the scroll for the length of this step's animation (forwards only, and not in the intro)
    if (direction === 'down' && (element.closest('.scroll-chapter')?.dataset.chapter !== 'intro' || element.classList.contains('step--k'))) {
      const ms = holdMs(element);
      holdFor(ms);
      nextStepAt = performance.now() + (prefersReducedMotion() ? 0 : ms);
    }
  }

  function drainSteps() {
    clearTimeout(drainTimer);
    if (!queued.size || !openingDone) return;
    const wait = nextStepAt - performance.now();
    if (wait > 16) { drainTimer = setTimeout(drainSteps, wait); return; }
    const sorted = Array.from(queued).sort((a, b) => stepOrder.get(a) - stepOrder.get(b));
    const next = sorted[0];
    queued.delete(next);
    // the feed highlights each replace the last, so when several were skipped only the latest one needs to play
    const supersededByLater = next.dataset.news !== undefined && sorted.some((el) => el !== next && el.dataset.news !== undefined);
    if (supersededByLater) entered.add(next);
    else if (!entered.has(next)) playStep(next, 'down');
    if (queued.size) drainTimer = setTimeout(drainSteps, supersededByLater ? 0 : Math.max(16, nextStepAt - performance.now()));
  }

  let openingDone = false;                // the desktop opening plays first; no step is taken before it ends
  function requestStep(element) {
    if (!openingDone) return;
    if (entered.has(element) || queued.has(element)) return;
    queued.add(element);
    drainSteps();
  }

  // the trigger line of a step (scrollama's default is half way down the screen)
  const stepLine = (el) => window.innerHeight * (parseFloat(el.dataset.offset) || 0.5);
  let catchTicking = false;
  function catchUpSteps() {
    catchTicking = false;
    if (performance.now() < navUntil || monScreen.classList.contains('finale-mode')) return;
    const chapterEl = document.querySelector(`.scroll-chapter[data-chapter="${activeChapter}"]`);
    if (!chapterEl) return;
    for (const el of chapterEl.querySelectorAll('.step')) {
      if (entered.has(el) || queued.has(el)) continue;
      if (el.getBoundingClientRect().top > stepLine(el)) break;     // in order: nothing later has been reached either
      queued.add(el);
    }
    drainSteps();                                                   // all the missed ones are queued first, so they play as one ordered run
    // the same the other way: steps that were scrolled back above without being undone
    const all = Array.from(chapterEl.querySelectorAll('.step')).reverse();
    for (const el of all) {
      if (!entered.has(el) || el.getBoundingClientRect().top <= stepLine(el)) continue;
      entered.delete(el);
      queued.delete(el);
      Eco.handleStepExit(el.dataset, 'up');
      noteBack(el);
    }
  }
  window.addEventListener('scroll', () => { if (!catchTicking) { catchTicking = true; requestAnimationFrame(catchUpSteps); } }, { passive: true });

  if (scroller) scroller.setup({
    step: '.step',
    offset: 0.5,
    debug: false,
  }).onStepEnter(({ element, direction }) => {
    if (direction === 'down') requestStep(element);
    else if (!entered.has(element)) {                                  // scrolling back up into a step keeps the old behaviour...
      if (element.getBoundingClientRect().top > stepLine(element) + 60) return;   // ...unless it was never really reached (a snap-back, a fling)
      playStep(element, direction);
    }
    else Eco.handleStep(element.dataset, direction);
  }).onStepExit(({ element, direction }) => {
    if (direction === 'up') { if (!entered.delete(element)) return; queued.delete(element); }
    Eco.handleStepExit(element.dataset, direction);
    if (direction === 'up') noteBack(element);
  });

  /* ── IntersectionObserver for chapter switching ───── */
  const scrollChapters = Array.from(document.querySelectorAll('.scroll-chapter'));
  let gateBase = null;   // the app that was showing when a gate appeared
  function updateChapterFromScroll() {
    const triggerY = window.innerHeight * 0.4;
    let current = null;
    for (const el of scrollChapters) {
      const rect = el.getBoundingClientRect();
      if (rect.top <= triggerY) current = el.dataset.chapter;
    }
    if (!current) return;
    if (gateKind) return;                                                              // an opening notification is waiting for its click
    if (!Eco.intro.storyOpen && current !== 'intro') current = 'intro';               // a fast scroll can overshoot: the opening still has to be played first
    if (unlockedChapters.has(current)) {            // anywhere already opened: follow the scroll, up or down
      if (current !== activeChapter) activateChapter(current);
      return;
    }
    if (scrollLocked) {                             // back at a closed gate: show the app that was open before it
      if (pendingChapter && gateBase && activeChapter !== gateBase) activateChapter(gateBase);
      return;
    }
    if (current === activeChapter) return;
    if (current !== pendingChapter) {               // every new app waits behind its notification: the reader clicks it to open
      pendingChapter = current;
      gateBase = activeChapter;
      showSceneNotif(current);
      lockScroll();
    }
  }
  let chapTicking = false;
  window.addEventListener('scroll', () => { if (!chapTicking) { chapTicking = true; requestAnimationFrame(() => { chapTicking = false; updateChapterFromScroll(); }); } }, { passive: true });

  /* ── Step-expand buttons ─────────────────────────── */
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.step-expand-btn');
    if (!btn) return;
    const detail = btn.closest('.step--k')?.querySelector('.step-detail');
    if (!detail) return;
    const open = detail.classList.toggle('is-open');
    btn.setAttribute('aria-expanded', open);
    detail.setAttribute('aria-hidden', String(!open));
    btn.textContent = open ? 'Read less ▴' : 'Read more ▾';
  });

  /* ── Initial scene ───────────────────────────────── */
  activateChapter('intro');
  const firstScene = document.getElementById('scene-intro');
  if (firstScene) firstScene.classList.add('active');


  /* ── Resize handler ──────────────────────────────── */
  window.addEventListener('resize', () => {
    if (scroller) scroller.resize();
  });

  /* ── Initial load ────────────────────────────────── */
  window.addEventListener('load', () => {
    const introScene = document.getElementById('scene-intro');
    if (introScene) introScene.classList.add('active');
    updateProgress();
  });

})();
