import { load, save } from './store.js';
import { createAudio } from './audio.js';
import { h } from './ui/dom.js';
import * as start from './screens/start.js';
import * as map from './screens/map.js';
import * as shop from './screens/shop.js';
import * as report from './screens/report.js';
import * as teacher from './screens/teacher.js';

const ROUTES = { start, map, shop, report, teacher };
const root = document.getElementById('app');

const ctx = {
  state: load(),
  bank: [],
  audio: createAudio(),
  params: [],
  go(route) { location.hash = `#/${route}`; },
  refresh() { render(); },
  setState(fn) { ctx.state = fn(ctx.state); save(ctx.state); },
};

function render() {
  const [name = 'start', ...params] = location.hash.replace(/^#\/?/, '').split('/');
  const screen = ROUTES[name] || start;
  // Playing needs a chosen child; send anyone else back to the start screen.
  if ((screen === shop || screen === map) && !ctx.state.child) return ctx.go('start');
  ctx.audio.stop();
  ctx.params = params;
  root.replaceChildren();
  root.dataset.screen = name in ROUTES ? name : 'start';
  screen.render(root, ctx);
  window.scrollTo(0, 0);
}

async function boot() {
  try {
    const res = await fetch('data/bank.json');
    ctx.bank = (await res.json()).problems;
  } catch {
    root.replaceChildren(h('p', { class: 'error' }, 'ما قدرنا نحمّل الأسئلة. جرّب تحدّث الصفحة.'));
    return;
  }
  window.addEventListener('hashchange', render);
  render();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}

boot();
