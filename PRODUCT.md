# CHULLA VIDA
<!-- impeccable:product-schema 1 -->

## Platform
Web; React, TypeScript y Vite.

## Users
Wambras que descubren y organizan viajes por Ecuador desde celular o computadora. Anfitriones, comunidades y negocios tienen un recorrido separado para publicaciones y solicitudes.

## Product Purpose
Acercar a los jóvenes a Ecuador mediante experiencias locales, planificación por preferencias y presupuesto, cultura y pasaporte de viaje; conectar viajeros con comunidades y anfitriones respetando cultura y naturaleza.

## Capabilities and Constraints

- Catálogo de 51 fichas referenciales: 42 con fotos del sitio acreditadas y 9 con referencias regionales; cuatro regiones, búsqueda, favoritos, planificador y Cultura Viva con 39 celebraciones. El asistente de voz fue retirado por petición explícita del 18/11. Precios orientativos, sin garantía de disponibilidad ni venta habilitada; presupuesto de grupo desde $20, transporte y extras aparte.
- Supabase conecta cuentas, organizaciones y solicitudes; API y reglas de base de datos deciden permisos y estados de pago. Elegir modo negocio en una demostración no concede autorización del servidor.
- Las compras conectadas requieren sesión válida, correo verificado, oferta habilitada, confirmación del anfitrión y términos vigentes aceptados. El servidor calcula importes y verifica al proveedor; PayPhone aloja el formulario de tarjeta y CHULLA VIDA no recibe esos datos. El retorno del navegador no acredita pago.
- Cobros conectados desactivados hasta configurar y validar proveedor, requisitos comerciales y servicios. Distinguir demostración local y pago conectado: las pruebas no rellenan `pagado_en`, crean ingresos ni acreditan liquidaciones.
- Planes de referencia: semanal $2,99, mensual $4,99 y anual $49,99. Antigua ruta premium, Comunidad wambra y pasaporte premium son funciones de membresía; premium exclusivo anual. Sin compra conectada de suscripciones; producción rechaza membresías del navegador y deshabilita activación ficticia. Simulación histórica solo en desarrollo.
- Pasaporte básico y sellos de prueba diferenciados de visitas verificadas. Billetera, solicitudes de retiro y comisión 10% distinguen simulación y datos conectados; ninguna prueba implica dinero transferido.
- Biblioteca de fichas e itinerario HTML en el dispositivo; HTTPS usa service worker tras cargar recursos y depende del almacenamiento del navegador. Descargas como instantáneas; IA remota, clima, cuentas, disponibilidad y transacciones necesitan internet. El esquema de ruta no es navegación GPS. Sin red, nuevas postales solo de fichas descargadas y sección de videos oculta.
- Idiomas: español, inglés, francés, portugués, chino y borradores de Kichwa Sierra y Amazonía; estos comparten base y requieren revisión comunitaria, sin certificación dialectal. Nombres propios, relatos y contenido de usuarios conservan su idioma; algunas pantallas históricas tienen cobertura parcial.

## Brand Commitments
CHULLA VIDA para wambras: logo original actualizado y activos existentes, sin redibujarlos. Primera intro audiovisual con cierre en logo original grande y animado, salto, pausa y alternativa estática con movimiento reducido; sin acceso para repetirla en el menú. Frases ecuatorianas breves, iconos con etiquetas, contraste legible y acciones táctiles; escritorio y móvil igualmente importantes.

## Dirección visual VIGENTE · FUSIÓN 17 de noviembre de 2026
La última petición y `.impeccable/fusion-direction.md` gobiernan: portada fotográfica recuperada («Un país. Mil formas de vivirlo.»), menú completo, cinco destinos móviles originales y detalles de álbum que acompañan el turismo. Cinco accesos iniciales; HomeIntro conserva cuatro pasos y contenido en desplegable. Archivo en titulares, Newsreader como acento y Plus Jakarta Sans en cuerpo; base cálida, azul, maíz, turquesa, verde y rosa, según DESIGN.md.
La dirección «Álbum del Ecuador» del 16/11 queda como antecedente sustituido: sus órdenes de rediseño total, exclusión de fuentes/base cálida, sticker obligatorio y navegación alternativa no rigen. La corrección y recuperación del 17/11 establecieron la continuidad; la fusión la extiende. Se conservan funciones, datos, seguridad, pasaporte y Cultura Viva con nombre, cartas, fotos acreditadas, giro horizontal, 39 celebraciones y fuentes/fechas honestas.
Las ocho postales editoriales incluyen ubicación, autores, guardado real y compartir nativo o enlace profundo; no son publicaciones reales de Instagram ni añaden fotografías de nuevos sitios al catálogo. Los cuatro videos regionales locales de la fusión anterior permanecen como activos acreditados, pero su sección se retira del inicio por la petición del 18/11.

## Evidence on Hand
Logo en `public/brand` y `public/chulla-vida-logo.png`; fotografías/créditos en `public/images`, video/créditos en `public/video`. Playlist Sierra `1YViurI7F7HxTMSS0DiabA`, Costa `18gSr3UmtEr6wuDRWSD4yX`, Amazonía `5nRsIgwAyODNTv4V6JzUZp`. Botones sociales históricos simulados, sin perfiles inventados; las nuevas postales comparten enlaces reales. Proyecto: `C:/Users/leone/Desktop/CHULLA VIDA`; publicación vinculada: https://chulla-vida.vercel.app/.
Contrato: `.impeccable/fusion-direction.md`; sistema: DESIGN.md; cierre y QA previo: docs/FUSION_VISUAL_20261117.md. La recuperación previa se documentó en docs/RECUPERACION_GITHUB_20261117.md.

## Product Principles

Actualización del 17/11: los botones sociales históricos de demostración fueron reemplazados por los perfiles externos de Ecuador Travel en Instagram y TikTok, confirmados desde su web oficial y rotulados como inspiración externa. No representan cuentas de CHULLA VIDA ni aval comercial. No se insertan reproductores de terceros. La interfaz incorpora frases ecuatorianas traducibles, con Fredoka local como acento.

- Explorar sin cuenta; autorización del servidor para datos privados y operaciones conectadas; herramientas separadas para viajeros y negocios.
- Fotografía y acciones claras primero; contenido completo accesible en detalles, pestañas y desplegables, sin ocultar funciones.
- Preservar preferencias, favoritos y recomendaciones al cambiar diseño; distinguir hechos verificados, referencias y pruebas.
- Mantener precio, moneda, comisión, estado y entorno de pago visibles antes de confirmar.
- Respetar movimiento reducido, teclado, lectores de pantalla y pantallas pequeñas; menú lateral, menú móvil y barra Explorar, Mi viaje, Cultura Viva, Billetera y Cuenta.

## Ajuste vigente · 18 de noviembre de 2026

Administración: `/administracion` ofrece revisión humana de solicitudes y documentos privados, correcciones y registro de decisiones con historial. Solo cuentas confirmadas con rol `admin`. No hay autoaprobación de negocios ni contraseñas compartidas en el código. Ver `docs/ADMINISTRACION_NEGOCIOS.md`.

La última petición prevalece sobre las referencias históricas a MIJIN y los cuatro videos regionales: ambos se retiran del inicio. Comunidad wambra pasa a «ECUADOR A TU RITMO»; Favoritos, Próximos viajes y Billetera y reservas sustituyen los accesos anteriores. Se mantienen modos negocio/viajero y el recorrido guiado actualizado.

Chulla Flex muestra sugerencias desde el inicio y propone hasta tres paradas compatibles en una provincia, sin afirmar tiempos de traslado. La compra de ruta de demostración suma todas las paradas con precio y separa las que requieren cotización; el cobro conectado sigue limitado a una oferta y pendiente de activación comercial. El perfil permite registrar una solicitud privada de eliminación para revisión, no un borrado inmediato. «BBS · Bueno, bonito y seguro» es una guía de comprobaciones y no un sello de seguridad verificado.
