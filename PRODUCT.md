# CHULLA VIDA

<!-- impeccable:product-schema 1 -->

## Platform
web

## Users
Wambras que descubren y organizan viajes por Ecuador desde el celular o una computadora. Anfitriones, comunidades y negocios con un recorrido separado para sus publicaciones y solicitudes.

## Product Purpose
Acercar a los jóvenes a Ecuador mediante experiencias locales, planificación por preferencias y presupuesto, cultura y un pasaporte de viaje.

## Capabilities and Constraints
Aplicación React, TypeScript y Vite con 51 fichas referenciales, fotos acreditadas, cuatro regiones, búsqueda, favoritos, planificador, MIJIN y Cultura Viva. Los precios del catálogo son orientativos y no implican disponibilidad ni venta habilitada. Presupuesto de grupo desde $20; transporte y extras se revisan aparte.

La extensión conectada usa Supabase para cuentas, organizaciones y solicitudes; API y reglas de base de datos deciden permisos y estados de pago. Elegir el modo negocio en una demostración no concede autorización de servidor. Las compras conectadas requieren una sesión válida y correo verificado, una oferta habilitada, confirmación del anfitrión y términos vigentes aceptados. El servidor calcula los importes y verifica el resultado con el proveedor. El formulario de tarjeta pertenece a PayPhone; CHULLA VIDA no recibe datos de tarjeta. El retorno del navegador no acredita pago.

Los cobros conectados están desactivados hasta configurar y validar el proveedor, los requisitos comerciales y los servicios necesarios. La interfaz distingue la demostración local del pago conectado. Las pruebas locales no rellenan `pagado_en`, no crean ingresos ni acreditan una liquidación real.

Planes de referencia solicitados: semanal $2,99, mensual $4,99 y anual $49,99. La antigua ruta premium, Comunidad wambra y pasaporte premium se muestran como funciones de membresía (premium exclusivo anual). No existe todavía una compra conectada de suscripciones. En la web publicada se rechazan las membresías guardadas en el navegador y la activación ficticia está deshabilitada. La simulación histórica de planes se conserva solo en desarrollo.

El pasaporte básico y los sellos de prueba se distinguen de visitas verificadas. Billetera, solicitudes de retiro y comisión 10% deben distinguir siempre simulación y datos conectados. Ninguna prueba implica dinero transferido.

La biblioteca de fichas y el itinerario HTML se guardan en el dispositivo. La versión HTTPS utiliza service worker para apertura sin red tras cargar los recursos; puede depender del almacenamiento del navegador. Las fichas descargadas son una instantánea. IA remota, clima, cuentas, disponibilidad y transacciones necesitan internet. El esquema de ruta no es navegación GPS.

Idiomas: español, inglés, francés, portugués, chino y borradores de Kichwa Sierra y Amazonía. Las dos opciones Kichwa comparten una base de trabajo y requieren revisión comunitaria; no presentarlas como dialectos certificados. Mantener nombres propios, relatos y contenido de usuarios en su idioma. Algunas pantallas históricas tienen cobertura parcial.

## Brand Commitments
CHULLA VIDA; audiencia: wambras. Mantener el logo original actualizado y los activos de marca existentes, sin redibujar su arte. La intro conserva el recorrido audiovisual y termina con el logo original grande y animado; debe poder saltarse, pausarse y repetirse. Movimiento reducido muestra una alternativa estática.

Dirección confirmada por el usuario el 16 de noviembre: portada editorial de viajes con fotografías grandes, pocos textos y detalle al abrir cada destino. Papel cálido, azul del logo y turquesa; maíz y rojo como acentos medidos. Preservar las funciones y los datos del trabajo existente. El concepto de álbum anterior ya no dirige la portada.

Usar frases ecuatorianas breves y comprensibles, iconos acompañados por etiquetas, contraste legible y acciones táctiles. Escritorio y móvil son igualmente importantes. La barra lateral se mantiene accesible; el móvil tiene cinco accesos inferiores y herramientas adicionales en el menú.

## Evidence on Hand
Logo original en public/brand y public/chulla-vida-logo.png; fotografías y créditos en public/images; vídeo y créditos en public/video. Playlist Sierra 1YViurI7F7HxTMSS0DiabA, Costa 18gSr3UmtEr6wuDRWSD4yX y Amazonía 5nRsIgwAyODNTv4V6JzUZp. Botones sociales simulados, sin inventar perfiles reales. Proyecto independiente en C:/Users/leone/Desktop/CHULLA VIDA y publicación vinculada a https://chulla-vida.vercel.app/.

## Product Principles
- Explorar sin cuenta; comprobar autorización en el servidor para datos privados y operaciones conectadas.
- Separar las herramientas de viajeros y negocios.
- Fotografía y acciones claras primero; información completa en detalles, pestañas y desplegables.
- Preservar las preferencias, favoritos y recomendaciones al cambiar el diseño.
- Mostrar de forma honesta qué está verificado, qué es referencial y qué es una prueba.
- Mantener precio, moneda, comisión, estado y entorno de pago visibles antes de confirmar.
- Respetar movimiento reducido, teclado, lectores de pantalla y pantallas pequeñas.

## Dirección visual vigente — 16 de noviembre de 2026

El dueño eligió la dirección **«Álbum del Ecuador»** (rediseño completo; sustituye al mundo visual anterior de papel crema, serif y barra lateral, y a cualquier variante «papel cálido»). Compromisos de marca que mandan sobre lo descrito arriba cuando haya conflicto:

- CHULLA VIDA es un álbum de cromos: cada lugar es un cromo numerado (01–51), los sobres son sugerencias de MIJIN, «Mi sobre» reúne guardados y Mi viaje, y solo una visita verificada «pega» el cromo con brillo.
- Tintas planas a página completa (maíz, azul noche, azul cumbre, turquesa, verde selva, lava, rojo) y la familia Archivo Variable; no usar crema, Newsreader ni Plus Jakarta Sans en lo nuevo.
- Logo 2026 (`public/brand/`) siempre como sticker blanco troquelado. La intro sale solo en la primera visita y **termina con el logo**.
- Navegación única: barra superior en escritorio y barra inferior de cinco destinos en móvil (Álbum, Fiestas, MIJIN, Mi sobre, Yo). Las pantallas del prototipo antiguo dejan de mostrarse.
- Se puede ver el álbum sin cuenta; comprar, pagar, pedir información, la billetera y el pasaporte exigen cuenta con correo verificado, y el servidor decide importes y estados de pago. Las membresías no se activan desde el navegador en producción.
- Detalle completo en `.impeccable/album-direction.md`; `DESIGN.md` se reescribe al terminar la obra con el mundo construido.

## Corrección del propietario · 17/11/2026

Refinar conservando la identidad; no sustituir de nuevo toda la plataforma. El nombre es **Cultura Viva**, también en navegación móvil y tutorial, no «Fiestas». La página presenta al inicio su objetivo: conectar viajeros con comunidades y anfitriones, respetando cultura y naturaleza. El álbum acompaña el turismo; no sustituye su propósito. Ampliar celebraciones de las cuatro regiones con fuentes y fechas honestas, manteniendo cartas, fotos acreditadas y giro horizontal.

## Instrucción vigente del propietario · recuperación del 17/11/2026

La dirección Álbum del Ecuador quedó revocada para la portada y el catálogo. Recuperar la presentación de GitHub c0f8bcc: foto grande, texto original, menú y herramientas completas. Mejorar sobre esa base conservando identidad y contenido; las correcciones técnicas y de seguridad se mantienen. Los cromos pertenecen al pasaporte y Cultura Viva conserva nombre y 39 celebraciones. DESIGN.md y docs/RECUPERACION_GITHUB_20261117.md documentan la base comprobada.
