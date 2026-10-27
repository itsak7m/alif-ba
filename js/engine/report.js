import { CODE_PRIORITY } from './diagnose.js';
import { MESSAGES } from '../data/messages.js';

export const SKILL_OF = { A: 'count', B: 'add', C: 'sub' };

export function todayAttempts(attempts, now) {
  return attempts.filter((a) => new Date(a.ts).toDateString() === now.toDateString());
}

export function summarize(attempts) {
  const bySkill = { count: { n: 0, correct: 0 }, add: { n: 0, correct: 0 }, sub: { n: 0, correct: 0 } };
  const codeCounts = {};
  let correct = 0;
  for (const a of attempts) {
    const skill = bySkill[SKILL_OF[a.level]];
    skill.n++;
    if (a.correct) { skill.correct++; correct++; } else codeCounts[a.code] = (codeCounts[a.code] || 0) + 1;
  }
  let topCode = null;
  for (const code of CODE_PRIORITY) if ((codeCounts[code] || 0) > (codeCounts[topCode] || 0)) topCode = code;
  let strength = null;
  let best = -1;
  for (const [name, s] of Object.entries(bySkill)) {
    if (s.n >= 2 && s.correct / s.n > best) { best = s.correct / s.n; strength = name; }
  }
  const slow = attempts.some((a) => a.note === 'slow_counting_all');
  return { total: attempts.length, correct, bySkill, topCode, strength, slow };
}

export function fillMessage(text, { name, cur }) {
  return text.replaceAll('{name}', name).replaceAll('{cur}', cur);
}

export function shareText(summary, name, cur) {
  const m = MESSAGES[summary.topCode || 'none'];
  const fill = (t) => fillMessage(t, { name, cur });
  return [`تقرير ${name} اليوم من دكّانة عُلا 🏪`, fill(m.explain), `💡 ${fill(m.tip)}`, `🎯 مهمة الليلة: ${fill(m.mission)}`].join('\n');
}
