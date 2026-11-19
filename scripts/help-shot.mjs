import { chromium } from 'playwright-core';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1440,height:900}});
await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
await page.waitForFunction(()=>{const b=document.querySelector('#start-button');return b&&!b.disabled;},{timeout:60000});
await page.locator('#start-help-button').click(); await page.waitForTimeout(800);
await page.screenshot({path:'screenshots/skill-help.png'});
console.log('visible',await page.locator('#help-screen').isVisible());
await browser.close();
