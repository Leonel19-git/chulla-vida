import { Place, Raymi, Reservation, ChatMessage, PartnerDiscount, SettlementRecord } from '../types';

// Destination ideas are demonstration content, with no represented business or bookable inventory.
const destinationIdea = (details: Pick<Place, 'id' | 'slug' | 'titulo' | 'region' | 'provincia' | 'canton_parroquia' | 'descripcion_corta' | 'precio_base_pp' | 'duracion_dias' | 'nivel_aventura' | 'imagenes' | 'etiquetas'> & Partial<Pick<Place, 'que_incluye' | 'que_no_incluye' | 'recomendaciones_eco'>>): Place => ({
  ...details,
  comunidad_nombre: 'Idea de escapada · CHULLA VIDA',
  historia_ancestral: 'Una idea para armar tu próxima salida. Esta ficha es de demostración: el recorrido y el presupuesto se pueden probar en la app; no representan una oferta de un negocio.',
  datos_curiosos: ['Guarda el destino y combínalo con tu plan.', 'La fotografía es una referencia regional, no del recorrido exacto.'],
  clima: 'Revisa el pronóstico antes de salir',
  altitud: 'Depende del recorrido que elijas',
  mejor_epoca: 'Confirma clima, accesos y horarios antes de viajar',
  cupos_disponibles_dia: 10,
  que_incluye: details.que_incluye || ['Idea de recorrido para tu plan', 'Presupuesto de ejemplo por persona'],
  que_no_incluye: details.que_no_incluye || ['Servicios reales, entradas, transporte, comida y alojamiento'],
  recomendaciones_eco: details.recomendaciones_eco || ['Lleva tu tomatodo y regresa con tus residuos.', 'Respeta los senderos y pide permiso antes de fotografiar a alguien.'],
  sellos: { bueno: 0, bonito: 0, barato: 0, seguro: false, votos_totales: 0, verificado_gad: false },
  es_destacado: false,
  contacto_whatsapp: '',
  telefono_llamadas: '',
  preguntas_frecuentes: [
    { pregunta: '¿Puedo reservar esta escapada?', respuesta: 'Puedes probar la solicitud en la demo. No contrata servicios ni garantiza disponibilidad real.' },
    { pregunta: '¿El precio es una tarifa real?', respuesta: 'Es un presupuesto de ejemplo. Confirma el costo y las condiciones con un proveedor antes de viajar.' },
  ],
  cooperativa_pago: { nombre_banco: '', tipo_cuenta: '', numero_cuenta: '', titular: '' },
  reviews: [],
});

export const INITIAL_PLACES: Place[] = [
  {
    id: 'place-saraguro',
    slug: 'saraguro-ancestral-loja',
    titulo: 'Saraguro Ancestral: Sabiduría, Hilado y Chakra Viva',
    comunidad_nombre: 'Comunidad Kichwa Saraguro (Red Saraurku)',
    region: 'Sierra',
    provincia: 'Loja',
    canton_parroquia: 'Saraguro / San Lucas',
    descripcion_corta: 'Inmersión en la cosmogonía andina, tejido de lana en telar de cintura, gastronomía de maíz y convivencia en casas tradicionales.',
    historia_ancestral: 'Los Saraguros son uno de los pueblos más dignos y celosos de su identidad en Sudamérica. Conservan su vestimenta tradicional en negro y blanco (símbolo de elegancia y respeto a la Pachamama), sus sombreros de ala ancha pintados y la práctica de la minga comunitaria comunal.',
    datos_curiosos: [
      'El color negro de su vestimenta no es por luto, sino por la finura y elegancia del vellón de borrego negro.',
      'Poseen huertos medicinales familiares con más de 60 variedades de plantas sagradas.',
      'El cuy asado en leña con papas chauchas y ají de pepa de zambo es su plato ceremonial cumbre.'
    ],
    clima: 'Templado de montaña (12°C - 19°C)',
    altitud: '2.520 m.s.n.m.',
    mejor_epoca: 'Todo el año (Especialmente durante el Kapak Raymi en Diciembre)',
    precio_base_pp: 45,
    duracion_dias: 2,
    cupos_disponibles_dia: 8,
    nivel_aventura: 'Tranqui',
    imagenes: [
      'https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80'
    ],
    etiquetas: ['Cultura Viva', 'Textilería Andina', 'Gastronomía Ancestral', 'Chakra', 'Fotografía'],
    que_incluye: [
      '1 noche de hospedaje en casa comunitaria tradicional con fogón',
      '3 comidas ancestrales preparadas con ingredientes de la chakra orgánica',
      'Taller interactivo de tejido en telar de cintura y orfebrería de chaquira',
      'Guianza nativa certificada por un sabio local (Yachak)',
      'Ceremonia de agradecimiento a la Pachamama con sahumerio de palo santo y flores'
    ],
    que_no_incluye: [
      'Artesanías en plata y chaquiras (Opcional, en efectivo directo a la tejedora)',
      'Transporte interprovincial hasta la terminal de Saraguro',
      'Propinas voluntarias al cabildo de la comunidad'
    ],
    recomendaciones_eco: [
      'Solicitar permiso verbal a los taitas y mamas antes de tomar fotografías de cerca.',
      'Llevar termo y cantimplora reutilizable (comunidad libre de plásticos de un solo uso).',
      'Aceptar los alimentos con ambas manos como gesto de gratitud andina.'
    ],
    sellos: {
      bueno: 48,
      bonito: 52,
      barato: 44,
      seguro: true,
      votos_totales: 56,
      verificado_gad: true,
    },
    es_destacado: true,
    etiqueta_plan_pagado: 'Comunidad Destacada del Mes',
    contacto_whatsapp: '+593987654321',
    telefono_llamadas: '+59372551020',
    preguntas_frecuentes: [
      {
        pregunta: '¿Cómo llego en bus público desde Cuenca o Loja?',
        respuesta: 'Las cooperativas Cooperativa Loja y Viajeros salen cada 45 minutos desde Cuenca y Loja. El bus te deja en el parque central de Saraguro, donde el gestor comunitario te recibe en camioneta comunitaria.'
      },
      {
        pregunta: '¿Hay señal de celular o WiFi?',
        respuesta: 'Hay buena señal de Claro y Movistar en el centro de Saraguro. En la casa comunitaria hay WiFi comunitario solar de 15 Mbps.'
      },
      {
        pregunta: '¿Tienen opciones para vegetarianos o veganos?',
        respuesta: '¡Por supuesto! La comida andina es rica en choclo, habas, mellocos, sambo, quinua y aguacate local.'
      }
    ],
    cooperativa_pago: {
      nombre_banco: 'Cooperativa de Ahorro y Crédito Mushuc Runa',
      tipo_cuenta: 'Ahorros Comunal',
      numero_cuenta: '29018471920',
      titular: 'Asociación Comunitaria Saraurku Saraguro'
    },
    reviews: [
      {
        id: 'rev-1',
        usuario_nombre: 'Mateo Viteri (Quito)',
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
        fecha: 'Hace 3 días',
        comentario: 'La calidez de la Mama Rosa nos dejó con el corazón lleno. El telar es pura matemática ancestral. ¡Y el locro de zambo fue de otro planeta!',
        foto_url: 'https://images.unsplash.com/photo-1516214104703-d870798883c5?auto=format&fit=crop&w=600&q=80',
        sellos_otorgados: { bueno: true, bonito: true, barato: true, seguro: true }
      },
      {
        id: 'rev-2',
        usuario_nombre: 'Sophie Dupont (Francia)',
        avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
        fecha: 'Hace 1 semana',
        comentario: 'Very safe for solo female backpackers. The QR voucher worked smoothly without asking for any extra money at arrival.',
        sellos_otorgados: { bueno: true, bonito: true, barato: true, seguro: true }
      }
    ]
  },
  {
    id: 'place-quilotoa',
    slug: 'quilotoa-shalala-crater',
    titulo: 'Quilotoa Shalalá: Mirador de Cristal y Noche en el Páramo',
    comunidad_nombre: 'Centro Turístico Comunitario Shalalá',
    region: 'Sierra',
    provincia: 'Cotopaxi',
    canton_parroquia: 'Pujilí / Zumbahua',
    descripcion_corta: 'Despierta al borde del cráter esmeralda. Senderismo al fondo de la laguna, kayak volcánico y fogata comunitaria con canelazo caliente.',
    historia_ancestral: 'La caldera del Quilotoa colapsó hace más de 800 años tras una erupción cataclísmica. Para los pueblos kichwas de Zumbahua y Shalalá, la laguna es la morada de la Mama Quilotoa, deidad de aguas subterráneas y vientos feroces del páramo.',
    datos_curiosos: [
      'El agua cambia de verde esmeralda a turquesa brillante según la refracción del sol sobre los minerales disueltos.',
      'El mirador de cristal de Shalalá fue galardonado internacionalmente por su arquitectura sostenible de madera nativa.',
      'A casi 4.000 metros de altura, las noches ofrecen uno de los cielos estrellados más limpios de Ecuador.'
    ],
    clima: 'Frío de páramo (4°C - 14°C)',
    altitud: '3.914 m.s.n.m.',
    mejor_epoca: 'Junio a Septiembre (Cielos despejados y menor viento)',
    precio_base_pp: 38,
    duracion_dias: 2,
    cupos_disponibles_dia: 12,
    nivel_aventura: 'Moderado',
    imagenes: [
      'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80'
    ],
    etiquetas: ['Laguna Volcánica', 'Páramo', 'Mirador de Cristal', 'Kayak', 'Aventura'],
    que_incluye: [
      'Entrada oficial a la reserva comunitaria de Shalalá sin filas',
      '1 noche en cabaña bioclimática con calefacción ecológica de leña',
      'Desayuno andino (café de haba, tostado, queso fresco y huevos de campo)',
      'Paseo guiado por el borde sur del cráter y descenso al playón de la laguna',
      '1 hora de kayak en las aguas del cráter'
    ],
    que_no_incluye: [
      'Alquiler de mulas para subir del cráter si te cansas ($10 opcional en efectivo)',
      'Ponchos de lana y pinturas de Tigua en las tiendas locales'
    ],
    recomendaciones_eco: [
      'No dejar ningún tipo de basura en el descenso al cráter.',
      'Caminar exclusivamente por el sendero demarcado para proteger los pajonales y frailejones.',
      'Llevar ropa térmica de tres capas y bloqueador solar biodegradable.'
    ],
    sellos: {
      bueno: 72,
      bonito: 85,
      barato: 65,
      seguro: true,
      votos_totales: 88,
      verificado_gad: true,
    },
    es_destacado: false,
    contacto_whatsapp: '+593991234567',
    telefono_llamadas: '+59332814000',
    preguntas_frecuentes: [
      {
        pregunta: '¿Es muy duro el ascenso desde el fondo del cráter?',
        respuesta: 'El sendero tiene 280 metros de desnivel. Toma entre 45 minutos y 1 hora y media a paso constante. Si te fatigas, los comuneros ofrecen mulas de retorno.'
      },
      {
        pregunta: '¿Hace mucho frío en las cabañas de noche?',
        respuesta: 'Las cabañas de Shalalá tienen aislamiento térmico con lana de oveja y estufa comunitaria, además de 4 cobijas térmicas por cama.'
      }
    ],
    cooperativa_pago: {
      nombre_banco: 'Banco del Austro',
      tipo_cuenta: 'Cuenta Corriente Comunitaria',
      numero_cuenta: '0102948201',
      titular: 'Cabildo Comuna Indígena Shalalá Quilotoa'
    },
    reviews: [
      {
        id: 'rev-3',
        usuario_nombre: 'Doménica Pazmiño (Guayaquil)',
        avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
        fecha: 'Hace 5 días',
        comentario: 'Ver amanecer con el cráter despejado desde la cama no tiene precio. Todo incluido tal como decía la app.',
        sellos_otorgados: { bueno: true, bonito: true, barato: true, seguro: true }
      }
    ]
  },
  {
    id: 'place-cofan-dureno',
    slug: 'cofan-dureno-aguarico',
    titulo: 'Comunidad Cofán Dureno: Guardianes de la Selva Virgen',
    comunidad_nombre: 'Nacionalidad Originaria A’i Cofán Dureno',
    region: 'Amazonía',
    provincia: 'Sucumbíos',
    canton_parroquia: 'Lago Agrio / Dureno',
    descripcion_corta: 'Navegación en canoa tradicional por el Río Aguarico, etnobotánica con chamanes de la yahuasca, pintura corporal ancestral y noche bajo el dosel amazónico.',
    historia_ancestral: 'El pueblo Cofán (A’i) ha defendido más de 50.000 hectáreas de selva primaria frente a la tala y la explotación petrolera. Son considerados los más antiguos etnobotánicos de la Amazonía nororiental, conocedores del espíritu de los jaguares y las anacondas.',
    datos_curiosos: [
      'Su lengua materna es el A’ingae, una lengua aislada no emparentada con ninguna otra familia lingüística del mundo.',
      'Elaboren pulseras con semillas de lágrimas de San Pedro y fibra de chambira que duran décadas.',
      'El Río Aguarico alberga delfines rosados y nutrias gigantes que se pueden avistar en las mañanas.'
    ],
    clima: 'Cálido húmedo tropical (24°C - 31°C)',
    altitud: '290 m.s.n.m.',
    mejor_epoca: 'Agosto a Diciembre (Menor caudal de lluvias para caminatas)',
    precio_base_pp: 65,
    duracion_dias: 3,
    cupos_disponibles_dia: 6,
    nivel_aventura: 'Adrenalina',
    imagenes: [
      'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80'
    ],
    etiquetas: ['Selva Virgen', 'Navegación en Canoa', 'Chamanismo', 'Etnobotánica', 'Aventura Extrema'],
    que_incluye: [
      'Transporte fluvial ida y retorno en canoa a motor desde el puerto de Dureno',
      '2 noches en maloca comunitaria con mosquitero y hamaca tradicional',
      'Alimentación completa tradicional amazónica (maito de tilapia, yuca cocida y chicha de chonta)',
      'Caminatas diurnas y nocturnas por la selva con guardaparques nativos Cofán',
      'Taller de pintura facial con achiote y uso de cerbatana tradicional'
    ],
    que_no_incluye: [
      'Botas de caucho personales (se pueden alquilar por $2 en el puerto)',
      'Ceremonias espirituales privadas de limpia (acuerdo personal opcional con el chamán)'
    ],
    recomendaciones_eco: [
      'Usar repelente de insectos de citronela o aceites esenciales no tóxicos para el agua.',
      'No usar linternas de luz blanca directa a los ojos de anfibios ni caimanes.',
      'Respetar las zonas sagradas donde habitan los espíritus del bosque.'
    ],
    sellos: {
      bueno: 39,
      bonito: 45,
      barato: 33,
      seguro: true,
      votos_totales: 46,
      verificado_gad: true,
    },
    es_destacado: true,
    etiqueta_plan_pagado: 'Reserva Étnica Sostenible',
    contacto_whatsapp: '+593988776655',
    telefono_llamadas: '+59362830111',
    preguntas_frecuentes: [
      {
        pregunta: '¿Es seguro para mochileros?',
        respuesta: 'Totalmente. La guardia indígena Cofán cuida el territorio de manera estricta y acompaña cada expedición.'
      },
      {
        pregunta: '¿Qué vacunas se recomiendan?',
        respuesta: 'Fiebre amarilla y tétanos, recomendadas para cualquier viaje a la cuenca amazónica.'
      }
    ],
    cooperativa_pago: {
      nombre_banco: 'Cooperativa de Ahorro y Crédito San Francisco',
      tipo_cuenta: 'Cuenta de Ahorros',
      numero_cuenta: '45091283019',
      titular: 'Comuna Cofán Dureno Ecoturismo'
    },
    reviews: [
      {
        id: 'rev-4',
        usuario_nombre: 'Felipe Alarcón (Cuenca)',
        avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
        fecha: 'Hace 2 semanas',
        comentario: 'Ver a los abuelos Cofán comunicarse con los pájaros en la selva fue una de las mejores experiencias de mi vida. Cero postureo, pura selva auténtica.',
        sellos_otorgados: { bueno: true, bonito: true, barato: true, seguro: true }
      }
    ]
  },
  {
    id: 'place-yunguilla',
    slug: 'yunguilla-choco-andino-pichincha',
    titulo: 'Yunguilla: El Bosque Nublado del Chocó Andino',
    comunidad_nombre: 'Comunidad Ecoturística Yunguilla',
    region: 'Sierra',
    provincia: 'Pichincha',
    canton_parroquia: 'Quito / Calacalí - Nanegal',
    descripcion_corta: 'Cuna del Chocó Andino, Reserva de la Biosfera. Senderos de culuncos Yumbos, avistamiento del oso andino, quesos artesanales y mermeladas de arrayán.',
    historia_ancestral: 'Hace 30 años la comunidad vivía de talar árboles para carbón. Con una visión pionera de sus jóvenes, se organizaron para reforestar más de 2.000 hectáreas, crearon su microempresa de quesos y hoy son el referente continental de turismo comunitario.',
    datos_curiosos: [
      'En sus bosques se han registrado más de 20 familias de osos de anteojos (Ukumari).',
      'Los antiguos Yumbos caminaban por zanjas profundas excavadas en la tierra llamadas culuncos para comerciar sal marina con la sierra.',
      'Fabrican un queso ahumado con madera de aliso que ha ganado premios gastronómicos nacionales.'
    ],
    clima: 'Templado subtropical y niebla mágica (15°C - 23°C)',
    altitud: '2.650 m.s.n.m.',
    mejor_epoca: 'Julio a Noviembre (Temporada alta para avistar osos comiendo achupallas)',
    precio_base_pp: 32,
    duracion_dias: 1,
    cupos_disponibles_dia: 15,
    nivel_aventura: 'Moderado',
    imagenes: [
      'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1511497584788-87676104235f?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=800&q=80'
    ],
    etiquetas: ['Chocó Andino', 'Oso de Anteojos', 'Bosque Nublado', 'Culuncos Yumbos', 'Quesos Artesanales'],
    que_incluye: [
      'Almuerzo campestre comunitario con trucha fresca y ensalada de la huerta',
      'Degustación en la fábrica comunitaria de mermeladas de mora silvestre y quesos',
      'Caminata interpretativa guiada por los culuncos y mirador de orquídeas',
      'Aporte al fondo comunal de monitoreo de fauna silvestre'
    ],
    que_no_incluye: [
      'Frascos de mermelada y quesos para llevar (puedes comprar en su tiendita en efectivo)',
      'Transporte desde la parada de Calacalí (camioneta compartida por $2.50)'
    ],
    recomendaciones_eco: [
      'No usar perfumes ni lociones fuertes que ahuyenten a los colibríes.',
      'Guardar silencio en los tramos de culuncos para aumentar probabilidad de ver fauna.'
    ],
    sellos: {
      bueno: 64,
      bonito: 68,
      barato: 58,
      seguro: true,
      votos_totales: 71,
      verificado_gad: true,
    },
    es_destacado: false,
    contacto_whatsapp: '+593992345678',
    telefono_llamadas: '+59323990111',
    preguntas_frecuentes: [
      {
        pregunta: '¿A qué distancia queda de Quito?',
        respuesta: 'A solo 1 hora y 15 minutos en bus desde la estación de La Ofelia en el norte de Quito.'
      }
    ],
    cooperativa_pago: {
      nombre_banco: 'Banco Pichincha',
      tipo_cuenta: 'Cuenta Corriente',
      numero_cuenta: '3192019482',
      titular: 'Corporación Microempresarial Yunguilla'
    },
    reviews: [
      {
        id: 'rev-5',
        usuario_nombre: 'Valeria Cárdenas (Ibarra)',
        avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
        fecha: 'Hace 6 días',
        comentario: 'Hermoso ejemplo de conservación. Vimos huellas de oso y la mermelada de arrayán es espectacular.',
        sellos_otorgados: { bueno: true, bonito: true, barato: true, seguro: true }
      }
    ]
  },
  {
    id: 'place-agua-blanca',
    slug: 'agua-blanca-los-frailes-manabi',
    titulo: 'Agua Blanca: Lodo Sulfuroso y Arqueología Manteña',
    comunidad_nombre: 'Comuna Ancestral Agua Blanca (Parque Nacional Machalilla)',
    region: 'Costa',
    provincia: 'Manabí',
    canton_parroquia: 'Puerto López / Machalilla',
    descripcion_corta: 'Sumérgete en la laguna de azufre medicinal en pleno bosque seco tropical. Museo de urnas funerarias manteñas y paseo a las playas vírgenes de Los Frailes.',
    historia_ancestral: 'Agua Blanca es el último señorío de la confederación de comerciantes manteño-huancavilcas que navegaron en balsas de balsa hasta México y Perú para comerciar la concha Spondylus (el oro rojo de los dioses andinos).',
    datos_curiosos: [
      'La laguna sulfurosa tiene propiedades curativas para la piel y un barro blanco relajante.',
      'En el bosque habitan guacamayos verdes mayores y venados de cola blanca.',
      'El ceviche manabita con maní y salprieta cocinado a leña se sirve en mates de balsa.'
    ],
    clima: 'Cálido y brisa marina (23°C - 30°C)',
    altitud: '80 m.s.n.m.',
    mejor_epoca: 'Junio a Octubre (Avistamiento de ballenas jorobadas en la costa contigua)',
    precio_base_pp: 28,
    duracion_dias: 1,
    cupos_disponibles_dia: 20,
    nivel_aventura: 'Tranqui',
    imagenes: [
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?auto=format&fit=crop&w=800&q=80'
    ],
    etiquetas: ['Laguna Sulfurosa', 'Cultura Manteña', 'Bosque Seco', 'Playa Los Frailes', 'Spondylus'],
    que_incluye: [
      'Entrada al complejo comunal y acceso libre a la laguna de lodo mineral',
      'Recorrido con guía nativo por el museo de sitio arqueológico',
      'Almuerzo tradicional manabita en fogón de leña (pescado o verde asado)',
      'Acceso directo por sendero ecológico a la playa privada Los Frailes'
    ],
    que_no_incluye: [
      'Masajes terapéuticos de barro realizados por señoras de la comunidad ($5 extra en efectivo)',
      'Artesanías en tagua y palo santo'
    ],
    recomendaciones_eco: [
      'No usar cremas solares químicas antes de entrar a la laguna de azufre.',
      'No extraer fósiles ni piezas cerámicas de los senderos (patrimonio nacional sagrado).'
    ],
    sellos: {
      bueno: 81,
      bonito: 76,
      barato: 79,
      seguro: true,
      votos_totales: 92,
      verificado_gad: true,
    },
    es_destacado: true,
    etiqueta_plan_pagado: 'Ruta Arqueológica Costera',
    contacto_whatsapp: '+593983456789',
    telefono_llamadas: '+59352604100',
    preguntas_frecuentes: [
      {
        pregunta: '¿El lodo sulfuroso mancha la ropa de baño?',
        respuesta: 'El azufre tiene un olor mineral fuerte característico. Se aconseja llevar un traje de baño oscuro que se pueda lavar fácilmente.'
      }
    ],
    cooperativa_pago: {
      nombre_banco: 'Cooperativa de Ahorro y Crédito Juventud Ecuatoriana Progresista (JEP)',
      tipo_cuenta: 'Ahorros',
      numero_cuenta: '4091823901',
      titular: 'Comuna Ancestral Agua Blanca Machalilla'
    },
    reviews: [
      {
        id: 'rev-6',
        usuario_nombre: 'Lucas Moreira (Manta)',
        avatar_url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=200&q=80',
        fecha: 'Hace 4 días',
        comentario: 'El baño de barro te deja la piel como nueva. La comida de las comadres en la leña es insuperable. Un 3B con todas las letras.',
        sellos_otorgados: { bueno: true, bonito: true, barato: true, seguro: true }
      }
    ]
  },
  {
    id: 'place-salasaca',
    slug: 'salasaca-viva-tungurahua',
    titulo: 'Salasaca Viva: Tejedores del Sol y Tapices Andinos',
    comunidad_nombre: 'Pueblo Indígena Salasaca',
    region: 'Sierra',
    provincia: 'Tungurahua',
    canton_parroquia: 'Pelileo / Salasaca',
    descripcion_corta: 'Aprende los secretos del tinturado natural con cochinilla y nogal, toca el tamboril andino y comparte leyendas mitológicas con los taitas.',
    historia_ancestral: 'Los Salasacas son descendientes de mitimaes trasladados desde el altiplano de Bolivia durante el incario. Mantienen una identidad férrea, con idioma propio (kichwa de Salasaca) y festividades solares cargadas de máscaras de cuero y música pentafónica.',
    datos_curiosos: [
      'Sus tapices de lana relatan historias astronómicas y animales sagrados sin usar patrones dibujados: todo lo tienen en la memoria.',
      'El sombrero blanco de ala prensada es una obra de arte confeccionada a mano con pelo de oveja comprimido.'
    ],
    clima: 'Templado seco andino (13°C - 21°C)',
    altitud: '2.600 m.s.n.m.',
    mejor_epoca: 'Todo el año (Fiestas del Inti Raymi en Junio)',
    precio_base_pp: 30,
    duracion_dias: 1,
    cupos_disponibles_dia: 10,
    nivel_aventura: 'Tranqui',
    imagenes: [
      'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1516214104703-d870798883c5?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80'
    ],
    etiquetas: ['Tapices Ancestrales', 'Tintes Naturales', 'Música Tradicional', 'Pelileo'],
    que_incluye: [
      'Taller práctico de tinción con cochinilla, chilca y penco',
      'Almuerzo tradicional de cuy o pollo de campo con papas criollas',
      'Recorrido por la plaza de los Shyris y museo comunitario Kinti Wasi',
      'Música en vivo con flauta de carrizo (pingullo) y tamboril'
    ],
    que_no_incluye: [
      'Tapices grandes y alfombras para decoración de pared',
      'Transporte interprovincial'
    ],
    recomendaciones_eco: [
      'Comprar artesanías directas sin regatear agresivamente (el hilado a mano toma semanas).',
      'Preguntar antes de fotografiar a las ancianas en el mercado dominical.'
    ],
    sellos: {
      bueno: 55,
      bonito: 60,
      barato: 52,
      seguro: true,
      votos_totales: 63,
      verificado_gad: true,
    },
    es_destacado: false,
    contacto_whatsapp: '+593976543210',
    telefono_llamadas: '+59332748110',
    preguntas_frecuentes: [
      {
        pregunta: '¿Se puede llegar desde Baños de Agua Santa?',
        respuesta: 'Sí, está a solo 25 minutos en bus desde el terminal de Baños en dirección a Ambato.'
      }
    ],
    cooperativa_pago: {
      nombre_banco: 'Cooperativa de Ahorro y Crédito Chibuleo',
      tipo_cuenta: 'Ahorros',
      numero_cuenta: '7018291029',
      titular: 'Asociación de Artesanos Tejedores Salasaca'
    },
    reviews: []
  },
  {
    id: 'place-oyacachi',
    slug: 'oyacachi-termas-aliso-napo',
    titulo: 'Oyacachi: Termas Minerales y Talladores de Madera de Aliso',
    comunidad_nombre: 'Comunidad Kichwa de Oyacachi',
    region: 'Sierra',
    provincia: 'Napo',
    canton_parroquia: 'El Chaco / Oyacachi',
    descripcion_corta: 'Valle místico encajonado en la Cordillera Real. Aguas termales medicinales calientes rodeadas de cascadas y talleres de tallado en madera viva.',
    historia_ancestral: 'Oyacachi es una de las comunidades más antiguas de la serranía oriental ecuatoriana. En el siglo XVI fue el sitio original de la aparición de la Virgen de El Quinche. El pueblo se trasladó manteniendo el manejo sustentable de los bosques de aliso.',
    datos_curiosos: [
      'El agua termal brota a 40°C desde las fallas geológicas del volcán Cayambe.',
      'Los comuneros tallan figuras de osos, aves y bateas de cocina con madera de aliso sembrada en sus propias parcelas sustentables.'
    ],
    clima: 'Frío húmedo de páramo oriental (8°C - 16°C)',
    altitud: '3.014 m.s.n.m.',
    mejor_epoca: 'Octubre a Febrero',
    precio_base_pp: 35,
    duracion_dias: 2,
    cupos_disponibles_dia: 10,
    nivel_aventura: 'Tranqui',
    imagenes: [
      'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80'
    ],
    etiquetas: ['Aguas Termales', 'Páramo Virgen', 'Artesanía en Madera', 'Reserva Cayambe Coca'],
    que_incluye: [
      '1 noche de hospedaje en cabañas comunales de madera térmica',
      'Pase ilimitado a las piscinas termales públicas y privadas de la comunidad',
      'Almuerzo de trucha arcoíris criada en vertientes de agua pura de glaciar',
      'Taller demostrativo con un maestro tallador de aliso'
    ],
    que_no_incluye: [
      'Alquiler de batas de baño o toallas adicionales',
      'Bateas y cucharas de madera para llevar a casa'
    ],
    recomendaciones_eco: [
      'Bañarse con agua dulce antes de ingresar a las pozas termales.',
      'No botar basura en las orillas del río Oyacachi.'
    ],
    sellos: {
      bueno: 42,
      bonito: 48,
      barato: 38,
      seguro: true,
      votos_totales: 50,
      verificado_gad: true,
    },
    es_destacado: false,
    contacto_whatsapp: '+593981122334',
    telefono_llamadas: '+59362879001',
    preguntas_frecuentes: [
      {
        pregunta: '¿Se puede acceder desde Cayambe?',
        respuesta: 'Sí, la vía asfaltada y lastrada desde Cayambe toma aproximadamente 1 hora y 10 minutos cruzando paisajes espectaculares de páramo.'
      }
    ],
    cooperativa_pago: {
      nombre_banco: 'Banco Guayaquil',
      tipo_cuenta: 'Cuenta Ahorros Comuna',
      numero_cuenta: '1892019283',
      titular: 'Cabildo de la Comuna Indígena de Oyacachi'
    },
    reviews: []
  },
  {
    id: 'place-salango-plata',
    slug: 'isla-de-la-plata-salango',
    titulo: 'Salango y el Galápagos de los Pobres (Isla de la Plata)',
    comunidad_nombre: 'Comunidad de Pescadores Artesanales de Salango',
    region: 'Costa',
    provincia: 'Manabí',
    canton_parroquia: 'Puerto López / Salango',
    descripcion_corta: 'Avistamiento de piqueros de patas azules, tortugas marinas gigantes y buceo de superficie en arrecifes protegidos sin pagar miles de dólares.',
    historia_ancestral: 'Salango alberga 5.000 años de historia marítima ininterrumpida. Su centro de investigación arqueológica alberga maquetas de las balsas oceánicas con timón de guare que dominaron las corrientes de Humboldt.',
    datos_curiosos: [
      'La Isla de la Plata se llama así porque según la leyenda, Sir Francis Drake escondió parte de su tesoro de plata española en sus acantilados.',
      'Los piqueros de patas azules realizan su danza de cortejo andante a pocos metros de los senderistas.'
    ],
    clima: 'Cálido marino (22°C - 28°C)',
    altitud: 'Nivel del mar (0 a 150 m)',
    mejor_epoca: 'Junio a Noviembre (Temporada de ballenas y aves anidando)',
    precio_base_pp: 48,
    duracion_dias: 1,
    cupos_disponibles_dia: 12,
    nivel_aventura: 'Moderado',
    imagenes: [
      'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=800&q=80'
    ],
    etiquetas: ['Piqueros Patas Azules', 'Snorkel', 'Tortugas Marinas', 'Pesca Artesanal', 'Fauna Marina'],
    que_incluye: [
      'Paseo en lancha comunitaria certificada con guías naturalistas de Salango',
      'Equipo completo de snorkel (máscara, tubo y aletas desinfectadas)',
      'Snack marinero a bordo (sándwiches, fruta fresca y agua)',
      'Caminata guiada de 2 horas en la Isla de la Plata entre colonias de aves marinas'
    ],
    que_no_incluye: [
      'Alquiler de traje de neopreno ($5 si tienes frío)',
      'Cena en la playa de Salango'
    ],
    recomendaciones_eco: [
      'Mantener al menos 2 metros de distancia con los piqueros y sus nidos en el suelo.',
      'Bloqueador solar mineral que no contenga oxibenzona para cuidar los corales.'
    ],
    sellos: {
      bueno: 70,
      bonito: 82,
      barato: 66,
      seguro: true,
      votos_totales: 85,
      verificado_gad: true,
    },
    es_destacado: true,
    etiqueta_plan_pagado: 'Experiencia Marina Comunitaria',
    contacto_whatsapp: '+593994567890',
    telefono_llamadas: '+59352604222',
    preguntas_frecuentes: [
      {
        pregunta: '¿Se marea mucho en el bote?',
        respuesta: 'El trayecto toma 1 hora y 15 minutos mar adentro. Se recomienda tomar una pastilla contra el mareo (mareol) 30 minutos antes de zarpar.'
      }
    ],
    cooperativa_pago: {
      nombre_banco: 'Banco del Pacífico',
      tipo_cuenta: 'Cuenta Ahorros',
      numero_cuenta: '1049281029',
      titular: 'Asociación Barqueros y Buzos de Salango'
    },
    reviews: []
  },
  {
    id: 'place-shiripuno-pastaza',
    slug: 'kichwa-shiripuno-pastaza',
    titulo: 'Kichwa Shiripuno: Liderazgo Femenino del Río Pastaza',
    comunidad_nombre: 'Centro de Turismo Comunitario Shiripuno (Mujeres Amazónicas)',
    region: 'Amazonía',
    provincia: 'Pastaza',
    canton_parroquia: 'Pastaza / Puyo - Canelos',
    descripcion_corta: 'Experiencia transformadora liderada por mujeres indígenas. Elaboración de chicha masticada, arcilla ceremonial, danza sagrada y baño en cascadas escondidas.',
    historia_ancestral: 'La comunidad de Shiripuno nació como una iniciativa colectiva de mujeres Kichwas de la selva para frenar la tala ilegal y rescatar la cerámica tradicional de arcilla con pelo humano (mukawas) y la soberanía alimentaria con la chakra amazónica.',
    datos_curiosos: [
      'Las vasijas (mukawas) se impermeabilizan con resinas naturales de árboles del bosque y se pintan con piedras minerales.',
      'La chicha de yuca se fermenta de forma 100% natural y es el alimento energético que sostiene las largas faenas de selva.'
    ],
    clima: 'Cálido lluvioso tropical (22°C - 30°C)',
    altitud: '950 m.s.n.m.',
    mejor_epoca: 'Septiembre a Febrero',
    precio_base_pp: 36,
    duracion_dias: 1,
    cupos_disponibles_dia: 10,
    nivel_aventura: 'Tranqui',
    imagenes: [
      'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80'
    ],
    etiquetas: ['Mujeres Indígenas', 'Cerámica Mukawa', 'Cascadas Sagradas', 'Chicha Tradicional', 'Chakra'],
    que_incluye: [
      'Recepción con bienvenida y corona de flores silvestres del río',
      'Demostración y modelado de cerámica tradicional en arcilla fina',
      'Almuerzo en hojas de bijao (maito de palmito y pescado de río con plátano verde)',
      'Baño ritual energizante en la cascada sagrada de la selva'
    ],
    que_no_incluye: [
      'Collares de semillas y artesanías en fibra de pita',
      'Taxi o flete desde la ciudad de Puyo ($4)'
    ],
    recomendaciones_eco: [
      'Bañarse en la cascada sin jabones comerciales para mantener la pureza del afluente.',
      'Mostrar absoluto respeto al círculo de bienvenida de las sabias comuneras.'
    ],
    sellos: {
      bueno: 63,
      bonito: 66,
      barato: 60,
      seguro: true,
      votos_totales: 68,
      verificado_gad: true,
    },
    es_destacado: false,
    contacto_whatsapp: '+593985671234',
    telefono_llamadas: '+59332885002',
    preguntas_frecuentes: [
      {
        pregunta: '¿Queda muy lejos del Puyo?',
        respuesta: 'A solo 15 minutos en auto o taxi cooperado desde el terminal terrestre de Puyo.'
      }
    ],
    cooperativa_pago: {
      nombre_banco: 'Cooperativa Pastaza',
      tipo_cuenta: 'Ahorros',
      numero_cuenta: '2019482019',
      titular: 'Asociación de Mujeres Indígenas de Shiripuno'
    },
    reviews: []
  },
  {
    id: 'place-intag',
    slug: 'valle-de-intag-cafe-imbabura',
    titulo: 'Valle de Íntag: Café de Sombra, Termas y Bosque Nublado',
    comunidad_nombre: 'Red Comunitaria Agroecológica de Íntag',
    region: 'Sierra',
    provincia: 'Imbabura',
    canton_parroquia: 'Cotacachi / Peñaherrera - Apuela',
    descripcion_corta: 'El valle que venció a la minería a gran escala. Pasea por cafetales de altura bajo sombra de árboles nativos, relájate en las aguas termales de Nangulví y apoya talleres de cabuya.',
    historia_ancestral: 'Las familias campesinas de Íntag protagonizaron una de las resistencias ecológicas más emblemáticas del planeta, expulsando a transnacionales mineras para fundar la Asociación Río Íntag de Café Orgánico y la cooperativa de artesanías de estropajo y luffa.',
    datos_curiosos: [
      'El café de Íntag se tuesta artesanalmente y tiene notas a panela, chocolate oscuro y cítricos.',
      'En sus ríos cristalinos todavía habita la rana arlequín de Íntag, especie que se creía extinta.'
    ],
    clima: 'Templado húmedo subtropical (16°C - 24°C)',
    altitud: '1.800 m.s.n.m.',
    mejor_epoca: 'Mayo a Noviembre (Época de cosecha y secado del café)',
    precio_base_pp: 34,
    duracion_dias: 2,
    cupos_disponibles_dia: 10,
    nivel_aventura: 'Moderado',
    imagenes: [
      'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1511497584788-87676104235f?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=800&q=80'
    ],
    etiquetas: ['Café Agroecológico', 'Termas Nangulví', 'Bosque Nublado', 'Biodiversidad', 'Resistencia Eco'],
    que_incluye: [
      '1 noche en posada rural ecoturística en Apuela',
      'Cata de cafés especiales y recorrido por la finca cafetalera comunitaria',
      'Entrada libre al complejo termal de Nangulví junto al río',
      'Almuerzo campesino con guiso de verduras orgánicas y gallina criolla'
    ],
    que_no_incluye: [
      'Bolsas de café de 400g tostado en grano para llevar ($6)',
      'Transporte en chiva desde Otavalo'
    ],
    recomendaciones_eco: [
      'Comprar café directamente a los productores locales para fortalecer el comercio justo.',
      'Llevar linterna para las caminatas nocturnas por los senderos de montaña.'
    ],
    sellos: {
      bueno: 58,
      bonito: 64,
      barato: 55,
      seguro: true,
      votos_totales: 66,
      verificado_gad: true,
    },
    es_destacado: false,
    contacto_whatsapp: '+593987112233',
    telefono_llamadas: '+59362568010',
    preguntas_frecuentes: [
      {
        pregunta: '¿Cómo llegar desde Otavalo?',
        respuesta: 'Salen buses de la Cooperativa Otavalo desde el terminal de Otavalo hacia Apuela y Nangulví cada 2 horas.'
      }
    ],
    cooperativa_pago: {
      nombre_banco: 'Cooperativa de Ahorro y Crédito Artesanos de Cotacachi',
      tipo_cuenta: 'Ahorros',
      numero_cuenta: '8091823901',
      titular: 'Asociación Agroartesanal de Caficultores de Íntag'
    },
    reviews: []
  },
  destinationIdea({
    id: 'place-banos', slug: 'banos-escapada-entre-panas', titulo: 'Baños: Escapada entre panas',
    region: 'Sierra', provincia: 'Tungurahua', canton_parroquia: 'Baños de Agua Santa',
    descripcion_corta: 'Caminatas, fotos y un plan al aire libre para compartir con tus panas.',
    precio_base_pp: 35, duracion_dias: 1, nivel_aventura: 'Moderado', imagenes: ['/images/forest.jpg'],
    etiquetas: ['Idea de escapada', 'Aventura', 'Naturaleza', 'Fotografía', 'Con amigos'],
  }),
  destinationIdea({
    id: 'place-mindo', slug: 'mindo-modo-tranqui', titulo: 'Mindo: Modo tranqui',
    region: 'Sierra', provincia: 'Pichincha', canton_parroquia: 'San Miguel de los Bancos / Mindo',
    descripcion_corta: 'Un respiro verde: camina, conversa y busca tu próxima foto favorita.',
    precio_base_pp: 28, duracion_dias: 1, nivel_aventura: 'Tranqui', imagenes: ['/images/forest.jpg'],
    etiquetas: ['Idea de escapada', 'Naturaleza', 'Fotografía', 'Con amigos'],
  }),
  destinationIdea({
    id: 'place-cuenca', slug: 'cuenca-a-tu-ritmo', titulo: 'Cuenca: A tu ritmo',
    region: 'Sierra', provincia: 'Azuay', canton_parroquia: 'Cuenca',
    descripcion_corta: 'Paseo urbano, una parada para comer y tiempo para descubrir sin apuro.',
    precio_base_pp: 24, duracion_dias: 1, nivel_aventura: 'Tranqui', imagenes: ['/images/andes.jpg'],
    etiquetas: ['Idea de escapada', 'Cultura Viva', 'Gastronomía', 'Fotografía'],
  }),
  destinationIdea({
    id: 'place-cotopaxi', slug: 'cotopaxi-plan-de-paramo', titulo: 'Cotopaxi: Plan de páramo',
    region: 'Sierra', provincia: 'Cotopaxi', canton_parroquia: 'Latacunga / entorno del Cotopaxi',
    descripcion_corta: 'Aire de montaña y un plan de caminata que tú ajustas a tu ritmo.',
    precio_base_pp: 40, duracion_dias: 1, nivel_aventura: 'Moderado', imagenes: ['/images/andes.jpg'],
    etiquetas: ['Idea de escapada', 'Aventura', 'Naturaleza', 'Páramo', 'Fotografía'],
  }),
  destinationIdea({
    id: 'place-otavalo', slug: 'otavalo-cultura-y-sabores', titulo: 'Otavalo: Cultura y sabores',
    region: 'Sierra', provincia: 'Imbabura', canton_parroquia: 'Otavalo',
    descripcion_corta: 'Un plan para conocer, comer rico y conversar con respeto con la gente local.',
    precio_base_pp: 22, duracion_dias: 1, nivel_aventura: 'Tranqui', imagenes: ['/images/andes.jpg'],
    etiquetas: ['Idea de escapada', 'Cultura Viva', 'Gastronomía', 'Fotografía'],
  }),
  destinationIdea({
    id: 'place-mompiche', slug: 'mompiche-plan-costeno', titulo: 'Mompiche: Plan costeño',
    region: 'Costa', provincia: 'Esmeraldas', canton_parroquia: 'Muisne / Mompiche',
    descripcion_corta: 'Escápate con tus panas: caminata, sabores de la Costa y tiempo para bajar revoluciones.',
    precio_base_pp: 42, duracion_dias: 2, nivel_aventura: 'Tranqui', imagenes: ['/images/coast.jpg'],
    etiquetas: ['Idea de escapada', 'Naturaleza', 'Gastronomía', 'Con amigos', 'Fotografía'],
  })
];

// Local, self-guided outings: these are planning allowances, not provider tariffs.
const LOCAL_OUTINGS = [
  ['quito', 'Quito: Plazas y miradores', 'Sierra', 'Pichincha', 'Quito / centro histórico', 8, 'Tranqui', 'andes', 'Cultura Viva', 'Plazas, arquitectura y fotos a tu ritmo. Un plan de día si ya estás en Quito.'],
  ['loja', 'Loja: Tarde entre plazas', 'Sierra', 'Loja', 'Loja / centro urbano', 7, 'Tranqui', 'andes', 'Cultura Viva', 'Camina entre plazas y arma una tarde con tus panas, sin salir del centro.'],
  ['riobamba', 'Riobamba: Calles y horizonte andino', 'Sierra', 'Chimborazo', 'Riobamba / área urbana', 10, 'Moderado', 'andes', 'Naturaleza', 'Paseo urbano y fotografía del paisaje andino. No incluye ascenso al Chimborazo.'],
  ['guayaquil', 'Guayaquil: Paseo junto al río', 'Costa', 'Guayas', 'Guayaquil / malecón urbano', 7, 'Tranqui', 'coast', 'Cultura Viva', 'Descubre plazas y espacios junto al río; ajusta el paseo al calor y a los horarios locales.'],
  ['salinas', 'Salinas: Caminata frente al mar', 'Costa', 'Santa Elena', 'Salinas / malecón', 10, 'Moderado', 'coast', 'Naturaleza', 'Camina con tus panas y busca tu foto del océano. No contempla deportes acuáticos.'],
  ['manta', 'Manta: Mar y conversación', 'Costa', 'Manabí', 'Manta / frente costero urbano', 8, 'Tranqui', 'coast', 'Naturaleza', 'Una pausa frente al mar para disfrutar en grupo. Parte desde la propia ciudad.'],
  ['tena', 'Tena: Paseo junto a los ríos', 'Amazonía', 'Napo', 'Tena / entorno urbano', 10, 'Moderado', 'forest', 'Naturaleza', 'Descubre el paisaje amazónico desde espacios públicos urbanos. No incluye rafting ni ingreso a selva.'],
  ['puyo', 'Puyo: Verde a tu ritmo', 'Amazonía', 'Pastaza', 'Puyo / área urbana', 9, 'Tranqui', 'forest', 'Naturaleza', 'Un paseo de día por la ciudad y sus espacios verdes. Lleva protección para la lluvia.'],
  ['zamora', 'Zamora: Ciudad y paisaje verde', 'Amazonía', 'Zamora Chinchipe', 'Zamora / área urbana', 8, 'Tranqui', 'forest', 'Naturaleza', 'Camina, conversa y descubre el entorno urbano amazónico sin contratar una expedición.'],
  ['puerto-ayora', 'Puerto Ayora: A pie por el puerto', 'Galápagos', 'Galápagos', 'Santa Cruz / Puerto Ayora', 20, 'Tranqui', 'coast', 'Naturaleza', 'Idea de paseo urbano para quienes ya están en Santa Cruz. La foto es una referencia costera continental.'],
  ['san-cristobal', 'San Cristóbal: Malecón con calma', 'Galápagos', 'Galápagos', 'San Cristóbal / Puerto Baquerizo Moreno', 18, 'Tranqui', 'coast', 'Naturaleza', 'Recorre a pie el frente urbano de la isla, manteniendo distancia de la fauna. Foto costera de referencia.'],
  ['isabela', 'Isabela: Tarde en Puerto Villamil', 'Galápagos', 'Galápagos', 'Isabela / Puerto Villamil', 20, 'Tranqui', 'coast', 'Naturaleza', 'Idea de paseo local por el pueblo si ya estás en Isabela. No representa un tour ni un traslado entre islas.'],
] as const;

INITIAL_PLACES.push(...LOCAL_OUTINGS.map(([id, titulo, region, provincia, canton_parroquia, precio_base_pp, nivel_aventura, image, interest, descripcion_corta]) => destinationIdea({
  id: `place-${id}`, slug: `${id}-paseo-local`, titulo, region, provincia, canton_parroquia,
  descripcion_corta, precio_base_pp, duracion_dias: 1, nivel_aventura,
  imagenes: [`/images/${image}.jpg`],
  etiquetas: ['Idea de escapada', 'Paseo local', interest, 'Cultura Viva', 'Fotografía', 'Con amigos'],
  que_incluye: ['Idea de paseo autoguiado de un día', `Asignación orientativa de $${precio_base_pp} por persona para gastos locales; no es una tarifa ni un servicio contratado`, 'Fotografía de referencia regional, no del destino exacto'],
  que_no_incluye: region === 'Galápagos'
    ? ['Vuelos, ferris y traslados entre islas', 'Tasas de ingreso, controles y trámites de visitante', 'Alojamiento, tours, guías y entradas', 'Ningún servicio está contratado: confirma tus gastos locales']
    : ['Transporte hasta el destino y traslados de regreso', 'Alojamiento, guías, actividades y entradas de pago', 'Ningún servicio está contratado: distribuye el presupuesto orientativo entre tus gastos locales'],
  recomendaciones_eco: region === 'Galápagos'
    ? ['Respeta la distancia y las indicaciones de los guardaparques; no alimentes ni toques a la fauna.', 'Verifica las normas de acceso y bioseguridad antes de viajar.']
    : ['Usa espacios habilitados y confirma los accesos antes de salir.', 'Lleva tu tomatodo, evita plásticos y regresa con tus residuos.'],
})));

export const INITIAL_RAYMIS: Raymi[] = [
  {
    id: 'raymi-pawkar',
    nombre: 'Pawkar Raymi (Fiesta del Florecimiento y del Agua)',
    nombre_kichwa: 'Pawkar Raymi / Sisa Pacha',
    region: 'Sierra',
    provincia: 'Imbabura / Loja / Azuay',
    canton: 'Otavalo (Peguche) y Saraguro',
    fecha_celebracion: 'Febrero / Marzo (Equinoccio de Primavera)',
    proxima_fecha: '21 de Marzo de 2027',
    significado_ancestral: 'Agradecimiento a la Pachamama y al agua sagrada por los primeros brotes y flores de la chakra. Se comparte el juego ceremonial del agua pura (Yaku) y la comida comunal (Pambamesa).',
    historia_origen: 'Es uno de los cuatro Raymis sagrados del calendario solar andino. Coincide con la maduración de los granos tiernos (choclo, habas, fréjol). En Peguche se complementa con campeonatos deportivos comunitarios y conciertos de música andina.',
    protocolo_respeto: [
      'Participar en el Tumarina (bendición con agua de flores silvestres) con respeto y la cabeza inclinada.',
      'No arrojar tintes químicos, cariocas ni basura plástica durante el juego ritual del agua.',
      'Compartir la comida comunal (Pambamesa) sentándose en el suelo en círculo, sin desperdiciar nada.'
    ],
    imagen_url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80',
    elementos_rituales: ['Agua de vertiente sagrada', 'Pétalos de flores silvestres', 'Granos tiernos', 'Música de pífanos y tambores']
  },
  {
    id: 'raymi-inti',
    nombre: 'Inti Raymi (Fiesta del Sol y de las Cosechas)',
    nombre_kichwa: 'Inti Raymi / Hatun Puncha',
    region: 'Sierra',
    provincia: 'Pichincha / Imbabura / Cañar',
    canton: 'Cayambe, Cotacachi, Ingapirca',
    fecha_celebracion: '21 al 24 de Junio (Solsticio de Verano)',
    proxima_fecha: '21 de Junio de 2027',
    significado_ancestral: 'La celebración más trascendental del mundo andino. Se honra al Tayta Inti (Padre Sol) por madurar los campos y culminar la cosecha de maíz.',
    historia_origen: 'Durante cuatro días y noches, los comuneros zapatean incansablemente (Tushuy) para despertar la energía de la tierra. Los personajes míticos como el Aya Huma (espíritu guía con máscara de dos caras que mira el pasado y el futuro) encabezan las tomas de plaza.',
    protocolo_respeto: [
      'No interrumpir el zapateo de las comparsas comunales; si bailas, hazlo con el mismo vigor.',
      'No retirar las máscaras sagradas de los Aya Huma sin su consentimiento expreso.',
      'Mantener sobriedad y evitar convertir la fiesta espiritual en consumo excesivo de licor comercial.'
    ],
    imagen_url: 'https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=1200&q=80',
    elementos_rituales: ['Máscara de Aya Huma', 'Zapateo rítmico en espiral', 'Chicha de jora madura', 'Churros y campanas']
  },
  {
    id: 'raymi-kuya',
    nombre: 'Kuya Raymi (Fiesta de la Fertilidad y de la Mujer)',
    nombre_kichwa: 'Kulla / Kuya Raymi',
    region: 'Sierra',
    provincia: 'Tungurahua / Cañar / Loja',
    canton: 'Pelileo, Saraguro, Otavalo',
    fecha_celebracion: '21 de Septiembre (Equinoccio de Otoño)',
    proxima_fecha: '21 de Septiembre de 2027',
    significado_ancestral: 'Homenaje a la feminidad sagrada, a la fertilidad de las mujeres y a la preparación del vientre de la tierra (Allpamama) para la nueva siembra.',
    historia_origen: 'En esta fecha la tierra está húmeda y lista para recibir las semillas sagradas del maíz. Es un tiempo de sanación, limpieza con ortiga y reconocimiento al liderazgo de las abuelas y madres de familia.',
    protocolo_respeto: [
      'Prioridad de participación y palabra a las sabias de la comunidad.',
      'Pedir permiso para participar en las limpias colectivas de energía.',
      'Llevar semillas nativas para intercambiar en el trueque sagrado.'
    ],
    imagen_url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
    elementos_rituales: ['Semillas de maíz ancestral', 'Ortiga y chilca para limpias', 'Sahumerios de copal', 'Ofrendas a la luna (Killa)']
  },
  {
    id: 'raymi-kapak',
    nombre: 'Kapak Raymi (Fiesta de la Juventud y Solsticio de Invierno)',
    nombre_kichwa: 'Kapak Raymi / Warachikuy',
    region: 'Sierra',
    provincia: 'Loja / Chimborazo / Tungurahua',
    canton: 'Saraguro, Riobamba, Salasaca',
    fecha_celebracion: '21 de Diciembre (Solsticio de Invierno)',
    proxima_fecha: '21 de Diciembre de 2026',
    significado_ancestral: 'La fiesta de los nuevos líderes wambras. Los jóvenes que han alcanzado la madurez reciben los símbolos de sabiduría, compromiso con su pueblo y su primer pantalón ceremonial (Warachikuy).',
    historia_origen: 'Celebración donde los taitas consagran a los wambras como herederos de la memoria ancestral. En Saraguro los personajes de los Markantaitas y Wiklas llenan de sátira y danza las calles andinas.',
    protocolo_respeto: [
      'Reconocer el valor solemne de la transmisión de mando a la juventud.',
      'Escuchar con atención los consejos de los ancianos durante la ceremonia.',
      'No invadir el espacio ceremonial central reservado para las familias y los iniciados.'
    ],
    imagen_url: 'https://images.unsplash.com/photo-1516214104703-d870798883c5?auto=format&fit=crop&w=1200&q=80',
    elementos_rituales: ['Entrega de bastones de mando', 'Disfraz de Wikla y Acorazados', 'Panes de figura y chicha ceremonial']
  },
  {
    id: 'raymi-kasama',
    nombre: 'Kasama (Año Nuevo Étnico Tsáchila)',
    nombre_kichwa: 'Kasama (Nuevo Amanecer Tsáchila)',
    region: 'Costa',
    provincia: 'Santo Domingo de los Tsáchilas',
    canton: 'Santo Domingo / Comunas Tsáchilas',
    fecha_celebracion: 'Abril (Sábado de Gloria y Luna Nueva)',
    proxima_fecha: '3 de Abril de 2027',
    significado_ancestral: 'El inicio de un nuevo ciclo solar para el pueblo Tsáchila. Tiempo de reencuentro entre las siete comunas, purificación en los ríos y renovación de votos matrimoniales.',
    historia_origen: 'Cuando la fiebre amarilla diezmó al pueblo Tsáchila, los sabios Pones acudieron a los espíritus del achiote (mu). Pintaron sus cabellos con su pasta roja como escudo protector y lograron la supervivencia de su estirpe.',
    protocolo_respeto: [
      'No tocar el cabello peinado con achiote de los hombres Tsáchilas (es sagrado).',
      'Asistir con vestimenta respetuosa a los rituales de marimba y chicha de malá.',
      'Apagar teléfonos móviles durante las rogativas a la naturaleza de los chamanes Pones.'
    ],
    imagen_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
    elementos_rituales: ['Pasta de achiote en el cabello', 'Marimba de chonta', 'Bebida de malá (chicha de caña y maíz)', 'Piedras de río consagradas']
  }
];

export const INITIAL_RESERVATIONS: Reservation[] = [
  {
    id: 'res-001',
    codigo_voucher: 'GMB-SRG-7821',
    lugar_id: 'place-saraguro',
    lugar_titulo: 'Saraguro Ancestral: Sabiduría, Hilado y Chakra Viva',
    comunidad_nombre: 'Comunidad Kichwa Saraguro (Red Saraurku)',
    turista_nombre: 'Juan Sebastián Pérez',
    turista_email: 'juanse.perez@guambra.ec',
    turista_telefono: '+593998123456',
    fecha_tour: '2026-11-15',
    cantidad_personas: 3,
    precio_total: 135,
    monto_comunidad_90: 121.50,
    comision_plataforma_10: 13.50,
    extras_seleccionados: [{ nombre: 'Taller de tejido ancestral', precio: 0 }],
    estado: 'pagado',
    metodo_pago: 'tarjeta',
    qr_data: 'CHULLA VIDA-VERIFIED|GMB-SRG-7821|PAID|SARAGURO|3PAX|2026-11-15',
    pagado_en: '2026-10-20T14:30:00Z',
    notificacion_whatsapp_enviada: true,
    telefono_notificado: '+593987654321'
  },
  {
    id: 'res-002',
    codigo_voucher: 'GMB-YNG-4412',
    lugar_id: 'place-yunguilla',
    lugar_titulo: 'Yunguilla: El Bosque Nublado del Chocó Andino',
    comunidad_nombre: 'Comunidad Ecoturística Yunguilla',
    turista_nombre: 'Camila Mora & Panas',
    turista_email: 'camilamora@gmail.com',
    turista_telefono: '+593987110022',
    fecha_tour: '2026-10-22',
    cantidad_personas: 2,
    precio_total: 64,
    monto_comunidad_90: 57.60,
    comision_plataforma_10: 6.40,
    extras_seleccionados: [{ nombre: 'Degustación de quesos de aliso', precio: 0 }],
    estado: 'validado_en_sitio',
    metodo_pago: 'deuna',
    qr_data: 'CHULLA VIDA-VERIFIED|GMB-YNG-4412|VALIDATED|YUNGUILLA|2PAX|2026-10-22',
    pagado_en: '2026-10-18T10:00:00Z',
    validado_en: '2026-10-22T09:15:00Z',
    notificacion_whatsapp_enviada: true,
    telefono_notificado: '+593992345678'
  },
  {
    id: 'res-003',
    codigo_voucher: 'GMB-AGB-9023',
    lugar_id: 'place-agua-blanca',
    lugar_titulo: 'Agua Blanca: Lodo Sulfuroso y Arqueología Manteña',
    comunidad_nombre: 'Comuna Ancestral Agua Blanca (Parque Nacional Machalilla)',
    turista_nombre: 'Mateo Silva (Mochilero Solo)',
    turista_email: 'mateo.silva@outlook.com',
    turista_telefono: '+593995544332',
    fecha_tour: '2026-10-10',
    cantidad_personas: 1,
    precio_total: 28,
    monto_comunidad_90: 25.20,
    comision_plataforma_10: 2.80,
    extras_seleccionados: [],
    estado: 'liquidado_al_local',
    metodo_pago: 'transferencia',
    qr_data: 'CHULLA VIDA-VERIFIED|GMB-AGB-9023|SETTLED|AGUABLANCA|1PAX|2026-10-10',
    pagado_en: '2026-10-08T16:00:00Z',
    validado_en: '2026-10-10T11:00:00Z',
    liquidado_en: '2026-10-11T09:00:00Z',
    notificacion_whatsapp_enviada: true,
    telefono_notificado: '+593983456789'
  }
];

export const INITIAL_SETTLEMENTS: SettlementRecord[] = [
  {
    id: 'set-101',
    reserva_id: 'res-003',
    codigo_voucher: 'GMB-AGB-9023',
    comunidad_nombre: 'Comuna Ancestral Agua Blanca',
    banco_cooperativa: 'Coop. JEP (Cta: 4091823901)',
    monto: 25.20,
    fecha: '2026-10-11',
    estado: 'confirmado',
    numero_comprobante: 'SPI-BCE-9921482'
  },
  {
    id: 'set-102',
    reserva_id: 'res-002',
    codigo_voucher: 'GMB-YNG-4412',
    comunidad_nombre: 'Comunidad Ecoturística Yunguilla',
    banco_cooperativa: 'Banco Pichincha (Cta: 3192019482)',
    monto: 57.60,
    fecha: '2026-10-22',
    estado: 'transferido',
    numero_comprobante: 'SPI-BCE-9934102'
  },
  {
    id: 'set-103',
    reserva_id: 'res-001',
    codigo_voucher: 'GMB-SRG-7821',
    comunidad_nombre: 'Comunidad Kichwa Saraguro',
    banco_cooperativa: 'Coop. Mushuc Runa (Cta: 29018471920)',
    monto: 121.50,
    fecha: '2026-10-20',
    estado: 'confirmado',
    numero_comprobante: 'SPI-BCE-9918273'
  }
];

export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-1',
    canal: '#panas-de-ruta',
    usuario_id: 'u-1',
    usuario_nombre: 'Alejo Barreto',
    avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
    origen: 'Quito, Ecuador',
    mensaje: '¡Buenas panas! ¿Alguien que vaya al Quilotoa el próximo fin de semana para compartir una camioneta desde Latacunga?',
    timestamp: '10:45 AM'
  },
  {
    id: 'msg-2',
    canal: '#panas-de-ruta',
    usuario_id: 'u-2',
    usuario_nombre: 'Martina Vintimilla',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
    origen: 'Cuenca, Ecuador',
    mensaje: '¡Hola Alejo! Yo voy con una amiga el sábado temprano. Si somos 3 o 4 nos sale a $4 cada uno en vez de $15. ¡Hablemos por aquí!',
    timestamp: '11:02 AM'
  },
  {
    id: 'msg-3',
    canal: '#amazonia-mochilera',
    usuario_id: 'u-3',
    usuario_nombre: 'Lucas Silva',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    origen: 'São Paulo, Brasil',
    mensaje: 'A rota para Cofán Dureno é incrível! O QR voucher funcionou super bem e não precisei pagar nada na chegada. Levem repelente natural!',
    timestamp: 'Ayer'
  },
  {
    id: 'msg-4',
    canal: '#sierra-y-volcanes',
    usuario_id: 'u-4',
    usuario_nombre: 'Claire Moreau',
    avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
    origen: 'Lyon, Francia',
    mensaje: 'In Saraguro, the wool weaving workshop was mindblowing. Mama Rosa is such a wonderful host. 100% recommended!',
    timestamp: 'Hace 2 días'
  }
];

export const INITIAL_PARTNER_DISCOUNTS: PartnerDiscount[] = [
  {
    id: 'disc-1',
    aliado_nombre: 'Cooperativa de Transportes Loja Internacional',
    categoria: 'Transporte Interprovincial',
    descuento: '15% de Descuento',
    descripcion: 'Válido en rutas Quito - Cuenca - Loja presentando tu voucher activo de Wambra en ventanilla.',
    codigo_cupon: 'CHULLA VIDALOJA15',
    valido_hasta: '31 Dic 2026',
    icono: 'Bus'
  },
  {
    id: 'disc-2',
    aliado_nombre: 'Andes Gear Rental & Eco-Backpackers',
    categoria: 'Equipo de Montaña',
    descuento: '20% OFF en Alquiler',
    descripcion: 'Alquiler de bastones telescópicos de bambú, carpas impermeables y sacos de dormir para páramo.',
    codigo_cupon: 'SUMAKGEAR20',
    valido_hasta: '28 Feb 2027',
    icono: 'Backpack'
  },
  {
    id: 'disc-3',
    aliado_nombre: 'Café & Tostaduría de Especialidad Pachamama',
    categoria: 'Gastronomía & Cafetería',
    descuento: '2x1 en Café Filtrado y Postre',
    descripcion: 'En sus locales aliados de Quito Histórico, Cuenca El Vado y Baños de Agua Santa.',
    codigo_cupon: 'RUNACAFE2X1',
    valido_hasta: '15 Nov 2026',
    icono: 'Coffee'
  }
];

export const GAD_PARISH_STATS = [
  { parroquia: 'San Lucas / Saraguro', provincia: 'Loja', reservas: 48, impacto_usd: 5832, familias_beneficiadas: 26 },
  { parroquia: 'Zumbahua / Shalalá', provincia: 'Cotopaxi', reservas: 92, impacto_usd: 8370, familias_beneficiadas: 45 },
  { parroquia: 'Dureno / Río Aguarico', provincia: 'Sucumbíos', reservas: 34, impacto_usd: 5304, familias_beneficiadas: 18 },
  { parroquia: 'Calacalí / Yunguilla', provincia: 'Pichincha', reservas: 76, impacto_usd: 5836, familias_beneficiadas: 32 },
  { parroquia: 'Machalilla / Agua Blanca', provincia: 'Manabí', reservas: 110, impacto_usd: 7392, familias_beneficiadas: 58 },
  { parroquia: 'Salasaca / Pelileo', provincia: 'Tungurahua', reservas: 41, impacto_usd: 2952, familias_beneficiadas: 22 }
];
