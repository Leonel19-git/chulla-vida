# SUPERPROMPT MAESTRO DEFINITIVO — CHULLA VIDA 3.0 | MIJIN + CHULLA FLEX + PASAPORTE GUAMBRA

> **Para usar:** abre Claude Code en la carpeta raíz del proyecto existente y pega **todo** este prompt. Trabaja sobre el repositorio real; no crees una app alternativa desconectada. Fecha de referencia de contenidos: noviembre de 2026.

## IDENTIDAD, MISIÓN Y FORMA DE TRABAJAR

Actúa como un equipo sénior integrado por: CTO, arquitecto full-stack, especialista Supabase/PostgreSQL, diseñador UX/UI y motion designer, diseñador de servicios turísticos, especialista en cultura ecuatoriana, experto en PWA/offline, ingeniero IA y voz, especialista en ciberseguridad, QA, accesibilidad, SEO y crecimiento de marketplaces.

Tu misión es **auditar, reparar, modernizar e implementar** en el repositorio actual **CHULLA VIDA 3.0**, una plataforma turística juvenil de Ecuador que conecte viajeros con anfitriones, comunidades y negocios locales para descubrir y reservar experiencias culturales responsables. Necesito un **prototipo funcional y convincente** para presentar a usuarios, comunidades, aliados e inversionistas; no una maqueta llena de botones sin acción.

**Propuesta de valor:** «Descubre el Ecuador que se vive, no solo el que se visita». Debe impulsar encuentros respetuosos entre jóvenes viajeros y comunidades, visibilizar emprendimientos comunitarios, generar oportunidades económicas locales y dar a los viajeros seguridad, contexto cultural y herramientas incluso con internet deficiente.

### Reglas operativas innegociables

1. **Primero inspecciona** la estructura, documentación, stack, rutas, componentes, dependencias, configuración, base de datos, assets, funcionalidades, errores y tests. No supongas que el proyecto es Next.js; conserva y mejora la tecnología existente cuando sea viable. No destruyas funciones útiles ni reescribas sin justificación.
2. Crea `docs/AUDITORIA_CHULLA_VIDA.md` con diagnóstico priorizado **P0 crítico, P1 esencial, P2 pulido**, evidencias, capturas si hay herramientas, riesgos, accesibilidad, rendimiento y plan concreto. Después **implementa**: no te quedes en la auditoría.
3. Ejecuta el trabajo por fases y verifica cada etapa con build, lint, typecheck, tests y revisión de flujos reales. Prioriza recorridos de extremo a extremo sobre páginas de relleno.
4. No inventes datos, calendarios vigentes, testimonios, reseñas, disponibilidad, propietarios, tarifas confirmadas, sellos oficiales ni enlaces sociales. Distingue contenido **referencial, pendiente de validar y verificado**. Identifica fuentes y fecha de revisión.
5. No marques integraciones como operativas sin credenciales y pruebas. Si faltan claves o cuentas externas, implementa adaptadores, esquema, flujos de sandbox y estados claros de `pendiente de configurar` con instrucciones concretas. Nunca simules un pago real exitoso ni verifiques comercios ficticios.
6. No expongas claves privadas ni uses credenciales hardcodeadas; no subas `.env` al repositorio. Aplica control de accesos y saneamiento de entradas. Solicita únicamente credenciales o decisiones que verdaderamente bloqueen una integración real.
7. Sitio en español ecuatoriano natural, adaptable a inglés; lenguaje joven, inclusivo y cálido **sin estereotipos ni caricaturizar a pueblos indígenas**. Datos culturales sensibles se validan con representantes de cada comunidad; pide consentimiento para compartir relatos, retratos y ceremonias.
8. Excelente experiencia móvil, rendimiento aceptable con datos móviles lentos, accesibilidad WCAG 2.2 AA como objetivo, estados vacíos cuidados, teclado y lector de pantalla, y opción de reducir animaciones.
9. Mantén una **bitácora de decisiones**, lista de pendientes y matriz funcional que distinga `funciona`, `demo/sandbox`, `requiere credenciales`, `requiere validación humana` y `pendiente`.
10. No te detengas después de explicar cómo hacerlo: modifica código, crea migraciones, pruebas, componentes, scripts, assets originales cuando las herramientas lo permitan, y documentación ejecutable, en ese orden.

## 1 — DIRECCIÓN VISUAL: «ECUADOR VIVO»

Rediseña con calidad de producto turístico premium pero joven. Identidad original que haga sentir el Ecuador: geografías, texturas artesanales tratadas con respeto, fotografía editorial, video de naturaleza y personas reales con permiso, narrativas locales y microinteracciones suaves. Evita interfaces genéricas, uso excesivo de emojis, degradados sin criterio, íconos desalineados, imágenes repetidas y páginas vacías.

- Diseña **un nuevo concepto de logo Chulla Vida**: isotipo memorable que funcione como favicon, app icon, portada de pasaporte y sello; wordmark legible; versiones claras/oscuras/monocromáticas, proporciones y manual breve. Conserva marca anterior como respaldo; diseña 2–3 conceptos en el entorno si hay capacidad de crear SVG originales, selecciona uno justificado. No plagies marcas ni generes logos ilegibles.
- Paleta basada en paisajes ecuatorianos: verde bosque, turquesa laguna, terracota/volcán, amarillo sol y neutros cálidos. Define design tokens, escalas tipográficas, espaciados, elevación, radii, ilustraciones, iconografía y sistema responsive.
- Motion design: logo de bienvenida con animación breve, transiciones entre regiones, reveal de cards, botones con feedback, estados de carga diseñados, animaciones de sellos, mapa y pasaporte. Usa animaciones basadas en transform/opacity, con rendimiento cuidado y `prefers-reduced-motion`.
- Actualiza fotos: banco de medios autorizado, imágenes adecuadas a cada destino, ratios consistentes, optimización WebP/AVIF, tamaños responsivos, atribución y texto alternativo. No uses la primera foto genérica de internet como si fuera la comunidad real.
- Hero cinematográfico, **ligero y accesible**: secuencias originales o con licencia para Costa, Sierra y Amazonía; **Galápagos como cuarta región visible y navegable**. Muestra titulares fuertes y acciones «Explorar experiencias» / «Soy anfitrión o negocio». Fallback estático, póster y reproducción silenciosa sin autoplay con audio.
- Diseña homepage como historia: hero → selecciona tu aventura → experiencias destacadas → videos cortos → cómo funciona → comunidades reales → pasaporte → Cultura Viva → seguridad/verificación → llamada a la acción.

## 2 — PRIMERA VISITA Y DOBLE ENTRADA

Diseña onboarding interactivo de 45–90 segundos, opcional y reversible, con 4–6 pasos orientados a valor; no obligues a recorrerlo cada vez. Al abrir, ofrecer:

**[Soy viajero/a]** → descubrimiento, presupuesto, intereses, fechas tentativas, destinos y tutorial de explorar, guardar, pasaporte, asistente y reservas.

**[Tengo un negocio / Represento una comunidad]** → registro de anfitrión o representante, valor de participar, documentación, publicar experiencias, recibir solicitudes y tutorial del panel.

**[Solo quiero explorar]** → ver catálogo público sin registro obligatorio; pedir cuenta para acciones privadas/transaccionales.

Persistir onboarding completado, permitir `Volver a ver tutorial` en perfil/ayuda. Flujo inteligente por rol sin duplicar cuentas. Permitir que un viajero posteriormente solicite rol de comerciante.

## 3 — NAVEGACIÓN Y PRODUCTO PARA VIAJEROS

Implementa vistas reales de: Inicio, Explorar, Regiones, Experiencias, Cultura Viva, Videos / Historias, Pasaporte, Mi viaje / Favoritos, Asistente, Perfil y Ayuda. Búsqueda por destino, provincia, región, actividad, fechas, duración, dificultad, presupuesto, accesibilidad y tipo de anfitrión. Filtros funcionales, mapas con ubicación geográfica validada, geolocalización solo si hay consentimiento, favoritos y comparaciones simples.

Cada experiencia debe mostrar título, descripción editorial, localización, fotos licenciadas, videos autorizados, anfitrión, distintivo y estado de verificación REAL, actividades, qué incluye/no incluye, duración, requisitos, riesgos, recomendaciones, acceso/transportes, política de cancelación, precio y moneda, disponibilidad **solo si está conectada**, origen de la información, reseñas solo si son auténticas. CTA diferente según estado: `Solicitar información`, `Solicitar reserva`, o `Reservar y pagar` **únicamente** cuando la operativa esté disponible.

Crear itinerarios personales (sin obligar a pagar), lista de cosas por llevar, compartir itinerario, recomendaciones por intereses, alertas de seguridad cuando sean oficiales, contacto permitido con anfitriones, y evaluación posterior de experiencias verificadas. No dar información de transporte o seguridad sin fuente actualizable.

## 4 — PASAPORTE GUAMBRA DE CHULLA VIDA: QUE PAREZCA UN LIBRO DE VERDAD

Rehacerlo como un **libro interactivo 3D/2.5D** con lomo, cubierta, contracubierta, profundidad, bordes de páginas, sombras naturales, textura discreta, giro de hoja convincente y sonido opcional desactivado por defecto. En móvil debe ser usable con gesto táctil y controles; escritorio con flechas y teclado. No sacrifiques accesibilidad, velocidad ni lectura por efectos 3D. Ofrece vista alternativa lineal para lectores de pantalla/reduced-motion.

Secciones: portada personalizada; perfil; mapa del Ecuador; destinos visitados; sellos por región/comunidad/experiencia; logros; páginas culturales; diario de viaje privado con fotos; recuerdos; rutas por descubrir. Sellos visuales únicos, animación al desbloquear, barras de progreso y retos responsables. **Nunca otorgar sello de visita real por abrir una tarjeta**: distinguir `explorado virtualmente`, `planeado` y `visita verificada` (por reserva completada y validación del operador, QR temporal u otro mecanismo antifraude). Permitir demo identificada.

## 5 — CULTURA VIVA: CALENDARIO INTEGRADO A LOS DESTINOS

Renombra la sección cultural como **«Cultura Viva»**, con menú «Fiestas y Tradiciones», calendario, mapa, historias y filtros por región, mes, pueblo/comunidad y categoría. El nombre `Raymi` debe reservarse para festividades a las que corresponda, no como etiqueta universal.

Contenido semilla (fechas anuales **orientativas hasta confirmación oficial de cada edición**):

- **Sierra:** Inti Raymi (junio; Otavalo, Cotacachi, Ingapirca; reconocer diferencias locales); Mama Negra (celebraciones de septiembre y noviembre en Latacunga); Fiesta de la Fruta y de las Flores (fechas móviles febrero/marzo en Ambato); Diablada de Píllaro (1–6 de enero); Festival Internacional de Artes Vivas de **Loja**, Sierra, programado en 2026 para 12–22 noviembre (https://cultura.ec/festival/artes-vivas-loja?vista=agenda).
- **Costa:** Rodeo Montuvio (celebraciones alrededor del 12 de octubre, dependiendo de localidad); San Pedro y San Pablo (junio, Manabí); Kasama del pueblo Tsáchila (**Santo Domingo de los Tsáchilas, región Costa**, fecha determinada por calendario ceremonial, no inventar fecha fija).
- **Amazonía:** Fiesta de la Chonta / Uwi de pueblos Shuar/Achuar en localidades y momentos definidos por sus comunidades (referencia estacional abril/mayo; NO reducirla a espectáculo, respetar sus protocolos).
- **Región Insular:** Provincialización de Galápagos (febrero; confirmar programación oficial por isla/municipio).

Cada ficha: nombre oficial y local, descripción contextualizada, comunidad organizadora, ubicación, mes/fecha confirmada, estado de confirmación, precios si existen y están verificados, protocolos culturales y ambientales, accesibilidad, contenido visual autorizado, enlace a organizadores/agenda oficial, fecha de última comprobación y CTA a experiencias relevantes. No presentar eventos históricos o pasados como `próximamente`.

## 6 — CATÁLOGO ORIGINAL: CARGAR LOS 14 DESTINOS

**Importar estas 14 experiencias como contenido inicial EDITABLE, no como ofertas comercializadas ni disponibilidad confirmada.** Todos los precios son **USD referenciales por persona**, pendientes de confirmación por operador. Capacidad, duración, dificultad y servicios también requieren validación. Cada una tendrá slug, ID estable, tags, ficha enriquecida, `verification_status: unverified`, `booking_enabled: false` y estado editorial `referential` hasta aprobación.

1. **Saraguro Ancestral** — Saraguro, Loja; Sierra; 2 días; fácil; hasta 8; **$45**. Pueblo Saraguro, artesanías, vestimenta y gastronomía. Atractivos: comunidades locales, Cerro de Arcos, Baños del Inca, cascadas de Oñacapac. Actividades: turismo comunitario, fotografía, gastronomía, artesanías y recorridos culturales.
2. **Quilotoa Shalalá** — Zumbahua, Pujilí, Cotopaxi; Sierra; 2 días; moderada; hasta 12; **$38**. Laguna del cráter y miradores Shalalá/Quilotoa. Actividades: senderismo, fotografía, paisajes y visitas comunitarias.
3. **Yunguilla** — Calacalí, Quito, Pichincha; Chocó Andino (filtrar en Sierra y subregión Chocó Andino); 1 día; moderada; hasta 15; **$32**. Conservación del bosque nublado, agricultura sostenible, fincas agroecológicas, gastronomía, senderos y turismo comunitario.
4. **Salasaca Viva** — Salasaca, Pelileo, Tungurahua; Sierra; 1 día; fácil; hasta 10; **$30**. Artesanía textil del pueblo Salasaca, mercado, talleres de tejido, recorridos culturales, diseño y gastronomía.
5. **Oyacachi** — Comunidad Oyacachi, El Chaco, Napo; transición Andino-Amazónica (asignar provincia en Amazonía y conservar subregión ecológica); 2 días; fácil; hasta 10; **$35**. Termas, montañas, paisaje, recorridos comunitarios, caminatas, fotografía.
6. **Valle de Íntag** — Cotacachi, Imbabura; Sierra occidental/bosque húmedo; 2 días; moderada; hasta 10; **$34**. Termas de Nangulví, cascadas, ríos, naturaleza, senderismo y turismo comunitario.
7. **Baños de Agua Santa** — Baños, Tungurahua; Sierra; 1 día; moderada; hasta 10; **$35**. Pailón del Diablo, Manto de la Novia, Termas de la Virgen y Ruta de las Cascadas; senderismo, ciclismo, rafting, canopy y cascadas. Aclarar que las actividades de aventura requieren proveedores autorizados y condiciones de seguridad.
8. **Cuenca** — Cuenca, Azuay; Sierra; 1 día; fácil; hasta 10; **$24**. Centro Histórico, Catedral, río Tomebamba, Museo Pumapungo; arquitectura, fotografía, gastronomía y museos.
9. **Parque Nacional Cotopaxi** — Cotopaxi; Sierra; 1 día; moderada; hasta 10; **$40**. Volcán, laguna de Limpiopungo, páramo, fauna; senderismo autorizado, fotografía, ciclismo. Accesos sujetos a clima, actividad volcánica y restricciones oficiales.
10. **Otavalo** — Otavalo, Imbabura; Sierra; 1 día; fácil; hasta 10; **$22**. Plaza de los Ponchos, cascada de Peguche, lago San Pablo; cultura kichwa Otavalo, artesanía, gastronomía y naturaleza.
11. **Quito** — Quito, Pichincha; Sierra; 1 día; fácil; hasta 10; **$8**. Centro Histórico, Plaza Grande, Basílica, La Ronda, El Panecillo; patrimonio, museos, fotografía y gastronomía.
12. **Loja** — Loja, Loja; Sierra; 1 día; fácil; hasta 10; **$7**. Puerta de la Ciudad, Jipiro, San Sebastián y cercanía a Podocarpus; música, gastronomía, cultura e historia. Podocarpus está fuera del centro urbano.
13. **Riobamba** — Riobamba, Chimborazo; Sierra; 1 día; moderada; hasta 10; **$10**. Parque Maldonado, Catedral, Parque 21 de Abril y vistas del Chimborazo; patrimonio, fotografía, gastronomía y excursiones.
14. **Mindo** — San Miguel de los Bancos, Pichincha; Chocó Andino (filtro Sierra/subregión); 1 día; fácil; hasta 10; **$28**. Cascadas, bosque nublado, mariposas, orquídeas, aves, tarabita, canopy, café y chocolate.

**Ampliación territorial:** preparar el CMS para nuevas experiencias verificadas de Esmeraldas, Manabí, Guayas, Santa Elena, El Oro, Los Ríos, Santo Domingo de los Tsáchilas, Napo, Pastaza, Orellana, Sucumbíos, Morona Santiago, Zamora Chinchipe y Galápagos. Puedes crear **fichas de inspiración NO reservables** basadas en atractivos públicamente verificados, diferenciándolas claramente de experiencias reales operadas por Chulla Vida. No inventar prestadores ni precios.

## 7 — ASISTENTE INTELIGENTE Y DE VOZ «MIJIN»

Implementa una **guía de Chulla Vida** accesible desde todas las páginas, con conversación por texto y por voz (micrófono opt-in, reproducción de voz opt-in, botón para detener, subtítulos/transcripción, alternativa cuando el navegador no soporte voz). Debe conocer todo lo publicado y estar integrada con datos del sistema, **no con respuestas improvisadas**.

### Conocimiento que debe consultar

- 14 destinos anteriores con detalles, precios **referenciales**, duración, actividades y advertencias.
- Calendario Cultura Viva con fechas de **cada edición**, estado confirmado/no confirmado y vínculos oficiales.
- Descripciones, fotos con sus créditos, videos, restaurantes/negocios autorizados, comunidades y experiencias del CMS.
- Preguntas frecuentes, tutorial, registro, roles, verificación de negocios, políticas, pagos, cancelaciones, accesibilidad, comportamiento responsable y modo sin internet.
- Sesión y datos **del usuario autenticado únicamente cuando otorgue permiso y exista autorización**, como favoritos, estado de su solicitud, reservas propias y progreso del pasaporte. Nunca revelar datos privados de otros.
- Si está disponible: búsquedas filtradas en catálogo, abrir una ficha, filtrar por presupuesto/región/duración, crear un borrador de itinerario y remitir al checkout visible. **No procesar pagos, aprobar negocios ni cambiar reservas sin confirmación explícita y validación del backend.**

### Arquitectura

Construye sistema RAG o recuperación híbrida basado en la base de datos (consulta estructurada para datos como precios/fechas + búsqueda semántica para descripciones/documentos), tablas `knowledge_documents`, `knowledge_chunks`, `knowledge_sources`, `assistant_sessions`, `assistant_messages`, `assistant_feedback` y `content_last_verified_at`, según necesidades. Si no existe proveedor IA o clave, crear UI, API adapter y **modo FAQs determinista claramente identificado**, sin afirmar que es IA operativa. La IA debe recibir datos actuales desde el servidor; las citas deben abrir la ficha o fuente original y mostrar fecha de actualización. Separar contexto público y privado. Limitar rate, gastos y tamaño del contexto; registrar eventos sin guardar voz cruda por defecto.

### Voz, lenguaje y seguridad

- Priorizar español de Ecuador claro, opcional inglés; no prometer respuestas precisas en lenguas indígenas sin adaptación y revisión comunitaria.
- Tono amistoso: «¿Buscas aventura, cultura o relax?», no imitar acentos indígenas ni fingir pertenecer a una comunidad.
- Speech-to-text/text-to-speech mediante APIs de navegador o proveedor configurable; manejar permisos, errores, silencio, accesibilidad y coste. Nunca grabar sin consentimiento.
- No inventar horarios, clima actual, estado de carreteras, seguridad, disponibilidad, festividades ni precios. Distinguir `dato actualizado`, `dato del catálogo`, `dato sin verificar` y `no disponible`.
- Si está sin conexión: explicar la limitación, ofrecer **guía local descargada** y FAQ offline; no prometer respuestas de IA remota.

### Pruebas obligatorias del asistente

Que responda con fuentes y sin alucinar: «Tengo $40, ¿qué destinos puedo explorar?», «¿Qué fiestas hay en noviembre?», «¿Cómo llego a Quilotoa?», «¿Cómo verifico mi negocio?», «¿Qué puedo descargar para viajar sin señal?», «¿Cuál es mi próxima reserva?» (solo datos propios y si existe), «¿Puedo pagar con tarjeta?», «¿Cuál es la diferencia entre los planes?», «¿Dónde sellé mi pasaporte?».

## 8 — SISTEMA DE VIDEO Y MEDIOS SOCIALES

Crear «Historias del Ecuador» con un feed vertical de videos cortos filtrables por región/tema, subida de videos **propios o autorizados** por anfitriones, revisión y moderación, captions, controles de reproducción, enlaces a experiencias y tamaño optimizado. Prepara un creador básico de historias: portada, texto superpuesto, recorte/plantillas cuando la tecnología existente lo permita, previsualización, subtítulos y publicación tras moderación. No prometer edición de video avanzada sin implementarla; el MVP puede empezar con subir/reordenar clips y plantillas.

Permitir links reales de Instagram, YouTube y TikTok por experiencia/evento a través de un CMS con `platform`, `url`, `creator_name`, `permission_status`, `attribution`, `checked_at` y vista previa. Usar embebidos soportados por las plataformas y permisos/API de Meta cuando aplique. Alternativa si el embed falla: portada con licencia + CTA «Ver en Instagram». **Prohibido inventar links de posts, extraer videos de terceros sin permiso, hacer scraping de medios privados o copiar contenidos sin autorización.** Preparar campo de links vacíos pendientes de curación y un dashboard para completarlos.

Videos hero pueden proceder de producción original, material licenciado o clips suministrados por el administrador. Crear fallback visual de calidad. En CMS, destacar contenidos por Costa/Sierra/Amazonía/Galápagos y por jóvenes creadores con consentimiento.

## 9 — SUPABASE: AUTH + POSTGRES + STORAGE + POLÍTICAS

Conectar Supabase si existe proyecto y variables; en caso contrario dejar migraciones SQL ejecutables, `.env.example` y guía paso a paso. No mezclar datos demo con producción. Esquema propuesto adaptable al repositorio, con claves foráneas, índices, auditoría y restricciones:

- `profiles`: auth user id, display_name, locale, role flags, verified_email (derivado de auth), onboarding, avatar, consent timestamps.
- `organizations`, `organization_members`: comunidad/empresa, datos públicos, contactos autorizados, rol propietario/gestor, RUC cuando corresponda en estructura protegida, estado.
- `merchant_verification_requests`, `verification_documents` (bucket privado), `verification_reviews`, `verification_audit_logs`, expiración y revisión periódica.
- `regions`, `provinces`, `communities`, `destinations`, `experiences`, `experience_media`, `experience_inclusions`, `experience_dates`, `availability_slots`, `experience_tags`.
- `events`, `event_editions`, `event_sources`, `cultural_protocols`.
- `favorites`, `itineraries`, `itinerary_items`, `bookings`, `booking_participants`, `booking_status_history`, `reviews`.
- `payments`, `payment_attempts`, `payment_events`, `refunds`, `plans`, `subscriptions`, `subscription_events`, `invoices_or_receipts`.
- `passport_profiles`, `passport_stamps`, `stamp_rules`, `passport_journal_entries`, `achievements`, `visit_verifications`.
- `media_assets`, `social_links`, `media_permissions`, `video_submissions`, `content_reports`.
- `knowledge_documents`, `knowledge_sources`, `assistant_sessions`, `assistant_messages`, `faq_entries`, `notifications`, `admin_audit_logs`.

Añade `status`, `published_at`, `created_at`, `updated_at`, `source_url`, `verified_at` cuando tengan sentido. Seed **idempotente** para destinos y festividades. Migraciones versionadas y datos de prueba marcados. Cargar solo contenido aprobado en listados públicos; contenido referencial explícito si se hace público. Storage: público solo imágenes autorizadas, privado documentos de verificación y diarios personales.

### Seguridad de acceso

Activar **Row Level Security** para todas las tablas expuestas y reglas por propietario/rol organizacional; perfiles privados propios, contenido público publicado, solicitudes de verificación solo propietario+revisor, documentos privados, reservas solo viajero implicado+operador asignado+admin, pagos solo partes autorizadas, pasaporte privado configurable. El frontend nunca debe poder autoconcederse `admin`, `verified_merchant` o `stamp_verified`. Validaciones críticas en funciones servidor/Edge Functions. Usar rate limits, idempotency keys, validación de firmas de webhooks, pruebas de escalada de privilegios, backups y política de retención.

## 10 — REGISTRO, CORREO Y ROLES

Crear login/registro, recuperación de contraseña, correo de confirmación, reenvío controlado y pantallas de errores reales usando Supabase Auth. Si se habilitan OAuth, confirmar primero los proveedores y dominios. Crear plantillas de correo con marca Chulla Vida para: confirmar email, bienvenida, recuperación, solicitud de verificación recibida/aprobada/rechazada, reserva/pago validado, cambios/cancelaciones; plantillas de correo de negocio con remitente autenticado (SMTP/servicio apropiado) si Supabase default no sirve para producción. No dar acceso a reservas o datos privados hasta autenticación correcta.

Roles: visitante anónimo, viajero autenticado, representante de comunidad, comerciante/anfitrión, revisor de verificación, moderador y administrador. Un usuario puede tener múltiples membresías autorizadas. Todo cambio de rol privilegiado requiere backend y auditoría.

## 11 — VERIFICACIÓN REAL DE NEGOCIOS Y COMUNIDADES

Diseñar flujo robusto, pero amigable para emprendimientos rurales que quizá no tengan todos los documentos de una empresa tradicional:

1. Registro y correo confirmado.
2. Selección de figura: establecimiento, operador turístico, guía, asociación comunitaria, representante autorizado u otro.
3. Formulario de datos públicos y contacto; documentación mínima apropiada por actividad y figura jurídica; RUC u otros soportes **cuando legalmente corresponda**; evidencia de representación de la comunidad; aceptación de políticas.
4. Subida segura a bucket privado, consentimiento de tratamiento, límite de acceso, protección de documentos.
5. Revisión humana con checklist, posibilidad de subsanar, rechazo fundamentado y apelación.
6. Consulta de registro/permiso turístico pertinente **cuando la actividad lo requiera** a través del portal oficial: https://servicios.turismo.gob.ec/registro-de-actividades-turisticas/ . No asumir que todos los anfitriones necesitan el mismo documento.
7. Distintivo claro: `Identidad y documentación revisadas por Chulla Vida` **solo tras revisión**; separar de `Registro turístico oficial verificado` cuando exista evidencia de ese registro. No insinuar aval del Gobierno.
8. Revalidación, reportes, suspensión y medidas antifraude. No publicar cédulas, RUC privados, archivos ni teléfonos personales sin consentimiento adecuado.

Panel del verificador con cola, documentación, notas protegidas, estados y auditoría. Panel anfitrión para crear/editar experiencia, tarifas, fechas, capacidad, solicitud y seguimiento de reserva, reseñas, multimedia y métricas; capacidad de crear un borrador aun sin verificación, pero no publicarlo como oferta reservable hasta validación.

## 12 — RESERVAS, TARJETAS, SUSCRIPCIONES Y BILLETERA DE VIAJE

Implementar máquina de estados clara: `draft → requested → awaiting_merchant_confirmation → confirmed → awaiting_payment → paid → completed` con caminos para `expired`, `cancelled`, `refunded`, `payment_failed`, ajustados según si se cobra antes o después de la confirmación. No vender un paquete con tarifa no validada; impedir doble reserva/cupos excedidos y usar transacciones/locks e idempotencia. Definir política de cancelación transparente por operador y obligaciones fiscales con asesoría local.

**Pagos Ecuador:** estudiar y usar integración modular con **PayPhone** como primera opción y **Kushki** como alternativa, sujeto a afiliación, aprobación, comisiones y capacidades contratadas. Documentación: https://docs.payphone.app/ y https://api-docs.kushkipagos.com/es/ecuador/online-payments . Aceptar tarjetas únicamente por checkout/tokenización del proveedor. No almacenar PAN/CVV en Chulla Vida. Crear sandbox, confirmación por backend/webhook confiable, verificación de monto/moneda/reserva/duplicados, recibos, conciliación, reembolsos y control de errores. Si no existen credenciales, dejar flujo sandbox señalado y operaciones live deshabilitadas; jamás mostrar «pago confirmado» solo por redirección de navegador.

**Planes de pago/suscripciones:** construye administración de planes configurable, sin inventar precios ni beneficios como oficiales. Propuesta editorial a aprobar: `Explorador Gratis` (descubrimiento, favoritos, pasaporte básico), `Viajero Plus` (herramientas avanzadas/experiencias digitales) y `Anfitrión Comunidad/Negocio` (panel y publicaciones); tarifas inicialmente `pendiente de definición`, posibilidad de activar pruebas gratuitas/cupones, suscripciones y facturación solo con gateway compatible probado. Separar tarifa de membresía y precio de cada experiencia. Si «planes de pago» significa cuotas/diferidos con tarjeta, ofrecerlos solo si el proveedor y emisor los habilitan; no inventar financiación.

**Billetera Chulla:** en MVP crear **billetera de viaje no custodial** con historial de pagos, comprobantes, reservas, promociones, cupones y pases/sellos. **No almacenar saldo monetario recargable, captar depósitos ni operar transferencias entre usuarios sin primero validar marco regulatorio y proveedor autorizado**. Si se desean créditos/reembolsos, estudiar tratamiento legal y usar proveedor que soporte obligaciones correspondientes.

## 13 — MODO SIN INTERNET VERDADERO

Convertir a **Progressive Web App** instalable: manifest, service worker, caching por tipo de recurso, página offline personalizada y opción «Descargar para mi viaje». Guardar en IndexedDB datos estructurados y versiones de contenidos: fichas, rutas de itinerario, mapas o mapas esquemáticos licenciados si es posible, guías de cultura, contactos de emergencia públicos y el pasaporte descargado. Mostar tamaño de descarga, fecha de actualización y posibilidad de borrar datos privados/caché. Reconciliar al reconectar con resolución de conflictos y feedback visual.

Offline debe permitir leer contenidos **ya descargados**, consultar favoritos/itinerario local, anotar en el diario y visualizar pasaporte básico. Pagos, reservas nuevas confirmadas, verificación de visitas, disponibilidad en tiempo real, streaming y asistente IA remota requieren internet; bloquearlos elegantemente en lugar de simular éxito. No cachear información sensible ni transacciones privadas en dispositivos compartidos sin diseño de seguridad. Probar en modo avión/devtools y red lenta.

## 14 — PANEL ADMINISTRADOR / CMS

Crear dashboard privado para: destinos, regiones, comunidades, eventos y ediciones, precio/estado/fuente, videos e Instagram, biblioteca con licencias, publicación y moderación, comerciantes/solicitudes, reservas, pagos/reembolsos, planes, FAQs, documentos de conocimiento de la IA, permisos, traducciones, estadísticas y auditoría. Editor usable por equipo no técnico. Cada cambio de contenido del asistente debe reflejarse en sus respuestas sin editar código. Distinguir métricas reales de datos demo; no inventar «10.000 viajeros» o «500 negocios».

## 15 — CONFIANZA, SOSTENIBILIDAD, PRIVACIDAD Y SEGURIDAD

Integrar políticas de privacidad, términos, cancelaciones, reclamaciones, accesibilidad y consentimiento para contenido generado por usuarios, compatibles con legislación ecuatoriana (incluida Ley Orgánica de Protección de Datos Personales; requiere revisión legal antes de producción). Controles de reportar contenido, bloquear abuso, autorización para fotografías y video de personas y comunidades, protección de menores, normas de turismo responsable, impacto comunitario y canales de soporte. No fomentar visitas sin permiso a sitios ceremoniales/zonas protegidas; reportar riesgos sin crear falsas garantías. Ofrecer contactos de emergencia públicos verificados, pero no sustituir autoridades locales.

## 16 — ARQUITECTURA, PERFORMANCE Y SEO

Si el proyecto actual lo permite, usar TypeScript estricto, componentes reutilizables, validación en límites, estados con manejo de error, routing semántico, skeletons, `loading/empty/error/success`, caching correcto, medios optimizados y registros sin datos sensibles. Para SEO, páginas por destino/fiesta, metadatos, Open Graph, sitemap, canonical, datos estructurados de eventos/ofertas **solo si son reales y verificables**, navegación por región y buena indexación. Optimizar LCP/CLS/INP con objetivos medibles, lazy loading de videos/embeds, tamaños de imágenes, streaming con poster y low-bandwidth mode. Usar analítica respetuosa de consentimiento, funnels de onboarding/búsqueda/contacto/reserva sin inventar conversiones.

## 17 — CRITERIOS DE ACEPTACIÓN (HACER PRUEBAS)

- El proyecto arranca localmente con instrucciones; build/lint/typecheck y tests relevantes pasan; no quedan errores críticos en consola.
- La homepage tiene identidad diferenciada, mobile-first, cuatro regiones y hero de calidad con fallback; logo original funcional.
- Se puede elegir Viajero/Negocio/Explorar; tutorial adaptable que puede omitirse o reiniciarse.
- Las 33 fichas (14 destinos base + 7 experiencias de Costa + 12 fichas de Galápagos) aparecen con filtros, fichas, descripciones reales del catálogo y aviso visible de precio referencial; todos carecen de reserva pagada hasta validación.
- Cultura Viva tiene eventos sembrados con región correcta, año/fecha/estado y fuente; Loja está en Sierra y Kasama en Costa.
- El pasaporte parece libro con giro de hoja, teclado, móvil, modo de movimiento reducido y reglas de sellado honestas.
- Registro Supabase: confirmación correo, login, reset, RLS y roles; probado con cuentas de prueba. Si faltan credenciales, el repo tiene migraciones y pasos reproducibles claramente marcados.
- Un comerciante puede enviar solicitud y admin revisarla; no aparece un «verificado» automático. Documentos privados, acceso controlado.
- Pago en sandbox se registra por backend con idempotencia; sin credenciales no habilita pago real. Nunca se confirma una reserva basándose solo en un clic.
- PWA guarda datos seleccionados y los presenta sin conexión; compras y datos frescos indican correctamente «requiere internet».
- Asistente usa datos del catálogo y la BD, expresa incertidumbre, referencias, fallback por voz/texto y no expone datos privados.
- Medios sociales: enlaces reales curados, atribución, embeds permitidos y fallback; no URLs inventadas.
- Panel admin permite editar destinos, fiestas, FAQ y multimedia; los cambios alimentan contenido de la asistente.
- Pruebas de permisos cruzados, formularios, estados de error, rutas, responsive, accesibilidad, carga lenta, 404 y seguridad básica.

## 18 — ORDEN DE EJECUCIÓN OBLIGATORIO

**FASE 0 — Diagnóstico:** reconocer repositorio/stack, instalar dependencias si procede, ejecutar app y tests, crear auditoría con prioridades, identificar activos recuperables, vulnerabilidades y errores UX. No exponer secretos.

**FASE 1 — Base sólida:** corregir bugs críticos, modelo de datos, migraciones, roles, Supabase Auth, RLS, fixtures y estructura. Preparar entorno si faltan credenciales.

**FASE 2 — Experiencia impresionante:** design system, home, regiones, navegación, responsive, logo, motion, fichas, media, onboarding y primera versión del pasaporte.

**FASE 3 — Marketplace real:** onboarding negocio, verificación, CMS, calendarios, reservas/solicitudes y flujos reales con permisos.

**FASE 4 — Monetización controlada:** proveedores de pago en sandbox, webhooks, suscripciones configurables, billetera documental, recibos.

**FASE 5 — Asistente + video + offline:** conocimiento estructurado/RAG, voz y modo texto, feed de videos y embeds, PWA y sincronización.

**FASE 6 — Pulido y lanzamiento demo:** QA automatizada/manual, animaciones, seguridad, performance, accesibilidad, SEO, datos demo marcados, checklist de credenciales, presentación e instrucciones de despliegue.

En cada fase, implementa el mayor alcance funcional posible con las herramientas y cuentas disponibles; reporta honestamente lo no completado. Si el proyecto es enorme, termina **un recorrido vertical usable** en vez de 30 pantallas desconectadas. Prioriza primero explorar → destino → solicitar reserva y registrarse → solicitar verificación → revisión admin; después agrega pagos y funciones avanzadas.

## 19 — DOCUMENTOS Y ENTREGABLES FINALES

Entregar dentro del repo:

- `docs/AUDITORIA_CHULLA_VIDA.md` — defectos, severidades, mejoras aplicadas y pendientes.
- `docs/ARQUITECTURA.md` — stack real, decisiones y diagrama de datos/flujos.
- `docs/SUPABASE_SETUP.md` — proyecto, auth, SMTP, storage, migraciones, seeds y RLS.
- `docs/VERIFICACION_COMERCIANTES.md` — operación y revisión humana.
- `docs/PAGOS_ECUADOR.md` — decisión de gateway, sandbox, webhooks y pasos live.
- `docs/ASISTENTE_IA.md` — fuentes, herramientas, límites, privacidad, voz, costos y pruebas.
- `docs/CONTENIDO_Y_DERECHOS.md` — fuentes, imágenes, licencias, embebidos sociales y pendientes.
- `docs/MODO_OFFLINE.md` — qué funciona sin señal y límites.
- `docs/QA_CHECKLIST.md` — casos automatizados/manuales y resultados.
- `docs/ROADMAP.md` — hechos, pendientes, bloqueados por credenciales/validación y fase siguiente.
- `.env.example` seguro, migraciones SQL, seeds idempotentes, scripts reproducibles y README para arrancar.

**Informe final al terminar:** 1) diagnóstico inicial resumido, 2) lista concreta de archivos creados/modificados, 3) funcionalidades que realmente funcionan, 4) funciones solo demo o sandbox, 5) bloqueos que requieren mis claves/cuentas/decisiones, 6) pruebas ejecutadas y resultados, 7) instrucciones exactas para probar viajero, negocio y administrador.

## 20 — DECISIONES QUE PUEDES TOMAR SIN INTERRUMPIRME

Conserva la arquitectura existente si es razonable. Usa **Supabase** como backend principal solicitado; moneda USD; las cuatro regiones del Ecuador; idiomas es-EC primero y en opcional; mobile-first; agenda «Cultura Viva»; asistente «MIJIN» como nombre provisional editable; contenido semilla de las 33 fichas turísticas de tres catálogos y festividades; cuentas demo diferenciadas, pero no fingidas como verificadas; modo «próximamente» solo para integraciones no disponibles y no como excusa para dejar sin implementar la UI o lógica base.

**Solo pregúntame** cuando realmente sea indispensable para avanzar: acceso al repositorio, URL/variables de Supabase, credenciales del gateway de prueba, autorización/licencias de material multimedia, empresa responsable de facturación, planes/precios comerciales y procedimiento de revisión de comerciantes. Para todo lo demás, toma decisiones profesionales documentadas e implementa.

## 21 — ALCANCE V3 DEFINITIVO Y CONVERSIÓN DE LOS TRES CATÁLOGOS

**ESTAS INSTRUCCIONES PREVALECEN** sobre cualquier mención antigua a solo 14 destinos, al asistente «Chullita» o a nombres temporales. Marca: **CHULLA VIDA**. Asistente: **MIJIN — Tu pana de aventuras**. Pasaporte: **Pasaporte Guambra**. Motor de rutas: **Chulla Flex**. Turismo con mascotas: **Chulla Pet**. Explorar comunidades y cultura: **Cultura Viva**. El alcance editorial incluye **33 fichas**: 14 destinos del catálogo general, 7 experiencias de la Costa y 12 experiencias/planes de Galápagos; varias fichas de Galápagos son combinaciones o planes y **no equivalen a 33 lugares geográficos únicos**. Conserva los documentos originales como fuentes de referencia, no como inventario contractual o tarifario aprobado.

### Archivos que debes importar integralmente

1. `catalogos/01_catalogo_14_destinos.txt`: 14 fichas completas, descripción, actividades, atractivos, duración, capacidad, dificultad y precios de referencia.
2. `catalogos/02_galapagos_12_experiencias.txt`: 12 fichas de Galápagos, sus variaciones, advertencias, tarifas, restricciones y supuestos. **Importa sus notas de incertidumbre** y tasas/costos por separado. No vendas los planes sin convenio ni confirmación de vuelos, accesos y operadores.
3. `catalogos/03_costa_7_experiencias_original.pdf` y `catalogos/03_costa_7_experiencias_extraido.txt`: 7 experiencias con textos, horarios tentativos, inclusiones, exclusiones, recomendaciones, precios propuestos y puntos de encuentro. Usa la versión PDF para resolver divergencias del texto extraído; no elimines los avisos legales/contractuales.
4. `legales/*.md`: borradores completos de términos, privacidad, cookies, comerciantes, comunidades, devoluciones, consentimiento y acuerdo de encargados de tratamiento. Son **plantillas para revisión legal**, no garantías de cumplimiento automático.

### Costa: las 7 fichas y sus tarifas propuestas (NO habilitar compra)

| Experiencia | Ubicación | Duración | Propuesta USD/persona | Particularidad |
|---|---|---|---:|---|
| Raíces de Manabí | Comunidad Agua Blanca, Puerto López, Manabí | 4–5 h | 25 | Patrimonio manteño, museo, sendero, laguna y comida comunitaria, si se confirma |
| Guayaquil Vivo | Centro/Malecón, Guayaquil, Guayas | 5–6 h | 39 | Ruta patrimonial, almuerzo y atracción/actividad fluvial solo mediante convenio |
| Pacífico Activo | Salinas, Santa Elena | 5–6 h | 49 | Playa, actividad guiada, miradores y equipo de seguridad sujeto a operador |
| Sabores de Manta | Manta, Manabí | 4–5 h | 39 | Cultura y degustación gastronómica, verificar menú y aliados |
| Aventura Marina | Salango, Puerto López, Manabí | 3–4 h | 49 | Salida en embarcación y snorkel únicamente con condiciones seguras |
| Expedición Natural | Isla de la Plata desde Puerto López, Manabí | 7–9 h | 69 | Navegación, aves, senderos y snorkel condicionado |
| Ola y Manglar | Mompiche, Muisne, Esmeraldas | 5–6 h | 59 | Surf guiado, alimentación; no prometer visita al manglar sin convenio |

**No incluye traslado a los puntos de encuentro salvo especificación expresa del operador.** Los importes del PDF son propuestas de noviembre de 2026, no cotizaciones aceptadas ni precios oficiales. Mantener servicios tentativos, inclusiones, exclusiones, condiciones y horarios por ficha, sin mezclar unos con otros.

### Galápagos: las 12 fichas de la fuente, conservar rangos y costes separados

1. Bartolomé y Bahía Sullivan, Santa Cruz — USD 270–315 referenciales.
2. Seymour Norte y Las Bachas, Santa Cruz — USD 300–315 referenciales.
3. Plaza Sur y Punta Carrión, Santa Cruz — desde USD 270, pendiente de confirmación.
4. Kicker Rock (León Dormido) y Tour 360°, San Cristóbal — USD 216–220 referenciales.
5. San Cristóbal terrestre: El Junco, Galapaguera y Puerto Chino — USD 50–60, dato antiguo por confirmar; comprobar cierres antes de mostrar recomendaciones activas.
6. Los Túneles / Cabo Rosa, Isabela — USD 150–190 referenciales.
7. Volcán Sierra Negra y Volcán Chico, Isabela — desde EUR 46,40, **no convertir silenciosamente** ni presentar como tarifa en USD confirmada.
8. Tintoreras y Concha Perla, Isabela — desde EUR 56, pendiente de confirmación.
9. Isabela en 4 días — USD 855–1.135 por persona según grupo; mostrar desglose explícito de tamaño del grupo.
10. Galápagos Origins: Santa Cruz y San Cristóbal, 5 días — USD 1.200–1.600 referenciales; vuelos/tasa aparte según fuente.
11. Plan económico 5 días/4 noches — USD 510 estimados en islas, totales orientativos dependientes de vuelos y condiciones personales; no son reservas.
12. Plan normal 5 días/4 noches — USD 1.193 estimados en islas, totales orientativos dependientes de vuelos y tasas; no son reservas.

**ATENCIÓN A LA VIGENCIA:** el catálogo menciona restricciones e inundaciones de octubre/noviembre de 2026. Son una **fotografía histórica fechada**, no un feed de seguridad en tiempo real. Mostrar hora/fuente original, y al planificar hoy consultar fuentes actuales del Parque Nacional Galápagos, operadores y organismos competentes. No dar por abiertas rutas que el catálogo describe cerradas. Mostrar tasas de ingreso, tarjeta de tránsito, traslado interislas y vuelos como conceptos separados y revalidar **valores y requisitos por nacionalidad/residencia/edad** antes de cotizar. Promover cumplimiento estricto de reglas del Parque Nacional y guías autorizadas donde sean obligatorias. **Chulla Pet no debe afirmar acceso de mascotas a zonas protegidas sin permiso expreso.**

**Modelo de datos de ingestión:** `content_source_id`, `original_document`, `original_price_currency`, `price_min`, `price_max`, `price_type: proposed|referential|verified_offer`, `price_includes`, `price_excludes`, `pricing_assumptions`, `activity_constraints`, `access_status`, `access_checked_at`, `operator_verification_status`, `booking_enabled=false`, `source_checked_at`, `verified_by`, `content_version`, `localized_region`, `subregion`, `province`, `geospatial_coordinates_verified`. Mantén slug y procedencia. No agregues coordenadas de precisión dudosa ni URLs inventadas. QA: 14+7+12 importados, documentos íntegros y las 7 fichas de Costa preservan programa e inclusiones.

## 22 — MIJIN: ASISTENTE DE VOZ COMPLETO, TURÍSTICO Y MULTIMODAL

**Nombre definitivo: MIJIN. Lema: «Tu pana de aventuras»**. Debe ser un asistente útil integrado en **cada pantalla**, no un chatbot decorativo. Arquitectura extensible con conversación por voz y texto, búsqueda estructurada y semántica, herramientas verificadas, respuestas habladas opcionales, información visual y acciones seguras. Animación/avatar propio, controles accesibles, tono ecuatoriano amable sin clichés étnicos, ni fingir que es persona, guía certificado u operador de emergencias. Preferir español ecuatoriano; inglés opcional. Tener un botón visible «Habla con MIJIN» y acceso por teclado y lector de pantalla.

### Capacidades requeridas de MIJIN

- **Clima:** «¿Qué tiempo hace hoy en Baños?», temperatura, sensación térmica, lluvia/probabilidad, viento, pronóstico por día/hora, mejor momento para recorrer y recomendaciones de ropa. Integración meteorológica configurable, por ejemplo Open-Meteo (https://open-meteo.com/en/docs), sujeta a licencia y uso permitido, y avisos oficiales del INAMHI (https://servicios.inamhi.gob.ec/alertas/). Distinguir pronósticos modelados de observaciones, decir **hora de consulta, zona horaria, origen y antigüedad**. No inventar datos ni atribuir alertas inexistentes al INAMHI. Sin fuente disponible: «No tengo el clima actualizado». La predicción nunca sustituye alertas oficiales.
- **Desastres y transporte:** avisos verificados sobre lluvias, deslizamientos, derrumbes, vías cerradas, restricciones de parques/atractivos; adaptadores con fuentes oficiales cuando exista feed autorizado, actualización auditada y verificación manual de administración. Sin integración no prometer vigilancia en tiempo real; priorizar seguridad y ofrecer enlaces/telefonía oficial, incluida emergencia 911 en Ecuador cuando corresponda.
- **Explorar:** preguntar «¿Dónde estás saliendo?», presupuesto **total** en USD, fecha, noches, acompañantes, mascotas, estilo de viaje, movilidad y nivel físico. Recomendar experiencias de las 33 fichas y futuras fichas del CMS, con fuentes, fechas, costes desglosados, peligros y restricciones.
- **Chulla Flex:** consultar itinerario real, identificar conflicto por clima/cierre/horario/disponibilidad, explicar por qué propone cambio y ofrecer 2–3 alternativas cercanas que no superen presupuesto/tiempo ni violen seguridad; pedir confirmación antes de modificar la reserva o guardar cambios. En ausencia de feed confiable no hacer cambios automáticos silenciosos.
- **Chulla Pet:** «Voy a Baños con mi perro», filtrar actividades/traslados/hospedajes donde hay **política de mascotas verificada**, tamaño admitido, número, correa, vacunas/documentación, restricciones y cargos, sin inventar negocios pet-friendly.
- **Cultura y comunidad:** pueblos, gastronomía, fiestas, respeto cultural, anfitriones, protocolos fotográficos, festividades con fecha confirmada y región apropiada; enlace a fuentes y fichas. No reproducir contenido tradicional no autorizado ni presentar ceremonias privadas como espectáculos públicos.
- **Precios y reservas:** explicar **precio base frente a presupuesto total** con transporte/hospedaje/comida/tasas/mascotas/contingencia, reservas propias autenticadas, pagos verificados por sistema, devoluciones y términos; no inventar cupos ni cobros. Puede iniciar un borrador, jamás cobrar sin confirmación explícita del usuario.
- **Uso de la plataforma:** tutorial hablado, registro, verificación de email y negocio, pasaporte, sellos, offline, configuraciones de consentimiento, privacidad, cookies, reportes y soporte. Puede leer el resumen de términos, pero debe abrir siempre el texto integral cuando lo pidan.
- **Accesibilidad:** ritmo de voz ajustable, subtítulos/transcripciones, respuesta textual equivalente, idioma seleccionable, cancelación/interrupción, sin depender de voz para funciones críticas. No necesitar permiso de micrófono para usar texto.
- **Contenido audiovisual:** mostrar tarjeta, mapa, miniatura y video enlazado donde existe permiso. No extraer videos privados sin autorización.
- **Personalización legítima:** favoritos, ubicación aproximada y reservas propias solo si se le autorizó y backend lo permite; modo invitado con consultas públicas sin iniciar sesión.

### Interacción de voz de calidad

1. Solicitar permiso **explícito e independiente** al tocar micrófono. `push-to-talk` / tocar para hablar por defecto; no micrófono abierto permanente, no palabra de activación siempre escuchando salvo aceptación específica y soporte verificado.
2. Manejar escucha, transcripción, procesamiento, generación de respuesta y reproducción con estados visuales y auditivos, latencia razonable, repetición y «detener voz». Permitir interrumpir una respuesta en curso (*barge-in* cuando la tecnología lo permita) y corrección de transcripciones.
3. STT/TTS mediante API compatible del navegador o proveedor externo configurable. No presentar como «IA de voz en vivo» si solo existen lectura de texto y STT parcial. En móviles y navegadores que no soportan voz, degradación clara a texto.
4. Configurar voz cálida, velocidad, volumen y opción sin audio; jamás imitar voces identificables sin consentimiento. Confirmar transcripción antes de ejecutar acciones sensibles (reservas, cancelaciones, cambio de datos, pagos).
5. No guardar **audio bruto por defecto**. Transcripciones persistentes solo si se justifica, se informa y se permite gestionarlas; indicar al usuario proveedor externo de IA/voz si transfiere datos. Límites de cuota/abuso, registro pseudonimizado, borrado y control de retención.
6. Si el usuario dice «Mijin, ¿qué es el dato personal y cómo puedo borrar mis datos?», explicar con fidelidad política y abrir controles reales. Si solicita un dato ajeno: rechazar.

### Contrato de herramientas seguro (backend)

Implementar herramientas tipadas, auditables y con autorización por usuario: `search_destinations(filters)`, `get_experience(id)`, `get_cultural_calendar(region,date)`, `get_weather(lat,lon,range)`, `get_official_advisories(area)`, `get_route_status(origin,destination)`, `estimate_trip_budget(input)`, `search_pet_friendly(input)`, `plan_itinerary(input)`, `propose_itinerary_replacements(id,constraints)`, `get_own_booking(id)`, `show_terms(document,version)`, `get_passport_progress(user)`, `get_offline_guide(location)`. Acciones mutativas mediante endpoints separados con verificación de sesión/autorización, CSRF donde aplique y **confirmación explícita**: `save_itinerary`, `request_booking`, `cancel_booking`, `change_notification_preferences`. La IA nunca usa directamente claves admin ni escritura SQL sin autorización. Reglas de rechazo de instrucciones maliciosas de documentos/usuarios (prompt injection), enmascarar PII, verificar salidas y fuentes.

### Datos de respuesta estructurados

Cada respuesta debería poder renderizar `spoken_summary`, `text`, `cards`, `suggested_actions`, `source_names`, `source_urls`, `data_freshness`, `warnings`, `prices_are_estimates`, `needs_confirmation`. Si no hay herramienta disponible responder sin fingir acceso. Ejemplo: «Mijín, este es el pronóstico actualizado a las 08:00; hay posibilidad de lluvia, pero antes de ir revisemos alertas oficiales y accesos». Ese ejemplo **no implica un pronóstico real**.

### MIJIN sin internet

Asegura **dos modos distintos**: ONLINE, con herramientas y modelos configurados; OFFLINE, con buscador local/FAQ y guías predescargadas. El asistente offline **no garantiza inteligencia conversacional generativa**. Se puede ofrecer voz local si el dispositivo soporta reconocimiento y síntesis **sin conexión verificada**; si no, responder mediante texto y búsqueda. Nunca enviar la consulta silenciosamente cuando el usuario eligió offline; no anunciar clima actual o rutas abiertas con último dato cacheado. Mostrar «última descarga» y «podría estar desactualizado».

### Pruebas de diálogo que debes implementar

«Estoy en Baños, tengo 4 horas y 25 dólares, ¿qué hago?», «¿Llueve mañana en Quilotoa?», «Viajo de Guayaquil con $20 en total, ¿a dónde puedo llegar?», «Una vía a Mindo está cerrada, cambia el plan», «¿Puedo ir con perro al Parque Nacional Galápagos?», «¿Cuánto llega a una comunidad si pago $49?», «No tengo internet, explícame mi ruta», «No quiero cookies de analítica», «Quiero retirar consentimiento de ubicación», «Quiero borrar mi audio», «¿Cuánto tiempo falta para mi reserva?» y «¿Qué información guardan de mí?». Asegurar que no invente resultados.

## 23 — CHULLA FLEX: ITINERARIOS ADAPTATIVOS SIN PROMESAS FALSAS

Crear `Chulla Flex` como planificador dinámico con un **motor de restricciones verificable**. Entradas: ciudad/punto de partida, destinos, fecha/hora, tiempo máximo, noches, participantes, intereses, nivel físico, movilidad, mascota, presupuesto global, gastos fijos comprometidos y reserva pagada. Variables: horarios reales de atracciones y anfitriones, tiempos/medios de transporte obtenidos de proveedor cartográfico autorizado, costes estimados separados de precios confirmados, clima/avisos vigentes con fecha de fuente, restricciones de áreas protegidas y políticas de cancelación.

- **Replanificación:** detectar `weather_warning`, `road_closure`, `site_closed`, `provider_cancelled`, `time_overrun`, `budget_overrun`; marcar fiabilidad (`official_verified`, `provider_verified`, `crowdsourced_unverified`, `unknown`) y vigencia. Aviso oficial crítico => excluir opción afectada y dar pasos de seguridad, no recomendar rodeos peligrosos. Un reporte comunitario no verificado se muestra como pendiente, no como cierre oficial.
- **Optimizar:** generar máximo 3 alternativas con razón, distancia/tiempo estimado (si fuente disponible), presupuesto final estimado, diferencia frente al plan original y riesgos. Si no es posible respetar el presupuesto, decirlo y solicitar cambiar restricciones, nunca ocultar gastos.
- **Costos:** desglosar transporte ida/vuelta, entradas, experiencias, comida, alojamiento, tasas, mascota, margen para imprevistos y gastos ya pagados/no recuperables. `trip_total_estimate <= user_budget` solo si todos los componentes tienen estimaciones defendibles; en caso contrario indicar `presupuesto incompleto` y no etiquetar como apto garantizado.
- **Estado de reserva:** crear propuesta de modificación, no cancelar ni reemplazar automáticamente una compra. Solicitar aceptación para nuevo itinerario y una confirmación aparte para transacciones o reembolsos; notificar al operador según acuerdos.
- **UX:** antes/después, mapa (cuando hay datos y licencia), línea de tiempo, diferencias USD, botón «Aplicar cambios», restaurar itinerario, historial de decisiones y sincronización entre dispositivos. Modo simulación para demostrar cierres y lluvia sin inventar que ocurrieron.
- **Técnica:** `itinerary_versions`, `travel_constraints`, `route_options`, `route_alerts`, `route_sources`, `itinerary_replan_events`, `budget_estimates`; cache con expiración y fuentes de alertas; separación de lógica determinista de la sugerencia de MIJIN.

## 24 — PRESUPUESTO, PUNTO DE PARTIDA Y RECOMENDACIONES HONESTAS

Al explorar preguntar opcionalmente ubicación de salida manual; geolocalización exacta solo si el usuario lo permite. Filtro de presupuesto **TOTAL**, no solo precio de entrada: «Salgo de Quito con $20; ¿qué puedo hacer hoy?»; «Salgo de Manta y quiero un viaje de 2 días por $100». Clasificar opciones como `dentro_del_presupuesto`, `posiblemente_viable`, `supera_presupuesto`, `sin_datos_suficientes`. UX: por defecto mostrar viables arriba, pero no borrar por completo destinos fuera de presupuesto; ofrecer «Ver todas las opciones» y explicar por qué algunas se deshabilitan para reservar.

Fuente de estimaciones y supuestos, transporte ida/regreso, participación de varios viajeros, alimentación, transporte urbano, estadía, tasas y contingencias; soporte USD/EUR de Galápagos con fuente de tipo de cambio si se calcula y mostrar moneda original. No asumir que el tour de $25 incluye llegar a Manabí. No llamar «$20 a Galápagos» viable cuando vuelos y tasas superan ese monto; conservar Galápagos como inspiración no reservable para ese presupuesto. Diferenciar `experiencia`, `viaje integral`, `paquete vendido` y `cotización formal`.

## 25 — CHULLA PET: VIAJAR RESPONSABLEMENTE CON MASCOTAS

Añadir `Viajo con mascota` al onboarding opcional, filtros de búsqueda, fichas, itinerarios y preguntas a MIJIN. Campos: especie admitida (por defecto perros/gatos), tallas/pesos máximos, cantidad, restricciones, tarifas verificadas, documentación, reglas de transporte, áreas de permanencia, accesibilidad y última confirmación del anfitrión. Etiquetas: `Se aceptan mascotas (confirmado por anfitrión y fecha)`, `Consultar condiciones`, `No admite`, `No verificado`. Los establecimientos no verificados NO llevarán sello pet-friendly; nunca inventar hoteles ni políticas.

Tener en cuenta bienestar animal, temperatura, descanso, agua, riesgos de fauna; normativa de parques, reservas y fauna endémica. Prohibir sugerencias de entrada con mascotas donde la autoridad no las permite, especialmente Galápagos y zonas protegidas. No almacenar datos innecesarios del animal ni subir documentos sensibles si no se requiere. Incluir formulario de consulta al operador y cambios de itinerario si una actividad no admite mascotas.

## 26 — TRANSPARENCIA ECONÓMICA, CONFIANZA COMUNITARIA Y CONECTIVIDAD

En cada experiencia comercialmente aprobada, mostrar módulo **«¿Cómo se distribuye tu dinero?»** con importes en USD y porcentajes de **esa transacción**: ingresos netos destinados a comunidad/anfitriones, guía o proveedores locales, costos operativos, comisión/plataforma, tarifa del procesador, impuestos/tasas si corresponde. El total debe reconciliar exactamente con el importe cobrado; evitar doble conteo; aclarar bruto/neto, comisiones sobre base, cuándo se paga y quién recibe realmente el dinero. No prometer reparto comunitario sin convenio: si no hay acuerdos, mostrar **«Distribución pendiente de validar con la comunidad; no disponible para compra»** en lugar de porcentajes inventados. Seguir normas fiscales y reglas del gateway; el split de pagos real solo con habilitación contractual/técnica y conciliación.

- Datos: `revenue_share_agreements`, `contract_versions`, `beneficiaries`, `payout_allocations`, `fee_rules`, `tax_lines`, `payouts`, `settlement_reports`, `community_impact_reports` con acceso privado a datos contractuales; vista pública agregada consentida por organización.
- Perfiles de anfitriones: fotos y nombres **reales y autorizados**, historias revisadas por la persona/comunidad, idiomas, experiencia, canales de contacto consentidos, estado de verificación, insignias separadas. Nunca generar fotografías sintéticas como si fueran personas reales o testimonios auténticos.
- Etiquetas de acceso **aportadas/confirmadas por el operador**: `Sin señal`, `Señal intermitente`, `Datos móviles`, `Wi‑Fi`, `Electricidad limitada`, `Requiere efectivo`, `Punto de encuentro sin GPS`, `Accesibilidad por verificar`, `Agua potable: confirmar`. Mostrar `verificado por`, fecha y aviso de que las condiciones cambian.
- Consentimiento y beneficio: acuerdo con representante autorizado de cada comunidad para uso de nombre, retratos, relatos, propiedad intelectual, calendario y protocolos de visita; posibilidad de solicitar cambios y baja. No convertir prácticas culturales en gamificación sin aprobación.

## 27 — PASAPORTE GUAMBRA Y MODO SIN INTERNET AVANZADO

Renombrar la UX del pasaporte a **Pasaporte Guambra — Colecciona historias, no solo sellos**. Animación de libro creíble, portadas, hojas interactivas, sellos por Sierra/Costa/Amazonía/Galápagos, insignias por intercambio cultural responsable, aventuras accesibles y rutas poco conocidas. Desbloquear visitas verificadas por mecanismo antifraude autorizado, nunca por escanear códigos públicos genéricos. Reto participativo sin recompensar invasión de espacios, exposición de personas o daño ambiental. Fotografías privadas configurables y control de compartir.

`Descargar mi viaje`: itinerario, rutas offline mediante teselas/cartografía con **licencia que permita almacenamiento offline**, o mapa vectorial/esquemático alternativo; lugares, números de emergencia y asistencia, guías culturales, listas de equipaje, reservas/comprobantes descargables minimizando exposición, pasaporte, políticas y pet info; paquetes en distintos tamaños/idiomas. Construir PWA con IndexedDB, cache versionado, cifrado de contenido local sensible cuando técnicamente adecuado, limpieza al cerrar sesión, almacenamiento con caducidad y eliminación visible. Probar 100% en modo avión, no solo simulación visual. Separar última climatología/alerta de datos actuales con aviso de antigüedad. Resolución de conflictos de itinerario y diario al reconectar. Si una biblioteca de mapas prohíbe cache offline, **no violar la licencia**: crear alternativa autorizada.

MIJIN offline usa solo contenidos descargados, sin enviar datos a servidores; voz offline solo si STT/TTS local está comprobado en ese dispositivo, con fallback por texto siempre. Registrar tamaño y fuentes descargadas. Los sellos de visita pendientes se sincronizan y verifican después, no se conceden definitivamente sin conexión y validación.

## 28 — NOTIFICACIONES INTELIGENTES, CULTURALES Y DE UBICACIÓN

Centro de notificaciones dentro de la aplicación + email transaccional por reserva/verificación + push web **opt-in** para intereses, clima/avisos, nuevas experiencias, promociones y curiosidades. Categorías independientes `booking_transactional`, `security_alerts`, `trip_reminders`, `cultural_stories`, `offers_marketing`, `geo_curiosities`; granularidad y horarios de silencio, desuscripción y persistencia de preferencias. No suscribir por defecto marketing/ubicación/voz. Mantener separación entre avisos obligatorios del servicio y mensajes promocionales opcionales.

**Curiosidades al llegar:** geofencing solo si el usuario opta por ubicación y por notificaciones de proximidad. Informar limitaciones de segundo plano de navegadores/PWA y batería; **no prometer geofencing continuo en web** si no es técnicamente posible. Alternativa fiable: mostrar curiosidades al abrir la app, escanear QR autorizado o tocar «Estoy aquí» (con comprobación opcional), usar geolocalización temporal en primer plano. Nunca rastrear precisión continua por defecto ni publicar coordenadas personales. Mostrar fuente y fecha cultural, no suponer que un evento ocurre ese día.

Modelo: `notification_preferences`, `notification_templates`, `notification_events`, `push_subscriptions`, `geo_opt_ins`, `delivery_attempts`, `content_freshness`. Evitar envíos duplicados, respetar rechazo, reducir spam, permitir borrar tokens y gestionar datos. Probar ausencia de permisos y app sin conexión.

## 29 — ACUERDOS, TÉRMINOS, DATOS PERSONALES Y COOKIES: IMPLEMENTACIÓN OBLIGATORIA

### Marco de Ecuador y frontera de asesoría

Revisar fuentes oficiales **vigentes al momento de implementación**: Ley Orgánica de Protección de Datos Personales (LOPDP, 2021), su Reglamento General (2023), normativa y criterios de Superintendencia de Protección de Datos Personales (SPDP), Ley de Comercio Electrónico, Firmas Electrónicas y Mensajes de Datos, normas de defensa al consumidor, tributarias y específicas de turismo/guías, parques y alojamientos según actividad. Material base: https://www.spdp.gob.ec/marco-normativo/ ; https://www.spdp.gob.ec/docs/proteccion-de-datos-personales/general/consentimiento/ ; https://www.spdp.gob.ec/docs/proteccion-de-datos-personales/cuales-son-mis-derechos/ ; https://biblioteca.defensoria.gob.ec/handle/37000/3374 ; https://servicios.turismo.gob.ec/catastro-turistico/ . Normativa secundaria puede cambiar. **No afirmar que la aplicación es legalmente certificada por generar políticas.** Las plantillas entregadas requieren que el responsable legal [RAZÓN SOCIAL], RUC, domicilio, contactos, proveedores, flujos y abogados ecuatorianos completen/revisen antes de publicar. No inventar registros, licencias, DPO/delegado ni domicilio.

### Documentos legales obligatorios

Utilizar, revisar y mostrar en rutas independientes y footer los archivos de `legales/`: `01_TERMINOS_Y_CONDICIONES.md`, `02_POLITICA_DE_PRIVACIDAD.md`, `03_POLITICA_DE_COOKIES.md`, `04_ACUERDO_COMERCIANTES_ANFITRIONES.md`, `05_ACUERDO_COMUNIDADES_REPARTO.md`, `06_POLITICA_RESERVAS_CANCELACIONES.md`, `07_TEXTOS_CONSENTIMIENTO_UI.md`, `08_CHECKLIST_LEGAL.md` y `09_ACUERDO_ENCARGO_TRATAMIENTO_DATOS.md`. Aplicar versiones, fecha, hash, historial de aceptación, capacidad de comparar cambios sustanciales, enlazar y descargar texto. **No publicar directamente texto con campos [PENDIENTE] sin completar ni revisión jurídica**: usar draft en CMS y bloquear salida a producción transaccional hasta aprobado.

### Gestión real de consentimiento y cookies

- Mostrar banner accesible en primera visita **antes de cargar cookies/scripts no necesarios**, con **«Aceptar todas»**, **«Rechazar opcionales»** y **«Personalizar»** al mismo nivel; sin casillas premarcadas para opcionales, ni patrones oscuros.
- Categorías: **necesarias** (autenticación, seguridad, sesión, preferencias imprescindibles), **analítica** (opcional), **personalización no necesaria** (opcional cuando aplique), **marketing** (opcional), **embebidos externos** (Instagram, YouTube, TikTok, mapas; carga condicionada a la elección adecuada). Inventariar cookies y tecnologías equivalentes (localStorage, IndexedDB, pixels, SDKs, identificadores push). La calificación concreta y fundamento legal requieren revisión.
- **Ningún script de analytics, anuncios o iframe rastreador no necesario se carga antes del consentimiento adecuado.** Poder denegar/revocar tan fácil como aceptar en `Privacidad y cookies` siempre accesible; aplicar el cambio realmente, impedir futuras cookies, retirar/limpiar lo posible e informar sobre cookies de terceros que deban gestionarse adicionalmente.
- Guardar eventos de consentimiento limitados y protegidos: `consent_category`, `version`, `granted`, `timestamp`, `method`, `purpose`, `policy_version`, `subject_id_or_pseudonymous_id`, `proof_source` sin crear identificadores invasivos. Reconfirmar al cambiar finalidad/proveedor; respetar preferencias de marketing, voz y ubicación por separado.
- **No confundir la aceptación de Términos con el consentimiento para tratamiento opcional**: bases legales pueden ser distintas de consentimiento. Mostrar cuadro de información claro, fines, proveedores, retención y opciones reales.
- **Menores:** analizar tratamiento por edades y exigencias de representación/consentimiento; restringir contratación y funciones sensibles según edad, verificar con mecanismo proporcional. No recopilar documentos de menores sin necesidad jurídica.

### Datos personales desde el diseño

Mapa de datos, inventario de finalidades y bases legítimas por flujo: autenticación (email), verificación de identidad/organización, solicitudes y reservas, cobros vía proveedor, pagos comprobantes, asistencia, voz/transcripciones, ubicación puntual y geofencing, push, multimedia, diarios privados, analítica y marketing. Principios de minimización, finalidad, transparencia, seguridad, limitación de conservación, exactitud y acceso restringido. Tener `privacy_requests` y flujo usable para **acceso, rectificación/actualización, eliminación cuando proceda, oposición, portabilidad, suspensión**, retiro de consentimiento; no eliminar datos que una obligación legal exija conservar, justificándolo. Construir controles de exportación y borrado lógico/físico según riesgo. Revisión de tratamiento transfronterizo y contratos de encargados con Supabase, proveedor IA/voz, pasarela, email, alojamiento, maps y analítica; revisar si se requiere delegado o evaluación de impacto; incidentes y notificación según ley aplicable.

**Protección en IA y voz:** permisos micrófono y ubicación solo al usarlo; voz/audio no almacenados por defecto, transcripción retenida solo si se informó, autorización para transmitir a terceros, eliminación de historial, redacción de datos sensibles, no entrenar modelos con conversaciones sin base y acuerdos apropiados. Hacer visible cuándo está escuchando; botón de detener. PWA offline no debe filtrar chats ni documentos sensibles en caché pública.

### Protección al consumidor y turismo

Antes del pago mostrar proveedor real, precio total, impuestos/tasas, servicios incluidos/excluidos, disponibilidad confirmada, moneda, cancelaciones, soporte y qué es Chulla Vida (intermediario vs vendedor de experiencia): **definirlo jurídicamente según flujo real**. Confirmaciones por email con ID y términos aceptados; no anunciar autorización legal inexistente; registros/guías habilitados según actividad. Establecer contrato específico y aprobación de reparto a comunidades. Permitir reclamaciones y reembolsos conforme a acuerdo y derechos legales, sin cláusulas que eliminen derechos irrenunciables.

### Criterios de aceptación legal/cookies

- Usuario nuevo ve banner; rechazar opcionales funciona y no dispara scripts no necesarios; aceptar habilita; revocar detiene futuras cargas y permite limpiar almacenamiento permitido.
- Footer enlaza términos, privacidad, cookies, política de cancelación y soporte. Los textos tienen versión, fecha y datos reales del responsable antes de producción.
- Login/registro registran aceptación de Términos, y marketing/voz/ubicación tienen permisos y consentimientos separados cuando correspondan.
- Solicitud de privacidad puede enviarse y tramitarse; el admin ve solo lo que corresponde a su rol; logs de cambios protegidos.
- Claves nunca expuestas, `RLS` probado, ninguna grabación ni rastreo continuo por defecto. Embebidos sociales no activan scripts opcionales sin autorización.
- Panel admin incorpora checklist de «Revisión legal pendiente» y bloquea publicación comercial si el responsable/contratos/pagos no están listos.

## 30 — PRUEBAS, CRITERIOS EXPANDIDOS, ORDEN DE ENTREGA E INFORME

Además de los criterios anteriores, demostrar de extremo a extremo:

1. MIJIN: voz en navegador compatible y fallback texto; proveedor apagado da error honesto; consultas de clima reales tienen fuente/hora; función sin internet devuelve únicamente contenido descargado; uso sin consentimiento a micrófono no solicita acceso.
2. Chulla Flex: simular un cierre claramente etiquetado, proponer alternativas, respetar presupuesto/tiempo, no modificar reserva pagada sin aceptación; con feed ausente no afirmar cierre actual.
3. Presupuesto por origen: caso Quito-$20 (búsqueda local) y Galápagos-$20 (inviable si costos totales verificables); mostrar supuestos.
4. Chulla Pet: solo experiencias confirmadas admisibles; prueba de restricción en áreas protegidas.
5. Transparencia: ingresos a comunidad y comisión suman el total verificado, distinguiendo conceptos; sin contrato no mostrar porcentaje inventado.
6. Pasaporte Guambra: hoja animada + accesible y sellos honestos, descarga y lectura offline, revocación/borrado de datos descargados.
7. Consentimiento: aceptar/rechazar/editar/revocar categorías; verificar que no salgan requests a analytics/embebidos no esenciales si se rechazan; derechos de usuario operativos.
8. 33 fichas importadas, con clases de precio `referential` o `proposed`; no hay venta online hasta convenio. Verificar al menos 1 ficha completa de cada catálogo (incluidos exclusiones y advertencias).
9. Notificaciones de reserva según estado real; push/cultura/geocuriosidades únicamente con opt-in y proveedor disponible. En web sin geofencing constante, no simular disponibilidad.
10. Asegurar que el README explique cómo iniciar la app, enlazar Supabase y SMTP, cargar seeds, configurar MIJIN, meteorología, gateways, fuentes de seguridad, notificaciones, cookies y legales.

**Prioridad operativa:** Primero corregir seguridad/funciones básicas, onboarding, base de datos y las 33 fichas; después UI/branding, Pasaporte Guambra, MIJIN texto+voz básica y clima; luego Chulla Flex/presupuesto, verificación, consentimiento, pet y transparencia; después pagos/sandbox, push, offline avanzado, multimedia y pulido. Si no hay credenciales externas, desarrollar interfaces, validaciones, flujos con datos de muestra **claramente etiquetados y no comercializables**. No detenerse con un plan y no afirmar integraciones que no fueron probadas.

**ENTREGABLES:** auditoría, código funcional, esquema/migraciones Supabase + RLS/tests, seeds con 33 fichas, documentos legales y pantallas públicas (bloquear publicación hasta completarlos), diseño/identidad, MIJIN con herramienta clima, motor de restricciones, offline, pruebas, instrucciones para entornos dev/staging/producción, tabla `implementado/demostración/pendiente/configuración/validación legal`, estimación de costes recurrentes de servicios, checklist de lanzamiento. Termina con lista exacta de archivos cambiados, pruebas ejecutadas y accesos requeridos. No inventar éxito.

## INSTRUCCIÓN FINAL

**Empieza ahora inspeccionando el código de este proyecto.** Muéstrame brevemente los hallazgos reales y un plan por fases; después ejecuta la implementación por prioridad, realizando cambios verificables en el repositorio y corrigiendo los fallos que encuentres. No me devuelvas únicamente recomendaciones, pseudocódigo ni un rediseño aislado: quiero una experiencia Chulla Vida 2.0 convincente, usable, ecuatoriana, juvenil, culturalmente respetuosa, accesible, segura y conectada con comunidades reales. Si una integración externa no se puede completar sin mi acceso, deja todo preparado, documentado y funcionando en pruebas donde sea posible, y dilo explícitamente.
