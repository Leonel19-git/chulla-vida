# Cuentas y permisos de CHULLA VIDA 3.0

**Actualización de reservas y tarjeta:** el directorio `supabase/migrations/` contiene ahora el esquema normalizado completo y migraciones posteriores para checkout y revisión de reembolsos. Aplica **todos los archivos, en orden de nombre**, en un proyecto de pruebas nuevo; no te limites a las dos migraciones históricas mencionadas más abajo. Las nuevas pruebas SQL usan ese conjunto completo. No se aplicaron cambios a una base alojada en esta sesión.

La base conserva una vinculación de entorno de pagos; las reservas nuevas la heredan y el servidor exige coincidencia con su configuración. Un proyecto de pruebas debe marcarse explícitamente como `sandbox` desde administración, separado de producción. Las variables `PAYMENTS_*` y PayPhone son únicamente de servidor. Sigue [PAGOS_ECUADOR.md](PAGOS_ECUADOR.md) antes de habilitar cualquier cobro.

Estado: **preparado y probado localmente; no conectado a un proyecto Supabase real**. La configuración pública vacía desactiva las cuentas y consultas conectadas. El selector de perfiles del prototipo sigue siendo una demostración del navegador y no concede permisos en Supabase.

## Configuración

1. Crea un proyecto Supabase de desarrollo. Conserva las claves de servidor fuera del repositorio.
2. Copia `.env.example` a `.env.local`. Completa `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` con la URL y clave **publicable** del proyecto. Alternativamente se admite la clave pública `anon` en `VITE_SUPABASE_ANON_KEY`. Nunca introduzcas `service_role` ni `sb_secret_*` en una variable `VITE_*`.
3. En Authentication, habilita correo y contraseña y la confirmación de correo. Configura la URL del sitio y las URLs de redirección de desarrollo/staging/producción. El formulario vuelve a la ruta del sitio con `#cuenta`.
4. Configura SMTP para las entregas reales y comprueba confirmación, reenvío desde Supabase y recuperación. El repositorio no contiene credenciales SMTP ni un envío de prueba validado.
5. Instala la CLI oficial de Supabase en tu entorno de trabajo y vincula este directorio con el proyecto de desarrollo. Aplica las dos migraciones en orden mediante `supabase db push`, después de revisar el proyecto seleccionado. Para desarrollo local con la CLI y Docker, usa `supabase start` y `supabase db reset`; esta última orden reinicia la base local y carga `supabase/seed.sql`.
6. Para una base remota, ejecuta el contenido de `supabase/seed.sql` en el SQL Editor del proyecto de desarrollo después de las migraciones. La semilla del catálogo es idempotente. Las migraciones se aplican una vez y se controlan mediante el historial de Supabase.
7. Reinicia Vite (`npm run dev`). Abre «Mi cuenta», crea una cuenta de prueba, confirma el correo y prueba el inicio y cierre de sesión.

No se ha ejecutado ninguna de estas operaciones contra infraestructura alojada durante esta entrega. Sin estas variables la interfaz explica lo pendiente y permite seguir explorando públicamente.

El alta registra en los metadatos de Auth únicamente `draft_terms_acknowledged`: reconocimiento declarado por el usuario de los borradores visibles. Este dato es editable por el propio usuario y **no sirve como aceptación probatoria de términos aprobados, autorización para marketing ni habilitación comercial**. Antes de producción hace falta un registro de aceptación del documento aprobado, con su versión/hash, fecha y finalidad, controlado por servidor. El proyecto mantiene bloqueadas las compras mientras esto y las demás validaciones estén pendientes.

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
