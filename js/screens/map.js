import { h } from '../ui/dom.js';

const PLACES = [
  { emoji: '🏪', name: 'الدكانة', open: true },
  { emoji: '🥖', name: 'المخبز' },
  { emoji: '🍅', name: 'الحِسبة' },
  { emoji: '🚌', name: 'الباص' },
];

export function render(root, ctx) {
  const note = h('p', { class: 'muted center toast', role: 'status' }, '');
  const places = PLACES.map((p) => h('button', {
    class: `place ${p.open ? 'open' : 'locked'}`,
    onclick: () => { if (p.open) ctx.go('shop'); else note.textContent = `${p.name} قريباً 🔒`; },
  }, h('span', { class: 'place-emoji' }, p.emoji), h('span', {}, p.name), p.open ? null : h('span', { class: 'lock' }, '🔒')));

  root.append(
    h('div', { class: 'topbar' }, h('a', { class: 'chip', href: '#/start' }, '→ رجوع'), h('span', { class: 'spacer' }), h('span', { class: 'avatar-small' }, ctx.state.child.avatar)),
    h('h2', { class: 'center' }, 'عالم الحارة'),
    h('div', { class: 'map' }, places),
    note,
  );
}
