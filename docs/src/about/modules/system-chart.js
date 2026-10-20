/* Interactive SVG of the paper's technology ecosystem, used by the About explorer. */
export function mountSystemChart({ Eco = window.Eco, mon = document.getElementById('mon-screen') } = {}) {

  if (!Eco || !mon) return;

  const NS = 'http://www.w3.org/2000/svg';
  const W = 1648;
  let H = 1628;                       // the figure's own coordinate space

  /* role → fill colour (the site's pastel chips) */
  const ROLE = {
    creation: 'var(--role-creation)', distribution: 'var(--role-distribution)', discovery: 'var(--role-proliferation)',
    infra: 'var(--role-infra)', money: 'var(--role-monetization)',
  };

  /* Icons are Font Awesome glyphs */
  const ICON = {
    cart: '', bullhorn: '', search: '', laptop: '', database: '', code: '',
    wand: '\uf0d0', comment: '', users: '', tools: '', money: '',
  };

  /* Boxes. Lines: ['h', text] = bold sub-heading. Only generic categories are drawn here; the real
     examples and their sources appear in the Notes window when a box is opened. */
  const NODES = [
    { id: 'app-stores', role: 'discovery', x: 862, y: 38, w: 325, h: 124, icon: 'cart', title: 'App Stores', lines: [], small: true },
    { id: 'ad-platforms', role: 'discovery', x: 862, y: 202, w: 325, h: 107, icon: 'bullhorn', title: 'Ad Platforms', lines: [], small: true },
    { id: 'search-engines', role: 'discovery', x: 862, y: 349, w: 736, h: 108, icon: 'search', title: 'Search Engines', lines: [], wide: true },
    { id: 'dev-platforms', role: 'infra', x: 28, y: 349, w: 749, h: 108, icon: 'laptop', title: 'Developer Platforms', lines: [], wide: true },
    { id: 'training-data', role: 'creation', x: 28, y: 530, w: 323, h: 505, icon: 'database', title: 'Training Datasets', tall: true,
      lines: [['h', 'Open Data'], ['gap'], ['h', 'Closed Data']] },
    { id: 'ai-models', role: 'creation', x: 437, y: 530, w: 338, h: 505, icon: 'code', title: 'Generative AI Models', tall: true,
      lines: [['h', 'Open Source Models'], ['gap'], ['h', 'Open Weight Models &'], ['h', 'Variants'], ['gap'], ['h', 'Closed Models']] },
    { id: 'ai-interfaces', role: 'creation', x: 862, y: 530, w: 325, h: 505, icon: 'wand', title: 'Generative AI Interfaces', tall: true,
      lines: [['h', 'General Purpose Model'], ['h', 'Interfaces'], ['gap'], ['h', 'AI Nudifier Applications']] },
    { id: 'dist-channels', role: 'distribution', x: 1273, y: 530, w: 325, h: 505, icon: 'comment', title: 'Distribution Channels', tall: true,
      lines: [['h', 'Private Channels'], ['gap'], ['h', 'Public Platforms']] },
    { id: 'dfcc', role: 'discovery', x: 28, y: 1131, w: 1570, h: 144, icon: 'users', title: 'Deepfake Creation Communities', wide: true,
      lines: [['h', 'Private Channels and Public Platforms']] },
    { id: 'critical-providers', role: 'infra', x: 28, y: 1320, w: 1570, h: 122, icon: 'tools', title: 'Critical Service Providers', wide: true,
      lines: [['m', 'Cloud Service Providers, Domain Name Services, and Authentication Services']] },
    { id: 'payment-processors', role: 'money', x: 26, y: 1487, w: 1572, h: 116, icon: 'money', title: 'Payment Processors', wide: true, lines: [] },
  ];

  function contentRows(n) {
    const rows = [
      { text: ICON[n.icon], className: 'eg-icon', size: 32, height: 36 },
      { height: n.tall ? 20 : 10 },
      { text: n.title, className: 'eg-title', size: 25, height: 30 },
    ];
    if (n.lines.length) rows.push({ height: n.tall ? 24 : 10 });
    n.lines.forEach(line => {
      if (line[0] === 'gap') rows.push({ height: n.tall ? 20 : 12 });
      else rows.push({ text: line.slice(1).join(' '), className: line[0] === 'm' ? 'eg-m' : 'eg-h', size: 21, height: 28 });
    });
    return rows;
  }
  const middle = NODES.filter(node => node.tall);
  const middleHeight = Math.max(...middle.map(node => contentRows(node).reduce((sum, row) => sum + row.height, 0) + 64));
  middle.forEach(node => { node.h = middleHeight; });
  const shift = 1035 - Math.max(...middle.map(node => node.y + node.h));
  NODES.filter(node => node.y > 1035).forEach(node => { node.y -= shift; });
  H -= shift;
  const nodeById = Object.fromEntries(NODES.map(node => [node.id, node]));

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
  EDGES.filter(edge => nodeById[edge.a].tall && nodeById[edge.b].tall).forEach(edge => {
    const a = nodeById[edge.a], b = nodeById[edge.b];
    const y1 = a.y + a.h / 2, y2 = b.y + b.h / 2;
    edge.d = `M${a.x + a.w} ${y1} L${b.x - 10} ${y2}`;
    edge.dots = [[a.x + a.w, y1]];
    edge.head = [b.x, y2, 'right'];
  });
  const COMMUNITY_TARGETS = ['training-data', 'ai-models', 'ai-interfaces', 'dist-channels'];
  XS.forEach((x, i) => {
    const target = nodeById[COMMUNITY_TARGETS[i]];
    const community = nodeById.dfcc, providers = nodeById['critical-providers'], payments = nodeById['payment-processors'];
    const bottom = target.y + target.h;
    EDGES.push({ a: 'dfcc', b: target.id, d: `M${x} ${community.y} V${bottom + 10}`, dots: [[x, community.y]], head: [x, bottom, 'up'] });
    EDGES.push({ a: 'dfcc', b: providers.id, d: `M${x} ${community.y + community.h} V${providers.y}`, dots: [[x, community.y + community.h], [x, providers.y]] });
    EDGES.push({ a: providers.id, b: payments.id, d: `M${x} ${providers.y + providers.h} V${payments.y}`, dots: [[x, providers.y + providers.h], [x, payments.y]] });
  });

  /* What each box says when it is opened: the paper's own wording, the same text as the Notes entries */
  const DETAILS = {
    'training-data': { role: "Creation", title: "Training Datasets", body: "<p>Training datasets refer to text, image, video, audio, and/or multi-modal datasets used to train generative AI models.</p><p>In the early 2010s, face-swap models were trained using open-source face datasets and other curated NSFW datasets comprised primarily of women. An early study of the 2019 DeepNude undressing app found that it was unable to generate images of men because it was trained only on images of women.</p><p>Researchers have found that “general-purpose” image datasets like LAION-5B, ImageNet, and LAION-400M also contain pornography, non-consensual intimate images, and/or known CSAM, enabling models that train upon them to generate AIG-NCII.</p>" },
    'ai-models': { role: "Creation", title: "Generative AI Models", body: "<p>Generative AI models refer to a spectrum of models that use deep learning techniques to take in an input and produce a modified output.</p><p>In the 2010s, smaller, independent, open-source models like DeepFaceLab primarily used generative adversarial networks to automate the face-swapping process. DeepFaceLab had direct ties to Mr.DeepFakes, a prolific “deepfake pornography” community and hosting site. Early models required a high level of technical expertise and were inconsistent in quality and realism.</p><p>With the 2020s came larger and more powerful generative AI models that produced realistic outputs. Open-weight models like Stable Diffusion and Flux have been fine-tuned to produce tens of thousands of fine-tuned variants designed to produce AIG-NCII, predominantly of women. This trend is now being replicated with open-weight video-generation models.</p><p>Additionally, proprietary closed models like xAI’s Aurora, Google’s Gemini models, and OpenAI’s GPT models can be used via chatbot interface or API access to generate AIG-NCII.</p>" },
    'ai-interfaces': { role: "Creation", title: "Generative AI Interfaces", body: "<p>Generative AI interfaces increase the accessibility of AIG-NCII by providing an easy-to-use interface for users to access generative AI model capabilities.</p><p>In the 2010s face-swap era, there were already “undressing” apps like DeepNude that had over 95k active users. In the 2020s, AI nudifier applications became a rapidly growing multi-million dollar economy dedicated to the creation and monetization of AIG-NCII, predominantly of young women.</p><p>AI nudifier applications significantly lower the barrier to entry because any non-technical user can upload a photo of another person (like a yearbook photo or social media post) and create an “undressed” version of that person within minutes without their consent. The apps offer features including undressing and positioning the subject in various sexual positions.</p><p>General purpose model interfaces have also been used to produce AIG-NCII. WIRED found that ChatGPT and Gemini have been used to “strip women in photos down to bikinis”. Most notably, Grok has been used to generate thousands of images of women and girls directly into the comment section of X.</p>" },
    'dist-channels': { role: "Distribution", title: "Distribution Channels", body: "<p>Distribution channels include both private channels and public platforms that AI-generated intimate images may be non-consensually distributed across.</p><p>A 2024 survey by the Center for Democracy &amp; Technology of K-12 school students and teachers found that AI-generated NCII was most commonly shared through public channels (e.g., posting on social media platforms or adult sites) and private channels (e.g., direct message, text message, email). These trends also align with traditional modes of non-consensual distribution of intimate images.</p><p>Under the public platform category, there are also “deepfake pornography sites” such as Mr.Deepfakes that are dedicated to the distribution of AIG-NCII. In 2024, the American Sunlight Project discovered tens of thousands of AIG-NCII depicting 26 senators and members of congress, 25 of them women, across eleven “deepfake pornography” websites. Activists and researchers have called out hundreds of similar websites.</p>" },
    'dfcc': { role: "Proliferation & Discovery", title: "Deepfake Creation Communities", body: "<p>Deepfake creation communities are online communities that provide general and technical assistance to members trying to create deepfakes.</p><p>They are a “key driving force behind the increasing accessibility of deepfakes and deepfake creation software” and serve as an “entry point” for new users to learn from experienced users. Historically, deepfake creation communities have been large (reaching 100,000 members) and highly mobile, existing across platforms like Reddit, MrDeepFakes, 4chan, 8chan, Voat, Telegram, and Discord.</p><p>In 2017, journalists uncovered “r/deepfakes” on Reddit, one of the earliest deepfake creation communities, with over 90,000 subscribers that focused on face swapping celebrity faces with porn performers. In February 2018, under public pressure, Reddit banned “r/deepfakes” and updated its site-wide rules “against involuntary pornography and sexual or suggestive content involving minors”.</p><p>It serves as both a deepfake video distribution and consumption site and a forum for deepfake content creators. MDF was also linked directly by the popular face-swap model DeepFaceLab on GitHub as a place to obtain technical support. Researchers studying MDF found subforums on technical assistance for both models and datasets.</p><p>Telegram group chats have also served as “deepfake creation communities” for users who use Grok AI to generate AIG-NCII.</p><p>On May 6, 2025, Mr.DeepFakes, the world’s most notorious “deepfake pornography” site with over 650,000 users, shut down because an unknown “critical service provider terminated service permanently” and “data loss has made it impossible to continue operation.”</p>" },
    'search-engines': { role: "Proliferation & Discovery", title: "Search Engines", body: "<p>Search engines enable the wide-spread discovery of AI nudifier apps, AIG-NCII, and distribution sites.</p><p>Independent researcher Genevieve Oh conducted 6000 google searches of 100 public figures (elected officials, broadcasters, TV hosts, singers, and chess players) and found that 99.69% of the searches for “NAME+DEEPFAKE” resulted in a “deepfake pornography” website result on the first page. Another audit found that queries for “deepnude,” “nudify,” and “undress app” on Google, Yahoo, and Bing all yielded at least one result leading the user to AI nudifier applications within the first 20 results.</p><p>In 2025, 47 state attorneys general wrote an open letter to Google, Yahoo, and Microsoft urging them to block AIG-NCII content and creation tools from search engines. According to the letter, queries like “how to make deepfake pornography,” “undress apps,” “nudify apps,” or “deepfake porn” do not produce any warning labels. Instead, search engines “quickly present users with direct links to deepfake NCII, to listicles rating the top apps for creating deepfake NCII, and to apps that enable the creation of naked and/or sexual images and videos of any person in any photo”.</p>" },
    'ad-platforms': { role: "Proliferation & Discovery", title: "Advertisement Platforms", body: "<p>Advertisement platforms enable organizations and individuals to place ads (specifically for AI nudifier apps) that drive massive traffic to these tools.</p><p>AI nudifier apps gain users by posting advertisements on large social media platforms. Investigative journalists at 404 Media and the Indicator have documented thousands of advertisements that AI nudifiers post on Instagram.</p><p>A technical report from Graphika tracking 34 AI nudifier apps demonstrates how these apps “operate as a fully-fledged online industry” and rely on advertising on mainstream social media platforms and deploying customer referral schemes such as referral links on platforms like Reddit and X, allowing them to accumulate over 24 million unique visitors in September, 2023. Graphika found a 2000% increase in referral links in one year during 2023.</p>" },
    'app-stores': { role: "Proliferation & Discovery", title: "App Stores", body: "<p>App stores are digital marketplaces for producers to upload and advertise apps for consumers to discover and download apps.</p><p>The National Center on Sexual Exploitation has previously called out Apple and Google for their stores’ role promoting and facilitating sexual exploitation of children by allowing the discovery of inappropriate and potentially dangerous apps. Similarly, app stores enable the large-scale discovery and downloading of AI nudifier apps. According to Bellingcat, DeepSwap, an app that was featured on the top of Mr.DeepFakes, was available on Google Play and Apple stores.</p><p>With the most recent case of Grok, advocates have also critiqued app stores for continuing to host Grok and X. A 2026 report by the Tech Transparency Project found 55 apps in the Google Play Store that can “digitally remove the clothes from women and render them completely or partially naked or clad in a bikini or other minimal clothing” and 47 such apps in the Apple store. TTP found that these apps were “downloaded more than 705 million times worldwide and generated $117 million in revenue” (a portion of which goes to Google and Apple). Both companies removed dozens of nudifier apps from their stores after press coverage.</p>" },
    'dev-platforms': { role: "Infrastructural Support", title: "Developer Platforms", body: "<p>Developer platforms are platforms for developers to create, store, manage, and share code, including models and datasets.</p><p>Developer platforms are central to the development of open-source models and datasets that are used in the creation of deepfakes. Activists and researchers have documented GitHub’s role in hosting early face-swap models like DeepFaceLab, DeepNude, and Unstable Diffusion that were used to produce AIG-NCII.</p><p>AI-specific developer platforms like Hugging Face and Civitai are used to host open-weight models, such as pre-trained base models Stable Diffusion and Flux, as well as almost 35,000 fine-tuned “deepfake” variants, a majority of them sexual and signaling intent to produce non-consensual intimate images.</p><p>An audit of Civitai also found that it was predominantly used to host “not-safe-for-work” (NSFW) models and datasets. After Civitai passed a new policy banning models depicting the likeness of real people in April 2025, 404 Media found that users downloaded over 5000 models and reuploaded them onto Hugging Face.</p>" },
    'critical-providers': { role: "Infrastructural Support", title: "Critical Service Providers", body: "<p>Critical service providers, including cloud service providers, domain name services (DNS), and authentication services, are support software enabling the existence of multiple pieces of the technological ecosystem.</p><p>That includes nudifier apps and deepfake websites. An Indicator audit of 85 AI nudifier websites found that “Amazon and Cloudflare provide hosting or content delivery services for 62 of the 85 nudifiers” and “Google enabled simple sign-on for 53 out of 85.”</p><p>On May 6, 2025, Mr.DeepFakes, the world’s most notorious “deepfake pornography” site with over 650,000 users, shut down because an unknown “critical service provider terminated service permanently” and “data loss has made it impossible to continue operation.” This case study demonstrates a connection between critical service providers and AIG-NCII distribution channels.</p>" },
    'payment-processors': { role: "Monetization", title: "Payment Processors", body: "<p>Payment processors (including credit cards and cryptocurrencies) enable the monetization of non-consensual creation and distribution of AI-generated intimate images.</p><p>The Indicator estimates the current AI nudifier economy of undressing apps to be over $36 million dollars. According to researchers, Mr.DeepFakes was used as an “actively growing deepfake market (primarily for people seeking to commission NSFW deepfake media)”.</p><p>In 2025, 47 state attorneys general wrote a letter to Visa, Mastercard, American Express, PayPal, Google Pay, and Apple Pay stating “sellers of deepfake NCII tools and content have made their services available in exchange for fees paid via payment platforms…even including the logos of those companies on their webpages” and call for these companies to “deny sellers the ability to use their services when they are on notice of these connections but should be actively working to identify and remove any such sellers from their network”.</p>" },
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
    const content = !n.tall ? el('g', { class: 'eg-content' }, g) : g;

    // Horizontal boxes use a left icon; middle boxes retain a centered stack.
    const cx = n.tall ? n.x + n.w / 2 : n.x + 72;
    if (!n.tall) {
      const icon = el('text', { x: n.x + 36, y: n.y + n.h / 2,
        class: 'eg-icon', 'text-anchor': 'middle', 'dominant-baseline': 'central',
        style: 'font-size:32px' }, content);
      icon.textContent = ICON[n.icon];
    }
    const rows = n.tall ? contentRows(n) : contentRows(n).slice(2);
    const contentHeight = rows.reduce((height, row) => height + row.height, 0);
    let y = n.y + (n.h - contentHeight) / 2;
    rows.forEach(row => {
      if (row.text) {
        const text = el('text', { x: cx, y: y + row.height / 2,
          class: row.className, 'text-anchor': n.tall ? 'middle' : 'start', 'dominant-baseline': 'central',
          style: `font-size:${row.size}px` }, content);
        text.textContent = row.text;
      }
      y += row.height;
    });
    g.style.setProperty('--i', i);
    return g;
  });

  function centerWideContent() {
    // Measure all labels before changing SVG geometry.
    const measured = NODES.flatMap((node, index) => {
      if (node.tall) return [];
      const content = nodeEls[index].querySelector('.eg-content');
      const texts = [...content.querySelectorAll('text:not(.eg-icon)')];
      const width = Math.max(...texts.map(text => text.getBBox().width));
      const title = content.querySelector('.eg-title');
      const icon = content.querySelector('.eg-icon');
      return [{ node, content, texts, width, title, icon, iconWidth: icon.getBBox().width }];
    });
    measured.forEach(({ node, texts, width, title, icon }) => {
      texts.forEach(text => {
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('x', node.x + 72 + width / 2);
      });
      icon.setAttribute('y', title.getAttribute('y'));
    });
    const iconPositions = measured.map(({ title, iconWidth }) => title.getBBox().x - 16 - iconWidth / 2);
    measured.forEach(({ icon }, index) => icon.setAttribute('x', iconPositions[index]));
    const offsets = measured.map(({ node, content }) => {
      const bounds = content.getBBox();
      return node.x + node.w / 2 - bounds.x - bounds.width / 2;
    });
    measured.forEach(({ content }, index) => content.setAttribute('transform', `translate(${offsets[index]} 0)`));
  }

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
    const full = (paras.find(p => p.tagName === 'P') || paras[0]).textContent.trim();
    const cut = /^(.+?[.!?])\s+(.*)$/s.exec(full);          // Notes show a short first sentence; the rest is behind "more"
    const key = cut ? cut[1] : full;
    const rest = [];
    paras.forEach((node, i) => {
      if (i === 0) return;
      if (node.tagName === 'UL') node.querySelectorAll('li').forEach(li => rest.push('• ' + li.textContent.trim()));
      else rest.push(node.textContent.trim());
    });
    if (cut && cut[2]) rest.unshift(cut[2]);
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
    centerWideContent,
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
  // The law explorer shares the ecosystem geometry.
  Eco.graph.ext = { root, svg, el, NODES, nodeEls, edgeEls, select, ICON };
  return Eco.graph;
}

// Insert these fragments before initializing the story navigation.
export const stepsHtml = `    <div class="step step--n" data-fin="clear"></div>
    <div class="step step--k" data-fin="graph">
      <span class="step-label">One System</span>
      <p class="step-key-text">Behind all those windows is one connected system. Click any box to read what it does.</p>
    </div>
`;
export const dockHtml = `<div class="dt-dock-item dt-dock--neutral" title="Map" data-go="finale" data-step="[data-fin=&quot;graph&quot;]"><i class="fas fa-diagram-project"></i></div>`;
