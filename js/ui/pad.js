// Number pad input: at most 2 digits, a lone leading zero is replaced.
const MAX_DIGITS = 2;

export function applyKey(display, key) {
  if (key === 'del') return display.slice(0, -1);
  if (display === '0') return key;
  return display.length >= MAX_DIGITS ? display : display + key;
}

export function canSubmit(display) {
  return display.length > 0;
}
