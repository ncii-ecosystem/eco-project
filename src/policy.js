/* ============================================================
   policy.js — the last part of the story: using the ecosystem to read the law (desktop only)
   It carries on from the map graph.js draws. Each scroll step adds one thing to it:
     law-intro   the gap: almost every law names people, not technologies
     law-fed     the federal TAKE IT DOWN Act lands on one box
     law-states  the state laws land on three boxes
     law-same    two laws, same technology, different wording
     law-new     a new law (Minnesota) is added to the map
     law-map     the U.S. state map
     law-gap     back on the ecosystem: which boxes the laws reach
     future-edge a link nobody has studied yet
     future-ripple an intervention spreading through the map
   Every step is a state, so skipping ahead or scrolling back just redraws the state.
   ============================================================ */
(function () {
  'use strict';

  const Eco = window.Eco;
  const mon = document.getElementById('mon-screen');
  const G = Eco && Eco.graph && Eco.graph.ext;
  if (!mon || !G) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const { root, svg, el, NODES, nodeEls, edgeEls, select, ICON } = G;

  const STEPS = ['law-intro', 'law-fed', 'law-states', 'law-same', 'law-new', 'law-map', 'law-gap', 'future-edge', 'future-ripple'];
  const nodeById = Object.fromEntries(NODES.map((n) => [n.id, n]));
  const nodeElById = Object.fromEntries(nodeEls.map((g) => [g.dataset.id, g]));

  /* ── the laws (the paper's Table 3 and Figure 2) ───────────── */
  const LAWS = [
    { n: 1, st: 'CA', name: 'California', bill: 'SB981', year: 2024, role: 'dist', icons: ['comment'],
      text: 'Requires “social media platforms” to provide a mechanism that is reasonably accessible to a reporting user.' },
    { n: 2, st: 'NY', name: 'New York', bill: 'A8808', year: 2024, role: 'dist', icons: ['comment'],
      text: 'Enables individuals to maintain an action or special proceeding for a court order to require “websites” to permanently remove non-consensually distributed intimate images.' },
    { n: 3, st: 'TN', name: 'Tennessee', bill: 'H0769', year: 2025, role: 'creation', icons: ['code', 'wand'],
      text: 'Makes it an offense for a person to knowingly “possess, distribute, or produce technology, software, or digital tools” designed for the purpose of creating material that includes a minor engaged in sexual activity or simulated sexual activity.' },
    { n: 4, st: 'AR', name: 'Arkansas', bill: 'HB1529', year: 2025, role: 'creation', icons: ['code', 'wand'],
      text: 'Enables the Attorney General to “institute a civil action on behalf of the state against a provider or developer of image generation technology” that was used to create deepfake visual material.' },
    { n: 5, st: 'TX', name: 'Texas', bill: 'SB441', year: 2025, role: 'creation', icons: ['code', 'wand'],
      text: 'Makes it an offense for an individual to non-consensually create intimate deepfakes. Does not apply to the “provider or developer of a publicly accessible artificial intelligence application or software” that was used in the creation of the deepfake media if they “included a prohibition against the creation of deep fake media … in terms and conditions or user policies” and “took affirmative steps to prevent the creation of deep fake media.”' },
    { n: 6, st: 'MN', name: 'Minnesota', bill: 'HF1606', year: 2026, role: 'creation', icons: ['wand'],
      text: 'Titled “Prohibition on Nudification Technology”. A person who owns or controls a website, application, software, program, or other service must not allow a user to access, download, or use it to nudify an image or video, or nudify an image or video on behalf of a user.' },
  ];
  const lawBySt = Object.fromEntries(LAWS.map((l) => [l.st, l]));

  /* ── tags on the boxes ────────────────────────────────────── */
  const TAG_W = 150, TAG_H = 42, TAG_GAP = 12, TAG_Y = 232;
  const tagLayer = el('g', { class: 'pol-tags' }, svg);
  const tags = [];

  function tag(nodeId, col, row, label, opts) {
    const n = nodeById[nodeId];
    const w = (opts && opts.w) || TAG_W;
    const x = n.x + 22 + col * (TAG_W + TAG_GAP);
    const y = n.y + TAG_Y + row * (TAG_H + TAG_GAP);
    const at = el('g', { transform: `translate(${x} ${y})` }, tagLayer);       // position
    const g = el('g', { class: 'pol-tag' + ((opts && opts.cls) ? ' ' + opts.cls : '') }, at);   // animation
    el('rect', { width: w, height: TAG_H, class: 'pol-tag-box' }, g);
    const t = el('text', { x: w / 2, y: TAG_H / 2 + 8, 'text-anchor': 'middle', class: 'pol-tag-text' }, g);
    t.textContent = label;
    tags.push({ g, min: opts.min, max: opts.max == null ? 99 : opts.max, delay: opts.delay || 0 });
    g.style.setProperty('--td', (opts.delay || 0) + 'ms');
  }
  const state = (l) => l.st + ' ' + l.bill;

  tag('dist-channels', 0, 0, 'TAKE IT DOWN Act', { w: 2 * TAG_W + TAG_GAP, cls: 'fed', min: 2, max: 7 });
  tag('dist-channels', 0, 1, state(lawBySt.CA), { min: 3, max: 7, delay: 0 });
  tag('dist-channels', 1, 1, state(lawBySt.NY), { min: 3, max: 7, delay: 140 });
  tag('ai-models', 0, 0, state(lawBySt.TN), { min: 3, max: 7, delay: 0 });
  tag('ai-models', 1, 0, state(lawBySt.AR), { min: 3, max: 7, delay: 140 });
  tag('ai-models', 0, 1, state(lawBySt.TX), { min: 3, max: 7, delay: 280 });
  tag('ai-models', 0, 2, 'MN HF1606 · not covered', { w: 2 * TAG_W + TAG_GAP, cls: 'gap', min: 5, max: 7 });
  tag('ai-interfaces', 0, 0, state(lawBySt.TN), { min: 3, max: 7, delay: 0 });
  tag('ai-interfaces', 1, 0, state(lawBySt.AR), { min: 3, max: 7, delay: 140 });
  tag('ai-interfaces', 0, 1, state(lawBySt.TX), { min: 3, max: 7, delay: 280 });
  tag('ai-interfaces', 1, 1, state(lawBySt.MN), { cls: 'new', min: 5, max: 7 });

  /* a "?" on the link nobody has studied */
  const qAt = el('g', { transform: 'translate(813 765)' }, svg);
  const q = el('g', { class: 'pol-q' }, qAt);
  el('circle', { r: 30, class: 'pol-q-dot' }, q);
  const qt = el('text', { y: 14, 'text-anchor': 'middle', class: 'pol-q-text' }, q); qt.textContent = '?';

  /* ── cards along the bottom ───────────────────────────────── */
  const layer = document.createElement('div');
  layer.className = 'pol-layer';
  layer.setAttribute('aria-live', 'polite');
  layer.innerHTML = `
    <div class="pol-band">
      <div class="pol-card pol-stat" data-stages="1"><b>5 of 63</b><p>state laws explicitly name a technology. Nearly all of the rest target the people who created, asked for or shared the images.</p></div>
      <div class="pol-card" data-stages="2"><h4>Federal · TAKE IT DOWN Act</h4><p>Public platforms must remove reported intimate images within 48 hours. On the map, that is one box.</p></div>
      <div class="pol-card" data-stages="3"><h4>State laws split in two</h4><p><b>California, New York</b> aim at distribution channels. <b>Tennessee, Arkansas, Texas</b> aim at the models and interfaces that create the images.</p></div>
      <div class="pol-card pol-two" data-stages="4">
        <h4>Same technology, different wording</h4>
        <div class="pol-pair">
          <blockquote><span>Tennessee · <em>designed for</em></span>“technology, software, or digital tools designed for the purpose of creating material…”</blockquote>
          <blockquote><span>Arkansas · <em>used to</em></span>“provider or developer of image generation technology that was used to create deepfake visual material”</blockquote>
        </div>
      </div>
      <div class="pol-card" data-stages="5"><h4>A new law goes on the map · Minnesota, May 2026</h4><blockquote>“…must not: (1) allow a user to access, download, or use the website, application, software, program, or other service to nudify an image or video; or (2) nudify an image or video on behalf of a user.”</blockquote><p>Interfaces are covered. Models are not.</p></div>
      <div class="pol-card pol-stat" data-stages="7"><b>3 of 11</b><p>categories are named by the laws mapped here: distribution channels, generative AI models and generative AI interfaces.</p></div>
      <div class="pol-card" data-stages="8"><h4>An edge nobody has studied</h4><p>How do generative AI models relate to the interfaces built on them? Nudifier apps say they use generative AI, but not which model.</p></div>
      <div class="pol-card" data-stages="9"><h4>One intervention, many ripples</h4><p>April 2025: a developer platform bans models of real people’s likeness. On the map, that reaches datasets, models, interfaces and, further down, app stores.</p></div>
    </div>`;
  mon.appendChild(layer);
  const cards = Array.from(layer.querySelectorAll('.pol-card'));

  /* ── the U.S. map: one tile per state ─────────────────────── */
  const GRID = {
    AK: [0, 0], ME: [11, 0], VT: [10, 1], NH: [11, 1],
    WA: [1, 2], ID: [2, 2], MT: [3, 2], ND: [4, 2], MN: [5, 2], IL: [6, 2], WI: [7, 2], MI: [8, 2], NY: [9, 2], RI: [10, 2], MA: [11, 2],
    OR: [1, 3], NV: [2, 3], WY: [3, 3], SD: [4, 3], IA: [5, 3], IN: [6, 3], OH: [7, 3], PA: [8, 3], NJ: [9, 3], CT: [10, 3],
    CA: [1, 4], UT: [2, 4], CO: [3, 4], NE: [4, 4], MO: [5, 4], KY: [6, 4], WV: [7, 4], VA: [8, 4], MD: [9, 4], DE: [10, 4],
    AZ: [2, 5], NM: [3, 5], KS: [4, 5], AR: [5, 5], TN: [6, 5], NC: [7, 5], SC: [8, 5], DC: [9, 5],
    OK: [4, 6], LA: [5, 6], MS: [6, 6], AL: [7, 6], GA: [8, 6],
    HI: [0, 7], TX: [4, 7], FL: [9, 7],
  };
  const T = 58, TG = 6;
  const map = document.createElement('section');
  map.className = 'pol-map';
  map.setAttribute('aria-label', 'Landscape of U.S. state laws regulating the AIG-NCII ecosystem');
  map.innerHTML = `
    <h3>Landscape of U.S. State Laws Regulating the AIG-NCII Ecosystem</h3>
    <ol class="pol-list">${LAWS.map((l) => `<li class="r-${l.role}"><span class="pol-n">${l.n}</span>${l.name} · ${l.bill} (${l.year})</li>`).join('')}</ol>
    <div class="pol-us-wrap"><svg class="pol-us" viewBox="0 0 ${12 * (T + TG)} ${8 * (T + TG)}" role="group"></svg></div>
    <div class="pol-role"><span>Role of technology in the ecosystem:</span><i class="sw r-creation"></i>Creation<i class="sw r-dist"></i>Distribution</div>`;
  mon.appendChild(map);
  const us = map.querySelector('.pol-us');
  Object.entries(GRID).forEach(([code, [c, r]]) => {
    const law = lawBySt[code];
    const g = el('g', { class: 'pol-state' + (law ? ' has r-' + law.role : ''), transform: `translate(${c * (T + TG)} ${r * (T + TG)})` }, us);
    if (law) { g.setAttribute('tabindex', '0'); g.setAttribute('role', 'button'); g.setAttribute('aria-label', `${law.name} ${law.bill}, ${law.year}: read what it says`); }
    el('rect', { width: T, height: T, class: 'pol-tile' }, g);
    const t = el('text', { x: T / 2, y: law ? 22 : T / 2 + 6, 'text-anchor': 'middle', class: 'pol-code' }, g); t.textContent = code;
    if (law) {
      const ic = el('text', { x: T / 2, y: 46, 'text-anchor': 'middle', class: 'pol-ic' }, g);
      ic.textContent = law.icons.map((k) => ICON[k]).join(' ');
      el('circle', { cx: 9, cy: 9, r: 9, class: 'pol-badge' }, g);
      const nn = el('text', { x: 9, y: 13, 'text-anchor': 'middle', class: 'pol-badge-n' }, g); nn.textContent = String(law.n);
      const open = () => showLaw(law);
      Eco.onActivate(g, open);
    }
  });

  /* a law opens in the Notes window, like every other box on the map */
  function showLaw(law) {
    if (!Eco.showNote) return;
    clickedState = true; updateHint();
    const step = document.createElement('div');
    step.className = 'step step--k';
    step.dataset.nkey = 'law-' + law.st;
    const label = document.createElement('span'); label.className = 'step-label'; label.textContent = `${law.name} · ${law.bill} (${law.year})`;
    const key = document.createElement('p'); key.className = 'step-key-text'; key.textContent = law.text;
    const det = document.createElement('div'); det.className = 'step-detail';
    step.append(label, key, det);
    Eco.showNote(step);
  }

  /* ── a hint that things can be clicked ───────────────────────
     On the ecosystem map and on the state map, a pill says so until the reader has clicked something. */
  const hint = document.createElement('div');
  hint.className = 'pol-hint';
  hint.setAttribute('aria-hidden', 'true');
  hint.innerHTML = '<i class="fas fa-hand-pointer"></i><span></span>';
  mon.appendChild(hint);
  let stage = 0;
  let clickedBox = false, clickedState = false;
  root.addEventListener('click', (e) => { if (e.target.closest('.eg-node')) { clickedBox = true; updateHint(); } });
  root.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.closest && e.target.closest('.eg-node')) { clickedBox = true; updateHint(); } });

  function updateHint() {
    let text = '';
    if (stage === 6 && !clickedState) text = 'Click a highlighted state to read its law';
    else if (stage !== 6 && root.classList.contains('live') && !clickedBox) text = 'Click any box to read about it';
    hint.querySelector('span').textContent = text;
    hint.classList.toggle('on', !!text);
  }
  new MutationObserver(updateHint).observe(root, { attributes: true, attributeFilter: ['class'] });

  /* ── the states of the view ───────────────────────────────── */
  let timers = [];
  const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); return id; };
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

  const FOCUS = {
    2: ['dist-channels'],
    3: ['dist-channels', 'ai-models', 'ai-interfaces'], 4: ['dist-channels', 'ai-models', 'ai-interfaces'],
    5: ['dist-channels', 'ai-models', 'ai-interfaces'], 7: ['dist-channels', 'ai-models', 'ai-interfaces'],
    8: ['ai-models', 'ai-interfaces'],
  };
  const RIPPLE = [['dev-platforms'], ['training-data', 'ai-models'], ['ai-interfaces'], ['app-stores']];

  const edgeBetween = (a, b) => edgeEls.find((g) => g.dataset.a === a && g.dataset.b === b);

  function setFocus(ids) {
    const set = ids && new Set(ids);
    nodeEls.forEach((g) => g.classList.toggle('pol-dim', !!set && !set.has(g.dataset.id)));
  }

  function apply(n) {
    clearTimers();
    stage = n;
    if (n > 0) select(null);
    root.dataset.pol = String(n);
    root.classList.toggle('pol-on', n >= 2 && n <= 7);          // the boxes' small print gives way to the law tags
    root.classList.toggle('pol-away', n === 6);                 // the state map takes the screen
    root.classList.toggle('pol-edge-focus', n === 8);
    const link = edgeBetween('ai-models', 'ai-interfaces');
    if (link) link.classList.toggle('pol-edge', n === 8);
    tags.forEach((t) => t.g.classList.toggle('on', n >= t.min && n <= t.max));
    cards.forEach((c) => c.classList.toggle('on', (c.dataset.stages || '').split(' ').includes(String(n))));
    map.classList.toggle('on', n === 6);
    nodeEls.forEach((g) => g.classList.remove('pol-ripple'));
    updateHint();

    if (n === 9) {
      setFocus(RIPPLE[0]);
      const shown = [];
      RIPPLE.forEach((ids, i) => later(() => {
        shown.push(...ids);
        setFocus(shown);
        ids.forEach((id) => nodeElById[id] && nodeElById[id].classList.add('pol-ripple'));
      }, reduced.matches ? 0 : 300 + i * 650));
    } else {
      setFocus(FOCUS[n] || null);
    }
  }

  Eco.policy = {
    STEPS,
    step(name) { const i = STEPS.indexOf(name); if (i >= 0) apply(i + 1); },
    undo(name) { const i = STEPS.indexOf(name); if (i >= 0) apply(i); },
    reset() { apply(0); },
  };
})();
