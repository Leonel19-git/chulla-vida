# CHULLA VIDA

Selector persistente de español, inglés, francés, portugués, chino simplificado y dos opciones de Kichwa. Sierra y Amazonía cambian realmente la interfaz mediante una base editorial unificada de 635 frases; son un borrador común pendiente de revisión regional, no dos dialectos validados. Incluye navegación, planificación, ruta descargable, planes, pasaporte y cobros. Algunos textos largos de checkout y publicación conservan el español de origen, al igual que relatos locales, nombres propios y contenido del usuario. Detalles en `src/i18n/README.md`.

La versión incorpora membresías de demostración, pasaporte con sellos animados y «Cobros y retiros» para negocios. Toda la economía es simulada: no hay cobros, transferencias, suscripciones recurrentes reales ni proveedor de pagos conectado.

El catálogo reúne 28 destinos de las cuatro regiones y el presupuesto comienza en $20 para el grupo. Las propuestas económicas son paseos locales estimados: traslados, alojamiento y entradas especiales solo se incluyen si la ficha lo indica. Galápagos no incluye vuelos ni tasas de acceso.

Filtros ilustrados y rutas offline comparten cuatro paisajes regionales. El HTML descargado lleva su propio arte y textos traducidos, sin recursos externos. El mapa es esquemático; la web completa requiere conexión para abrirse inicialmente.

Aplicación web de turismo sostenible y personalizado en Ecuador, diseñada para wambras y negocios locales.

## Ejecutar

Requiere Node.js y npm.

```sh
npm install
npm run dev
```

Abre la dirección local que imprime Vite. Si el puerto 5173 está ocupado, Vite utiliza el siguiente disponible.

## Comprobar

```sh
npm run build
node scripts/verify-domain.mjs
node scripts/verify-membership.mjs
node scripts/verify-wallet.mjs
node scripts/verify-i18n.mjs
```

Las comprobaciones cubren reglas de reservas y llegadas, recomendaciones, almacenamiento, membresías y vencimientos, permisos del prototipo, comisión del 10%, saldo retenido, retiros repetidos y composición de traducciones. La cobertura de traducción no certifica su corrección lingüística.

## Perfiles

- **Viajero:** explorar, planificar, guardar favoritos, probar reservas y reunir sellos en el pasaporte básico gratuito. Una membresía activa habilita la ruta offline y Comunidad wambra; el plan anual también habilita el pasaporte premium. El checkout de experiencias conserva tres pasos y distingue aprobación simulada de confirmación del negocio.
- **Negocio:** publicar y editar experiencias, precios y cupos, revisar solicitudes del negocio seleccionado, aceptarlas o cancelarlas y exportarlas a CSV. «Cobros y retiros» muestra el reparto 90%/10%, valida la llegada por código y permite solicitar un retiro ficticio del saldo habilitado.

El botón «Tengo un negocio» cambia al espacio de gestión. El selector «Negocio de demostración» permite probar varios negocios del catálogo, sin representar autenticación real.

## Marca y contenido

- Nombre de la aplicación: **CHULLA VIDA**.
- Audiencia: **wambras**.
- Logo original del usuario: `public/chulla-vida-logo.jpeg`.
- Preguntas del planificador adaptadas de las ocho capturas y del proyecto web adjunto.
- Origen con 28 ciudades de Ecuador y entrada personalizada. Nuevas ideas de escapada: Baños, Mindo, Cuenca, Cotopaxi, Otavalo y Mompiche, con fotografías y precios orientativos; no representan negocios verificados.
- Fuentes y licencias de imágenes: `public/images/CREDITS.md`.
- Spotify: «Folklore ecuatoriano», playlist compartida por el usuario, como selección principal; recomendaciones adicionales con reproductor bajo demanda y enlaces directos.
- Redes sociales: botones simulados de Instagram, Facebook y TikTok con aviso de demostración, sin abrir cuentas externas.
- Paleta natural andina con los colores del logo: azul, turquesa, maíz y rojo sobre papel cálido y verde páramo. Texto breve y expresiones ecuatorianas como «panas», «de ley» y «ve pilas».
- Logo original separado visualmente en paisajes, sol y nombre: las piezas se ensamblan y el sol gira, con pausa y repetición. La intro permite cambiar entre Sierra, Costa y Amazonía; aparece en cada carga y permanece hasta «¡De ley, vamos!», «Saltar intro» o Escape. Se puede repetir desde encabezado, menú y pie. Movimiento reducido muestra el logo estático; reproducirlo requiere una acción explícita. La animación se pausa fuera de pantalla o con la página oculta. Sin sonido ni música automática.

## Membresías y pasaporte

| Plan de demostración | Precio USD | Acceso |
| --- | --- | --- |
| Semanal · 7 días | $2,99 | Ruta sin internet y Comunidad wambra |
| Mensual · 1 mes | $4,99 | Ruta sin internet y Comunidad wambra |
| Anual · 1 año | $49,99 | Lo anterior y pasaporte premium |

La activación se realiza con una acción explícita de prueba, sin tarjeta ni cobro. La selección y su vencimiento se guardan localmente; los meses y años usan calendario y ajustan el último día cuando corresponde. Cancelar la renovación conserva el acceso hasta el vencimiento. No existe renovación ni cargo automático real. Al vencer, las funciones de membresía vuelven a pedir un plan activo; el pasaporte básico y los sellos guardados permanecen disponibles. Activar otro plan inicia un nuevo período demo, sin prorrateos ni cargos reales.

El pasaporte básico es gratuito. Recoge un sello por destino de las visitas del viajero que tienen llegada registrada por el negocio; los sellos se animan y se organizan por región. «Probar sello» es una demostración visual explícita y no fabrica una visita verificada. El acabado premium corresponde exclusivamente a una membresía anual activa.

Estos accesos son controles de interfaz y estado local de un prototipo. No son una barrera de pago segura ni autorización de servidor. Un HTML ya descargado sigue disponible sin red y no se revoca al vencer el plan.

## Llevar una ruta sin internet

Con una membresía demo activa, abre «Ruta sin señal» desde la portada o la navegación. El esquema interactivo permite seleccionar hasta tres paradas y consultar días, presupuesto e información útil. Los paisajes y nodos regionales animados se pueden recorrer con teclado y respetan movimiento reducido. Puedes actualizarlo con tus preferencias, guardarlo en este navegador y descargar un HTML autónomo para abrir desde Descargas sin red. Su contenido no depende de imágenes, fuentes, scripts ni servicios externos.

El indicador refleja la conexión del navegador; «Vista sin conexión» permite previsualizar ese estado. El mapa es un esquema, sin GPS, carreteras ni cálculo de trayectos. La descarga funciona sin internet; la aplicación web necesita conexión para su primera apertura y no instala un service worker.

## Probar los pagos

Desde una experiencia, abre «Reservar y probar pago». Elige fecha y personas, revisa el total y selecciona un método:

- **Tarjeta:** utiliza una tarjeta ficticia fija, sin campos bancarios. Puedes probar aprobación o rechazo; el rechazo permite reintentar sin crear una solicitud.
- **Transferencia:** guarda una referencia ficticia pendiente. «Mis viajes y pagos» permite completar su aprobación simulada.
- **Deuna · demo:** muestra un QR que contiene únicamente `CHULLA-VIDA:DEMO`, sin destino de cobro.

La simulación presenta progreso y un comprobante descargable claramente marcado como demostración. Una prueba aprobada no confirma la disponibilidad: esa respuesta sigue correspondiendo al negocio. El estado de prueba se conserva en `pago_demo`; no cambia la solicitud a «pagada» ni genera una liquidación.

## Probar cobros y retiros del negocio

El modelo mostrado es: el viajero paga a CHULLA VIDA; la plataforma conserva el 10% y el negocio recibe el 90%. El libro demo calcula cada cobro en centavos y asigna al negocio el resto exacto después de redondear la comisión. Solo cuenta pagos demo aprobados en solicitudes aceptadas; pendientes, canceladas, referencias duplicadas y otros negocios no aportan saldo.

El importe del negocio queda retenido hasta que registra la llegada. En esta demostración requiere solicitud confirmada, pago demo aprobado, fecha de visita alcanzada en Ecuador y código completo o contenido exacto de su QR. La llegada habilita el saldo y el sello del viajero; no convierte el pago en real.

«Simular retiro» muestra el importe y una cuenta ficticia fija, y solicita confirmación sin pedir datos bancarios. Cada solicitud asigna visitas concretas, se persiste aparte de las liquidaciones reales y reduce el saldo disponible. Un segundo clic no vuelve a retirar esas visitas. Las cancelaciones posteriores generan un aviso de revisión, sin fabricar devoluciones ni saldo negativo. El historial dice «solicitud demo», no transferencia realizada.

## Alcance de esta versión

La aplicación funciona como demostración local. Preferencias, favoritos, publicaciones, solicitudes, membresía, retiros ficticios y la instantánea de ruta se conservan en localStorage del navegador, con validación y claves versionadas. El catálogo incorpora las nuevas ideas por ID y conserva los cambios previamente guardados. No hay sincronización entre dispositivos ni entre personas. El selector de negocios es una herramienta de prueba, no aislamiento de cuentas autenticadas.

No procesa pagos reales, no recoge números de tarjeta y no envía WhatsApp/SMS ni confirma reservas externas. Las solicitudes y los comprobantes se muestran como pruebas locales. Las imágenes y tarifas del catálogo son orientativas. La cercanía y el origen se guardan como preferencias; no se calculan trayectos reales.

Para operar con clientes reales hacen falta servidor, autenticación con propiedad de cada negocio, base de datos, disponibilidad compartida y los servicios de reservas/pagos que el propietario decida contratar.

## Publicación

Publicado y verificado sin autenticación de Vercel en **https://chulla-vida.vercel.app/**. Despliegue de producción `dpl_HcHn4c1pvg3L2WoA3M2cwtiecKUt`, proyecto `chulla-vida`. Publicar el frontend no agrega autenticación, servidor ni pagos reales.

El QR público está en `output/chulla-vida/` (PNG de 1200 px y SVG); el cartel A4 en `output/pdf/chulla-vida-qr.pdf`. El paquete `output/chulla-vida-completo.zip` incluye ambos QR, el PDF y la guía con el enlace. QR y PDF se decodificaron independientemente para comprobar que apuntan al enlace público.

## Estructura principal

- `src/App.tsx`: estructura, navegación y separación de perfiles.
- `src/components/chulla/`: catálogo, favoritos, fichas con pestañas, rutas, checkout de demostración, ayuda, cultura, comunidad, Spotify y logo animado.
- `src/components/onboarding/`: planificador de ocho preguntas.
- `src/components/host/`: publicación y gestión del negocio.
- `src/context/AppContext.tsx`: acciones y persistencia.
- `src/context/MembershipContext.tsx`: membresía demo, vencimiento y acceso de interfaz.
- `src/components/chulla/MembershipPlans.tsx` y `PassportView.tsx`: planes y pasaporte.
- `src/components/host/BusinessWallet.tsx`: reparto, validación de llegadas e historial de retiros demo.
- `src/lib/`: recomendaciones, almacenamiento y generación/validación del HTML de ruta sin conexión.
- `src/lib/membership.ts` y `business-wallet.ts`: reglas puras de membresía, sellos y libro demo en centavos.
- `scripts/verify-domain.mjs`: comprobaciones reproducibles sin dependencias de pruebas adicionales.
