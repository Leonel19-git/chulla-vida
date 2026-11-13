# Auditoría CHULLA VIDA 3.0

Revisión del repositorio: 12 de noviembre de 2026. Continuación de la fase `cv3-fundacion-dominio` iniciada en Claude Code. Stack real: React 19, TypeScript, Vite 8; no es Next.js. Se preservó el prototipo anterior, aislado como demostración.

## P0 — datos, permisos y afirmaciones

| Hallazgo y evidencia | Resultado |
| --- | --- |
| `src/lib/storage.ts`: una llegada `validado_en_sitio` con `pago_demo` invalidaba la colección completa al recargar | Corregido; prueba de persistencia con una reserva pendiente y otra llegada. Los pagos demo siguen sin poder convertirse en pagos reales. |
| El catálogo anterior incluía negocios, valoraciones y verificaciones ficticias | El catálogo público principal ahora usa 33 fichas documentales no reservables. El anterior tiene entrada explícita de demostración y conserva el almacenamiento existente. |
| No había autorización de servidor | Migraciones Supabase con RLS, roles no autoasignables, RPC de solicitudes idempotentes y documentos privados. Probadas localmente con PostgreSQL/PGlite; aplicación alojada pendiente. |
| Los borradores legales tenían campos pendientes | Nueve textos íntegros con hash/versión/fecha y bloqueo comercial. Reconocer un borrador no equivale a aceptar términos aprobados. |
| No había consentimiento para embebidos | Spotify solo se monta si se permite medios externos. Revocar desmonta el iframe. Analítica/marketing no están conectados. |

## P1 — recorrido utilizable

- Importadas 14 + 7 + 12 fichas con fuente íntegra, USD/EUR, rangos, programas, gastos excluidos y avisos históricos. No se presentan cierres de la fuente como avisos actuales.
- Explorar → buscar/filtrar → ficha → guardar/descargar → solicitar información. El envío requiere una cuenta Supabase real configurada; no fabrica reservas ni pagos.
- Cuenta: registro, acceso, recuperación, solicitud de negocio, documentos privados y revisión administrativa preparados. Sin claves, estado explícito pendiente de configuración.
- Cultura Viva: diez referencias, regiones corregidas y fechas orientativas sin ediciones inventadas.
- MIJIN: recuperación determinista del catálogo, FAQ, voz opt-in y clima por consulta explícita. El proveedor generativo sigue deshabilitado.
- Presupuesto/Flex/Pet: costes desconocidos separados, EUR sin conversión, restricciones duras, propuestas sin modificar reservas. La interfaz ofrece alternativas individuales, no un cálculo de ruta por carretera.
- IndexedDB guarda fichas públicas seleccionadas; offline usa sus instantáneas. SW de producción restringido a recursos públicos.

## P2 — pendientes verificados

- Revisar visualmente escritorio/móvil y recarga real sin red. El control del navegador no pudo validar la URL de Chrome en esta sesión; no se certifica QA visual ni PWA de extremo a extremo.
- El bundle principal sigue por encima de 500 KB. Cuenta, asistente y descargas se separan por carga diferida; falta dividir código demo y catálogo con mayor detalle.
- Persisten avisos de lint del código anterior. No hay errores de lint bloqueantes en los comandos actuales.
- La interfaz nueva está en español. El selector anterior conserva sus traducciones; su verificación no acredita cobertura de V3.
- Faltan pasaporte con giro de página, CMS editorial conectado, pagos/webhooks sandbox, feed multimedia autorizado y notificaciones externas.

## Bloqueos externos

Supabase/SMTP/Storage alojados, gateway, responsable legal, aprobación de políticas y convenios, material multimedia y políticas de mascotas verificadas. No se necesitan para explorar y probar el catálogo local; sí para afirmar operativa comercial.
