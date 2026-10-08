(async () => {
  const select = document.getElementById('stage');
  const frame = document.getElementById('preview');
  const status = document.getElementById('status');
  try {
    const response = await fetch('/src/story/index.html');
    if (!response.ok) throw new Error('Could not load the story.');
    const source = await response.text();
    const template = new DOMParser().parseFromString(source, 'text/html');
    const stages = [{ label: 'Content warning', kind: 'warning' }];
    const groups = new Map();
    template.querySelectorAll('.scroll-chapter .step').forEach((step, index) => {
      const chapter = step.closest('.scroll-chapter').dataset.chapter;
      const state = Object.entries(step.dataset).filter(([key]) => !['pos', 'msg', 'offset', 'nkey'].includes(key)).map(([key, value]) => `${key}: ${value}`).join(', ');
      const title = step.querySelector('.step-label')?.textContent || step.querySelector('p')?.textContent || state;
      const entry = { kind: 'step', index, label: `${state} — ${title.trim().slice(0, 85)}` };
      if (!groups.has(chapter)) groups.set(chapter, []);
      groups.get(chapter).push(entry);
    });
    function addOption(stage, parent) {
      const option = document.createElement('option');
      option.value = String(stages.indexOf(stage));
      option.textContent = stage.label;
      parent.append(option);
    }
    addOption(stages[0], select);
    for (const [chapter, entries] of groups) {
      const group = document.createElement('optgroup');
      group.label = chapter;
      for (const entry of entries) { stages.push(entry); addOption(entry, group); }
      select.append(group);
    }
    const notifications = document.createElement('optgroup');
    notifications.label = 'Notifications';
    for (const id of ['cover', 'interface', 'models', 'reddit', 'search', 'appstore', 'payment', 'cloud', 'dm']) {
      const stage = { kind: 'notification', id, label: `${id} notification` };
      stages.push(stage); addOption(stage, notifications);
    }
    select.append(notifications);
    function render() {
      const stage = stages[Number(select.value)];
      const doc = new DOMParser().parseFromString(source, 'text/html');
      doc.querySelectorAll('script').forEach(script => script.remove());
      const base = doc.createElement('base'); base.href = location.origin + '/'; doc.head.prepend(base);
      const boot = doc.createElement('script');
      boot.textContent = `window.STORY_PREVIEW = ${JSON.stringify(stage)};
        const originalMatchMedia = window.matchMedia.bind(window);
        window.matchMedia = query => query.includes('prefers-reduced-motion') ? { matches: true, addEventListener() {}, removeEventListener() {} } : originalMatchMedia(query);
        const originalTimeout = window.setTimeout.bind(window);
        window.setTimeout = (callback, delay, ...args) => originalTimeout(callback, 0, ...args);
        const originalAnimate = Element.prototype.animate;
        Element.prototype.animate = function(frames, options) { return originalAnimate.call(this, frames, { ...(typeof options === 'object' ? options : {}), duration: 0, delay: 0 }); };`;
      doc.body.append(boot);
      for (const file of ['scenes.js', 'graph.js', 'policy.js', 'finale.js', 'preview-runtime.js']) {
        const script = doc.createElement('script'); script.src = `/src/story/${file}`; doc.body.append(script);
      }
      frame.srcdoc = '<!doctype html>\n' + doc.documentElement.outerHTML;
      history.replaceState(null, '', `?stage=${select.value}`);
      document.getElementById('previous').disabled = select.selectedIndex === 0;
      document.getElementById('next').disabled = select.selectedIndex === select.options.length - 1;
      status.hidden = true;
    }
    const requested = Number(new URLSearchParams(location.search).get('stage'));
    select.selectedIndex = Number.isInteger(requested) && requested >= 0 && requested < stages.length ? requested : 0;
    select.addEventListener('change', render);
    document.getElementById('previous').onclick = () => { if (select.selectedIndex > 0) { select.selectedIndex--; render(); } };
    document.getElementById('next').onclick = () => { if (select.selectedIndex < stages.length - 1) { select.selectedIndex++; render(); } };
    document.getElementById('refresh').onclick = render;
    render();
  } catch (error) { status.textContent = error.message; }
})();
