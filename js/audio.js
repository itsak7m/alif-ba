// Plays prompts as sequences of recorded clips through ONE reused <audio> element
// (iOS Safari only lets an element play after it was started inside a user tap).
// Never rejects: a clip that fails is skipped so the game keeps going without sound.
const CLIP_TIMEOUT_MS = 5000;

export function createAudio({ base = 'audio/clips/' } = {}) {
  const el = typeof Audio === 'function' ? new Audio() : null;
  let token = 0;
  let unlocked = false;
  let cancelCurrent = null;

  function playOne(id, my) {
    return new Promise((resolve) => {
      if (!el || my !== token) return resolve(false);
      let done = false;
      const finish = (ok) => { if (!done) { done = true; clearTimeout(timer); el.onended = el.onerror = null; cancelCurrent = null; resolve(ok); } };
      cancelCurrent = () => finish(false);
      const timer = setTimeout(() => finish(false), CLIP_TIMEOUT_MS);
      el.onended = () => finish(true);
      el.onerror = () => finish(false);
      el.src = `${base}${id}.mp3`;
      const p = el.play();
      if (p && p.catch) p.catch(() => finish(false));
    });
  }

  function speak(text) {
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ar-JO';
      u.rate = 0.9;
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    } catch { /* no speech synthesis: visuals carry the prompt */ }
  }

  async function playSeq(ids, fallbackText) {
    const my = ++token;
    let played = false;
    for (const id of ids) {
      if (my !== token) return;
      played = (await playOne(id, my)) || played;
    }
    if (!played && fallbackText && my === token) speak(fallbackText);
  }

  function stop() {
    token++;
    cancelCurrent?.();
    try { el?.pause(); } catch { /* ignore */ }
    try { speechSynthesis.cancel(); } catch { /* ignore */ }
  }

  function unlock() {
    if (unlocked || !el) return;
    unlocked = true;
    try {
      el.muted = true;
      const p = el.play();
      const unmute = () => { el.pause(); el.muted = false; };
      if (p && p.then) p.then(unmute, unmute); else unmute();
    } catch { el.muted = false; }
  }

  return { unlock, playSeq, stop };
}
