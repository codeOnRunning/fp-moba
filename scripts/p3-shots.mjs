import { chromium } from 'playwright-core';

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
await page.waitForFunction(
  () => {
    const button = document.querySelector('#start-button');
    return button && !button.disabled;
  },
  { timeout: 60000 },
);
await page.selectOption('#difficulty-select', 'hard');
await page.locator('#start-button').click();
await page.waitForTimeout(4000);
await page.evaluate(() => window.__fpMoba?.damageDummy(1800));
await page.waitForTimeout(500);
await page.screenshot({ path: 'screenshots/p3-upgrade.png' });
console.log(
  'rarities',
  await page
    .locator('.upgrade-option')
    .evaluateAll((nodes) => nodes.map((node) => node.className)),
);
await page.locator('.upgrade-option').first().click();
await page.waitForTimeout(2500);
await page.evaluate(() => window.__fpMoba?.damageDummy(2200));
await page.waitForTimeout(500);
await page.locator('.upgrade-option').first().click();
await page.waitForTimeout(2500);
await page.evaluate(() => window.__fpMoba?.damageDummy(2400));
await page.waitForTimeout(800);
await page.screenshot({ path: 'screenshots/p3-victory.png' });
console.log('victory', await page.locator('#victory-screen').isVisible());
await browser.close();
