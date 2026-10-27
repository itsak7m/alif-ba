import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../js/engine/rng.js';
import { generateLevelA, generateLevelB, generateLevelC } from '../js/engine/problems.js';

test('rng is deterministic', () => {
  const r1 = makeRng(42), r2 = makeRng(42);
  assert.equal(r1(), r2());
});

test('level A has 52 problems in range', () => {
  const ps = generateLevelA();
  assert.equal(ps.length, 52);
  for (const p of ps) {
    assert.ok(p.n >= 3 && p.n <= 15);
    assert.equal(p.answer, p.n);
    assert.equal(p.difficulty, p.n >= 10 ? 'hard' : 'easy');
  }
  assert.equal(new Set(ps.map(p => p.id)).size, 52);
});

test('level B respects band limits', () => {
  for (const [band, max] of [['g1', 20], ['g23', 50]]) {
    const ps = generateLevelB(band, 40, makeRng(1));
    assert.equal(ps.length, 40);
    for (const p of ps) {
      assert.ok(p.a >= 2 && p.b >= 2 && p.a + p.b <= max);
      assert.notEqual(p.itemA, p.itemB);
      assert.equal(p.answer, p.a + p.b);
      assert.equal(p.difficulty, p.answer > max / 2 ? 'hard' : 'easy');
    }
  }
});

test('level C easy/hard ranges and paid > price', () => {
  const ps = generateLevelC(80, makeRng(2));
  assert.equal(ps.length, 80);
  for (const p of ps) {
    assert.ok(p.paid > p.price);
    assert.equal(p.answer, p.paid - p.price);
    if (p.difficulty === 'easy') assert.ok(p.price >= 3 && p.price <= 19 && [10, 20].includes(p.paid));
    else assert.ok(p.price >= 11 && p.price <= 49 && [20, 50].includes(p.paid));
  }
  assert.equal(ps.filter(p => p.difficulty === 'easy').length, 40);
});
