import { summarize } from './report.js';

export function skillColor({ n, correct }) {
  if (n < 3) return 'gray';
  const acc = correct / n;
  if (acc >= 0.8) return 'green';
  if (acc >= 0.5) return 'yellow';
  return 'red';
}

// Per-student skill colors plus suggested small groups: a student joins a code's group
// when that mistake shows up at least twice (spec §7).
export function classroomView(students) {
  const rows = [];
  const groups = new Map();
  for (const s of students) {
    const { bySkill } = summarize(s.attempts);
    rows.push({ id: s.id, name: s.name, colors: { count: skillColor(bySkill.count), add: skillColor(bySkill.add), sub: skillColor(bySkill.sub) } });
    const counts = {};
    for (const a of s.attempts) if (!a.correct) counts[a.code] = (counts[a.code] || 0) + 1;
    for (const [code, c] of Object.entries(counts)) {
      if (c < 2) continue;
      if (!groups.has(code)) groups.set(code, []);
      groups.get(code).push(s.id);
    }
  }
  const sorted = [...groups].map(([code, studentIds]) => ({ code, studentIds })).sort((a, b) => b.studentIds.length - a.studentIds.length);
  return { rows, groups: sorted };
}
