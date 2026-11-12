# CHULLA VIDA

<!-- impeccable:product-schema 1 -->

## Platform
web

## Users
Viajeros jóvenes (wambras) que quieren descubrir y organizar experiencias en Ecuador. Negocios y comunidades anfitrionas que publican experiencias y gestionan sus propias solicitudes. Esta distribución fue confirmada por el usuario.

## Product Purpose
Facilitar turismo sostenible y personalizado en Ecuador, con exploración, planificación y favoritos para visitantes, y un espacio de gestión separado para anfitriones.

## Capabilities and Constraints
Aplicación existente React, TypeScript y Vite. La versión actual funciona localmente en el navegador; no cuenta con autenticación, pasarela de pagos real, mensajería externa ni sincronización entre usuarios. El checkout tiene tres pasos con fecha, grupo, total y métodos simulados: tarjeta ficticia con aprobación/rechazo, transferencia pendiente y QR Deuna de texto sin cobro. Su comprobante es de demostración. «Mis viajes y pagos» separa el estado de la prueba de la respuesta del negocio; una aprobación simulada no implica disponibilidad ni pago real. No recoger datos bancarios, inventar certificaciones ni indicar mensajes enviados.

El modelo de membresía se representa como demostración local por instrucción del usuario: semanal $2,99 por 7 días, mensual $4,99 por mes calendario y anual $49,99 por año calendario. Ruta sin internet y Comunidad wambra requieren cualquier plan activo; pasaporte premium requiere anual activo. La activación es explícita y ficticia. Cancelar renovación conserva acceso hasta vencer; no hay renovación ni cargo automático real. Un plan vencido vuelve a cerrar esas funciones. El pasaporte básico permanece gratuito y reúne un sello animado por destino de las visitas del viajero con llegada registrada. Los sellos de prueba se distinguen y no acreditan visitas ni premios.

«Cobros y retiros» muestra el pago del viajero a CHULLA VIDA, comisión del 10% y neto del 90% al negocio, por cobro en centavos. Cuenta pagos demo aprobados y aceptados del negocio seleccionado, sin pendientes, canceladas o duplicadas. El neto queda retenido hasta registrar por código la llegada de una solicitud confirmada y demo aprobada, desde su fecha de visita en Ecuador. Los retiros son solicitudes ficticias con confirmación, cuenta fija de prueba e historial; asignan cada visita una sola vez y se guardan aparte de liquidaciones reales. Cambios posteriores que afectan un retiro producen revisión, sin saldo negativo ni reembolso inventado. Nunca afirmar transferencia realizada.

Las restricciones de planes y perfiles son controles locales de interfaz, no autorización de servidor ni una barrera de pago segura. La publicación del frontend no añade esos servicios. El proyecto está vinculado a Vercel como `chulla-vida`, con despliegue de esta actualización aún pendiente de ejecución y comprobación.

Ruta sin señal ofrece un esquema interactivo con cuatro paisajes regionales, instantánea validada en el navegador, indicador de conexión, vista de prueba sin conexión y descarga HTML autónoma en el idioma elegido. La descarga abre desde disco sin red; la primera apertura de la aplicación web requiere conexión. No hay service worker, navegación GPS ni cálculo de carreteras. El origen propone 28 ciudades ecuatorianas y permite escribir otra. El catálogo tiene 28 destinos; las propuestas añadidas son ideas orientativas, sin presentarse como negocios verificados. El presupuesto del grupo parte de $20; transporte y extras se revisan por separado.

La interfaz ofrece español, inglés, francés, portugués y chino simplificado. Kichwa Sierra y Amazonía cambian la interfaz mediante 644 frases de una base editorial unificada, con navegación, planificador, ruta offline, planes, pasaporte y cobros. No son dos dialectos validados: ambas opciones muestran un aviso de borrador con revisión regional pendiente. Algunos textos largos del checkout y publicación conservan el español por falta de traducción; la cobertura aún es parcial en esas pantallas. Los nombres propios, relatos locales y contenido del usuario conservan su idioma original. El selector aparece en bienvenida y cabecera, persiste en el navegador y actualiza el idioma del documento.

## Brand Commitments
Nombre CHULLA VIDA. Usar wambras como nombre de la audiencia. Reutilizar el logo actualizado aportado el 23 de octubre en public/chulla-vida-logo.png: sus paisajes se ensamblan y su sol gira, con pausa y repetición. La intro aparece en cada carga con selector visual Sierra/Costa/Amazonía y espera «¡De ley, vamos!», salto o Escape. Respetar movimiento reducido y ofrecer reproducción solo por acción explícita. Colores naturales andinos con azul, turquesa, maíz y rojo del logo. Español ecuatoriano juvenil, breve y claro; iconos informativos y detalle ampliable en lugar de párrafos en cada tarjeta.

## Evidence on Hand
Proyecto web adjunto en C:/Users/leone/Downloads/workspace-cf86751b-0d45-494b-8d28-f14e0ef711c6 y ocho capturas del planificador. Catálogo de experiencias existente de demostración en src/data/mockData.ts. El usuario compartió la playlist Spotify 1YViurI7F7HxTMSS0DiabA (Folklore ecuatoriano) y pidió botones sociales simulados, colores naturales andinos y una intro con su logo animado.

## Product Principles
- Separar los recorridos y herramientas de viajeros y negocios.
- Las preferencias deben modificar las recomendaciones.
- Preservar información útil del catálogo e indicar su carácter orientativo.
- Hacer las acciones claras, accesibles y utilizables en móviles.
- Hacer visible la bienvenida y los resultados de cada paso, sin impedir saltarlos o volver atrás.
- Mantener independientes la aprobación de pago de prueba y la confirmación de una solicitud.
- Priorizar fotografías, iconos con texto y datos breves; conservar la información completa en pestañas y desplegables.
- Describir el alcance offline con precisión: ruta descargada disponible sin red, sin prometer que toda la web arranque offline.
- Hacer visibles precio, vigencia y alcance de cada plan demo; distinguir pasaporte básico gratuito, premium anual y sellos de prueba.
- Mostrar comisión, saldo retenido, saldo habilitado e historial sin presentar cobros o retiros ficticios como dinero real.
