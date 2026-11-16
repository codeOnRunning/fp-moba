import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';

const executablePath =
  process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';

await mkdir('screenshots', { recursive: true });

const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
    '--disable-dev-shm-usage',
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

const before = await page.evaluate(() => window.__fpMoba?.state());
await page.evaluate(() => window.__fpMoba?.damageDummy(300));
await page.waitForTimeout(250);
const afterKill = await page.evaluate(() => window.__fpMoba?.state());
const killsText = await page.locator('#kills-text').textContent();
const targetHidden = await page.locator('#target-panel').evaluate((node) =>
  node.classList.contains('hidden'),
);
await page.screenshot({ path: 'screenshots/dummy-defeated.png', fullPage: false });

await page.waitForTimeout(3700);
const afterRespawnDummy = await page.evaluate(() => window.__fpMoba?.state());

await page.evaluate(() => window.__fpMoba?.damagePlayer(100));
await page.waitForTimeout(400);
const deathVisible = await page.locator('#death-screen').isVisible();
await page.screenshot({ path: 'screenshots/death.png', fullPage: false });

await page.waitForTimeout(3300);
const respawnEnabled = await page.locator('#respawn-button').isEnabled();
await page.locator('#respawn-button').click();
await page.waitForTimeout(700);
const afterPlayerRespawn = await page.evaluate(() => window.__fpMoba?.state());
const deathHidden = await page.locator('#death-screen').evaluate((node) =>
  node.classList.contains('hidden'),
);
const hpText = await page.locator('#hp-text').textContent();

console.log(
  JSON.stringify(
    {
      before,
      afterKill,
      killsText,
      targetHidden,
      afterRespawnDummy,
      deathVisible,
      respawnEnabled,
      afterPlayerRespawn,
      deathHidden,
      hpText,
      errors,
    },
    null,
    2,
  ),
);

await browser.close();

