// Same arithmetic in both countries; only the currency name, its clips and how money looks change.
export const COUNTRIES = {
  jo: {
    flag: '🇯🇴',
    cur: { one: 'قرش', two: 'قرشين', few: 'قروش' },
    curClip: 'jo',
    money: [{ v: 10, kind: 'coin' }, { v: 5, kind: 'coin' }, { v: 1, kind: 'coin' }],
  },
  sa: {
    flag: '🇸🇦',
    cur: { one: 'ريال', two: 'ريالين', few: 'ريالات' },
    curClip: 'sa',
    money: [{ v: 10, kind: 'note' }, { v: 5, kind: 'note' }, { v: 1, kind: 'coin' }],
  },
};
