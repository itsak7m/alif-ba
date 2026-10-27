import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { promptClips, RECORDINGS } from '../js/data/catalog.js';

const bank = JSON.parse(readFileSync(new URL('../data/bank.json', import.meta.url)));

test('bank has the expected problem counts', () => {
  const n = (f) => bank.problems.filter(f).length;
  assert.equal(bank.problems.length, 212);
  assert.equal(n((p) => p.level === 'A'), 52);
  assert.equal(n((p) => p.level === 'B' && p.band === 'g1'), 40);
  assert.equal(n((p) => p.level === 'B' && p.band === 'g23'), 40);
  assert.equal(n((p) => p.level === 'C'), 80);
  assert.equal(new Set(bank.problems.map((p) => p.id)).size, 212);
});

test('every clip used by the app exists', (t) => {
  if (!existsSync(new URL('../audio/clips/', import.meta.url))) return t.skip('audio/clips/ missing: recordings not split yet');
  const needed = new Set(RECORDINGS.flat());
  for (const p of bank.problems) for (const c of ['jo', 'sa']) for (const id of promptClips(p, c)) needed.add(id);
  const missing = [...needed].filter((id) => {
    const f = new URL(`../audio/clips/${id}.mp3`, import.meta.url);
    return !existsSync(f) || statSync(f).size < 1000;
  });
  assert.deepEqual(missing, []);
});
