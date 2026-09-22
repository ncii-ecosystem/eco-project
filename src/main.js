/* ============================================================
   It Was Never Just One App — main.js
   Lofi desk + monitor scroll system
   ============================================================ */
(function () {
  'use strict';

  /* ── Pull monitor out of desk-world, hide desk ────── */
  const deskWorld = document.getElementById('desk-world');
  const _mw = document.getElementById('monitor-wrap');
  if (deskWorld && _mw) {
    deskWorld.parentNode.insertBefore(_mw, deskWorld);
    deskWorld.style.display = 'none';
  }

  /* ── DOM refs ─────────────────────────────────────── */
  const monitorWrap  = document.getElementById('monitor-wrap');
  const monUrlText   = document.getElementById('mon-url-text');
  const monScreen    = document.getElementById('mon-screen');
  const chapterNav   = document.getElementById('chapter-nav');
  const progressFill = document.getElementById('progress-bar-fill');
  const cwOverlay    = document.getElementById('cw-overlay');
  const cwBtn        = document.getElementById('cw-btn');
  const sceneNotif   = document.getElementById('scene-notif');

  /* ── Content warning ──────────────────────────────── */
  cwBtn.addEventListener('click', () => {
    cwOverlay.classList.add('hidden');
    setTimeout(showOpeningNotification, 1500);
  });

  /* ── Chapter config ───────────────────────────────── */
  const CHAPTERS = [
    { id: 'intro',     label: 'Intro',      scene: 'scene-intro', url: '' },
    { id: 'cover',     label: 'TheRecord',  scene: 'cover',       url: 'therecord.com/technology/ai-image-abuse-investigation' },
    { id: 'interface', label: 'Grok',       scene: 'interface',   url: 'x.com/i/grok?focus=1' },
    { id: 'dm',        label: 'Private',    scene: 'dm',          url: 'messages.google.com/web/conversations' },
    { id: 'reddit',    label: 'Public',     scene: 'reddit',      url: 'reddit.com/r/deepfakes' },
    { id: 'search',    label: 'Search',     scene: 'search',      url: 'google.com/search?q=undress+AI+app+free' },
    { id: 'appstore',  label: 'App Store',  scene: 'appstore',    url: 'apps.apple.com/app/nudify-ai-photo-editor' },
    { id: 'payment',   label: 'Checkout',   scene: 'payment',     url: 'undressaipro.ai/checkout?plan=monthly' },
    { id: 'cloud',     label: 'AWS',        scene: 'cloud',       url: 'console.aws.amazon.com/ec2/v2/home' },
  ];

  /* ── Notification content per chapter ───────────── */
  const NOTIF_CONFIG = {
    cover:     { icon: '<span class="notif-folder notif-folder--neutral"><i class="fas fa-newspaper"></i></span>',          app: 'The Record',  title: 'When Grok Generated Thousands of Nude Images…', body: 'Five newsrooms. Five stories. One supply chain.' },
    interface: { icon: '<span class="notif-folder notif-folder--distribution"><i class="fas fa-magic"></i></span>',         app: 'Grok',        title: 'New session — Aurora v3 · Image Generation',    body: 'No content policy applied to this session.' },
    dm:        { icon: '<span class="notif-folder notif-folder--distribution"><i class="fas fa-comment"></i></span>',       app: 'Messages',    title: 'Private thread · anonymous community',           body: 'Coordinating jailbreaks out of sight.' },
    reddit:    { icon: '<span class="notif-folder notif-folder--distribution"><i class="fas fa-globe"></i></span>',         app: 'Reddit',      title: 'r/deepfakes · new posts flooding in',            body: 'Public channels, no moderation in sight.' },
    search:    { icon: '<span class="notif-folder notif-folder--discovery"><i class="fas fa-search"></i></span>',           app: 'Google',      title: 'Results for "undress AI app free"',              body: '2.4 million results · 0 content filters.' },
    appstore:  { icon: '<span class="notif-folder notif-folder--discovery"><i class="fas fa-shopping-cart"></i></span>',    app: 'App Store',   title: 'NudifyAI · Photo Editor',                        body: '4.7★ · 500K downloads · still listed.' },
    payment:   { icon: '<span class="notif-folder notif-folder--monetize"><i class="fas fa-hand-holding-usd"></i></span>',  app: 'Checkout',    title: 'UndressAI Pro — Monthly Plan',                   body: 'Stripe · Visa · Mastercard accepted.' },
    cloud:     { icon: '<span class="notif-folder notif-folder--infra"><i class="fas fa-cloud"></i></span>',                app: 'AWS Console', title: 'EC2 instance · ap-southeast-1',                  body: 'Infrastructure with no paper trail.' },
  };

  /* ── Scroll gate state ────────────────────────────── */
  // 'cover' pre-unlocked — its gate is the intro notification, not #scene-notif
  const unlockedChapters = new Set(['intro', 'cover']);
  let scrollLocked = false;
  let lockedScrollY = 0;
  let pendingChapter = null;
  let snClickHandler = null;

  function preventWheel(e) { e.preventDefault(); }
  function preventTouch(e) { e.preventDefault(); }
  function preventScrollKeys(e) {
    if (['Space','ArrowDown','ArrowUp','PageDown','PageUp','End'].includes(e.code)) e.preventDefault();
  }

  function lockScroll() {
    scrollLocked = true;
    lockedScrollY = window.scrollY;
    window.addEventListener('wheel',     preventWheel,      { passive: false });
    window.addEventListener('touchmove', preventTouch,      { passive: false });
    window.addEventListener('keydown',   preventScrollKeys);
  }

  function unlockScroll() {
    scrollLocked = false;
    window.removeEventListener('wheel',     preventWheel);
    window.removeEventListener('touchmove', preventTouch);
    window.removeEventListener('keydown',   preventScrollKeys);
  }

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
  }

  function dismissSceneNotif() {
    if (!sceneNotif) return;
    sceneNotif.classList.remove('show', 'pulsing');
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
  const spawnedWindows = new Map();   // chapter id → .mac-window element
  const windowOverlay = document.getElementById('window-overlay');

  /* Per-chapter window geometry — staggered so windows overlap naturally */
  const WIN_POSITIONS = {
    cover:      { top: '24px',  left: '8px',   width: '90%', height: '88%' },
    interface:  { top: '34px',  left: '10%',   width: '84%', height: '84%' },
    dm:         { top: '18px',  left: '3%',    width: '42%', height: '84%' },
    'dm-email': { top: '36px',  left: '44%',   width: '52%', height: '80%' },
    reddit:     { top: '52px',  left: '2%',    width: '58%', height: '76%' },
    mdf:        { top: '28px',  left: '34%',   width: '63%', height: '78%' },
    search:     { top: '64px',  left: '4%',    width: '88%', height: '70%' },
    appstore:   { top: '30px',  left: '8%',    width: '86%', height: '82%' },
    payment:    { top: '72px',  left: '20%',   width: '74%', height: '60%' },
    cloud:      { top: '22px',  left: '4px',   width: '93%', height: '86%' },
  };

  /* Companion windows — spawned alongside their parent chapter */
  const WIN_COMPANIONS = { dm: 'dm-email', reddit: 'mdf' };
  /* Companion scene IDs for window spawning */
  const WIN_COMPANION_SCENES = { 'dm-email': 'dm-email', mdf: 'mdf' };

  /* ── Build chapter nav dots ──────────────────────── */
  CHAPTERS.forEach((ch) => {
    const dot = document.createElement('div');
    dot.className = 'chapter-dot';
    dot.dataset.label = ch.label;
    dot.dataset.chapter = ch.id;
    dot.addEventListener('click', () => scrollToChapter(ch.id));
    chapterNav.appendChild(dot);
  });

  function scrollToChapter(id) {
    const el = document.querySelector(`.scroll-chapter[data-chapter="${id}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }

  /* ── Scene switching ─────────────────────────────── */
  let activeChapter = 'intro';

  function activateChapter(id) {
    if (activeChapter === id) return;
    activeChapter = id;

    const ch = CHAPTERS.find(c => c.id === id);
    if (!ch) return;

    document.querySelectorAll('.chapter-dot').forEach(d => {
      d.classList.toggle('active', d.dataset.chapter === id);
    });

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

    function spawnWindow(wid, label, url, sceneId) {
      const pos = WIN_POSITIONS[wid] || { top: '44px', left: '4%', width: '88%', height: '80%' };
      const w = document.createElement('div');
      w.className = 'mac-window';
      w.dataset.chapter = wid;
      w.style.top    = pos.top;
      w.style.left   = pos.left;
      w.style.width  = pos.width;
      w.style.height = pos.height;
      w.innerHTML = `
        <div class="win-titlebar">
          <div class="win-traffic">
            <span class="wtl wtl-r"></span>
            <span class="wtl wtl-y"></span>
            <span class="wtl wtl-g"></span>
          </div>
          <div class="win-title">${label}</div>
          <div class="win-url">${url || ''}</div>
        </div>
        <div class="win-content"></div>
      `;
      monScreen.appendChild(w);
      spawnedWindows.set(wid, w);
      const sceneEl = document.getElementById(sceneId);
      if (sceneEl) w.querySelector('.win-content').appendChild(sceneEl);
      return w;
    }

    const isNew = !spawnedWindows.has(id);
    let win;

    if (isNew) {
      win = spawnWindow(id, ch.label, ch.url, ch.scene);
      if (id === 'cover') setTimeout(revealNewsParas, 300);
    } else {
      win = spawnedWindows.get(id);
      monScreen.appendChild(win);
    }

    // Spawn companion window if needed
    if (companionId && !spawnedWindows.has(companionId)) {
      const compLabels = { 'dm-email': 'Email', mdf: 'MrDeepFakes' };
      const compUrls   = { 'dm-email': 'mail.proton.me', mdf: 'mrdeepfakes.com' };
      const compScenes = { 'dm-email': 'dm-email', mdf: 'mdf' };
      const compWin = spawnWindow(companionId, compLabels[companionId], compUrls[companionId], compScenes[companionId]);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        compWin.classList.remove('dimmed');
        compWin.classList.add('active');
      }));
    } else if (companionId && spawnedWindows.has(companionId)) {
      const compWin = spawnedWindows.get(companionId);
      monScreen.appendChild(compWin);
      compWin.classList.remove('dimmed');
      compWin.classList.add('active');
    }

    requestAnimationFrame(() => requestAnimationFrame(() => {
      win.classList.remove('dimmed');
      win.classList.add('active');
    }));
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
  let curNote      = null;
  let noteTimer    = null;

  function openNotesApp() {
    if (notesOpen || !notesApp) return;
    notesOpen = true;
    notesApp.classList.add('open');
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
    curNote = { label, keyText, body: [keyText, ...details].join('\n\n') };

    // Collapse any expanded state from previous note
    notesApp.classList.remove('centered');

    const now = new Date();
    if (naEdDate)    naEdDate.textContent  = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
    if (naEdTitle)   naEdTitle.textContent = label;
    if (naEdBody)    naEdBody.textContent  = '';
    if (naEdDetails) { naEdDetails.textContent = fullBody; naEdDetails.classList.remove('visible'); }
    if (naMoreBtn)   { naMoreBtn.classList.toggle('visible', details.length > 0); naMoreBtn.textContent = '↓ more'; }
    if (naCursor)    naCursor.style.opacity = '1';

    pushNoteToSidebar(curNote, true);
    if (noteTimer) clearTimeout(noteTimer);
    typeNote(keyText);
  }

  function pushNoteToSidebar(note, isActive) {
    const key = note.label.replace(/\s+/g, '-').toLowerCase();
    let item = naSidebar.querySelector(`[data-nkey="${key}"]`);
    if (!item) {
      item = document.createElement('div');
      item.className = 'na-sb-item';
      item.dataset.nkey = key;
      item.innerHTML = `<div class="na-sb-item-title">${note.label}</div><div class="na-sb-item-preview">${note.keyText.substring(0,36)}…</div>`;
      item.addEventListener('click', () => {
        const stepLabel = Array.from(document.querySelectorAll('.step-label'))
          .find(el => el.textContent.trim() === note.label);
        if (!stepLabel) return;
        const chapter = stepLabel.closest('.scroll-chapter');
        if (!chapter) return;
        if (scrollLocked) unlockScroll();
        naSidebar.querySelectorAll('.na-sb-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        chapter.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      naSidebar.appendChild(item);
    }
    item.classList.toggle('active', isActive);
  }

  function typeNote(text) {
    let i = 0;
    function step() {
      if (i < text.length) {
        naEdBody.textContent = text.substring(0, i + 1);
        i++;
        noteTimer = setTimeout(step, 14);
      } else {
        if (naCursor) setTimeout(() => { naCursor.style.opacity = '0'; }, 900);
      }
    }
    step();
  }

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
  function showOpeningNotification() {
    const notif = document.getElementById('intro-notif');
    if (!notif) return;
    notif.classList.add('show');
    notif.addEventListener('click', () => {
      notif.classList.remove('show');
      unlockScroll();
      activateChapter('cover');
      scrollToChapter('cover');
      // Open Notes immediately with the first step--k pre-populated
      const firstStepK = document.querySelector('.step.step--k');
      if (firstStepK) updateNotesApp(firstStepK);
    }, { once: true });
  }


  /* ── News paragraph stagger reveal ──────────────── */
  let newsParasRevealed = false;
  function revealNewsParas() {
    if (newsParasRevealed) return;
    newsParasRevealed = true;
    document.querySelectorAll('.news-article > p').forEach((p, i) => {
      setTimeout(() => p.classList.add('para-visible'), i * 300 + 100);
    });
  }

  /* ── Progress bar ────────────────────────────────── */
  function updateProgress() {
    const total = document.body.scrollHeight - window.innerHeight;
    const pct = total > 0 ? (window.scrollY / total) * 100 : 0;
    progressFill.style.width = pct + '%';
  }
  window.addEventListener('scroll', updateProgress, { passive: true });



  /* ── SCROLLAMA setup ─────────────────────────────── */
  const scroller = scrollama();

  scroller.setup({
    step: '.step',
    offset: 0.5,
    debug: false,
  }).onStepEnter(({ element, direction }) => {
    // Find parent chapter to dispatch to the right handler
    const chapterEl = element.closest('.scroll-chapter');
    if (!chapterEl) return;
    const chapter = chapterEl.dataset.chapter;

    // Find the data-* attribute that drives this step
    const ds = element.dataset;
    if (ds.news    !== undefined) handleCover(ds.news, direction);
    if (ds.chat    !== undefined) handleInterface(ds.chat, direction);
    if (ds.ds      !== undefined) handleDatasets(ds.ds, direction);
    if (ds.dm      !== undefined) handleDm(ds.dm, direction);
    if (ds.rc      !== undefined) handleReddit(ds.rc, direction);
    if (ds.search  !== undefined) handleSearch(ds.search, direction);
    if (ds.as      !== undefined) handleAppstore(ds.as, direction);
    if (ds.pay     !== undefined) handlePayment(ds.pay, direction);
    if (ds.cloud   !== undefined) handleCloud(ds.cloud, direction);

    // Notes app — fires on every step--k regardless of which scene
    if (element.classList.contains('step--k')) updateNotesApp(element);
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
    btn.textContent = open ? 'Read less ▴' : 'Read more ▾';
  });

  /* ── PQ-PANEL + .nh highlight handlers ──────────── */
  const pqPanel   = document.getElementById('pq-panel');
  const pqSummary = document.getElementById('pq-summary');
  const pqQuote   = document.getElementById('pq-quote');
  const pqCite    = document.getElementById('pq-cite');
  const pqClose   = document.getElementById('pq-close');
  const pqExpand  = document.getElementById('pq-expand');
  const pqFull    = document.getElementById('pq-full');

  let activeNh = null;

  document.addEventListener('click', (e) => {
    const nh = e.target.closest('.nh');
    if (!nh) return;
    e.stopPropagation();

    if (activeNh && activeNh !== nh) activeNh.classList.remove('active');
    activeNh = nh;
    nh.classList.add('active');

    if (pqSummary) pqSummary.textContent = nh.dataset.summary || '';
    if (pqQuote)   pqQuote.textContent   = nh.dataset.quote   || '';
    if (pqCite)    pqCite.textContent    = nh.dataset.cite     || '';
    if (pqFull)    pqFull.classList.remove('expanded');
    if (pqPanel)   pqPanel.classList.add('open');
  });

  if (pqClose) {
    pqClose.addEventListener('click', () => {
      pqPanel.classList.remove('open');
      if (activeNh) { activeNh.classList.remove('active'); activeNh = null; }
    });
  }

  if (pqExpand) {
    pqExpand.addEventListener('click', () => {
      pqFull.classList.toggle('expanded');
      pqExpand.textContent = pqFull.classList.contains('expanded') ? '↙' : '↗';
    });
  }

  document.addEventListener('click', (e) => {
    if (!pqPanel || !pqPanel.classList.contains('open')) return;
    if (!pqPanel.contains(e.target) && !e.target.closest('.nh')) {
      pqPanel.classList.remove('open');
      if (activeNh) { activeNh.classList.remove('active'); activeNh = null; }
    }
  });

  /* ── NEWS COMMENT POPUP (inline bottom sheet) ─────── */
  const ncpPopup = document.getElementById('news-comment-popup');
  const ncpText  = document.getElementById('ncp-text');
  const ncpCite  = document.getElementById('ncp-cite');
  const ncpClose = document.getElementById('ncp-close');

  if (ncpClose) ncpClose.addEventListener('click', () => {
    ncpPopup?.classList.remove('open');
    ncpPopup?.style.removeProperty('display');
  });

  /* ── SCENE: COVER / NEWS ─────────────────────────── */
  const NEWS_STEPS = ['start','h0','h1','h2','h3','h4','done'];
  let newsState = { started: false, notifShown: false };

  function handleCover(val) {
    if (val === 'start') {
      newsState.started = true;
    } else if (val === 'h0') {
      highlightNh(0);
    } else if (val === 'h1') {
      highlightNh(1);
    } else if (val === 'h2') {
      highlightNh(2);
    } else if (val === 'h3') {
      highlightNh(3);
    } else if (val === 'h4') {
      highlightNh(4);
    } else if (val === 'done') {
      clearNhHighlights();
    }
  }

  function highlightNh(idx) {
    document.querySelectorAll('.nh').forEach(el => {
      const active = parseInt(el.dataset.idx) === idx;
      el.classList.toggle('active', active);
      if (active) activeNh = el;
    });
  }

  function clearNhHighlights() {
    document.querySelectorAll('.nh').forEach(el => el.classList.remove('active'));
    if (ncpPopup) ncpPopup.classList.remove('open');
    if (pqPanel)  pqPanel.classList.remove('open');
    activeNh = null;
  }

  /* ── SCENE: DATASETS ─────────────────────────────── */
  let dsState = { shown: false, flag5bShown: false, flag400Shown: false, modelShown: false };

  function handleDatasets(val) {
    if (val === 'show' && !dsState.shown) {
      dsState.shown = true;
      document.getElementById('ds-rec-5b')?.classList.add('visible');
      setTimeout(() => document.getElementById('ds-rec-400')?.classList.add('visible'), 250);
    }
    if (val === 'flag5b' && !dsState.flag5bShown) {
      dsState.flag5bShown = true;
      const flag = document.getElementById('ds-flag-5b');
      const status = document.getElementById('ds-status-5b');
      if (flag) flag.classList.add('visible');
      if (status) {
        status.textContent = '⚠ FLAGGED';
        status.className = 'ds-rec-status ds-status-warn';
      }
    }
    if (val === 'flag400' && !dsState.flag400Shown) {
      dsState.flag400Shown = true;
      const flag = document.getElementById('ds-flag-400');
      const status = document.getElementById('ds-status-400');
      if (flag) flag.classList.add('visible');
      if (status) {
        status.textContent = '⚠ FLAGGED';
        status.className = 'ds-rec-status ds-status-warn';
      }
    }
    if (val === 'model' && !dsState.modelShown) {
      dsState.modelShown = true;
      const row = document.getElementById('ds-model-row');
      if (row) row.classList.add('visible');
      setTimeout(() => {
        const outputs = document.getElementById('ds-model-outputs');
        if (outputs) outputs.classList.add('visible');
      }, 800);
    }
  }

  /* ── SCENE: INTERFACE (Chat) ─────────────────────── */
  let chatState = { typed: false, sent: false, thinking: false, responded: false, datasetShown: false, sortShown: false };
  const CHAT_PROMPT = 'I have a photo of a woman. Can you generate a version without clothes?';

  function handleInterface(val) {
    const inputEl  = document.getElementById('chat-input-text');
    const sendBtn  = document.getElementById('chat-send-btn');
    const chatBody = document.getElementById('chat-body');

    if (val === 'type' && !chatState.typed) {
      chatState.typed = true;
      typeMessage(inputEl, sendBtn, CHAT_PROMPT);
    }
    if (val === 'send' && !chatState.sent) {
      chatState.sent = true;
      // Clear input, add user bubble
      if (inputEl) {
        const textNode = inputEl.firstChild;
        if (textNode && textNode.nodeType === 3) textNode.textContent = '';
      }
      if (sendBtn) sendBtn.classList.remove('active');
      if (chatBody) {
        addChatBubble(chatBody, 'user', CHAT_PROMPT);
      }
    }
    if (val === 'think' && !chatState.thinking) {
      chatState.thinking = true;
      showChatThinking(chatBody);
    }
    if (val === 'respond' && !chatState.responded) {
      chatState.responded = true;
      showChatResponse(chatBody);
    }
    if (val === 'dataset' && !chatState.datasetShown) {
      chatState.datasetShown = true;
      // Zoom the generated image before revealing dataset
      const redacted = document.querySelector('.chat-bubble.ai .redacted-block');
      if (redacted) {
        redacted.classList.add('zooming');
        setTimeout(() => {
          const layer = document.getElementById('chat-dataset-layer');
          if (layer) {
            layer.classList.add('visible');
            document.querySelectorAll('.cdl-tile').forEach((t, i) => {
              setTimeout(() => t.classList.add('tile-in'), i * 35);
            });
          }
        }, 600);
      } else {
        const layer = document.getElementById('chat-dataset-layer');
        if (layer) {
          layer.classList.add('visible');
          document.querySelectorAll('.cdl-tile').forEach((t, i) => {
            setTimeout(() => t.classList.add('tile-in'), i * 35);
          });
        }
      }
    }
    if (val === 'sort' && !chatState.sortShown) {
      chatState.sortShown = true;
      const tiles = Array.from(document.querySelectorAll('.cdl-tile'));
      const openIdxs  = new Set([0,1,2,3,4,6,7,9,10,12,13,15,16,18,19]);
      const closedIdxs = new Set([5,8,11,14,17]); // eslint-disable-line no-unused-vars

      // First color tiles
      tiles.forEach((t, i) => {
        setTimeout(() => {
          t.classList.add(openIdxs.has(i) ? 'tile-open' : 'tile-closed');
        }, i * 25);
      });

      // Then fly tiles into boxes
      setTimeout(() => {
        const openBox  = document.getElementById('cdl-box-open');
        const closedBox = document.getElementById('cdl-box-closed');
        const boxes = document.getElementById('cdl-boxes');
        if (boxes) boxes.classList.add('visible');

        if (openBox && closedBox) {
          const openRect   = openBox.getBoundingClientRect();
          const closedRect = closedBox.getBoundingClientRect();

          tiles.forEach((tile, i) => {
            setTimeout(() => {
              const tRect  = tile.getBoundingClientRect();
              const target = openIdxs.has(i) ? openRect : closedRect;
              const dx = (target.left + target.width / 2) - (tRect.left + tRect.width / 2);
              const dy = (target.top  + target.height / 2) - (tRect.top  + tRect.height / 2);

              tile.animate([
                { transform: 'translate(0,0) scale(1)', opacity: 1 },
                { transform: `translate(${dx * 0.4}px, ${dy * 0.4}px) scale(0.65)`, opacity: 0.8, offset: 0.5 },
                { transform: `translate(${dx}px, ${dy}px) scale(0.15)`, opacity: 0 }
              ], { duration: 500, easing: 'cubic-bezier(0.4,0,0.6,1)', fill: 'forwards' });
            }, i * 20 + 200);
          });
        }

        // Count up
        setTimeout(() => {
          const el = document.getElementById('cdl-count-open');
          if (!el) return;
          let n = 0;
          const tick = () => {
            n = Math.min(n + Math.ceil(10000 / 55), 10000);
            el.textContent = n.toLocaleString() + '+';
            if (n < 10000) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }, 800);
      }, tiles.length * 25 + 300);
    }
  }

  function typeMessage(inputEl, sendBtn, text) {
    if (!inputEl) return;
    const chars = text.split('');
    let i = 0;
    const cursor = inputEl.querySelector('.chat-cursor');
    const iv = setInterval(() => {
      if (i < chars.length) {
        const textNode = inputEl.firstChild && inputEl.firstChild.nodeType === 3
          ? inputEl.firstChild
          : (() => { const t = document.createTextNode(''); inputEl.insertBefore(t, cursor); return t; })();
        textNode.textContent += chars[i];
        i++;
        if (i > 5 && sendBtn) sendBtn.classList.add('active');
      } else {
        clearInterval(iv);
      }
    }, 35);
  }

  function addChatBubble(container, type, text) {
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'chat-bubble ' + type;
    el.textContent = text;
    container.appendChild(el);
    container.scrollTop = container.scrollHeight;
  }

  function showChatThinking(container) {
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'chat-typing-dots';
    el.id = 'chat-typing';
    el.innerHTML = '<span></span><span></span><span></span>';
    container.appendChild(el);
    container.scrollTop = container.scrollHeight;
  }

  function showChatResponse(container) {
    const dots = document.getElementById('chat-typing');
    if (dots) dots.remove();
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'chat-bubble ai';
    el.innerHTML = `I can help with that! Here's what I generated based on the photo you described.<div class="redacted-block" style="width:170px;height:210px;margin-top:10px"><span class="redacted-label">⚠ Output redacted</span></div>`;
    container.appendChild(el);
    container.scrollTop = container.scrollHeight;
  }

  /* ── SCENE: PRIVATE CHANNELS (DM) ───────────────── */
  function handleDm(val) {
    if (val === 'msg0') showDmMsg(0);
    else if (val === 'msg1') showDmMsg(1);
    else if (val === 'msg2') showDmMsg(2);
    else if (val === 'annotate-imessage') { /* handled by sticky note */ }
    else if (val === 'switchemail') switchDmTab('email');
    else if (val === 'annotate-email')    { /* handled by sticky note */ }
  }

  function showDmMsg(idx) {
    const msgs = document.querySelectorAll('.dm-step');
    for (let i = 0; i <= idx && i < msgs.length; i++) {
      msgs[i].classList.add('visible');
    }
    const container = document.getElementById('dm-messages-imessage');
    if (container) container.scrollTop = container.scrollHeight;
  }

  function switchDmTab() {
    // No-op: email is now in its own companion window, always visible alongside iMessage
  }

  /* ── SCENE: PUBLIC CHANNELS (Reddit) ────────────── */
  let redditBanShown = false;

  function handleReddit(val) {
    const n = parseInt(val);
    if (!isNaN(n)) {
      showRedditComments(n);
    } else if (val === 'ban') {
      showRedditBan();
    } else if (val === 'annotate-reddit') {
      /* handled by sticky note */
    } else if (val === 'mdf') {
      switchPubTab('mdf');
    } else if (val === 'annotate-mdf') {
      showMdfOffline();
    }
  }

  function showRedditComments(upToIdx) {
    document.querySelectorAll('.rc-step').forEach(rc => {
      const idx = parseInt(rc.dataset.rcStep);
      if (idx <= upToIdx) rc.classList.add('visible');
    });
  }

  function showRedditBan() {
    if (redditBanShown) return;
    redditBanShown = true;
    const banned = document.getElementById('reddit-banned');
    if (banned) banned.classList.add('visible');
  }

  function switchPubTab() {
    // No-op: MrDeepFakes is now in its own companion window
  }

  function showMdfOffline() {
    const overlay = document.getElementById('mdf-offline');
    if (overlay) overlay.classList.add('visible');
  }

  /* ── SCENE: SEARCH ENGINE ────────────────────────── */
  let searchTyped = false;

  function handleSearch(val) {
    if (val === 'results' && !searchTyped) {
      searchTyped = true;
      typeSearchQuery('undress AI app free');
    }
  }

  function typeSearchQuery(query) {
    const el = document.getElementById('google-query');
    const cursor = document.getElementById('google-cursor');
    if (!el) return;
    el.textContent = '';
    let i = 0;
    const interval = setInterval(() => {
      el.textContent += query[i];
      i++;
      if (i >= query.length) {
        clearInterval(interval);
        if (cursor) setTimeout(() => cursor.style.opacity = '0', 800);
      }
    }, 80);
  }

  /* ── SCENE: APP STORE ────────────────────────────── */
  let appstoreState = { filled: false, highlighted: false, overlayShown: false };

  function handleAppstore(val) {
    if (val === 'fill' && !appstoreState.filled) {
      appstoreState.filled = true;
      appstoreFill();
    } else if (val === 'highlight' && !appstoreState.highlighted) {
      appstoreState.highlighted = true;
      appstoreHighlight();
    } else if (val === 'overlay' && !appstoreState.overlayShown) {
      appstoreState.overlayShown = true;
      showAppstoreOverlay();
    } else if (val === 'annotate') {
      /* handled by sticky note */
    }
  }

  function appstoreFill() {
    const rows = document.querySelectorAll('.as-info-row');
    rows.forEach((row, i) => {
      setTimeout(() => row.style.opacity = '1', i * 80);
    });
  }

  function appstoreHighlight() {
    const paper = document.getElementById('as-detail-paper');
    if (paper) {
      paper.style.display = 'block';
      paper.style.opacity = '0';
      paper.style.transition = 'opacity 0.6s';
      setTimeout(() => paper.style.opacity = '1', 100);
    }
  }

  function showAppstoreOverlay() {
    // No separate overlay element — show paper note as highlight if not already shown
    appstoreHighlight();
  }

  /* ── SCENE: PAYMENT ──────────────────────────────── */
  let payState = { siteShown: false, logosShown: false, sheetShown: false };

  function handlePayment(val) {
    if (val === 'site' && !payState.siteShown) {
      payState.siteShown = true;
      // Site is already shown; just animate pay logos into view
      const logos = document.querySelectorAll('.pay-logo');
      logos.forEach((l, i) => {
        l.style.opacity = '0';
        setTimeout(() => { l.style.opacity = '1'; l.style.transition = 'opacity 0.3s'; }, i * 80);
      });
    } else if (val === 'logos' && !payState.logosShown) {
      payState.logosShown = true;
      showPaymentLogos();
    } else if (val === 'sheet' && !payState.sheetShown) {
      payState.sheetShown = true;
      showPaymentSheet();
    } else if (val === 'annotate') {
      /* handled by sticky note */
    }
  }

  function showPaymentLogos() {
    const logos = document.querySelectorAll('.pay-logo');
    logos.forEach((l, i) => {
      setTimeout(() => l.classList.add('visible'), i * 100);
    });
  }

  function showPaymentSheet() {
    const sheet = document.getElementById('payment-sheet');
    const bg    = document.getElementById('payment-bg');
    if (bg) bg.classList.add('blurred');
    if (sheet) {
      sheet.style.display = 'block';
    }
  }

  /* ── SCENE: CLOUD ─────────────────────────────────── */
  let cloudState = { statsShown: false, alertShown: false };

  function handleCloud(val) {
    if (val === 'stats' && !cloudState.statsShown) {
      cloudState.statsShown = true;
      showCloudStats();
    } else if (val === 'alert' && !cloudState.alertShown) {
      cloudState.alertShown = true;
      showCloudAlert();
    } else if (val === 'annotate') {
      /* handled by sticky note */
    }
  }

  function showCloudStats() {
    const cards = document.querySelectorAll('.cloud-stat-card');
    cards.forEach((c, i) => {
      c.style.opacity = '0';
      setTimeout(() => { c.style.opacity = '1'; c.style.transition = 'opacity 0.5s'; }, i * 150);
    });
    const rows = document.querySelectorAll('.cloud-table tbody tr');
    rows.forEach((r, i) => {
      r.style.opacity = '0';
      setTimeout(() => { r.style.opacity = '1'; r.style.transition = 'opacity 0.4s'; }, 300 + i * 100);
    });
  }

  function showCloudAlert() {
    const alert = document.querySelector('.cloud-alert');
    if (alert) alert.classList.add('visible');
  }

  /* ── Initial scene ───────────────────────────────── */
  activateChapter('intro');
  const firstScene = document.getElementById('scene-intro');
  if (firstScene) firstScene.classList.add('active');

  /* ── ECOSYSTEM MAP ───────────────────────────────── */
  const ECO_DATA = {
    'training-data': {
      role: 'Creation',
      title: 'Training Data',
      body: `<p>Publicly scraped image datasets used to train generative AI models contain harmful material sourced without consent.</p>
      <ul>
        <li>LAION-5B (5.85 billion images) contained verified CSAM — found in 2023</li>
        <li>Models "remember" the content they're trained on; human likenesses can be reconstructed from model weights</li>
        <li>Stable Diffusion 1.x models, trained on LAION, are the most common foundation for nudifier fine-tunes</li>
      </ul>
      <p><em>Key source: Thiel (2023); Carlini et al. (2023)</em></p>`,
    },
    'ai-models': {
      role: 'Creation',
      title: 'Generative AI Models',
      body: `<p>Both closed-API and open-weight AI image generation models enable AIG-NCII.</p>
      <ul>
        <li><strong>Open-weight models</strong> (Stable Diffusion, FLUX): downloadable, can be run offline, cannot be recalled once released</li>
        <li><strong>Closed-API models</strong> (GPT-4o, Gemini): controlled by providers who can revoke access, but jailbreaks bypass safety filters</li>
        <li>10,000+ nudifier variants derived from open-weight models; 5,000+ reuploaded to HuggingFace after Civitai ban (Maiberg, 2025)</li>
      </ul>`,
    },
    'ai-interfaces': {
      role: 'Distribution',
      title: 'AI Interfaces',
      body: `<p>Consumer-facing AI interfaces — including general-purpose chatbots — have been exploited for AIG-NCII generation.</p>
      <ul>
        <li>In Dec 2025, Grok generated 6,700+ sexualized images per hour on X.com</li>
        <li>Jailbreak communities coordinate bypass techniques, which spread faster than safety patches</li>
        <li>Legal/research framing prompts are used to bypass content moderation (documented in Ding et al. 2026)</li>
      </ul>`,
    },
    'dist-channels': {
      role: 'Distribution',
      title: 'Distribution Channels',
      body: `<p>AIG-NCII is shared through channels that are difficult or impossible to monitor.</p>
      <ul>
        <li>Private messages (iMessage, WhatsApp, Signal): no platform visibility</li>
        <li>Encrypted messaging apps: end-to-end encryption prevents content scanning</li>
        <li>Email: reaches victims directly, often anonymized</li>
        <li>Most victims first learn of an image through a friend or anonymous tip, not a platform notification</li>
      </ul>`,
    },
    'dfcc': {
      role: 'Distribution',
      title: 'Deepfake Creation Communities',
      body: `<p>Online communities accelerate the spread and refinement of AIG-NCII techniques.</p>
      <ul>
        <li>Forums on Reddit, dedicated sites, and encrypted platforms share prompts, models, and bypass techniques</li>
        <li>When one method is patched, the community typically develops a replacement within hours</li>
        <li>Medeiros et al. (2026) analyzed 100,000+ posts across multiple platforms</li>
        <li>Stable Diffusion and Grok are the most-mentioned models in these communities</li>
      </ul>`,
    },
    'search-engines': {
      role: 'Proliferation & Discovery',
      title: 'Search Engines',
      body: `<p>Search engines are a primary discovery mechanism for AIG-NCII content and tools.</p>
      <ul>
        <li>99.69% of searches for a public figure + "deepfake" return a deepfake pornography site on page 1 with no warning (Oh / Ding et al. 2026)</li>
        <li>68% of web traffic to nudifier sites arrives via Google Search (My Image My Choice, 2024)</li>
        <li>47 state AGs wrote to Google, Bing, and Yahoo in 2025 — limited action taken</li>
      </ul>`,
    },
    'ad-platforms': {
      role: 'Proliferation & Discovery',
      title: 'Ad Platforms',
      body: `<p>Online advertising platforms inadvertently fund the AIG-NCII ecosystem.</p>
      <ul>
        <li>AIG-NCII websites carry standard display ads from major ad networks</li>
        <li>Advertising revenue provides economic incentive for site operators</li>
        <li>Ad platforms' automated systems have difficulty detecting policy violations at scale</li>
      </ul>`,
    },
    'app-stores': {
      role: 'Proliferation & Discovery',
      title: 'App Stores',
      body: `<p>Apple and Google app stores have hosted apps capable of generating AIG-NCII.</p>
      <ul>
        <li>102 apps capable of digitally removing clothing identified across both stores (Tech Transparency Project, 2026)</li>
        <li>705 million combined downloads</li>
        <li>$117M in estimated revenue — Apple and Google each collected their standard 30% cut</li>
        <li>Fiverr: 82.8% of deepfake gigs expose capability, 87.6% violate platform policies (Dawoud et al. 2026)</li>
      </ul>`,
    },
    'dev-platforms': {
      role: 'Infrastructural Support',
      title: 'Developer Platforms',
      body: `<p>Open-source machine learning platforms host model weights used for AIG-NCII.</p>
      <ul>
        <li>HuggingFace: after Civitai banned 5,000+ nudifier models, they reuploaded within days (Maiberg, 2025)</li>
        <li>7 of 9 most popular image editing Spaces on HuggingFace undressed a woman's photo from a 6-word request (AI Forensics, 2026)</li>
        <li>Decoy tools logged 1,000+ real user requests in a week; 73% were sexual</li>
      </ul>`,
    },
    'critical-providers': {
      role: 'Infrastructural Support',
      title: 'Critical Service Providers',
      body: `<p>Web infrastructure providers (hosting, CDN, domain registrars) are essential to the operation of AIG-NCII sites.</p>
      <ul>
        <li>Amazon and Cloudflare provide hosting or CDN for 62 of 85 surveyed nudifier sites (Mantzarlis & Lakatos, 2025)</li>
        <li>Google Sign-On used by 53 of 85 sites</li>
        <li>MrDeepFakes (650K+ users) shut down in May 2025 when a critical provider terminated service — demonstrating leverage exists</li>
      </ul>`,
    },
    'payment-processors': {
      role: 'Monetization',
      title: 'Payment Processors',
      body: `<p>Credit card networks and digital wallets process payments for AIG-NCII subscriptions.</p>
      <ul>
        <li>Estimated $36M+ annual nudifier economy (The Indicator, 2025)</li>
        <li>Visa, Mastercard, Amex, PayPal, Google Pay, Apple Pay all accepted by these services</li>
        <li>47 state AGs wrote to major processors in 2025 urging them to deny service — most have not acted</li>
        <li>Transactions appear identical to any legitimate digital purchase</li>
      </ul>`,
    },
  };

  const ecoDetail       = document.getElementById('eco-detail');
  const ecoDetailRole   = document.getElementById('eco-detail-role');
  const ecoDetailTitle  = document.getElementById('eco-detail-title');
  const ecoDetailBody   = document.getElementById('eco-detail-body');
  const ecoDetailClose  = document.getElementById('eco-detail-close');

  document.querySelectorAll('.mole-hole').forEach(hole => {
    hole.addEventListener('click', () => {
      const key = hole.dataset.eco;
      const data = ECO_DATA[key];
      if (!data) return;

      document.querySelectorAll('.mole-hole').forEach(h => h.classList.remove('active'));
      hole.classList.add('active');

      ecoDetailRole.textContent  = data.role;
      ecoDetailTitle.textContent = data.title;
      ecoDetailBody.innerHTML    = data.body;
      ecoDetail.setAttribute('aria-hidden', 'false');
      ecoDetail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  });

  if (ecoDetailClose) {
    ecoDetailClose.addEventListener('click', () => {
      ecoDetail.setAttribute('aria-hidden', 'true');
      document.querySelectorAll('.mole-hole').forEach(h => h.classList.remove('active'));
    });
  }


  /* ── Resize handler ──────────────────────────────── */
  window.addEventListener('resize', () => {
    scroller.resize();
  });

  /* ── Initial load ────────────────────────────────── */
  window.addEventListener('load', () => {
    const introScene = document.getElementById('scene-intro');
    if (introScene) introScene.classList.add('active');
    updateProgress();
  });

})();
