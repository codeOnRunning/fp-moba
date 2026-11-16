import { chromium } from 'playwright-core';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1440,height:900}});
await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
await page.waitForFunction(()=>{const b=document.querySelector('#start-button');return b&&!b.disabled;},{timeout:60000});
await page.locator('#start-settings-button').click(); await page.waitForTimeout(600);
console.log(await page.locator('#settings-screen').evaluate(n=>n.outerHTML.slice(0,400)));
console.log(await page.evaluate(()=>[...document.styleSheets].flatMap(s=>{try{return [...s.cssRules]}catch{return[]}}).filter(r=>r.cssText&&r.cssText.includes('settings-screen')).map(r=>r.cssText)));
await browser.close();
