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
  const arrowMotion = window.createStoryMotionScope(() => window.Eco.replaying);

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
    { chapter: 'appstore', win: 'appstore', sel: '.as-detail' },
  ];
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
    const active = window.Eco.navigation?.active;
    if (!active) return;
    SYNC.forEach(({ chapter, win, sel }) => {
      const w = document.querySelector(`.mac-window[data-chapter="${win}"]`);
      const chEl = document.querySelector(`.scroll-chapter[data-chapter="${chapter}"]`);
      const box = w && w.querySelector(sel);
      if (!box || !chEl) return;
      const max = box.scrollHeight - box.clientHeight;
      if (max <= 0) return;
      const steps = Array.from(chEl.querySelectorAll('.step'));
      const index = steps.indexOf(active);
      if (index < 0) return;
      let top = max * index / Math.max(1, steps.length - 1);
      if (chapter === 'cover' && active.dataset.news) {
        const post = box.querySelector(`.nh[data-idx="${active.dataset.news.slice(1)}"]`)?.closest('.feed-post');
        if (post) top = post.offsetTop - (box.clientHeight - post.offsetHeight) / 2;
      }
      top = Math.min(max, Math.max(0, top));
      if (chapter === 'cover') glideTo(box, top);   // the feed eases toward its place instead of jumping there
      else { box.scrollTop = top; box.style.setProperty('--sy', box.scrollTop + 'px'); }   // overlays inside the page (the ban card, the offline card) stay put while it scrolls
    });
  }
  let syncTicking = false;
  const queueSync = () => { if (!syncTicking) { syncTicking = true; requestAnimationFrame(syncWindows); } };
  window.addEventListener('story:step', queueSync);
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
    arrowEl.innerHTML = '<defs><marker id="wa-head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="var(--p)"/></marker><mask id="wa-reveal" maskUnits="userSpaceOnUse" x="-10000" y="-10000" width="20000" height="20000"><path class="wa-reveal-path" fill="none" stroke="white" stroke-width="12"/></mask></defs>' +
      '<path class="wa-line" fill="none" stroke="var(--p)" stroke-width="3" stroke-linecap="butt" stroke-dasharray="10 8" marker-end="url(#wa-head)"/>';
    monScreen.appendChild(arrowEl);
    return arrowEl;
  }
  Eco.arrow = {
    draw(tries) {
      const from = document.querySelector('#md-open .md-model-main');
      const to = document.querySelector('#devplat .dp-section .dp-h');
      if (!from || !to) return;
      // wait for both windows to finish opening/sliding, so the arrow lands where they actually end up
      const settled = (el) => { const w = el.closest('.mac-window'); const t = w ? getComputedStyle(w).transform : 'none'; return t === 'none' || t === 'matrix(1, 0, 0, 1, 0, 0)'; };
      const w1 = from.closest('.mac-window'), w2 = to.closest('.mac-window');
      const moving = !settled(from) || !settled(to) || (w1 && w1.getAnimations().length) || (w2 && w2.getAnimations().length);
      if (!Eco.replaying && moving && (tries || 0) < 30) { arrowMotion.setTimeout(() => Eco.arrow.draw((tries || 0) + 1), 120); return; }
      const svg = ensureArrow();
      const mr = monScreen.getBoundingClientRect();
      const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
      const x1 = a.right - mr.left + 6, y1 = a.top - mr.top + a.height / 2;
      const x2 = b.left - mr.left + 18, y2 = b.bottom - mr.top + 50;
      const dx = Math.max(40, (x2 - x1) * 0.5);
      const path = svg.querySelector('.wa-line');
      const reveal = svg.querySelector('.wa-reveal-path');
      path.setAttribute('d', `M ${x1} ${y1} C ${x1 + dx} ${y1 - 30}, ${x2 - dx} ${y2 - 30}, ${x2} ${y2}`);
      reveal.setAttribute('d', path.getAttribute('d'));
      svg.classList.add('show');
      svg.dataset.drawn = '1';
      if (Eco.replaying || reduced.matches) {
        reveal.getAnimations().forEach(animation => animation.cancel());
        path.removeAttribute('mask');
        path.style.strokeDasharray = '10 8'; path.style.strokeDashoffset = '0';
        path.style.markerEnd = 'url(#wa-head)';
        return;
      }
      // Reveal the dashed stroke with a mask, preserving its dash pattern throughout.
      const len = path.getTotalLength();
      path.setAttribute('mask', 'url(#wa-reveal)');
      reveal.style.strokeDasharray = `${len}`;
      reveal.style.strokeDashoffset = `${len}`;
      path.style.markerEnd = 'none';
      reveal.getAnimations().forEach((an) => an.cancel());
      const an = reveal.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: 900, easing: 'ease-out', fill: 'forwards' });
      an.onfinish = () => {
        path.removeAttribute('mask');
        path.style.markerEnd = 'url(#wa-head)';
      };
    },
    clear() { if (arrowEl) { arrowEl.classList.remove('show'); arrowEl.dataset.drawn = '0'; } },
    visible(on) { if (arrowEl && !on) arrowEl.classList.remove('show'); else if (arrowEl && on && arrowEl.dataset.drawn === '1') arrowEl.classList.add('show'); },
  };
})();
