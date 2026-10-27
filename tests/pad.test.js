import test from 'node:test';
import assert from 'node:assert/strict';
import { applyKey, canSubmit } from '../js/ui/pad.js';

test('number pad input rules', () => {
  assert.equal(applyKey('', '0'), '0');
  assert.equal(applyKey('0', '7'), '7');
  assert.equal(applyKey('1', '2'), '12');
  assert.equal(applyKey('12', '3'), '12');
  assert.equal(applyKey('12', 'del'), '1');
  assert.equal(applyKey('', 'del'), '');
});

test('submit needs a value', () => {
  assert.equal(canSubmit(''), false);
  assert.equal(canSubmit('0'), true);
});
