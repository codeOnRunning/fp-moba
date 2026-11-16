import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.goto('file:///C:/Users/Administrator/Documents/deepseek-harness/default-workspace/docs/art-direction-board.svg');
await page.waitForTimeout(300);
await page.screenshot({ path: 'C:/Users/Administrator/Documents/deepseek-harness/default-workspace/docs/art-direction-board.png' });
await browser.close();
