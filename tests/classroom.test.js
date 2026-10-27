import test from 'node:test';
import assert from 'node:assert/strict';
import { skillColor, classroomView } from '../js/engine/classroom.js';
import { makeClassDemo } from '../js/data/class-demo.js';
import { makeSaraDemo } from '../js/data/demo.js';
import { summarize, todayAttempts } from '../js/engine/report.js';

const now = new Date(2026, 9, 28, 18, 0);

test('skill color thresholds', () => {
  assert.equal(skillColor({ n: 2, correct: 2 }), 'gray');
  assert.equal(skillColor({ n: 5, correct: 4 }), 'green');
  assert.equal(skillColor({ n: 4, correct: 2 }), 'yellow');
  assert.equal(skillColor({ n: 5, correct: 2 }), 'red');
});

test('demo class view: 24 rows and expected groups', () => {
  const v = classroomView(makeClassDemo(now));
  assert.equal(v.rows.length, 24);
  assert.equal(v.groups[0].code, 'regroup_smaller_from_larger');
  assert.equal(v.groups[0].studentIds.length, 6);
  const size = (code) => v.groups.find((g) => g.code === code).studentIds.length;
  assert.equal(size('count_off_by_one'), 4);
  assert.equal(size('partial_add'), 3);
  assert.equal(v.groups.length, 3);
});

test('Sara demo: today, regroup is the top mistake', () => {
  const a = makeSaraDemo(now);
  assert.equal(todayAttempts(a, now).length, a.length);
  assert.equal(summarize(a).topCode, 'regroup_smaller_from_larger');
});

test('Sara demo stays on the same day just after midnight', () => {
  const early = new Date(2026, 9, 28, 0, 1);
  const a = makeSaraDemo(early);
  assert.equal(todayAttempts(a, early).length, a.length);
});
