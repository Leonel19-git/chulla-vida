---
name: CHULLA VIDA
description: Continuidad visual y navegación simplificada, actualizada el 18 de noviembre de 2026.
colors:
  azul-marca: "#012960"
  maiz: "#FFCE45"
  turquesa: "#80E2D4"
  verde: "#C7E99A"
  rosa-acceso: "#FFB0C0"
  fondo-postales: "#FFE6EC"
  azul-claro: "#BBD7FF"
typography:
  localAccent:
    fontFamily: "Fredoka Local, sans-serif"
  display:
    fontFamily: "Archivo Variable, sans-serif"
  accent:
    fontFamily: "Newsreader Variable, Newsreader, Georgia, serif"
  body:
    fontFamily: "Plus Jakarta Sans, sans-serif"
---
# Design System: CHULLA VIDA

## Overview
VIGENTE: continuidad de la FUSIÓN 17/11/2026, corregida por la petición del 18/11/2026. Fotografía grande de Ecuador, «Un país. Mil formas de vivirlo.», «Cumbres, río, bosque y mar.», Encuentra tu aventura y Arma tu viaje. Conservar identidad, catálogo, Cultura Viva y herramientas. La última instrucción retira el asistente de voz, sus accesos y la sección de cuatro videos regionales del inicio. Comunidad wambra ocupa su lugar junto a «ECUADOR A TU RITMO».

## Colors
La base sigue siendo clara y cálida. Azul de marca para texto, controles y selección; maíz para la acción principal y el acento de portada; turquesa, verde, rosa y azul claro para accesos y regiones. Las postales tienen fondo rosa claro. Los valores del frontmatter describen los colores usados en `src/features/discovery/discovery.css`.

## Typography
Archivo dirige titulares y títulos de tarjetas; Newsreader queda como acento de portada; Plus Jakarta Sans sostiene cuerpo y controles. Portada: peso 780, interlínea 1.02 y ancho máximo 13ch; secciones: peso 760, interlínea 1.1. En móvil, portada de 35–48px y títulos visuales de 30px.

Actualización vigente · 19/11/2026: Fredoka Local gana protagonismo en el inicio, los accesos, las frases y la portada del pasaporte por petición del propietario. Plus Jakarta sigue en textos, campos y controles; Archivo en fichas y datos. No cambiar las fuentes de pagos ni del dashboard. El fondo del catálogo incorpora dibujos vectoriales propios de viaje de bajo contraste; tres stickers traducibles acompañan los accesos sin crear otra sección larga. La portada del pasaporte lleva bandera con escudo y una postal ilustrada propia, diferenciada de las fotos reales del catálogo. El menú usa la misma bandera ecuatoriana completa. El selector nativo de idioma muestra nombre completo en escritorio y código en celular, con lista de nombres completa al abrir.

Aclaración del propietario: los stickers también son ilustraciones grandes en el fondo, no solo frases. `travel-sticker-sheet.svg` aporta cámara, mochila, montaña, sol y boleto dibujados para el proyecto; los textos llevan una superficie clara para conservar legibilidad. Mi Ecuador mantiene los cuatro nombres geográficos, contadores separados y botones que abren cada región. La leyenda completa se despliega dentro del área desplazable del libro; el color intenso corresponde a visitas verificadas y el claro al progreso previo, sin convertir favoritos o pruebas en visitas.

## Layout
Cinco accesos iniciales en columnas con separación de 10px; hasta 760px pasan a carrusel de tarjetas de 174px. Postales con desplazamiento horizontal intencionado y ajuste por tarjeta, dentro del ancho de página: 304px en escritorio y hasta 83% en móvil. Controles táctiles de al menos 44px y foco visible de 3px. El pasaporte se limita al alto y ancho disponibles en móvil, con bandera ecuatoriana y escudo.

## Elevation & Depth
Predominan fotografía, superficies de color y bordes finos. La acción principal tiene sombra sólida desplazada 3px; las postales, sombra suave de 0 4px 10px. El degradado de los videos sostiene la lectura del título y del control.

## Shapes
Accesos con esquinas de 16px, postales de 14px y pantallas de video de 18px; contenedor de postales de 24px, 18px en móvil. Filtros redondeados y bordes uniformes de 1px en los nuevos accesos; el estado seleccionado combina fondo azul y texto blanco.

## Components
- Inicio: cinco accesos de color explican las herramientas; HomeIntro conserva sus cuatro pasos y todo su contenido dentro de un desplegable.
- Navegación: Favoritos, Próximos viajes y Billetera y reservas; Comunidad wambra en la barra superior. Sin «Mis avisos» ni botón para repetir intro. Barra móvil: Explorar, Mi viaje, Cultura Viva, Billetera y Cuenta. Modos negocio/viajero visibles; elegir modo no cambia permisos. La primera intro conserva video, cierre con logo, salto, pausa y alternativa estática con movimiento reducido.
- Catálogo: 51 fichas, 42 con fotos del sitio y 9 con referencias regionales; región, guardar, nombre, duración, dificultad, precio y compra permanecen accesibles. Cultura Viva conserva 39 celebraciones y sus cartas; el pasaporte y sus cromos permanecen intactos.
- Ocho postales editoriales: ubicación («Esta foto se tomó aquí»), autores/créditos, apertura de ficha, guardado real y compartir nativo o enlace profundo. Son contenido editorial propio, no publicaciones reales de Instagram. Reutilizar fotos no aumenta el conteo de fotos del catálogo.
- La sección «Tu próximo finde empieza aquí» se retira del inicio por petición del propietario. Sus activos se conservan con créditos para evitar pérdida de material. Sin red, las postales se limitan a fichas descargadas.

## Do's and Don'ts
Mantener foto, marca, menú completo, contenido y acceso a funciones. Respetar teclado, movimiento reducido y separación entre viajero y negocio. Conservar controles de cuentas, permisos, consentimiento y pagos de PRODUCT.md; la fusión no autoriza otro rediseño total ni ocultar herramientas.

## Ampliación expresiva · 17/11/2026
El propietario pidió más carácter sin agregar contenido. `src/features/discovery/expressive.css` amplifica la misma composición: portada de paisaje más grande, velo azul menos opaco, titulares de hasta 88px y entrada breve con movimiento reducido respetado. Los cinco accesos forman una banda continua de color. El catálogo muestra tres fotografías mayores por fila en escritorio y tarjetas horizontales en móvil; las postales son papeles ligeramente inclinados sobre maíz y los cuatro videos forman una escena azul noche con títulos maíz. Menú, acciones, textos, fuentes de datos y Cultura Viva permanecen.

La paleta incorpora tonos saturados de las tintas existentes: azul #70B7FF, turquesa #5BD8C3, rosa #FF91AC y verde #A9DF70; fondos de video #001B3D, velos de paisaje #001D42 y texto claro #D9E8FF. Sombras cálidas de postales #6F4A00 con baja opacidad. No se agregan secciones, cifras ni publicaciones ficticias. La animación afecta solo la entrada de portada; no desplaza datos ni controles durante el uso.

## Voz ecuatoriana y redes reales · 17/11/2026
Fredoka Variable, alojada localmente, se reserva a los guiños ecuatorianos y nombres de regiones/postales; Archivo, Newsreader y Plus Jakarta mantienen sus funciones. Frases breves: «De una, ñaño. ¡Se arma el plan!», «Achachay… ¡pero qué vista!», «¡Vamos, ve! El mar nos espera.» y «Desconecta un rato, pana.». Todas tienen traducción de interfaz en inglés, francés, portugués y chino. El fondo de la portada de catálogo utiliza velos estáticos claros #D9F3FF, #FFE5EE y #DDF4D5 sobre #FFF9EF, sin afectar formularios ni pagos.

Los botones sociales de demostración se sustituyeron por enlaces reales a Instagram @ecuadortravel y TikTok @ecuador.travel, identificados como inspiración externa, también junto a las postales. Son perfiles de Ecuador Travel, no cuentas de CHULLA VIDA ni publicaciones atribuidas a las fotos. Fuente comprobada: https://onlyin.ecuador.travel/es/2026/07/01/mas-alla-del-mundial-nueva-york-vivio-el-destello-de-la-aventura-ecuatoriana/ . Los enlaces abren otra pestaña con `noopener noreferrer`; no hay embeds, seguimiento ni peticiones a esas redes al cargar la página. Las plataformas externas pueden solicitar iniciar sesión.
