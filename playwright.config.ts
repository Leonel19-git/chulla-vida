import { defineConfig, devices } from '@playwright/test';

/**
 * Pruebas de navegador móviles (tests/e2e).
 *
 * - chromium-mobile: Pixel 7 (Chrome Android).
 * - webkit-iphone*: motor WebKit de Safari con la pantalla, el agente y el tacto de cada iPhone.
 *   Es una emulación: no reemplaza probar en un iPhone real (teclado, barra de Safari, micrófono).
 *
 * Por defecto compila a node_modules/.cache/e2e-dist y lo sirve con `vite preview` en el puerto 4317
 * (no usa el 5173 del servidor de desarrollo). Para probar otra URL: E2E_BASE_URL=https://… npx playwright test
 */
const PORT = Number(process.env.E2E_PORT ?? 4317);
const OUT_DIR = 'node_modules/.cache/e2e-dist';
const external = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  workers: 2,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: external ?? `http://localhost:${PORT}`,
    locale: 'es-EC',
    timezoneId: 'America/Guayaquil',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium-mobile', use: { ...devices['Pixel 7'] } },
    { name: 'webkit-iphone', use: { ...devices['iPhone 13'] } },
    { name: 'webkit-iphone-se', use: { ...devices['iPhone SE (3rd gen)'] } },
    { name: 'webkit-iphone-pro-max', use: { ...devices['iPhone 15 Pro Max'] } },
  ],
  webServer: external ? undefined : {
    command: `npx vite build --outDir ${OUT_DIR} --emptyOutDir && npx vite preview --outDir ${OUT_DIR} --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
