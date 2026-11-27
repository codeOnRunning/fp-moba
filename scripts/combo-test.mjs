import { chromium } from 'playwright-core';
const browser = await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1280,height:800}});
const errors=[]; page.on('pageerror',e=>errors.push(e.message)); page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
await page.waitForFunction(()=>{const b=document.querySelector('#start-button');return b&&!b.disabled;},{timeout:60000});
await page.locator('#start-button').click();
await page.waitForFunction(()=>{const s=window.__fpMoba?.state();return s && s.bossInvulnerableTime<=0.001;},{timeout:30000});
await page.evaluate(()=>window.__fpMoba?.faceDummy());
const log={};
// Normal single shot at streak 0 -> 1 projectile
await page.evaluate(()=>window.__fpMoba?.fireBasic());
log.projAfterNormalShot=(await page.evaluate(()=>window.__fpMoba?.state())).projectiles;
// clear projectiles by waiting
await page.waitForTimeout(1200);
// Land 3 basic hits
for(let i=0;i<3;i++) await page.evaluate(()=>window.__fpMoba?.hitBasic());
log.streakAfter3=(await page.evaluate(()=>window.__fpMoba?.state())).basicHitStreak;
// 4th click (fireBasic) -> 3-bullet burst, streak reset
await page.evaluate(()=>window.__fpMoba?.fireBasic());
const sB=await page.evaluate(()=>window.__fpMoba?.state());
log.projectilesAfterBurst=sB.projectiles;
log.streakAfterBurst=sB.basicHitStreak;
// One normal hit afterwards -> streak 1 (not skipped)
await page.evaluate(()=>window.__fpMoba?.hitBasic());
log.streakAfterOneNormalHit=(await page.evaluate(()=>window.__fpMoba?.state())).basicHitStreak;
console.log(JSON.stringify({log,errors},null,2));
await browser.close();
