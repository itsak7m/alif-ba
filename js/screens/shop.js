import { h, wait } from '../ui/dom.js';
import { applyKey, canSubmit } from '../ui/pad.js';
import { initialState, nextState, pickProblem } from '../engine/adapt.js';
import { diagnose } from '../engine/diagnose.js';
import { addAttempt } from '../store.js';
import { ITEM_INFO, promptClips, promptText, countText, LINE_TEXT } from '../data/catalog.js';
import { COUNTRIES } from '../data/countries.js';

const ROUND = 5;
const FACES = ['👵', '👴', '👨', '👩', '🧔', '👱‍♀️', '👨‍🦳', '🧕'];
const PRAISE = ['praise1', 'praise2', 'praise3'];
const randomOf = (list) => list[Math.floor(Math.random() * list.length)];

function moneyEl(country, v, extra = {}) {
  const kind = COUNTRIES[country].money.find((m) => m.v === v).kind;
  return h('span', { class: `money ${kind} v${v}`, ...extra }, String(v));
}

// Split an amount into the biggest pieces available (10, 5, 1).
function pieces(amount) {
  const out = [];
  for (const v of [10, 5, 1]) while (amount >= v) { out.push(v); amount -= v; }
  return out;
}

async function countAloud(ctx, alive, els, from = 1) {
  for (let i = 0; i < els.length && alive(); i++) {
    els[i].classList.add('lit');
    await Promise.all([ctx.audio.playSeq([`n${from + i}`]), wait(450)]);
  }
}

// ---- Level UIs: each returns { el, answer(), hint(), clear() } ----

function shelfLevel(p) {
  const info = ITEM_INFO[p.item];
  const shelf = h('div', { class: 'counter shelf', 'aria-label': 'الرف' });
  const add = h('button', { class: 'tile', 'aria-label': 'زيد واحد', onclick: () => {
    if (shelf.children.length >= 20) return;
    const t = h('button', { class: 'thing', 'aria-label': 'شيل', onclick: () => t.remove() }, info.emoji);
    shelf.append(t);
  } }, info.emoji);
  return {
    el: h('div', {}, shelf, h('div', { class: 'supply' }, add)),
    answer: () => shelf.children.length,
    async hint(ctx, alive) { await countAloud(ctx, alive, [...shelf.children]); },
    clear() { [...shelf.children].forEach((t) => t.classList.remove('lit')); },
  };
}

function orderLevel(p, onChange) {
  const group = (item, n) => h('div', { class: 'group', 'data-count': String(n) },
    Array.from({ length: n }, () => h('span', { class: 'thing' }, ITEM_INFO[item].emoji)));
  const ga = group(p.itemA, p.a);
  const gb = group(p.itemB, p.b);
  let display = '';
  const shown = h('div', { class: 'display', 'aria-live': 'polite' }, '');
  const press = (key) => { display = applyKey(display, key); shown.textContent = display; onChange(canSubmit(display)); };
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0'].map((k) =>
    h('button', { class: 'tile', 'aria-label': k === 'del' ? 'امسح' : k, onclick: () => press(k) }, k === 'del' ? '⌫' : k));
  return {
    el: h('div', {}, h('div', { class: 'counter' }, ga, h('span', { class: 'plus' }, '+'), gb), shown, h('div', { class: 'pad', dir: 'ltr' }, keys)),
    answer: () => Number(display),
    hasAnswer: () => canSubmit(display),
    async hint(ctx, alive) {
      // Count on from the bigger group instead of counting everything from 1.
      const [big, small, bigN] = p.a >= p.b ? [ga, gb, p.a] : [gb, ga, p.b];
      big.classList.add('boxed');
      await Promise.all([ctx.audio.playSeq([`n${bigN}`]), wait(700)]);
      if (alive()) await countAloud(ctx, alive, [...small.children], bigN + 1);
    },
    clear() {
      [ga, gb].forEach((g) => { g.classList.remove('boxed'); [...g.children].forEach((t) => t.classList.remove('lit')); });
      display = ''; shown.textContent = ''; onChange(false);
    },
  };
}

function changeLevel(p, country) {
  const cur = COUNTRIES[country].cur;
  const tray = h('div', { class: 'counter tray', 'aria-label': 'الباقي' });
  const sum = h('div', { class: 'tray-sum' }, '0');
  const total = () => [...tray.children].reduce((s, c) => s + Number(c.dataset.v), 0);
  const refresh = () => { sum.textContent = String(total()); };
  const supply = COUNTRIES[country].money.map(({ v }) => h('button', { class: 'tile', 'aria-label': String(v), onclick: () => {
    if (tray.children.length >= 15) return;
    const piece = moneyEl(country, v, { 'data-v': String(v), role: 'button', 'aria-label': 'شيل' });
    piece.addEventListener('click', () => { piece.remove(); refresh(); });
    tray.append(piece);
    refresh();
  } }, moneyEl(country, v)));
  const steps = h('div', { class: 'group' });
  return {
    el: h('div', {},
      h('div', { class: 'bill' },
        h('div', {}, h('div', { class: 'muted' }, 'الحساب'), h('div', { class: 'price-tag' }, countText(p.price, cur))),
        h('div', {}, h('div', { class: 'muted' }, 'دفعلك'), h('div', { class: 'paid' }, pieces(p.paid).map((v) => moneyEl(country, v))))),
      h('div', { class: 'muted center' }, LINE_TEXT.giveChange),
      tray, sum, steps,
      h('div', { class: 'supply' }, supply)),
    answer: total,
    async hint(ctx, alive) {
      // Count up from the price to what was paid: ones to the next ten, then tens.
      const marks = [];
      let at = p.price;
      while (at < p.paid) {
        const step = at % 10 === 0 && at + 10 <= p.paid ? 10 : 1;
        at += step;
        marks.push([at, step]);
      }
      steps.replaceChildren(...marks.map(([, step]) => h('span', { class: 'thing' }, `+${step}`)));
      for (let i = 0; i < marks.length && alive(); i++) {
        steps.children[i].classList.add('lit');
        await Promise.all([ctx.audio.playSeq([`n${marks[i][0]}`]), wait(450)]);
      }
    },
    clear() { tray.replaceChildren(); steps.replaceChildren(); refresh(); },
  };
}

export function render(root, ctx) {
  const { band } = ctx.state.child;
  const country = ctx.state.country;
  ctx.adaptByBand ??= {};
  let adapt = ctx.adaptByBand[band] ?? initialState(band);
  const used = new Set();
  let index = 0;
  let stars = 0;
  // Async feedback must not draw over another screen after the child navigates away.
  const seq = ctx.renderSeq;
  const alive = () => ctx.renderSeq === seq;

  const header = () => h('div', { class: 'shop-head' },
    h('a', { class: 'chip', href: '#/map' }, '→'),
    h('div', { class: 'progress', 'aria-label': `سؤال ${index + 1} من ${ROUND}` },
      Array.from({ length: ROUND }, (_, i) => h('i', { class: i < index ? 'done' : i === index ? 'now' : '' }))),
    h('span', { class: 'spacer' }),
    h('span', { class: 'avatar-small' }, ctx.state.child.avatar));

  function showProblem(p) {
    const text = promptText(p, country);
    const clips = promptClips(p, country);
    const feedback = h('div', { class: 'feedback', role: 'status' });
    const submit = h('button', { class: 'big submit', disabled: p.level === 'B' }, p.level === 'C' ? 'تفضّل ✓' : p.level === 'A' ? 'خلصت ✓' : '✓');
    const ui = p.level === 'A' ? shelfLevel(p) : p.level === 'B' ? orderLevel(p, (ok) => { submit.disabled = !ok || busy; }) : changeLevel(p, country);
    const face = randomOf(FACES);
    let attempt = 1;
    let busy = false;
    const t0 = performance.now();

    submit.addEventListener('click', async () => {
      if (busy) return;
      if (ui.hasAnswer && !ui.hasAnswer()) return;
      busy = true;
      submit.disabled = true;
      const answer = ui.answer();
      const correct = answer === p.answer;
      if (attempt === 1) {
        const ms = Math.round(performance.now() - t0);
        const d = diagnose(p, answer, ms);
        ctx.setState((s) => addAttempt(s, { ts: Date.now(), level: p.level, problemId: p.id, answer, ms, code: d.code, correct: d.correct, ...(d.note ? { note: d.note } : {}) }));
        adapt = nextState(adapt, band, d.correct);
        ctx.adaptByBand[band] = adapt;
        if (correct) stars++;
      }
      if (correct) {
        feedback.className = 'feedback good';
        feedback.textContent = attempt === 1 ? '🎉 صح!' : '👏 هيك صح!';
        const coin = h('div', { class: 'flyer', style: `left:${innerWidth / 2 - 16}px;top:${innerHeight / 2}px` }, '🪙');
        document.body.append(coin);
        setTimeout(() => coin.remove(), 1000);
        await Promise.all([ctx.audio.playSeq([randomOf(PRAISE)], 'برافو'), wait(1300)]);
        if (!alive()) return;
        index++;
        return next();
      }
      if (attempt === 1) {
        attempt = 2;
        feedback.className = 'feedback try';
        feedback.textContent = LINE_TEXT.tryAgain;
        await ctx.audio.playSeq(['tryAgain'], LINE_TEXT.tryAgain);
        if (!alive()) return;
        await ui.hint(ctx, alive);
        await wait(500);
        if (!alive()) return;
        ui.clear();
        feedback.textContent = 'جرّب كمان مرة 💪';
        busy = false;
        submit.disabled = p.level === 'B';
        return;
      }
      feedback.className = 'feedback try';
      feedback.textContent = `الجواب ${p.answer}. المرة الجاي بتزبط! 💛`;
      await Promise.all([ctx.audio.playSeq([`n${p.answer}`].filter(() => p.answer >= 1 && p.answer <= 50)), wait(2000)]);
      if (!alive()) return;
      index++;
      next();
    });

    root.replaceChildren(
      header(),
      h('div', { class: 'customer' },
        h('span', { class: 'customer-face', 'aria-hidden': 'true' }, face),
        h('div', { class: 'bubble' }, text),
        h('button', { class: 'replay', 'aria-label': 'اسمع مرة ثانية', onclick: () => ctx.audio.playSeq(clips, text) }, '🔊')),
      ui.el,
      submit,
      feedback,
    );
    ctx.audio.playSeq(clips, text);
  }

  function next() {
    if (index >= ROUND) return end();
    const p = pickProblem(ctx.bank, adapt, band, used, Math.random);
    used.add(p.id);
    showProblem(p);
  }

  function end() {
    root.replaceChildren(h('section', { class: 'round-end' },
      h('div', { class: 'hero-shop', 'aria-hidden': 'true' }, '🏪'),
      h('h2', {}, 'خلصت الجولة!'),
      h('div', { class: 'stars', 'aria-label': `${stars} نجوم من ${ROUND}` },
        Array.from({ length: ROUND }, (_, i) => h('span', { class: i < stars ? '' : 'off' }, '⭐'))),
      h('div', { class: 'stack center' },
        h('button', { class: 'big primary', onclick: () => ctx.refresh() }, 'كمان جولة 🔁'),
        h('button', { class: 'big secondary', onclick: () => ctx.go('map') }, 'خلصت'),
        h('a', { class: 'link', href: '#/report' }, 'تقرير الأهل'))));
    ctx.audio.playSeq(['roundEnd'], LINE_TEXT.roundEnd);
  }

  next();
}
