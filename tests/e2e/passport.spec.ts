import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * Pasaporte Guambra (libro-álbum) en navegador real.
 * La app abre el pasaporte solo con una cuenta de correo confirmado (AccountRequired), así que estas pruebas usan la
 * página de muestra de desarrollo, que monta los componentes reales con datos de ejemplo de los seis estados:
 *   npx vite --port 5491 --strictPort
 *   E2E_BASE_URL=http://127.0.0.1:5491 npx playwright test tests/e2e/passport.spec.ts
 * Con el build de producción (configuración por defecto) la página de muestra no existe y las pruebas se omiten.
 */
const FIXTURE = '/src/features/passport/__fixtures__/pasaporte-estados.html';

async function openFixture(page: Page, query = '') {
  const response = await page.goto(`${FIXTURE}${query}`);
  const ready = Boolean(response?.ok()) && await page.locator('[data-fixture="pasaporte"], .pg-passport').first().waitFor({ timeout: 10_000 }).then(() => true, () => false);
  test.skip(!ready, 'La página de muestra del pasaporte solo existe en el servidor de desarrollo (E2E_BASE_URL=http://127.0.0.1:5491).');
  return page.locator('dialog[open]');
}
async function swipe(page: Page, area: Locator, from: number, to: number) {
  const box = (await area.boundingBox())!;
  const y = box.y + box.height * 0.45;
  await page.mouse.move(box.x + box.width * from, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * ((from + to) / 2), y + 3, { steps: 6 });
  await page.mouse.move(box.x + box.width * to, y + 5, { steps: 6 });
  await page.mouse.up();
}
const layout = (page: Page) => page.evaluate(() => {
  const body = document.querySelector('[data-role="current"] .pg-body');
  const pager = document.querySelector('.pg-pager')!.getBoundingClientRect();
  return { scroll: body ? body.scrollHeight - body.clientHeight : 0, pagerBottom: pager.bottom, viewport: innerHeight, overflow: document.documentElement.scrollWidth - innerWidth };
});

test.describe('Pasaporte Guambra en el celular', () => {
  test('abre con la bandera ecuatoriana y pasa de página deslizando y con ▶', async ({ page }) => {
    const dialog = await openFixture(page, '?libro=1');
    await expect(dialog.getByRole('heading', { level: 3, name: 'Pasaporte Guambra' })).toBeVisible();
    await expect(dialog.locator('.pg-cover img[src="/brand/ecuador-flag.svg"]')).toBeVisible();
    expect(await page.locator('img[src*="chulla-vida-logo.png"]').count()).toBe(0);
    const counter = dialog.locator('.pg-pager .pg-counter strong');
    await expect(counter).toHaveText('1 de 12');
    await swipe(page, dialog.locator('.pg-deck'), 0.85, 0.12);
    await expect(counter).toHaveText('2 de 12');
    await expect(dialog.getByRole('heading', { name: 'Mi carné' })).toBeVisible();
    await dialog.getByRole('button', { name: 'Página siguiente' }).click();
    await expect(counter).toHaveText('3 de 12');
    await swipe(page, dialog.locator('.pg-deck'), 0.15, 0.85);
    await expect(counter).toHaveText('2 de 12');
    expect((await layout(page)).overflow).toBeLessThanOrEqual(0);
  });

  test('la página de región muestra los estados y cabe entera con la navegación a la vista', async ({ page }) => {
    const dialog = await openFixture(page, '?libro=1&pagina=sierra');
    const sheet = dialog.locator('.pg-sheet[data-role="current"]');
    await expect(sheet.getByRole('heading', { name: 'Sierra' })).toBeVisible();
    await expect(sheet.locator('.pg-slot')).toHaveCount(13);
    for (const estado of ['album', 'visto', 'en_sobre', 'comprado', 'pegado']) expect(await sheet.locator(`.pg-slot[data-estado="${estado}"]`).count()).toBeGreaterThan(0);
    await expect(sheet.locator('.pg-slot[data-estado="pegado"] .pg-foil').first()).toBeVisible();
    expect(await sheet.locator('.pg-slot:not([data-estado="pegado"]) .pg-foil').count()).toBe(0);
    const fit = await layout(page);
    expect(fit.scroll).toBeLessThanOrEqual(1);
    expect(fit.pagerBottom).toBeLessThanOrEqual(fit.viewport + 1);
    expect(fit.overflow).toBeLessThanOrEqual(0);
    for (const name of ['Página anterior', 'Página siguiente']) {
      const box = (await dialog.getByRole('button', { name }).boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
    const tab = (await dialog.getByRole('navigation', { name: 'Índice del pasaporte' }).getByRole('button', { name: 'Sierra' }).boundingBox())!;
    expect(tab.height).toBeGreaterThanOrEqual(44);
  });

  test('Amazonía va en dos páginas (21–30 y 31–39) y cada una cabe sin desplazarse', async ({ page }) => {
    const dialog = await openFixture(page, '?libro=1&pagina=amazonia-1');
    const sheet = dialog.locator('.pg-sheet[data-role="current"]');
    await expect(sheet).toContainText('21–30');
    await expect(sheet.locator('.pg-slot')).toHaveCount(10);
    expect((await layout(page)).scroll).toBeLessThanOrEqual(1);
    await dialog.getByRole('button', { name: 'Página siguiente' }).click();
    await expect(sheet).toContainText('31–39');
    await expect(sheet.locator('.pg-slot')).toHaveCount(9);
    expect((await layout(page)).scroll).toBeLessThanOrEqual(1);
  });

  test('con movimiento reducido la hoja no se desliza: cambia con un fundido', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const dialog = await openFixture(page, '?libro=1');
    const counter = dialog.locator('.pg-pager .pg-counter strong');
    const deck = dialog.locator('.pg-deck');
    const box = (await deck.boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.85, box.y + 200);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.4, box.y + 204, { steps: 6 });
    expect(await dialog.locator('.pg-sheet[data-role="current"]').evaluate(element => (element as HTMLElement).style.transform)).toBe('');
    await page.mouse.move(box.x + box.width * 0.12, box.y + 206, { steps: 4 });
    await page.mouse.up();
    await expect(counter).toHaveText('2 de 12');
  });
});

test.describe('Pasaporte Guambra en computador', () => {
  test.use({ viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false });
  test('la tapa gira en 3D al abrir y el libro se lee a doble página con pestañas en el canto', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Libro de escritorio: se comprueba en Chromium.');
    const dialog = await openFixture(page, '?libro=1');
    await expect(dialog.locator('.pg-book.is-closed')).toBeVisible();
    await dialog.getByRole('button', { name: 'Abrir' }).click();
    await expect(dialog.locator('.pg-leaf[data-dir="next"]')).toBeAttached();
    await expect(dialog.locator('.pg-leaf')).toHaveCount(0, { timeout: 3000 });
    await expect(dialog.getByRole('heading', { name: 'Mi carné' })).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Mi Ecuador' })).toBeVisible();
    await dialog.getByRole('region', { name: /Libro del pasaporte/ }).press('ArrowRight');
    await expect(dialog.getByRole('heading', { name: 'Sierra' })).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Costa' })).toBeVisible();
    await expect(dialog.locator('.pg-slot')).toHaveCount(20);
    await dialog.getByRole('navigation', { name: 'Índice del pasaporte' }).getByRole('button', { name: 'Especiales' }).click();
    await expect(dialog.getByRole('heading', { name: 'Cromos especiales' })).toBeVisible();
    await expect(dialog.locator('.pg-special.is-foil .pg-foil')).toHaveCount(1);
    expect((await layout(page)).overflow).toBeLessThanOrEqual(0);
  });
});

test.describe('Página de muestra de estados', () => {
  test('las seis casillas y los cromos especiales se dibujan sin errores', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await openFixture(page);
    for (const estado of ['album', 'visto', 'en_sobre', 'comprado', 'pegado_demo', 'pegado']) await expect(page.locator(`.fx-grid .pg-slot[data-estado="${estado}"]`).first()).toBeVisible();
    await expect(page.locator('.pg-special.is-foil')).toHaveCount(1);
    expect(errors).toEqual([]);
  });
});
