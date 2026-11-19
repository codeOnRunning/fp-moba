import { chromium } from 'playwright-core';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1440,height:900}});
await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
await page.waitForFunction(()=>{const b=document.querySelector('#start-button');return b&&!b.disabled;},null,{timeout:60000});
await page.selectOption('#mode-select','lane'); await page.locator('#start-button').click(); await page.waitForTimeout(4500);
await page.evaluate(()=>window.__fpMoba?.addGold(200)); await page.keyboard.press('b'); await page.waitForTimeout(300);
for (const item of ['damage','health','staff']) { await page.locator(`[data-shop-item="${item}"]`).click(); await page.waitForTimeout(120); }
await page.locator('#shop-close').click(); await page.waitForTimeout(300);
await page.locator('#resume-button').click(); await page.waitForTimeout(800);
await page.evaluate(()=>window.__fpMoba?.faceDummy()); await page.waitForTimeout(400);
console.log('equipment visible',await page.locator('#equipment-strip').isVisible(),'filled',await page.locator('#equipment-slots .equipment-slot.filled').count());
await page.screenshot({path:'screenshots/p6-equipment.png'});
await browser.close();
