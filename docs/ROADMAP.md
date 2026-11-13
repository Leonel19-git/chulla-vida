# Estado y continuación

Actualizado: 13 de noviembre de 2026.

| Área | Estado | Límite / siguiente paso |
| --- | --- | --- |
| 51 fichas, búsqueda, filtros, detalle y fuentes | Funciona localmente | Validación con operadores pendiente; compra referencial bloqueada |
| Guardados y biblioteca de fichas | Funciona localmente | Depende del almacenamiento del dispositivo |
| PWA pública | Implementada, prueba de navegador pendiente | Probar build de producción, recarga sin red y borrado de datos |
| Cultura Viva | Contenido orientativo | Confirmar ediciones con organizadores |
| MIJIN texto | Funciona en modo catálogo/FAQ | Sin generación remota conectada |
| Voz y clima | Implementados, pruebas con mocks | Navegador/proveedor/red y revisión de uso requeridos; no se realizó consulta meteorológica real en esta sesión |
| Presupuesto, Flex, mascotas | Motores con pruebas | No hay feed actual de cierres ni políticas pet verificadas |
| Supabase, Auth y revisión de negocio | Implementado y probado localmente | Aplicar migraciones y probar cuentas/SMTP/Storage alojados |
| Solicitudes de información | Requiere Supabase configurado | No son reservas confirmadas |
| Pasaporte, billetera y pagos anteriores | Demo local; libro del pasaporte implementado | Los sellos de prueba, billetera y retiros siguen siendo simulados |
| Privacidad y embebidos | Funciona localmente | Revisar documentos y operación de derechos con responsable real |
| Reservas y pago con tarjeta | PayPhone alojado, API, SQL, interfaz y recuperación implementados | Conectar credenciales, aplicar migraciones y probar sandbox alojado; desactivado por defecto |
| Revisión de reembolsos | Solicitud persistida e idempotente implementada | La solicitud no devuelve dinero; operación del proveedor pendiente |
| Suscripciones y liquidaciones reales | Pendiente | Proveedor y operación comercial; los planes y porcentajes actuales siguen siendo demo |
| CMS y avisos locales | Borradores, exportación y preferencias implementados | Publicación comercial, multimedia y avisos externos requieren proveedores y revisión |
| Producción | Publicada y verificada por HTTP el 13 de noviembre | https://chulla-vida.vercel.app/ · faltan revisión visual y micrófono real; servicios externos sin configuración |

## Próxima etapa

1. Aplicar las migraciones en un proyecto Supabase de pruebas siguiendo `SUPABASE_SETUP.md`; validar identidades separadas y roles con cuentas reales.
2. Revisar el recorrido en escritorio/móvil, permisos de voz y clima, almacenamiento bloqueado y offline real.
3. Completar las revisiones comerciales antes de habilitar ofertas verificadas. Los 51 registros de origen siguen bloqueados para compra.
4. Configurar la cuenta PayPhone de pruebas, vincular una base aislada a sandbox y recorrer reserva, confirmación, rechazo, recuperación y revisión de devolución con dos cuentas reales. Seguir `PAGOS_ECUADOR.md`.
5. Validar SMTP, publicación de contenidos, multimedia autorizada y push opt-in; definir operación de reembolsos, suscripciones y liquidaciones antes de habilitarlas.

No se necesita subir claves para continuar desarrollando. Las claves privadas solo se añaden al entorno de servidor; los archivos `.env` permanecen ignorados.
