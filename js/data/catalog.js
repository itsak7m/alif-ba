import { COUNTRIES } from './countries.js';

export const ITEM_INFO = {
  juice: { emoji: '🧃', forms: { one: 'علبة عصير', two: 'علبتين عصير', few: 'علب عصير' } },
  biscuit: { emoji: '🍪', forms: { one: 'باكيت بسكوت', two: 'باكيتين بسكوت', few: 'باكيتات بسكوت' } },
  candy: { emoji: '🍬', forms: { one: 'حبة حلو', two: 'حبتين حلو', few: 'حبات حلو' } },
  bread: { emoji: '🍞', forms: { one: 'رغيف خبز', two: 'رغيفين خبز', few: 'أرغفة خبز' } },
};

const forms = (key) => ['one', 'two', 'few'].map((f) => `${key}-${f}`);

// Clip ids in the exact order they are spoken in docs/recording-script.md.
export const RECORDINGS = [
  Array.from({ length: 50 }, (_, i) => `n${i + 1}`),
  [...['juice', 'biscuit', 'candy', 'bread', 'jo', 'sa'].flatMap(forms)],
  ['put', 'onShelf', 'want', 'andAlso', 'howMany', 'bill', 'here', 'change'],
  ['welcome', 'pick', 'praise1', 'praise2', 'praise3', 'tryAgain', 'thanks', 'roundEnd', 'shelfDone', 'giveChange'],
];

export const LINE_TEXT = {
  put: 'حُط', onShelf: 'عالرف', want: 'بدّي', andAlso: 'وكمان', howMany: 'كم صاروا؟',
  bill: 'الحساب', here: 'وهاي', change: 'كم الباقي؟',
  welcome: 'أهلا وسهلا بدكانتك!', pick: 'اختار شخصيتك', praise1: 'برافو عليك!', praise2: 'ممتاز!',
  praise3: 'يا سلام عليك!', tryAgain: 'ولا يهمك، يلا نعدّ سوا', thanks: 'يسلمو إيديك!',
  roundEnd: 'خلصت الجولة! شوف كم نجمة جمعت', shelfDone: 'اكبس خلصت لما تخلّص', giveChange: 'رجّعلي الباقي',
};

// Arabic counted nouns: 1 → singular, 2 → dual (no digit), 3–10 → digit + plural, 11+ → digit + singular.
export function countClips(qty, key) {
  if (qty === 1) return [`${key}-one`];
  if (qty === 2) return [`${key}-two`];
  return [`n${qty}`, `${key}-${qty <= 10 ? 'few' : 'one'}`];
}

export function countText(qty, f) {
  if (qty === 1) return f.one;
  if (qty === 2) return f.two;
  return `${qty} ${qty <= 10 ? f.few : f.one}`;
}

export function promptClips(p, countryKey) {
  const cur = COUNTRIES[countryKey].curClip;
  if (p.level === 'A') return ['put', ...countClips(p.n, p.item), 'onShelf'];
  if (p.level === 'B') return ['want', ...countClips(p.a, p.itemA), 'andAlso', ...countClips(p.b, p.itemB), 'howMany'];
  return ['bill', ...countClips(p.price, cur), 'here', ...countClips(p.paid, cur), 'change'];
}

export function promptText(p, countryKey) {
  const cur = COUNTRIES[countryKey].cur;
  if (p.level === 'A') return `حُط ${countText(p.n, ITEM_INFO[p.item].forms)} عالرف`;
  if (p.level === 'B') return `بدّي ${countText(p.a, ITEM_INFO[p.itemA].forms)}، وكمان ${countText(p.b, ITEM_INFO[p.itemB].forms)}. كم صاروا؟`;
  return `الحساب ${countText(p.price, cur)}، وهاي ${countText(p.paid, cur)}. كم الباقي؟`;
}
