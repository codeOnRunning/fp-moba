import { chromium } from 'playwright-core';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const errors=[]; page.on('pageerror',e=>errors.push(e.message)); page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
await page.waitForFunction(()=>{const b=document.querySelector('#start-button');return b&&!b.disabled;},null,{timeout:60000});
await page.selectOption('#mode-select','lane'); await page.locator('#start-button').click(); await page.waitForTimeout(4500);
await page.evaluate(()=>window.__fpMoba?.addGold(300));
await page.keyboard.press('b'); await page.waitForTimeout(400);
const items=['damage','health','staff','armor','boots','staff'];
for (const item of items) { await page.locator(`[data-shop-item="${item}"]`).click(); await page.waitForTimeout(120); }
const shopText=await page.locator('#shop-gold').textContent();
const state=await page.evaluate(()=>window.__fpMoba?.state());
console.log(JSON.stringify({shopText,state:{gold:state?.gold,shopItemsBought:state?.shopItemsBought,shopDamageBonus:state?.shopDamageBonus,shopCooldownBonus:state?.shopCooldownBonus},errors},null,2));
await page.screenshot({path:'screenshots/p6-shop.png'});
await browser.close();
