import { mountSystemChart } from './modules/system-chart.js';
import { mountLawSection, stepsHtml } from './modules/law.js';

const host = document.getElementById('research-visual');
const title = document.getElementById('research-detail-title');
const body = document.getElementById('research-detail-body');
/* Additional view controls paused for now.
const topic = document.getElementById('research-law-topic');
const controls = document.getElementById('research-law-controls');
const buttons = [...document.querySelectorAll('[data-view]')];
*/
const Eco = {
  replaying: true,
  onActivate(element, handler) {
    element.addEventListener('click', handler);
    element.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handler(event);
      }
    });
  },
  showNote(step) {
    title.textContent = step.querySelector('.step-label').textContent;
    const content = [step.querySelector('.step-key-text'), ...step.querySelectorAll('.step-detail > *')];
    body.replaceChildren(...content.filter(Boolean).map(node => node.cloneNode(true)));
  },
};

try {
  const graph = mountSystemChart({ Eco, mon: host });
  const policy = mountLawSection({ Eco, mon: host, motionScope: {
    setTimeout(callback) { callback(); return 0; },
    clearTimeout() {},
    requestAnimationFrame(callback) { callback(); return 0; },
  } });
  const fragments = new DOMParser().parseFromString(stepsHtml, 'text/html');
  const topics = [...fragments.querySelectorAll('.step[data-fin]')];
  /* Additional research views paused for now.
  topics.forEach(step => topic.add(new Option(step.querySelector('.step-label').textContent, step.dataset.fin)));
  topic.value = 'law-map';
  graph.setProgress(1);
  policy.reset();
  function showLawTopic() {
    policy.step(topic.value);
    const step = topics.find(step => step.dataset.fin === topic.value);
    Eco.showNote(step);
  }
  buttons.forEach(button => button.addEventListener('click', () => {
    const law = button.dataset.view === 'law';
    buttons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    controls.hidden = !law;
    policy.reset();
    graph.select(null);
    graph.setProgress(1);
    if (law) showLawTopic();
    else {
      title.textContent = 'The technology ecosystem';
      const paragraph = document.createElement('p');
      paragraph.textContent = 'Select a box to read about its role.';
      body.replaceChildren(paragraph);
    }
  }));
  topic.addEventListener('change', showLawTopic);
  */
  const viewButtons = [...document.querySelectorAll('[data-view]')];
  function fitChart() {
    const { svg, NODES } = graph.ext;
    const legendGroup = svg.querySelector('.eg-legend');
    const legend = legendGroup.getBBox();
    if (!legend.width) return;
    const left = Math.min(...NODES.map(node => node.x));
    legendGroup.setAttribute('transform', `translate(${left - legend.x} 0)`);
    const bounds = [...NODES.map(node => ({ x: node.x, y: node.y, width: node.w, height: node.h })),
      { x: left, y: legend.y, width: legend.width, height: legend.height }];
    const x = Math.min(...bounds.map(box => box.x));
    const y = Math.min(...bounds.map(box => box.y));
    const right = Math.max(...bounds.map(box => box.x + box.width));
    const bottom = Math.max(...bounds.map(box => box.y + box.height));
    svg.setAttribute('viewBox', `${x} ${y} ${right - x} ${bottom - y}`);
  }
  function setView(view) {
    host.closest('.about-research').dataset.view = view;
    policy.reset();
    graph.select(null);
    graph.setProgress(1);
    viewButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === view)));
    if (view === 'law') {
      policy.step('law-map');
      Eco.showNote(topics.find(step => step.dataset.fin === 'law-map'));
    } else {
      fitChart();
      title.textContent = 'The technology ecosystem';
      const paragraph = document.createElement('p');
      paragraph.textContent = 'Select a box to read about its role.';
      body.replaceChildren(paragraph);
    }
  }
  viewButtons.forEach(button => button.addEventListener('click', () => setView(button.dataset.view)));
  setView('system');
  document.fonts.ready.then(() => {
    if (host.closest('.about-research').dataset.view === 'system') fitChart();
  });
} catch (error) {
  document.getElementById('research-error').hidden = false;
  console.error('Research explorer failed to initialize', error);
}
