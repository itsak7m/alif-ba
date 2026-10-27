// Maps a child's first answer to a named misconception (spec §7). First matching rule wins.
export const CODE_PRIORITY = [
  'returned_payment',
  'returned_price',
  'added_instead',
  'regroup_smaller_from_larger',
  'partial_add',
  'count_off_by_one',
  'other',
];

const SLOW_MS = 10000;

// The classic "subtract the smaller digit from the larger" answer, column by column.
export function smallerFromLarger(paid, price) {
  const ones = Math.abs((paid % 10) - (price % 10));
  const tens = Math.floor(paid / 10) - Math.floor(price / 10);
  return tens * 10 + ones;
}

function needsRegroup(p) {
  return p.paid % 10 < p.price % 10;
}

function wrongCode(p, answer) {
  if (p.level === 'C') {
    if (answer === p.paid) return 'returned_payment';
    if (answer === p.price) return 'returned_price';
    if (answer === p.paid + p.price) return 'added_instead';
    if (needsRegroup(p) && answer === smallerFromLarger(p.paid, p.price)) return 'regroup_smaller_from_larger';
  }
  if (p.level === 'B' && (answer === p.a || answer === p.b)) return 'partial_add';
  if (Math.abs(answer - p.answer) === 1) return 'count_off_by_one';
  return 'other';
}

export function diagnose(problem, answer, ms) {
  if (answer !== problem.answer) return { correct: false, code: wrongCode(problem, answer) };
  const result = { correct: true, code: 'ok' };
  if (problem.level === 'B' && ms > SLOW_MS && problem.answer <= 10) result.note = 'slow_counting_all';
  return result;
}
