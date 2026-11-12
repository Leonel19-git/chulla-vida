# Verificación final · CHULLA VIDA

## Membresías, pasaporte y publicación · 23 de octubre de 2026

- Planes de prueba: semanal $2,99, mensual $4,99, anual $49,99. Rutas offline y comunidad requieren membresía activa; premium del pasaporte solo anual. Pasaporte básico gratuito, sellos de prueba identificados y sellos de visitas validadas sin duplicados.
- 76 comprobaciones de dominio, 24 de membresía/pasaporte, 26 del libro de negocios y 3912 comprobaciones de composición de idiomas aprobadas. Kichwa cambia 635 frases de interfaz; es una base unificada en revisión regional, sin certificación lingüística. Algunos textos largos mantienen español.
- Recorrido de navegador completo aprobado: bloqueo gratuito, activación de los tres planes, vencimiento, comunidad, recorrido guiado offline, descarga abierta sin red, reserva para hoy, aceptación por negocio, validación de llegada, retiro único del 90% y sello verificado en el pasaporte. Sin pago real ni liquidación bancaria.
- Móvil de 320/390 y escritorio de 1440 px revisados. Corregidos superposición de etiquetas de los contadores y centrado del retiro; intro Kichwa sin colisión con controles regionales. Animación de sellos y alternativa de movimiento reducido comprobadas. Revisión independiente final: **SHIP**, sin hallazgos materiales abiertos.
- Detector de UI ejecutado una vez por superficie; eliminada la banda genérica de planes. La franja tejida del anual mantiene el motivo editorial del pasaporte.
- Vercel: publicación por CLI autenticada tras la limitación del conector, con equipo y proyecto explícitos. Producción **READY**, `dpl_HcHn4c1pvg3L2WoA3M2cwtiecKUt`, alias **https://chulla-vida.vercel.app/**. HTTP 200 público sin cookies ni sesión de Vercel. Navegador de producción confirmó 28 destinos, siete idiomas, imágenes cargadas, planes, pasaporte anual, Kichwa y móvil sin errores.
- QR PNG/SVG y cartel PDF A4 generados para `https://chulla-vida.vercel.app/`. El PDF tiene una página y enlace clicable; se renderizó con Poppler y se revisó visualmente. ZXing decodificó tanto el PNG como el QR del PDF renderizado con la URL exacta. Paquete: `output/chulla-vida-completo.zip`.
- Evidencia: `premium-results.json`, `production-results.json`, `premium-*.png` y `chulla-vida-qr-poster.png` en `.impeccable/review/`. Build válido con aviso no bloqueante de bundle de 690,41 kB (230,45 kB gzip).
- Alcance confirmado por el usuario: no dispone de proveedor de pagos y solicitó el flujo de prueba. Sin cobros, transferencias, renovación automática real ni acceso privado de cuentas. La descarga HTML sigue disponible después de guardarse; la web completa no garantiza arranque sin red.

## Idiomas, $20 y cuatro regiones · 23 de octubre de 2026

- Build de producción correcto. 70 comprobaciones de dominio conservadas; `verify-catalog.mjs` valida 28 destinos, cuatro regiones y paseos continentales para dos personas dentro de $20. `verify-payment-i18n.mjs` confirma 145 mensajes de pagos en cuatro idiomas adicionales e interpolaciones conservadas.
- Selector de siete opciones persistente, con idioma del documento: español, inglés, francés, portugués, chino simplificado y dos avances parciales de kichwa Sierra/Amazonía. Se verifica el cambio en intro, navegación, presupuesto y checkout, además de negocios en inglés. Kichwa muestra su estado parcial y revisión comunitaria pendiente; relatos locales y datos del usuario mantienen su idioma original.
- Cuatro filtros ilustrados cambian el catálogo sin traducir valores internos. Ruta offline con cuatro escenas, nodos operables, leyenda y cronología. Los helpers pasaron 10 comprobaciones de escenas, idiomas, presupuesto, validación, escape de HTML y ausencia de dependencias externas.
- Verificación real con la red desactivada: ruta de Costa para dos personas dentro de $20; descarga abierta desde disco con cero solicitudes HTTP. Evidencia: `chulla-vida-ruta-regional.html`, `regional-offline-file.png`.
- Escritorio 1440, tamaños intermedios 1024/768 y móviles 390/320 sin desbordamientos. Corregida colisión de marca/idioma móvil y exceso de acciones de cabecera intermedia. Capturas de intro francesa, china y kichwa, presupuesto mínimo, cuatro mapas y checkout inglés.
- Revisión independiente sin otros hallazgos materiales. Confirmación posterior de cabecera y ruta móvil desde arriba: `regional-confirmation.json`; recorrido completo en `regional-results.json`. Sin errores de aplicación.
- Detector ejecutado una vez: transición de stroke-width eliminada. Las bandas nacionales son una elección explícita del brief, documentada en DESIGN.md. Advertencia de build: bundle principal de 604.79 kB, 200.64 kB gzip; compilación válida.
- Se conserva el alcance: precios orientativos y pagos simulados; el HTML descargado funciona offline, la web completa no arranca sin conexión y el mapa no ofrece GPS.

## Interfaz visual para wambras y ruta sin internet

- `npm run build`: compilación de producción correcta. Se mantienen las **70 comprobaciones de dominio**; el módulo de ruta sin conexión pasó **8 comprobaciones adicionales** de presupuesto, datos guardados y exportación.
- Logo original dividido visualmente en sus paisajes, sol y nombre mediante recortes SVG. Entrada escalonada, sol giratorio de 24 segundos, pausa, repetición y cambio de fotografía por región comprobados en navegador. La bienvenida espera una acción del usuario.
- Con movimiento reducido del sistema, la intro permanece estática; «Reproducir animación» permite activar expresamente el movimiento del logo.
- Tarjetas con iconos y datos breves; detalle con pestañas y navegación por teclado. Catálogo de **16 destinos** y selector de salida con **28 ciudades ecuatorianas**, búsqueda por ciudad/provincia y selección persistente comprobados.
- Ruta de hasta tres paradas ajustada a días y presupuesto del grupo. Esquema interactivo, guardado local, simulación de falta de señal y estado real de conexión comprobados.
- La descarga `chulla-vida-ruta-offline.html` abrió desde disco con la red desactivada y **cero solicitudes de recursos externos**. Incluye el esquema y los datos del viaje. No es navegación GPS; la aplicación web completa no dispone de arranque sin conexión.
- Escritorio de 1440 px y móviles de 390/320 px: intro, portada, detalle, ruta y checkout sin desbordamiento horizontal. Botón principal del checkout contenido en su diálogo. Sin errores de aplicación.
- Revisión visual independiente final: **lista para entregar** (`ship`). Corregidos el solapamiento de la intro a 320 px y las capturas prematuras de los diálogos móviles.
- Evidencia: `.impeccable/review/youth-results.json`, `verify-youth.mjs`, `youth-*.png` y la descarga HTML. Vite excluye `.impeccable/` de su vigilancia para evitar recargas al guardar artefactos de verificación.

Las siguientes secciones conservan la evidencia de versiones anteriores; la bienvenida y la portada actuales se describen arriba.

## Pagos interactivos y bienvenida visible

- Compilación de producción correcta. Dominio: **70 comprobaciones aprobadas** (incluyen las 45 anteriores).
- Pago de demostración en tres pasos: fecha/grupo, método y revisión. Tarjeta con rechazo sin crear solicitud, reintento aprobado, transferencia pendiente/completable y Deuna con QR de texto `CHULLA-VIDA:DEMO`.
- Confirmados en navegador: total de tres viajeros ($135 en Saraguro), descarga marcada sin valor de pago, persistencia al recargar, cancelación durante procesamiento sin guardar solicitud y estado demo visible para el negocio.
- La solicitud sigue pendiente de confirmación por el anfitrión; la simulación nunca establece un pago real ni genera liquidaciones.
- Bienvenida visible en cada carga hasta pulsar «Entrar a CHULLA VIDA», saltar o Escape. Repetición desde cabecera, portada, menú y pie. Sin cierre automático; esta decisión sustituye el comportamiento por sesión de la revisión anterior.
- Móvil 390/320 px y escritorio 1440 px: sin desbordamiento horizontal; comprobación explícita de que todo el botón principal del checkout queda dentro del diálogo. Recibo y pantalla de historial comprobados en móvil.
- Movimiento reducido, retorno del foco, barra animada con transform y ausencia de errores de aplicación comprobados.
- Detector: transición de ancho en progreso corregida a `scaleX`; revisión visual: barra móvil corregida y etiqueta de demostración integrada en los metadatos del recibo.
- Revisión independiente final: **lista para entregar** (`ship`), sin hallazgos pendientes.
- Evidencia actual: `.impeccable/review/payments-*.png`, `payments-results.json`, `payments-confirmation.json`. `verify-payments.mjs --responsive-only` documenta la confirmación móvil tras la corrección; `confirm-payment-motion.mjs` comprueba el recibo y el historial finales.

Las siguientes secciones conservan la evidencia de las versiones anteriores.

Revisión visual del rediseño inicial: **lista para entregar** (`ship`). Actualización posterior con paleta andina, bienvenida animada y playlist aportada por el usuario verificada en navegador.

| Hallazgo | Resultado |
| --- | --- |
| Regiones y filtros en móvil | Resuelto; cuatro regiones visibles, filtro separado. También comprobado en panel estrecho de 319 px. |
| Contraste de textos secundarios | Resuelto; color #5e6e62 en los selectores revisados. |
| Jerarquía musical | Resuelto; el título y el artista preceden a los metadatos. |

## Comprobaciones

- `npm run build`: correcto.
- `node scripts/verify-domain.mjs`: 45 aserciones correctas.
- Navegador: favoritos, ocho pasos del planificador, preferencias persistentes, presupuesto de ruta, solicitud, confirmación por negocio, consulta como viajero, cancelación, reproductor de Spotify.
- Vistas revisadas: escritorio de 1440 × 1000, móvil de 390 × 844 y panel estrecho de 319 px.
- Las fotografías regionales cargan. No se encontraron desbordamientos en 390/1440 px. El diseño conserva un ancho mínimo de 320 px en paneles más estrechos.

## Alcance

Demostración con persistencia en este navegador. Sin autenticación, sincronización entre personas, cobros ni mensajería externa. Las redes sociales son botones simulados por petición del usuario; muestran un aviso y no navegan a cuentas externas.

Capturas en `.impeccable/review/`. No hubo una composición visual aprobada ni tarjeta externa de calidad; la revisión se realizó sobre el brief del usuario, el logo aportado y la aplicación implementada.

## Actualización andina

- Paleta papel cálido, páramo, terracota y maíz aplicada a viajeros, negocios y planificador. Fotografía de Cotopaxi en el bloque musical; sin imitación de vinilo.
- Playlist principal: Spotify `1YViurI7F7HxTMSS0DiabA`, enlace y reproductor coinciden. Sin reproducción automática.
- Intro con logo original: saltar, Escape, cierre automático, retorno del foco, repetición manual y una sola aparición por sesión comprobados. Movimiento reducido sin animación del logo y cierre más breve.
- Instagram, Facebook y TikTok: botones de demostración con aviso; comprobado que no abren pestañas ni contienen enlaces externos.
- Escritorio 1440 × 1000 y móviles de 390 × 844 y 320 × 740: sin desbordamiento horizontal. Planificador y panel de negocios visibles. Sin errores de aplicación sin capturar.
- Compilación correcta; se conservan las 45 aserciones de dominio aprobadas.
- Evidencia: capturas `andean-*.png` y `andean-results.json`; comprobación reproducible local `verify-andean.mjs` (usa el Playwright incluido en el entorno).
- El detector señaló diferencias respecto al sistema anterior; se actualizó la documentación de la paleta y las nuevas escalas contextuales. Las sombras de fotografías e ilustraciones usan variaciones intencionales de la misma familia natural.
- Revisión independiente de esta actualización: **lista para entregar** (`ship`). Fotografía musical y documentación corregidas; sin hallazgos materiales pendientes.

## Publicación y presentación del pitch, 23 de octubre de 2026

- Producción READY: dpl_7WmraveqrziLmrbXRZjAzTZ28r6H, alias https://chulla-vida.vercel.app/.
- Logo PNG actualizado del usuario conservado íntegro e integrado en la animación y bienvenida. Hero: «Ecuador te espera. Sal a vivirlo». Nuevos textos traducidos en las siete opciones; Kichwa continúa como borrador unificado.
- Spotify: playlist principal más Costa 18gSr3UmtEr6wuDRWSD4yX y Oriente 5nRsIgwAyODNTv4V6JzUZp. Selección, enlace y embed coinciden. Sin autoplay.
- Build correcto. 3957 comprobaciones i18n, 644 frases Kichwa. Verificación de producción sin credenciales: HTTP 200, logo animado, tres reproductores, siete idiomas y móvil 390 sin desbordamiento ni errores de ejecución. Script: .impeccable/review/verify-pitch-update.mjs.
- Pitch editable de cinco diapositivas, cinco notas del presentador, guion de 512 palabras con demo de 45 segundos y objetivos para 90 días. Modelo 90/10 y suscripciones identificados como propuesta de prueba.
- Fuentes: INEC Censo 2022 (3.441.776 jóvenes 18–29) y Ministerio de Turismo Rendición de Cuentas 2024 (6,7 millones de viajes en feriados nacionales, no personas únicas). Enlaces completos en las notas y el guion.
- PPTX validado sin hallazgos estructurales o de geometría. PDF exportado mediante PowerPoint, cinco páginas con texto. Las cinco páginas se renderizaron e inspeccionaron. QR decodificado tanto desde la imagen de la diapositiva como desde el PDF final: https://chulla-vida.vercel.app/.
- Entrega: output/presentacion/ y output/CHULLA-VIDA-exposicion-completa.zip. Los pagos, perfiles y retiros siguen simulados. La ruta guardada es esquemática y sin GPS.
