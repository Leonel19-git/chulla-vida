import { expect, type Locator, type Page } from '@playwright/test';

/** Cédula de prueba con dígito verificador válido (módulo 10). Formato válido, no identidad real. */
export function testCedula(first9 = '171054351'): string {
  const sum = [...first9].reduce((total, char, index) => {
    let value = Number(char) * (index % 2 === 0 ? 2 : 1);
    if (value > 9) value -= 9;
    return total + value;
  }, 0);
  return `${first9}${(10 - (sum % 10)) % 10}`;
}

/** Salta intro, bienvenida y recorrido guiado: para pruebas que empiezan ya dentro de la app. */
export async function skipOnboarding(page: Page) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('chullavida:v3:intro', 'seen');
      localStorage.setItem('chullavida:v3:welcome', JSON.stringify({ completed: true, path: 'explore' }));
      localStorage.setItem('chullavida:v3:tour', 'skipped');
    } catch { /* almacenamiento bloqueado */ }
  });
}

/** Elige «Privado» en el aviso de privacidad, como haría una persona. */
export async function choosePrivateConsent(page: Page) {
  const banner = page.locator('.consent-banner');
  await expect(banner).toBeVisible();
  await banner.locator('label.consent-segment', { hasText: 'Privado' }).click();
  await banner.getByRole('button', { name: 'Guardar mi elección' }).click();
  await expect(banner).toBeHidden();
}

export async function openApp(page: Page) {
  await skipOnboarding(page);
  await page.goto('/');
  await choosePrivateConsent(page);
}

/** Ancho del documento contra el de la pantalla: nada debe obligar a desplazarse de lado. */
export async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
}

/** Recorre la página hacia abajo y devuelve el mayor desborde horizontal encontrado. */
export async function scanForOverflow(page: Page, steps = 12): Promise<number> {
  let worst = await horizontalOverflow(page);
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const viewport = page.viewportSize()?.height ?? 700;
  const stride = Math.max(viewport, Math.ceil(height / steps));
  for (let y = 0; y < height; y += stride) {
    await page.evaluate(top => window.scrollTo({ top, behavior: 'instant' }), y);
    await page.waitForTimeout(120);
    worst = Math.max(worst, await horizontalOverflow(page));
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  return worst;
}

export async function box(locator: Locator) {
  const result = await locator.boundingBox();
  if (!result) throw new Error('El elemento no tiene caja visible');
  return result;
}

/** Objetivo táctil mínimo pedido para la app: 44 × 44 px (WCAG 2.5.5 / guía de Apple). */
export async function expectTouchTarget(locator: Locator, min = 44) {
  const { width, height } = await box(locator);
  expect(Math.round(width), 'ancho del objetivo táctil').toBeGreaterThanOrEqual(min);
  expect(Math.round(height), 'alto del objetivo táctil').toBeGreaterThanOrEqual(min);
}

/** En iPhone, un campo con letra < 16 px provoca zoom al enfocarlo. */
export async function fontSize(locator: Locator): Promise<number> {
  return locator.evaluate(element => parseFloat(getComputedStyle(element).fontSize));
}

/** El diálogo abierto cabe en la pantalla visible (sin salirse por arriba ni por abajo). */
export async function expectInsideViewport(page: Page, locator: Locator) {
  const rect = await box(locator);
  const size = page.viewportSize();
  if (!size) return;
  expect(rect.x).toBeGreaterThanOrEqual(-1);
  expect(rect.y).toBeGreaterThanOrEqual(-1);
  expect(rect.x + rect.width).toBeLessThanOrEqual(size.width + 1);
  expect(rect.y + rect.height).toBeLessThanOrEqual(size.height + 1);
}
