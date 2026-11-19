import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto('http://127.0.0.1:4174/', { waitUntil: 'networkidle' });
await page.waitForFunction(() => { const b = document.querySelector('#start-button'); return b && !b.disabled; }, { timeout: 60000 });
await page.locator('#start-button').click();
const samples = [];
for (let i = 0; i < 36; i += 1) {
  await page.waitForTimeout(5000);
  if (i % 4 === 0) {
    await page.keyboard.down('KeyW'); await page.waitForTimeout(160); await page.keyboard.up('KeyW');
    await page.keyboard.press('KeyQ');
  }
  if (i % 6 === 0) samples.push(await page.locator('#perf').textContent());
}
console.log(JSON.stringify({ durationSeconds: 180, samples, errors }, null, 2));
await browser.close();
