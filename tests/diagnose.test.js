import test from 'node:test';
import assert from 'node:assert/strict';
import { diagnose, smallerFromLarger, CODE_PRIORITY } from '../js/engine/diagnose.js';

const C = (price, paid) => ({ level: 'C', price, paid, answer: paid - price });
const B = (a, b) => ({ level: 'B', a, b, answer: a + b });
const A = (n) => ({ level: 'A', n, answer: n });
const code = (p, ans, ms = 3000) => diagnose(p, ans, ms).code;

test('C 50-17: each misconception code', () => {
  const p = C(17, 50);
  assert.deepEqual(diagnose(p, 33, 3000), { correct: true, code: 'ok' });
  assert.equal(code(p, 50), 'returned_payment');
  assert.equal(code(p, 17), 'returned_price');
  assert.equal(code(p, 67), 'added_instead');
  assert.equal(code(p, 47), 'regroup_smaller_from_larger');
  assert.equal(code(p, 32), 'count_off_by_one');
  assert.equal(code(p, 34), 'count_off_by_one');
  assert.equal(code(p, 5), 'other');
  assert.equal(diagnose(p, 47, 3000).correct, false);
});

test('C 20-17: returned_price has priority over regroup', () => {
  assert.equal(smallerFromLarger(20, 17), 17);
  assert.equal(code(C(17, 20), 17), 'returned_price');
});

test('B: partial_add, off by one, slow note', () => {
  assert.equal(code(B(3, 4), 3), 'partial_add');
  assert.equal(code(B(3, 4), 8), 'count_off_by_one');
  assert.deepEqual(diagnose(B(3, 4), 7, 12000), { correct: true, code: 'ok', note: 'slow_counting_all' });
  assert.deepEqual(diagnose(B(6, 7), 13, 12000), { correct: true, code: 'ok' });
});

test('A: off by one and other', () => {
  assert.equal(code(A(7), 6), 'count_off_by_one');
  assert.equal(code(A(7), 9), 'other');
});

test('priority list order', () => {
  assert.deepEqual(CODE_PRIORITY, ['returned_payment', 'returned_price', 'added_instead', 'regroup_smaller_from_larger', 'partial_add', 'count_off_by_one', 'other']);
});
