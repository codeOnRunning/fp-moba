import { chromium } from 'playwright-core';

const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',
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

await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle', timeout: 60_000 });
await page.waitForTimeout(1000);
await page.waitForFunction(() => { const b = document.querySelector('#start-button'); return b && !b.disabled; }, { timeout: 60000 });
await page.locator('#start-button').click();
await page.waitForTimeout(700);

const yawBefore = await page.evaluate(() => window.__fpMoba?.state()?.yaw);
await page.evaluate(() => {
  const canvas = document.querySelector('#game-canvas');
  canvas?.dispatchEvent(
    new MouseEvent('mousemove', {
      bubbles: true,
      movementX: 120,
      movementY: 0,
    }),
  );
});
await page.waitForTimeout(120);
const yawAfter = await page.evaluate(() => window.__fpMoba?.state()?.yaw);

await page.evaluate(() => window.__fpMoba?.faceDummy());
await page.waitForTimeout(120);
await page.evaluate(() => {
  const canvas = document.querySelector('#game-canvas');
  canvas?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
});
await page.waitForTimeout(100);
const projectilesAfterMouseDown = await page.evaluate(
  () => window.__fpMoba?.state()?.projectiles,
);
await page.evaluate(() => {
  window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, button: 0 }));
});

console.log(
  JSON.stringify(
    {
      yawBefore,
      yawAfter,
      yawDelta: Number(yawAfter) - Number(yawBefore),
      projectilesAfterMouseDown,
      errors,
    },
    null,
    2,
  ),
);

await browser.close();

