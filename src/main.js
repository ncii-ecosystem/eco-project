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
  const chapterNav   = document.getElementById('chapter-nav');
  const progressFill = document.getElementById('progress-bar-fill');
  const cwOverlay    = document.getElementById('cw-overlay');
  const cwBtn        = document.getElementById('cw-btn');
  const sceneNotif   = document.getElementById('scene-notif');

  /* ── Quick exit: leaves at once, and removes this page from history ── */
  function quickExit() {
    try { document.body.innerHTML = ''; } catch (e) { /* ignore */ }
    window.location.replace('https://www.google.com/');
  }
  document.getElementById('quick-exit')?.addEventListener('click', quickExit);
  let escCount = 0, escTimer = null;
  document.addEventListener('keydown', (e) => {   // Esc three times in a row also leaves
    if (e.key !== 'Escape') return;
    escCount += 1;
    clearTimeout(escTimer);
    escTimer = setTimeout(() => { escCount = 0; }, 900);
    if (escCount >= 3) quickExit();
  });

  /* ── Content warning ──────────────────────────────── */
  cwBtn.focus();
  cwBtn.addEventListener('click', () => {
    cwOverlay.classList.add('hidden');
    setTimeout(showOpeningNotification, 1500);
  });

  const { CHAPTERS, NOTIF_CONFIG } = Eco;

  /* ── Scroll gate state ────────────────────────────── */
  // 'cover' pre-unlocked — its gate is the intro notification, not #scene-notif
  const unlockedChapters = new Set(['intro', 'cover', 'finale']);
  const visitedChapters = new Set();   // apps the reader has opened, for the dock   // the finale has no gate
  let scrollLocked = false;
  let lockedScrollY = 0;
  let pendingChapter = null;
  let snClickHandler = null;

  // Locking freezes the viewport (overflow hidden) and snaps back if anything
  // else (scrollbar drag, Home/End, focus jumps) still moves it.
  function snapBackIfLocked() {
    if (scrollLocked && Math.abs(window.scrollY - lockedScrollY) > 1) {
      window.scrollTo({ top: lockedScrollY, behavior: 'instant' });
    }
  }

  function lockScroll() {
    if (scrollLocked) return;
    scrollLocked = true;
    lockedScrollY = window.scrollY;
    document.documentElement.classList.add('scroll-locked');
    window.addEventListener('scroll', snapBackIfLocked, { passive: true });
  }

  function unlockScroll() {
    scrollLocked = false;
    document.documentElement.classList.remove('scroll-locked');
    window.removeEventListener('scroll', snapBackIfLocked);
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
    // a short cue that scrolling is free again
    showHint('Scroll to continue ↓');
    setTimeout(() => { if (!scrollLocked && !pendingChapter) hideHint(); }, 2400);
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
    chat:   { type: 1700, send: 400, think: 900, respond: 700, dataset: 2200, sort: 3200 },
    dm:     { msg0: 800, msg1: 800, msg2: 500, 'annotate-imessage': 1800, switchemail: 600, 'annotate-email': 500 },
    rc:     { 0: 500, 1: 500, 2: 500, 3: 500, 4: 500, ban: 600, mdf: 600, 'annotate-mdf': 700 },
    search: { results: 1500 },
    as:     { fill: 700, highlight: 600, overlay: 500 },
    pay:    { site: 600, logos: 600, sheet: 800 },
    cloud:  { stats: 1000, alert: 600 },
    fin:    { assemble: 1500, close1: 2200, close2: 2600, flood: 4000 },
  };
  function holdMs(el) {
    const ds = el.dataset;
    let ms = 0;
    Object.keys(HOLD_MS).forEach((key) => { if (ds[key] !== undefined) ms = Math.max(ms, HOLD_MS[key][ds[key]] || 0); });
    if (el.classList.contains('step--k')) ms = Math.max(ms, 1300);   // the note types itself out
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

  /* ── Reader controls: auto-open + restart ────────── */
  let autoOpen = store.get('eco-auto-open') === '1';
  const rcAuto = document.getElementById('rc-auto');
  const rcRestart = document.getElementById('rc-restart');

  function renderAutoOpen() {
    if (!rcAuto) return;
    rcAuto.setAttribute('aria-pressed', String(autoOpen));
    rcAuto.textContent = 'Auto-open scenes: ' + (autoOpen ? 'on' : 'off');
  }
  renderAutoOpen();

  if (rcAuto) rcAuto.addEventListener('click', () => {
    autoOpen = !autoOpen;
    store.set('eco-auto-open', autoOpen ? '1' : '0');
    renderAutoOpen();
    // Turning it on while a gate is showing opens that scene right away
    if (autoOpen && pendingChapter) unlockAndActivate(pendingChapter);
  });

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
    sceneNotif.classList.add('show', 'pulsing');
    // Remove any stale listener before adding a fresh one
    if (snClickHandler) sceneNotif.removeEventListener('click', snClickHandler);
    snClickHandler = () => unlockAndActivate(id);
    sceneNotif.addEventListener('click', snClickHandler, { once: true });
    sceneNotif.addEventListener('keydown', sceneNotifKey);
    sceneNotif.focus({ preventScroll: true });
    showHint('Click the notification to open the next scene ↗');
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
  const RAIL = 'var(--rail, 44px)';   // the strip on the left that holds the chapter squares
  const usable = `(100% - var(--notes-reserve, 0px) - ${RAIL})`;
  const fitLeft = (v) => (v.endsWith('%')
    ? `calc(${RAIL} + ${usable} * ${parseFloat(v) / 100})`
    : `calc(${RAIL} + ${v})`);
  const fitWidth = (v) => (v.endsWith('%')
    ? `calc(${usable} * ${parseFloat(v) / 100})`
    : v);

  /* Companion windows — spawned alongside their parent chapter */
  const WIN_COMPANIONS = { dm: 'dm-email', reddit: 'mdf' };

  /* ── Build chapter nav dots ──────────────────────── */
  CHAPTERS.forEach((ch) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'chapter-dot';
    dot.setAttribute('aria-label', ch.label);
    dot.dataset.label = ch.label;
    dot.dataset.chapter = ch.id;
    dot.addEventListener('click', () => scrollToChapter(ch.id));
    chapterNav.appendChild(dot);
  });

  function scrollToChapter(id) {
    if (scrollLocked) return;   // gates must be opened, not skipped
    markNavigating();
    const el = document.querySelector(`.scroll-chapter[data-chapter="${id}"]`);
    if (el) el.scrollIntoView({ behavior: scrollBehavior() });
  }

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
    if (scrollLocked) return;                       // a gate or an animation is holding the page
    if (!unlockedChapters.has(id)) {
      if (!autoOpen) {                              // not opened yet: nudge instead of skipping ahead
        item.classList.remove('nope'); void item.offsetWidth; item.classList.add('nope');
        showHint('That app opens further down the story');
        setTimeout(() => { if (!scrollLocked && !pendingChapter) hideHint(); }, 2200);
        return;
      }
      unlockedChapters.add(id);
    }
    hideHint();
    if (item.dataset.step) {
      const target = document.querySelector(item.dataset.step);
      if (target) { markNavigating(); target.scrollIntoView({ behavior: scrollBehavior(), block: 'center' }); }
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

  const CHAPTER_NUM = { cover: 1, interface: 2, dm: 3, 'dm-email': 3, reddit: 4, mdf: 4, search: 5, appstore: 6, payment: 7, cloud: 8 };
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
        ${CHAPTER_NUM[wid] ? `<div class="win-chip" title="Chapter ${CHAPTER_NUM[wid]} of 8">${String(CHAPTER_NUM[wid]).padStart(2, '0')} / 08</div>` : ''}
      </div>
      <div class="win-content"></div>
    `;
    monScreen.appendChild(w);
    spawnedWindows.set(wid, w);
    const sceneEl = document.getElementById(sceneId);
    if (sceneEl) w.querySelector('.win-content').appendChild(sceneEl);
    return w;
  }

  /* Companion apps (email next to messages, the marketplace next to the forum)
     open on their own scroll step, after the main app's note. */
  const COMP_META = {
    'dm-email': { label: 'Email',       url: 'mail.example/inbox' },
    mdf:        { label: 'MrDeepFakes', url: 'mrdeepfakes.com' },
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

  /* Used by the finale: make sure every app has a window, in story order */
  const FINALE_ORDER = ['cover', 'interface', 'dm', 'dm-email', 'reddit', 'mdf', 'search', 'appstore', 'payment', 'cloud'];
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

    document.querySelectorAll('.chapter-dot').forEach(d => {
      d.classList.toggle('active', d.dataset.chapter === id);
    });

    if (id !== 'cover') hideTip();
    visitedChapters.add(id);
    syncDock();

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

    const isNew = !spawnedWindows.has(id);
    let win;

    if (isNew) {
      win = spawnWindow(id, ch.label, ch.url, ch.scene);
      if (id === 'cover') setTimeout(Eco.revealNewsParas, 300);
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
  // The first titlebar square puts an expanded note back to its normal size
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

  function updateNotesApp(stepEl) {
    if (!notesApp) return;
    openNotesApp();
    const label   = stepEl.querySelector('.step-label')?.textContent.trim() || 'Note';
    const keyText = stepEl.querySelector('.step-key-text')?.textContent.trim() || '';
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
    if (naEdDetails) { naEdDetails.textContent = fullBody; decorateSources(naEdDetails); naEdDetails.classList.remove('visible'); }
    if (naMoreBtn)   { naMoreBtn.classList.toggle('visible', details.length > 0); naMoreBtn.textContent = '↓ more'; naMoreBtn.setAttribute('aria-expanded', 'false'); }
    if (naCursor)    naCursor.style.opacity = '1';

    pushNoteToSidebar(curNote, true);
    // flash the window so a change of note is noticed
    notesApp.classList.remove('na-flash');
    void notesApp.offsetWidth;
    notesApp.classList.add('na-flash');
    if (noteTimer) clearTimeout(noteTimer);
    typeNote(keyText);
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
        const chapter = note.stepEl.closest('.scroll-chapter') || document.querySelector('.scroll-chapter[data-chapter="finale"]');
        if (!chapter) return;
        markNavigating();
        if (scrollLocked) unlockScroll();
        naSidebar.querySelectorAll('.na-sb-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        chapter.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
      });
      naSidebar.appendChild(item);
    }
    item.classList.toggle('active', isActive);
  }

  /* Figures in the notes show where they come from */
  const SOURCES = [
    ['6,700', 'Bloomberg, Jan 7, 2026'],
    ['99.69%', 'Oh; Ding, Suresh & Venkatasubramanian (2026)'],
    ['705 million', 'Tech Transparency Project (2026)'],
    ['$117 million', 'Tech Transparency Project (2026)'],
    ['62 of the 85', 'Mantzarlis & Lakatos (2025)'],
    ['5,000', 'Maiberg (2025)'],
  ];
  function decorateSources(el) {
    if (!el) return;
    let html = escapeHtml(el.textContent);
    let changed = false;
    SOURCES.forEach(([needle, src]) => {
      const n = escapeHtml(needle);
      if (!html.includes(n)) return;
      html = html.replace(n, `<span class="src" tabindex="0" data-src="${escapeHtml(src)}">${n}</span>`);
      changed = true;
    });
    if (changed) el.innerHTML = html;
  }

  function typeNote(text) {
    if (prefersReducedMotion()) {
      naEdBody.textContent = text;
      decorateSources(naEdBody);
      if (naCursor) naCursor.style.opacity = '0';
      return;
    }
    let i = 0;
    function step() {
      if (i < text.length) {
        naEdBody.textContent = text.substring(0, i + 1);
        i++;
        noteTimer = setTimeout(step, 8);
      } else {
        decorateSources(naEdBody);
        if (naCursor) setTimeout(() => { naCursor.style.opacity = '0'; }, 900);
      }
    }
    step();
  }

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
  /* ── Tip: tells the reader the highlights are clickable ── */
  const tipNotif = document.getElementById('tip-notif');
  let tipTimer = null;
  function hideTip() {
    clearTimeout(tipTimer);
    if (tipNotif) tipNotif.classList.remove('show');
  }
  function showTip() {
    if (!tipNotif) return;
    tipNotif.classList.add('show');
    clearTimeout(tipTimer);
    tipTimer = setTimeout(hideTip, 18000);
  }
  document.getElementById('tip-close')?.addEventListener('click', hideTip);
  document.addEventListener('click', (e) => { if (e.target.closest('.nh')) hideTip(); }, true);

  function showOpeningNotification() {
    const notif = document.getElementById('intro-notif');
    if (!notif) return;
    notif.classList.add('show');
    showHint('Click the notification to begin ↗');
    notif.focus({ preventScroll: true });
    onActivate(notif, () => {
      if (!notif.classList.contains('show')) return;
      notif.classList.remove('show');
      unlockScroll();
      showHint('Scroll to continue ↓');
      // Arm after the scroll to the article settles, so only the reader's own scrolling dismisses it
      setTimeout(() => { hintBaseY = window.scrollY; scrollHintPending = true; }, 1300);
      activateChapter('cover');
      scrollToChapter('cover');
      setTimeout(showTip, 1100);   // once the article window has opened
      // Open Notes immediately with the first step--k pre-populated
      const firstStepK = document.querySelector('.step.step--k');
      if (firstStepK) updateNotesApp(firstStepK);
    });
  }


  /* ── Progress bar ────────────────────────────────── */
  function updateProgress() {
    const total = document.body.scrollHeight - window.innerHeight;
    const pct = total > 0 ? (window.scrollY / total) * 100 : 0;
    progressFill.style.width = pct + '%';
  }
  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('scroll', () => {
    if (scrollHintPending && Math.abs(window.scrollY - hintBaseY) > 80) { scrollHintPending = false; hideHint(); }
  }, { passive: true });



  /* ── SCROLLAMA setup ─────────────────────────────── */
  const scroller = typeof scrollama === 'function' ? scrollama() : null;
  if (!scroller) console.warn('scrollama failed to load — scroll-driven animations are disabled.');

  if (scroller) scroller.setup({
    step: '.step',
    offset: 0.5,
    debug: false,
  }).onStepEnter(({ element, direction }) => {
    Eco.handleStep(element.dataset, direction);
    if (['switchemail', 'annotate-email'].includes(element.dataset.dm)) openCompanion('dm');
    if (['mdf', 'annotate-mdf'].includes(element.dataset.rc)) openCompanion('reddit');

    // Notes app — fires on every step--k regardless of which scene
    if (element.classList.contains('step--k')) updateNotesApp(element);

    // pause the scroll for the length of this step's animation (forwards only, and not in the intro)
    if (direction === 'down' && element.closest('.scroll-chapter')?.dataset.chapter !== 'intro') holdFor(holdMs(element));
  }).onStepExit(({ element, direction }) => {
    Eco.handleStepExit(element.dataset, direction);
  });

  /* ── IntersectionObserver for chapter switching ───── */
  const scrollChapters = Array.from(document.querySelectorAll('.scroll-chapter'));
  function updateChapterFromScroll() {
    if (scrollLocked) return;
    const triggerY = window.innerHeight * 0.4;
    let current = null;
    for (const el of scrollChapters) {
      const rect = el.getBoundingClientRect();
      if (rect.top <= triggerY) current = el.dataset.chapter;
    }
    if (!current) return;
    if (current === activeChapter) return;
    if (unlockedChapters.has(current)) {
      activateChapter(current);
    } else if (autoOpen) {
      unlockedChapters.add(current);
      activateChapter(current);
    } else if (current !== pendingChapter) {
      // Gate this chapter behind a notification
      pendingChapter = current;
      showSceneNotif(current);
      lockScroll();
    }
  }
  window.addEventListener('scroll', updateChapterFromScroll, { passive: true });

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
