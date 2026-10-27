import { h } from '../ui/dom.js';
import { todayAttempts, summarize, fillMessage, shareText } from '../engine/report.js';
import { MESSAGES } from '../data/messages.js';
import { COUNTRIES } from '../data/countries.js';
import { makeSaraDemo } from '../data/demo.js';
import { makeClassDemo } from '../data/class-demo.js';

const SKILLS = [['count', 'عدّ'], ['add', 'جمع'], ['sub', 'طرح']];
const SKILL_NAME = { count: 'العدّ', add: 'الجمع', sub: 'الطرح (الباقي)' };

export function renderReport(root, { name, avatar, attempts, country }) {
  const s = summarize(attempts);
  if (s.total === 0) {
    root.append(h('section', { class: 'card center' },
      h('p', {}, `${name} لسا ما لعب اليوم.`),
      h('a', { class: 'big primary', style: 'display:inline-block;text-decoration:none', href: '#/start' }, 'يلا نلعب ▶')));
    return;
  }
  const cur = COUNTRIES[country].cur.few;
  const fill = (t) => fillMessage(t, { name, cur });
  const watch = MESSAGES[s.topCode || 'none'];
  const pct = (k) => (s.bySkill[k].n ? Math.round((100 * s.bySkill[k].correct) / s.bySkill[k].n) : 0);

  root.append(...[
    h('div', { class: 'report-head' },
      h('span', { class: 'avatar-small' }, avatar),
      h('div', {}, h('h2', { style: 'margin:0' }, `تقرير ${name} اليوم`), h('div', { class: 'muted' }, `${s.correct} صح من ${s.total} محاولة`))),
    h('section', { class: 'card' },
      h('div', { class: 'skills' }, SKILLS.map(([k, label]) => h('div', { class: 'skill-row' },
        h('span', {}, label),
        h('div', { class: 'bar', role: 'img', 'aria-label': `${label} ${pct(k)}%` }, h('i', { style: `width:${pct(k)}%` })),
        h('span', { class: 'muted' }, s.bySkill[k].n ? `${pct(k)}% (${s.bySkill[k].n})` : '—'))))),
    s.strength ? h('section', { class: 'card strong' }, h('h3', {}, '🌟 وين أبدع'), h('p', { style: 'margin:0' }, `أقوى إشي عند ${name}: ${SKILL_NAME[s.strength]}.`)) : null,
    h('section', { class: 'card watch' }, h('h3', {}, s.topCode ? '👀 انتبهوا لـ' : '🎉 يوم ممتاز'), h('p', { style: 'margin:0 0 6px' }, fill(watch.explain)), h('p', { class: 'muted', style: 'margin:0' }, `💡 ${fill(watch.tip)}`)),
    s.slow && s.topCode !== 'slow_counting_all' ? h('section', { class: 'card' }, h('p', { style: 'margin:0' }, fill(MESSAGES.slow_counting_all.explain))) : null,
    h('section', { class: 'card mission' }, h('h3', {}, '🎯 مهمة الليلة (5 دقائق بعيد عن الشاشة)'), h('p', { style: 'margin:0' }, fill(watch.mission))),
    h('div', { class: 'actions' },
      h('a', { class: 'big whatsapp', href: `https://wa.me/?text=${encodeURIComponent(shareText(s, name, cur))}`, target: '_blank', rel: 'noopener' }, 'ابعتها عالواتساب 💬')),
  ].filter(Boolean));
}

export function render(root, ctx) {
  const studentId = ctx.params[0];
  const top = h('div', { class: 'topbar' }, h('a', { class: 'chip', href: studentId ? '#/teacher' : '#/start' }, '→ رجوع'), h('span', { class: 'spacer' }));
  root.append(top);
  const body = h('div', {});
  root.append(body);
  const now = new Date();

  if (studentId) {
    const student = makeClassDemo(now).find((x) => x.id === studentId);
    if (!student) { body.append(h('p', { class: 'center muted' }, 'ما لقينا هالطالب.')); return; }
    renderReport(body, { name: student.name, avatar: '🎒', attempts: student.attempts, country: ctx.state.country });
    return;
  }

  let demo = !ctx.state.child;
  const show = () => {
    body.replaceChildren();
    if (demo) renderReport(body, { name: 'سارة', avatar: '👧', attempts: makeSaraDemo(now), country: ctx.state.country });
    else renderReport(body, { name: 'بطلنا', avatar: ctx.state.child.avatar, attempts: todayAttempts(ctx.state.attempts, now), country: ctx.state.country });
    toggle.textContent = demo ? (ctx.state.child ? 'تقرير طفلي' : '') : 'طفل تجريبي';
    toggle.hidden = demo && !ctx.state.child;
  };
  const toggle = h('button', { class: 'chip', onclick: () => { demo = !demo; show(); } });
  top.append(toggle);
  show();
}
