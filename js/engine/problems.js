import { randInt, pick } from './rng.js';

export const ITEMS = ['juice', 'biscuit', 'candy', 'bread'];

const B_MAX = { g1: 20, g23: 50 };
const pad = (i) => String(i).padStart(2, '0');

// Level A ("arrange the shelf"): every count 3..15 for every item.
export function generateLevelA() {
  const out = [];
  for (const item of ITEMS) {
    for (let n = 3; n <= 15; n++) {
      out.push({ id: `A-${item}-${n}`, level: 'A', band: 'g1', difficulty: n >= 10 ? 'hard' : 'easy', item, n, answer: n });
    }
  }
  return out;
}

// Level B ("customer order"): a + b with two different items.
export function generateLevelB(band, count, rng) {
  const max = B_MAX[band];
  const out = [];
  const seen = new Set();
  while (out.length < count) {
    const a = randInt(rng, 2, max - 2);
    const b = randInt(rng, 2, max - a);
    const itemA = pick(rng, ITEMS);
    const itemB = pick(rng, ITEMS.filter((x) => x !== itemA));
    const key = `${a}|${b}|${itemA}|${itemB}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const answer = a + b;
    out.push({ id: `B-${band}-${pad(out.length)}`, level: 'B', band, difficulty: answer > max / 2 ? 'hard' : 'easy', itemA, a, itemB, b, answer });
  }
  return out;
}

const C_RANGES = {
  easy: { min: 3, max: 19, paid: [10, 20] },
  hard: { min: 11, max: 49, paid: [20, 50] },
};

function cCombos({ min, max, paid }) {
  const combos = [];
  for (let price = min; price <= max; price++) for (const q of paid) if (q > price) combos.push([price, q]);
  return combos;
}

// Level C ("take payment, give change"): first half easy (grade-2 range), second half hard.
// The easy range only has 24 distinct (price, paid) pairs, so once every pair is used, pairs repeat.
export function generateLevelC(count, rng) {
  const out = [];
  const half = Math.floor(count / 2);
  for (const [difficulty, n] of [['easy', half], ['hard', count - half]]) {
    const combos = cCombos(C_RANGES[difficulty]);
    let pool = [];
    for (let i = 0; i < n; i++) {
      if (pool.length === 0) pool = combos.slice();
      const [price, paid] = pool.splice(randInt(rng, 0, pool.length - 1), 1)[0];
      out.push({ id: `C-g23-${pad(out.length)}`, level: 'C', band: 'g23', difficulty, price, paid, answer: paid - price });
    }
  }
  return out;
}
