---
name: CHULLA VIDA
description: Fusión visual construida y vigente del 17 de noviembre de 2026.
colors:
  azul-marca: "#012960"
  maiz: "#FFCE45"
  turquesa: "#80E2D4"
  verde: "#C7E99A"
  rosa-acceso: "#FFB0C0"
  fondo-postales: "#FFE6EC"
  azul-claro: "#BBD7FF"
typography:
  display:
    fontFamily: "Archivo Variable, sans-serif"
  accent:
    fontFamily: "Newsreader Variable, Newsreader, Georgia, serif"
  body:
    fontFamily: "Plus Jakarta Sans, sans-serif"
---
# Design System: CHULLA VIDA

## Overview
VIGENTE: FUSIÓN 17/11/2026, según `.impeccable/fusion-direction.md`. Extiende la portada recuperada con detalles del álbum: fotografía grande de Ecuador, «Un país. Mil formas de vivirlo.», «Cumbres, río, bosque y mar.», Encuentra tu aventura y Habla con MIJIN. Conserva identidad, contenido y herramientas.

## Colors
La base sigue siendo clara y cálida. Azul de marca para texto, controles y selección; maíz para la acción principal y el acento de portada; turquesa, verde, rosa y azul claro para accesos y regiones. Las postales tienen fondo rosa claro. Los valores del frontmatter describen los colores usados en `src/features/discovery/discovery.css`.

## Typography
Archivo dirige titulares y títulos de tarjetas; Newsreader queda como acento de portada; Plus Jakarta Sans sostiene cuerpo y controles. Portada: peso 780, interlínea 1.02 y ancho máximo 13ch; secciones: peso 760, interlínea 1.1. En móvil, portada de 35–48px y títulos visuales de 30px.

## Layout
Cinco accesos iniciales en columnas con separación de 10px; hasta 760px pasan a carrusel de tarjetas de 174px. Postales y videos usan desplazamiento horizontal intencionado y ajuste por tarjeta, contenido dentro del ancho de página. Postales de 304px en escritorio y hasta 83% en móvil; videos en cuatro columnas y carrusel móvil. Controles táctiles de al menos 44px y foco visible de 3px.

## Elevation & Depth
Predominan fotografía, superficies de color y bordes finos. La acción principal tiene sombra sólida desplazada 3px; las postales, sombra suave de 0 4px 10px. El degradado de los videos sostiene la lectura del título y del control.

## Shapes
Accesos con esquinas de 16px, postales de 14px y pantallas de video de 18px; contenedor de postales de 24px, 18px en móvil. Filtros redondeados y bordes uniformes de 1px en los nuevos accesos; el estado seleccionado combina fondo azul y texto blanco.

## Components
- Inicio: cinco accesos de color explican las herramientas; HomeIntro conserva sus cuatro pasos y todo su contenido dentro de un desplegable.
- Navegación e intro: menú completo de escritorio y móvil; barra inferior Explorar, Mi viaje, MIJIN, Billetera y Cuenta. La intro conserva video y cierre con logo original grande, salto, pausa, repetición y alternativa estática con movimiento reducido.
- Catálogo: 51 fichas, 41 con fotos reales y 10 ilustradas; región, guardar, nombre, duración, dificultad, precio y compra permanecen accesibles. Cultura Viva conserva 39 celebraciones y sus cartas; el pasaporte y sus cromos permanecen intactos.
- Ocho postales editoriales: ubicación («Esta foto se tomó aquí»), autores/créditos, apertura de ficha, guardado real y compartir nativo o enlace profundo. Son contenido editorial propio, no publicaciones reales de Instagram. Reutilizar fotos no aumenta el conteo de fotos del catálogo.
- Cuatro videos regionales locales: archivos de 720×1280 y 8.29s cada uno; montajes de fotografías licenciadas de Wikimedia Commons, 12 tomas en conjunto y CREDITS público. Carga y play explícitos, uno a la vez y pausa fuera de pantalla. Sin red, las nuevas postales se limitan a fichas descargadas y los videos se ocultan.

## Do's and Don'ts
Mantener foto, marca, menú completo, contenido y acceso a funciones. Respetar teclado, movimiento reducido y separación entre viajero y negocio. Conservar controles de cuentas, permisos, consentimiento y pagos de PRODUCT.md; la fusión no autoriza otro rediseño total ni ocultar herramientas.
