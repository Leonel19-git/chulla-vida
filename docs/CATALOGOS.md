# Catálogos editoriales de CHULLA VIDA 3.0

La importación contiene **33 fichas**: 14 destinos del catálogo general, 7 experiencias propuestas de Costa y 12 experiencias o planes de Galápagos. No equivale a 33 lugares geográficos distintos, ofertas aprobadas ni disponibilidad confirmada.

## Fuentes y reproducción

Los tres archivos originales de `CHULLA_VIDA_3_PAQUETE/catalogos/` se mantienen íntegros. El PDF original de Costa es respaldo documental; el generador lee su extracción de texto suministrada. No se ha certificado automáticamente equivalencia visual del PDF.

```sh
node scripts/build-catalog-seed.mjs
node scripts/build-catalog-seed.mjs --check
npm test -- tests/unit/catalog.test.ts
```

El generador produce `src/domain/catalog/data.json`, `supabase/seed.sql` y copias públicas exactas de los tres TXT en `public/catalogos/`. `--check` compara contenido y falla si las salidas se quedaron desactualizadas. El seed se ejecuta después de las migraciones; contiene transacción e inserciones con IDs estables.

Cada ficha guarda `sourceText`, el bloque original de la ficha, además de campos estructurados. `originalDocument`, `contentSourceId`, `sourceOrder`, `sourceCheckedAt` y `contentVersion` conservan procedencia. **La fecha de importación no es una certificación externa.**

## Tratamiento de información incierta

- Todas las fichas se importan con `bookingEnabled: false`, operador `unverified`, sin verificador y estado editorial `referential`.
- Costa conserva precio `proposed`, nombre de experiencia, punto de encuentro, historia, inclusiones, exclusiones, itinerario tentativo y condiciones propios de cada ficha.
- Los dos precios EUR de Galápagos permanecen en EUR. Los filtros por presupuesto requieren moneda explícita y no realizan cambios de divisa.
- Los programas de varios días y planes de presupuesto se identifican por `kind`; los planes no se presentan como paquetes operados.
- Las tarifas por tamaño de grupo de Isabela permanecen desglosadas.
- Vuelos, tasas, lanchas, bote-taxi y alojamiento se guardan aparte con sus condiciones textuales y `requiresRevalidation: true`. No se suman de manera automática a planes que podrían incluir algunos conceptos.
- Los cierres y alertas de la fuente están marcados como históricos y fechados. Ninguna ficha afirma apertura actual.
- No se inventaron operadores, reseñas, contactos, fotografías específicas, permisos de mascotas, cupos disponibles o coordenadas verificadas.
- Oyacachi se asigna a Amazonía por provincia de Napo; conserva transición Andino-Amazónica como subregión. Mindo y Yunguilla conservan Sierra y subregión Chocó Andino.

## API de lectura

`src/domain/catalog/index.ts` exporta `experiences`, `catalogSources`, `getExperienceById`, `getExperienceBySlug`, `catalogSourceDownload`, `filterExperiences`, `formatExperiencePrice` y `canBookExperience`.

`filterExperiences({ maxPrice, currency })` compara el mínimo de la referencia en la moneda pedida; no garantiza que el rango completo, traslados u otros gastos entren en ese presupuesto. La planificación total corresponde al motor de presupuesto.

## Cultura Viva

`src/domain/culture/index.ts` contiene diez referencias editoriales del documento suministrado. Kasama pertenece a Costa y el Festival de Artes Vivas de Loja a Sierra. Únicamente Inti Raymi utiliza la categoría `raymi`. Las ceremonias sensibles señalan que la participación depende de la comunidad.

Las ediciones se conservan como orientativas o definidas por la comunidad, con fechas exactas nulas. La referencia a noviembre de 2026 de Loja no se anuncia como programación verificada. `eventStatus` no llama «próximo» a un evento sin edición, fecha y fuente confirmadas.

Pendientes humanos: convenios, validación editorial y comunitaria, revisión de accesos y tarifas actuales, políticas de mascotas, accesibilidad, derechos de medios y programación oficial de cada edición.
