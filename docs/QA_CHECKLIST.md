# Comprobación y límites

## Comandos reproducibles

En PowerShell usar `npm.cmd` si la política de scripts bloquea `npm.ps1`.

```sh
npm run build
npm run typecheck:api
npm test
npm run verify
npm run lint
```

`npm run check` reúne estos pasos. El build tipa el cliente; `typecheck:api` cubre ambos adaptadores de servidor.

Resultado de esta continuación: **59 pruebas en 13 archivos aprobadas**, build y tipado de API aprobados, verificaciones de dominio/catálogo/legales aprobadas. Lint finaliza correctamente con avisos pendientes del prototipo y de organización de componentes. El detector mecánico de diseño señaló diferencias respecto a la escala anterior de `DESIGN.md`; no constituye una aprobación visual.

## Cobertura automatizada

- Catálogo: 33 fichas, IDs, tres fuentes exactas, rangos, EUR, advertencias, restricciones y bloqueo de compra.
- Recorrido de interfaz: las 33 fichas visibles, búsqueda, detalle/fuente, guardado y ausencia de pago en el catálogo público.
- Presupuesto/Flex/Pet: Quito con USD 20, Galápagos no viable con USD 20, duración conocida, alternativas sin modificar reservas, mascotas sin política confirmada.
- MIJIN: recuperación y fuentes, preguntas privadas, modo offline limitado a descargas, voz/clima sin permiso o acción sin actividad externa.
- Clima: validación y respuestas modeladas mediante mocks; no certifica condiciones meteorológicas reales.
- Supabase/PGlite: usuarios cruzados, rol admin, solicitudes, idempotencia, documentos privados y grants de columnas.
- Auth: estado sin credenciales y limpieza de datos privados al cambiar de identidad.
- Offline: IndexedDB, corrupción, versiones, EUR, borrado y restricciones estáticas del SW.
- Reservas anteriores: persistencia tras llegada y prohibición de convertir pagos demo en pagos reales.
- Consentimiento: categorías separadas, iframe bloqueado por defecto y retirado al revocar.

Las verificaciones anteriores del prototipo también pasan: 76 aserciones de dominio, 24 de membresía/pasaporte, 26 de billetera, 3957 comprobaciones de traducción y 147 mensajes de pagos. Estos números no certifican traducciones de las pantallas nuevas ni exactitud lingüística.

## Revisión manual pendiente

- [ ] Escritorio y móvil: jerarquía visual, contraste, desbordamiento y zoom al 200%.
- [ ] Teclado/lector de pantalla y recuperación de foco con paneles superpuestos.
- [ ] Navegador compatible con voz: permitir, detener, revocar y fallback.
- [ ] Consulta real del clima: seleccionar localidad, revisar fuente/hora y fallo de proveedor.
- [ ] Build de producción: descargar, esperar caché, cerrar, recargar sin red y verificar solo instantáneas elegidas.
- [ ] Usuarios alojados separados: confirmar email, recuperar contraseña, permisos cruzados, evidencia privada y revisión admin.
- [ ] Rechazar medios: ausencia de solicitudes Spotify; permitir, abrir y revocar.

El control de navegador se detuvo al no poder comprobar la URL de Chrome. No se usó una captura ni una revisión visual como evidencia en esta entrega. No se certifica preparación de producción.
