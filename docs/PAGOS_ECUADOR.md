# Tarjeta: checkout alojado de PayPhone

Actualizado: 13 de noviembre de 2026.

La integración está **implementada y probada con respuestas simuladas**, deshabilitada por defecto. No se ha conectado una cuenta PayPhone, ejecutado un cobro ni validado un pago contra el proveedor. Las 51 fichas referenciales conservan la compra bloqueada. El checkout local anterior sigue siendo una demostración separada: `pago_demo` nunca rellena `pagado_en` ni alimenta los pagos conectados.

## Recorrido conectado

1. Una cuenta con correo confirmado dispone de una reserva propia en `awaiting_payment` o `payment_failed`, con cupo futuro y oferta verificada. Un presupuesto o ficha de origen no equivale a una reserva cobrable.
2. El servidor reclama un intento con bloqueo de fila e idempotencia persistente. Carga el importe y moneda de la reserva, nunca del cuerpo del navegador. Se admite USD; EUR no se convierte silenciosamente.
3. El servidor prepara el Botón PayPhone y guarda su URL antes de entregarla al cliente. El formulario alojado se abre mediante navegación normal. PAN, CVV, documento y datos bancarios no pasan por formularios ni tablas de CHULLA VIDA.
4. PayPhone vuelve a `/api/payments/return?id=…&clientTransactionId=…`. Este endpoint verifica inmediatamente con la API autenticada del proveedor, sin esperar a que el viajero vuelva a iniciar sesión.
5. La confirmación debe coincidir exactamente en identificador PayPhone, referencia del comercio, centavos y USD. Una transacción aprobada produce pago y comprobante en una transacción SQL; un rechazo no acredita saldo ni marca la reserva como pagada.
6. Se devuelve al usuario a `/?payment=REFERENCIA`, sin correo, documento ni otros datos del proveedor. El estado solo se consulta con autenticación del propietario.

La confirmación utiliza **API del proveedor**, no una firma webhook inventada. `server_verified_at` y `verification_source='provider_api'` conservan esa procedencia. `verified_via_webhook_at` queda vacío. Los eventos de API llevan `signature_valid=false` porque no son notificaciones firmadas.

## Configuración pendiente

Aplicar todas las migraciones en orden, incluidas `015` (checkout), `016` (revisión de reembolso) y `017` (aceptación formal de términos), en un Supabase de pruebas. El backend usa `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`; el navegador conserva exclusivamente su configuración publicable. Ninguna credencial de pagos lleva prefijo `VITE_`.

| Variable de servidor | Uso |
| --- | --- |
| `PAYMENTS_ENABLED` | `false` por defecto; habilita nuevos intentos con configuración completa |
| `PAYMENTS_ENVIRONMENT` | `sandbox` o `live`; etiqueta los registros |
| `PAYMENTS_APP_URL` | Origen autorizado; HTTPS salvo localhost/127.0.0.1 |
| `PAYPHONE_TOKEN`, `PAYPHONE_STORE_ID` | Credenciales de la aplicación WEB del comercio |
| `PAYPHONE_SANDBOX_CONFIRMED` | Solo `true` tras comprobar el modo de pruebas en PayPhone Developer |
| `PAYMENTS_LIVE_ENABLED` | Permiso adicional explícito para `live`; no sustituye los controles SQL |

**La etiqueta de entorno no cambia la cuenta PayPhone:** el modo de pruebas debe configurarse y comprobarse también en el proveedor. No usar un token de producción para probar. Registrar el dominio y URL de respuesta exactos en la aplicación WEB del comercio.

En `live`, SQL exige además todos los indicadores de `commercial_readiness`, operador y oferta actualmente verificados, términos publicados aceptados con hash coincidente, política de cancelación y distribución fiscal revisada en `booking_payment_breakdowns`. Los componentes fiscales deben sumar exactamente el total. El navegador no puede escribir estos controles. En sandbox se permite una distribución ficticia sin impuestos para probar el protocolo; no representa el tratamiento tributario comercial.

El checkout live muestra el texto público aprobado y vigente desde la base, con versión y fecha, y exige reconocimiento explícito y aceptación confirmada por el servidor antes de abrir PayPhone. Si los términos cambian, faltan, están en borrador o no se pueden consultar, el botón de cobro sigue bloqueado. Una aceptación formal se conserva aparte de un reconocimiento anterior del mismo texto en borrador, sin sobrescribir la evidencia histórica.

## Separar pruebas y producción

La base nace con `payment_environment_binding.environment='live'`. Las reservas nuevas, también las creadas por `request_booking`, derivan su `payment_environment` de esa configuración privada. Cada reserva conserva su entorno de forma inmutable. El checkout exige coincidencia entre entorno de aplicación, reserva y base; cambiar únicamente una variable del servidor no vuelve cobrable una reserva del otro entorno.

Para el **proyecto Supabase aislado de pruebas**, el responsable de la base ejecuta una vez antes de crear las reservas de prueba:

```sql
update public.payment_environment_binding
set environment = 'sandbox', note = 'Proyecto aislado de pruebas PayPhone'
where id;
```

Mantener `live` en el proyecto de producción. Los roles del navegador no pueden leer ni modificar la tabla de configuración ni escribir el entorno de una reserva. No copiar reservas, recibos ni pagos sandbox a una base comercial. Una captura sandbox puede cerrar una reserva sandbox para comprobar todo el recorrido; sigue siendo un resultado de pruebas y su pago/estado de checkout conservan `environment='sandbox'`.

## API y desarrollo local

`npm run dev` incluye ahora un adaptador local para las seis rutas de pagos y revisión. Carga únicamente las variables de servidor permitidas, limita el cuerpo JSON a 4 KB y ejecuta los mismos handlers que Vercel, sin inyectar secretos como variables del frontend. Reiniciar Vite tras cambiar `.env.local`. El adaptador no conecta automáticamente las cuentas externas ni añade clima/IA remotos.

Todos los endpoints responden con `Cache-Control: no-store`. Los autenticados reciben `Authorization: Bearer TOKEN_DE_SESIÓN`.

La reescritura SPA de `vercel.json` excluye `/api/` para conservar las funciones y el callback de pago. La sintaxis se contrastó con la [configuración oficial de Vercel](https://vercel.com/docs/project-configuration/vercel-json).

| Endpoint | Entrada | Salida |
| --- | --- | --- |
| `GET /api/payments/config` | Pública | `{enabled,provider:'payphone',environment,reason?}` |
| `POST /api/payments/prepare` | Autenticada; `{bookingId:UUID,idempotencyKey:UUID}`; rechaza campos adicionales | `{checkoutUrl,clientTransactionId,environment}` |
| `GET /api/payments/return` | Retorno público: `id` numérico y `clientTransactionId` UUID | Verificación y redirección 303 a `/?payment=REFERENCIA` |
| `GET /api/payments/status?reference=UUID` | Autenticada, propietario | Estado descrito abajo |
| `POST /api/payments/reconcile` | Autenticada, propietario; `{reference:UUID}` | Verifica el mismo intento y devuelve el estado |
| `GET /api/payments/refund-request?bookingId=UUID` | Autenticada, propietario | `{request:null}` o última solicitud propia |
| `POST /api/payments/refund-request` | Autenticada; `{bookingId,reason,idempotencyKey}` | Solicitud de revisión persistida; no mueve dinero |

El estado contiene `{reference,status,amount,currency,environment,bookingId,provider,requiresReview,bookingStatus}`. `amount` es un número decimal para mostrar, no una entrada para cobro. Estados usados: `pending`, `captured`, `cancelled`, `review_required`. El contrato reserva `failed` para fallos definitivos futuros; una interrupción de red no se presenta como rechazo bancario.

La referencia/idempotencia se conserva al reintentar. Un segundo clic o una nueva clave para la misma reserva recuperan el intento activo, sin crear otro en PayPhone. Si Prepare queda incierto o el enlace caduca, la respuesta conserva la referencia para revisión y no vuelve a cobrar automáticamente. El retorno retiene un ID candidato privado para reconciliar una caída; nunca acredita un pago sin verificación completa del proveedor.

## Casos límite y alcance

«Revisión y reembolso» permite al propietario consultar o registrar el motivo de una revisión de un pago capturado. El servidor obtiene importe, moneda y entorno de la reserva; bloquea solicitudes cruzadas y duplicadas. Se conserva el estado `requested`; no se cambia el pago a reembolsado ni se llama al proveedor para devolver dinero. La solicitud permanece consultable al volver a abrir el panel. Su operación posterior corresponde al equipo responsable y al proveedor.

- Las confirmaciones repetidas no duplican pago ni recibo. Una captura no retrocede por un callback de cancelación.
- El recibo guardado es un comprobante de pago, **no una factura fiscal**. No almacena la respuesta completa del proveedor.
- Si llega dinero después de cancelar/vencer la reserva, cerrar el cupo o suspender la oferta, se registra la captura y `requires_review`; la reserva no se reactiva ni recupera cupos automáticamente.
- Deshabilitar nuevos pagos no impide terminar intentos en curso mientras sus credenciales y entorno sigan disponibles.
- Un intento incierto o vencido requiere conciliación y no genera automáticamente otro enlace. Una cancelación confirmada permite un intento nuevo con otra clave.
- No hay suscripciones recurrentes, liquidaciones 90%/10%, retiros reales ni reembolsos automáticos conectados. Las tablas y porcentajes del prototipo no acreditan transferencias. La devolución se tramita con el proveedor y soporte hasta implementar y validar su operación.
- La notificación externa de PayPhone requiere habilitación del proveedor. Esta integración no afirma tenerla ni confía en JSON público para acreditar dinero.

## Verificación y fuentes

`npm test -- tests/unit/payments-api.test.ts supabase/tests/payments.test.ts` ejecuta 25 pruebas con todas las migraciones en PostgreSQL PGlite y dobles del proveedor. Cubren permisos, propiedad, idempotencia, recuperación de intentos inciertos, moneda, vencimiento, términos, impuestos, coincidencia de pago, falsificación de callbacks, repetición, cancelación, captura tardía y separación de entornos. El tipado de API y lint de pagos también pasan. No sustituyen un cobro sandbox alojado ni ensayos con dos cuentas reales.

El adaptador local se comprobó mediante HTTP: configuración deshabilitada 200, método no permitido 405 y JSON inválido 400. No se enviaron solicitudes a PayPhone durante estas comprobaciones.

Protocolo contrastado con fuentes oficiales: [Botón PayPhone](https://docs.payphone.app/boton-de-pago) y [notificación externa](https://docs.payphone.app/notificacion-externa). Se usan `api/button/Prepare` y `api/button/V2/Confirm`. PayPhone documenta reversión automática si no se confirma en cinco minutos y limita los reversos ordinarios al día de la transacción. No se promete una devolución fuera de ese alcance.
