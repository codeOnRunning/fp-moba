import { chromium } from 'playwright-core';

const URL = process.env.FP_MOBA_URL ?? 'http://127.0.0.1:5173/';
const errors = [];
const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
  ],
});
const page = await browser.newPage({ viewport: { width: 800, height: 500 } });
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text());
});

const readState = () => page.evaluate(() => window.__fpMoba?.state());

await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForFunction(
  () => {
    const button = document.querySelector('#start-button');
    return button && !button.disabled;
  },
  { timeout: 60000 },
);

// Keep the headless SwiftShader render cheap enough that the simulation runs realtime.
await page.locator('#start-settings-button').click();
await page.selectOption('#settings-quality', 'low');
await page.locator('#settings-close').click();

const options = await page.locator('#difficulty-select option').allTextContents();
const initialHint = await page.locator('#difficulty-hint').textContent();

await page.selectOption('#difficulty-select', 'story');
const storyHint = await page.locator('#difficulty-hint').textContent();
await page.locator('#start-button').click();
await page.waitForFunction(
  () => {
    const state = window.__fpMoba?.state();
    return Boolean(state?.running && state.bossIntroRemaining === 0);
  },
  { timeout: 20000 },
);

const storyStart = await readState();
await page.evaluate(() => window.__fpMoba.damageDummy(198));
await page.waitForTimeout(400);
const damaged = await readState();

// Pause, then switch difficulty. Boss HP percentage must survive the change.
await page.evaluate(() => document.exitPointerLock());
await page.waitForTimeout(500);
const pauseVisible = await page.locator('#pause-screen').isVisible();
const pauseValue = await page.locator('#pause-difficulty-select').inputValue();
await page.selectOption('#pause-difficulty-select', 'easy');
await page.waitForTimeout(500);
const afterPauseSwitch = await readState();
await page.screenshot({ path: 'screenshots/difficulty-pause.png' });

// Resume, die, and use the one-click difficulty-lowering shortcut.
await page.locator('#resume-button').click();
await page.waitForTimeout(500);
await page.evaluate(() => window.__fpMoba.damagePlayer(9999));
await page.waitForTimeout(600);
const deathVisible = await page.locator('#death-screen').isVisible();
const deathLabel = await page.locator('#death-difficulty').textContent();
const lowerText = await page.locator('#death-lower-difficulty-button').textContent();
await page.screenshot({ path: 'screenshots/difficulty-death.png' });
await page.locator('#death-lower-difficulty-button').click();
await page.waitForTimeout(900);
const afterLower = await readState();

// Lowest difficulty must disable the shortcut.
await page.evaluate(() => window.__fpMoba.damagePlayer(9999));
await page.waitForTimeout(600);
const lowestButton = page.locator('#death-lower-difficulty-button');
const lowestDisabled = await lowestButton.isDisabled();
const lowestText = await lowestButton.textContent();
await page.screenshot({ path: 'screenshots/difficulty-lowest.png' });

// Debug API sanity check for the top difficulty numbers.
await page.evaluate(() => window.__fpMoba.setDifficulty('nightmare'));
await page.waitForTimeout(300);
const nightmare = await readState();

const ratio = (state) =>
  state === null ? null : state.dummyHealth / state.dummyMaxHealth;

console.log(
  JSON.stringify(
    {
      options,
      initialHint,
      storyHint,
      storyStart: {
        difficulty: storyStart?.difficulty,
        bossMaxHealth: storyStart?.dummyMaxHealth,
        playerMaxHealth: storyStart?.maxHealth,
        bossModifier: storyStart?.bossModifier,
      },
      damaged: {
        bossHealth: damaged?.dummyHealth,
        bossMaxHealth: damaged?.dummyMaxHealth,
        ratio: ratio(damaged),
      },
      pauseVisible,
      pauseValue,
      afterPauseSwitch: {
        difficulty: afterPauseSwitch?.difficulty,
        bossHealth: afterPauseSwitch?.dummyHealth,
        bossMaxHealth: afterPauseSwitch?.dummyMaxHealth,
        ratio: ratio(afterPauseSwitch),
      },
      deathVisible,
      deathLabel,
      lowerText,
      afterLower: {
        difficulty: afterLower?.difficulty,
        playerHealth: afterLower?.playerHealth,
        maxHealth: afterLower?.maxHealth,
        playerDead: afterLower?.playerDead,
        running: afterLower?.running,
      },
      lowestDisabled,
      lowestText,
      nightmare: {
        difficulty: nightmare?.difficulty,
        bossMaxHealth: nightmare?.dummyMaxHealth,
        playerMaxHealth: nightmare?.maxHealth,
      },
      errors,
    },
    null,
    2,
  ),
);

await browser.close();
if (errors.length > 0) process.exitCode = 1;
