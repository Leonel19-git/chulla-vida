import { expect, test } from '@playwright/test';
import {
  box, choosePrivateConsent, expectInsideViewport, expectTouchTarget, fontSize, openApp, scanForOverflow, skipOnboarding, testCedula,
} from './helpers';

/*
 * Recorrido móvil: Chromium (Pixel 7) y WebKit (iPhone SE, 13 y 15 Pro Max).
 * Solo usa datos de prueba: tarjeta pública 4242…, cédula con formato válido y ningún servicio externo.
 */

test.describe('portada en móvil', () => {
  test('entra desde la intro, sin desborde horizontal y con cabecera táctil', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      localStorage.setItem('chullavida:v3:welcome', JSON.stringify({ completed: true, path: 'explore' }));
      localStorage.setItem('chullavida:v3:tour', 'skipped');
    });
    await page.goto('/');
    const enter = page.getByRole('button', { name: 'Entrar a CHULLA VIDA' });
    await expect(enter).toBeVisible();
    await enter.click();
    await choosePrivateConsent(page);

    expect(await scanForOverflow(page)).toBeLessThanOrEqual(0);

    // Cabecera: cada control mide al menos 44 × 44 y nada se sale por la derecha.
    const topbar = page.locator('header.topbar');
    for (const name of ['Abrir menú', 'Entrar o crear cuenta']) {
      const control = topbar.getByRole('button', { name, exact: false }).first();
      await expect(control).toBeVisible();
      await expectTouchTarget(control);
      const rect = await box(control);
      expect(rect.x + rect.width).toBeLessThanOrEqual((page.viewportSize()?.width ?? 0) + 1);
    }
    const language = topbar.getByRole('combobox', { name: 'Idioma' });
    expect(await fontSize(language)).toBeGreaterThanOrEqual(16);

    // MIJIN vive en la barra inferior en el celular: táctil y dentro de la pantalla.
    const launcher = page.getByRole('navigation', { name: 'Navegación móvil' }).getByRole('button', { name: 'Habla con MIJIN' });
    await expect(launcher).toBeVisible();
    await expectTouchTarget(launcher);
    await expectInsideViewport(page, launcher);

    // El menú lateral abre y se cierra.
    await page.getByRole('button', { name: 'Abrir menú' }).click();
    const close = page.locator('.sidebar').getByRole('button', { name: 'Cerrar menú' });
    await expect(close).toBeVisible();
    await expectTouchTarget(close);
    await close.click();
    await expect(page.locator('.sidebar')).not.toHaveClass(/sidebar-open/);

    expect(errors).toEqual([]);
  });

  test('el aviso de privacidad no tapa la barra inferior ni corta sus opciones', async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/');
    const banner = page.locator('.consent-banner');
    await expect(banner).toBeVisible();
    // En el celular MIJIN está en la barra inferior (el botón flotante se retira): el aviso no la tapa.
    const mijin = page.getByRole('navigation', { name: 'Navegación móvil' }).getByRole('button', { name: 'Habla con MIJIN' });
    await expect(mijin).toBeVisible();
    await page.waitForTimeout(400);
    const a = await box(mijin);
    const b = await box(banner);
    expect(a.y >= b.y + b.height - 1 || a.y + a.height <= b.y + 1, 'el aviso y la barra no se superponen').toBe(true);
    // Las tres opciones caben sin cortar el texto.
    for (const level of ['Privado', 'Equilibrado', 'Personalizado']) {
      const label = banner.locator('.consent-segment strong', { hasText: level });
      const fits = await label.evaluate(element => element.scrollWidth <= element.clientWidth + 1);
      expect(fits, `«${level}» cabe completo`).toBe(true);
    }
  });
});

test.describe('ficha y compra', () => {
  test('abre una ficha en un diálogo que cabe en la pantalla y se cierra', async ({ page }) => {
    await openApp(page);
    await page.getByRole('button', { name: /^Conocer / }).first().click();
    const dialog = page.locator('dialog[open]');
    await expect(dialog).toBeVisible();
    await expectInsideViewport(page, dialog);
    const close = dialog.getByRole('button', { name: 'Cerrar ventana' });
    await expectTouchTarget(close);
    await close.click();
    await expect(page.locator('dialog[open]')).toHaveCount(0);
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
  });

  test('compra con la tarjeta de prueba 4242 y solo guarda marca y últimos 4', async ({ page }) => {
    await openApp(page);
    await page.getByRole('button', { name: /^Comprar:/ }).first().click();
    const dialog = page.locator('dialog[open]');
    await expect(dialog.getByText('Modo prueba sin cobro.')).toBeVisible();
    await expectInsideViewport(page, dialog);

    await dialog.getByLabel('Inicio').fill('2099-05-02');
    await dialog.getByRole('button', { name: /^Continuar/ }).click();
    const name = dialog.getByLabel('Nombre y apellido');
    expect(await fontSize(name)).toBeGreaterThanOrEqual(16);
    await name.fill('Ana Pérez');
    await dialog.getByLabel('Correo').fill('ana.perez@correo.ec');
    await dialog.getByLabel(/Número de cédula/).fill(testCedula());
    await dialog.getByRole('button', { name: /^Continuar/ }).click();
    await dialog.getByRole('checkbox').check();
    await dialog.getByRole('button', { name: /Elegir método de pago/ }).click();
    await expect(dialog.getByRole('heading', { name: 'Método de pago' })).toBeVisible();

    const number = dialog.getByLabel('Número de la tarjeta');
    await expect(number).toHaveAttribute('inputmode', 'numeric');
    expect(await fontSize(number)).toBeGreaterThanOrEqual(16);
    await number.fill('4242424242424242');
    await dialog.getByLabel('Vence (MM/AA)').fill('12/29');
    await dialog.getByLabel('CVV').fill('123');
    await dialog.getByRole('button', { name: /^Pagar .* prueba$/ }).click();
    await expect(dialog.getByRole('heading', { name: 'Comprobante' })).toBeVisible();
    await expect(dialog.getByText('Visa •••• 4242')).toBeVisible();

    const stored = await page.evaluate(() => Object.keys(localStorage).map(key => localStorage.getItem(key)).join('|'));
    expect(stored).not.toContain('4242424242424242');
    expect(stored).not.toContain('4242 4242 4242 4242');
    expect(await scanForOverflow(page, 4)).toBeLessThanOrEqual(0);
  });
});

test.describe('MIJIN y cuenta', () => {
  test('abre MIJIN, escribe una pregunta y recibe respuesta', async ({ page }) => {
    await openApp(page);
    await page.getByRole('navigation', { name: 'Navegación móvil' }).getByRole('button', { name: 'Habla con MIJIN' }).click();
    const dialog = page.locator('dialog[open]');
    await expect(dialog).toBeVisible();
    await expectInsideViewport(page, dialog);
    const input = dialog.getByRole('textbox', { name: 'Consulta accesible para MIJIN' });
    await input.scrollIntoViewIfNeeded();
    expect(await fontSize(input), 'sin zoom al enfocar en iPhone').toBeGreaterThanOrEqual(16);
    await input.fill('¿Qué fiestas hay en noviembre?');
    await input.press('Enter');
    await expect(dialog.locator('.mijin-caption-answer, .mijin-results, .mijin-notice').first()).not.toBeEmpty();
    await expect(dialog.getByText(/noviembre/i).first()).toBeVisible();
  });

  test('abre la cuenta con campos sin zoom y teclado adecuado', async ({ page }) => {
    await openApp(page);
    await page.getByRole('button', { name: /Entrar o crear cuenta/ }).first().click();
    const dialog = page.locator('dialog[open]');
    await expect(dialog.getByRole('heading', { name: /Tu cuenta en CHULLA VIDA/ })).toBeVisible();
    await expectInsideViewport(page, dialog);
    await expectTouchTarget(dialog.getByRole('button', { name: 'Cerrar ventana' }));
    const email = dialog.locator('input[type=email]').first();
    await email.scrollIntoViewIfNeeded();
    await expect(email).toHaveAttribute('autocomplete', 'email');
    expect(await fontSize(email)).toBeGreaterThanOrEqual(16);
    expect(await scanForOverflow(page, 2)).toBeLessThanOrEqual(0);
  });
});

test.describe('pasaporte con gestos', () => {
  test('deslizar a la izquierda pasa a la página siguiente', async ({ page, browserName }) => {
    await openApp(page);
    // En el celular el pasaporte está en los accesos rápidos de la portada (y en el menú).
    await page.locator('[data-tour="passport"]').first().click();
    const dialog = page.locator('dialog[open]');
    await expect(dialog.getByRole('heading', { name: 'Pasaporte Guambra', level: 2 }).first()).toBeVisible();
    await expectInsideViewport(page, dialog);
    const book = dialog.locator('[aria-label*="cambiar página"]').first();
    await expect(book).toBeVisible();
    const swiped = await book.evaluate(element => {
      if (typeof Touch !== 'function' || typeof TouchEvent !== 'function') return false;
      const rect = element.getBoundingClientRect();
      const y = rect.top + rect.height / 2;
      let start: Touch; let end: Touch;
      try {
        start = new Touch({ identifier: 1, target: element, clientX: rect.right - 30, clientY: y });
        end = new Touch({ identifier: 1, target: element, clientX: rect.left + 30, clientY: y });
      } catch { return false; } // WebKit de escritorio (Playwright) no deja construir Touch.
      element.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: [start], changedTouches: [start] }));
      element.dispatchEvent(new TouchEvent('touchend', { bubbles: true, cancelable: true, touches: [], changedTouches: [end] }));
      return true;
    });
    test.skip(!swiped, `Este motor (${browserName}) no permite crear eventos táctiles sintéticos`);
    // En celular el libro muestra una cara por pantalla: el gesto pasa de la portada (1 de 16) a la cara 2.
    await expect(dialog.getByText(/^2 de 16/).first()).toBeVisible();
  });
});
