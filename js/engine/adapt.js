// Adaptive difficulty (spec §6): two right in a row moves up, two wrong moves down.
const LADDER = { g1: ['A', 'B'], g23: ['B', 'C'] };

export function initialState(band) {
  return { level: LADDER[band][0], difficulty: 'easy', right: 0, wrong: 0 };
}

export function nextState(state, band, correct) {
  const right = correct ? state.right + 1 : 0;
  const wrong = correct ? 0 : state.wrong + 1;
  const ladder = LADDER[band];
  const i = ladder.indexOf(state.level);
  if (right >= 2) {
    if (i < ladder.length - 1) return { level: ladder[i + 1], difficulty: 'easy', right: 0, wrong: 0 };
    return { level: state.level, difficulty: 'hard', right: 0, wrong: 0 };
  }
  if (wrong >= 2) {
    if (state.difficulty === 'hard') return { level: state.level, difficulty: 'easy', right: 0, wrong: 0 };
    return { level: ladder[Math.max(0, i - 1)], difficulty: 'easy', right: 0, wrong: 0 };
  }
  return { ...state, right, wrong };
}

export function pickProblem(bank, state, band, usedIds, rng) {
  const ofLevel = bank.filter((p) => p.level === state.level && (p.level !== 'B' || p.band === band));
  const fresh = ofLevel.filter((p) => !usedIds.has(p.id));
  const candidates = [fresh.filter((p) => p.difficulty === state.difficulty), fresh, ofLevel].find((c) => c.length > 0);
  if (!candidates) return undefined;
  return candidates[Math.floor(rng() * candidates.length)];
}
