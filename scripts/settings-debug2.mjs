import { chromium } from 'playwright-core';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1440,height:900}});
await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
await page.waitForFunction(()=>{const b=document.querySelector('#start-button');return b&&!b.disabled;},{timeout:60000});
await page.locator('#start-settings-button').click(); await page.waitForTimeout(1000);
console.log(await page.locator('#settings-screen').evaluate(n=>{const c=getComputedStyle(n);return {hidden:n.hidden,parent:n.parentElement?.id,parentClass:n.parentElement?.className,visibility:c.visibility,opacity:c.opacity,display:c.display,transition:c.transition,matched:[...document.styleSheets].flatMap(s=>{try{return [...s.cssRules]}catch{return[]}}).filter(r=>r.selectorText&&n.matches(r.selectorText)).map(r=>r.selectorText)};}));
await browser.close();
