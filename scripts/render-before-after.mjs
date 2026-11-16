import { chromium } from 'playwright-core';
import fs from 'node:fs';
const before = fs.readFileSync('screenshots/after-start.png').toString('base64');
const after = fs.readFileSync('screenshots/art-pass-first-person.png').toString('base64');
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 980 } });
await page.setContent(`<!doctype html><html><body style="margin:0;background:#070b17;font-family:'Microsoft YaHei',Segoe UI,sans-serif;color:#eef4ff">
<div style="padding:28px 32px 18px"><div style="color:#e8c77a;font-size:12px;letter-spacing:5px">ART PASS 1.0 / LOOK DEV</div><div style="font-size:30px;font-weight:700;margin-top:8px">灰盒 → 星辉峡谷</div></div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;padding:0 32px 28px">
<div><div style="font-size:12px;color:#8e9db8;margin-bottom:8px">BEFORE / M0 灰盒</div><img src="data:image/png;base64,${before}" style="width:100%;border:1px solid #26344d;border-radius:10px"/></div>
<div><div style="font-size:12px;color:#57e0f0;margin-bottom:8px">AFTER / 星辉峡谷 first pass</div><img src="data:image/png;base64,${after}" style="width:100%;border:1px solid #3d5a7a;border-radius:10px"/></div>
</div>
<div style="padding:0 34px;color:#71829b;font-size:12px">KayKit CC0 dungeon kit · Mage / Skeleton Warrior · procedural star gate · bloom + fog + new palette</div>
</body></html>`);
await page.waitForTimeout(300);
await page.screenshot({ path: 'C:/Users/Administrator/Documents/deepseek-harness/default-workspace/docs/art-pass-before-after.png' });
await browser.close();

