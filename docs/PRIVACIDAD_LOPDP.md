# Privacidad, cookies y documentos LOPDP — CHULLA VIDA 3.1

Estado al 13-11-2026. Todo lo legal es **borrador pendiente de revisión jurídica**: los datos del responsable siguen como marcadores (`[RAZÓN SOCIAL]`, `[RUC]`, `[DOMICILIO]`, `[CORREO DE PRIVACIDAD]`, plazos `[PENDIENTE DE CONFIRMAR CON ASESORÍA]`). Nada de esto acredita cumplimiento ni certificación.

## 1. Banner de cookies por niveles

| Nivel | Contenido externo (Spotify, OpenStreetMap) | Personalización | Analítica | Marketing |
|---|---|---|---|---|
| Privado | no | no | no | no |
| Equilibrado | sí, solo al abrirlo | no | no | no |
| Personalizado | lo que elijas | lo que elijas | no conectada | no conectada |

- Primera visita: tres tarjetas de igual peso, **ninguna marcada**. «Guardar mi elección» exige elegir una. «Personalizado» abre el editor con todos los opcionales desmarcados.
- Analítica y marketing **no existen hoy**: se muestran «No conectada», desactivadas, y `makeConsent` las fuerza a `false` aunque alguien las pida (`CONNECTED_CATEGORIES` en `src/domain/consent`).
- Se aplica de verdad: `ConsentMedia` y el mapa de `LocationPanel` solo montan el iframe con `preferences.media === true`; al revocar se desmontan.
- Revocable siempre en «Privacidad y cookies» (pie de página → `useConsent().open()`), botón «Retirar permisos opcionales».
- Se guarda en `localStorage['chullavida:consent:v2']`: `version: 2`, categorías, `level`, `policyVersion` (`1.0-borrador-2026-11-13`), `method` (`banner`/`editor`/`feature`/`migration`/`revoke`) y `updatedAt`.
- Compatibilidad: la preferencia de 3.0 (`chullavida:consent:v1`) se migra conservando solo `media` y su fecha, y la clave vieja se elimina. Si cambia `CONSENT_POLICY_VERSION`, todas las personas vuelven a elegir.
- API de `useConsent()` intacta (`preferences`, `update`, `open`, `close`, `editing`, `notice`) más `choose(level, custom?)` y `revoke()`. `update(partial)` sigue recibiendo categorías y deriva el nivel; `update({})` = Privado.

Pendiente: el consentimiento vive solo en el dispositivo. La tabla `consent_events` existe en Supabase pero no se escribe todavía desde el banner (requiere sesión y decisión sobre identificadores seudónimos).

## 2. Sección «Protección de tus datos personales»

`src/features/privacy-rights/DataProtectionSection.tsx` exporta `DataProtectionSection({ variant: 'page' | 'compact', onOpenForm?, headingLevel? })`:
texto propio de CHULLA VIDA, botones «Descargar Aviso de Protección de Datos» y «Descargar Formulario de Derechos» (enlaces `download` a `/legal/*.pdf`) y «Llenar el formulario en línea» (evento `cv3:privacy-rights`). Ya está montada en el Centro legal (`LegalCenter`). Rutas y evento en `src/features/privacy-rights/documents.ts`.

## 3. PDFs

Generados con `python -I scripts/build-legal-pdfs.py` (reportlab + Pillow; logo WebP → PNG en memoria; salida determinista):

- `public/legal/aviso-proteccion-datos-chulla-vida.pdf` (4 páginas): responsable con marcadores, datos por flujo (cuenta, cédula, reservas y pagos, voz no almacenada, ubicación puntual, notificaciones, cookies, solicitudes), finalidades y base legal propuesta, encargados (Supabase, Vercel, PayPhone, Anthropic si se activa la IA, Open-Meteo), transferencias, conservación, derechos, cómo ejercerlos, SPDP, menores, seguridad, versión y fecha.
- `public/legal/formulario-derechos-datos-chulla-vida.pdf` (2 páginas, **rellenable** con campos AcroForm): titular, documento, contacto, representante, derechos (casillas), descripción, adjuntos, declaración, firma y fecha, y «Para uso de CHULLA VIDA».

Cada página lleva franja de marca, logo, rótulo «BORRADOR — pendiente de revisión jurídica», marca de agua y «Página X de Y». Al completar los datos del responsable, edita el script y vuelve a generarlo.

## 4. Formulario en línea de derechos

`RightsRequestForm` se abre con `window.dispatchEvent(new Event('cv3:privacy-rights'))` (lo escucha `PrivacyControls`, que siempre está montado en `App`).

- Cédula: validador compartido `src/domain/identity/cedula.ts` (provincia, tercer dígito y dígito verificador). La interfaz dice «Formato válido… no confirma tu identidad». No hay consulta al Registro Civil.
- **El borrador solo vive en memoria de React**: nada se escribe en `localStorage`, `sessionStorage` ni IndexedDB (probado).
- Sin Supabase: «Aún no podemos recibirla en línea», descarga de un resumen `.txt` generado en el navegador y enlace al PDF.
- Con Supabase y sesión: inserta en `public.privacy_requests` una fila por derecho con solo `subject_id`, `kind`, `detail` (columnas con permiso de inserción; RLS `create_own_privacy_request` exige `subject_id = auth.uid()` y estado `received`). «No ser objeto de decisiones automatizadas» se guarda como `kind = 'objection'` con la marca en `detail` porque el `check` de la tabla no tiene ese valor.
- Con Supabase sin sesión: pide iniciar sesión (`cv3:account`) o descargar el resumen.
- `detail` contiene el número de documento completo para que el equipo valide la identidad; queda protegido por RLS (titular y `privacy_officer`).

Pendiente: panel del responsable para tramitar solicitudes (existe `public.process_privacy_request` en la migración 012), subida de adjuntos y plazo legal confirmado.

## 5. Pruebas

- `tests/unit/legal-consent.test.ts`: niveles, analítica/marketing bloqueadas, versión y migración, PDFs existentes y no vacíos, formulario con AcroForm.
- `tests/unit/privacy-consent.test.tsx` (jsdom): banner sin preselección, Privado bloquea Spotify, Equilibrado lo permite, Personalizado sin premarcados, revocar desmonta el iframe, migración 3.0.
- `tests/unit/privacy-rights.test.tsx` (jsdom): cédula, validación, sin Supabase, con Supabase (mock) inserta en `privacy_requests`, sin sesión, la cédula nunca llega al almacenamiento, sección de descargas.

## 6. Para completar antes de producción

1. Datos reales del responsable, delegado (si aplica), plazos de conservación y de respuesta, países de tratamiento de cada proveedor.
2. Contratos de encargo con Supabase, Vercel, PayPhone, Anthropic (si se activa) y correo.
3. Revisión por abogado en Ecuador y regeneración de los PDF sin el rótulo de borrador.
4. Registrar consentimientos en `consent_events` cuando haya sesión.
