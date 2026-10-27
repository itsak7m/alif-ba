// End-to-end checks against a local server: python3 -m http.server 8080
//   node tools/smoke.cjs [only-check-name]
const { chromium, webkit } = require('playwright');
const assert = require('node:assert/strict');
const BASE = process.env.BASE || 'http://localhost:8080/';

async function open(browser, { child, country = 'jo', viewport = { width: 390, height: 844 }, blockAudio = false } = {}) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|ERR_FAILED/.test(m.text())) errors.push(m.text()); });
  if (blockAudio) await page.route('**/audio/**', (r) => r.abort());
  await page.goto(BASE);
  if (child) {
    await page.evaluate(([c, k]) => localStorage.setItem('dukkana.v1', JSON.stringify({ child: c, country: k, attempts: [] })), [child, country]);
    await page.reload();
  }
  return { context, page, errors };
}

const attempts = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('dukkana.v1')).attempts);

// Answers the current problem correctly by reading the screen.
async function solve(page) {
  await page.waitForSelector('.submit');
  const level = await page.evaluate(() => (document.querySelector('.shelf') ? 'A' : document.querySelector('.pad') ? 'B' : 'C'));
  if (level === 'A') {
    const n = await page.evaluate(() => Number(document.querySelector('.bubble').textContent.match(/\d+/)[0]));
    for (let i = 0; i < n; i++) await page.click('.supply .tile');
  } else if (level === 'B') {
    const sum = await page.evaluate(() => document.querySelectorAll('.counter .thing').length);
    for (const d of String(sum)) await page.click(`.pad button[aria-label="${d}"]`);
  } else {
    const change = await page.evaluate(() => {
      const price = Number(document.querySelector('.price-tag').textContent.match(/\d+/)?.[0] ?? (document.querySelector('.price-tag').textContent.includes('ين') ? 2 : 1));
      const paid = [...document.querySelectorAll('.paid .money')].reduce((s, m) => s + Number(m.textContent), 0);
      return paid - price;
    });
    let left = change;
    for (const v of [10, 5, 1]) while (left >= v) { await page.click(`.supply .tile[aria-label="${v}"]`); left -= v; }
  }
  await page.click('.submit');
  return level;
}

async function playRound(page) {
  await page.goto(BASE + '#/shop');
  const levels = [];
  for (let i = 0; i < 5; i++) {
    levels.push(await solve(page));
    await page.waitForTimeout(1600);
  }
  await page.waitForSelector('.round-end', { timeout: 5000 });
  return levels;
}

const checks = {
  async shopRound(browser) {
    const { page, errors, context } = await open(browser, { child: { avatar: '👧', band: 'g23' } });
    const levels = await playRound(page);
    assert.equal((await attempts(page)).length, 5);
    assert.ok(levels.includes('C'), `expected to reach level C, got ${levels}`);
    await page.screenshot({ path: 'test-results/round-end.png' });
    assert.deepEqual(errors, [], errors.join(' | '));
    await context.close();
    return levels.join('');
  },
  async shopScreens(browser) {
    const { page, context } = await open(browser, { child: { avatar: '🧒', band: 'g1' } });
    await page.goto(BASE + '#/shop');
    await page.waitForSelector('.shelf');
    for (let i = 0; i < 3; i++) await page.click('.supply .tile');
    await page.screenshot({ path: 'test-results/shop-a.png' });
    await context.close();
    const g23 = await open(browser, { child: { avatar: '👧', band: 'g23' } });
    await g23.page.goto(BASE + '#/shop');
    await solve(g23.page); await g23.page.waitForTimeout(1600);
    await solve(g23.page); await g23.page.waitForTimeout(1600);
    await g23.page.waitForSelector('.tray');
    await g23.page.click('.supply .tile[aria-label="1"]');
    await g23.page.screenshot({ path: 'test-results/shop-c.png' });
    await g23.context.close();
  },
};

(async () => {
  const only = process.argv[2];
  const browser = await chromium.launch();
  let failed = 0;
  for (const [name, fn] of Object.entries(checks)) {
    if (only && name !== only) continue;
    try { const info = await fn(browser); console.log(`ok   ${name}${info ? ` (${info})` : ''}`); }
    catch (e) { failed++; console.log(`FAIL ${name}: ${e.message.split('\n')[0]}`); }
  }
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
