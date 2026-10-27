// Screenshot helper: node tools/shot.cjs <hash> <out.png> [width height] [clicks as CSS selectors...]
const { chromium } = require('playwright');
(async () => {
  const [hash, out, w = '390', hgt = '844', ...clicks] = process.argv.slice(2);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: +w, height: +hgt } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`http://localhost:8080/${hash}`);
  await page.waitForTimeout(600);
  for (const c of clicks) { await page.click(c); await page.waitForTimeout(400); }
  await page.screenshot({ path: out, fullPage: true });
  console.log(errors.length ? `console errors:\n${errors.join('\n')}` : 'no console errors');
  await browser.close();
})();
