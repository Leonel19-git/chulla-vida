# Registro y pagos: revisión del 16 de noviembre de 2026

## Corrección de transferencias

La función `start_transfer_payment` aceptaba el importe que enviaba el navegador. Una cuenta confirmada podía enviar USD 0,01 para una experiencia cuyo precio era USD 30 por persona y tres participantes. Además admitía fichas meramente propuestas y reutilizaba una clave de intento con datos distintos.

La migración `202611160102_transfer_price_security.sql` exige una oferta publicada y habilitada, con precio verificado, operador y organización verificados y una tarifa fija en USD. Compara el importe con el cálculo de la base: precio por persona multiplicado por adultos y niños. Las variantes y tarifas por grupo quedan bloqueadas hasta disponer de cotización de servidor. Reutilizar una clave solo devuelve el intento previo si coinciden experiencia, fechas, participantes e importe. No cambia precios ni aprueba pagos existentes.

Las pruebas invocan las funciones SQL directamente con el rol autenticado, sin pasar por la interfaz. Verifican rechazo de importe USD 0,01 y USD 89,99 ante USD 90, rechazo de una oferta propuesta, rechazo de idempotencia alterada y conservación de la misma transferencia ante un reintento idéntico. Se conservan las pruebas de aislamiento entre viajeros, organizaciones y comprobantes privados, y la prohibición de que un viajero se marque pagado.

## Controles de tarjeta existentes comprobados

Las rutas de pagos verifican el token mediante `auth.getUser`, exigen correo confirmado y restringen la consulta al pagador. La preparación toma el importe de la reserva en base de datos, no de un precio del cliente. La vuelta del navegador no aprueba el pago: el servidor confirma referencia, moneda e importe con PayPhone. Sin las credenciales y habilitaciones explícitas, la preparación rechaza el cobro. La desactivación de nuevos cobros permite conciliar intentos previos sin repetir un cargo.

Estos controles concuerdan con [la validación de usuario de Supabase](https://supabase.com/docs/reference/javascript/auth-getuser) y [las políticas de acceso por fila](https://supabase.com/docs/guides/database/postgres/row-level-security). La clave pública del navegador no es un secreto ni sustituye a esas políticas.

## Límite de esta revisión

Las pruebas ejecutan las migraciones reales en PGlite y las API con dependencias simuladas. El proceso principal aplicó y registró únicamente esta migración en el proyecto alojado de CHULLA VIDA, conservando un respaldo de la función anterior. La consulta posterior confirmó cálculo de precio y requisitos de oferta e idempotencia, ejecución anónima prohibida y permiso de ejecución autenticado. Esta tarea no configura la pasarela ni hace cobros reales. Las membresías del prototipo heredado requieren un registro de suscripción y validación de servidor antes de activar acceso comercial. El almacenamiento del navegador no sirve como prueba de identidad ni de pago.
