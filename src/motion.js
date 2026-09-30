/* ============================================================
   motion.js — desktop-only choreography layered on main.js
   - windows pop out of their dock icon
   Nothing here is required for the story to work.
   ============================================================ */
(function () {
  'use strict';

  const monScreen = document.getElementById('mon-screen');
  if (!monScreen) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* Dock icon each chapter's window grows out of */
  const DOCK_TITLE = {
    cover: 'Feed', interface: 'Assistant', models: 'Models', devplat: 'Repos',
    reddit: 'Communities', mdf: 'Communities', dm: 'Channels', 'dm-email': 'Channels',
    appstore: 'Apps', search: 'Search', payment: 'Payments', cloud: 'Infrastructure',
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

  /* ── 3. A window's own scrolling follows the page scroll ────
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

  // the feed scrolls so that the post being discussed is in view.
  // The anchor points only change when the layout does, so they are measured once and reused on every scroll tick.
  let coverCache = null;
  function coverAnchors(chEl, box) {
    const vh = window.innerHeight;
    const key = [vh, box.clientWidth, box.clientHeight, box.scrollHeight, chEl.offsetHeight].join('|');
    if (coverCache && coverCache.key === key) return coverCache.anchors;
    const steps = Array.from(chEl.querySelectorAll('.step[data-news]'));
    const boxRect = box.getBoundingClientRect();
    const scale = boxRect.width / box.offsetWidth || 1;   // the window is scaled while it opens: measure in its own units
    const anchors = [{ y: pageTop(chEl), top: 0 }];
    steps.forEach((st) => {
      const m = /^h(\d)$/.exec(st.dataset.news || '');
      if (!m) return;
      const nh = box.querySelector(`.nh[data-idx="${m[1]}"]`);
      if (!nh) return;
      // centre the whole post in the space under the sticky header
      const post = nh.closest('.feed-post') || nh;
      const pr = post.getBoundingClientRect();
      const headH = (box.querySelector('.feed-top')?.offsetHeight || 0);
      const postTop = (pr.top - boxRect.top) / scale + box.scrollTop;
      const want = postTop - headH - Math.max(0, (box.clientHeight - headH - pr.height / scale) / 2);
      anchors.push({ y: pageTop(st) - vh * 0.8, top: Math.max(0, want) });   // posts arrive early: their steps trigger at 80%
    });
    anchors.push({ y: pageTop(chEl) + chEl.offsetHeight - vh, top: box.scrollHeight - box.clientHeight });
    anchors.sort((p, q) => p.y - q.y);
    for (let i = 1; i < anchors.length; i++) anchors[i].top = Math.max(anchors[i].top, anchors[i - 1].top);
    coverCache = { key, anchors };
    return anchors;
  }

  function coverTarget(chEl, box, y) {
    const anchors = coverAnchors(chEl, box);
    if (y <= anchors[0].y) return anchors[0].top;
    for (let i = 1; i < anchors.length; i++) {
      if (y <= anchors[i].y) {
        const a0 = anchors[i - 1], a1 = anchors[i];
        // rest on each post for the first and last part of the step, glide in between
        const t = clamp01((y - a0.y) / Math.max(1, a1.y - a0.y));
        const glide = clamp01((t - 0.12) / 0.76);
        return a0.top + (a1.top - a0.top) * (glide * glide * (3 - 2 * glide));
      }
    }
    return anchors[anchors.length - 1].top;
  }

  const glides = new WeakMap();
  function glideTo(box, top) {
    let g = glides.get(box);
    if (!g) { g = { raf: 0, target: top }; glides.set(box, g); }
    g.target = top;
    if (reduced.matches || g.raf) { if (reduced.matches) box.scrollTop = top; return; }
    const step = () => {
      const d = g.target - box.scrollTop;
      if (Math.abs(d) < 0.6) { box.scrollTop = g.target; g.raf = 0; return; }
      box.scrollTop += d * 0.22;
      g.raf = requestAnimationFrame(step);
    };
    g.raf = requestAnimationFrame(step);
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
      top = Math.min(max, Math.max(0, top));
      if (chapter === 'cover') glideTo(box, top);   // the feed eases toward its place instead of jumping there
      else { box.scrollTop = top; box.style.setProperty('--sy', box.scrollTop + 'px'); }   // overlays inside the page (the ban card, the offline card) stay put while it scrolls
    });
  }
  let syncTicking = false;
  const queueSync = () => { if (!syncTicking) { syncTicking = true; requestAnimationFrame(syncWindows); } };
  window.addEventListener('scroll', queueSync, { passive: true });
  window.addEventListener('resize', queueSync);
  new MutationObserver(() => setTimeout(queueSync, 700)).observe(monScreen, { childList: true });

  /* ── 4. An arrow from the open-weights panel to the developer platform ── */
  const SVGNS = 'http://www.w3.org/2000/svg';
  let arrowEl = null;
  function ensureArrow() {
    if (arrowEl) return arrowEl;
    arrowEl = document.createElementNS(SVGNS, 'svg');
    arrowEl.setAttribute('class', 'win-arrow');
    arrowEl.setAttribute('aria-hidden', 'true');
    arrowEl.innerHTML = '<defs><marker id="wa-head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#2b1d7a"/></marker></defs>' +
      '<path class="wa-line" fill="none" stroke="#2b1d7a" stroke-width="3" stroke-linecap="round" stroke-dasharray="1 9" marker-end="url(#wa-head)"/>';
    monScreen.appendChild(arrowEl);
    return arrowEl;
  }
  Eco.arrow = {
    draw(tries) {
      const from = document.getElementById('md-open');
      const to = document.querySelector('#devplat .dp-base');
      if (!from || !to) return;
      // wait for both windows to finish opening/sliding, so the arrow lands where they actually end up
      const settled = (el) => { const w = el.closest('.mac-window'); const t = w ? getComputedStyle(w).transform : 'none'; return t === 'none' || t === 'matrix(1, 0, 0, 1, 0, 0)'; };
      const w1 = from.closest('.mac-window'), w2 = to.closest('.mac-window');
      const moving = !settled(from) || !settled(to) || (w1 && w1.getAnimations().length) || (w2 && w2.getAnimations().length);
      if (moving && (tries || 0) < 30) { setTimeout(() => Eco.arrow.draw((tries || 0) + 1), 120); return; }
      const svg = ensureArrow();
      const mr = monScreen.getBoundingClientRect();
      const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
      const x1 = a.right - mr.left - 6, y1 = a.top - mr.top + Math.min(a.height * 0.4, 150);
      const x2 = b.left - mr.left - 4,  y2 = b.top - mr.top + Math.min(b.height / 2, 34);
      const dx = Math.max(40, (x2 - x1) * 0.5);
      const path = svg.querySelector('.wa-line');
      path.setAttribute('d', `M ${x1} ${y1} C ${x1 + dx} ${y1 - 30}, ${x2 - dx} ${y2 - 30}, ${x2} ${y2}`);
      svg.classList.add('show');
      svg.dataset.drawn = '1';
      if (reduced.matches) { path.style.strokeDasharray = 'none'; return; }
      // draw the line from its start to its end, then leave it as a dashed trail
      const len = path.getTotalLength();
      path.style.strokeDasharray = `${len}`;
      path.style.strokeDashoffset = `${len}`;
      path.getAnimations().forEach((an) => an.cancel());
      const an = path.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: 900, easing: 'ease-out', fill: 'forwards' });
      an.onfinish = () => { path.style.strokeDashoffset = '0'; path.style.strokeDasharray = '10 8'; };
    },
    clear() { if (arrowEl) { arrowEl.classList.remove('show'); arrowEl.dataset.drawn = '0'; } },
    visible(on) { if (arrowEl && !on) arrowEl.classList.remove('show'); else if (arrowEl && on && arrowEl.dataset.drawn === '1') arrowEl.classList.add('show'); },
  };
})();
