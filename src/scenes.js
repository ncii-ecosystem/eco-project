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

  /* ── Notification chime (synthesised, so there is no audio file to load) ── */
  const sound = (() => {
    let ctx = null;
    let on = store.get('eco-sound') !== '0';
    const make = () => {
      if (ctx) return ctx;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) { try { ctx = new AC(); } catch (e) { ctx = null; } }
      return ctx;
    };
    const unlock = () => { const c = make(); if (c && c.state === 'suspended') c.resume().catch(() => {}); };
    // browsers only allow sound after the reader has interacted: the first click or key unlocks it
    ['pointerdown', 'keydown'].forEach((ev) => window.addEventListener(ev, unlock, { once: true, passive: true }));
    function tone(c, freq, start, dur, vol) {
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(vol, start + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      o.connect(g); g.connect(c.destination);
      o.start(start); o.stop(start + dur + 0.05);
    }
    return {
      unlock,
      get on() { return on; },
      set(v) { on = !!v; store.set('eco-sound', on ? '1' : '0'); if (on) this.notify(); },
      notify() {
        if (!on) return;
        const c = make();
        if (!c) return;
        if (c.state === 'suspended') c.resume().catch(() => {});
        const t = c.currentTime + 0.02;
        tone(c, 880, t, 0.22, 0.09);
        tone(c, 1318.5, t + 0.11, 0.42, 0.08);
      },
    };
  })();
  Eco.sound = sound;


  /* ── Highlights in the feed: each headline opens a small pop-up (Notes only arrives after the five posts) ── */
  let activeNh = null;

  function hidePops() {
    document.querySelectorAll('.nh-pop.show').forEach((p) => p.classList.remove('show'));
  }
  function showPop(nh) {
    hidePops();
    nh.closest('.feed-post')?.querySelector('.nh-pop')?.classList.add('show');
  }
  function showComments(idx) {
    document.querySelectorAll('.post-comments').forEach((el) => el.classList.toggle('show', el.dataset.for === String(idx)));
  }
  function pick(nh) {
    showComments(nh.dataset.idx);
    if (activeNh && activeNh !== nh) activeNh.classList.remove('active');
    activeNh = nh;
    nh.classList.add('active');
    showPop(nh);
  }

  document.addEventListener('click', (e) => {
    if (e.target.closest('.np-x')) { hidePops(); return; }
    const nh = e.target.closest('.nh');
    if (nh) pick(nh);
  });
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList?.contains('nh')) { e.preventDefault(); pick(e.target); }
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
      if (active) { activeNh = el; showPop(el); showComments(idx); }
    });
  }

  function clearNhHighlights() {
    document.querySelectorAll('.nh').forEach(el => el.classList.remove('active'));
    hidePops();
    showComments(-1);
    activeNh = null;
  }

  /* ── SCENE: INTERFACE (Chat) ─────────────────────── */
  let chatState = { typed: false, sent: false, thinking: false, responded: false, datasetShown: false, scanShown: false, returned: false, modelClicked: false };
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
    if (val === 'scan' && !chatState.scanShown) {
      chatState.scanShown = true;
      scanDataset();
    }
    if (val === 'return' && !chatState.returned) {
      chatState.returned = true;
      returnToChat();
    }
    if (val === 'model' && !chatState.modelClicked) {
      chatState.modelClicked = true;
      clickModel();
    }
  }

  /* ── Assistant → dataset → back to the assistant → models ───────────────
     The pull-back into the dataset, the CSAM scan, the zoom back into the chat and the
     click on the model are timed animations that start when their scroll step is reached
     and fully undo when the reader scrolls back above it (see handleStepExit). */
  let pending = [];              // timeouts for the running sequence
  let revealDoneAt = 0;          // when the pull-back finishes, so the sort never overlaps it
  let wallBuilt = false;
  let flightAnim = null;
  const later = (fn, ms) => { const id = setTimeout(fn, ms); pending.push(id); return id; };
  const clearPending = () => { pending.forEach(clearTimeout); pending = []; };

  let wallKey = '';
  function buildWall() {
    const grid = document.getElementById('cdl-grid');
    if (!grid) return;
    // fill exactly the visible area (84px cells + 8px gaps), with the generated image near the centre;
    // if the window has been resized since, lay the wall out again for the new size
    const cols = Math.max(3, Math.floor((grid.clientWidth + 8) / 92));
    const rows = Math.max(3, Math.floor((grid.clientHeight + 8) / 92));
    const key = cols + 'x' + rows;
    if (key === wallKey) return;
    wallKey = key;
    wallBuilt = true;
    const special = grid.querySelector('.cdl-tile-special');
    const all = Array.from(grid.querySelectorAll('.cdl-tile'));
    const size = Math.max(all.length, cols * rows - 3);      // the 2x2 tile takes four cells
    const specialSlot = Math.max(0, Math.floor(rows / 2) - 1) * cols + Math.max(0, Math.floor(cols / 2) - 1);
    for (let i = all.length; i < size; i++) {
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
    for (let slot = 0; slot < all.length; slot++) {
      const t = slot === specialSlot ? special : others[k++];
      if (t) t.style.order = slot;
    }
  }

  // the window can be resized, or still be settling when the wall is first built: lay the wall out again to fit
  (() => {
    const g = document.getElementById('cdl-grid');
    if (!g || !('ResizeObserver' in window)) return;
    let t = null;
    new ResizeObserver(() => { clearTimeout(t); t = setTimeout(() => { if (chatState.datasetShown) buildWall(); }, 200); }).observe(g);
  })();

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
    setCdlStep(1);

    const sr = stage.getBoundingClientRect();
    const tr = special ? special.getBoundingClientRect() : null;
    // tiles appear in rings around the generated image
    const fan = (t) => {
      const r = t.getBoundingClientRect();
      const d = tr ? Math.hypot(r.left - tr.left, r.top - tr.top) / Math.max(1, sr.width) : 0;
      return reduced ? 0 : 200 + d * 700;
    };
    // all reads first, then one batch of writes; the staggering is a CSS transition-delay, so there are no per-tile timers
    let last = 0;
    const delays = tiles.map((t) => { const ms = fan(t); last = Math.max(last, ms); return ms; });
    layer.classList.add('revealing');
    tiles.forEach((t, i) => { t.style.transitionDelay = delays[i] + 'ms'; });
    void layer.offsetWidth;
    tiles.forEach((t) => t.classList.add('tile-in'));
    later(() => { tiles.forEach((t) => { t.style.transitionDelay = ''; }); layer.classList.remove('revealing'); }, last + 800);
    revealDoneAt = performance.now() + (reduced ? 0 : Math.max(last + 300, 900));

    if (source && special && !reduced) {
      const rr = source.getBoundingClientRect();
      const flight = source.cloneNode(true);
      flight.classList.add('cdl-flight');
      Object.assign(flight.style, {
        position: 'absolute', margin: '0', zIndex: '12', pointerEvents: 'none',
        left: (rr.left - sr.left) + 'px', top: (rr.top - sr.top) + 'px',
        width: rr.width + 'px', height: rr.height + 'px',
        transformOrigin: '0 0', willChange: 'transform',
      });
      stage.appendChild(flight);
      source.style.visibility = 'hidden';
      // move it with a transform (compositor only) instead of animating left/top/width/height every frame
      const dx = tr.left - rr.left, dy = tr.top - rr.top;
      flightAnim = flight.animate([
        { transform: 'none' },
        { transform: `translate(${dx}px, ${dy}px) scale(${tr.width / rr.width}, ${tr.height / rr.height})` },
      ], { duration: 750, delay: 100, easing: 'cubic-bezier(0.65, 0, 0.25, 1)', fill: 'both' });
      flightAnim.onfinish = () => { special.classList.add('has-image'); flight.remove(); };
    } else if (special) {
      special.classList.add('has-image');
    }
  }

  function resetDataset() {
    clearPending();
    resetScan();
    revealDoneAt = 0;
    if (flightAnim) { flightAnim.cancel(); flightAnim = null; }
    document.querySelectorAll('.cdl-flight').forEach(f => f.remove());
    const layer = document.getElementById('chat-dataset-layer');
    if (layer) {
      layer.classList.remove('visible');
      layer.classList.remove('revealing');
      layer.querySelectorAll('.cdl-tile').forEach(t => { t.classList.remove('tile-in', 'has-image'); t.style.transitionDelay = ''; });
    }
    const chrome = document.querySelector('.chat-chrome');
    if (chrome) chrome.classList.remove('leaving');
    const source = document.querySelector('.chat-bubble.ai .redacted-block');
    if (source) source.style.visibility = '';
  }

  /* the three-line explainer under the dataset heading lights up one line at a time */
  function setCdlStep(n) {
    document.querySelectorAll('#cdl-steps li').forEach((li) => li.classList.toggle('on', Number(li.dataset.k) <= n && n > 0));
    document.querySelectorAll('#cdl-steps li').forEach((li) => li.classList.toggle('now', Number(li.dataset.k) === n));
  }

  /* The scan: a bar sweeps the wall and the tiles it passes over turn red (CSAM detected) */
  const SCAN_MS = 1500;
  let scanAnim = null;
  function scanDataset() {
    const layer = document.getElementById('chat-dataset-layer');
    const grid = document.getElementById('cdl-grid');
    const bar = document.getElementById('cdl-scanbar');
    const out = document.getElementById('cdl-flagged');
    if (!layer || !grid || !bar) return;
    const reduced = prefersReducedMotion();
    setCdlStep(2);
    layer.classList.add('scanning');
    const tiles = Array.from(grid.querySelectorAll('.cdl-tile:not(.cdl-tile-special)'));
    const gr = grid.getBoundingClientRect(), lr = layer.getBoundingClientRect();
    // a spread-out handful, taken only from the tiles that are fully on screen
    const inView = tiles.filter((t) => { const r = t.getBoundingClientRect(); return r.top >= gr.top - 1 && r.bottom <= gr.bottom + 1; });
    const flagged = inView.filter((_, i) => i % 4 === 1);
    Object.assign(bar.style, { left: (gr.left - lr.left) + 'px', width: gr.width + 'px', top: (gr.top - lr.top) + 'px' });
    if (!reduced) {
      scanAnim = bar.animate([{ transform: 'translateY(0)', opacity: 1 }, { transform: `translateY(${gr.height}px)`, opacity: 1 }],
        { duration: SCAN_MS, easing: 'linear', fill: 'both' });
    }
    let n = 0;
    flagged.forEach((t) => {
      const at = reduced ? 0 : 150 + ((t.getBoundingClientRect().top - gr.top) / Math.max(1, gr.height)) * SCAN_MS;
      later(() => { t.classList.add('flagged'); n += 1; if (out) out.textContent = String(n); }, at);
    });
    later(() => { layer.classList.remove('scanning'); bar.style.opacity = '0'; }, reduced ? 0 : SCAN_MS + 300);
  }

  function resetScan() {
    if (scanAnim) { scanAnim.cancel(); scanAnim = null; }
    const layer = document.getElementById('chat-dataset-layer');
    if (layer) layer.classList.remove('scanning');
    document.querySelectorAll('#cdl-grid .cdl-tile.flagged').forEach((t) => t.classList.remove('flagged'));
    const out = document.getElementById('cdl-flagged'); if (out) out.textContent = '0';
    const bar = document.getElementById('cdl-scanbar'); if (bar) bar.style.opacity = '';
    setCdlStep(0);
  }

  /* The image zooms back out of the dataset into the chat bubble it came from */
  // step 3 of the explainer ("models train on everything") lights up first and is left to be read, then the image goes back
  function returnToChat() {
    setCdlStep(3);
    if (prefersReducedMotion()) { flyBackToChat(); return; }
    later(flyBackToChat, 1700);
  }
  function flyBackToChat() {
    const stage = document.querySelector('.chat-stage');
    const layer = document.getElementById('chat-dataset-layer');
    const chrome = document.querySelector('.chat-chrome');
    const special = layer && layer.querySelector('.cdl-tile-special');
    const source = document.querySelector('.chat-bubble.ai .redacted-block');
    if (!stage || !layer) return;
    const reduced = prefersReducedMotion();
    const finish = () => {
      layer.classList.remove('visible');
      if (chrome) chrome.classList.remove('leaving');
      if (source) source.style.visibility = '';
      if (special) special.classList.remove('has-image');
    };
    if (!special || !source || reduced) { later(finish, reduced ? 0 : 600); return; }
    // measure where the image has to land once the chat is back at full size
    let prevT = '';
    if (chrome) { prevT = chrome.style.transition; chrome.style.transition = 'none'; chrome.classList.remove('leaving'); }
    const rr = source.getBoundingClientRect();
    const sr = stage.getBoundingClientRect();
    const tr = special.getBoundingClientRect();
    if (chrome) { void chrome.offsetWidth; chrome.style.transition = prevT; }
    const flight = source.cloneNode(true);
    flight.classList.add('cdl-flight');
    Object.assign(flight.style, {
      position: 'absolute', margin: '0', zIndex: '12', pointerEvents: 'none', visibility: 'visible',
      left: (tr.left - sr.left) + 'px', top: (tr.top - sr.top) + 'px', width: tr.width + 'px', height: tr.height + 'px',
      transformOrigin: '0 0', willChange: 'transform',
    });
    stage.appendChild(flight);
    special.classList.remove('has-image');
    flightAnim = flight.animate([
      { transform: 'none' },
      { transform: `translate(${rr.left - tr.left}px, ${rr.top - tr.top}px) scale(${rr.width / tr.width}, ${rr.height / tr.height})` },
    ], { duration: 800, delay: 100, easing: 'cubic-bezier(0.65, 0, 0.25, 1)', fill: 'both' });
    later(() => layer.classList.remove('visible'), 450);
    flightAnim.onfinish = () => { flight.remove(); finish(); };
  }

  function undoReturn() {
    clearPending();
    if (flightAnim) { flightAnim.cancel(); flightAnim = null; }
    document.querySelectorAll('.cdl-flight').forEach(f => f.remove());
    const layer = document.getElementById('chat-dataset-layer');
    const chrome = document.querySelector('.chat-chrome');
    const special = layer && layer.querySelector('.cdl-tile-special');
    const source = document.querySelector('.chat-bubble.ai .redacted-block');
    if (layer) layer.classList.add('visible');
    if (chrome) chrome.classList.add('leaving');
    if (source) source.style.visibility = 'hidden';
    if (special) special.classList.add('has-image');
    setCdlStep(chatState.scanShown ? 2 : 1);
  }

  /* The cursor clicks the model picker; the models window opens */
  function clickModel() {
    const sel = document.getElementById('chat-model-select');
    if (!sel || !Eco.cursor || prefersReducedMotion()) { later(() => Eco.advanceTo && Eco.advanceTo('models'), prefersReducedMotion() ? 0 : 300); return; }
    later(() => {
      Eco.cursor.to(sel, () => {
        sel.classList.add('cursor-press');
        later(() => { sel.classList.remove('cursor-press'); Eco.cursor.hide(); if (Eco.advanceTo) Eco.advanceTo('models'); }, 550);
      });
    }, 250);
  }
  function undoModel() {
    clearPending();
    const sel = document.getElementById('chat-model-select');
    if (sel) sel.classList.remove('cursor-press');
    if (Eco.cursor) Eco.cursor.hide();
  }

  /* ── SCENE: MODELS — open weights vs. closed ──────────────────────────── */
  let mdTimers = [];
  const mdLater = (fn, ms) => { const id = setTimeout(fn, ms); mdTimers.push(id); return id; };
  const mdClear = () => { mdTimers.forEach(clearTimeout); mdTimers = []; };

  function revealPoints(panel) {
    panel.querySelectorAll('.md-points li').forEach((li, i) => mdLater(() => li.classList.add('on'), 350 + i * 300));
  }
  function countTo(el, end, ms, suffix) {
    if (!el) return;
    if (prefersReducedMotion()) { el.textContent = end.toLocaleString() + (suffix || ''); return; }
    const t0 = performance.now();
    const tick = (now) => {
      if (el.dataset.run !== '1') return;
      const k = Math.min(1, (now - t0) / ms);
      el.textContent = Math.max(1, Math.round(end * (k * k))).toLocaleString() + (k === 1 ? (suffix || '') : '');
      if (k < 1) requestAnimationFrame(tick);
    };
    el.dataset.run = '1';
    requestAnimationFrame(tick);
  }

  function modelsOpen() {
    const panel = document.getElementById('md-open');
    const copies = document.getElementById('md-copies');
    if (!panel || !copies || panel.classList.contains('run')) return;
    panel.classList.add('run');
    const n = prefersReducedMotion() ? 40 : 54;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < n; i++) {
      const c = document.createElement('span');
      c.className = 'md-copy c' + (i % 4);
      c.style.setProperty('--i', i);
      c.style.setProperty('--x', (Math.random() * 100).toFixed(1) + '%');
      c.style.setProperty('--y', (Math.random() * 100).toFixed(1) + '%');
      frag.appendChild(c);
    }
    copies.appendChild(frag);
    requestAnimationFrame(() => requestAnimationFrame(() => copies.querySelectorAll('.md-copy').forEach((c) => c.classList.add('in'))));
    countTo(document.getElementById('md-count'), 10000, 1600, '+');
    revealPoints(panel);
  }

  function modelsClosed() {
    const panel = document.getElementById('md-closed');
    const reqs = document.getElementById('md-reqs');
    if (!panel || !reqs || panel.classList.contains('run')) return;
    panel.classList.add('run');
    // a stream of requests: most pass, the ones that break the rules stop at the guardrails
    const kinds = ['ok', 'ok', 'no', 'ok', 'no', 'ok', 'ok', 'no'];
    kinds.forEach((k, i) => {
      const r = document.createElement('span');
      r.className = 'md-req ' + k;
      r.style.setProperty('--d', (i * 0.55) + 's');
      reqs.appendChild(r);
    });
    revealPoints(panel);
  }

  function resetModels() {
    mdClear();
    ['md-open', 'md-closed'].forEach((id) => {
      const p = document.getElementById(id);
      if (!p) return;
      p.classList.remove('run');
      p.querySelectorAll('.md-points li').forEach((li) => li.classList.remove('on'));
    });
    const copies = document.getElementById('md-copies'); if (copies) copies.textContent = '';
    const reqs = document.getElementById('md-reqs'); if (reqs) reqs.textContent = '';
    const c = document.getElementById('md-count'); if (c) { c.dataset.run = '0'; c.textContent = '1'; }
  }

  /* ── SCENE: DEVELOPER PLATFORM — open-weight models are hosted here ──── */
  function devplatPlay() {
    const rows = document.getElementById('dp-rows');
    const count = document.getElementById('dp-count');
    const scene = document.getElementById('devplat');
    if (!rows || !scene || scene.classList.contains('played')) return;
    scene.classList.add('played');
    const frag = document.createDocumentFragment();
    const tags = [['fine-tune', 'likeness'], ['fine-tune'], ['fine-tune', 'likeness'], ['fine-tune', 'nsfw'], ['fine-tune']];
    for (let i = 0; i < 14; i++) {
      const r = document.createElement('div');
      r.className = 'dp-row';
      r.style.setProperty('--i', i);
      const id = String(1000 + ((i * 7919) % 9000));
      r.innerHTML = `<i class="fas fa-cube"></i><b>open-base-ft-${id}</b>` + tags[i % tags.length].map((t) => `<span class="dp-tag">${t}</span>`).join('') + `<em>${(3 + (i * 37) % 90)}k</em>`;
      frag.appendChild(r);
    }
    rows.appendChild(frag);
    requestAnimationFrame(() => requestAnimationFrame(() => rows.querySelectorAll('.dp-row').forEach((r) => r.classList.add('in'))));
    count.dataset.run = '1';
    countTo(count, 35000, 1800, '');
  }
  function devplatReset() {
    const rows = document.getElementById('dp-rows'); if (rows) rows.textContent = '';
    const scene = document.getElementById('devplat'); if (scene) scene.classList.remove('played');
    const count = document.getElementById('dp-count'); if (count) { count.dataset.run = '0'; count.textContent = '0'; }
  }

  function handleModels(val) {
    if (val === 'open') modelsOpen();
    else if (val === 'closed') modelsClosed();
    else if (val === 'move') {
      if (Eco.fx && Eco.fx.splitModels) Eco.fx.splitModels();
      mdLater(devplatPlay, 900);
    }
  }

  /* Scrolling back above a step undoes it, so the story plays forwards and backwards */
  Eco.handleStepExit = function (ds, direction) {
    if (direction !== 'up') return;
    if (ds.fin !== undefined && Eco.finale) Eco.finale.undo(ds.fin);
    if (ds.search === 'ads') resetAds();
    if (ds.md === 'move') { mdClear(); devplatReset(); if (Eco.fx && Eco.fx.unsplitModels) Eco.fx.unsplitModels(); }
    else if (ds.md === 'open' || ds.md === 'closed') {
      // scrolling back above a panel's step resets that panel
      const id = ds.md === 'open' ? 'md-open' : 'md-closed';
      const p = document.getElementById(id);
      if (p) { p.classList.remove('run'); p.querySelectorAll('.md-points li').forEach((li) => li.classList.remove('on')); }
      if (ds.md === 'open') { const c = document.getElementById('md-copies'); if (c) c.textContent = ''; const n = document.getElementById('md-count'); if (n) { n.dataset.run = '0'; n.textContent = '1'; } }
      else { const r = document.getElementById('md-reqs'); if (r) r.textContent = ''; }
    }
    if (ds.chat === undefined) return;
    if (ds.chat === 'model' && chatState.modelClicked) { chatState.modelClicked = false; undoModel(); }
    else if (ds.chat === 'return' && chatState.returned) { chatState.returned = false; undoReturn(); }
    else if (ds.chat === 'scan' && chatState.scanShown) { chatState.scanShown = false; resetScan(); setCdlStep(1); }
    else if (ds.chat === 'dataset' && chatState.datasetShown) {
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
    }, 16);
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
    if (val === 'ads') showAds();
  }

  /* pop-up ads arrive one after another over the results */
  let adTimers = [];
  function showAds() {
    const box = document.getElementById('sr-ads');
    if (!box || box.classList.contains('on')) return;
    box.classList.add('on');
    box.querySelectorAll('.sr-ad').forEach((ad, i) => {
      adTimers.push(setTimeout(() => ad.classList.add('in'), prefersReducedMotion() ? 0 : 350 + i * 650));
    });
  }
  function resetAds() {
    adTimers.forEach(clearTimeout); adTimers = [];
    const box = document.getElementById('sr-ads');
    if (!box) return;
    box.classList.remove('on');
    box.querySelectorAll('.sr-ad').forEach((ad) => ad.classList.remove('in'));
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
    document.querySelector('.as-detail-info-grid')?.classList.add('as-highlight');
  }

  function showAppstoreOverlay() {
    // No separate overlay element: the highlight is the same as the previous step
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
    if (ds.md      !== undefined) handleModels(ds.md, direction);
    if (ds.dm      !== undefined) handleDm(ds.dm, direction);
    if (ds.rc      !== undefined) handleReddit(ds.rc, direction);
    if (ds.search  !== undefined) handleSearch(ds.search, direction);
    if (ds.as      !== undefined) handleAppstore(ds.as, direction);
    if (ds.pay     !== undefined) handlePayment(ds.pay, direction);
    if (ds.cloud   !== undefined) handleCloud(ds.cloud, direction);
    if (ds.fin     !== undefined && Eco.finale) Eco.finale.step(ds.fin, direction);
  };

  /* ── Chapter config ───────────────────────────────── */
  Eco.CHAPTERS = [
    { id: 'intro',     label: 'Intro',      scene: 'scene-intro', url: '' },
    { id: 'cover',     label: 'Feed',       scene: 'cover',       url: 'scrollr.example/explore' },
    { id: 'interface', label: 'Assistant',  scene: 'interface',   url: 'assistant.example/chat' },
    { id: 'models',    label: 'Models',     scene: 'models',      url: 'models.example/compare' },
    { id: 'reddit',    label: 'Public',     scene: 'reddit',      url: 'forum.example/c/faceswaps' },
    { id: 'search',    label: 'Search',     scene: 'search',      url: 'search.example/?q=undress+AI+app+free' },
    { id: 'appstore',  label: 'Store',      scene: 'appstore',    url: 'store.example/app/nudify-ai-photo-editor' },
    { id: 'payment',   label: 'Checkout',   scene: 'payment',     url: 'undressaipro.ai/checkout?plan=monthly' },
    { id: 'cloud',     label: 'Cloud',      scene: 'cloud',       url: 'console.example/compute/instances' },
    { id: 'dm',        label: 'Private',    scene: 'dm',          url: 'messages.example/conversations' },
    { id: 'finale',    label: 'Finale',     scene: null,          url: '' },
  ];

  /* ── Notification content per chapter ───────────── */
  Eco.NOTIF_CONFIG = {
    cover:     { icon: '<span class="notif-folder notif-folder--neutral"><i class="fas fa-camera-retro"></i></span>',          app: 'Scrollr',  title: 'Five headlines. Five different stories.', body: 'Trending now. Tap to open your feed.' },
    interface: { icon: '<span class="notif-folder notif-folder--distribution"><i class="fas fa-magic"></i></span>',         app: 'Assistant',        title: 'New session — Image model v3',    body: 'Illustrative reconstruction of a jailbroken session.' },
    dm:        { icon: '<span class="notif-folder notif-folder--distribution"><i class="fas fa-comment"></i></span>',       app: 'Messages',    title: 'Private thread · unknown contact',           body: 'Shared out of public view, before any platform sees it.' },
    models:    { icon: '<span class="notif-folder notif-folder--creation"><i class="fas fa-code"></i></span>',            app: 'Models',      title: 'Open weights vs. closed models',  body: 'The same model, released in two ways.' },
    reddit:    { icon: '<span class="notif-folder notif-folder--distribution"><i class="fas fa-globe"></i></span>',         app: 'Forum',      title: 'c/faceswaps · new posts flooding in',            body: 'Deepfake creation communities, in the open.' },
    search:    { icon: '<span class="notif-folder notif-folder--discovery"><i class="fas fa-search"></i></span>',           app: 'Search',      title: 'Results for "undress AI app free"',              body: 'Discovery starts with a search.' },
    appstore:  { icon: '<span class="notif-folder notif-folder--discovery"><i class="fas fa-shopping-cart"></i></span>',    app: 'Store',   title: 'NudifyAI · Photo Editor',                        body: 'Illustrative listing — see the sourced figures.' },
    payment:   { icon: '<span class="notif-folder notif-folder--monetize"><i class="fas fa-hand-holding-usd"></i></span>',  app: 'Checkout',    title: 'UndressAI Pro — Monthly Plan',                   body: 'Cards and wallets accepted.' },
    cloud:     { icon: '<span class="notif-folder notif-folder--infra"><i class="fas fa-cloud"></i></span>',                app: 'Cloud', title: 'Compute instance · region-1',                  body: 'Infrastructure most people never see.' },
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
