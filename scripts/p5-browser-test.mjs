import { chromium } from 'playwright-core';
const cases = [
  ['Chrome', 'C:/Program Files/Google/Chrome/Application/chrome.exe'],
  ['Edge', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'],
];
const results = [];
for (const [name, executablePath] of cases) {
  const browser = await chromium.launch({ executablePath, headless: true, args: ['--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('http://127.0.0.1:4174/', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => { const b = document.querySelector('#start-button'); return b && !b.disabled; }, { timeout: 60000 });
  await page.locator('#start-button').click();
  await page.waitForTimeout(5000);
  results.push({ name, perf: await page.locator('#perf').textContent(), errors });
  await browser.close();
}
console.log(JSON.stringify(results, null, 2));
