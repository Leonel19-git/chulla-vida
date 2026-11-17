import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/* Guardas estáticas de la capa móvil e iPhone. Lo visual se comprueba en tests/e2e con WebKit y Chromium. */
const root = resolve(__dirname, '../..');
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');

describe('index.html para iPhone', () => {
  const html = read('index.html');
  it('usa viewport-fit=cover para las zonas seguras y no bloquea el zoom', () => {
    const viewport = html.match(/<meta name="viewport" content="([^"]+)"/)?.[1] ?? '';
    expect(viewport).toContain('width=device-width');
    expect(viewport).toContain('viewport-fit=cover');
    expect(viewport).not.toMatch(/user-scalable\s*=\s*no|maximum-scale\s*=\s*1(\.0)?\b/);
  });
  it('declara icono de inicio, color de tema y modo app', () => {
    expect(html).toMatch(/<link rel="apple-touch-icon"[^>]*href="\/brand\/icon-180\.png"/);
    expect(html).toMatch(/<meta name="theme-color" content="#103452"/);
    expect(html).toMatch(/<meta name="apple-mobile-web-app-capable" content="yes"/);
    expect(html).toMatch(/<meta name="apple-mobile-web-app-title" content="CHULLA VIDA"/);
    expect(html).toMatch(/<meta name="format-detection" content="telephone=no"/);
  });
});

describe('manifest', () => {
  const manifest = JSON.parse(read('public/manifest.webmanifest'));
  it('abre en modo standalone, con tema e iconos 192/512 y uno enmascarable', () => {
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/');
    expect(manifest.theme_color).toBe('#103452');
    const sizes = manifest.icons.map((icon: { sizes: string }) => icon.sizes);
    expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']));
    expect(manifest.icons.some((icon: { purpose?: string }) => icon.purpose === 'maskable')).toBe(true);
  });
});

describe('capa móvil (mobile-ios.css)', () => {
  const css = read('src/components/chulla/mobile-ios.css');
  const app = read('src/App.tsx');
  it('se importa en App.tsx después de las demás hojas globales', () => {
    const imports = [...app.matchAll(/^import '\.\/components\/chulla\/([\w-]+)\.css';/gm)].map(match => match[1]);
    expect(imports.at(-1)).toBe('mobile-ios');
  });
  it('respeta las zonas seguras en cabecera, barra inferior, MIJIN, diálogos y aviso de privacidad', () => {
    for (const selector of ['.topbar.topbar{', '.mobile-bottom-nav.mobile-bottom-nav{', '.mijin-launcher.mijin-launcher{', '.cv-dialog.cv-dialog{', '.privacy-banner.consent-bar.consent-bar{']) {
      const start = css.indexOf(selector);
      expect(start, selector).toBeGreaterThan(-1);
      expect(css.slice(start, css.indexOf('}', start)), selector).toContain('env(safe-area-inset-');
    }
  });
  it('usa dvh en diálogos y paneles, y evita el zoom de Safari con letra de 16 px en campos', () => {
    expect(css).toMatch(/\.cv-dialog\.cv-dialog\{[^}]*100dvh/);
    expect(css).toMatch(/@media \(pointer:coarse\)\{[^@]*font-size:16px/);
  });
  it('agrupa: en móvil la cabecera oculta «Ver intro» y «Tengo un negocio» y da 44 px al resto', () => {
    expect(css).toMatch(/\.topbar\.topbar \.header-intro,\.topbar\.topbar \.business-switch\{display:none\}/);
    expect(css).toMatch(/\.topbar\.topbar \.mobile-menu\{width:44px;min-width:44px;height:44px/);
  });
  it('neutraliza el hover pegajoso en pantallas táctiles', () => {
    expect(css).toMatch(/@media \(hover:none\)\{[\s\S]*transform:none!important/);
  });
  it('nada usa 100vh sin un respaldo en dvh en las hojas de la cabecera y la privacidad', () => {
    for (const path of ['src/App.css', 'src/features/privacy/privacy.css']) {
      const sheet = read(path);
      for (const match of sheet.matchAll(/(\d+)vh/g)) {
        const after = sheet.slice(match.index, match.index + 120);
        expect(after, `${path}: ${match[0]}`).toMatch(/dvh/);
      }
    }
  });
});
