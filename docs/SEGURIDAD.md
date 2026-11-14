# Seguridad de CHULLA VIDA · auditoría del 13-11-2026

Esta revisión cubre la rama `chulla-vida-3.1`: la SPA, las funciones de Vercel en `api/`, las migraciones de Supabase, el service worker, las cabeceras de `vercel.json` y las dependencias. Se hizo leyendo el código, con pruebas automáticas (Vitest, más PGlite para el SQL) y con Playwright sin ventana sobre `vite preview`. No hay credenciales de Supabase ni de PayPhone, así que **no se probó nada contra servicios alojados reales**.

Severidad: **Alta** (explotable ya, con daño directo) · **Media** (explotable con condiciones, o falta una defensa importante) · **Baja** (defensa en profundidad o riesgo residual) · **Info** (revisado sin hallazgo).

## Hallazgos corregidos

| # | Severidad | Dónde | Hallazgo | Corrección |
|---|---|---|---|---|
| 1 | Media | `vercel.json` | No había Content-Security-Policy. Ante cualquier XSS futuro, el navegador habría ejecutado scripts de cualquier origen. | CSP nueva: `script-src 'self'` (sin `unsafe-inline` ni `unsafe-eval`), `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'self'`, `form-action 'self'` más PayPhone. `connect-src` solo permite el propio sitio, `*.supabase.co` (https y wss) y las API de Open-Meteo de clima y geocodificación. `frame-src` solo admite Spotify y OpenStreetMap, que además solo se cargan con el permiso de contenido externo. Se añadió `Cross-Origin-Opener-Policy: same-origin`. La prueba está en `tests/unit/hosting.test.ts`. Con Playwright se inyectó la misma cabecera y se recorrió todo el flujo a 1366 y 390 px, incluido el mapa de OpenStreetMap y la geocodificación: **no hubo ninguna violación de CSP**. |
| 2 | Baja | `supabase/migrations/202611140002_security_hardening.sql` | Ocho funciones de disparador con `SECURITY DEFINER` (auditorías, capacidad e historial de reservas, sincronización de consentimiento) tenían `EXECUTE` para `anon` y `authenticated`, heredado de los permisos por defecto. PostgreSQL ya impide llamarlas fuera de un disparador, pero el permiso sobraba. | Migración que revoca `EXECUTE` a `public`, `anon` y `authenticated`; los disparadores siguen funcionando. La prueba nueva `supabase/tests/security-definer.test.ts` comprueba: (a) todas las funciones `SECURITY DEFINER` fijan `search_path`; (b) `anon` solo puede ejecutar `record_consent`; (c) ninguna función de disparador es invocable; (d) `anon` no tiene permisos de escritura sobre tablas; (e) el único bucket público es `media-public`. |
| 3 | Baja (privacidad) | `src/features/onboarding/WelcomeFlow.tsx` | En la primera visita, la bienvenida se abría encima del banner de cookies, así que la persona interactuaba con la app antes de elegir su nivel de privacidad. | La bienvenida automática espera a que se guarde la elección de cookies. Si se abre a mano (evento `cv3:welcome`), no espera. |
| 4 | Info (calidad) | `src/features/assistant/knowledge.ts` | MIJIN repetía la fecha de cada fiesta y dejaba dobles puntos («Junio; … Junio; …..»). | Si la etiqueta de estado ya incluye la fecha, no se repite. Hay prueba de regresión en `tests/unit/mijin-dialogos.test.ts`. |

## Revisado sin hallazgos (con evidencia)

- **Secretos.** `.env.local` está en `.gitignore` y no está versionado (`git ls-files` solo lista `.env.example`); localmente solo contiene el token OIDC de la CLI de Vercel. `git grep` no encuentra JWT, claves `sk-ant-` ni tokens de PayPhone. En `dist/`, la única aparición de `service_role` es el texto del control que **rechaza** una clave de servidor en el navegador (`src/lib/supabase.ts`). Las variables `VITE_*` son solo la URL y la clave pública de Supabase.
- **XSS.** `dangerouslySetInnerHTML` solo se usa con dibujos SVG constantes (`regionalSceneSvg`), nunca con datos. Los HTML descargables (comprobante, pasaporte, ruta sin señal) escapan cada valor. React 19 bloquea las URL `javascript:` en `href`. Las respuestas de MIJIN, tanto las locales como las de la IA remota, se muestran como texto y no como HTML. El catálogo remoto de Supabase solo puede reemplazar campos de texto editoriales, no URL ni medios (`src/features/cms/api.ts`). El QR del comprobante es un `data:image/svg+xml` generado por la librería, que solo codifica el rótulo de prueba y el código.
- **API de pagos (`api/payments/*`).**
  - Validan el método y la forma exacta del cuerpo (lista blanca de claves) y responden `Cache-Control: no-store`.
  - Los errores son genéricos, sin detalles internos.
  - El importe sale siempre de la base de datos y nunca del cliente.
  - La aprobación solo se registra después de `V2/Confirm` en PayPhone, cotejando referencia, importe y moneda.
  - `claim_payphone_checkout` es idempotente.
  - La URL de PayPhone se valida en el servidor y otra vez en el cliente (host, ruta y `paymentId`).
  - `return.ts` redirige solo a rutas relativas con la referencia validada, así que no hay redirección abierta.
  - La compra en modo prueba nunca toca estas rutas ni muestra un pago real como exitoso.
- **CORS.** Ninguna función emite `Access-Control-Allow-Origin`. Como las llamadas con JSON y `Authorization` necesitan preflight, los navegadores de otros orígenes quedan bloqueados.
- **Inyección de instrucciones (`api/assistant.ts`).**
  - Viene apagado por defecto. Para usarlo hacen falta sesión real, consentimiento explícito y una pregunta de 1000 caracteres como máximo, con lista blanca de claves.
  - El mensaje de sistema declara la pregunta y las fichas como datos, no como instrucciones.
  - Los temas sensibles (privacidad, pagos, reservas, clima, cierres, mascotas) se responden con reglas fijas, sin el modelo.
  - La salida es texto, con un tope de 450 tokens, y lleva el aviso «Resumen generado por IA».
  - El modo local también reconoce frases típicas de inyección.
- **Supabase.**
  - La prueba `_smoke` verifica que todas las tablas de `public` tienen RLS después de aplicar las 19 migraciones.
  - Todas las funciones `SECURITY DEFINER` usan `search_path = ''`.
  - `anon` no tiene permisos de escritura.
  - Los buckets privados (`merchant-verification`, `media-uploads`, `verification-docs`, `journal-private`) no son públicos.
  - El documento del comprador se guarda solo como sus últimos 4 dígitos más una huella SHA-256 con sal (`202611140001_buyer_identity.sql`).
- **Datos personales en el navegador.** Lo comprobó Playwright tras una compra con cédula: ni `localStorage` ni `sessionStorage` contienen la cédula ni el correo completos. El comprobante descargado tampoco lleva la cédula completa. La billetera rechaza registros con documento o correo completos. No hay `console.log` en `src/` ni en `api/`, ni datos personales en URL.
- **Service worker (`public/sw.js`).** No intercepta peticiones con `Authorization`, con parámetros de consulta, fuera de las rutas públicas (`/api` queda excluido) ni respuestas `no-store`/`private`.
- **Dependencias de producción.** `npm audit --omit=dev` encuentra 0 vulnerabilidades.

## Pendientes (no corregidos aquí, y por qué)

| # | Severidad | Dónde | Pendiente | Por qué no se hizo / qué hacer |
|---|---|---|---|---|
| P1 | Media (solo desarrollo) | `package.json` → `@vercel/node` | `npm audit` completo reporta 9 avisos (4 altos) en `@vercel/node` → `undici`, `@fastify/busboy`, `path-to-regexp`, `ajv`, `glob`, `minimatch`. | Es una dependencia de desarrollo: `api/` solo la importa con `import type`, así que no llega ni al bundle ni a las funciones. Para corregirlo hay que subir `@vercel/node` (cambio mayor) en `package.json`, que esta tarea no podía tocar. |
| P2 | Media | `api/payments/*`, `api/weather.ts` | Las funciones no limitan la frecuencia de peticiones. Pagos tiene idempotencia y verificación con el proveedor, pero no cuota por IP o por usuario. | Antes de activar `PAYMENTS_ENABLED`, añadir reglas de *rate limit* del Firewall de Vercel para `/api/payments/*` y `/api/weather`. |
| P3 | Baja | `api/assistant.ts` | La cuota de MIJIN vive en memoria de cada instancia (6 por minuto y 50 por día) y se pierde entre instancias. Con más de 2000 usuarios activos, los nuevos quedan bloqueados. | Antes de `ASSISTANT_ENABLED=true`, mover la cuota a un almacén compartido (tabla de Supabase o KV). |
| P4 | Baja | `api/payments/return.ts` | La ruta de retorno es pública por diseño. Quien conozca una referencia podría sobrescribir `return_candidate_id`, una pista que siempre se verifica con PayPhone. No puede aprobar un pago, pero sí retrasar una conciliación. | Las referencias no son adivinables. Si se quiere cerrar el todo, aceptar solo el primer candidato o registrar varios, después de definir con PayPhone cómo se reintenta un pago con tarjeta. |
| P5 | Baja | `record_consent` (anon) | `anon` puede registrar consentimientos seudónimos sin límite: se podrían inflar filas. | La apertura es intencional (consentimiento previo a la cuenta). Falta añadir límite por `pseudonymous_id`, o hacerlo pasar por una función de servidor, cuando se conecte Supabase. |
| P6 | Decisión humana | `RightsRequestForm` → `privacy_requests.detail` | El formulario de derechos guarda la cédula completa para que el responsable verifique la identidad. Solo la ven la persona titular y el rol de privacidad. | Hace falta una decisión jurídica: guardarla enmascarada y verificar por otro canal, o conservarla con un plazo de supresión. |
| P7 | Baja | CSP `style-src 'unsafe-inline'` | Hace falta para los estilos en línea de React y para los HTML descargables. | El riesgo residual es bajo, porque `script-src` es estricto. Revisar si en algún momento se quitan los estilos en línea. |
| P8 | Baja (licencias) | CSP `img-src https://images.unsplash.com` | Solo lo usa el prototipo anterior (`src/data/mockData.ts`, `GadPanel`, `PhotoUploadModal`) con fotos de Unsplash sin crédito verificado. | Retirar esas imágenes del prototipo y después quitar el dominio de la CSP. Las fichas actuales usan solo fotos locales con licencia libre verificada. |
| P9 | Configuración | Supabase Auth (alojado) | Faltan los límites de envío de OTP, SMTP propio, protección contra contraseñas filtradas y caducidad del OTP en el panel. | El límite de 5 intentos del cliente es solo de experiencia de uso. Los límites reales los pone el servidor de Supabase. Está documentado en `docs/SUPABASE_SETUP.md`. |
| P10 | Configuración | Vercel | La CSP se probó inyectándola en `vite preview`. Todavía no se confirmó en un despliegue real. | Tras publicar, revisar la consola en la URL pública. Las vistas previas de Vercel con la barra «Vercel Live» pueden mostrar avisos de CSP por su script, que no existe en producción. |

## Cómo repetir la verificación

```bash
npm run check                                  # lint, build, tipado de API, pruebas y verificaciones
npx vitest run supabase/tests tests/unit/hosting.test.ts
npm audit --omit=dev                           # dependencias que se publican
npx tsx scripts/generate-seed.ts --check       # semilla normalizada al día
```
