import { chromium, webkit, devices } from 'playwright';
const OUT = process.env.OUT; const BASE = process.env.BASE ?? 'http://localhost:4519'; const RECEIPT = process.env.RECEIPT;
const dev = process.env.DEV === 'desk' ? { viewport: { width: 1440, height: 900 } } : process.env.DEV === 'se' ? devices['iPhone SE (3rd gen)'] : process.env.DEV === 'pixel' ? devices['Pixel 7'] : devices['iPhone 13'];
const type = process.env.DEV === 'desk' || process.env.DEV === 'pixel' ? chromium : webkit;
const tag = process.env.DEV ?? 'ip13';
const b = await type.launch(); const ctx = await b.newContext({ ...dev, locale: 'es-EC', reducedMotion: 'reduce' }); const page = await ctx.newPage();
const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => m.type() === 'error' && errors.push(m.text().slice(0, 160)));
const res = {}; const shot = n => page.screenshot({ path: `${OUT}/flow-${tag}-${n}.png` });
const step = async (name, fn) => { try { res[name] = await fn() ?? 'ok'; } catch (e) { res[name] = 'FAIL ' + e.message.split('\n')[0]; await shot('fail-' + name).catch(() => {}); } };
await page.addInitScript(() => { try { localStorage.setItem('chullavida:v3:intro', 'seen'); } catch {} });
await page.goto(BASE + '/'); await page.waitForTimeout(2000);
{ const bn = page.locator('.consent-banner'); if (await bn.isVisible().catch(() => false)) { await bn.locator('label.consent-segment', { hasText: 'Privado' }).click(); await bn.getByRole('button', { name: 'Guardar mi elección' }).click(); } }
await page.waitForTimeout(1500);
await step('welcome', async () => { await shot('welcome'); const btn = page.getByRole('button', { name: 'Crear cuenta' }).first(); const box = await btn.boundingBox(); return { crearCuentaY: box && Math.round(box.y), vh: dev.viewport.height, explorar: await page.getByText('Solo quiero explorar').count() }; });
await step('signup-otp', async () => {
  await page.locator('.welcome-account').getByRole('button', { name: 'Crear cuenta' }).click({ timeout: 5000 }); await page.waitForTimeout(1200);
  const d = page.locator('dialog[open]').last(); await shot('account');
  const demo = d.getByRole('button', { name: /Ver recorrido de demostración/ }); if (await demo.count()) await demo.click();
  await page.waitForTimeout(300);
  await d.getByRole('tab', { name: /Crear cuenta/ }).first().click().catch(() => {});
  await page.waitForTimeout(300);
  const name = d.getByLabel(/nombre/i).first(); if (await name.count()) await name.fill('Ana');
  await d.locator('input[type=email]').first().fill('ana@ejemplo.ec');
  await d.locator('input[type=password]').first().fill('Viaje-Seguro-2026!x');
  const pw2 = d.locator('input[type=password]').nth(1); if (await pw2.count()) await pw2.fill('Viaje-Seguro-2026!x');
  for (const cb of await d.getByRole('checkbox').all()) await cb.check().catch(() => {});
  await shot('signup-form');
  await d.getByRole('button', { name: /Crear cuenta y recibir código/ }).click(); await page.waitForTimeout(1500); await shot('otp');
  const otp = d.locator('input[autocomplete="one-time-code"]');
  if (!(await otp.count())) return { inputs: 0, text: (await d.innerText()).slice(0, 300) };
  return { inputs: await otp.count(), inputmode: await otp.first().getAttribute('inputmode'), maxlength: await otp.first().getAttribute('maxlength'), fontSize: await otp.first().evaluate(e => getComputedStyle(e).fontSize) };
});
await page.keyboard.press('Escape'); await page.waitForTimeout(500);
await page.evaluate(() => { localStorage.setItem('chullavida:v3:welcome', JSON.stringify({ completed: true, path: 'explore' })); localStorage.setItem('chullavida:v3:tour', 'skipped'); });
await page.goto(BASE + '/'); await page.waitForTimeout(1500);
const banner = page.locator('.consent-banner'); if (await banner.isVisible().catch(() => false)) { await shot('consent'); await banner.locator('label.consent-segment', { hasText: 'Privado' }).click(); await banner.getByRole('button', { name: 'Guardar mi elección' }).click(); }
await step('culture-flip', async () => {
  await page.goto(BASE + '/cultura-viva'); await page.waitForTimeout(1500);
  const card = page.locator('[aria-pressed]').first(); await card.click(); await page.waitForTimeout(800); await shot('culture-flipped');
  return { pressed: await card.getAttribute('aria-pressed'), cards: await page.locator('[aria-pressed]').count() };
});
await step('mijin', async () => {
  await page.goto(BASE + '/mijin'); await page.waitForTimeout(1500); const d = page.locator('dialog[open]');
  await d.getByRole('button', { name: 'Cuenca' }).click(); await page.waitForTimeout(600); await shot('mijin-1');
  const txt = await d.locator('.mijin-caption-answer').last().innerText();
  const input = d.getByRole('textbox').first(); await input.fill('tengo 80 dólares'); await input.press('Enter'); await page.waitForTimeout(600);
  const txt2 = await d.locator('.mijin-caption-answer').last().innerText(); await shot('mijin-2');
  await d.getByText('Voz de MIJIN').click().catch(() => {}); await page.waitForTimeout(300); await shot('mijin-voz');
  return { a1: txt.slice(0, 120).replace(/\n/g, ' / '), a2: txt2.slice(0, 160).replace(/\n/g, ' / ') };
});
await step('checkout-transfer', async () => {
  await page.goto(BASE + '/'); await page.waitForTimeout(1500);
  await page.getByRole('button', { name: /^Comprar:/ }).first().click(); await page.waitForTimeout(800);
  const d = page.locator('dialog[open]'); await shot('buy-1');
  const people = await d.getByLabel(/^Adultos/).count(); await d.getByRole('button', { name: /Añadir adultos/ }).click();
  await d.getByLabel('Inicio').fill('2099-05-02'); const end = d.getByLabel(/^Fin/); const hasEnd = await end.count(); if (hasEnd) await end.fill('2099-05-04');
  await page.waitForTimeout(300); await shot('buy-dates');
  await d.getByRole('button', { name: /^Continuar/ }).click();
  await d.getByLabel('Nombre y apellido').fill('Ana Pérez'); await d.getByLabel('Correo').fill('ana.perez@correo.ec'); await d.getByLabel(/Número de cédula/).fill('1710543511');
  await d.getByRole('button', { name: /^Continuar/ }).click(); await d.getByRole('checkbox').check(); await d.getByRole('button', { name: /Elegir método de pago/ }).click();
  await d.locator('input[value=transfer]').check(); await page.waitForTimeout(1500); await shot('buy-transfer');
  const file = d.locator('input[type=file]').first(); await file.setInputFiles(RECEIPT); await page.waitForTimeout(800);
  await shot('buy-receipt');
  await d.getByRole('button', { name: /Enviar comprobante|Enviar/ }).last().click().catch(() => {}); await page.waitForTimeout(1500); await shot('buy-done');
  const stored = await page.evaluate(() => Object.keys(localStorage).map(k => localStorage.getItem(k)).join('|'));
  return { people, hasEnd, blobInStorage: stored.includes('blob:'), base64InStorage: /data:image|data:application\/pdf/.test(stored), text: (await d.innerText()).slice(0, 240).replace(/\n/g, ' / ') };
});
await step('wallet', async () => { await page.goto(BASE + '/billetera'); await page.waitForTimeout(1200); await shot('wallet'); return (await page.locator('dialog[open]').innerText()).slice(0, 400).replace(/\n/g, ' / '); });
await step('english', async () => {
  await page.goto(BASE + '/'); await page.waitForTimeout(1000);
  const sel = page.locator('select:has(option:text-is("English"))').first();
  await sel.selectOption({ label: 'English' });
  await page.waitForTimeout(1500); await shot('english'); return { lang: await page.evaluate(() => document.documentElement.lang), hero: (await page.locator('h1').first().innerText()).replace(/\n/g, ' ') };
});
await step('pdfs', async () => Promise.all(['/legal/aviso-proteccion-datos-chulla-vida.pdf', '/legal/formulario-derechos-datos-chulla-vida.pdf'].map(async u => { const r = await page.request.get(BASE + u); return `${u} ${r.status()} ${r.headers()['content-type']}`; })));
console.log(JSON.stringify({ res, errors: [...new Set(errors)] }, null, 1));
await b.close();
