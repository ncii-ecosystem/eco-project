/* ============================================================
   The Ecosystem Behind the Image — scenes.js
   Scene animations, the research panel and shared utilities,
   used by main.js.
   ============================================================ */
(function () {
  'use strict';
  const Eco = window.Eco = {};

  // Always start at the top (the story is gated, so a restored mid-page scroll position would skip ahead)
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  /* ── Helpers ──────────────────────────────────────── */
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const prefersReducedMotion = () => reducedMotionQuery.matches;
  const scrollBehavior = () => (prefersReducedMotion() ? 'auto' : 'smooth');
  const escapeHtml = (str) => String(str).replace(/[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // Make a non-button element keyboard-operable (Enter / Space)
  function onActivate(el, handler, options) {
    el.addEventListener('click', handler, options);
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(e); }
    });
  }

  /* ── Reader preferences (best-effort; storage may be unavailable) ── */
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } },
  };

  Object.assign(Eco, { prefersReducedMotion, scrollBehavior, escapeHtml, onActivate, store });

  /* ── News paragraph stagger reveal ──────────────── */
  let newsParasRevealed = false;
  function revealNewsParas() {
    if (newsParasRevealed) return;
    newsParasRevealed = true;
    document.querySelectorAll('.news-article > p').forEach((p, i) => {
      setTimeout(() => p.classList.add('para-visible'), i * 300 + 100);
    });
  }

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

  /* ── SCENE: COVER / NEWS ─────────────────────────── */
  function handleCover(val) {
    if (val === 'h0') {
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
    if (pqPanel)  pqPanel.classList.remove('open');
    activeNh = null;
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
      revealDataset();
    }
    if (val === 'sort' && !chatState.sortShown) {
      chatState.sortShown = true;
      sortDataset();
    }
  }

  /* ── Assistant → models: the pull-back and the sort ─────────────────────
     Both are timed animations that start when their scroll step is reached and
     fully undo when the reader scrolls back above it (see handleStepExit). */
  let pending = [];              // timeouts for the running sequence
  let revealDoneAt = 0;          // when the pull-back finishes, so the sort never overlaps it
  let wallBuilt = false;
  let flightAnim = null;
  const later = (fn, ms) => { const id = setTimeout(fn, ms); pending.push(id); return id; };
  const clearPending = () => { pending.forEach(clearTimeout); pending = []; };

  function buildWall() {
    if (wallBuilt) return;
    wallBuilt = true;
    const grid = document.getElementById('cdl-grid');
    const real = Array.from(grid.querySelectorAll('.cdl-tile'));
    const special = grid.querySelector('.cdl-tile-special');
    // fill exactly the visible area (84px cells + 8px gaps), with the generated image near the centre
    const cols = Math.max(3, Math.floor((grid.clientWidth + 8) / 92));
    const rows = Math.max(3, Math.floor((grid.clientHeight + 8) / 92));
    const size = Math.max(real.length + 1, cols * rows - 3);      // the 2x2 tile takes four cells
    const specialSlot = Math.max(0, Math.floor(rows / 2) - 1) * cols + Math.max(0, Math.floor(cols / 2) - 1);
    const all = real.slice();
    for (let i = real.length; i < size; i++) {
      const t = document.createElement('div');
      t.className = 'cdl-tile cdl-tile-extra';
      grid.appendChild(t);
      all.push(t);
    }
    const others = all.filter(t => t !== special);
    for (let i = others.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [others[i], others[j]] = [others[j], others[i]];
    }
    let k = 0;
    for (let slot = 0; slot < size; slot++) {
      const t = slot === specialSlot ? special : others[k++];
      if (t) t.style.order = slot;
    }
  }

  function revealDataset() {
    const stage   = document.querySelector('.chat-stage');
    const layer   = document.getElementById('chat-dataset-layer');
    const chrome  = document.querySelector('.chat-chrome');
    if (!stage || !layer) return;
    buildWall();
    const tiles   = Array.from(layer.querySelectorAll('.cdl-tile'));
    const special = layer.querySelector('.cdl-tile-special');
    const source  = document.querySelector('.chat-bubble.ai .redacted-block');
    const reduced = prefersReducedMotion();

    layer.classList.add('visible');
    if (chrome) chrome.classList.add('leaving');

    const sr = stage.getBoundingClientRect();
    const tr = special ? special.getBoundingClientRect() : null;
    // tiles appear in rings around the generated image
    const fan = (t) => {
      const r = t.getBoundingClientRect();
      const d = tr ? Math.hypot(r.left - tr.left, r.top - tr.top) / Math.max(1, sr.width) : 0;
      return reduced ? 0 : 450 + d * 1100;
    };
    let last = 0;
    tiles.forEach((t) => { const ms = fan(t); last = Math.max(last, ms); later(() => t.classList.add('tile-in'), ms); });
    revealDoneAt = performance.now() + (reduced ? 0 : Math.max(last + 400, 1250));

    if (source && special && !reduced) {
      const rr = source.getBoundingClientRect();
      const flight = source.cloneNode(true);
      flight.classList.add('cdl-flight');
      Object.assign(flight.style, {
        position: 'absolute', margin: '0', zIndex: '12', pointerEvents: 'none',
        left: (rr.left - sr.left) + 'px', top: (rr.top - sr.top) + 'px',
        width: rr.width + 'px', height: rr.height + 'px',
      });
      stage.appendChild(flight);
      source.style.visibility = 'hidden';
      flightAnim = flight.animate([
        { left: flight.style.left, top: flight.style.top, width: flight.style.width, height: flight.style.height },
        { left: (tr.left - sr.left) + 'px', top: (tr.top - sr.top) + 'px', width: tr.width + 'px', height: tr.height + 'px' },
      ], { duration: 950, delay: 250, easing: 'cubic-bezier(0.65, 0, 0.25, 1)', fill: 'both' });
      flightAnim.onfinish = () => { special.classList.add('has-image'); flight.remove(); };
    } else if (special) {
      special.classList.add('has-image');
    }
  }

  function resetDataset() {
    clearPending();
    revealDoneAt = 0;
    if (flightAnim) { flightAnim.cancel(); flightAnim = null; }
    document.querySelectorAll('.cdl-flight').forEach(f => f.remove());
    const layer = document.getElementById('chat-dataset-layer');
    if (layer) {
      layer.classList.remove('visible');
      layer.querySelectorAll('.cdl-tile').forEach(t => t.classList.remove('tile-in', 'has-image'));
    }
    const chrome = document.querySelector('.chat-chrome');
    if (chrome) chrome.classList.remove('leaving');
    const source = document.querySelector('.chat-bubble.ai .redacted-block');
    if (source) source.style.visibility = '';
  }

  /* Sorting: the wall is coloured by kind, the extras fall away, and the tiles slide into two bins. */
  function sortDataset() {
    const layer = document.getElementById('chat-dataset-layer');
    const grid = document.getElementById('cdl-grid');
    const wellOpen = document.getElementById('cdl-well-open');
    const wellClosed = document.getElementById('cdl-well-closed');
    if (!layer || !grid || !wellOpen || !wellClosed) return;
    buildWall();
    const reduced = prefersReducedMotion();
    // never start while the pull-back is still settling
    const wait = reduced ? 0 : Math.max(0, revealDoneAt - performance.now());

    later(() => {
      const real = Array.from(grid.querySelectorAll('.cdl-tile:not(.cdl-tile-extra)'));
      const extras = Array.from(grid.querySelectorAll('.cdl-tile-extra'));
      const openIdxs = new Set([0,1,2,3,4,6,7,9,10,12,13,15,16,18,19]);
      const isOpen = (t) => openIdxs.has(real.indexOf(t));

      extras.forEach((t, i) => later(() => t.classList.add('tile-drop'), reduced ? 0 : i * 14));
      real.forEach((t, i) => later(() => t.classList.add(isOpen(t) ? 'tile-open' : 'tile-closed'), reduced ? 0 : 200 + i * 40));

      later(() => {
        const first = real.map(t => t.getBoundingClientRect());
        layer.classList.add('sorted');
        const boxes = document.getElementById('cdl-boxes');
        if (boxes) boxes.classList.add('visible');
        real.forEach((t) => (isOpen(t) ? wellOpen : wellClosed).appendChild(t));
        if (!reduced) {
          real.forEach((t, i) => {
            const end = t.getBoundingClientRect();
            const dx = first[i].left - end.left, dy = first[i].top - end.top;
            const sx = first[i].width / end.width;
            t.animate([
              { transform: `translate(${dx}px, ${dy}px) scale(${sx})` },
              { transform: 'none' },
            ], { duration: 750, delay: i * 28, easing: 'cubic-bezier(0.5, 0, 0.2, 1)', fill: 'backwards' });
          });
        }

        // The rest of the open-weights pile: many more copies, because they can't be recalled
        const mini = document.getElementById('cdl-mini-open');
        if (mini && !mini.childElementCount) {
          const frag = document.createDocumentFragment();
          for (let i = 0; i < 520; i++) {
            const m = document.createElement('span');
            m.className = 'cdl-mini-tile m' + (i % 3);
            m.style.setProperty('--i', reduced ? 0 : i);
            frag.appendChild(m);
          }
          later(() => mini.appendChild(frag), reduced ? 0 : 700);
        }

        later(() => {
          const el = document.getElementById('cdl-count-open');
          if (!el) return;
          if (reduced) { el.textContent = '10,000+'; return; }
          let n = 0;
          const tick = () => {
            n = Math.min(n + Math.ceil(10000 / 55), 10000);
            el.textContent = n.toLocaleString() + '+';
            if (n < 10000 && el.dataset.counting === '1') requestAnimationFrame(tick);
          };
          el.dataset.counting = '1';
          requestAnimationFrame(tick);
        }, reduced ? 0 : 500);
      }, reduced ? 0 : 200 + real.length * 40 + 350);
    }, wait);
  }

  function resetSort() {
    clearPending();
    const layer = document.getElementById('chat-dataset-layer');
    const grid = document.getElementById('cdl-grid');
    if (!layer || !grid) return;
    // put every tile back in the wall, in its original place
    document.querySelectorAll('#cdl-well-open .cdl-tile, #cdl-well-closed .cdl-tile').forEach(t => grid.appendChild(t));
    grid.querySelectorAll('.cdl-tile').forEach(t => t.classList.remove('tile-open', 'tile-closed', 'tile-drop'));
    layer.classList.remove('sorted');
    document.getElementById('cdl-boxes')?.classList.remove('visible');
    const mini = document.getElementById('cdl-mini-open');
    if (mini) mini.textContent = '';
    const count = document.getElementById('cdl-count-open');
    if (count) { count.dataset.counting = '0'; count.textContent = '0'; }
  }

  /* Scrolling back above a step undoes it, so the story plays forwards and backwards */
  Eco.handleStepExit = function (ds, direction) {
    if (direction === 'up' && ds.fin !== undefined && Eco.finale) Eco.finale.undo(ds.fin);
    if (direction !== 'up' || ds.chat === undefined) return;
    if (ds.chat === 'sort' && chatState.sortShown) {
      chatState.sortShown = false;
      resetSort();
    } else if (ds.chat === 'dataset' && chatState.datasetShown) {
      if (chatState.sortShown) { chatState.sortShown = false; resetSort(); }
      chatState.datasetShown = false;
      resetDataset();
    }
  };

  function typeMessage(inputEl, sendBtn, text) {
    if (!inputEl) return;
    if (prefersReducedMotion()) {
      inputEl.insertBefore(document.createTextNode(text), inputEl.querySelector('.chat-cursor'));
      if (sendBtn) sendBtn.classList.add('active');
      return;
    }
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
    }, 22);
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
    else if (val === 'annotate-imessage') showDmMsg(4);   // the last two messages arrive with the note
    else if (val === 'annotate-email')    { /* handled by sticky note */ }
  }

  /* Messages arrive one at a time; an incoming one shows a typing bubble first */
  let dmQueue = Promise.resolve();
  function showDmMsg(idx) {
    const container = document.getElementById('dm-messages-imessage');
    const msgs = Array.from(document.querySelectorAll('.dm-step'));
    msgs.filter((m, i) => i <= idx && !m.classList.contains('visible') && !m.dataset.queued).forEach((m) => {
      m.dataset.queued = '1';
      dmQueue = dmQueue.then(() => new Promise((resolve) => {
        const reveal = () => {
          m.classList.add('visible');
          if (container) container.scrollTop = container.scrollHeight;
          setTimeout(resolve, prefersReducedMotion() ? 0 : 200);
        };
        if (prefersReducedMotion() || !m.classList.contains('dm-in') || !container) { reveal(); return; }
        const typing = document.createElement('div');
        typing.className = 'dm-msg dm-in dm-typing visible';
        typing.setAttribute('aria-hidden', 'true');
        typing.innerHTML = '<span></span><span></span><span></span>';
        container.insertBefore(typing, m);
        container.scrollTop = container.scrollHeight;
        setTimeout(() => { typing.remove(); reveal(); }, 520);
      }));
    });
    if (container) container.scrollTop = container.scrollHeight;
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
    if (prefersReducedMotion()) {
      el.textContent = query;
      if (cursor) cursor.style.opacity = '0';
      return;
    }
    el.textContent = '';
    let i = 0;
    const interval = setInterval(() => {
      el.textContent += query[i];
      i++;
      if (i >= query.length) {
        clearInterval(interval);
        if (cursor) setTimeout(() => cursor.style.opacity = '0', 800);
      }
    }, 50);
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


  Eco.handleStep = function (ds, direction) {
    if (ds.news    !== undefined) handleCover(ds.news, direction);
    if (ds.chat    !== undefined) handleInterface(ds.chat, direction);
    if (ds.dm      !== undefined) handleDm(ds.dm, direction);
    if (ds.rc      !== undefined) handleReddit(ds.rc, direction);
    if (ds.search  !== undefined) handleSearch(ds.search, direction);
    if (ds.as      !== undefined) handleAppstore(ds.as, direction);
    if (ds.pay     !== undefined) handlePayment(ds.pay, direction);
    if (ds.cloud   !== undefined) handleCloud(ds.cloud, direction);
    if (ds.fin     !== undefined && Eco.finale) Eco.finale.step(ds.fin, direction);
  };
  Eco.revealNewsParas = revealNewsParas;

  /* ── Chapter config ───────────────────────────────── */
  Eco.CHAPTERS = [
    { id: 'intro',     label: 'Intro',      scene: 'scene-intro', url: '' },
    { id: 'cover',     label: 'TheRecord',  scene: 'cover',       url: 'news.example/technology/ai-image-abuse-investigation' },
    { id: 'interface', label: 'Assistant',  scene: 'interface',   url: 'assistant.example/chat' },
    { id: 'dm',        label: 'Private',    scene: 'dm',          url: 'messages.example/conversations' },
    { id: 'reddit',    label: 'Public',     scene: 'reddit',      url: 'forum.example/r/deepfakes' },
    { id: 'search',    label: 'Search',     scene: 'search',      url: 'search.example/?q=undress+AI+app+free' },
    { id: 'appstore',  label: 'Store',      scene: 'appstore',    url: 'store.example/app/nudify-ai-photo-editor' },
    { id: 'payment',   label: 'Checkout',   scene: 'payment',     url: 'undressaipro.ai/checkout?plan=monthly' },
    { id: 'cloud',     label: 'Cloud',      scene: 'cloud',       url: 'console.example/compute/instances' },
    { id: 'finale',    label: 'Finale',     scene: null,          url: '' },
  ];

  /* ── Notification content per chapter ───────────── */
  Eco.NOTIF_CONFIG = {
    cover:     { icon: '<span class="notif-folder notif-folder--neutral"><i class="fas fa-newspaper"></i></span>',          app: 'The Record',  title: 'When Grok Generated Thousands of Nude Images…', body: 'Five newsrooms. Five stories. One supply chain.' },
    interface: { icon: '<span class="notif-folder notif-folder--distribution"><i class="fas fa-magic"></i></span>',         app: 'Assistant',        title: 'New session — Aurora v3 · Image Generation',    body: 'Illustrative reconstruction of a jailbroken session.' },
    dm:        { icon: '<span class="notif-folder notif-folder--distribution"><i class="fas fa-comment"></i></span>',       app: 'Messages',    title: 'Private thread · anonymous community',           body: 'Coordinating jailbreaks out of public view.' },
    reddit:    { icon: '<span class="notif-folder notif-folder--distribution"><i class="fas fa-globe"></i></span>',         app: 'Forum',      title: 'r/deepfakes · new posts flooding in',            body: 'Public channels where communities organize.' },
    search:    { icon: '<span class="notif-folder notif-folder--discovery"><i class="fas fa-search"></i></span>',           app: 'Search',      title: 'Results for "undress AI app free"',              body: 'Discovery starts with a search.' },
    appstore:  { icon: '<span class="notif-folder notif-folder--discovery"><i class="fas fa-shopping-cart"></i></span>',    app: 'Store',   title: 'NudifyAI · Photo Editor',                        body: 'Illustrative listing — see the sourced figures.' },
    payment:   { icon: '<span class="notif-folder notif-folder--monetize"><i class="fas fa-hand-holding-usd"></i></span>',  app: 'Checkout',    title: 'UndressAI Pro — Monthly Plan',                   body: 'Stripe · Visa · Mastercard accepted.' },
    cloud:     { icon: '<span class="notif-folder notif-folder--infra"><i class="fas fa-cloud"></i></span>',                app: 'Cloud', title: 'EC2 instance · ap-southeast-1',                  body: 'Infrastructure most people never see.' },
  };

  /* ── Outro: once the closing footer scrolls in, the scene UI steps aside ── */
  const outro = document.querySelector('.endcard');
  if (outro) {
    const syncOutro = () => {
      const past = outro.getBoundingClientRect().top < window.innerHeight * 0.5;
      document.documentElement.classList.toggle('in-outro', past);
    };
    window.addEventListener('scroll', syncOutro, { passive: true });
    window.addEventListener('resize', syncOutro);
    syncOutro();
  }

})();
