import { chromium } from 'playwright-core';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1440,height:900}});
await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
await page.waitForFunction(()=>{const b=document.querySelector('#start-button');return b&&!b.disabled;},{timeout:60000});
await page.locator('#start-button').click(); await page.waitForTimeout(4000);
const info=await page.evaluate(()=>{const c=document.createElement('canvas');const gl=c.getContext('webgl2');const ext=gl?.getExtension('WEBGL_debug_renderer_info');return {renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unknown',vendor:ext?gl.getParameter(ext.UNMASKED_VENDOR_WEBGL):'unknown',perf:document.querySelector('#perf')?.textContent};});
console.log(info);
await browser.close();
