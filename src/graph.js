/* ============================================================
   graph.js — the map the windows resolve into (desktop only)
   The paper's diagram of the technologies behind AIG-NCII, drawn as an SVG.
   Every box can be clicked: its explanation opens in the Notes window.
   finale.js drives how much of it is visible while the reader scrolls.
   ============================================================ */
(function () {
  'use strict';

  const Eco = window.Eco;
  const mon = document.getElementById('mon-screen');
  if (!Eco || !mon) return;

  const NS = 'http://www.w3.org/2000/svg';
  const W = 1648, H = 1628;                       // the figure's own coordinate space

  /* role → fill colour (the site's pastel chips) */
  const ROLE = {
    creation: 'var(--r-creation)', distribution: 'var(--r-dist)', discovery: 'var(--r-prolif)',
    infra: 'var(--r-infra)', money: 'var(--r-money)',
  };

  /* Icons are Font Awesome glyphs */
  const ICON = {
    cart: '', bullhorn: '', search: '', laptop: '', database: '', code: '',
    wand: '', comment: '', users: '', tools: '', money: '',
  };

  /* Boxes. Lines: ['h', text] = bold sub-heading, ['m', text] = example line. */
  const NODES = [
    { id: 'app-stores', role: 'discovery', x: 862, y: 38, w: 325, h: 124, icon: 'cart', title: 'App Stores',
      lines: [['m', '(e.g. Google Play,'], ['m', 'Apple Store)']], wide: false, small: true },
    { id: 'ad-platforms', role: 'discovery', x: 862, y: 202, w: 325, h: 107, icon: 'bullhorn', title: 'Ad Platforms',
      lines: [['m', '(e.g. Instagram, TikTok)']], small: true },
    { id: 'search-engines', role: 'discovery', x: 862, y: 349, w: 736, h: 108, icon: 'search', title: 'Search Engines',
      lines: [['m', '(e.g. Google, Bing, Yahoo)']], wide: true },
    { id: 'dev-platforms', role: 'infra', x: 28, y: 349, w: 749, h: 108, icon: 'laptop', title: 'Developer Platforms',
      lines: [['m', '(e.g. Github, Civitai, Hugging Face)']], wide: true },
    { id: 'training-data', role: 'creation', x: 28, y: 530, w: 323, h: 505, icon: 'database', title: 'Training Datasets', tall: true,
      lines: [['h', 'Open Data'], ['m', '(e.g. ImageNet, LAION-5B)'], ['gap'], ['h', 'Closed Data'], ['m', '(e.g., Proprietary datasets)']] },
    { id: 'ai-models', role: 'creation', x: 437, y: 530, w: 338, h: 505, icon: 'code', title: 'Generative AI Models', tall: true,
      lines: [['h', 'Open Source Models'], ['m', '(e.g. DeepFaceLab, DeepNude)'], ['gap'],
              ['h', 'Open Weight Models &'], ['h', 'Variants'], ['m', '(e.g. Stable Diffusion, Flux)'], ['gap'],
              ['h', 'Closed Models'], ['m', '(e.g. Aurora, GPT models,'], ['m', 'Gemini models)']] },
    { id: 'ai-interfaces', role: 'creation', x: 862, y: 530, w: 325, h: 505, icon: 'wand', title: 'Generative AI Interfaces', tall: true,
      lines: [['h', 'General Purpose Model'], ['h', 'Interfaces'], ['m', '(e.g. Grok, ChatGPT, Gemini)'], ['gap'],
              ['h', 'AI Nudifier Applications'], ['m', '(e.g. ClothesOff)']] },
    { id: 'dist-channels', role: 'distribution', x: 1273, y: 530, w: 325, h: 505, icon: 'comment', title: 'Distribution Channels', tall: true,
      lines: [['h', 'Private Channels'], ['m', '(e.g., Email, iMessage,'], ['m', 'Telegram)'], ['gap'],
              ['h', 'Public Platforms'], ['m', '(e.g., Mr. DeepFakes, X)']] },
    { id: 'dfcc', role: 'discovery', x: 28, y: 1131, w: 1570, h: 144, icon: 'users', title: 'Deepfake Creation Communities', wide: true,
      lines: [['hm', 'Private Channels', ' (e.g. Telegram, Discord)'], ['hm', 'Public Platforms', ' (e.g. r/deepfakes, Mr.DeepFakes)']] },
    { id: 'critical-providers', role: 'infra', x: 28, y: 1320, w: 1570, h: 122, icon: 'tools', title: 'Critical Service Providers', wide: true,
      lines: [['m', 'Cloud Service Providers, Domain Name Services, and Authentication Services']] },
    { id: 'payment-processors', role: 'money', x: 26, y: 1487, w: 1572, h: 116, icon: 'money', title: 'Payment Processors', wide: true,
      lines: [['m', '(e.g. Visa, Mastercard, cryptocurrencies)']] },
  ];

  /* Links between boxes; `dir` says where the arrowhead goes */
  const XS = [189, 606, 1024, 1436];
  const EDGES = [
    { a: 'app-stores', b: 'ad-platforms', d: 'M1024 162 V202', dots: [[1024, 162], [1024, 202]] },
    { a: 'ad-platforms', b: 'search-engines', d: 'M1024 309 V349', dots: [[1024, 309], [1024, 349]] },
    { a: 'dev-platforms', b: 'training-data', d: 'M187 457 V520', dots: [[187, 457]], head: [187, 530, 'down'] },
    { a: 'dev-platforms', b: 'ai-models', d: 'M606 457 V520', dots: [[606, 457]], head: [606, 530, 'down'] },
    { a: 'search-engines', b: 'ai-interfaces', d: 'M1024 457 V520', dots: [[1024, 457]], head: [1024, 530, 'down'] },
    { a: 'search-engines', b: 'dist-channels', d: 'M1436 457 V520', dots: [[1436, 457]], head: [1436, 530, 'down'] },
    { a: 'training-data', b: 'ai-models', d: 'M351 765 H427', dots: [[351, 765]], head: [437, 765, 'right'], accent: true },
    { a: 'ai-models', b: 'ai-interfaces', d: 'M775 765 H852', dots: [[775, 765]], head: [862, 765, 'right'] },
    { a: 'ai-interfaces', b: 'dist-channels', d: 'M1187 765 H1263', dots: [[1187, 765]], head: [1273, 765, 'right'] },
  ];
  const COMMUNITY_TARGETS = ['training-data', 'ai-models', 'ai-interfaces', 'dist-channels'];
  XS.forEach((x, i) => {
    EDGES.push({ a: 'dfcc', b: COMMUNITY_TARGETS[i], d: `M${x} 1131 V1045`, dots: [[x, 1131]], head: [x, 1035, 'up'] });
    EDGES.push({ a: 'dfcc', b: 'critical-providers', d: `M${x} 1275 V1320`, dots: [[x, 1275], [x, 1320]] });
    EDGES.push({ a: 'critical-providers', b: 'payment-processors', d: `M${x} 1442 V1487`, dots: [[x, 1442], [x, 1487]] });
  });

  /* What each box says when it is opened (from the paper and the reporting used in the story) */
  const DETAILS = {
    'training-data': { role: 'Creation', title: 'Training Datasets', body: `<p>Publicly scraped image datasets used to train generative AI models contain harmful material sourced without consent.</p>
      <ul><li>LAION-5B (5.85 billion images) contained verified CSAM — found in 2023</li>
      <li>Models "remember" the content they're trained on; human likenesses can be reconstructed from model weights</li>
      <li>Stable Diffusion 1.x models, trained on LAION, are the most common foundation for nudifier fine-tunes</li></ul>
      <p><em>Key source: Thiel (2023); Carlini et al. (2023)</em></p>` },
    'ai-models': { role: 'Creation', title: 'Generative AI Models', body: `<p>Both closed-API and open-weight AI image generation models enable AIG-NCII.</p>
      <ul><li>Open-weight models (Stable Diffusion, FLUX): downloadable, can be run offline, cannot be recalled once released</li>
      <li>Closed-API models (GPT-4o, Gemini): controlled by providers who can revoke access, but jailbreaks bypass safety filters</li>
      <li>10,000+ nudifier variants derived from open-weight models; 5,000+ reuploaded to HuggingFace after Civitai ban (Maiberg, 2025)</li></ul>` },
    'ai-interfaces': { role: 'Creation', title: 'Generative AI Interfaces', body: `<p>Consumer-facing AI interfaces — including general-purpose chatbots — have been exploited for AIG-NCII generation.</p>
      <ul><li>In Dec 2025, Grok generated 6,700+ sexualized images per hour on X.com</li>
      <li>Jailbreak communities coordinate bypass techniques, which spread faster than safety patches</li>
      <li>Legal/research framing prompts are used to bypass content moderation (documented in Ding et al. 2026)</li></ul>` },
    'dist-channels': { role: 'Distribution', title: 'Distribution Channels', body: `<p>AIG-NCII is shared through channels that are difficult or impossible to monitor.</p>
      <ul><li>Private messages (iMessage, WhatsApp, Signal): no platform visibility</li>
      <li>Encrypted messaging apps: end-to-end encryption prevents content scanning</li>
      <li>Email: reaches victims directly, often anonymized</li>
      <li>Most victims first learn of an image through a friend or anonymous tip, not a platform notification</li></ul>` },
    'dfcc': { role: 'Proliferation & Discovery', title: 'Deepfake Creation Communities', body: `<p>Online communities accelerate the spread and refinement of AIG-NCII techniques.</p>
      <ul><li>Forums on Reddit, dedicated sites, and encrypted platforms share prompts, models, and bypass techniques</li>
      <li>When one method is patched, the community typically develops a replacement within hours</li>
      <li>Medeiros et al. (2026) analyzed 100,000+ posts across multiple platforms</li>
      <li>Stable Diffusion and Grok are the most-mentioned models in these communities</li></ul>` },
    'search-engines': { role: 'Proliferation & Discovery', title: 'Search Engines', body: `<p>Search engines are a primary discovery mechanism for AIG-NCII content and tools.</p>
      <ul><li>99.69% of searches for a public figure + "deepfake" return a deepfake pornography site on page 1 with no warning (Oh / Ding et al. 2026)</li>
      <li>68% of web traffic to nudifier sites arrives via Google Search (My Image My Choice, 2024)</li>
      <li>47 state AGs wrote to Google, Bing, and Yahoo in 2025 — limited action taken</li></ul>` },
    'ad-platforms': { role: 'Proliferation & Discovery', title: 'Ad Platforms', body: `<p>Online advertising platforms inadvertently fund the AIG-NCII ecosystem.</p>
      <ul><li>AIG-NCII websites carry standard display ads from major ad networks</li>
      <li>Advertising revenue provides economic incentive for site operators</li>
      <li>Ad platforms' automated systems have difficulty detecting policy violations at scale</li></ul>` },
    'app-stores': { role: 'Proliferation & Discovery', title: 'App Stores', body: `<p>Apple and Google app stores have hosted apps capable of generating AIG-NCII.</p>
      <ul><li>102 apps capable of digitally removing clothing identified across both stores (Tech Transparency Project, 2026)</li>
      <li>705 million combined downloads</li>
      <li>$117M in estimated revenue — Apple and Google each collected their standard 30% cut</li>
      <li>Fiverr: 82.8% of deepfake gigs expose capability, 87.6% violate platform policies (Dawoud et al. 2026)</li></ul>` },
    'dev-platforms': { role: 'Infrastructural Support', title: 'Developer Platforms', body: `<p>Open-source machine learning platforms host model weights used for AIG-NCII.</p>
      <ul><li>HuggingFace: after Civitai banned 5,000+ nudifier models, they reuploaded within days (Maiberg, 2025)</li>
      <li>7 of 9 most popular image editing Spaces on HuggingFace undressed a woman's photo from a 6-word request (AI Forensics, 2026)</li>
      <li>Decoy tools logged 1,000+ real user requests in a week; 73% were sexual</li></ul>` },
    'critical-providers': { role: 'Infrastructural Support', title: 'Critical Service Providers', body: `<p>Web infrastructure providers (hosting, CDN, domain registrars) are essential to the operation of AIG-NCII sites.</p>
      <ul><li>Amazon and Cloudflare provide hosting or CDN for 62 of 85 surveyed nudifier sites (Mantzarlis & Lakatos, 2025)</li>
      <li>Google Sign-On used by 53 of 85 sites</li>
      <li>MrDeepFakes (650K+ users) shut down in May 2025 when a critical provider terminated service — demonstrating leverage exists</li></ul>` },
    'payment-processors': { role: 'Monetization', title: 'Payment Processors', body: `<p>Credit card networks and digital wallets process payments for AIG-NCII subscriptions.</p>
      <ul><li>Estimated $36M+ annual nudifier economy (The Indicator, 2025)</li>
      <li>Visa, Mastercard, Amex, PayPal, Google Pay, Apple Pay all accepted by these services</li>
      <li>47 state AGs wrote to major processors in 2025 urging them to deny service — most have not acted</li>
      <li>Transactions appear identical to any legitimate digital purchase</li></ul>` },
  };

  /* ── build the SVG ─────────────────────────────────────── */
  const el = (name, attrs, parent) => {
    const n = document.createElementNS(NS, name);
    Object.entries(attrs || {}).forEach(([k, v]) => n.setAttribute(k, v));
    if (parent) parent.appendChild(n);
    return n;
  };

  const root = document.createElement('section');
  root.className = 'eco-graph';
  root.setAttribute('aria-label', 'Map of the technologies behind AI-generated non-consensual intimate images');
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'xMidYMid meet', class: 'eg-svg', role: 'group' }, root);
  mon.appendChild(root);

  /* legend and instruction */
  const legend = el('g', { class: 'eg-legend' }, svg);
  const lt = el('text', { x: 33, y: 52, class: 'eg-legend-title' }, legend); lt.textContent = 'Role of Technology in Facilitating AIG-NCII';
  [['Creation', 'creation'], ['Distribution', 'distribution'], ['Proliferation & Discovery', 'discovery'],
   ['Infrastructural Support', 'infra'], ['Monetization', 'money']].forEach(([label, role], i) => {
    const y = 95 + i * 39;
    el('rect', { x: 33, y: y - 17, width: 28, height: 28, fill: ROLE[role], class: 'eg-swatch' }, legend);
    const t = el('text', { x: 80, y: y + 5, class: 'eg-legend-label' }, legend); t.textContent = label;
  });
  const hint = el('text', { x: 33, y: 318, class: 'eg-hint' }, legend); hint.textContent = '↓ click any box to read about it';

  /* links go under the boxes */
  const edgeLayer = el('g', { class: 'eg-edges' }, svg);
  const edgeEls = EDGES.map((e) => {
    const g = el('g', { class: 'eg-edge' + (e.accent ? ' accent' : ''), 'data-a': e.a, 'data-b': e.b }, edgeLayer);
    el('path', { d: e.d, class: 'eg-line' }, g);
    (e.dots || []).forEach(([cx, cy]) => el('circle', { cx, cy, r: 8, class: 'eg-dot' }, g));
    if (e.head) {
      const [x, y, dir] = e.head;
      const pts = { down: `${x - 11},${y - 24} ${x + 11},${y - 24} ${x},${y}`, up: `${x - 11},${y + 24} ${x + 11},${y + 24} ${x},${y}`,
                    right: `${x - 24},${y - 11} ${x - 24},${y + 11} ${x},${y}` }[dir];
      el('polygon', { points: pts, class: 'eg-head' }, g);
    }
    return g;
  });

  /* boxes */
  const nodeLayer = el('g', { class: 'eg-nodes' }, svg);
  const nodeEls = NODES.map((n, i) => {
    const g = el('g', { class: 'eg-node', tabindex: 0, role: 'button', 'data-id': n.id, 'aria-label': n.title + ': open the note about this box' }, nodeLayer);
    el('rect', { x: n.x + 8, y: n.y + 8, width: n.w, height: n.h, class: 'eg-shadow' }, g);
    el('rect', { x: n.x, y: n.y, width: n.w, height: n.h, fill: ROLE[n.role], class: 'eg-box' }, g);

    const cx = n.x + n.w / 2;
    if (n.wide || n.small) {
      // icon top-left, text centred
      const ic = el('text', { x: n.x + 46, y: n.y + 60, class: 'eg-icon', 'text-anchor': 'middle' }, g); ic.textContent = ICON[n.icon];
    } else {
      const ic = el('text', { x: cx, y: n.y + 88, class: 'eg-icon big', 'text-anchor': 'middle' }, g); ic.textContent = ICON[n.icon];
    }
    const titleSize = n.tall ? 25 : (n.wide ? 30 : 27);
    let y;
    if (n.tall) y = n.y + 165; else if (n.wide) y = n.y + 52; else y = n.y + 46;
    if (n.small && n.lines.length > 1) y = n.y + 46;
    const title = el('text', { x: cx, y, class: 'eg-title', 'text-anchor': 'middle', style: `font-size:${titleSize}px` }, g);
    title.textContent = n.title;
    y += n.tall ? 62 : 34;
    n.lines.forEach((ln) => {
      if (ln[0] === 'gap') { y += 26; return; }
      if (ln[0] === 'hm') {
        const t = el('text', { x: cx, y, class: 'eg-line-text', 'text-anchor': 'middle' }, g);
        const a = el('tspan', { class: 'eg-h' }, t); a.textContent = ln[1];
        const b = el('tspan', { class: 'eg-m' }, t); b.textContent = ln[2];
        y += 32; return;
      }
      const t = el('text', { x: cx, y, class: ln[0] === 'h' ? 'eg-h' : 'eg-m', 'text-anchor': 'middle' }, g);
      t.textContent = ln[1];
      y += ln[0] === 'h' ? 33 : 31;
    });
    g.style.setProperty('--i', i);
    return g;
  });

  /* ── behaviour ─────────────────────────────────────────── */
  let selected = null;

  function select(id) {
    selected = id;
    root.classList.toggle('has-selection', !!id);
    nodeEls.forEach(g => g.classList.toggle('active', g.dataset.id === id));
    const linked = new Set();
    edgeEls.forEach((g) => {
      const on = !!id && (g.dataset.a === id || g.dataset.b === id);
      g.classList.toggle('on', on);
      if (on) { linked.add(g.dataset.a); linked.add(g.dataset.b); }
    });
    nodeEls.forEach(g => g.classList.toggle('linked', linked.has(g.dataset.id) && g.dataset.id !== id));
  }

  /* The explanation opens in the Notes window, which is where the reader has been reading all along */
  function showInNotes(id) {
    const d = DETAILS[id];
    if (!d || !Eco.showNote) return;
    const doc = new DOMParser().parseFromString(d.body, 'text/html');
    const paras = Array.from(doc.body.children);
    const key = (paras.find(p => p.tagName === 'P') || paras[0]).textContent.trim();
    const rest = [];
    paras.forEach((node, i) => {
      if (i === 0) return;
      if (node.tagName === 'UL') node.querySelectorAll('li').forEach(li => rest.push('• ' + li.textContent.trim()));
      else rest.push(node.textContent.trim());
    });
    const step = document.createElement('div');
    step.className = 'step step--k';
    step.dataset.nkey = 'node-' + id;
    const label = document.createElement('span'); label.className = 'step-label'; label.textContent = d.title;
    const k = document.createElement('p'); k.className = 'step-key-text'; k.textContent = key;
    const det = document.createElement('div'); det.className = 'step-detail';
    rest.forEach((t) => { const p = document.createElement('p'); p.textContent = t; det.appendChild(p); });
    step.append(label, k, det);
    Eco.showNote(step);
  }

  function open(id) {
    select(id);
    showInNotes(id);
  }

  nodeEls.forEach((g) => {
    Eco.onActivate(g, () => open(g.dataset.id));
    g.addEventListener('mouseenter', () => { if (!selected) root.dataset.hover = g.dataset.id; });
  });
  svg.addEventListener('click', (e) => { if (!e.target.closest('.eg-node')) select(null); });

  /* ── how much of it is showing (0 → 1), set by finale.js ── */
  const order = ['dev-platforms', 'search-engines', 'app-stores', 'ad-platforms', 'training-data', 'ai-models', 'ai-interfaces',
                 'dist-channels', 'dfcc', 'critical-providers', 'payment-processors'];
  Eco.graph = {
    setProgress(p) {
      const shown = p > 0.02;
      root.classList.toggle('show', shown);
      root.classList.toggle('live', p >= 0.985);
      root.classList.toggle('legend-in', p > 0.08);
      nodeEls.forEach((g) => {
        const idx = order.indexOf(g.dataset.id);
        g.classList.toggle('in', p >= 0.12 + idx * 0.065);
      });
      root.classList.toggle('edges-in', p >= 0.86);
      if (p < 0.985 && selected) select(null);
    },
    select,
  };
})();
