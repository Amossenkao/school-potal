const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    console.log('Initial load OK');
    // Verify a static asset is cached by service worker (e.g., the manifest)
    await context.setOffline(true);
    // Try to reload same page while offline; should be served from cache
    await page.reload({ waitUntil: 'load' });
    console.log('Reload while offline succeeded');
    console.log('PASS: Offline support works');
  } catch (e) {
    console.error('FAIL: Offline test error', e);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
