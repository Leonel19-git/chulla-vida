# Entrega · Álbum del Ecuador · 17/11/2026

La plataforma conserva el catálogo de 51 fichas, las fotos acreditadas y los documentos existentes. La portada, navegación, fichas, cuenta y experiencia del negocio ahora comparten el diseño de Álbum del Ecuador: maíz, azul del logo, Archivo y cromos numerados.

## Cambios integrados

- Sobre interactivo con tres destinos, guardados y video local con pausa. Alternativa fotográfica con movimiento reducido o ahorro de datos. Intro con video en 1080p/vertical y cierre con el logo original.
- Cromos con foto, número, reverso accesible, créditos y acceso a la ficha. Precio y compra antes del resumen plegable en móvil.
- Tutorial de diez pasos sobre controles reales; ruta separada para negocios, reanudación, teclado y vuelta al inicio al terminar.
- MIJIN con un control principal, recuperación de permisos, cancelación de descarga/transcripción y selector de voces disponibles. Motor local opcional con consentimiento y progreso; no descarga el modelo automáticamente.
- Registro con cédula obligatoria, provincia y dígito verificador. Solo se envían los últimos cuatro dígitos después de confirmar el correo; el resumen no acredita identidad.
- Compra y cotización desde fichas y Mi viaje requieren cuenta con correo confirmado. Billetera y pasaporte usan el mismo control de acceso. Las API y políticas de base de datos mantienen la autorización real.
- Panel de negocio con siguiente paso, cifras por organización, borradores editables, documentos privados, correcciones de solicitud y revisión de transferencias. Solo el dueño modifica la cuenta bancaria.
- Pasaporte como libro de cromos: formato de celular, gestos y páginas regionales. Guardado, compra de prueba, visita de demostración y visita verificada se presentan como estados distintos.
- Traducciones nuevas de controles y tutorial. Los relatos y nombres locales siguen en su idioma de origen; Kichwa mantiene aviso de borrador comunitario.

## Supabase y seguridad

Proyecto: https://supabase.com/dashboard/project/xtgfbhhsekavwyolizjq

Migraciones `202611170201_signup_identity.sql` y `202611170202_security_business.sql` aplicadas y confirmadas con el historial remoto. La revisión detallada está en [SEGURIDAD_20261117.md](./SEGURIDAD_20261117.md).

Se comprobaron con el acceso público las tablas `user_roles`, `profiles`, `organization_bank_accounts`, `verification_documents`, `transfer_payments` y `signup_identity`: las seis respondieron 401/42501. No se imprimieron filas ni credenciales.

La auditoría de dependencias de producción informó cero vulnerabilidades conocidas al realizar la revisión. Esto no certifica seguridad absoluta.

## Verificación visual y funcional

- Escritorio Chromium, Pixel 7 y WebKit iPhone 13: ocho comprobaciones por dispositivo, sin errores de página ni desbordamiento: sobre, guardado, giro, ficha, cédula, MIJIN, tutorial y fiestas.
- Movimiento normal: video y pausa accesible, diez pasos del tutorial, estado final `done`, desplazamiento a cero y logo final, en escritorio y WebKit iPhone.
- Negocio: panel, navegación propia y editor real con datos simulados en escritorio/iPhone. Sin escrituras en datos reales.
- Cambio de interfaz a inglés, francés, portugués, chino y español a 390 px, sin desbordamiento.
- Pasaporte: once pruebas de navegador aprobadas y una omitida porque prueba formato de escritorio en el proyecto iPhone. Usan una muestra explícita de desarrollo, excluida del build público.
- Evidencia local en `.impeccable/review/album/`; no se publica con la web.

## Servicios y decisiones pendientes

1. Comprobar formato de cédula no confirma que exista ni que pertenezca a la persona. Hace falta proveedor autorizado y acuerdo de tratamiento para verificación documental real.
2. No se activó un proveedor de cobro ni se autorizó una oferta comercial por diseño. Tarjetas de prueba no mueven dinero; una transferencia y su comprobante requieren revisión del ingreso. La configuración de producción revisada solo contiene las variables de Supabase.
3. MIJIN usa voces del navegador. Una voz neuronal uniforme y el proveedor de IA remoto requieren servicio y credenciales. El micrófono, audio y autocompletado aún deben comprobarse en teléfonos físicos.
4. No se enviaron correos de registro de prueba ni se crearon usuarios reales durante esta revisión. SMTP y entrega de OTP deben comprobarse con un correo autorizado.
5. Los borradores legales conservan revisión jurídica y datos del responsable pendientes. No se declaró cumplimiento legal automático.
6. Figma: se creó https://www.figma.com/design/S5LD6rUB25BIr2GE2efYaJ pero el límite de la cuenta Starter impidió generar los marcos. El archivo no es una réplica entregada. El diseño implementado y sus capturas son la referencia.

Publicación verificada: https://chulla-vida.vercel.app — despliegue `dpl_9qgodyxKYAWbL8LXbnoWf9YeuBXS`, código `a6502fc`, rama `chulla-vida-4-album`. Vercel confirmó READY y el alias de producción.

## Cierre de verificación

Regresión global: **973 pruebas aprobadas, cero fallidas**. También aprobaron análisis estático (con avisos de código heredado/exportaciones), compilación de producción, tipos de las API y verificaciones del catálogo, manifiesto legal, traducciones, membresías y billetera. No se presentan los avisos como errores corregidos.

## Comprobación del sitio publicado

Escritorio (1440 px) y WebKit iPhone (390 px) respondieron HTTP 200, sin errores de página ni desborde. El registro abre en modo conectado a Supabase, muestra cédula y MIJIN tiene un control principal. Las respuestas incluyeron Content-Security-Policy. No se enviaron formularios de registro ni cobros.

`/api/payments/config` confirmó pagos deshabilitados, proveedor PayPhone en sandbox. Una escritura de pagos con origen ajeno respondió 403. `/api/assistant` respondió 503 `unconfigured`. El proxy `/api/weather` respondió 503 porque su activación sigue pendiente; la interfaz conserva la consulta directa de clima descrita en ASISTENTE_IA.md. No se activaron proveedores por el despliegue.
