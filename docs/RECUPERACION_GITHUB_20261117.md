# Recuperación de la presentación anterior · 17/11/2026

Se consultaron las referencias remotas de GitHub antes de cambiar código. La versión V3 previa al trabajo de esta sesión es `origin/chulla-vida-3.1`, commit `c0f8bcc` del 16 de noviembre. `main` es más antigua, del 11 de noviembre. Se conservaron los cambios recientes en la rama de trabajo y se recuperaron componentes concretos, sin reiniciar el repositorio ni la base de datos.

| Elemento | Resultado |
| --- | --- |
| Portada | Recuperada la foto/video grande con «Un país. Mil formas de vivirlo.» y sus acciones originales. |
| Tipografía y colores | Recuperados los temas originales. Se retiró la hoja global que imponía el álbum amarillo. |
| Tarjetas de destinos | Recuperadas las tarjetas fotográficas originales. Compra y guardados siguen conectados a sus implementaciones actuales. |
| Menú | Recuperados Explorar Ecuador, Mi viaje, Mis guardados, Mi billetera, Reservas y pagos, Sin señal, Mis viajes, Cultura Viva, Comunidad wambra, Mis avisos, pasaporte, planes, tutorial y preguntas frecuentes. |
| Ayuda y explicación de uso | Recuperadas la página de preguntas frecuentes y la sección original de cuatro pasos. |
| Viajes y pagos | Los accesos abren las herramientas actuales. Mis viajes remite al historial conectado; no se restauran reservas ficticias como si fueran reales. |
| Negocio | Conservado el panel conectado de organizaciones, experiencias, documentos y banco; no se vuelve al editor de cualquier negocio del prototipo. |
| Cultura Viva | Se conservan el nombre, las cartas que giran y las 39 celebraciones con fuentes. |
| Cuenta y seguridad | Se conservan OTP, cédula con comprobación de formato, sesión confirmada, migraciones y políticas. |
| Pasaporte e intro | Se conservan el pasaporte adaptado y el cierre con el logo original. |

## Límites que siguen visibles

Planes y comunidad conservan su entrada. Su acceso de suscripción no se activa ficticiamente en producción; los servicios comerciales pendientes no se presentan como comprados. La cédula no acredita identidad oficial. El proveedor remoto de IA, cobros y entrega de correo necesitan las comprobaciones y configuración ya documentadas. No se restauran contactos, sellos oficiales ni pagos ficticios como datos reales.

## Validación

Se ejecutó la suite completa (973 casos); los cuatro fallos de presentación se revisaron y corrigieron. La tanda de regresión de portada, móvil, tutorial, traducciones, acceso a compras y roles quedó en 64/64 aprobados. Compilación, análisis estático y verificaciones del catálogo y manifiestos completadas. Los avisos heredados de lint no son una declaración de seguridad absoluta.

Se recorrieron escritorio, WebKit iPhone y Chromium Android: portada, menú, Cultura Viva, ayuda, Mi viaje y ficha con precio; sin errores de página ni desbordamiento. Evidencia local en .impeccable/review/recovered-browser.json y capturas *-recovered-*.png. No equivale a probar micrófono o teclado en teléfonos físicos.

## Plan para continuar

1. Conservar esta base y corregir problemas concretos de uso, sin volver a sustituir la estructura ni los nombres.
2. Ampliar fiestas por provincia y fotos acreditadas, distinguiendo tradición, agenda anual y fecha confirmada.
3. Completar servicios conectados con credenciales y pruebas autorizadas. Las mejoras de diseño no conceden permisos ni acreditan pagos.
