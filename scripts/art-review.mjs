import { chromium } from 'playwright-core';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--ignore-gpu-blocklist']});
const out=[];
for (const mode of ['boss','lane']) {
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 const errors=[]; page.on('pageerror',e=>errors.push(e.message)); page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>{const b=document.querySelector('#start-button');return b&&!b.disabled;},null,{timeout:60000});
 await page.selectOption('#mode-select',mode); await page.locator('#start-button').click(); await page.waitForTimeout(4500);
 await page.evaluate(()=>window.__fpMoba?.faceDummy()); await page.waitForTimeout(500);
 await page.screenshot({path:`screenshots/art-${mode}.png`});
 out.push({mode,perf:await page.locator('#perf').textContent(),errors});
 await page.close();
}
console.log(JSON.stringify(out,null,2));
await browser.close();
