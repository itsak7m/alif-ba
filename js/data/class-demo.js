// Hand-built demo class (spec §8): 6 need regrouping, 4 miscount, 3 add one group only, the rest are on track.
const NAMES = ['سارة', 'عمر', 'ليان', 'يزن', 'جود', 'كرم', 'تالا', 'زيد', 'ريم', 'آدم', 'لين', 'حمزة',
  'ميرا', 'سيف', 'هيا', 'علي', 'جنى', 'فارس', 'دانة', 'مالك', 'رهف', 'يوسف', 'نور', 'باسل'];

const LEVEL = { count: 'A', add: 'B', sub: 'C' };

function skillAttempts(ts, skill, wrong, code) {
  return Array.from({ length: 6 }, (_, i) => {
    const bad = i < wrong;
    return { ts: ts + i * 1000, level: LEVEL[skill], problemId: 'demo', answer: 0, ms: 3000, code: bad ? code : 'ok', correct: !bad };
  });
}

function student(i, ts, mistakes) {
  const attempts = ['count', 'add', 'sub'].flatMap((skill) => {
    const m = mistakes[skill];
    return skillAttempts(ts, skill, m ? m[0] : 0, m ? m[1] : 'ok');
  });
  return { id: `s${i + 1}`, name: NAMES[i], attempts };
}

const PLAN = [
  { sub: [4, 'regroup_smaller_from_larger'] }, { sub: [4, 'regroup_smaller_from_larger'] }, { sub: [3, 'regroup_smaller_from_larger'] },
  { sub: [2, 'regroup_smaller_from_larger'] }, { sub: [2, 'regroup_smaller_from_larger'] }, { sub: [2, 'regroup_smaller_from_larger'] },
  { count: [3, 'count_off_by_one'] }, { count: [2, 'count_off_by_one'] }, { count: [2, 'count_off_by_one'] }, { count: [2, 'count_off_by_one'] },
  { add: [3, 'partial_add'] }, { add: [2, 'partial_add'] }, { add: [2, 'partial_add'] },
  {}, { sub: [1, 'other'] }, {}, {}, { add: [1, 'count_off_by_one'] }, {}, {}, { count: [1, 'other'] }, {}, {}, {},
];

export function makeClassDemo(now) {
  const ts = now.getTime() - 3600 * 1000;
  return PLAN.map((m, i) => student(i, ts, m));
}
