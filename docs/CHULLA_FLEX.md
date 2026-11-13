# Presupuesto, Chulla Flex y Chulla Pet

`src/domain/planner/index.ts` implementa funciones puras, independientes de la UI y de cualquier pago. Los resultados son propuestas de planificación, no ofertas contratables.

## Presupuesto total

`evaluateOption` recibe origen, presupuesto USD para todo el grupo, personas, tiempo y gastos conocidos con fuente. Conserva cuatro clasificaciones: dentro del presupuesto estimado, posiblemente viable, supera presupuesto y datos insuficientes. El precio base se calcula para el grupo; nunca se confunde con todo el viaje.

Transporte, comida, tasas y contingencia requieren importe y fuente, incluso si el importe confirmado es cero. Se añaden alojamiento cuando hay noches y costos de mascotas cuando corresponda. Sin desglose completo, `totalEstimate` es nulo. Un precio «desde» sin máximo no produce un total final, aunque los extras estén completados. Las monedas EUR no se convierten sin una tasa fechada. Galápagos con $20 totales se clasifica inviable.

El origen prioriza referencias de la misma localidad/provincia. **No calcula distancias de carretera, tiempos de traslado, disponibilidad ni conexiones reales.** Los tiempos del catálogo cubren la actividad; los traslados siguen pendientes. No se afirma cercanía ni viabilidad puerta a puerta.

## Flex

`proposeReplacements` acepta un aviso con fuente, confiabilidad, emisión y caducidad. Un aviso vencido/no verificado se identifica como tal. Los cierres del catálogo son históricos y se excluyen de opciones activas hasta revalidación.

La simulación de cierre devuelve siempre `mode: simulation` y aviso explícito. Las alternativas excluyen el destino afectado, precios fuera del presupuesto conocido, monedas no convertidas, duración excesiva y políticas de mascotas no confirmadas. Los costos faltantes se conservan en cada opción. Compartir región es un filtro orientativo, no prueba de proximidad.

Ninguna función modifica una reserva: `changedReservation` siempre es falso y `needsConfirmation` siempre es verdadero. Para un cambio comercial posterior se requerirá validar disponibilidad, cancelación y diferencia tarifaria con backend y aceptación del viajero.

## Mascotas

`petAdmission` exige política `confirmed_allowed`, confirmador, fecha y coincidencia de especie/cantidad. No etiqueta como pet-friendly una ficha sin verificación. Galápagos y las restricciones de área protegida bloquean recomendaciones de acceso con mascotas. Tamaño, documentos, vacunas, cargos y transporte se consultan con el anfitrión; no se inventan prestadores.

## Pruebas

`tests/unit/planner.test.ts` cubre Quito-$20, total incompleto, EUR, Galápagos-$20, precios «desde», mascotas, límites de entrada, exclusiones Flex y avisos vencidos. La precisión geográfica y las políticas comerciales no se certifican mediante estos tests.
