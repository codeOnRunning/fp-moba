import { chromium } from 'playwright-core';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const errors=[]; page.on('pageerror',e=>errors.push(e.message)); page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
await page.goto('https://codeonrunning.github.io/fp-moba/',{waitUntil:'domcontentloaded',timeout:60000});
await page.waitForFunction(()=>{const b=document.querySelector('#start-button');return b&&!b.disabled;},null,{timeout:180000});
await page.locator('#start-button').click(); await page.waitForTimeout(5000);
console.log(JSON.stringify({perf:await page.locator('#perf').textContent(),errors},null,2));
await page.screenshot({path:'screenshots/p5-pages.png'});
await browser.close();

