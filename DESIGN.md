---
name: CHULLA VIDA · Álbum del Ecuador
colors:
  ink: "#012960"
  paper: "#ffffff"
  paper-2: "#f1f5fa"
  maize: "#ffc83d"
  sierra: "#1d6fe0"
  costa: "#0db5ae"
  amazonia: "#27b263"
  galapagos: "#18222d"
  red: "#d11f3a"
typography:
  family: "Archivo Variable"
  displayWeight: 900
  displayStretch: "62%"
  bodySize: "16px"
---

# Álbum del Ecuador

Dirección elegida por el propietario: un álbum de cromos que se llena con lugares de Ecuador. La portada maíz reúne un titular condensado y un sobre que descubre tres destinos. No hay barra lateral. Las 51 fichas conservan sus datos, fotografías y fuentes.

## Fuente de verdad

Tokens en `src/styles/album/tokens.css`; composición y tratamiento compartido en `src/styles/album/platform.css`; portada y cromos en `src/features/album/`. Numeración estable y consecutiva por región en `src/domain/album/index.ts`: Sierra 01–13, Costa 14–20, Amazonía 21–39 y Galápagos 40–51.

## Tipografía y jerarquía

Archivo Variable se sirve desde el propio sitio. Titulares condensados, peso 850–900 y mayúsculas; cuerpo de 16 px, campos de al menos 16 px y etiquetas breves. Los números usan cifras tabulares. Los componentes heredados cargados en diferido reciben el tratamiento del álbum mediante selectores específicos. No introducir serif editorial nueva.

## Portada y navegación

Cabecera blanca con logo original, Álbum, Fiestas, MIJIN, Mi sobre, idioma y cuenta. En móvil, cinco destinos inferiores y espacio reservado para la zona segura. Los negocios tienen accesos propios: panel, experiencias, cobros, guía y cuenta; el cambio de rol es explícito.

La portada tiene maíz a todo ancho y un abanico de tres cromos. El sobre abre los tres destinos y permite guardarlos o cambiar el sobre. Un cromo reproduce el video local con pausa; con movimiento reducido o ahorro de datos conserva la foto. No presenta estas sugerencias como generadas por una IA remota.

## Componentes

- Cromos blancos de proporción aproximada 3:4, fotografía real, número regional, corazón y precio referencial. Al girar muestran resumen, datos, ficha, compra y crédito. La cara oculta es inerte.
- Regiones en carruseles horizontales; búsqueda y filtros conservan la rejilla de resultados. Los colores distinguen páginas del álbum, sin representar permisos o verificaciones.
- Diálogos blancos con encabezado condensado y cierre de 44 px. La ficha coloca precio y acción de compra antes del resumen desplegable.
- Botones azul noche con texto blanco y respuesta de presión; el maíz distingue el acceso a MIJIN en móvil.
- Fiestas usa rojo de marca, fotografías acreditadas y cartas que giran. Pasaporte y confianza amplían el detalle solo cuando se solicita.
- Registro y panel de negocio usan campos claramente rotulados, estados de carga, error y recuperación. Una cifra desconocida se muestra como «—», no como éxito o ingreso cero inventado.

## Movimiento e intro

La intro usa videos originales en MP4/WebM, con fotografía de respaldo, reproducción voluntaria si hay movimiento reducido, y cierre con el logo original grande sobre maíz. Girar un cromo tarda 480 ms; con movimiento reducido las caras cambian sin giro. Los videos se pausan al ocultar la pestaña. No se descarga el modelo de voz sin permiso.

## Estado y confianza

Guardar, comprar y visitar son acciones diferentes. Las compras de prueba se rotulan sin valor de cobro; la visita real solo se acredita mediante validación autorizada. El navegador no decide permisos ni importes comerciales. Registro y cédula distinguen formato válido de identidad verificada; solo se guarda un resumen de cuatro dígitos. La cuenta bancaria del negocio la cambia únicamente su propietario.

## Móvil y accesibilidad

Comprobado en Chromium de escritorio, Pixel 7 y WebKit con iPhone 13; sin desborde horizontal en los recorridos revisados. Campos de 16 px, foco visible, navegación por teclado, caras inertes, zonas seguras y movimiento reducido. El tutorial apunta a elementos existentes y vuelve arriba al terminar. No equivale a probar audio o autocompletado en un teléfono físico.

## Figma

Archivo creado: https://www.figma.com/design/S5LD6rUB25BIr2GE2efYaJ . La cuenta Starter alcanzó el límite de llamadas antes de crear los marcos editables; el archivo aún no contiene la réplica del sitio. La implementación y las capturas locales son la referencia comprobada.
