# Supabase de CHULLA VIDA

## Proyecto conectado (14-11-2026)

- Proyecto: **chulla-vida** · ref `xtgfbhhsekavwyolizjq` · región São Paulo (sa-east-1) · plan gratis.
- Panel: https://supabase.com/dashboard/project/xtgfbhhsekavwyolizjq
- API: https://xtgfbhhsekavwyolizjq.supabase.co
- 19 migraciones aplicadas con `supabase db push --remote`; semilla `supabase/seed/seed.sql` cargada: 51 fichas publicadas, 0 reservables.
- Auth: confirmación por correo activada, código de 6 dígitos, contraseña mínima de 10 caracteres con mayúsculas, minúsculas y números, Site URL https://chulla-vida.vercel.app.
- Vercel (producción y vista previa): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (solo servidor).
- La contraseña de la base está en `.env.local` (ignorado por git), variable `SUPABASE_DB_PASSWORD`.

### Pendiente para que lleguen los correos con código

El plan gratis usa el correo de prueba de Supabase: solo envía a miembros de la organización, con un límite muy bajo por hora, y no permite cambiar plantillas. Para que cualquier persona reciba el código hay que configurar un SMTP propio (por ejemplo Resend, Brevo o el correo del dominio) en Authentication → Emails → SMTP Settings. Después, descomentar las secciones `[auth.email.template.*]` de `supabase/config.toml` y ejecutar `npx supabase config push` para subir las plantillas de `supabase/templates/`, que muestran el código `{{ .Token }}`.

Mientras tanto, el correo por defecto de Supabase envía un enlace de confirmación en lugar del código; la app acepta ambos.


**Actualización de reservas y tarjeta:** el directorio `supabase/migrations/` contiene ahora el esquema normalizado completo y migraciones posteriores para checkout y revisión de reembolsos. Aplica **todos los archivos, en orden de nombre**, en un proyecto de pruebas nuevo; no te limites a las dos migraciones históricas mencionadas más abajo. Las nuevas pruebas SQL usan ese conjunto completo. No se aplicaron cambios a una base alojada en esta sesión.

La base conserva una vinculación de entorno de pagos; las reservas nuevas la heredan y el servidor exige coincidencia con su configuración. Un proyecto de pruebas debe marcarse explícitamente como `sandbox` desde administración, separado de producción. Las variables `PAYMENTS_*` y PayPhone son únicamente de servidor. Sigue [PAGOS_ECUADOR.md](PAGOS_ECUADOR.md) antes de habilitar cualquier cobro.

Estado: **preparado y probado localmente; no conectado a un proyecto Supabase real**. La configuración pública vacía desactiva las cuentas y consultas conectadas. El selector de perfiles del prototipo sigue siendo una demostración del navegador y no concede permisos en Supabase.

## Configuración

1. Crea un proyecto Supabase de desarrollo. Conserva las claves de servidor fuera del repositorio.
2. Copia `.env.example` a `.env.local`. Completa `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` con la URL y clave **publicable** del proyecto. Alternativamente se admite la clave pública `anon` en `VITE_SUPABASE_ANON_KEY`. Nunca introduzcas `service_role` ni `sb_secret_*` en una variable `VITE_*`.
3. Configura Authentication para el **código de 6 dígitos por correo** siguiendo la sección «Cuentas con código por correo» de abajo (OTP de 6, confirmación activada, plantillas, Site URL y Redirect URLs).
4. Configura SMTP para las entregas reales y comprueba registro con código, reenvío y recuperación. El repositorio no contiene credenciales SMTP ni un envío de prueba validado.
5. Instala la CLI oficial de Supabase en tu entorno de trabajo y vincula este directorio con el proyecto de desarrollo. Aplica las dos migraciones en orden mediante `supabase db push`, después de revisar el proyecto seleccionado. Para desarrollo local con la CLI y Docker, usa `supabase start` y `supabase db reset`; esta última orden reinicia la base local y carga `supabase/seed.sql`.
6. Para una base remota, ejecuta el contenido de `supabase/seed.sql` en el SQL Editor del proyecto de desarrollo después de las migraciones. La semilla del catálogo es idempotente. Las migraciones se aplican una vez y se controlan mediante el historial de Supabase.
7. Reinicia Vite (`npm run dev`). Abre «Cuenta y negocio», crea una cuenta de prueba, escribe el código que llega al correo y prueba el inicio y cierre de sesión, «Entrar con un código» y «Recuperar acceso».

No se ha ejecutado ninguna de estas operaciones contra infraestructura alojada durante esta entrega. Sin estas variables la interfaz explica lo pendiente, permite seguir explorando y ofrece un **recorrido de demostración** rotulado que simula el paso del código (el código de demo es `123456`, se muestra en pantalla). La demo no llama a la red, no crea cuentas ni guarda la contraseña.

## Cuentas con código por correo (Auth y correo)

La interfaz (`src/features/auth/AccessFlow.tsx`, con `supabase-js` v2) usa estos flujos:

| Acción | Llamadas | Notas |
| --- | --- | --- |
| Crear cuenta | `auth.signUp({ email, password, options: { data, emailRedirectTo } })` → `auth.verifyOtp({ email, token, type: 'signup' })` | Contraseña de 10 a 72 caracteres con letras y números (reglas visibles). Términos sin premarcar; marketing en casilla separada y opcional. |
| Reenviar código de alta | `auth.resend({ type: 'signup', email })` | Cuenta regresiva de 60 s y máximo 5 reenvíos por pantalla; Supabase aplica además sus propios límites. |
| Entrar con contraseña | `auth.signInWithPassword` | Errores traducidos, nunca el texto crudo del servidor. |
| Entrar con un código | `auth.signInWithOtp({ email, options: { shouldCreateUser: false } })` → `verifyOtp({ type: 'email' })` | `shouldCreateUser: false` impide crear cuentas que se salten los Términos. |
| Recuperar acceso | `auth.resetPasswordForEmail` → `verifyOtp({ type: 'recovery' })` → `auth.updateUser({ password })` | El evento `PASSWORD_RECOVERY` también abre «Elige tu contraseña nueva». |

Metadatos guardados al registrarse: `display_name`, `terms_version` y `privacy_version` (versión + 12 primeros caracteres del SHA-256 del borrador en `src/domain/legal/manifest.json`), `terms_accepted_at`, `marketing_opt_in` y, por compatibilidad, `draft_terms_acknowledged`. Tras confirmar el código se llama a `record_consent('email_marketing', …, 'signup')` para dejar evidencia del marketing (aceptado o rechazado) en `consent_events`. Los metadatos de usuario son editables por el propio usuario: **no son prueba de aceptación de términos aprobados**. Cuando exista una versión aprobada, registrar la aceptación con `accept_legal_document` desde el servidor. El proyecto mantiene bloqueadas las compras reales mientras esto y las demás validaciones estén pendientes.

Errores que se traducen: código que no coincide o vencido (Supabase devuelve `otp_expired` para ambos; la interfaz distingue por el tiempo transcurrido desde el envío), demasiados intentos (`over_request_rate_limit`, HTTP 429, y un límite local de 5 intentos por código), demasiados correos (`over_email_send_rate_limit`), correo ya registrado (`user_already_exists` / `email_exists`), contraseña débil, credenciales inválidas, correo sin confirmar, red caída y SMTP restringido (`email_address_not_authorized`). Si la confirmación está activada, Supabase no revela si un correo ya existía al registrarse: la pantalla del código lo explica sin confirmar ni negar la existencia de la cuenta.

### Pasos exactos en el panel de Supabase

1. **Authentication → Sign In / Providers → Email**: activar *Email*, activar **Confirm email**, poner **Email OTP Length = 6** y dejar **Email OTP Expiration = 3600** segundos (la interfaz dice «vence en 60 minutos»; si cambias el valor, actualiza `OTP_EXPIRY_SECONDS` en `src/features/auth/auth-flow.ts` y el texto de las plantillas). Activar *Secure email change*. En *Password requirements* poner **mínimo 10** y exigir letras y dígitos; activar la protección contra contraseñas filtradas si el plan lo permite.
2. **Authentication → URL Configuration**:
   - **Site URL**: `https://chulla-vida.vercel.app`
   - **Redirect URLs**: `https://chulla-vida.vercel.app/**`, `https://*-chulla-vida.vercel.app/**` (vistas previas de Vercel, si las usas) y `http://localhost:5173/**` para desarrollo. La aplicación pide volver a `/#cuenta`.
3. **Authentication → Email Templates**: para cada plantilla, pega el HTML completo del archivo indicado y el asunto sugerido:
   | Plantilla en Supabase | Archivo | Asunto sugerido |
   | --- | --- | --- |
   | Confirm signup | `supabase/templates/confirm-signup.html` | `Tu código para activar CHULLA VIDA: {{ .Token }}` |
   | Magic Link (se usa para «Entrar con un código») | `supabase/templates/magic-link.html` | `Tu código para entrar a CHULLA VIDA` |
   | Reset Password | `supabase/templates/recovery.html` | `Tu código para recuperar el acceso` |
   | Change Email Address | `supabase/templates/email-change.html` | `Confirma tu nuevo correo en CHULLA VIDA` |
   Las plantillas muestran `{{ .Token }}` grande y legible, el logo desde `https://chulla-vida.vercel.app/brand/logo-320.webp`, colores de marca y texto en español. **No incluyen enlace mágico a propósito**: algunos filtros de correo «visitan» los enlaces y gastan el código de un solo uso. Si alguna vez se añade `{{ .ConfirmationURL }}`, la interfaz no lo necesita.
4. **Authentication → Rate Limits**: revisar los límites de envío de correo y de verificación (los de fábrica son bajos con el SMTP de prueba de Supabase).
5. **Project Settings → Authentication → SMTP Settings**: configurar un proveedor con dominio propio autenticado (SPF, DKIM y DMARC). El SMTP de prueba de Supabase solo envía a direcciones del equipo y con límites muy bajos; la interfaz lo explica si responde `email_address_not_authorized`.
6. Prueba de humo: crear cuenta → recibir el correo con el código → escribirlo (o pegarlo) → sesión abierta; pedir reenvío tras 60 s y comprobar que el código anterior deja de valer; «Entrar con un código»; «Recuperar acceso» → código → contraseña nueva.

Nada de esto se ejecutó contra un proyecto alojado en esta entrega: el código está probado con `supabase-js` simulado (`tests/unit/auth-panel.test.tsx`, `tests/unit/auth-flow.test.tsx`).

## Esquema

- `profiles`: nombre e idioma del usuario; lectura y edición propia. Un trigger crea el perfil después del alta de Auth. Los metadatos de registro nunca asignan roles.
- `user_roles`: únicamente el rol `admin`, otorgado por el dueño de la base. El cliente no puede insertar ni actualizar roles.
- `organizations`, `merchant_verification_requests`, `verification_reviews`: solicitud de representación y revisión humana con autor, motivo y fecha. Solo las funciones SQL autorizadas cambian estados.
- `catalog_experiences`: `id` estable, JSON de procedencia y campos de consulta. La moneda y clase de precio se copian desde el JSON; los importes EUR siguen siendo EUR. El catálogo publicado se puede leer sin cuenta a través de las columnas públicas concedidas; `verified_by` y `organization_id` no se exponen al cliente público. Evita `select('*')` desde el navegador. Los clientes no pueden publicar ni habilitar compras.
- `experience_requests`: consultas del viajero con clave de idempotencia. Solo el viajero, la organización destinataria y administradores pueden leerlas. Una consulta de ficha sin operador queda para el equipo de la plataforma; no se envía un mensaje externo. **Todas las reservas comerciales son rechazadas por la función**, incluso si alguien marca una ficha como verificada. Faltan disponibilidad, contratos y pagos.
- `consent_events`: registro propio e inmutable por cliente; no se puede registrar consentimiento para otra persona.
- `privacy_requests`: solicitudes propias que nacen en estado `received`. Su tramitación administrativa está pendiente de procedimiento y panel específico; no se afirma que estén resueltas.
- `verification_documents`: referencias de evidencia privada, asociadas al solicitante y organización que corresponden.

## Recorrido de negocio y administrador

1. Con una sesión confirmada, completa «Representar un negocio o comunidad» y autoriza el tratamiento para esa revisión. La organización queda `in_review`, sin verificación automática.
2. Adjunta un PDF, JPG o PNG de hasta 5 MB. El bucket `merchant-verification` es privado. La ruta exige `organización/usuario/UUID.ext` y los permisos impiden escribir documentos en una organización ajena.
3. Para preparar un administrador de desarrollo, localiza su UUID real después de crear y confirmar su cuenta. Desde SQL Editor, con el propietario de la base, ejecuta lo siguiente sustituyendo el marcador:

```sql
insert into public.user_roles(user_id, role)
values ('UUID_REAL_DEL_ADMINISTRADOR', 'admin')
on conflict do nothing;
```

4. Entra con esa cuenta. «Mi cuenta» muestra las solicitudes accesibles al administrador. Prepara un enlace privado del documento y ábrelo; su vigencia es de 60 segundos. Nunca publiques esos enlaces ni los guardes en analítica.
5. Escribe el motivo y aprueba o rechaza la solicitud. Sin referencia oficial registrada, aprobar significa `identity_reviewed`. Una referencia oficial solo debe introducirse tras comprobarla realmente; la aplicación no consulta registros turísticos automáticamente. Una solicitud revisada no se puede aprobar dos veces.

Un documento subido cuyo registro falle permanece privado y requiere revisión de archivos huérfanos por el administrador. Los clientes no tienen permiso de sobrescritura ni borrado. Definir retención y destrucción documentada antes de recopilar documentos reales de terceros.

## Pruebas y límites

```sh
npm test -- supabase/tests src/lib/supabase.test.ts
```

Las pruebas ejecutan las migraciones sobre PostgreSQL embebido PGlite con los roles y las funciones mínimas de Auth/Storage. Comprueban lectura pública del catálogo, privacidad de perfiles/consultas, prohibición de autoasignar roles, rechazo de compras, idempotencia, revisión administrativa, consentimiento, moneda EUR y aislamiento de documentos. No sustituyen las pruebas de Supabase alojado, el correo real ni el funcionamiento completo de Storage y sus enlaces firmados.

Las funciones con `SECURITY DEFINER` usan un `search_path` vacío, nombres de tablas cualificados y validan `auth.uid()`. La clave de idempotencia se serializa por viajero dentro de la transacción. Las consultas no aceptan cambios de pago o estado desde el cliente. No hay gateway, webhook de pagos, sincronización del prototipo ni reservas reales habilitados.

Antes de abrir producción: revisar los borradores legales, responsable y SMTP; aplicar políticas a un proyecto de prueba; ensayar con dos usuarios y un administrador; verificar permisos cruzados en REST y Storage; definir retención y atención de derechos; configurar límites de abuso y monitorización. No existe una certificación de seguridad o cumplimiento por el mero hecho de pasar estas pruebas.
