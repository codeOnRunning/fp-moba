import { chromium } from 'playwright-core';

const executablePath =
  process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
  ],
});

const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text());
});

await page.goto('http://127.0.0.1:4174/', { waitUntil: 'networkidle', timeout: 60_000 });
await page.waitForTimeout(2200);
const startVisible = await page.locator('#start-screen').isVisible();
const perf = await page.locator('#perf').textContent();
const debugApi = await page.evaluate(() => Boolean(window.__fpMoba));
await page.locator('#start-button').click();
await page.waitForTimeout(900);
const pointerLocked = await page.evaluate(() => document.pointerLockElement !== null);
await page.screenshot({ path: 'screenshots/prod-start.png', fullPage: false });

console.log(JSON.stringify({ startVisible, perf, debugApi, pointerLocked, errors }, null, 2));
await browser.close();

