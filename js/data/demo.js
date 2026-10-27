// "Sara", a grade-2 demo child (spec §8): strong at counting, one adding slip, repeated regrouping mistake.
const ROWS = [
  ['A', 'ok', 7, 7], ['A', 'ok', 12, 12], ['A', 'ok', 9, 9], ['A', 'ok', 14, 14],
  ['B', 'ok', 13, 13], ['B', 'partial_add', 6, 15], ['B', 'ok', 21, 21], ['B', 'ok', 18, 18],
  ['C', 'ok', 3, 3], ['C', 'regroup_smaller_from_larger', 47, 33], ['C', 'ok', 10, 10],
  ['C', 'regroup_smaller_from_larger', 17, 13], ['C', 'regroup_smaller_from_larger', 25, 35],
];

export function makeSaraDemo(now) {
  const midnight = new Date(now).setHours(0, 0, 0, 0);
  const start = Math.max(now.getTime() - ROWS.length * 20000, midnight);
  return ROWS.map(([level, code, answer], i) => ({
    ts: start + i * 20000, level, problemId: 'demo', answer, ms: 4000, code, correct: code === 'ok',
  }));
}
