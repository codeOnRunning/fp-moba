import { chromium } from 'playwright-core';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--ignore-gpu-blocklist']});
const results=[];
for (const mode of ['boss','lane']) {
 const page=await browser.newPage({viewport:{width:1920,height:1080}});
 const errors=[]; page.on('pageerror',e=>errors.push(e.message)); page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto('http://127.0.0.1:4174/',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>{const b=document.querySelector('#start-button');return b&&!b.disabled;},null,{timeout:60000});
 await page.selectOption('#mode-select',mode);
 await page.locator('#start-button').click(); await page.waitForTimeout(5000);
 results.push({mode,perf:await page.locator('#perf').textContent(),objectives:await page.locator('#lane-objectives').isVisible(),errors});
 await page.close();
}
console.log(JSON.stringify(results,null,2));
await browser.close();
