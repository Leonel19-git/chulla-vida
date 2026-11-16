import { expect, test, type Page } from '@playwright/test';
import { choosePrivateConsent, horizontalOverflow, scanForOverflow } from './helpers';

/*
 * Portada compacta, roles y recorrido guiado en el celular (Pixel 7 y iPhones con WebKit).
 * Medimos el alto real de la portada: debe caber en 6 pantallas o menos.
 */

type WelcomePath = 'explore' | 'traveler' | 'host';
async function start(page: Page, path: WelcomePath = 'explore', tour: 'skipped' | null = 'skipped') {
  await page.addInitScript(([welcome, tourState]) => {
    try {
      localStorage.setItem('chullavida:v3:intro', 'seen');
      localStorage.setItem('chullavida:v3:welcome', JSON.stringify({ completed: true, path: welcome }));
      if (tourState) localStorage.setItem('chullavida:v3:tour', tourState);
    } catch { /* almacenamiento bloqueado */ }
  }, [path, tour] as const);
  await page.goto('/');
  await choosePrivateConsent(page);
}

/** Baja hasta el final para que se monten las secciones perezosas y vuelve arriba. */
async function loadWholePage(page: Page) {
  for (let i = 0; i < 25; i++) {
    await page.evaluate(() => window.scrollBy(0, window.innerHeight));
    await page.waitForTimeout(60);
  }
  await expect(page.locator('.cv-footer')).toBeVisible();
  await page.waitForTimeout(400);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
}

const BUSINESS = /Tengo un negocio|Anfitriones|Cobros y retiros|Mi negocio|Modo negocio/;

test.describe('portada compacta', () => {
  test('cabe en 6 pantallas o menos, con carruseles y sin desborde', async ({ page }) => {
    await start(page);
    await loadWholePage(page);
    const screens = await page.evaluate(() => document.documentElement.scrollHeight / window.innerHeight);
    test.info().annotations.push({ type: 'pantallas', description: screens.toFixed(2) });
    expect(screens, `alto de la portada en pantallas (${screens.toFixed(2)})`).toBeLessThanOrEqual(6);

    // Carruseles por región: se deslizan de lado y la siguiente tarjeta asoma.
    const rail = page.locator('.cv-region-rail').first().locator('.cv-rail-track');
    await expect(rail).toBeVisible();
    const { scrollable, snap } = await rail.evaluate(element => ({
      scrollable: element.scrollWidth > element.clientWidth + 20,
      snap: getComputedStyle(element).scrollSnapType,
    }));
    expect(scrollable).toBe(true);
    expect(snap).toContain('x');
    // Cultura Viva en carrusel dentro de la portada.
    await expect(page.locator('.cv-culture-band [aria-label="Fiestas de los próximos meses"]')).toBeAttached();
    // Avisos largos como chip con detalle al tocar.
    const chip = page.locator('.cv-note-chip summary', { hasText: 'Precios referenciales' });
    await chip.scrollIntoViewIfNeeded();
    await chip.click();
    await expect(page.getByText('El anfitrión confirma acceso, servicios y tarifa final.')).toBeVisible();

    expect(await scanForOverflow(page, 8)).toBeLessThanOrEqual(0);
  });

  test('cuenta arriba y barra inferior con 5 destinos dentro de la pantalla', async ({ page }) => {
    await start(page);
    const account = page.locator('header.topbar').getByRole('button', { name: /Entrar o crear cuenta/ });
    await expect(account).toBeVisible();
    const box = await account.boundingBox();
    expect(box && box.y).toBeLessThan(80);
    // La cabecera sigue a la vista al bajar.
    await page.evaluate(() => window.scrollTo({ top: 1500, behavior: 'instant' }));
    await expect(account).toBeInViewport();
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));

    const nav = page.getByRole('navigation', { name: 'Navegación móvil' });
    await expect(nav).toBeVisible();
    await expect(nav.getByRole('button')).toHaveText(['Explorar', 'Mi viaje', 'MIJIN', 'Billetera', 'Cuenta']);
    const viewport = page.viewportSize()!;
    const navBox = (await nav.boundingBox())!;
    expect(Math.round(navBox.y + navBox.height)).toBeLessThanOrEqual(viewport.height);
    for (const button of await nav.getByRole('button').all()) {
      const b = (await button.boundingBox())!;
      expect(Math.round(b.height)).toBeGreaterThanOrEqual(44);
    }
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  });
});

test.describe('roles', () => {
  test('invitado: modo viajero y un único acceso «Soy anfitrión» en el pie', async ({ page }) => {
    await start(page, 'explore');
    await loadWholePage(page);
    const visible = await page.evaluate(() => document.body.innerText);
    expect(visible).not.toMatch(BUSINESS);
    await expect(page.getByRole('button', { name: 'Soy anfitrión' })).toHaveCount(1);
    await expect(page.locator('.cv-footer').getByRole('button', { name: 'Soy anfitrión' })).toBeVisible();
  });

  test('viajero: nada de negocio en cabecera, menú, barra, pie ni portada', async ({ page }) => {
    await start(page, 'traveler');
    await loadWholePage(page);
    expect(await page.evaluate(() => document.body.innerText)).not.toMatch(BUSINESS);
    await expect(page.getByRole('button', { name: 'Soy anfitrión' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Abrir menú' }).click();
    const menu = page.locator('.sidebar');
    await expect(menu).toHaveClass(/sidebar-open/);
    expect(await menu.innerText()).not.toMatch(BUSINESS);
  });

  test('negocio: solo su panel, sin portada ni barra de viajero', async ({ page }) => {
    await start(page, 'host');
    await expect(page.locator('.app-shell')).toHaveClass(/is-business/);
    await expect(page.locator('#hero-title')).toHaveCount(0);
    await expect(page.getByRole('navigation', { name: 'Navegación móvil' })).toHaveCount(0);
    await expect(page.locator('.cv-toolbar')).toHaveCount(0);
    await expect(page.locator('.cv-note-chip summary', { hasText: 'Panel de prueba' })).toBeVisible();
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  });
});

test.describe('recorrido guiado', () => {
  test('al saltarlo vuelve al principio y enfoca el título', async ({ page }) => {
    await start(page, 'explore', null);
    // Si la bienvenida abrió el recorrido, se usa ese; si no, se abre a mano.
    const skip = page.getByRole('button', { name: 'Saltar recorrido' });
    if (!(await skip.isVisible().catch(() => false))) await page.evaluate(() => window.dispatchEvent(new Event('cv3:tour')));
    await expect(skip).toBeVisible();
    // Avanza un par de pasos para que la página se desplace.
    const next = page.getByRole('button', { name: /^Siguiente/ });
    for (let i = 0; i < 3 && await next.isVisible().catch(() => false); i++) await next.click();
    await page.evaluate(() => window.scrollTo({ top: 1200, behavior: 'instant' }));
    await skip.click();
    await expect(skip).toBeHidden();
    await expect.poll(() => page.evaluate(() => Math.round(window.scrollY)), { timeout: 5000 }).toBe(0);
    await expect(page.locator('#hero-title')).toBeFocused();
  });
});
