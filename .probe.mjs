import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.addInitScript(() => { localStorage.setItem('chullavida:v3:intro', 'seen'); localStorage.setItem('chullavida:v3:welcome', JSON.stringify({ completed: true, path: 'explore' })); localStorage.setItem('chullavida:v3:tour', 'skipped'); });
await p.goto('http://localhost:4518/'); await p.waitForTimeout(2500);
console.log(await p.evaluate(() => { const side = document.querySelector('aside, .sidebar, nav'); const imgs=[...document.querySelectorAll('.sidebar img, aside img')].map(i=>({src:i.getAttribute('src'),w:i.naturalWidth,cw:i.clientWidth,op:getComputedStyle(i).opacity})); const btn=[...document.querySelectorAll('.sidebar button, aside button')].slice(0,4).map(b=>b.outerHTML.slice(0,300)); return {cls: side?.className, imgs, btn}; }));
await p.screenshot({ path: process.env.OUT + '/desk-live.png' });
await b.close();
