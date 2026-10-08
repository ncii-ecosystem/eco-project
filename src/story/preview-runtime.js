(async () => {
  const Eco = window.Eco;
  const stage = window.STORY_PREVIEW;
  const mon = document.getElementById('mon-screen');
  const style = document.createElement('style');
  style.textContent = `
    *, *::before, *::after { animation: none !important; transition: none !important; }
    #loader, .site-topnav, .progress-bar, .scroll-chapter, .endcard, .reader-controls, .dt-dock-wrap { display: none !important; }
    .mon-screen:not(.finale-mode) .mac-window { top: 12px !important; left: 12px !important; width: calc(100% - 24px) !important; height: calc(100% - 24px) !important; transform: none !important; }
    html.notes-open .mon-screen:not(.finale-mode) .mac-window { width: calc(100% - 380px) !important; }
    @media (max-width: 800px) { html.notes-open .mon-screen:not(.finale-mode) .mac-window { width: calc(100% - 24px) !important; } #notes-app { max-width: 45vw; } }
    .mac-window[hidden] { display: none !important; }
    #scene-notif { top: 24px !important; }
    .cw-overlay { inset: 0; }
    #notes-app { z-index: 10000; }
    .preview-end .endcard { display: block !important; position: fixed; inset: 0; z-index: 12000; overflow: auto; }
  `;
  document.head.append(style);
  Eco.showChatExplanation = () => {};
  Eco.advanceTo = () => {};
  Eco.holdScroll = () => {};
  Eco.hideNote = () => {
    document.getElementById('notes-app').classList.remove('open');
    document.documentElement.classList.remove('notes-open');
  };
  Eco.showNote = step => {
    if (!step) return;
    const note = document.getElementById('notes-app');
    note.classList.add('open');
    note.classList.toggle('pos-center', step.dataset.pos === 'center');
    note.classList.toggle('pos-top', step.dataset.pos === 'top');
    document.documentElement.classList.add('notes-open');
    document.getElementById('na-ed-body').innerHTML = step.querySelector('.step-key-text')?.innerHTML || '';
    const detail = document.getElementById('na-ed-details');
    detail.textContent = [...step.querySelectorAll('.step-detail p')].map(p => p.textContent).join('\n\n');
    const more = document.getElementById('na-more-btn');
    more.classList.toggle('visible', Boolean(detail.textContent));
    more.onclick = () => {
      const open = detail.classList.toggle('visible');
      note.classList.toggle('centered', open);
      more.setAttribute('aria-expanded', String(open));
      more.innerHTML = `<i class="fas fa-chevron-${open ? 'up' : 'down'}" aria-hidden="true"></i><span>${open ? 'less' : 'more'}</span>`;
    };
    document.getElementById('na-close').onclick = () => { detail.classList.remove('visible'); note.classList.remove('centered'); };
  };
  const windows = new Map();
  for (const scene of [...mon.querySelectorAll('.scene')]) {
    if (scene.id === 'scene-intro') continue;
    const win = document.createElement('div');
    win.className = 'mac-window'; win.dataset.chapter = scene.id;
    const config = Eco.CHAPTERS.find(ch => ch.scene === scene.id);
    win.innerHTML = '<div class="win-titlebar"><div class="win-traffic"><span class="wtl wtl-r"></span><span class="wtl wtl-y"></span><span class="wtl wtl-g"></span></div><div class="win-title"></div><div class="win-url"></div></div><div class="win-content"></div>';
    win.querySelector('.win-title').textContent = config?.label || scene.id;
    win.querySelector('.win-url').textContent = config?.url || `${scene.id}.example`;
    win.querySelector('.win-content').append(scene);
    scene.classList.add('active'); win.hidden = true; mon.append(win); windows.set(scene.id, win);
  }
  Eco.windows = { all: () => [...windows.values()] };
  function showWindow(id) {
    const win = windows.get(id);
    if (win) { win.hidden = false; win.classList.add('active'); }
  }
  const warning = document.getElementById('cw-overlay');
  if (stage.kind === 'warning') return;
  warning.classList.add('hidden');
  if (stage.kind === 'notification') {
    const config = Eco.NOTIF_CONFIG[stage.id];
    document.getElementById('sn-icon').innerHTML = config.icon;
    document.getElementById('sn-app').textContent = config.app;
    document.getElementById('sn-title').textContent = config.title;
    document.getElementById('sn-body').textContent = config.body;
    document.getElementById('scene-notif').classList.add('show');
    return;
  }
  const steps = [...document.querySelectorAll('.scroll-chapter .step')];
  const target = steps[stage.index];
  const chapter = target.closest('.scroll-chapter');
  const id = chapter.dataset.chapter;
  if (id === 'intro' || id === 'desk1') {
    mon.classList.add('desk-mode'); document.getElementById('scene-intro').classList.add('active');
    Eco.intro.newsOpen = true; Eco.intro.storyOpen = true;
  } else { mon.classList.add('flood-gone'); showWindow(chapter.dataset.scene); }
  if (id === 'finale') for (const key of windows.keys()) showWindow(key);
  // Replay only the selected chapter up to this stage, with motion and delays disabled.
  for (const step of chapter.querySelectorAll('.step')) {
    Eco.handleStep(step.dataset, 'down');
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    if (step === target) break;
  }
  if (target.dataset.rc === 'annotate-mdf') { for (const win of windows.values()) win.hidden = true; showWindow('mdf'); }
  if (target.dataset.md === 'move' || target.dataset.md === 'annotate-dev') { for (const win of windows.values()) win.hidden = true; showWindow('devplat'); }
  if (target.dataset.dm === 'annotate-email') { for (const win of windows.values()) win.hidden = true; showWindow('dm-email'); }
  if (target.classList.contains('step--k')) Eco.showNote(target);
  else if (id !== 'intro') {
    const previous = [...chapter.querySelectorAll('.step--k')].filter(step => steps.indexOf(step) <= stage.index).at(-1);
    if (previous) Eco.showNote(previous);
  }
  if (id === 'finale' && ['clear', 'graph', ...Eco.policy.STEPS].includes(target.dataset.fin)) {
    for (const win of mon.querySelectorAll('.mac-window')) win.classList.add('fin-vanish');
    mon.querySelector('.fin-final')?.classList.add('fin-out');
    Eco.graph.setProgress(1);
  }
  if (target.dataset.fin === 'end') document.body.classList.add('preview-end');
  document.getElementById('chat-send-btn').onclick = () => Eco.sendMessage();
})().catch(error => {
  const report = document.createElement('p');
  report.textContent = `Preview failed: ${error.message}`;
  report.style.cssText = 'position:fixed;top:0;left:0;z-index:99999;background:white;color:var(--db-chip-ink);padding:16px';
  document.body.append(report);
});
