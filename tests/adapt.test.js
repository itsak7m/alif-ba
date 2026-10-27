import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, nextState, pickProblem } from '../js/engine/adapt.js';
import { makeRng } from '../js/engine/rng.js';

const twice = (s, band, ok) => nextState(nextState(s, band, ok), band, ok);
const st = (level, difficulty = 'easy') => ({ level, difficulty, right: 0, wrong: 0 });

test('initial level by band', () => {
  assert.equal(initialState('g1').level, 'A');
  assert.equal(initialState('g23').level, 'B');
  assert.equal(initialState('g1').difficulty, 'easy');
});

test('g1 climbs A→B, then B gets hard, never C', () => {
  assert.deepEqual(twice(st('A'), 'g1', true), st('B'));
  assert.deepEqual(twice(st('B'), 'g1', true), st('B', 'hard'));
});

test('g23 climbs to C and falls back', () => {
  assert.deepEqual(twice(st('B'), 'g23', true), st('C'));
  assert.deepEqual(twice(st('C'), 'g23', false), st('B'));
  assert.deepEqual(twice(st('B', 'hard'), 'g23', false), st('B'));
  assert.deepEqual(twice(st('B'), 'g23', false), st('B'));
});

test('mixed results reset streaks without changing level', () => {
  const s = nextState(nextState(st('B'), 'g23', true), 'g23', false);
  assert.deepEqual(s, { level: 'B', difficulty: 'easy', right: 0, wrong: 1 });
});

const bank = [
  { id: 'A1', level: 'A', band: 'g1', difficulty: 'easy' },
  { id: 'A2', level: 'A', band: 'g1', difficulty: 'easy' },
  { id: 'B1', level: 'B', band: 'g23', difficulty: 'hard' },
  { id: 'B2', level: 'B', band: 'g1', difficulty: 'easy' },
];

test('pickProblem respects level, band, difficulty and used ids', () => {
  const p = pickProblem(bank, st('A'), 'g1', new Set(['A1']), makeRng(1));
  assert.equal(p.id, 'A2');
  assert.equal(pickProblem(bank, st('B', 'hard'), 'g23', new Set(), makeRng(1)).id, 'B1');
});

test('pickProblem falls back when exhausted or no difficulty match', () => {
  const p = pickProblem(bank, st('A'), 'g1', new Set(['A1', 'A2']), makeRng(1));
  assert.equal(p.level, 'A');
  const q = pickProblem(bank, st('A', 'hard'), 'g1', new Set(), makeRng(1));
  assert.equal(q.level, 'A');
  assert.equal(q.difficulty, 'easy');
});
