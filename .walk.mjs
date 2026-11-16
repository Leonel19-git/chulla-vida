import { chromium, webkit, devices } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
const OUT = process.env.OUT; const BASE = 'http://localhost:4518';
const vercel = JSON.parse(readFileSync('vercel.json','utf8'));
const csp = vercel.headers.flatMap(h => h.headers).find(h => h.key === 'Content-Security-Policy').value;
const only = process.env.ONLY;
const DEVICES = [
  ['desk', chromium, { viewport: { width: 1440, height: 900 } }],
  ['pixel7', chromium, devices['Pixel 7']],
  ['se', webkit, devices['iPhone SE (3rd gen)']],
  ['ip13', webkit, devices['iPhone 13']],
].filter(d => !only || only.split(',').includes(d[0]));
const VIEWS = ['/', '/cultura-viva', '/pasaporte', '/mi-viaje', '/billetera', '/mijin', '/sin-senal', '/cuenta', '/anfitriones', '/privacidad', '/reservas', '/avisos', '/derechos-de-datos', '/experiencias/gen-02-quilotoa-shalala'];
const report = {};
const audit = () => {
  const vis = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && r.bottom > 0 && r.top < innerHeight && !el.closest('details:not([open])'); };
  const longText = [...document.querySelectorAll('p, li, small, span, dd')].filter(el => vis(el) && el.children.length < 3).map(el => (el.innerText || '').trim()).filter(t => t.length > 170 && !/\n/.test(t)).slice(0, 8);
  const small = [...document.querySelectorAll('button, a, [role=button], input:not([type=hidden]), select, summary')].filter(el => vis(el) && !el.closest('.sr-only')).filter(el => { const r = el.getBoundingClientRect(); return (r.height < 24 || r.width < 24) && !(el.type === 'checkbox' || el.type === 'radio'); }).map(el => (el.getAttribute('aria-label') || el.innerText || el.className || el.tagName).toString().slice(0, 40)).slice(0, 8);
  const broken = [...document.images].filter(i => i.complete && i.naturalWidth === 0 && i.src && !i.loading?.includes('lazy')).map(i => i.src.slice(-60));
  const textLen = (document.querySelector('dialog[open]') || document.body).innerText.length;
  return { overflow: document.documentElement.scrollWidth - innerWidth, screens: +(document.documentElement.scrollHeight / innerHeight).toFixed(2), longText, small, broken, textLen, dialog: document.querySelector('dialog[open] h2, dialog[open] [id$=title]')?.textContent?.slice(0, 60) ?? null };
};
for (const [name, type, dev] of DEVICES) {
  const browser = await type.launch(type === chromium ? { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] } : {});
  const ctx = await browser.newContext({ ...dev, locale: 'es-EC', timezoneId: 'America/Guayaquil', reducedMotion: 'reduce' });
  await ctx.route('**/*', async route => {
    const req = route.request();
    if (req.resourceType() !== 'document' || !req.url().startsWith(BASE)) return route.continue();
    const res = await route.fetch(); return route.fulfill({ response: res, headers: { ...res.headers(), 'content-security-policy': csp } });
  });
  const errors = []; const csps = [];
  await ctx.exposeBinding('__csp', (_, v) => csps.push(v));
  await ctx.addInitScript(() => document.addEventListener('securitypolicyviolation', e => window.__csp?.(`${e.violatedDirective} ${e.blockedURI}`)));
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push('pageerror ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
  report[name] = { views: {} };
  // first visit: intro / welcome
  await page.goto(BASE + '/'); await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/${name}-00-first.png` });
  report[name].first = await page.evaluate(audit);
  // skip onboarding
  await page.evaluate(() => { localStorage.setItem('chullavida:v3:intro', 'seen'); localStorage.setItem('chullavida:v3:welcome', JSON.stringify({ completed: true, path: 'explore' })); localStorage.setItem('chullavida:v3:tour', 'skipped'); });
  await page.goto(BASE + '/'); await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/${name}-01-consent.png` });
  const banner = page.locator('.consent-banner');
  if (await banner.isVisible().catch(() => false)) { await banner.locator('label.consent-segment', { hasText: 'Privado' }).click().catch(()=>{}); await banner.getByRole('button', { name: 'Guardar mi elección' }).click().catch(()=>{}); }
  for (const [i, v] of VIEWS.entries()) {
    await page.goto(BASE + v); await page.waitForTimeout(2200);
    const tag = `${name}-${String(i + 2).padStart(2, '0')}-${v.replace(/\W+/g, '_') || 'home'}`;
    await page.screenshot({ path: `${OUT}/${tag}.png`, fullPage: v === '/' });
    report[name].views[v] = await page.evaluate(audit);
  }
  report[name].errors = [...new Set(errors)]; report[name].csp = [...new Set(csps)];
  await browser.close();
}
writeFileSync(`${OUT}/report-${only || 'all'}.json`, JSON.stringify(report, null, 1));
console.log(JSON.stringify(report, null, 1));
