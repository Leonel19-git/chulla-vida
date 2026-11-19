# Administración de negocios

## Acceso

La revisión tiene una aplicación independiente en `/equipo`; `/administracion` abre el mismo acceso por compatibilidad. El equipo entra con usuario y contraseña y una sesión separada de viajeros. El rol administrativo o de revisión se asigna desde el servidor, nunca desde un selector o metadatos editables. Ver `ACCESOS_EQUIPO.md` para la operativa vigente.

Las cuentas personales conservan su contraseña. Los accesos de equipo tienen claves individuales y cambio inicial obligatorio; no usan recuperación por correo personal ni aparecen en el perfil del viajero. No hay contraseñas compartidas incluidas en el código.

## Revisar una solicitud

1. Abre «Pendientes» y selecciona el negocio. Las solicitudes se consultan en páginas de veinte; «Necesita cambios», «Resueltas» y «Todas» permiten revisar otros estados.
2. Lee los datos y notas del solicitante. Cada documento se abre mediante un enlace privado de sesenta segundos, generado solo al solicitarlo. El enlace se retira de la pantalla al vencer y no se registra en analítica ni historial público.
3. Elige pedir correcciones, rechazar con motivo o aprobar identidad. Escribe una justificación y confirma expresamente la decisión.
4. Para aprobar, deben existir documentos y quedar registradas las comprobaciones de identidad, representación y evidencia. La comprobación de un registro oficial es una elección adicional que exige referencia; no aparece por subir archivos.
5. La base registra la decisión, su autor, el motivo y la lista de comprobaciones. El historial queda visible al equipo autorizado. Un revisor no puede aprobar o rechazar una organización propia.

La aprobación no activa automáticamente ventas, cobros, publicaciones ni permisos turísticos. La revisión es humana; no se han conectado detección de documentos falsos, escaneo antimalware ni validación automática ante registros oficiales. «Estudio de contenido» conserva el flujo editorial separado y sus restricciones de publicación.

## Correcciones y apelaciones

El negocio consulta las observaciones del equipo desde su cuenta. En `needs_changes` puede añadir documentos privados corregidos y enviarlos otra vez a revisión. «Enviar correcciones» actualiza el estado de la cuenta sin cerrarla. Un rechazo conserva la opción de apelación y los límites ya establecidos por el servidor.

Los documentos siguen aislados por organización y solicitante. El permiso para corregir no permite leer, sobrescribir ni eliminar archivos ajenos. No se envían correos automáticos de aprobación o rechazo: el estado y el motivo se consultan en la cuenta.

## Protección del flujo

- Antes de leer o decidir, el panel comprueba identidad confirmada y el rol administrativo. Las políticas de Supabase y las funciones de revisión siguen siendo la autoridad final.
- Al cambiar o cerrar sesión se desmonta la vista privada; no se conservan las evidencias en almacenamiento local.
- La migración `202611180001_admin_review.sql` añade una comprobación central antes de registrar revisiones. También cubre la función antigua, para impedir autoaprobaciones, atribuir la revisión a otra cuenta y aprobar sin documento o comprobaciones.
- La migración `202611180002_review_corrections.sql` permite adjuntar correcciones a solicitudes devueltas, con el mismo aislamiento por propietario y ruta privada.
- Los roles se asignan mediante una operación de confianza y quedan auditados. Nunca se aceptan desde formularios de registro o banderas del navegador.

## Verificación

Comprobación completa del 18/11/2026: compilación web y API, lint, 997 pruebas en 94 archivos y verificaciones de dominio, traducciones, catálogo y documentos pasan. El lint conserva advertencias, sin errores de compilación.

Pruebas de aplicación: invitados y cuentas sin permiso no consultan la bandeja; la aprobación propia y el cambio de identidad se rechazan; una decisión exige motivo y confirmación; cerrar sesión retira la evidencia visible.

Pruebas de base de datos con todas las migraciones: aprobación antigua sin comprobaciones bloqueada, documento obligatorio, revisión propia rechazada, decisión e historial guardados, correcciones propias permitidas y acceso cruzado rechazado.

Chromium de escritorio y WebKit con tamaño de iPhone: bandeja y decisión comprobadas con datos ficticios, sin escribir decisiones sobre negocios reales. La lectura pública de producción se prueba sin sesión y debe mostrar el requisito de acceso.

Antes de ampliar el equipo, establecer responsables, plazos de respuesta, criterios de evaluación, conservación y eliminación de documentos. Estos acuerdos operativos no se inventan mediante la interfaz.
