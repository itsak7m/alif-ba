import test from 'node:test';
import assert from 'node:assert/strict';
import { countClips, countText, promptClips, promptText, RECORDINGS, ITEM_INFO } from '../js/data/catalog.js';

test('countClips follows Arabic number agreement', () => {
  assert.deepEqual(countClips(1, 'juice'), ['juice-one']);
  assert.deepEqual(countClips(2, 'juice'), ['juice-two']);
  assert.deepEqual(countClips(7, 'juice'), ['n7', 'juice-few']);
  assert.deepEqual(countClips(12, 'juice'), ['n12', 'juice-one']);
});

test('countText mirrors the clip rule', () => {
  const f = ITEM_INFO.juice.forms;
  assert.equal(countText(1, f), 'علبة عصير');
  assert.equal(countText(2, f), 'علبتين عصير');
  assert.equal(countText(7, f), '7 علب عصير');
  assert.equal(countText(12, f), '12 علبة عصير');
});

test('level C prompt clips and text per country', () => {
  const p = { level: 'C', price: 17, paid: 20 };
  assert.deepEqual(promptClips(p, 'sa'), ['bill', 'n17', 'sa-one', 'here', 'n20', 'sa-one', 'change']);
  assert.equal(promptText(p, 'jo'), 'الحساب 17 قرش، وهاي 20 قرش. كم الباقي؟');
});

test('level A and B prompts', () => {
  assert.deepEqual(promptClips({ level: 'A', item: 'bread', n: 5 }, 'jo'), ['put', 'n5', 'bread-few', 'onShelf']);
  assert.equal(promptText({ level: 'B', itemA: 'juice', a: 3, itemB: 'candy', b: 2 }, 'jo'), 'بدّي 3 علب عصير، وكمان حبتين حلو. كم صاروا؟');
});

test('recordings have the scripted lengths and unique ids', () => {
  assert.deepEqual(RECORDINGS.map((r) => r.length), [50, 18, 8, 10]);
  const all = RECORDINGS.flat();
  assert.equal(new Set(all).size, 86);
});
