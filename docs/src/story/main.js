/* ============================================================
   The Ecosystem Behind the Image — main.js
   Desktop narrative with explicit step navigation
   ============================================================ */
(function () {
  'use strict';

  const Eco = window.Eco;
  const { setTimeout, clearTimeout, requestAnimationFrame } =
    window.createStoryMotionScope(() => Eco.replaying);
  const { prefersReducedMotion, escapeHtml, onActivate } = Eco;

  /* ── DOM refs ─────────────────────────────────────── */
  const monScreen    = document.getElementById('mon-screen');
  const cwOverlay    = document.getElementById('cw-overlay');
  const cwBtn        = document.getElementById('cw-btn');

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
    window.clearTimeout(escTimer);
    escTimer = window.setTimeout(() => { escCount = 0; }, 900);
    if (escCount >= 3) quickExit();
  });

  /* ── Content warning ──────────────────────────────── */
  cwBtn.addEventListener('click', () => {
    const navbar = document.querySelector('.site-topnav');
    navbar.classList.remove('is-open');
    navbar.classList.add('is-hidden');
    navbar.inert = true;
    cwOverlay.classList.add('hidden');
    setTimeout(startOpening, 700);
  });

  const { CHAPTERS } = Eco;

  const visitedChapters = new Set();
  let storyStarted = false;

  // how long each step's animation takes (ms); steps with a note also wait for the note to type out
  const ANIMATION_MS = {
    news:   { h0: 1500, h1: 1500, h2: 1500, h3: 1500, h4: 1500 },   // the marker sweep, the pop-up and the comments
    chat:   { type: 1300, send: 400, think: 900, respond: 700, dataset: 0, scan: 0, return: 0, model: 2000 },
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
    Object.keys(ANIMATION_MS).forEach((key) => { if (ds[key] !== undefined) ms = Math.max(ms, ANIMATION_MS[key][ds[key]] || 0); });
    return ms;
  }
  Eco.showChatExplanation = () => {};
  Eco.showDmExplanation = () => {
    if (Eco.replaying || navigation.active?.dataset.dm !== 'msg2') return;
    navigation.goTo(document.querySelector('.step[data-dm="annotate-imessage"]'));
  };
  document.getElementById('dm-send-btn')?.addEventListener('click', event => {
    if (navigation.active?.dataset.dm !== 'msg0' || event.currentTarget.disabled) return;
    event.currentTarget.blur();
    navigation.goTo(document.querySelector('.step[data-dm="msg2"]'));
  });
  Eco.showSearchExplanation = () => {
    if (Eco.replaying || navigation.active?.dataset.search !== 'results') return;
    navigation.goTo(document.querySelector('.step[data-search="annotate"]'));
  };
  document.getElementById('chat-send-btn')?.addEventListener('click', () => {
    const step = document.querySelector('[data-chat="send"]');
    if (navigation.active?.dataset.chat === 'type') navigation.goTo(step);
  });

  /* ── Reader controls: sound + restart ────────── */
  const rcRestart = document.getElementById('rc-restart');

  const rcSound = document.getElementById('rc-sound');
  function renderSound() {
    if (!rcSound) return;
    rcSound.setAttribute('aria-pressed', String(Eco.sound.on));
    rcSound.querySelector('i').className = 'fas ' + (Eco.sound.on ? 'fa-volume-high' : 'fa-volume-xmark');
  }
  renderSound();
  if (rcSound) rcSound.addEventListener('click', () => { Eco.sound.set(!Eco.sound.on); renderSound(); });

  if (rcRestart) rcRestart.addEventListener('click', () => {
    if (!window.confirm('Start over from the beginning?')) return;
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    window.location.reload();
  });

  /* ── Window tracking ─────────────────────────────── */
  let windowStack = [];               // chapter ids, most recent first
  const spawnedWindows = new Map();   // chapter id → .mac-window element
  const windowOverlay = document.getElementById('window-overlay');

  /* Per-chapter window geometry — staggered so windows overlap naturally */
  const WIN_POSITIONS = {
    cover:      { top: '24px',  left: '8px',   width: '74%', height: '88%' },
    interface:  { top: '34px',  left: '10%',   width: '84%', height: '84%' },
    models:     { top: '30px',  left: '8%',    width: '80%', height: '82%' },
    devplat:    { top: '46px',  left: '49%',   width: '48%', height: '78%' },
    dm:         { top: '18px',  left: '3%',    width: '42%', height: '84%' },
    'dm-email': { top: '36px',  left: '44%',   width: '52%', height: '86%' },
    reddit:     { top: '52px',  left: '2%',    width: '56%', height: '88%' },
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

  /* Dock and arrows use the same step index. Specific dock items own the
     interval up to the next item, including items sharing a chapter. */
  const dockItems = Array.from(document.querySelectorAll('.dt-dock-item[data-go]'));
  function dockTarget(item) {
    return item.dataset.step ? document.querySelector(item.dataset.step)
      : document.querySelector(`.scroll-chapter[data-chapter="${item.dataset.go}"] .step`);
  }
  function syncDock() {
    const candidates = dockItems.filter(item => !item.dataset.href)
      .map(item => ({ item, index: steps.indexOf(dockTarget(item)) }))
      .filter(entry => entry.index >= 0 && entry.index <= navigation.index)
      .sort((a, b) => b.index - a.index);
    const current = candidates[0]?.item || dockItems.find(item => !item.dataset.href && item.dataset.go === activeChapter);
    syncWindowNumbers(current);
    dockItems.forEach(item => {
      item.classList.toggle('visited', visitedChapters.has(item.dataset.go));
      item.classList.toggle('current', item === current);
      if (item === current) item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');
    });
    if (current) {
      const dock = current.closest('.dt-dock-wrap');
      const itemBox = current.getBoundingClientRect(), dockBox = dock.getBoundingClientRect();
      const delta = itemBox.left < dockBox.left ? itemBox.left - dockBox.left - 4
        : itemBox.right > dockBox.right ? itemBox.right - dockBox.right + 4 : 0;
      if (delta) dock.scrollBy({ left: delta, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    }
  }
  window.addEventListener('resize', () => { if (storyStarted) syncDock(); });
  dockItems.forEach(item => {
    item.tabIndex = -1;
    item.setAttribute('role', 'button');
    item.setAttribute('aria-label', 'Go to ' + item.title);
    item.addEventListener('click', () => {
      item.blur();
      dismissNavigationTip();
      if (item.dataset.href) {
        if (window.parent.SiteRouter) window.parent.SiteRouter.navigate(item.dataset.href);
        else window.location.href = item.dataset.href;
      } else if (storyStarted) {
        const target = dockTarget(item);
        if (!navigation.goTo(target) && target?.dataset.fin === 'end') scrollToEnding();
      }
    });
  });

  /* ── Scene switching ─────────────────────────────── */
  let activeChapter = 'intro';

  const numberedDockItems = dockItems.filter(item => !['intro', 'finale'].includes(item.dataset.go));
  const CHAPTER_TOTAL = numberedDockItems.length;
  const numberFor = title => numberedDockItems.findIndex(item => item.title === title) + 1;
  const CHAPTER_NUM = {
    interface: numberFor('Assistant'), models: numberFor('Models'), devplat: numberFor('Repos'),
    reddit: numberFor('Communities'), mdf: numberFor('Communities'), search: numberFor('Search'),
    appstore: numberFor('Apps'), payment: numberFor('Payments'), cloud: numberFor('Infrastructure'),
    dm: numberFor('Channels'), 'dm-email': numberFor('Channels'),
  };
  const TECHNOLOGY_TITLES = {
    interface: 'Generative AI Interfaces', models: 'Generative AI Models',
    devplat: 'Developer Platforms', reddit: 'Deepfake Creation Communities',
    mdf: 'Deepfake Creation Communities', search: 'Search Engines',
    appstore: 'App Stores', payment: 'Payment Processors', cloud: 'Critical Service Providers',
    dm: 'Distribution Channels', 'dm-email': 'Distribution Channels',
  };
  function technologyTitle(id, current) {
    if (id === 'interface' && current?.title === 'Datasets') return 'Training Datasets';
    return TECHNOLOGY_TITLES[id];
  }
  function syncWindowNumbers(current) {
    const sectionNumber = numberedDockItems.indexOf(current) + 1;
    spawnedWindows.forEach((win, id) => {
      const heading = technologyTitle(id, current);
      if (heading && current?.dataset.go === id) win.querySelector('.win-title').textContent = heading;
      const chip = win.querySelector('.win-chip');
      if (!chip) return;
      const sharedWindow = ['interface', 'search'].includes(id) && current?.dataset.go === id;
      if (['interface', 'search'].includes(id) && !sharedWindow) return;
      const number = sharedWindow && sectionNumber ? sectionNumber : CHAPTER_NUM[id];
      chip.textContent = `${String(number).padStart(2, '0')} / ${String(CHAPTER_TOTAL).padStart(2, '0')}`;
      chip.title = `Section ${number} of ${CHAPTER_TOTAL}`;
    });
  }
  function spawnWindow(wid, label, url, sceneId) {
    const pos = WIN_POSITIONS[wid] || { top: '44px', left: '4%', width: '88%', height: '80%' };
    const w = document.createElement('div');
    w.className = 'mac-window win-new';
    window.setTimeout(() => w.classList.remove('win-new'), 800);
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
        <div class="win-title">${escapeHtml(technologyTitle(wid, dockItems.find(item => item.classList.contains('current'))) || label)}</div>
        ${CHAPTER_NUM[wid] ? `<div class="win-chip" title="Section ${CHAPTER_NUM[wid]} of ${CHAPTER_TOTAL}">${String(CHAPTER_NUM[wid]).padStart(2, '0')} / ${String(CHAPTER_TOTAL).padStart(2, '0')}</div>` : ''}
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

  // Animation callbacks never advance the narrative; only reader actions do.
  Eco.advanceTo = () => {};

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

  function activateChapter(id, force = false) {
    if (activeChapter === id && !force) return;
    activeChapter = id;

    const ch = CHAPTERS.find(c => c.id === id);
    if (!ch) return;

    visitedChapters.add(id);

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
      compWin.classList.remove('active', 'dimmed');
      compWin.classList.add('buried');
    }

    requestAnimationFrame(() => requestAnimationFrame(() => {
      win.classList.remove('dimmed');
      win.classList.add('active');
    }));

    // Earlier windows remain stacked behind the current scene.
    windowStack = [id, companionId, ...windowStack].filter((wid, i, a) => wid && a.indexOf(wid) === i);
    windowStack.filter(wid => wid !== companionId).forEach(wid => {
      spawnedWindows.get(wid)?.classList.remove('buried');
    });
    spawnedWindows.get(id)?.classList.remove('buried');
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
  const navigationTip = document.getElementById('story-navigation-tip');
  let navigationTipShown = false;
  let navigationTipMotion = null;
  function dismissNavigationTip() {
    if (!navigationTip || navigationTip.hidden) return;
    const current = getComputedStyle(navigationTip);
    const start = { opacity: current.opacity, transform: current.transform };
    navigationTipMotion?.cancel();
    if (prefersReducedMotion()) { navigationTip.hidden = true; return; }
    navigationTipMotion = navigationTip.animate([
      start, { opacity: 0, transform: 'translate(-50%, 8px)' },
    ], { duration: 200, easing: 'ease', fill: 'forwards' });
    navigationTipMotion.onfinish = () => {
      navigationTip.hidden = true;
      navigationTipMotion.cancel();
      navigationTipMotion = null;
    };
  }

  if (naMoreBtn) {
    naMoreBtn.addEventListener('click', () => {
      const expanding = !notesApp.classList.contains('centered');
      naMoreBtn.setAttribute('aria-expanded', String(expanding));
      if (expanding) {
        notesApp.classList.add('centered');
        if (naEdDetails) naEdDetails.classList.add('visible');
        naMoreBtn.innerHTML = '<i class="fas fa-chevron-up" aria-hidden="true"></i><span>less</span>';
      } else {
        notesApp.classList.remove('centered');
        if (naEdDetails) naEdDetails.classList.remove('visible');
        naMoreBtn.innerHTML = '<i class="fas fa-chevron-down" aria-hidden="true"></i><span>more</span>';
      }
    });
  }
  // The first titlebar square (an x while a note is expanded) puts it back to less text
  const naClose = document.getElementById('na-close');
  if (naClose) onActivate(naClose, () => {
    if (notesApp && notesApp.classList.contains('centered') && naMoreBtn) naMoreBtn.click();
  });
  const revealedNotes = new WeakSet();
  let curNote      = null;
  let noteTimer    = null;
  let preserveNotesDuringReplay = false;

  function openNotesApp() {
    if (notesOpen || !notesApp) return;
    notesOpen = true;
    notesApp.classList.add('open');
    document.documentElement.classList.add('notes-open');
  }

  /* Making a new note easy to notice: a brief veil over the scene, a soft sound, and a bigger card for the first few */
  let veilTimer = null;
  const veil = document.getElementById('note-veil');
  function flashVeil() {
    if (!veil || prefersReducedMotion()) return;
    veil.classList.remove('go'); void veil.offsetWidth; veil.classList.add('go');
  }
  /* A step with an animation shows its note when the animation is done; the previous note stays until then */
  let noteDelayTimer = null;
  function updateNotesApp(stepEl, delayMs) {
    if (Eco.replaying) return;
    if (!cwOverlay.classList.contains('hidden')) return;
    clearTimeout(noteDelayTimer);
    if (delayMs > 0 && !prefersReducedMotion()) { noteDelayTimer = setTimeout(() => renderNote(stepEl), delayMs); return; }
    renderNote(stepEl);
  }
  function renderNote(stepEl) {
    if (Eco.replaying) return;
    if (!notesApp || !cwOverlay.classList.contains('hidden')) return;
    notesApp.classList.remove('na-faded');
    notesApp.inert = false;
    // where the note sits: set while it is closed it just appears there; set while open it glides
    const pos = ['n1', 'n2', 'n3', 'n4'].includes(stepEl.dataset.intro) ? 'center' : 'top';
    notesApp.style.left = notesApp.style.top = notesApp.style.right = '';
    document.documentElement.classList.remove('notes-moved');
    if (!notesOpen) notesApp.classList.add('na-snap', 'na-jump');   // closed: move to the new place without any animation...
    notesApp.classList.toggle('pos-center', pos === 'center');
    notesApp.classList.toggle('pos-top', pos === 'top');
    if (!notesOpen) { void notesApp.offsetWidth; notesApp.classList.remove('na-jump'); }   // ...then open from there, so it slides in from the side
    openNotesApp();
    if (!navigationTipShown && navigationTip) {
      navigationTipShown = true;
      navigationTip.hidden = false;
      if (!prefersReducedMotion()) navigationTipMotion = navigationTip.animate([
        { opacity: 0, transform: 'translate(-50%, 8px)' },
        { opacity: 1, transform: 'translate(-50%, 0)' },
      ], { duration: 200, easing: 'ease' });
    }
    if (notesApp.classList.contains('na-snap')) { void notesApp.offsetWidth; setTimeout(() => notesApp.classList.remove('na-snap'), 60); }
    if (curNote && curNote.stepEl === stepEl) {
      return;
    }
    const label   = stepEl.querySelector('.step-label')?.textContent.trim() || 'Note';
    const keyText = stepEl.querySelector('.step-key-text')?.innerHTML.replace(/\s+/g, ' ').trim() || '';
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
    if (naMoreBtn)   { naMoreBtn.classList.toggle('visible', details.length > 0); naMoreBtn.innerHTML = '<i class="fas fa-chevron-down" aria-hidden="true"></i><span>more</span>'; naMoreBtn.setAttribute('aria-expanded', 'false'); }
    if (naCursor)    naCursor.style.opacity = '1';

    pushNoteToSidebar(curNote, true);
    // flash the window so a change of note is noticed
    notesApp.classList.remove('na-flash');
    void notesApp.offsetWidth;
    notesApp.classList.add('na-flash');
    // the dim comes in as the note is typed out (never for the first notes, which come before the first notification)
    clearTimeout(veilTimer);
    if (!Eco.replaying && Eco.sound && Eco.sound.note) Eco.sound.note();
    if (noteTimer) clearTimeout(noteTimer);
    const animate = !revealedNotes.has(stepEl);
    revealedNotes.add(stepEl);
    typeNote(keyText, animate);
  }


  function pushNoteToSidebar(note, isActive) {
    // Keyed by the step's position so two steps with similar labels never collide
    const key = note.stepEl.dataset.nkey || String(Array.from(document.querySelectorAll('.step--k')).indexOf(note.stepEl));
    let item = naSidebar.querySelector(`[data-nkey="${key}"]`);
    if (!item) {
      item = document.createElement('div');
      item.className = 'na-sb-item';
      item.dataset.nkey = key;
      item.tabIndex = -1;
      item.setAttribute('role', 'button');
      const title = document.createElement('div');
      title.className = 'na-sb-item-title';
      title.textContent = note.label;
      const preview = document.createElement('div');
      preview.className = 'na-sb-item-preview';
      preview.textContent = note.keyText.substring(0, 36) + '…';
      item.append(title, preview);
      onActivate(item, () => {
        if (steps.includes(note.stepEl)) navigation.goTo(note.stepEl);
      });
      naSidebar.appendChild(item);
    }
    item.classList.toggle('active', isActive);
  }

  /* A note appears word by word. Every word is laid out from the start, so the card keeps its size while it fills in. */
  function typeNote(html, animate = true, onComplete = () => {}) {
    naEdBody.innerHTML = html;
    if (naCursor) naCursor.style.opacity = '0';
    if (!animate || prefersReducedMotion()) { onComplete(); return; }
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
      if (i >= words.length) { onComplete(); return; }
      words[i++].classList.add('on');
      noteTimer = setTimeout(step, per);
    })();
  }
  Eco.fadeNote = () => {
    clearTimeout(noteTimer); clearTimeout(noteDelayTimer);
    notesApp?.classList.add('na-faded');
    if (notesApp) notesApp.inert = true;
  };
  Eco.hideNote = function () {
    if (Eco.replaying && preserveNotesDuringReplay) return;
    if (!notesApp) return;
    clearTimeout(noteTimer); clearTimeout(veilTimer); clearTimeout(noteDelayTimer);
    notesApp.classList.remove('open', 'centered', 'na-faded');
    notesApp.inert = false;
    if (activeChapter === 'intro' || activeChapter === 'desk1') document.documentElement.classList.remove('notes-open');   // between apps the windows keep their room, so they do not resize
    notesOpen = false;
    curNote = null;
  };

  Eco.holdScroll = () => {};
  Eco.showNote = updateNotesApp;

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

  /* The content warning is the only entry gate. */
  function startOpening() {
    monScreen.classList.remove('booting');
    // Let the wallpaper, desktop icons, and dock finish their original entrance.
    setTimeout(() => {
      storyStarted = true;
      navigation.goTo(0);
    }, prefersReducedMotion() ? 0 : 3000);
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

  /* One source of truth for the narrative. Scene prerequisites are restored
     without motion in the same frame, then only the selected step animates. */
  // Notifications are narrative states, so back/forward navigation restores them.
  document.querySelectorAll('.scroll-chapter').forEach(chapter => {
    const id = chapter.dataset.chapter === 'intro' ? 'cover' : chapter.dataset.chapter;
    if (!Eco.NOTIF_CONFIG[id]) return;
    const anchor = id === 'cover' ? chapter.querySelector('[data-intro="n4"]')
      : chapter.previousElementSibling?.matches('.scroll-chapter')
        ? chapter.previousElementSibling.querySelector('.step:last-child') : null;
    if (!anchor) return;
    const step = document.createElement('div');
    step.className = 'step step--n';
    step.dataset.notification = id;
    const label = document.createElement('span');
    label.className = 'step-label';
    label.textContent = Eco.NOTIF_CONFIG[id].app + ' notification';
    step.append(label);
    anchor.after(step);
  });
  const steps = Array.from(document.querySelectorAll('.scroll-chapter .step'));
  const chapterStepsByElement = new Map();
  const noteForStep = new Map();
  document.querySelectorAll('.scroll-chapter').forEach(chapter => {
    const chapterSteps = Array.from(chapter.querySelectorAll('.step'));
    chapterStepsByElement.set(chapter, chapterSteps);
    let note = null;
    chapterSteps.forEach(step => {
      if (step.classList.contains('step--k')) note = step;
      noteForStep.set(step, note);
    });
  });
  const previous = document.getElementById('story-previous');
  const next = document.getElementById('story-next');
  const status = document.getElementById('story-status');
  const navigation = new window.StoryNavigation(steps, renderStep);
  Eco.navigation = navigation;
  const sceneNotification = document.getElementById('scene-notif');
  sceneNotification?.setAttribute('role', 'button');
  sceneNotification?.setAttribute('aria-label', 'Dismiss notification');
  function forwardFromNotification() {
    if (navigation.active?.dataset.notification === 'models') {
      sceneNotification?.classList.remove('show', 'pulsing');
      Eco.startModelClick?.();
      return true;
    }
    return false;
  }
  onActivate(sceneNotification, () => {
    sceneNotification.classList.remove('show', 'pulsing');
    if (forwardFromNotification()) return;
    navigation.move(1);
  });
  function showChapterNotification(id) {
    const config = Eco.NOTIF_CONFIG[id];
    if (!config || !sceneNotification) return;
    // Revisiting a notification must put its destination back behind the gate.
    [id, WIN_COMPANIONS[id]].filter(Boolean).forEach(wid => {
      const win = spawnedWindows.get(wid);
      win?.classList.remove('active', 'raised');
      win?.classList.add('buried');
      win?.getAnimations().forEach(animation => {
        if (animation.effect?.getTiming().iterations !== Infinity) animation.finish();
      });
    });
    sceneNotification.setAttribute('aria-label', 'Begin ' + config.app);
    document.getElementById('sn-icon').innerHTML = config.icon;
    ['app', 'title', 'body'].forEach(key => {
      const node = document.getElementById('sn-' + key);
      if (node) node.textContent = config[key];
    });
    sceneNotification.classList.add('show');
    Eco.sound?.notify?.();
  }
  document.documentElement.classList.add('story-discrete');
  document.getElementById('scroll-root').setAttribute('aria-hidden', 'true');

  function scrollToEnding() {
    const endcard = document.querySelector('.endcard');
    if (endcard) window.scrollTo({ top: endcard.offsetTop, behavior: prefersReducedMotion() ? 'instant' : 'smooth' });
  }

  function syncEndingNavbar() {
    const endcard = document.querySelector('.endcard');
    const visible = document.documentElement.classList.contains('in-outro') &&
      endcard && endcard.getBoundingClientRect().top <= window.innerHeight / 2;
    const navbar = document.querySelector('.site-topnav');
    navbar.classList.toggle('is-hidden', !visible);
    navbar.inert = !visible;
    if (!visible) navbar.classList.remove('is-open');
    window.parent.SiteRouter?.setStoryEndingVisible(Boolean(visible));
  }
  window.addEventListener('scroll', syncEndingNavbar, { passive: true });
  window.addEventListener('resize', () => { if (storyStarted) syncEndingNavbar(); });

  function settleRestoredAnimations() {
    document.querySelectorAll('.mac-window, .aux-win, #hl-grid, #flood-layer')
      .forEach(root => root.getAnimations({ subtree: true }).forEach(animation => {
        if (animation.effect?.getTiming().iterations !== Infinity) animation.finish();
      }));
  }

  let lastRenderedStep = null;
  const windowEntrySteps = new Map(CHAPTERS.filter(chapter => chapter.scene).map(chapter => [
    chapter.id, steps.findIndex(step => step.closest('.scroll-chapter')?.dataset.chapter === chapter.id),
  ]));
  [['devplat', '[data-md="move"]'], ['mdf', '[data-rc="mdf"]'], ['dm-email', '[data-dm="switchemail"]']]
    .forEach(([id, selector]) => windowEntrySteps.set(id, steps.indexOf(document.querySelector(`.step${selector}`))));
  function renderStep(element, index) {
    const navigatingBackward = lastRenderedStep && index < steps.indexOf(lastRenderedStep);
    const previousShadows = new Map(Array.from(spawnedWindows.values(), win => [win, getComputedStyle(win).boxShadow]));
    const retainModels = activeChapter === 'models' &&
      element.closest('.scroll-chapter')?.dataset.chapter === 'models' &&
      lastRenderedStep && index === steps.indexOf(lastRenderedStep) + 1;
    const retainSearch = activeChapter === 'search' &&
      element.closest('.scroll-chapter')?.dataset.chapter === 'search' &&
      lastRenderedStep && index > steps.indexOf(lastRenderedStep) &&
      document.querySelector('#search .google-chrome')?.classList.contains('results-ready');
    const closingWindows = new Set();
    spawnedWindows.forEach((win, id) => {
      const entry = windowEntrySteps.get(id);
      if (entry >= 0 && entry > index && !win.classList.contains('story-future') &&
          getComputedStyle(win).visibility === 'visible' && Number(getComputedStyle(win).opacity) > 0) {
        closingWindows.add(win);
      }
    });
    const headlineNotes = ['zoomnote', 'grok', 'tech', 'taxo', 'story'];
    const retainHeadlines = headlineNotes.includes(lastRenderedStep?.dataset.intro) &&
      ['grok', 'tech', 'taxo', 'story'].includes(element.dataset.intro);
    const retainScene = retainHeadlines || retainModels || retainSearch;
    lastRenderedStep = element;
    naEdBody?.querySelectorAll('.nw').forEach(word => word.classList.add('on'));
    if (element.dataset.fin !== 'end' && document.documentElement.classList.contains('in-outro')) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      document.documentElement.classList.remove('in-outro');
    }
    clearTimeout(noteTimer); clearTimeout(noteDelayTimer); clearTimeout(veilTimer);
    if (!retainScene) Eco.cancelSceneMotion();
    sceneNotification?.classList.remove('show', 'pulsing');
    veil?.classList.remove('go');
    // Cancel only story animations; the loader and warning have their own lifecycle.
    if (!retainScene) document.querySelectorAll('.mac-window, .aux-win, #hl-grid, #flood-layer')
      .forEach(root => root.getAnimations({ subtree: true }).forEach(animation => animation.cancel()));
    const chapter = element.closest('.scroll-chapter');
    const id = chapter.dataset.chapter;
    const chapterChanged = activeChapter !== id;
    preserveNotesDuringReplay = !chapterChanged && notesOpen;
    if (!retainScene) {
      document.documentElement.classList.add('story-restoring');
      Eco.replaying = true;
      try {
        Eco.finale?.undo('assemble');
        Eco.policy?.reset();
        Eco.resetScene(id);
        Eco.hideNote();
        activateChapter(id, true);
        if (id !== 'intro') {
          Eco.intro.storyOpen = true;
          monScreen.classList.add('flood-gone');
        }
        const chapterSteps = chapterStepsByElement.get(chapter);
        for (const step of chapterSteps) {
          if (step === element) break;
          applyStep(step);
        }
      } finally {
        // Commit prerequisite styles before enabling the selected step's motion.
        void monScreen.offsetHeight;
        Eco.replaying = false;
        preserveNotesDuringReplay = false;
        document.documentElement.classList.remove('story-restoring');
      }
      // Restored CSS entrance effects belong to earlier steps. Finish them before
      // painting; the selected step can then start its own animation below.
      settleRestoredAnimations();
    }
    if (chapterChanged && !prefersReducedMotion()) {
      const win = spawnedWindows.get(id);
      win?.animate([{ opacity: 0, transform: 'scale(0.94) translateY(10px)' }, { opacity: 1, transform: 'none' }],
        { duration: 480, easing: 'cubic-bezier(0.2, 0.85, 0.2, 1)' });
    }
    // Revisiting an automatic response shows its completed state and waits for input.
    const restoreAutomaticStep = navigatingBackward &&
      (element.dataset.search === 'results' || element.dataset.chat === 'send' || element.dataset.dm === 'msg2');
    if (restoreAutomaticStep) Eco.replaying = true;
    try { applyStep(element); }
    finally { if (restoreAutomaticStep) Eco.replaying = false; }
    if (restoreAutomaticStep) settleRestoredAnimations();
    const note = noteForStep.get(element);
    if (note && !Eco.intro.floodRunning) updateNotesApp(note, Math.min(animMs(element), 2400));
    if (element.dataset.fin === 'flood' && Eco.finale?.covered) Eco.fadeNote();
    if (!chapterChanged && (element.dataset.note || element.dataset.notification)) {
      settleRestoredAnimations();
    }
    previous.disabled = index === 0;
    next.disabled = index === steps.length - 1;
    status.textContent = `Step ${index + 1} of ${steps.length}: ${element.querySelector('.step-label')?.textContent.trim() || chapter.dataset.chapter}`;
    document.documentElement.classList.toggle('in-outro', element.dataset.fin === 'end');
    syncEndingNavbar();
    syncDock();
    spawnedWindows.forEach((win, id) => {
      const entry = windowEntrySteps.get(id);
      const future = entry >= 0 && entry > index;
      win.classList.toggle('story-future', future);
      win.inert = future;
      const oldShadow = previousShadows.get(win);
      const newShadow = getComputedStyle(win).boxShadow;
      if (!future && oldShadow !== undefined && oldShadow !== newShadow && !prefersReducedMotion()) {
        win.animate([{ boxShadow: oldShadow }, { boxShadow: newShadow }], {
          duration: 350, easing: 'ease-in-out',
        });
      }
      if (future && closingWindows.has(win) && !prefersReducedMotion()) {
        win.animate([
          { opacity: 0.55, transform: 'scale(1)', visibility: 'visible' },
          { opacity: 0, transform: 'scale(0.97) translateY(6px)', visibility: 'visible' },
        ], { duration: 180, easing: 'ease-out' });
      }
    });
    if (element.dataset.notification) showChapterNotification(element.dataset.notification);
    if (element.dataset.fin === 'end') scrollToEnding();
    window.dispatchEvent(new CustomEvent('story:step', { detail: { element, index, chapter: id } }));
  }

  function applyStep(element) {
    if (element.dataset.intro === 'go') {
      Eco.intro.storyOpen = true;
      if (!Eco.replaying) openFeedFromCards();
    }
    Eco.handleStep(element.dataset, 'down');
    if (element.dataset.chat === 'send' && !Eco.replaying) {
      setTimeout(() => {
        if (navigation.active !== element) return;
        Eco.handleStep({ chat: 'think' }, 'down');
        setTimeout(() => {
          if (navigation.active === element) {
            navigation.goTo(document.querySelector('.step[data-chat="respond"]'));
          }
        }, prefersReducedMotion() ? 0 : 900);
      }, prefersReducedMotion() ? 0 : 400);
    }
    if (['switchemail', 'annotate-email'].includes(element.dataset.dm)) openCompanion('dm');
    if (['mdf', 'annotate-mdf'].includes(element.dataset.rc)) openCompanion('reddit');
    if (['move', 'annotate-dev'].includes(element.dataset.md)) openCompanion('models');
    if (element.dataset.fin === 'end') Eco.graph?.setProgress(1);
  }

  previous.addEventListener('click', () => {
    dismissNavigationTip();
    navigation.move(-1);
  });
  next.addEventListener('click', () => {
    dismissNavigationTip();
    if (forwardFromNotification()) return;
    navigation.move(1);
  });
  document.querySelector('.ps-pay-btn')?.addEventListener('click', event => {
    if (activeChapter !== 'payment' || event.currentTarget.disabled) return;
    event.currentTarget.disabled = true;
    event.currentTarget.textContent = 'Payment submitted';
    navigation.move(1);
  });
  previous.disabled = next.disabled = true;
  document.addEventListener('keydown', event => {
    if (!storyStarted || event.defaultPrevented || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="slider"], [role="dialog"], [role="alertdialog"], .win-titlebar, .na-titlebar, .eg-node')) return;
    const isSpace = event.key === ' ';
    if (isSpace && !event.target.closest('.dt-dock-item') && event.target.closest('button, a[href], [role="button"], summary')) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && !isSpace) return;
    event.preventDefault();
    dismissNavigationTip();
    if (event.key !== 'ArrowLeft' && forwardFromNotification()) return;
    navigation.move(event.key === 'ArrowLeft' ? -1 : 1);
  });

  /* ── Step-expand buttons ─────────────────────────── */
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.step-expand-btn');
    if (!btn) return;
    const detail = btn.closest('.step--k')?.querySelector('.step-detail');
    if (!detail) return;
    const open = detail.classList.toggle('is-open');
    btn.setAttribute('aria-expanded', open);
    detail.setAttribute('aria-hidden', String(!open));
    btn.innerHTML = open ? 'Read less <i class="fas fa-chevron-up" aria-hidden="true"></i>' : 'Read more <i class="fas fa-chevron-down" aria-hidden="true"></i>';
  });

  /* ── Initial scene ───────────────────────────────── */
  activateChapter('intro');
  const firstScene = document.getElementById('scene-intro');
  if (firstScene) firstScene.classList.add('active');


})();
