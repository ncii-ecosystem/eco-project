/* ============================================================
   motion.js — desktop-only choreography layered on main.js
   - windows pop out of their dock icon
   - the chapter dots become a chain that fills as you go
   Nothing here is required for the story to work.
   ============================================================ */
(function () {
  'use strict';

  const monScreen = document.getElementById('mon-screen');
  if (!monScreen) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* Dock icon each chapter's window grows out of */
  const DOCK_TITLE = {
    cover: 'The Record', interface: 'Assistant', dm: 'Messages', reddit: 'Communities',
    search: 'Search', appstore: 'Store', payment: 'Checkout', cloud: 'Cloud',
    'dm-email': 'Messages', mdf: 'Communities',
  };

  function dockItem(chapter) {
    const title = DOCK_TITLE[chapter];
    return title ? document.querySelector(`.dt-dock-item[title="${title}"]`) : null;
  }

  /* ── 1. Pop out of the dock ───────────────────────────── */
  function setOrigin(win) {
    const item = dockItem(win.dataset.chapter);
    if (!item) return;
    const s = monScreen.getBoundingClientRect();
    const d = item.getBoundingClientRect();
    const ox = d.left + d.width / 2 - s.left - win.offsetLeft;
    const oy = d.top + d.height / 2 - s.top - win.offsetTop;
    win.style.transformOrigin = `${Math.round(ox)}px ${Math.round(oy)}px`;
  }

  /* ── Watch windows: set the dock origin when each one spawns ── */
  const seen = new WeakSet();

  function onWindow(win) {
    if (seen.has(win)) return;
    seen.add(win);
    setOrigin(win);
  }

  new MutationObserver((records) => {
    records.forEach((r) => r.addedNodes.forEach((n) => {
      if (n.nodeType === 1 && n.classList.contains('mac-window')) onWindow(n);
    }));
  }).observe(monScreen, { childList: true });

  /* ── 3. Chapter chain ─────────────────────────────────── */
  const nav = document.getElementById('chapter-nav');
  function syncChain() {
    if (!nav) return;
    const dots = Array.from(nav.querySelectorAll('.chapter-dot'));
    const idx = dots.findIndex((d) => d.classList.contains('active'));
    dots.forEach((d, i) => d.classList.toggle('done', idx > -1 && i < idx));
  }
  if (nav) new MutationObserver(syncChain).observe(nav, { attributes: true, subtree: true, attributeFilter: ['class'] });

  /* ── 4. A window's own scrolling follows the page scroll ────
     One gesture moves both, so the reader never has to scroll inside a window. */
  const SYNC = [
    { chapter: 'cover',    win: 'cover',    sel: '.news-stage' },
    { chapter: 'dm',       win: 'dm-email', sel: '.email-body' },
    { chapter: 'reddit',   win: 'reddit',   sel: '.pub-screen-reddit' },
    { chapter: 'reddit',   win: 'mdf',      sel: '.mdf-stage' },
    { chapter: 'search',   win: 'search',   sel: '.search-stage' },
    { chapter: 'appstore', win: 'appstore', sel: '.as-detail' },
    { chapter: 'cloud',    win: 'cloud',    sel: '.cloud-stage' },
  ];
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const pageTop = (el) => el.getBoundingClientRect().top + window.scrollY;

  // the article scrolls so that the highlight being discussed is in view
  function coverTarget(chEl, box, y) {
    const vh = window.innerHeight;
    const steps = Array.from(chEl.querySelectorAll('.step[data-news]'));
    const boxTop = box.getBoundingClientRect().top - box.scrollTop;
    const anchors = [{ y: pageTop(chEl), top: 0 }];
    steps.forEach((st) => {
      const m = /^h(\d)$/.exec(st.dataset.news || '');
      if (!m) return;
      const nh = box.querySelector(`.nh[data-idx="${m[1]}"]`);
      if (!nh) return;
      const want = nh.getBoundingClientRect().top - boxTop - box.clientHeight * 0.3;
      anchors.push({ y: pageTop(st) - vh * 0.5, top: Math.max(0, want) });
    });
    anchors.push({ y: pageTop(chEl) + chEl.offsetHeight - vh, top: box.scrollHeight - box.clientHeight });
    anchors.sort((p, q) => p.y - q.y);
    for (let i = 1; i < anchors.length; i++) anchors[i].top = Math.max(anchors[i].top, anchors[i - 1].top);
    if (y <= anchors[0].y) return anchors[0].top;
    for (let i = 1; i < anchors.length; i++) {
      if (y <= anchors[i].y) {
        const a0 = anchors[i - 1], a1 = anchors[i];
        return a0.top + (a1.top - a0.top) * clamp01((y - a0.y) / Math.max(1, a1.y - a0.y));
      }
    }
    return anchors[anchors.length - 1].top;
  }

  function syncWindows() {
    syncTicking = false;
    if (monScreen.classList.contains('finale-mode')) return;
    const y = window.scrollY;
    SYNC.forEach(({ chapter, win, sel }) => {
      const w = document.querySelector(`.mac-window[data-chapter="${win}"]`);
      const chEl = document.querySelector(`.scroll-chapter[data-chapter="${chapter}"]`);
      const box = w && w.querySelector(sel);
      if (!box || !chEl) return;
      const max = box.scrollHeight - box.clientHeight;
      if (max <= 0) return;
      let top;
      if (chapter === 'cover') top = coverTarget(chEl, box, y);
      else {
        const range = Math.max(1, chEl.offsetHeight - window.innerHeight);
        top = max * clamp01((y - pageTop(chEl)) / range);
      }
      box.scrollTop = Math.min(max, Math.max(0, top));
    });
  }
  let syncTicking = false;
  const queueSync = () => { if (!syncTicking) { syncTicking = true; requestAnimationFrame(syncWindows); } };
  window.addEventListener('scroll', queueSync, { passive: true });
  window.addEventListener('resize', queueSync);
  new MutationObserver(() => setTimeout(queueSync, 700)).observe(monScreen, { childList: true });
})();
