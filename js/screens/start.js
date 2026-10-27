import { h } from '../ui/dom.js';
import { COUNTRIES } from '../data/countries.js';
import { resetChild } from '../store.js';
import { LINE_TEXT } from '../data/catalog.js';

const AVATARS = ['🧒', '👧', '👦', '👩‍🦱'];

export function render(root, ctx) {
  const { state } = ctx;
  let avatar = null;
  let greeted = false;

  const greet = () => {
    if (greeted) return;
    greeted = true;
    ctx.audio.unlock();
    ctx.audio.playSeq(['welcome'], LINE_TEXT.welcome);
  };

  const flag = h('button', {
    class: 'chip flag', 'aria-label': 'غيّر البلد',
    onclick: (e) => { e.stopPropagation(); ctx.setState((s) => ({ ...s, country: s.country === 'jo' ? 'sa' : 'jo' })); flag.textContent = COUNTRIES[ctx.state.country].flag; },
  }, COUNTRIES[state.country].flag);

  const top = h('div', { class: 'topbar' },
    flag,
    h('span', { class: 'spacer' }),
    h('a', { class: 'chip', href: '#/report' }, '👨‍👩‍👧 للأهل'),
    h('a', { class: 'chip', href: '#/teacher' }, '👩‍🏫 للمعلم'),
  );

  const hero = h('header', { class: 'hero' },
    h('div', { class: 'hero-shop', 'aria-hidden': 'true' }, '🏪'),
    h('h1', {}, 'دكّانة عُلا'),
    h('p', { class: 'muted' }, 'العب وتعلّم الحساب'),
  );

  let body;
  if (state.child) {
    body = h('section', { class: 'stack center' },
      h('div', { class: 'avatar-big' }, state.child.avatar),
      h('button', { class: 'big primary', onclick: () => { greet(); ctx.go('map'); } }, 'يلا نلعب ▶'),
      h('button', { class: 'link', onclick: () => { ctx.setState(resetChild); ctx.refresh(); } }, 'طفل جديد'),
    );
  } else {
    const avatars = AVATARS.map((a) => h('button', {
      class: 'tile avatar', 'aria-label': 'شخصية',
      onclick: (e) => { greet(); avatar = a; avatars.forEach((b) => b.classList.toggle('selected', b === e.currentTarget)); bands.classList.add('show'); ctx.audio.playSeq(['pick'], LINE_TEXT.pick); },
    }, a));
    const chooseBand = (band) => () => {
      if (!avatar) return;
      ctx.setState((s) => ({ ...s, child: { avatar, band } }));
      ctx.go('map');
    };
    const bands = h('div', { class: 'bands' },
      h('button', { class: 'tile band', onclick: chooseBand('g1') }, h('b', {}, '1'), h('small', {}, 'الصف الأول')),
      h('button', { class: 'tile band', onclick: chooseBand('g23') }, h('b', { dir: 'ltr' }, '2 – 3'), h('small', {}, 'الصف الثاني والثالث')),
    );
    body = h('section', { class: 'stack' }, h('div', { class: 'grid4' }, avatars), bands);
  }

  root.append(top, hero, body);
  root.addEventListener('pointerdown', greet, { once: true });
}
