import { chromium } from 'playwright-core';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1920,height:1080}});
const errors=[]; page.on('pageerror',e=>errors.push(e.stack||e.message)); page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
await page.goto('http://127.0.0.1:4174/',{waitUntil:'networkidle'});
await page.waitForFunction(()=>{const b=document.querySelector('#start-button');return b&&!b.disabled;},null,{timeout:60000});
await page.selectOption('#mode-select','lane'); await page.locator('#start-button').click();
const samples=[];
for(let i=0;i<24;i++){await page.waitForTimeout(5000); if(i%4===0)samples.push(await page.locator('#perf').textContent());}
console.log(JSON.stringify({samples,errors},null,2));
await browser.close();
