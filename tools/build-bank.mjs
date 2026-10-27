// Writes data/bank.json: the fixed problem bank the app picks from (spec §9).
import { writeFileSync } from 'node:fs';
import { makeRng } from '../js/engine/rng.js';
import { generateLevelA, generateLevelB, generateLevelC } from '../js/engine/problems.js';

const problems = [
  ...generateLevelA(),
  ...generateLevelB('g1', 40, makeRng(11)),
  ...generateLevelB('g23', 40, makeRng(23)),
  ...generateLevelC(80, makeRng(37)),
];
writeFileSync(new URL('../data/bank.json', import.meta.url), JSON.stringify({ problems }) + '\n');
console.log(`wrote data/bank.json: ${problems.length} problems`);
