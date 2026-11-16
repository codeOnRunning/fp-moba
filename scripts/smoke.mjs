import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';

const executablePath =
  process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const url = process.env.GAME_URL ?? 'http://127.0.0.1:4173/';

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

const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});

const errors = [];
const warnings = [];
page.on('console', (message) => {
  const text = message.text();
  if (message.type() === 'error') errors.push(text);
  if (message.type() === 'warning') warnings.push(text);
});
page.on('pageerror', (error) => {
  errors.push(error.message);
  console.log(`[pageerror] ${error.message}`);
});

await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 });
await page.waitForTimeout(1000);
await page.locator('#start-button').waitFor({ state: 'visible', timeout: 60000 });
await page.waitForFunction(() => { const b = document.querySelector('#start-button'); return b && !b.disabled; }, { timeout: 60000 });
await page.waitForTimeout(600);

const startVisible = await page.locator('#start-screen').isVisible();
const initialPerf = await page.locator('#perf').textContent();
const webgl = await page.evaluate(() => {
  const canvas = document.querySelector('#game-canvas');
  if (!(canvas instanceof HTMLCanvasElement)) return null;
  const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
  return gl ? gl.getParameter(gl.VERSION) : null;
});

await page.screenshot({ path: 'screenshots/start.png', fullPage: false });
await page.locator('#start-button').click();
await page.waitForTimeout(900);

const pointerLocked = await page.evaluate(() => document.pointerLockElement !== null);
const modeBefore = await page.locator('#camera-mode').textContent();
const stateAfterStart = await page.evaluate(() => window.__fpMoba?.state());

await page.evaluate(() => window.__fpMoba?.faceDummy());
await page.waitForTimeout(120);
await page.keyboard.press('q');
await page.waitForTimeout(1400);

const targetHpAfterQ = await page.locator('#target-hp-text').textContent();
const qCooldown = await page.locator('#q-cooldown-text').textContent();
const stateAfterQ = await page.evaluate(() => window.__fpMoba?.state());
const perfAfterQ = await page.locator('#perf').textContent();
await page.screenshot({ path: 'screenshots/after-q.png', fullPage: false });

await page.keyboard.press('v');
await page.waitForTimeout(400);
const modeAfterViewToggle = await page.locator('#camera-mode').textContent();
await page.screenshot({ path: 'screenshots/third-person.png', fullPage: false });

await page.keyboard.press('v');
await page.waitForTimeout(250);
await page.keyboard.down('w');
await page.waitForTimeout(900);
await page.keyboard.up('w');
await page.waitForTimeout(250);
const stateAfterMove = await page.evaluate(() => window.__fpMoba?.state());
await page.screenshot({ path: 'screenshots/after-move.png', fullPage: false });

await page.evaluate(() => document.exitPointerLock());
await page.waitForTimeout(500);
const pauseVisible = await page.locator('#pause-screen').isVisible();

console.log(
  JSON.stringify(
    {
      startVisible,
      initialPerf,
      webgl,
      pointerLocked,
      modeBefore,
      stateAfterStart,
      targetHpAfterQ,
      qCooldown,
      stateAfterQ,
      perfAfterQ,
      modeAfterViewToggle,
      stateAfterMove,
      pauseVisible,
      errors,
      warnings,
    },
    null,
    2,
  ),
);

await browser.close();

