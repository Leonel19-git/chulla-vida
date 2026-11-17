---
name: CHULLA VIDA
description: Ecuador en primer plano: fotografía real, papel cálido y acciones claras.
colors:
  navy: "#103452"
  teal: "#087f87"
  paper: "#fbf7ee"
  surface: "#fffdf8"
  muted: "#455c61"
  line: "#dcded7"
  selected: "#e7efeb"
  primary-hover: "#1d5368"
  maize: "#efb22c"
  brand-red: "#c61534"
typography:
  display:
    fontFamily: "Archivo Variable, Archivo, sans-serif"
    fontSize: "clamp(40px, 4.3vw, 64px)"
    fontWeight: 600
    lineHeight: 1.06
    letterSpacing: "-.035em"
  expressive:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "1.18em"
    fontWeight: 450
    letterSpacing: "-.025em"
  headline:
    fontFamily: "Archivo Variable, Archivo, sans-serif"
    fontSize: "clamp(23px, 2.5vw, 30px)"
    fontWeight: 550
    letterSpacing: "-.025em"
  title:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "15px"
    fontWeight: 700
    lineHeight: 1.5
  body:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "16px"
    lineHeight: 1.6
  label:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "12px"
    fontWeight: 650
rounded:
  control: "8px"
  region: "10px"
  card: "14px"
  panel: "16px"
spacing:
  compact: "8px"
  control: "12px"
  regular: "16px"
  section: "24px"
  generous: "32px"
  wide: "48px"
components:
  button-primary:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.surface}"
    padding: "12px 20px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-conversation:
    textColor: "{colors.teal}"
    padding: "8px 0"
  navigation-active:
    backgroundColor: "{colors.selected}"
    textColor: "{colors.navy}"
    rounded: "{rounded.control}"
  destination-card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
---

# Design System: CHULLA VIDA

## Overview

**Creative North Star: "Ecuador en primer plano"**

Fotografías reales de Ecuador sobre papel cálido, con titulares breves y acciones claras. La portada tiene una voz editorial; las herramientas mantienen la densidad necesaria para explorar, planificar y operar. Este documento registra el código vigente de portada, carcasa e intro, y las primitivas compartidas observadas; no convierte cada pantalla histórica en un patrón aprobado.

La marca conserva el arte original y sus colores. La intro audiovisual culmina en el logo grande sobre azul y se detiene con acciones visibles. Las cuatro regiones conservan identidad y nombres; el paisaje aporta riqueza sin recargar la navegación.

**Key Characteristics:**
- Fotografía real y créditos consultables.
- Papel cálido, tinta azul y turquesa funcional.
- Archivo para jerarquía, Newsreader expresivo y Plus Jakarta Sans para operar.
- Navegación sólida, compacta y accesible desde móvil y escritorio.

## Colors

La base es cálida y tranquila; azul y turquesa organizan lectura y acción.

### Primary
- **Azul tinta** (`navy`): titulares, acción principal, cierre de intro y contenedores destacados.
- **Turquesa** (`teal`): conversación MIJIN, iconos activos, enlaces y foco de portada y carcasa.

### Secondary
- **Maíz** (`maize`): acento de marca y señal puntual de MIJIN. La llamada del pasaporte conserva su amarillo propio.
- **Rojo de marca** (`brand-red`): arte original y estados semánticos heredados; no es el color de selección de la nueva navegación.

### Neutral
- **Papel** (`paper`): fondo de contenido.
- **Superficie** (`surface`): navegación, tarjetas, leyendas sobre foto y controles.
- **Texto secundario** (`muted`): apoyo, ubicación y datos de ficha.
- **Línea** (`line`): divisiones discretas y contornos.
- **Selección suave** (`selected`): elemento activo de navegación; las regiones usan un lavado cercano propio.

**The Solid Caption Rule.** Las leyendas y créditos de la portada se apoyan en una superficie sólida para seguir siendo legibles al cambiar de fotografía.

## Typography

**Display Font:** Archivo Variable, Archivo, sans-serif.
**Body Font:** Plus Jakarta Sans, sans-serif.
**Expressive Font:** Newsreader, Georgia, serif.

Archivo aporta jerarquía directa; Newsreader se reserva como contraste expresivo en portada y cierre de intro. Plus Jakarta Sans conserva continuidad en controles, datos y catálogo.

### Hierarchy
- **Display:** escala fluida del frontmatter; en móvil cambia a `clamp(36px,10vw,48px)`, interlínea (1.02).
- **Expressive:** palabra en cursiva dentro del titular; en móvil la proporción es (1.1em). El cierre de intro usa Newsreader de peso (500).
- **Headline:** títulos de sección fluidos; las cabeceras de carrusel usan Plus Jakarta Sans (18px, 650).
- **Title:** nombres de destino; en móvil (14px).
- **Body:** apoyo de portada con ancho máximo (30ch); en móvil (14px).
- **Label:** navegación y datos compactos. Los datos de tarjeta bajan a (11px) en móvil; no trasladar ese tamaño a texto de lectura.

**The Operational Type Rule.** Los controles y datos del catálogo conservan Plus Jakarta Sans; el acento Newsreader no sustituye su voz funcional.

## Layout

Portada de dos columnas: texto ligeramente menor que la fotografía, con separación horizontal (36px) y vertical (24px). La fotografía crece dentro de su columna; la franja de cuatro regiones ocupa el ancho conjunto. Las acciones y el texto viven fuera de la foto.

A (1100px) se equilibran las columnas y se compactan las ventanas regionales. A (700px) la portada pasa a una columna: texto, acciones, paisaje de (220px) y cuatro ventanas que siguen en una fila. A (360px) se ajustan etiquetas y acciones y el paisaje mide (200px). El documento base admite (320px) de ancho mínimo.

La carcasa usa cabecera adhesiva y herramientas de escritorio debajo. A (700px), las herramientas ceden a cinco destinos inferiores con MIJIN al centro, área segura del dispositivo y reserva de espacio en el contenido. El menú conserva herramientas adicionales y modos de viajero/negocio. El pie móvil presenta dos columnas de grupos plegables con objetivos de (44px).

El ritmo compartido parte de pasos de (4px), con separaciones frecuentes registradas en frontmatter. Cultura Viva reserva (128px) a la derecha del encabezado para flechas de carrusel en pantallas desde (768px) con hover. Las fichas con cotización permiten precio y acción en líneas distintas.

## Elevation & Depth

La navegación y la portada descansan planas: superficies sólidas, líneas finas y cambios tonales. Las tarjetas de destino conservan una sombra ambiental tenue; al hover suben (3px) y aumenta su sombra. La reducción de movimiento elimina ese desplazamiento. El cierre de intro sí admite profundidad ambiental alrededor del arte; es un escenario de marca específico, no el tratamiento de todas las tarjetas.

### Shadow Vocabulary
- **Tarjeta en reposo:** `0 4px 12px #1034520d`.
- **Tarjeta al hover:** `0 8px 22px #10345214`.
- **Créditos abiertos:** `0 8px 24px #10345226`.
- **Arte de cierre:** `0 22px 64px #00142e59`.

**The Quiet Shell Rule.** La carcasa vigente usa fondos sólidos y selección tonal, sin añadir desenfoques ni sombras a su navegación.

## Shapes

Controles de curvas contenidas y tarjetas suavemente redondeadas según frontmatter. Las ventanas regionales tienen contorno fino y recorte de imagen. El paisaje usa una esquina inferior derecha menor que las otras (24px 24px 8px 24px); en móvil (18px 18px 6px 18px). Las acciones compactas conservan radios propios cercanos a los controles. Círculos para guardar y MIJIN, y píldoras para etiquetas, siguen siendo formas funcionales existentes.

## Components

### Buttons

Acciones legibles, con icono acompañado de texto. La principal de portada mide al menos (50px) de alto, con radio (9px); en móvil (46px). MIJIN es una acción turquesa sin fondo, de al menos (44px). El hover principal usa `primary-hover`. Foco visible turquesa (3px), separado (4px) en portada y (3px) en carcasa. La compra de tarjeta usa azul, radio de control y altura mínima (44px).

### Chips

Las etiquetas regionales compartidas conservan color semántico de región y forma de píldora; no sustituyen los botones fotográficos de región. Los avisos distinguen contenido referencial, demostración y estados conectados mediante texto explícito. El color no acredita verificación ni permisos.

### Cards / Containers

Tarjetas de destino con superficie clara, radio de tarjeta y foto (4:3); en móvil la foto cambia a (16:10). Cuerpo de (13px 14px 14px), o (10px 12px 12px) en móvil. Ubicación, hechos, precio y acción mantienen jerarquía; guardar aparece sobre superficie clara. Los desplegables de confianza y contenido secundario usan líneas, superficie clara y radios contenidos.

### Inputs / Fields

La búsqueda del catálogo conserva superficie clara, contorno fino, radio (12px) y altura mínima (52px). Su contenedor recibe foco mediante `:focus-within`, con anillo (2px) y separación (2px), mientras el campo interior permanece limpio. Formularios operativos conservan etiquetas visibles y mensajes de error textuales. Los deshabilitados muestran cursor de indisponibilidad; no convertir el foco o el error en un cambio de color aislado.

### Navigation

Barra lateral clara, iconos y etiquetas, selección suave y turquesa en icono activo. Objetivos de al menos (44px). Móvil: cabecera compacta, menú y cinco destinos inferiores; la acción MIJIN circular se eleva visualmente sobre la barra. El lanzador flotante se oculta para no duplicarla. Los avisos de privacidad se sitúan encima de la barra inferior. El cambio de modo no supone autorización del servidor.

### Regional windows

Cuatro botones con foto, nombre y `aria-pressed`. Hover y foco previsualizan el paisaje; activar filtra la región. El foco se distingue de la selección persistente. Fotografías de portada con texto alternativo; miniaturas regionales decorativas con alternativa vacía y nombre accesible en el botón. Créditos mediante desplegable.

### Intro and motion

Diálogo con título, entrada, salto, reproducción/pausa y cierre con Escape. Al finalizar el recorrido se mantiene el arte original grande y acciones visibles: entrar, pausar logo, repetir y saltar. El formato se adapta a retrato, paisaje y poca altura. No redibujar ni recrear el logo con texto.

La fotografía entra en (0.5s), con `cubic-bezier(.16,1,.3,1)`; el arte final llega en (0.72s) con la misma curva. La animación del sol del cierre termina tras una iteración de (8s). Los controles regionales cambian fondo y borde en (0.2s). Con movimiento reducido la foto y el cierre no animan y el vídeo no empieza solo; el usuario puede reproducirlo explícitamente. La aplicación detiene animaciones en pestañas no visibles. El contenido debe seguir disponible sin ejecutar una entrada animada.

## Do's and Don'ts

### Do:
- **Do** conservar el arte original de marca, fotografías existentes y créditos consultables.
- **Do** mantener acciones claras y detalles ampliables sin eliminar información útil.
- **Do** conservar foco visible, etiquetas accesibles y controles de movimiento.
- **Do** comprobar móvil y escritorio, incluidos contenido largo, cotizaciones y áreas seguras.

### Don't:
- **Don't** recuperar como norma los mundos históricos de álbum o navegación decorativa sustituidos por la portada vigente.
- **Don't** extender la sombra del cierre de intro a navegación y tarjetas comunes.
- **Don't** presentar una demostración o una preferencia visual como permiso, pago o visita verificada.

No canonizado: tamaños mínimos históricos de otras pantallas y etiquetas de introducción heredadas no constituyen una nueva escala tipográfica ni un patrón de encabezado; las reglas anteriores se limitan a componentes comprobados en el código vigente.
