import test from 'node:test';
import assert from 'node:assert/strict';
import { summarize, todayAttempts, shareText, fillMessage } from '../js/engine/report.js';

const now = new Date(2026, 9, 28, 18, 0);
const at = (level, code, extra = {}) => ({ ts: now.getTime(), level, problemId: 'x', answer: 0, ms: 3000, code, correct: code === 'ok', ...extra });

test('topCode is the most frequent mistake', () => {
  const s = summarize([
    at('C', 'regroup_smaller_from_larger'), at('C', 'regroup_smaller_from_larger'), at('C', 'regroup_smaller_from_larger'),
    at('A', 'count_off_by_one'), at('A', 'ok'), at('B', 'ok'),
  ]);
  assert.equal(s.topCode, 'regroup_smaller_from_larger');
  assert.equal(s.total, 6);
  assert.equal(s.correct, 2);
  assert.deepEqual(s.bySkill.sub, { n: 3, correct: 0 });
  assert.deepEqual(s.bySkill.count, { n: 2, correct: 1 });
});

test('ties go to the higher-priority code', () => {
  assert.equal(summarize([at('A', 'count_off_by_one'), at('B', 'partial_add')]).topCode, 'partial_add');
});

test('strength is the most accurate skill with at least 2 attempts', () => {
  const s = summarize([at('A', 'ok'), at('A', 'ok'), at('B', 'ok'), at('C', 'other'), at('C', 'ok')]);
  assert.equal(s.strength, 'count');
});

test('empty summary', () => {
  const s = summarize([]);
  assert.equal(s.total, 0);
  assert.equal(s.topCode, null);
  assert.equal(s.strength, null);
  assert.equal(s.slow, false);
});

test('slow flag from note', () => {
  assert.equal(summarize([at('B', 'ok', { note: 'slow_counting_all' })]).slow, true);
});

test('todayAttempts drops yesterday', () => {
  const y = { ...at('A', 'ok'), ts: now.getTime() - 24 * 3600 * 1000 };
  assert.equal(todayAttempts([y, at('A', 'ok')], now).length, 1);
});

test('fillMessage replaces placeholders', () => {
  assert.equal(fillMessage('{name} و{cur}', { name: 'سارة', cur: 'قروش' }), 'سارة وقروش');
});

test('shareText for regroup mistake', () => {
  const s = summarize([at('C', 'regroup_smaller_from_larger')]);
  const t = shareText(s, 'سارة', 'قروش');
  assert.ok(t.includes('سارة'));
  assert.ok(t.includes('اعطوا سارة 5 قطع عشرة'));
  assert.ok(!t.includes('{'));
});
