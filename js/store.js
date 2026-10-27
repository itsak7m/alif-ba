// App state persisted in localStorage. Every access is guarded: blocked storage
// (private mode, disabled site data) falls back to in-memory state.
const KEY = 'dukkana.v1';

export const DEFAULT_STATE = Object.freeze({ child: null, country: 'jo', attempts: [] });

function defaultStorage() {
  try { return globalThis.localStorage; } catch { return undefined; }
}

export function load(storage = defaultStorage()) {
  try {
    const raw = storage?.getItem(KEY);
    if (!raw) return { ...DEFAULT_STATE, attempts: [] };
    const s = JSON.parse(raw);
    return { child: s.child ?? null, country: s.country === 'sa' ? 'sa' : 'jo', attempts: Array.isArray(s.attempts) ? s.attempts : [] };
  } catch {
    return { ...DEFAULT_STATE, attempts: [] };
  }
}

export function save(state, storage = defaultStorage()) {
  try { storage?.setItem(KEY, JSON.stringify(state)); } catch { /* storage unavailable: keep in memory */ }
}

export function addAttempt(state, attempt) {
  return { ...state, attempts: [...state.attempts, attempt] };
}

export function resetChild(state) {
  return { child: null, country: state.country, attempts: [] };
}
