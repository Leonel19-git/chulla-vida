# Comprobación y límites

## Comandos reproducibles

En PowerShell usar `npm.cmd` si la política de scripts bloquea `npm.ps1`.

```sh
npm run build
npm run typecheck:api
npm test
npm run verify
npm run lint
```

`npm run check` reúne estos pasos. El build tipa el cliente; `typecheck:api` cubre ambos adaptadores de servidor.

Resultado de esta continuación: **59 pruebas en 13 archivos aprobadas**, build y tipado de API aprobados, verificaciones de dominio/catálogo/legales aprobadas. Lint finaliza correctamente con avisos pendientes del prototipo y de organización de componentes. El detector mecánico de diseño señaló diferencias respecto a la escala anterior de `DESIGN.md`; no constituye una aprobación visual.

## Cobertura automatizada

- Catálogo: 33 fichas, IDs, tres fuentes exactas, rangos, EUR, advertencias, restricciones y bloqueo de compra.
- Recorrido de interfaz: las 33 fichas visibles, búsqueda, detalle/fuente, guardado y ausencia de pago en el catálogo público.
- Presupuesto/Flex/Pet: Quito con USD 20, Galápagos no viable con USD 20, duración conocida, alternativas sin modificar reservas, mascotas sin política confirmada.
- MIJIN: recuperación y fuentes, preguntas privadas, modo offline limitado a descargas, voz/clima sin permiso o acción sin actividad externa.
- Clima: validación y respuestas modeladas mediante mocks; no certifica condiciones meteorológicas reales.
- Supabase/PGlite: usuarios cruzados, rol admin, solicitudes, idempotencia, documentos privados y grants de columnas.
- Auth: estado sin credenciales y limpieza de datos privados al cambiar de identidad.
- Offline: IndexedDB, corrupción, versiones, EUR, borrado y restricciones estáticas del SW.
- Reservas anteriores: persistencia tras llegada y prohibición de convertir pagos demo en pagos reales.
- Consentimiento: categorías separadas, iframe bloqueado por defecto y retirado al revocar.

Las verificaciones anteriores del prototipo también pasan: 76 aserciones de dominio, 24 de membresía/pasaporte, 26 de billetera, 3957 comprobaciones de traducción y 147 mensajes de pagos. Estos números no certifican traducciones de las pantallas nuevas ni exactitud lingüística.

## Revisión manual pendiente

- [ ] Escritorio y móvil: jerarquía visual, contraste, desbordamiento y zoom al 200%.
- [ ] Teclado/lector de pantalla y recuperación de foco con paneles superpuestos.
- [ ] Navegador compatible con voz: permitir, detener, revocar y fallback.
- [ ] Consulta real del clima: seleccionar localidad, revisar fuente/hora y fallo de proveedor.
- [ ] Build de producción: descargar, esperar caché, cerrar, recargar sin red y verificar solo instantáneas elegidas.
- [ ] Usuarios alojados separados: confirmar email, recuperar contraseña, permisos cruzados, evidencia privada y revisión admin.
- [ ] Rechazar medios: ausencia de solicitudes Spotify; permitir, abrir y revocar.

El control de navegador se detuvo al no poder comprobar la URL de Chrome. No se usó una captura ni una revisión visual como evidencia en esta entrega. No se certifica preparación de producción.


## Recorrido real 3.2 (15-11-2026)

Entorno: `npm run build` + `npx vite preview --port 4791`. Chromium headless con `--use-fake-ui-for-media-stream --use-fake-device-for-media-stream` y `acceptDownloads`. La CSP de `vercel.json` se inyectó en cada documento con `context.route`. Script: `qa-walk.mjs` en el directorio temporal de la sesión.

| Paso | 1366×800 | 390×844 |
|---|---|---|
| Primera visita: video `chulla-vida-intro.webm` reproduciéndose | OK | OK |
| Banner de privacidad → Equilibrado → se oculta (alto) | OK (116 px) | OK (224 px) |
| Bienvenida: viajero, intereses, origen y presupuesto | OK | OK |
| Tour completo con foco en el globo (12 pasos) | OK | OK |
| Buscar «Quilotoa» → ficha (URL `/experiencias/gen-02-quilotoa-shalala`) | OK | OK |
| «Descargar ficha» → `.html` de 28 KB, abierto sin red: título, foto incrustada, precio, sin `<script>` | OK | OK |
| Comprar → 4242 4242 4242 4242 → comprobante «Visa •••• 4242»; sin PAN, vencimiento ni CVV en almacenamiento | OK | OK |
| Billetera con la compra y la tarjeta enmascarada | OK | OK |
| Pasaporte, Sierra: «Quilotoa Shalalá · Comprado · por visitar» | OK | OK |
| Mi viaje con perro: sin callejón; presupuesto tomado de la bienvenida | OK | OK |
| MIJIN: el micrófono no se cuelga («Reintentar»); por texto responde fiestas de noviembre | OK | OK |
| Abrir `/experiencias/gen-02-quilotoa-shalala` directo → ficha; Atrás la cierra | OK | OK |
| Cabecera «Entrar / Crear cuenta» → requisitos de contraseña | OK | OK |
| Sin desplazamiento horizontal, sin contenido semitransparente | OK | OK |
| Consola y CSP: 0 errores, 0 violaciones | OK | OK |

`npm run check`: lint sin errores, build, typecheck de api, **63 archivos y 565 pruebas aprobadas**, y verificaciones de dominio y catálogo aprobadas.

Este recorrido no cubre:

- La voz con un micrófono y un servicio de reconocimiento reales.
- Cuentas reales en Supabase: no se enviaron correos.
- Cobros reales con PayPhone, porque no hay credenciales.

## Móvil e iPhone (15-11-2026)

Entorno: `npx playwright test` (configuración `playwright.config.ts`): compila a `node_modules/.cache/e2e-dist` y lo sirve con `vite preview` en el puerto 4317. Proyectos: `chromium-mobile` (Pixel 7, 412×839) y WebKit con `webkit-iphone` (iPhone 13, 390×664), `webkit-iphone-se` (iPhone SE 3.ª gen., 375×667) y `webkit-iphone-pro-max` (iPhone 15 Pro Max, 430×739). Para otra URL: `E2E_BASE_URL=https://… npx playwright test`.

Resultado: **25 aprobadas y 3 omitidas**. Las omitidas son el gesto del pasaporte en WebKit, porque el WebKit de Playwright en Windows no permite crear eventos `Touch` sintéticos. El gesto sí pasa en Chromium.

| Prueba (`tests/e2e/mobile.spec.ts`) | Pixel 7 | iPhone SE | iPhone 13 | 15 Pro Max |
|---|---|---|---|---|
| Intro → «Entrar» → privacidad «Privado»; página entera sin desplazamiento horizontal; menú, cuenta y perfil ≥ 44×44 px; selector de idioma a 16 px; MIJIN dentro de la pantalla; el menú lateral abre y cierra | OK | OK | OK | OK |
| Con el aviso de privacidad abierto, MIJIN queda encima y no lo tapa; «Privado / Equilibrado / Personalizado» caben sin cortarse | OK | OK | OK | OK |
| Abrir ficha: el diálogo cabe en la pantalla, «Cerrar» ≥ 44 px y, al cerrar, el cuerpo no queda bloqueado | OK | OK | OK | OK |
| Compra con 4242 4242 4242 4242 → «Comprobante» y «Visa •••• 4242»; `inputmode=numeric`; campos a 16 px; el número completo no queda en localStorage | OK | OK | OK | OK |
| MIJIN: abrir, escribir «¿Qué fiestas hay en noviembre?» y ver una respuesta que menciona noviembre; campo a 16 px | OK | OK | OK | OK |
| Cuenta: el diálogo cabe, «Cerrar» ≥ 44 px, correo con `autocomplete=email` a 16 px | OK | OK | OK | OK |
| Pasaporte: deslizar a la izquierda pasa a «Mi perfil y mi Ecuador» | OK | omitida | omitida | omitida |

Unitarias: `tests/unit/mobile-shell.test.ts` revisa index.html, el manifest, las zonas seguras, `dvh`, los campos a 16 px y el hover táctil. `tests/unit/mobile-download.test.ts` cubre la detección de iOS, el aviso «Guardar en Archivos» y que la URL del archivo se libere un minuto después. Son 13 pruebas aprobadas.

También se revisó con un guion propio de Playwright en WebKit con el iPhone SE: bienvenida, menú «Más», Mi viaje, billetera, pasaporte, «Sin señal», las 12 paradas del recorrido guiado y un barrido de toda la portada. Resultado: 0 errores de consola y ningún contenido con opacidad menor de 0,85. Solo quedan objetivos de menos de 44 px en enlaces dentro de una frase, como «Política de cookies», que WCAG 2.5.8 exceptúa, y en radios o casillas cuyo objetivo real es su etiqueta. En el recorrido guiado, el globo solo tapa lo señalado en el paso 3, porque la ficha es más alta que la pantalla.

Qué cambió:

- **index.html**: `viewport-fit=cover` sin bloquear el zoom. Se añadieron `apple-mobile-web-app-*`, `format-detection` (para que los números no se conviertan en enlaces de teléfono), `color-scheme` y `apple-touch-icon` de 180 px. El **manifest** abre en modo `standalone` con `display_override`.
- **`src/components/chulla/mobile-ios.css`** (se importa la última en App.tsx):
  - Zonas seguras en cabecera, menú lateral, barra inferior, barra de herramientas, MIJIN, diálogos y aviso de privacidad.
  - `100dvh` en diálogos y paneles, y `overscroll-behavior: contain`.
  - Campos a 16 px en pantallas táctiles, para que Safari no haga zoom.
  - Cabecera móvil con menos botones: «Ver intro» sigue en el menú lateral y en el pie; «Tengo un negocio» sigue en el perfil. Todos los controles miden 44 px.
  - MIJIN como círculo de 56 px.
  - Sin `backdrop-filter` en la barra fija ni en los fondos de diálogo.
  - Hover pegajoso anulado con `@media (hover:none)`.
  - `overflow-x: clip` contra desbordes de animación. Antes, los sellos dejaban 13 px de desplazamiento horizontal en el 15 Pro Max.
  - Textos de 10–11 px de las tarjetas subidos a 12 px.
- **Privacidad**: «Personalizado» ya no se corta en 375 px. El aviso breve («Guardamos tu elección…») ocupaba media pantalla y seis líneas; ahora usa el ancho disponible y queda sobre la barra inferior.
- **Recorrido guiado**: en pantallas bajas el globo es más compacto y nunca se sale por abajo.
- **Descargas en iOS**: `src/components/common/download.ts` (`saveFile`, `withIosDownloadHint`) añade el enlace al documento y libera el Blob después de 60 s. Antes, en tres lugares, se liberaba al instante, y WebKit puede quedarse sin archivo. El pasaporte y la ruta sin internet avisan en iPhone que Safari puede abrir el archivo en una pestaña y cómo guardarlo (Compartir → Guardar en Archivos).
- **Diálogo**: al cerrar, el foco vuelve sin desplazar la página (`preventScroll`).

Decisión: el formulario de tarjeta **mantiene `autocomplete="off"`**, no `cc-number`. Es solo para tarjetas de prueba, y el autocompletado de Safari podría escribir la tarjeta real de la persona en un formulario de demostración. Ya tiene `inputmode="numeric"`. Cuando haya una pasarela real (PayPhone), su propio formulario debe usar `cc-number`, `cc-exp` y `cc-csc`.

Pendiente honesto:

- [ ] Probar en un iPhone físico: teclado sobre campos fijos, barra de Safari que se encoge, modo app añadido a inicio con muesca y rotación horizontal. La emulación WebKit no lo reproduce.
- [ ] Gesto del pasaporte en un iPhone real.
- [ ] Descarga de `.html` en Safari iOS: confirmar si se guarda o abre una pestaña (el aviso dice «puede»).
- [ ] Menú «Más» (WorkspaceVivo): un toque fuera lo cierra y también activa lo que hay debajo. Conviene una capa que absorba ese toque, como en los menús de la cabecera.
- [ ] Recorrido guiado (GuidedTour.tsx): con el globo abajo, desplazar lo señalado hacia la parte alta de la pantalla.
