import test from 'node:test';
import assert from 'node:assert/strict';
import { load, save, addAttempt, resetChild, DEFAULT_STATE } from '../js/store.js';

const throwing = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
const mapStorage = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };

test('blocked storage gives the default state', () => {
  assert.deepEqual(load(throwing), { child: null, country: 'jo', attempts: [] });
  assert.deepEqual(DEFAULT_STATE, { child: null, country: 'jo', attempts: [] });
});

test('save with blocked storage does not throw', () => {
  assert.doesNotThrow(() => save({ child: null, country: 'jo', attempts: [] }, throwing));
});

test('round trip through storage', () => {
  const s = mapStorage();
  const state = addAttempt({ child: { avatar: '👧', band: 'g23' }, country: 'sa', attempts: [] }, { ts: 1, level: 'C', problemId: 'C-g23-00', answer: 3, ms: 2000, code: 'ok', correct: true });
  save(state, s);
  assert.deepEqual(load(s), state);
});

test('corrupt stored JSON falls back to default', () => {
  const s = mapStorage();
  s.setItem('dukkana.v1', '{nope');
  assert.deepEqual(load(s), DEFAULT_STATE);
});

test('resetChild keeps country and clears child and attempts', () => {
  assert.deepEqual(resetChild({ child: { avatar: 'x', band: 'g1' }, country: 'sa', attempts: [{}] }), { child: null, country: 'sa', attempts: [] });
});
