import { h } from '../ui/dom.js';
import { classroomView } from '../engine/classroom.js';
import { makeClassDemo } from '../data/class-demo.js';

const LESSON = {
  regroup_smaller_from_larger: 'درس الاستلاف',
  count_off_by_one: 'العدّ بالتأشير',
  partial_add: 'جمع مجموعتين',
  returned_payment: 'معنى الباقي',
  returned_price: 'معنى الباقي',
  added_instead: 'معنى الباقي',
  other: 'مراجعة الأرقام',
};
const COLOR_LABEL = { green: 'متمكّن', yellow: 'بيتطوّر', red: 'بحاجة دعم', gray: 'محاولات قليلة' };

export function render(root, ctx) {
  const students = makeClassDemo(new Date());
  const view = classroomView(students);
  const nameOf = Object.fromEntries(students.map((s) => [s.id, s.name]));
  const dot = (c) => h('span', { class: `dot ${c}`, title: COLOR_LABEL[c], 'aria-label': COLOR_LABEL[c] });

  const table = h('table', { class: 'teacher-grid' },
    h('thead', {}, h('tr', {}, h('th', {}, 'الطالب'), h('th', {}, 'عدّ'), h('th', {}, 'جمع'), h('th', {}, 'طرح'))),
    h('tbody', {}, view.rows.map((r) => h('tr', { tabindex: '0', onclick: () => ctx.go(`report/${r.id}`), onkeydown: (e) => { if (e.key === 'Enter') ctx.go(`report/${r.id}`); } },
      h('td', {}, r.name), h('td', {}, dot(r.colors.count)), h('td', {}, dot(r.colors.add)), h('td', {}, dot(r.colors.sub))))));

  const groups = view.groups.map((g) => h('section', { class: 'card group-card' },
    h('h3', {}, `${g.studentIds.length} طلاب بحاجة ${LESSON[g.code] || 'مراجعة'}`),
    h('p', { class: 'names', style: 'margin:0' }, g.studentIds.map((id) => nameOf[id]).join('، '))));

  root.append(
    h('div', { class: 'topbar' }, h('a', { class: 'chip', href: '#/start' }, '→ رجوع'), h('span', { class: 'spacer' }), h('span', { class: 'muted' }, 'صف تجريبي · الثاني أ')),
    h('h2', {}, 'خريطة أغلاط الصف'),
    h('div', { class: 'legend' }, Object.entries(COLOR_LABEL).map(([c, l]) => h('span', {}, dot(c), ' ', l))),
    h('div', { class: 'teacher-layout' },
      h('div', { class: 'card' }, table),
      h('div', {}, h('h3', { style: 'margin-bottom:10px' }, '👥 مجموعات مقترحة لبكرا'), groups)),
  );
}
