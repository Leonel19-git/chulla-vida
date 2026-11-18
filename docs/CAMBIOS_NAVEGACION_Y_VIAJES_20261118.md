# Navegación y viajes · 18 de noviembre de 2026

## Cambios

- Comunidad wambra se mueve del menú a «ECUADOR A TU RITMO», con una franja compacta visible en celular. Se retira el asistente de voz de la aplicación y sus accesos, según la última instrucción del propietario. La URL histórica `/mijin` abre el planificador.
- Menú: Favoritos, Próximos viajes y Billetera y reservas. Se eliminan Mis avisos y los botones para repetir la intro. La primera intro se conserva. La sección «Tu próximo finde empieza aquí» ya no se monta en el inicio.
- Billetera y reservas comparten acceso, con pestañas. Próximos viajes filtra fechas y estados, conservando solicitudes pendientes sin fecha. Los modos negocio/viajero vuelven al menú sin conceder permisos sobre negocios ajenos.
- Chulla Flex muestra ideas desde el inicio. «Proponer paradas» añade hasta tres destinos compatibles, con un máximo de cinco, respetando presupuesto, duración, región y políticas de mascotas conocidas. Agrupa por provincia; no calcula carreteras ni garantiza tiempos de traslado.
- La compra de ruta completa incluye todas las paradas con precio; las de cotización quedan identificadas aparte. No se ofrece la compra individual de una parada dentro de una ruta múltiple. Se comprueba la cantidad de personas para tarifas de grupo.
- Idioma de interfaz unificado en el selector y textos nuevos traducidos. Personas, fechas, días, paradas y razones del planificador se adaptan al idioma. Nombres y textos editoriales de catálogo conservan su idioma de origen; Kichwa sigue pendiente de revisión comunitaria.
- Pasaporte ajustado al espacio de móvil y escritorio, con bandera ecuatoriana y escudo. Fuente del SVG en `public/brand/CREDITS.md`.
- BBS se explica como «Bueno, bonito y seguro», una guía para comparar y comprobar condiciones. No se presenta como calificación real ni garantía de seguridad.
- Perfil: «Eliminar mi cuenta» registra una solicitud privada de supresión en `privacy_requests`, con confirmación escrita y comprobación de identidad de sesión. Devuelve referencia. La cuenta sigue activa hasta revisión; no borra automáticamente comprobantes, reservas ni Supabase Auth.

## Límites de pagos y privacidad

El checkout de ruta múltiple continúa siendo de demostración. El total y los registros incluyen todas las paradas con precio, sin acreditar pagos ni ingresos reales. El checkout conectado se restringe a una oferta; no simula un cobro a varios negocios. Activar pagos reales requiere configurar el proveedor y sus ofertas comerciales. Se mantienen las comprobaciones del servidor y las políticas de acceso de Supabase.

La solicitud de eliminación no envía correos automáticamente ni acredita una eliminación ya ejecutada. El equipo debe revisar y atender la solicitud desde su procedimiento privado, considerando las obligaciones aplicables. No se enviaron solicitudes ni pagos reales durante estas pruebas.

## Verificación

- Revisión completa: compilación de web y API, lint y 989 pruebas en 92 archivos pasan; comprobaciones de dominio, membresía, billetera, traducciones, catálogo y manifiesto legal pasan. El lint mantiene advertencias previas; no hay errores de compilación.
- Tras los últimos ajustes de textos, menú móvil y fechas: 36 pruebas específicas y una nueva compilación pasan; las comprobaciones de dominio y traducciones vuelven a pasar.
- Regresión específica: dos paradas compradas juntas conservan el mismo lote y el total completo; propuestas respetan restricciones; solicitud privada bloqueada si cambia la identidad de sesión.
- Chromium de escritorio y WebKit con tamaños de iPhone 13 y SE: seis sugerencias visibles y tres paradas propuestas en el caso de prueba, pasaporte dentro de pantalla y sin errores de ejecución. Son navegadores simulados, no pruebas en teléfonos físicos.
- Las sesiones de navegador de prueba interceptan Supabase con un usuario ficticio; no escriben en producción ni prueban que una operación comercial esté habilitada.
- La revisión visual solo indicó recomendaciones sobre colores heredados; no detectó bloqueos nuevos en los archivos revisados.

Evidencia de trabajo privada en `.impeccable/review/`. No se publica con la aplicación.
