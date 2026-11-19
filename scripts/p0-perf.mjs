import { chromium } from 'playwright-core';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const errors=[]; page.on('pageerror',e=>errors.push(e.message)); page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
await page.waitForFunction(()=>{const b=document.querySelector('#start-button');return b&&!b.disabled;},{timeout:60000});
await page.locator('#start-button').click(); await page.waitForTimeout(8000);
const samples=[];
for(let i=0;i<5;i++){ await page.waitForTimeout(1000); samples.push(await page.locator('#perf').textContent()); }
await page.evaluate(()=>window.__fpMoba?.damageDummy(900)); await page.waitForTimeout(1500);
for(let i=0;i<3;i++){ await page.waitForTimeout(1000); samples.push('phase2 '+await page.locator('#perf').textContent()); }
const state=await page.evaluate(()=>window.__fpMoba?.state());
await page.screenshot({path:'screenshots/p0-performance.png'});
console.log(JSON.stringify({samples,state:{bossAdds:state?.bossAdds,bossTransitionRemaining:state?.bossTransitionRemaining,playerLevel:state?.playerLevel},errors},null,2));
await browser.close();
