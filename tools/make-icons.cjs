// Renders the app icon (🏪 on the brand color) to icons/icon-192.png and icons/icon-512.png.
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  for (const size of [192, 512]) {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    await page.setContent(`<body style="margin:0;width:${size}px;height:${size}px;display:grid;place-items:center;background:radial-gradient(circle at 30% 25%,#8f5fd0,#6b3fa0 70%)"><span style="font-size:${Math.round(size * 0.62)}px;line-height:1">🏪</span></body>`);
    await page.screenshot({ path: `icons/icon-${size}.png` });
  }
  await browser.close();
})();
