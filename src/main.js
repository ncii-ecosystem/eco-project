/* ============================================================
   It Was Never Just One App — main.js
   ============================================================ */
(function () {
  'use strict';

  function $(s) { return document.querySelector(s); }
  function $all(s) { return Array.from(document.querySelectorAll(s)); }

  /* ── progress bar ── */
  var bar = $('#bar');
  window.addEventListener('scroll', function () {
    var pct = window.scrollY / (document.body.scrollHeight - window.innerHeight);
    if (bar) bar.style.width = (pct * 100) + '%';
  }, { passive: true });

  /* ── date ── */
  var dateEl = $('#cover-date');
  if (dateEl) {
    var d = new Date();
    var months = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
    dateEl.textContent = months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  }

  /* ════════════════════════════════════════════════════════════
     BROWSER CHROME — tab + URL switching
  ════════════════════════════════════════════════════════════ */
  var BF_DATA = {
    cover:     { url: 'therecord.com/technology/ai-image-abuse-investigation' },
    datasets:  { url: 'arxiv.org/abs/2602.04759 — Section 3: Creation' },
    interface: { url: 'app.chatai.com/new-chat' },
    dm:        { url: 'messages.google.com/web/conversations' },
    reddit:    { url: 'reddit.com/r/deepfakes' },
    search:    { url: 'google.com/search?q=undress+AI+app+free' },
    appstore:  { url: 'apps.apple.com/app/clothoff-ai/id1632847291' },
    payment:   { url: 'nudifypro.ai/checkout?plan=monthly' },
    cloud:     { url: 'console.aws.amazon.com/ec2/v2/home?region=us-east-1#Instances' },
    board:     { url: 'arxiv.org/abs/2602.04759 — Section 5: Ecosystem Map' },
  };

  var PUB_URLS = {
    reddit:  'reddit.com/r/deepfakes',
    fourchan:'boards.4chan.org/gif/thread/12847561',
    mdf:     'mrdeepfakes.com — OFFLINE since May 6, 2025',
    tgchan:  't.me/ai_jailbreak_hub',
  };

  var bfUrl = $('#bf-url');
  var bfTabs = $all('.bf-tab');

  function setBrowserScene(sceneId) {
    bfTabs.forEach(function (t) {
      var wasActive = t.classList.contains('active');
      var willActive = t.dataset.scene === sceneId;
      t.classList.toggle('active', willActive);
      if (!wasActive && willActive) {
        t.classList.remove('just-clicked');
        void t.offsetWidth;
        t.classList.add('just-clicked');
        setTimeout(function () { t.classList.remove('just-clicked'); }, 400);
      }
    });
    var data = BF_DATA[sceneId];
    if (data && bfUrl) bfUrl.textContent = data.url;
    /* Close news highlight popup when navigating away from cover */
    if (sceneId !== 'cover' && pqPanel && pqPanel.classList.contains('open')) {
      pqPanel.classList.remove('open');
      $all('.nh').forEach(function (n) { n.classList.remove('active'); });
    }
  }

  function setBrowserUrl(url) {
    if (bfUrl) bfUrl.textContent = url;
  }

  /* Spine-like scene observer for chrome tabs */
  /* ── AI cursor ── */
  var aiCursor = $('#ai-cursor');
  var cursorClickTimer = null;

  function moveCursorToEl(el, onArrival) {
    if (!aiCursor || !el) return;
    var rect = el.getBoundingClientRect();
    var cx = rect.left + rect.width / 2 - 11;
    var cy = rect.top  + rect.height / 2 - 4;
    aiCursor.style.left = cx + 'px';
    aiCursor.style.top  = cy + 'px';
    aiCursor.classList.remove('clicking', 'scrolling');
    clearTimeout(cursorClickTimer);
    cursorClickTimer = setTimeout(function () {
      aiCursor.classList.add('clicking');
      setTimeout(function () {
        aiCursor.classList.remove('clicking');
        if (onArrival) onArrival();
      }, 420);
    }, 480);
  }

  function animateCursorToScene(sceneId) {
    var tab = $('.bf-tab[data-scene="' + sceneId + '"]');
    if (!tab) return;
    moveCursorToEl(tab, function () {
      var urlPill = $('.bf-url-pill');
      if (!urlPill) return;
      setTimeout(function () {
        moveCursorToEl(urlPill, function () {
          if (bfUrl) {
            bfUrl.classList.remove('typing');
            void bfUrl.offsetWidth;
            bfUrl.classList.add('typing');
          }
          /* park cursor on the navbtn refresh icon — stays in chrome */
          setTimeout(function () {
            var refresh = $('.bf-navbtn:last-child');
            if (refresh && aiCursor) {
              var r = refresh.getBoundingClientRect();
              aiCursor.style.left = (r.left + r.width / 2 - 11) + 'px';
              aiCursor.style.top  = (r.top  + r.height / 2 - 4) + 'px';
            }
          }, 600);
        });
      }, 350);
    });
  }

  function moveCursorToSpan(span) {
    if (!aiCursor) return;
    $all('.nh').forEach(function (h) { h.classList.remove('active'); });
    span.classList.add('active');
    setTimeout(function () {
      var rect = span.getBoundingClientRect();
      aiCursor.style.left = (rect.left + rect.width * 0.5) + 'px';
      aiCursor.style.top  = (rect.bottom - 6) + 'px';
      aiCursor.classList.remove('clicking');
      clearTimeout(cursorClickTimer);
      cursorClickTimer = setTimeout(function () {
        aiCursor.classList.add('clicking');
        setTimeout(function () { aiCursor.classList.remove('clicking'); }, 420);
      }, 280);
    }, 120);
  }

  function moveCursorToNh(idx) {
    var el = $('.nh[data-idx="' + idx + '"]');
    if (el) moveCursorToSpan(el);
  }

  /* ── Chapter sidebar ── */
  var chapterItems = $all('.chapter-item');

  function setActiveChapter(sceneId) {
    chapterItems.forEach(function (item) {
      item.classList.toggle('active', item.dataset.navScene === sceneId);
    });
  }

  chapterItems.forEach(function (item) {
    item.addEventListener('click', function () {
      var target = document.getElementById(item.dataset.navScene);
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
  });

  /* ── Scene observer: drives tabs + chapter nav + stage transition ── */
  var sceneObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      var stage = e.target.querySelector('.scene-stage');
      if (e.isIntersecting) {
        setBrowserScene(e.target.id);
        setActiveChapter(e.target.id);
        if (stage) stage.classList.add('is-active');
      } else {
        if (stage) stage.classList.remove('is-active');
      }
    });
  }, { rootMargin: '-20% 0px -20% 0px', threshold: 0 });

  $all('.scene[id]').forEach(function (s) { sceneObs.observe(s); });

  /* ════════════════════════════════════════════════════════════
     SCENE 0 — NEWS SITE highlights
  ════════════════════════════════════════════════════════════ */
  var ncpPopup = $('#news-comment-popup');
  var ncpText  = $('#ncp-text');
  var ncpCite  = $('#ncp-cite');
  var ncpClose = $('#ncp-close');

  function openNewsComment(quote, cite, el) {
    $all('.nh').forEach(function (n) { n.classList.remove('active'); });
    if (el) el.classList.add('active');
    var summary = (el && el.dataset.summary) ? el.dataset.summary : quote;
    if (pqSummary) pqSummary.textContent = summary;
    if (pqQuote)   pqQuote.textContent   = quote;
    if (pqCite)    pqCite.textContent    = cite;
    if (pqFull)    pqFull.classList.remove('expanded');
    if (pqPanel)   pqPanel.classList.add('open');
  }
  function closeNewsComment() {
    if (pqPanel) pqPanel.classList.remove('open');
    if (pqFull)  pqFull.classList.remove('expanded');
    $all('.nh').forEach(function (n) { n.classList.remove('active'); });
  }
  if (ncpClose) ncpClose.addEventListener('click', closeNewsComment);

  $all('.nh').forEach(function (span) {
    span.addEventListener('click', function (e) {
      e.stopPropagation();
      var quote = span.dataset.quote || '';
      var cite  = span.dataset.cite  || 'Ding, Suresh & Venkatasubramanian, arXiv:2602.04759 (2026)';
      openNewsComment(quote, cite, span);
    });
  });
  document.addEventListener('click', function (e) {
    if (pqPanel && pqPanel.classList.contains('open') &&
        !pqPanel.contains(e.target) && !e.target.classList.contains('nh')) {
      closeNewsComment();
    }
  });


  /* ════════════════════════════════════════════════════════════
     SCENE A — DATASETS (audit interface)
  ════════════════════════════════════════════════════════════ */
  function dsShow() {
    var r1 = $('#ds-rec-5b'), r2 = $('#ds-rec-400');
    if (r1) setTimeout(function() { r1.classList.add('visible'); }, 100);
    if (r2) setTimeout(function() { r2.classList.add('visible'); }, 400);
    var cap = $('#dataset-caption');
    if (cap) setTimeout(function() { cap.classList.add('visible'); }, 600);
  }
  function dsFlag5b() {
    var flag = $('#ds-flag-5b');
    var status = $('#ds-status-5b');
    if (flag) flag.classList.add('visible');
    if (status) { status.textContent = '⚠ FLAGGED'; status.className = 'ds-rec-status ds-status-warn'; }
    var dc = $('#dc-text');
    if (dc) dc.textContent = 'LAION-5B contained CSAM. It trained Stable Diffusion. The model inherited the capability.';
  }
  function dsFlag400() {
    var flag = $('#ds-flag-400');
    var status = $('#ds-status-400');
    if (flag) flag.classList.add('visible');
    if (status) { status.textContent = '⚠ FLAGGED'; status.className = 'ds-rec-status ds-status-warn'; }
  }
  function dsShowModel() {
    var row = $('#ds-model-row');
    if (row) row.classList.add('visible');
    setTimeout(function() {
      var out = $('#ds-model-outputs');
      if (out) out.classList.add('visible');
    }, 800);
  }

  /* ════════════════════════════════════════════════════════════
     SCENE B — CHAT INTERFACE (resets on every entry)
  ════════════════════════════════════════════════════════════ */
  var chatBody      = $('#chat-body');
  var chatInputText = $('#chat-input-text');
  var chatSendBtn   = $('#chat-send-btn');
  var chatAnnotation = $('#chat-annotation');
  var chatTypingTimer = null;

  var INITIAL_CHAT_HTML =
    '<div class="chat-system-msg">You are connected to ChatAI. How can I help you today?</div>' +
    '<div class="chat-bubble ai" style="margin-top:8px">Hello! I can help with writing, coding, image analysis, image generation, and more. What would you like to do today?</div>' +
    '<div class="chat-bubble user" style="max-width:60%">Can you generate realistic photos of people?</div>' +
    '<div class="chat-bubble ai">Yes! I can generate photorealistic images of people using our vision model. Just describe what you\'d like, or upload a reference photo.</div>';

  var CHAT_PROMPT = 'I have a photo of someone. Can you generate what she looks like without clothing?';

  function resetChat() {
    clearInterval(chatTypingTimer);
    if (chatBody) chatBody.innerHTML = INITIAL_CHAT_HTML;
    if (chatInputText) chatInputText.innerHTML = '<span class="chat-cursor"></span>';
    if (chatSendBtn) chatSendBtn.classList.remove('active');
    if (chatAnnotation) chatAnnotation.classList.remove('visible');
  }

  function typeMessage(text, speed, onDone) {
    if (!chatInputText) return;
    var i = 0;
    chatInputText.innerHTML = '<span class="chat-cursor"></span>';
    clearInterval(chatTypingTimer);
    chatTypingTimer = setInterval(function () {
      chatInputText.innerHTML = text.slice(0, i) + '<span class="chat-cursor"></span>';
      i++;
      if (i > text.length) {
        clearInterval(chatTypingTimer);
        if (chatSendBtn) chatSendBtn.classList.add('active');
        if (onDone) onDone();
      }
    }, speed || 40);
  }

  function sendChatMessage() {
    if (!chatBody || !chatInputText) return;
    var text = chatInputText.textContent || CHAT_PROMPT;
    chatInputText.innerHTML = '<span class="chat-cursor"></span>';
    if (chatSendBtn) chatSendBtn.classList.remove('active');
    var bubble = document.createElement('div');
    bubble.className = 'chat-bubble user';
    bubble.textContent = text;
    chatBody.appendChild(bubble);
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  function showChatThinking() {
    if (!chatBody) return;
    var dots = document.createElement('div');
    dots.className = 'chat-typing-dots'; dots.id = 'chat-dots';
    dots.innerHTML = '<span></span><span></span><span></span>';
    chatBody.appendChild(dots);
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  function showChatResponse() {
    var dots = $('#chat-dots');
    if (dots) dots.remove();
    if (!chatBody) return;
    var bubble = document.createElement('div');
    bubble.className = 'chat-bubble ai';
    bubble.innerHTML =
      'I\'m sorry, I can\'t generate that kind of image. However, I <em>can</em> help with other photo editing tasks…' +
      '<div class="redacted-block" style="width:160px;height:200px;margin-top:12px"><span class="redacted-label">⚠ Output redacted</span></div>' +
      '<small style="display:block;margin-top:8px;color:#888;font-size:11px">Documented: ChatGPT, Gemini, Grok produced similar outputs, 2024–2025</small>';
    chatBody.appendChild(bubble);
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  function showChatAnnotation(text) {
    if (!chatAnnotation) return;
    chatAnnotation.textContent = text || '';
    chatAnnotation.classList.add('visible');
  }

  /* ════════════════════════════════════════════════════════════
     SCENE C — PRIVATE CHANNELS (tab switching)
  ════════════════════════════════════════════════════════════ */
  var dmTabs    = $all('.dm-tab');
  var dmScreens = $all('.dm-screen');
  var dmAnnotation = $('#dm-annotation');

  function switchDmTab(app) {
    dmTabs.forEach(function (t) { t.classList.toggle('active', t.dataset.app === app); });
    dmScreens.forEach(function (s) { s.classList.remove('active'); });
    var scr = $('#dm-' + app);
    if (scr) scr.classList.add('active');
  }
  dmTabs.forEach(function (tab) {
    tab.addEventListener('click', function () { switchDmTab(tab.dataset.app); });
  });

  function showDmMsg(stepNum) {
    for (var i = 0; i <= stepNum; i++) {
      var el = $('[data-dm-step="' + i + '"]');
      if (el) el.classList.add('visible');
    }
  }

  /* ════════════════════════════════════════════════════════════
     SCENE D — PUBLIC CHANNELS (multi-tab)
  ════════════════════════════════════════════════════════════ */
  var pubTabs    = $all('.pub-tab');
  var pubScreens = $all('.pub-screen');

  function switchPubTab(pub) {
    pubTabs.forEach(function (t) { t.classList.toggle('active', t.dataset.pub === pub); });
    pubScreens.forEach(function (s) { s.classList.remove('active'); });
    var scr = $('#pub-' + pub);
    if (scr) scr.classList.add('active');
    /* Update browser URL */
    if (PUB_URLS[pub]) setBrowserUrl(PUB_URLS[pub]);
    /* Update bf-pub-label */
    var labels = { reddit:'r/deepfakes', fourchan:'4chan /gif/', mdf:'MrDeepFakes', tgchan:'Telegram' };
    var lbl = $('#bf-pub-label');
    if (lbl && labels[pub]) lbl.textContent = labels[pub];
  }

  pubTabs.forEach(function (tab) {
    tab.addEventListener('click', function () { switchPubTab(tab.dataset.pub); });
  });

  function showRedditComment(n) {
    var el = $('[data-rc-step="' + n + '"]');
    if (el) el.classList.add('visible');
  }
  function showRedditBan() {
    var overlay = $('#reddit-banned');
    if (overlay) overlay.classList.add('visible');
    var chrome = $('.reddit-chrome');
    if (chrome) chrome.style.opacity = '0.25';
  }
  function showRedditAnnotation() {
    var overlay = $('#reddit-banned');
    if (overlay) overlay.classList.remove('visible');
    var chrome = $('.reddit-chrome');
    if (chrome) chrome.style.opacity = '1';
    var ann = $('.reddit-annotation');
    if (ann) ann.classList.add('visible');
  }
  function showMdfOffline() {
    var overlay = $('#mdf-offline');
    if (overlay) overlay.classList.add('visible');
  }

  /* ════════════════════════════════════════════════════════════
     SCENE E — SEARCH
  ════════════════════════════════════════════════════════════ */
  function showSearchMore() {
    ['#gr2','#gr3'].forEach(function (sel) {
      var el = $(sel);
      if (el) el.style.display = 'block';
    });
  }
  function showSearchAd() {
    var ad = $('#gr-ad');
    if (ad) { ad.style.display = 'block'; }
  }
  function showSearchAnnotation() {
    var ann = $('#search-annotation');
    if (ann) ann.style.display = 'block';
  }

  /* ════════════════════════════════════════════════════════════
     SCENE F — APP STORE (detail view)
  ════════════════════════════════════════════════════════════ */
  function appstoreFill() {
    /* nothing to build — detail view is static HTML */
  }

  function appstoreHighlight() {
    var paper = $('#as-detail-paper');
    if (paper) paper.style.display = 'block';
  }

  function showAppstoreOverlay() {
    var paper = $('#as-detail-paper');
    if (paper) paper.style.display = 'block';
  }

  function showAppstoreAnnotation() {
    var ann = $('#as-annotation');
    if (ann) { ann.style.display = 'block'; setTimeout(function() { ann.classList.add('visible'); }, 20); }
  }

  /* ════════════════════════════════════════════════════════════
     SCENE H — CLOUD PROVIDERS
  ════════════════════════════════════════════════════════════ */
  function showCloudAlert() {
    var alert = $('#cloud-alert');
    if (alert) alert.classList.add('visible');
  }

  function showCloudAnnotation() {
    var ann = $('#cloud-annotation');
    if (ann) ann.classList.add('visible');
  }

  /* ════════════════════════════════════════════════════════════
     SCENE G — PAYMENT
  ════════════════════════════════════════════════════════════ */
  function showPaymentLogos() {
    var bg = $('.payment-bg');
    if (bg) bg.classList.add('blurred');
  }
  function showPaymentSheet() {
    var sheet = $('#payment-sheet');
    if (sheet) sheet.style.display = 'block';
  }
  function showPaymentAnnotation() {
    var ann = $('#payment-annotation');
    if (ann) { ann.style.display = 'block'; setTimeout(function() { ann.classList.add('visible'); }, 20); }
  }

  /* ════════════════════════════════════════════════════════════
     ECO BOARD
  ════════════════════════════════════════════════════════════ */
  var ECO_NODES = [
    { id: 'datasets',     icon: '🗄️', name: 'Training\nDatasets',  role: 'creation',      desc: 'LAION-5B, LAION-400M — contained CSAM' },
    { id: 'models',       icon: '🤖', name: 'Generative\nModels',   role: 'creation',      desc: 'Stable Diffusion, Grok, FLUX, DALL·E' },
    { id: 'interfaces',   icon: '💬', name: 'AI Interfaces',        role: 'creation',      desc: 'ChatGPT, Grok, ChatAI — public access' },
    { id: 'private',      icon: '🔒', name: 'Private\nChannels',    role: 'distribution',  desc: 'Telegram bots, DMs, email — untraceable' },
    { id: 'public',       icon: '📢', name: 'Public\nChannels',     role: 'distribution',  desc: '4chan /gif/, Discord, X posts' },
    { id: 'communities',  icon: '👥', name: 'Creation\nCommunities',role: 'proliferation', desc: 'Forums that coordinate jailbreaks & targets — 4chan threads, MrDeepFakes commissions, Telegram channels with 47K+ members' },
    { id: 'search',       icon: '🔍', name: 'Search\nEngines',      role: 'proliferation', desc: 'Google, Bing, Yahoo — 99.69% of searches return abuse sites with no warning' },
    { id: 'ads',          icon: '📣', name: 'Ad\nPlatforms',        role: 'proliferation', desc: 'Instagram & Google hosted thousands of nudifier ads — no account was banned' },
    { id: 'stores',       icon: '📱', name: 'App Stores',           role: 'infra',         desc: '102 apps across Apple & Google — 705M downloads, $117M revenue' },
    { id: 'devplatforms', icon: '⚙️', name: 'Developer\nPlatforms', role: 'infra',         desc: 'HuggingFace, Civitai — model weights cannot be recalled once released' },
    { id: 'providers',    icon: '☁️', name: 'Cloud\nProviders',     role: 'infra',         desc: 'AWS, Cloudflare — 62 of 85 nudifier sites hosted on these two providers' },
    { id: 'payments',     icon: '💳', name: 'Payment\nProcessors',  role: 'money',         desc: 'Visa, Mastercard, PayPal, Apple Pay — all accept payments for nudifier subscriptions' },
  ];

  function buildEco(containerId, nodes) {
    var container = $('#' + containerId);
    if (!container) return;
    nodes.forEach(function (node) {
      var el = document.createElement('div');
      el.className = 'eco-node';
      el.dataset.id   = node.id;
      el.dataset.role = node.role;
      if (node.desc) el.title = node.desc;
      el.innerHTML =
        '<div class="eco-node-icon">' + node.icon + '</div>' +
        '<div class="eco-node-name">' + node.name.replace('\n', '<br>') + '</div>' +
        '<div class="eco-node-role">' + node.role + '</div>' +
        (node.desc ? '<div class="eco-node-desc">' + node.desc + '</div>' : '');
      container.appendChild(el);
    });
  }
  buildEco('eco', ECO_NODES);
  buildEco('eco-law', ECO_NODES.map(function (n) { return Object.assign({}, n); }));

  var ecoAction = $('#eco-action');
  var ecoHint   = $('#eco-hint');
  var eliminatedCount = 0;

  if (ecoAction) {
    ecoAction.addEventListener('click', function () {
      var nodes = $all('#eco .eco-node:not(.eliminated)');
      if (!nodes.length) {
        $all('#eco .eco-node').forEach(function (n) { n.classList.remove('eliminated'); });
        eliminatedCount = 0;
        if (ecoHint) { ecoHint.textContent = 'They\'re back. The ecosystem always rebuilds.'; }
        return;
      }
      var pick = nodes[Math.floor(Math.random() * nodes.length)];
      pick.classList.add('eliminated');
      eliminatedCount++;
      if (ecoHint) {
        if (eliminatedCount === 1)       ecoHint.textContent = 'One down. But new ones are already appearing elsewhere.';
        else if (eliminatedCount === 6)  ecoHint.textContent = 'Half eliminated. The other half accelerated to fill the gap.';
        else if (eliminatedCount >= nodes.length) ecoHint.textContent = 'All gone. Press again — and watch what happens.';
        ecoHint.classList.remove('hidden');
      }
      setTimeout(function () { pick.classList.remove('eliminated'); }, 1800);
    });
  }

  setTimeout(function () {
    $all('#eco-law .eco-node').forEach(function (n) {
      if (n.dataset.role !== 'distribution') n.classList.add('eliminated');
    });
  }, 600);

  /* ════════════════════════════════════════════════════════════
     PAPER QUOTE PANEL (fixed, escapes overflow:hidden)
  ════════════════════════════════════════════════════════════ */
  var pqPanel   = $('#pq-panel');
  var pqSummary = $('#pq-summary');
  var pqQuote   = $('#pq-quote');
  var pqCite    = $('#pq-cite');
  var pqClose   = $('#pq-close');
  var pqExpand  = $('#pq-expand');
  var pqFull    = $('#pq-full');

  function openPaperQuote(quote, cite) {
    if (!pqPanel) return;
    if (pqQuote) pqQuote.textContent = quote;
    if (pqCite)  pqCite.textContent  = cite;
    if (pqFull)  pqFull.classList.remove('expanded');
    pqPanel.classList.add('open');
  }
  function closePaperQuote() {
    if (pqPanel) pqPanel.classList.remove('open');
    if (pqFull)  pqFull.classList.remove('expanded');
  }
  if (pqClose)  pqClose.addEventListener('click', closePaperQuote);
  if (pqExpand) pqExpand.addEventListener('click', function (e) {
    e.stopPropagation();
    if (pqFull) pqFull.classList.toggle('expanded');
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closePaperQuote(); closeNewsComment(); }
  });

  function initExpandableNotes() {
    $all('.note-card[data-paper-quote]').forEach(function (card) {
      var quote = card.dataset.paperQuote;
      var cite  = card.dataset.paperCite || 'Ding et al., arXiv:2602.04759 (2026)';
      if (!quote) return;
      var btn = document.createElement('button');
      btn.className = 'nc-toggle-btn';
      btn.textContent = 'From the paper';
      btn.type = 'button';
      card.appendChild(btn);
      btn.addEventListener('click', function (ev) {
        ev.stopPropagation();
        openPaperQuote(quote, cite);
      });
    });
  }
  initExpandableNotes();

  /* ════════════════════════════════════════════════════════════
     SCENE ENTRY OBSERVER
  ════════════════════════════════════════════════════════════ */
  var entryObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      var id = e.target.id;
      if (id === 'datasets') {
        dsShow();
        entryObs.unobserve(e.target);
      }
      if (id === 'interface') {
        resetChat(); /* always reset on entry */
      }
      if (id === 'dm') {
        showDmMsg(0);
        entryObs.unobserve(e.target);
      }
      if (id === 'reddit') {
        showRedditComment(0);
        entryObs.unobserve(e.target);
      }
      if (id === 'appstore') {
        appstoreFill();
        entryObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.01, rootMargin: '0px 0px -5% 0px' });

  ['datasets', 'interface', 'dm', 'reddit', 'appstore'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) entryObs.observe(el);
  });

  /* ════════════════════════════════════════════════════════════
     SCROLLAMA
  ════════════════════════════════════════════════════════════ */
  if (typeof scrollama === 'undefined') { console.warn('Scrollama not loaded'); return; }

  var scroller = scrollama();
  scroller.setup({ step: '.step', offset: 0.5 })
  .onStepEnter(function (resp) {
    var el     = resp.element;
    var scene  = el.closest('.scene');
    var sceneId = scene ? scene.id : null;
    /* Mark active step in the Pudding column */
    if (sceneId !== 'cover') {
      var siblings = scene ? scene.querySelectorAll('.step') : [];
      siblings.forEach(function (s) { s.classList.remove('is-active'); });
      el.classList.add('is-active');
    }

    /* ── COVER ── */
    if (sceneId === 'cover') {
      var news = el.dataset.news;
      if (news === 'done') {
        closeNewsComment();
        $all('.nh').forEach(function (h) { h.classList.remove('active'); });
      }
      if (news === 'start') {
        /* Reset inner scroll to top so headline is always visible on enter */
        var stage = document.querySelector('.news-stage');
        if (stage) stage.scrollTo({ top: 0, behavior: 'smooth' });
      }
      if (/^h\d$/.test(news || '')) {
        var idx = parseInt(news.slice(1), 10);
        /* idx=0 appears twice in markup — second occurrence is in the body paragraph */
        var allNh = $all('.nh[data-idx="' + idx + '"]');
        var hlEl = (idx === 0 && allNh.length > 1) ? allNh[1] : allNh[0];
        if (hlEl) {
          openNewsComment(hlEl.dataset.quote, hlEl.dataset.cite, hlEl);
          var stageEl = document.querySelector('.news-stage');
          if (stageEl) {
            var spanRect = hlEl.getBoundingClientRect();
            var stageRect = stageEl.getBoundingClientRect();
            var relTop = spanRect.top - stageRect.top + stageEl.scrollTop;
            var target = relTop - stageEl.clientHeight * 0.35;
            stageEl.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
          }
        }
      }
    }

    /* ── DATASETS ── */
    if (sceneId === 'datasets') {
      var ds = el.dataset.ds;
      if (ds === 'show')    dsShow();
      if (ds === 'flag5b')  dsFlag5b();
      if (ds === 'flag400') dsFlag400();
      if (ds === 'model')   dsShowModel();
    }

    /* ── CHAT ── */
    if (sceneId === 'interface') {
      var chat = el.dataset.chat;
      if (chat === 'type')     typeMessage(CHAT_PROMPT, 38);
      if (chat === 'send')     { clearInterval(chatTypingTimer); chatInputText.innerHTML = ''; sendChatMessage(); }
      if (chat === 'think')    showChatThinking();
      if (chat === 'respond')  showChatResponse();
      /* annotate step is now visible in scroll column — no overlay needed */
    }

    /* ── DMs ── */
    if (sceneId === 'dm') {
      var dm = el.dataset.dm;
      if (dm && dm.startsWith('msg')) showDmMsg(parseInt(dm.replace('msg', ''), 10));
      if (dm === 'switchtg')    switchDmTab('telegram');
      if (dm === 'switchemail') switchDmTab('email');
      /* dm annotate step is visible in scroll column */
    }

    /* ── PUBLIC CHANNELS ── */
    if (sceneId === 'reddit') {
      var rc = el.dataset.rc;
      if (!isNaN(parseInt(rc, 10))) showRedditComment(parseInt(rc, 10));
      if (rc === 'ban')      showRedditBan();
      if (rc === 'annotate') { var overlay = $('#reddit-banned'); if (overlay) overlay.classList.remove('visible'); var chrome = $('.reddit-chrome'); if (chrome) chrome.style.opacity = '1'; }
      if (rc === '4chan')    switchPubTab('fourchan');
      if (rc === 'mdf')      { switchPubTab('mdf'); showMdfOffline(); }
      if (rc === 'tgchan')   switchPubTab('tgchan');
    }

    /* ── SEARCH ── */
    if (sceneId === 'search') {
      var s = el.dataset.search;
      if (s === 'more')     showSearchMore();
      if (s === 'ad')       showSearchAd();
      /* search annotate step is visible in scroll column */
    }

    /* ── APP STORE ── */
    if (sceneId === 'appstore') {
      var as = el.dataset.as;
      if (as === 'fill')      appstoreFill();
      if (as === 'highlight') appstoreHighlight();
      if (as === 'overlay')   showAppstoreOverlay();
      /* appstore annotate step is visible in scroll column */
    }

    /* ── PAYMENT ── */
    if (sceneId === 'payment') {
      var pay = el.dataset.pay;
      if (pay === 'logos')    showPaymentLogos();
      if (pay === 'sheet')    showPaymentSheet();
      /* payment annotate step is visible in scroll column */
    }

    /* ── CLOUD ── */
    if (sceneId === 'cloud') {
      var cl = el.dataset.cloud;
      if (cl === 'alert')    showCloudAlert();
      /* cloud annotate step is visible in scroll column */
    }
  });

  /* ─── EXPANDABLE STICKY NOTES ──────────────────────────── */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.step-expand-btn');
    if (!btn) return;
    var note = btn.closest('.step--k');
    var detail = note && note.querySelector('.step-detail');
    if (!detail) return;
    var isOpen = detail.classList.contains('is-open');
    detail.classList.toggle('is-open', !isOpen);
    btn.setAttribute('aria-expanded', String(!isOpen));
    btn.textContent = isOpen ? 'Read more ▾' : 'Read less ▴';
  });

  /* ─── CHAPTER NAV — ECOSYSTEM + BIBLIOGRAPHY ─────────────
     The scrollama instance covers scenes A-I. For the two
     static sections at the bottom we use IntersectionObserver. */
  (function () {
    var extraScenes = ['ecosystem', 'bibliography'];
    if (!('IntersectionObserver' in window)) return;
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          document.querySelectorAll('.chapter-item').forEach(function (ci) {
            ci.classList.remove('active');
          });
          var id = entry.target.id;
          var item = document.querySelector('.chapter-item[data-nav-scene="' + id + '"]');
          if (item) item.classList.add('active');
        }
      });
    }, { threshold: 0.3 });
    extraScenes.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) obs.observe(el);
    });
  }());

})();

/* ─── ECOSYSTEM MAP ─────────────────────────────────────── */
(function () {
  var ECO_NODES = {
    'training-data': {
      label: 'Training Data',
      role: 'Role in AIG-NCII: Creation',
      desc: 'Training datasets refer to text, image, video, audio, and multi-modal datasets used to train generative AI models. In the early 2010s, face-swap models were trained using open-source face datasets and curated NSFW datasets comprised primarily of women. Researchers have found that "general-purpose" image datasets like LAION-5B, ImageNet, and LAION-400M also contain pornography, non-consensual intimate images, and/or known CSAM, enabling models that train upon them to generate AIG-NCII. An early study of the 2019 DeepNude undressing app found that it was unable to generate images of men because it was trained only on images of women.'
    },
    'ai-models': {
      label: 'Generative AI Models',
      role: 'Role in AIG-NCII: Creation',
      desc: 'Generative AI Models are the underlying model architectures and weights used to generate AIG-NCII. Open-weight models like Stable Diffusion and Flux have been fine-tuned into tens of thousands of variants designed to produce AIG-NCII. When Civitai banned real-person models in April 2025, users downloaded over 5,000 models and reuploaded them onto Hugging Face. Open-weight models are the principal enablers of AI NCII misuse because "access is offline, on-device; users can use models and prompts freely; and there are few (if any) opportunities for content moderation and criminal content detection or prevention."'
    },
    'ai-interfaces': {
      label: 'Generative AI Interfaces',
      role: 'Role in AIG-NCII: Distribution',
      desc: 'Generative AI interfaces increase the accessibility of AIG-NCII by providing an easy-to-use interface for users to access generative AI model capabilities. AI nudifier applications significantly lower the barrier to entry — any non-technical user can upload a photo and create an "undressed" version within minutes without consent. In the 2010s, apps like DeepNude had over 95,000 active users. In the 2020s, AI nudifier applications became a rapidly growing multi-million dollar economy. WIRED found that ChatGPT and Gemini have been used to "strip women in photos down to bikinis." Grok has been used to generate thousands of images directly into the comment section of X.'
    },
    'dist-channels': {
      label: 'Distribution Channels',
      role: 'Role in AIG-NCII: Distribution',
      desc: 'Distribution channels include both private channels (direct message, text message, email) and public platforms (social media, dedicated sites) that AIG-NCII may be non-consensually distributed across. A 2024 CDT survey found that AIG-NCII was most commonly shared through private channels before any platform had the opportunity to detect it. AIG-NCII results in significant psychological, physical, financial, and reputational harm to victim-survivors, as well as a gendered chilling effect where victim-survivors retreat from online spaces due to fear of harassment.'
    },
    'dfcc': {
      label: 'Deepfake Creation Communities',
      role: 'Role in AIG-NCII: Distribution',
      desc: 'Deepfake creation communities are online communities that provide general and technical assistance to members trying to create deepfakes. They are "a key driving force behind the increasing accessibility of deepfakes and deepfake creation software" and serve as "an entry point for new users to learn from experienced users." These communities are "highly mobile" — existing across platforms like Reddit, MrDeepFakes, 4chan, 8chan, Voat, Telegram, and Discord. In 2017, journalists uncovered r/deepfakes with over 90,000 subscribers. After Reddit\'s 2018 ban, communities migrated to MrDeepFakes, 4chan, and Telegram. Most recently, Telegram group chats have served as deepfake creation communities for users using Grok AI to generate AIG-NCII.'
    },
    'search-engines': {
      label: 'Search Engines',
      role: 'Role in AIG-NCII: Proliferation & Discovery',
      desc: '99.69% of Google searches for a public figure\'s name plus "deepfake" returned a deepfake pornography website on the first page. Another audit found that queries for "deepnude," "nudify," and "undress app" on Google, Yahoo, and Bing all yielded at least one result leading to an AI nudifier within the first 20 results. Search engines "quickly present users with direct links to deepfake NCII, to listicles rating the top apps for creating deepfake NCII, and to apps that enable the creation of naked and/or sexual images and videos of any person in any photo." In 2025, 47 state attorneys general wrote to Google, Yahoo, and Microsoft urging them to block AIG-NCII content and creation tools.'
    },
    'ad-platforms': {
      label: 'Ad Platforms',
      role: 'Role in AIG-NCII: Proliferation & Discovery',
      desc: 'AI nudifier apps "operate as a fully-fledged online industry" and rely on advertising on mainstream social media platforms and customer referral schemes on platforms like Reddit and X. A Graphika technical report tracking 34 AI nudifier apps found that referral link spam increased by more than 2,000% in a single year during 2023, and these apps accumulated over 24 million unique visitors in September 2023. In 2025, 47 state attorneys general wrote to Instagram\'s parent Meta about the platform hosting thousands of nudifier ads.'
    },
    'app-stores': {
      label: 'App Stores',
      role: 'Role in AIG-NCII: Proliferation & Discovery',
      desc: 'A 2026 Tech Transparency Project report found 55 apps on Google Play and 47 on the Apple App Store capable of digitally removing clothing from photos — downloaded more than 705 million times worldwide and generating $117 million in revenue. App stores enable the large-scale discovery and downloading of AI nudifier apps. According to Bellingcat, DeepSwap, an app featured at the top of MrDeepFakes, was available on Google Play and Apple stores. Both companies removed dozens of nudifier apps after press coverage.'
    },
    'dev-platforms': {
      label: 'Developer Platforms',
      role: 'Role in AIG-NCII: Infrastructural Support',
      desc: 'Developer platforms like GitHub and Hugging Face host and distribute the models, code, and datasets that enable AIG-NCII. MrDeepFakes was linked directly by the popular face-swap model DeepFaceLab on GitHub as a place to obtain technical support. After Civitai banned real-person models in April 2025, users downloaded over 5,000 models and reuploaded them onto Hugging Face. Hugging Face hosted thousands of models specializing in NCII despite takedown requests. A 2026 report found that seven of the nine most popular image editing Spaces on Hugging Face undressed a photo of a woman from a simple six-word request.'
    },
    'critical-providers': {
      label: 'Critical Service Providers',
      role: 'Role in AIG-NCII: Infrastructural Support',
      desc: 'Critical service providers — including cloud service providers, domain name services, and authentication services — enable the existence of multiple pieces of the technological ecosystem. Amazon and Cloudflare provide hosting or content delivery services for 62 of 85 nudifier websites surveyed. Google enabled simple sign-on for 53 out of 85. On May 6, 2025, MrDeepFakes — with over 650,000 users — shut down because an unknown "critical service provider terminated service permanently." This case study demonstrates a connection between critical service providers and AIG-NCII distribution channels.'
    },
    'payment-processors': {
      label: 'Payment Processors',
      role: 'Role in AIG-NCII: Monetization',
      desc: 'Sellers of deepfake NCII tools and content have made their services available in exchange for fees paid via payment platforms, displaying the logos of Visa, Mastercard, American Express, PayPal, Google Pay, and Apple Pay on their webpages. The Indicator estimates the AI nudifier economy of undressing apps to be over $36 million. In 2025, 47 state attorneys general wrote to Visa, Mastercard, American Express, PayPal, Google Pay, and Apple Pay, calling for these companies to "deny sellers the ability to use their services when they are on notice of these connections." Mr.DeepFakes was used as "an actively growing deepfake market (primarily for people seeking to commission NSFW deepfake media)."'
    }
  };

  var diagram = document.getElementById('eco-diagram');
  var detail  = document.getElementById('eco-detail');
  var detailTitle = document.getElementById('eco-detail-title');
  var detailRole  = document.getElementById('eco-detail-role');
  var detailBody  = document.getElementById('eco-detail-body');
  var detailClose = document.getElementById('eco-detail-close');

  if (!diagram) return;

  var activeNode = null;
  var holes = Array.prototype.slice.call(diagram.querySelectorAll('.mole-hole'));

  /* ── Pop animation logic ──────────────────────────── */
  holes.forEach(function (h) { h.classList.add('is-down'); });

  function molePopDown(hole) {
    if (hole.classList.contains('is-active')) return;
    var mole = hole.querySelector('.mole');
    mole.style.transition = 'transform 0.22s ease-in, box-shadow 0.2s';
    hole.classList.add('is-down');
    setTimeout(function () { mole.style.transition = ''; }, 260);
  }

  function scheduleMole(hole) {
    var delay = 600 + Math.random() * 3800;
    setTimeout(function () {
      if (hole.classList.contains('is-active')) {
        scheduleMole(hole);
        return;
      }
      hole.classList.remove('is-down');
      var upTime = 1400 + Math.random() * 2600;
      setTimeout(function () {
        if (hole.classList.contains('is-active')) {
          scheduleMole(hole);
          return;
        }
        molePopDown(hole);
        setTimeout(function () { scheduleMole(hole); }, 280);
      }, upTime);
    }, delay);
  }

  holes.forEach(function (h) {
    setTimeout(function () { scheduleMole(h); }, Math.random() * 1800);
  });

  /* ── Click handler ────────────────────────────────── */
  diagram.addEventListener('click', function (e) {
    var hole = e.target.closest('.mole-hole[data-eco]');
    if (!hole) return;
    var key = hole.dataset.eco;
    var data = ECO_NODES[key];
    if (!data) return;

    if (activeNode && activeNode !== hole) {
      activeNode.classList.remove('is-active');
    }
    if (activeNode === hole && detail.classList.contains('is-open')) {
      detail.classList.remove('is-open');
      detail.setAttribute('aria-hidden', 'true');
      activeNode = null;
      /* pop back down after a moment */
      setTimeout(function () { molePopDown(hole); setTimeout(function () { scheduleMole(hole); }, 280); }, 600);
      return;
    }

    /* Ensure mole is up first, then whack */
    hole.classList.remove('is-down');
    hole.classList.remove('is-active');
    hole.classList.remove('is-whacking');
    void hole.offsetWidth; /* reflow to restart animation */
    hole.classList.add('is-whacking');
    activeNode = hole;
    setTimeout(function () {
      hole.classList.remove('is-whacking');
      hole.classList.add('is-active');
    }, 380);

    detailTitle.textContent = data.label;
    detailRole.textContent  = data.role;
    detailBody.textContent  = data.desc;
    detail.classList.add('is-open');
    detail.setAttribute('aria-hidden', 'false');
    detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  detailClose.addEventListener('click', function () {
    detail.classList.remove('is-open');
    detail.setAttribute('aria-hidden', 'true');
    var closed = activeNode;
    if (closed) {
      closed.classList.remove('is-active');
      activeNode = null;
      setTimeout(function () { molePopDown(closed); setTimeout(function () { scheduleMole(closed); }, 280); }, 500);
    }
  });
}());

/* ─── BIBLIOGRAPHY SEARCH + FILTER ─────────────────────── */
(function () {
  var searchInput = document.getElementById('bib-search');
  var filterBtns  = document.querySelectorAll('.bib-filter');
  var entries     = document.querySelectorAll('.bib-entry');
  var noResults   = document.getElementById('bib-no-results');

  if (!searchInput) return;

  var currentFilter = 'all';
  var currentQuery  = '';

  function applyFilters() {
    var q = currentQuery.toLowerCase().trim();
    var f = currentFilter;
    var visible = 0;
    entries.forEach(function (entry) {
      var cats = (entry.dataset.cats || '').split(' ');
      var matchesCat = f === 'all' || cats.indexOf(f) !== -1;
      var text = entry.textContent.toLowerCase();
      var matchesQ = !q || text.indexOf(q) !== -1;
      var show = matchesCat && matchesQ;
      entry.dataset.hidden = show ? 'false' : 'true';
      if (show) visible++;
    });
    if (noResults) noResults.classList.toggle('visible', visible === 0);
  }

  searchInput.addEventListener('input', function () {
    currentQuery = this.value;
    applyFilters();
  });

  filterBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      filterBtns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      applyFilters();
    });
  });
}());
