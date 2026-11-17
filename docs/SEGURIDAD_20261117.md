# Autorización, pagos y panel de negocio · 17 de noviembre de 2026

## Alcance y estado

Revisión de `api/**`, servidor de pagos, transferencias, CMS y panel de negocio. Se conservaron las firmas públicas y los flujos de demostración sin dinero. No se modificaron Auth, App, BuyButton, Checkout ni package.json en este frente. No se hicieron commits, resets, despliegues ni operaciones remotas desde este trabajo.

La migración de este frente es `supabase/migrations/202611170202_security_business.sql`. El responsable del cierre informó en el chat que aplicó correctamente las migraciones `202611170201` y `202611170202` después de sus 48 pruebas. Esa aplicación remota es información del responsable; las verificaciones descritas aquí se ejecutaron en una base local o con servicios simulados. No acreditan el estado del despliegue ni de sus variables.

## Fallos reproducidos y correcciones

La primera ejecución de `supabase/tests/security-business.test.ts`, antes de añadir la migración, tuvo cinco pruebas fallidas y cuatro aprobadas. Evidencia local: `.impeccable/review/security-business-before.json`.

| Hallazgo reproducido | Corrección | Prueba de regresión |
| --- | --- | --- |
| Un manager podía modificar o eliminar el destino bancario. | Las políticas de INSERT, UPDATE y DELETE requieren `organizations.owner_id = auth.uid()`. El manager conserva lectura y revisión de comprobantes. El cliente comprueba propiedad antes de guardar. | Manager rechazado; dueño conserva escritura y sello `updated_by`. |
| Un manager podía registrar una cuenta nueva. | Misma restricción de propiedad para INSERT; interfaz de lectura cuando falta propiedad confirmada. | Intento de insertar en otra organización propia del dueño rechazado. |
| Los RPC de solicitudes admitían usuarios con correo sin confirmar. | `submit_merchant_application` y `submit_experience_request` comprueban correo en el servidor y validan entradas; identidad y organización se derivan del servidor. | Invocación directa sin correo confirmado rechazada. |
| El comprobante admitía tamaño y MIME declarados distintos de los almacenados. | `submit_transfer_receipt` contrasta los metadatos existentes de Storage y limita la ruta a la transferencia del viajero. La API de cliente también valida tamaño, MIME y firma del archivo. | PDF de 200 bytes declarado como JPEG de 1 byte rechazado; envío correcto aceptado. |
| Una solicitud con `needs_changes` no admitía documentos corregidos. | Políticas de subida y asociación permiten `submitted` y `needs_changes`; no abren documentos de solicitudes aprobadas. | Corrección privada y reenvío por el solicitante; tercero rechazado. |

## Controles que ya existían y se mantuvieron

- Anónimo no lee roles, solicitudes, transferencias ni cuentas bancarias, ni ejecuta sus RPC privados.
- La preferencia de modo negocio y los metadatos de usuario no asignan roles del servidor. Un usuario no puede insertarse como administrador, elevarse a owner ni autoverificar su organización.
- Una solicitud toma al viajero de `auth.uid()` y al negocio del catálogo del servidor. Otro usuario no la lee ni sustituye su propietario.
- Transferencias cotejan la cantidad con una oferta fija verificada del servidor; el navegador no establece la tarifa. Se conserva la comprobación de idempotencia, fechas y participantes.
- Un comprobante pertenece al viajero y al negocio autorizado. El bucket `payment-receipts` es privado; el cliente usa enlaces firmados de 60 segundos, sin URL pública. Los miembros activos conservan el acceso existente; decidir requiere ser responsable autorizado y no ser el propio pagador.
- Un comprobante enviado no confirma dinero recibido. La decisión humana queda auditada. El panel recuerda comprobar el ingreso en el banco.

## Cobro live: comprobaciones adicionales

Las pruebas HTTP ejecutan `prepare` con configuración live simulada: sin bearer válido o sin correo confirmado responde 401; no crean checkout ni llaman al proveedor. La reserva se reclama con el pagador obtenido mediante `auth.getUser`, no desde el cuerpo. Una reserva ajena responde 404 y no expone el diagnóstico interno. Los campos cliente `amount`, `payerId` y `role` se rechazan.

En PostgreSQL local, los roles anónimo y autenticado no pueden ejecutar `claim_payphone_checkout`, reservado al servicio. Incluso con el rol de servicio, la función rechaza pagador ajeno, correo sin confirmar y configuración comercial incompleta; no crea un intento. Los tests existentes de pagos también verifican términos, entorno, importes canónicos, confirmación con el proveedor e idempotencia.

El retorno público de PayPhone permanece sin sesión porque identifica un intento que se confirma con el proveedor. La URL de retorno por sí sola no acredita un pago. Desactivar nuevos cobros no impide revisar o cerrar uno existente. La demo no se convierte en dinero real. El guard de acceso de BuyButton y sus pruebas fueron gestionados por el otro frente; no se editó Checkout aquí.

## Límites HTTP y errores

`api/_request.ts` valida antes de autorización, base de datos o proveedor: cuerpo de hasta 16 KiB medido en UTF-8 y por longitud declarada, consulta de hasta 8 KiB y 16 claves, autorización de hasta 10.000 caracteres y tipo JSON cuando se declara en POST. Tolera mocks sin headers; esto no concede sesión. Se conservan las comprobaciones estrictas del cuerpo de cada endpoint.

Las escrituras rechazan `Origin` ajeno o inválido y `Sec-Fetch-Site: cross-site`. Usan el origen configurado en `PAYMENTS_APP_URL`; sin ese valor solo se admite el mismo host de la petición con HTTPS o localhost. Clientes sin Origin siguen necesitando bearer y autorización del servidor. Los GET de retorno del proveedor y las lecturas conservan el acceso necesario; no se añaden permisos CORS.

Las respuestas de pagos llevan `no-store`, `no-referrer` y `nosniff`. El asistente remoto exige correo confirmado y conserva cuotas por instancia, depurando registros de días anteriores al alcanzar el límite de usuarios. Clima rechaza coordenadas, días y parámetros múltiples inválidos antes del proveedor.

Las excepciones de transporte de transferencias y del editor conectado se muestran como mensajes de la aplicación; no se propagan diagnósticos, enlaces firmados ni credenciales a la interfaz. Se comprobaron errores sintéticos, sin imprimir valores de secretos reales ni añadir logs con payloads privados.

## Panel de negocio

- Siguiente paso según registro, cambios pedidos, comprobantes o experiencias. La revisión humana no se presenta como aprobación automática ni activa ventas.
- Los pagos por revisar cuentan `transfer_payments.status = receipt_submitted`; una reserva sin pagar no cuenta como comprobante recibido.
- Cobros filtrados por organización del beneficiario, también al componer el resultado. No se suman USD y EUR en una misma cifra; consultas fallidas muestran dato desconocido. Una consulta parcial de solicitudes no se convierte en un total inventado.
- Editor conectado de borradores del negocio mediante `experiences`, con lista de campos permitidos, organización, fecha de actualización y condición de borrador sin ventas. RLS y `experiences_guard` siguen decidiendo permisos. No modifica precios, verificación ni activación de ventas; una ficha publicada se muestra para consulta.
- Correcciones y apelaciones usan `resubmit_verification_request` y `appeal_verification_request`, ya existentes. Se conserva la subida privada proporcionada por el panel de cuenta.
- Banco editable solo por dueño; un manager recibe un resumen enmascarado de lectura. No se inventan bancos ni integraciones.
- Estilos alineados a los tokens del álbum y textos reducidos. Marcadores del recorrido: `host`, `host-experiences` y `host-requests`.

## Validación ejecutada

Regresión local: **204 pruebas aprobadas, cero fallidas y cero omitidas**, incluidas todas las pruebas de Supabase y las pruebas seleccionadas de pagos, asistente, roles, CMS y transferencias. El informe JSON es `.impeccable/review/security-business-regression.json`.

```text
npx vitest run supabase/tests tests/unit/security-business.test.ts tests/unit/assistant.test.ts tests/unit/roles.test.tsx tests/unit/host-transfers.test.tsx tests/unit/editorial-ui.test.tsx tests/unit/payments-api.test.ts tests/unit/refund-request-api.test.ts tests/unit/transfer-payment.test.tsx tests/unit/payments-client.test.ts tests/unit/payments-ui.test.tsx tests/unit/weather.test.ts --maxWorkers=2 --reporter=json --outputFile=.impeccable/review/security-business-regression.json
npx tsc -p tsconfig.app.json --noEmit --incremental false
npx tsc -p tsconfig.api.json --noEmit
```

Ambas comprobaciones de tipos pasaron. El análisis estático de las rutas revisadas pasó sin errores; señaló avisos sobre exportaciones compartidas que se mantienen para preservar la API. Los tests `roles.test.tsx` se actualizaron con la fuente real de comprobantes y la relación de beneficiarios, sin eliminar expectativas de negocio. El mock de proveedor apagado del asistente ahora declara una petición completa, y hay cobertura adicional de ausencia de headers sin autorización.

La inspección de navegador de escritorio/móvil no pudo completarse: el navegador local recibió bloqueo de acceso y después timeout al abrir el servidor de prueba. No se presenta como revisión visual aprobada. La interacción del panel, el editor, la lectura bancaria y el reenvío de correcciones sí tienen cobertura de componentes.

## Límites y pendientes

No es una declaración de seguridad absoluta. PGlite prueba las migraciones y políticas sobre tablas de Storage simuladas, sin ejercer el servicio Storage real, firmas JWT remotas ni el proveedor de cobros.

Los objetos históricos con `metadata IS NULL` conservan compatibilidad: no pueden contrastarse tamaño y MIME almacenados. La firma binaria del cliente no es un análisis de malware ni prueba de una transferencia bancaria; la confirmación del ingreso sigue siendo humana. Los enlaces firmados son credenciales temporales: pueden seguir abriendo el documento durante sus 60 segundos aunque cambie la membresía.

Los límites HTTP de aplicación se verifican después del parseo de la plataforma; no sustituyen el límite de entrada del alojamiento. Las cuotas del asistente son por instancia, sin protección distribuida. La disponibilidad real de pagos depende de las variables del despliegue, del proveedor y de los requisitos comerciales del servidor, que no se activaron ni inspeccionaron remotamente aquí.

Antes de dar por validado el entorno publicado quedan las comprobaciones remotas del responsable: políticas y acceso de Storage con cuentas de prueba, permisos bancarios de dueño/manager, sesión/correo/propiedad en HTTP, configuración comercial y prueba autorizada del proveedor. Despliegue y Supabase remoto quedan a cargo del responsable del cierre.

## Comprobaciones de cierre sobre servicios reales

El responsable confirmó el historial remoto de las migraciones 202611170201 y 202611170202. Con el acceso público, las lecturas de `user_roles`, `profiles`, `organization_bank_accounts`, `verification_documents`, `transfer_payments` y `signup_identity` devolvieron 401/42501, sin exponer filas. El sitio publicado entregó CSP y rechazó una escritura de pagos con origen ajeno mediante 403. Estas comprobaciones no sustituyen probar permisos con sesiones reales de dueño, manager y viajero, ni validan un proveedor de cobro aún apagado.
