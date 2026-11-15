# Descargas y apertura sin conexión

CHULLA VIDA 3.0 añade una biblioteca de **fichas públicas seleccionadas** en IndexedDB. Es independiente del HTML de ruta autónomo que ya ofrecía el prototipo.

## Qué se guarda

Desde el detalle de una ficha, «Descargar ficha» guarda una copia estructurada del catálogo público editorial: descripción, actividades, programa tentativo, moneda original, precios de referencia, inclusiones, exclusiones, condiciones, avisos históricos y bloque original de la fuente. Se conserva versión, fecha de descarga y tamaño en bytes del texto serializado.

Solo entran IDs presentes en el catálogo público. No se descargan sesiones, documentos privados de comerciantes, conversaciones, datos de pagos ni reservas. La biblioteca no declara tarifas actuales, disponibilidad ni acceso de mascotas confirmados.

«Tus descargas para el viaje» permite leer, borrar una ficha o borrar todas. Descargar dos veces el mismo ID actualiza su instantánea y no la duplica. Las entradas dañadas se omiten sin ocultar las válidas, y la pantalla permite eliminarlas.

## Cómo funciona la apertura de la aplicación

`registerOfflineSupport()` registra `/sw.js` **solo en producción**, sobre un contexto seguro y con soporte del navegador. El desarrollo con `npm run dev` conserva IndexedDB, pero no instala un service worker.

El service worker prepara un shell público y recursos propios bajo `/assets/`, `/images/`, `/brand/`, `/catalogos/`, el logo, manifest y página de contingencia. La preparación copia las dependencias públicas del HTML/JS/CSS y los recursos de la página ya cargada. Utiliza red primero para la navegación raíz y caché para los recursos públicos. Si falla la red, intenta el shell previamente guardado; si no existe, muestra `/offline.html`.

No intercepta `/api/`, rutas de autenticación, solicitudes con cabecera Authorization, otros orígenes, URLs con parámetros ni métodos de escritura. No guarda respuestas marcadas `private` o `no-store`. Los recursos externos de Spotify permanecen sujetos al permiso correspondiente y requieren conexión.

El manifest usa el logo suministrado como icono, sin presentarlo como maskable. La instalación y la presentación de su icono dependen del navegador y el dispositivo; no se ha certificado instalación en todos los sistemas.

**Una primera visita sin internet no funciona.** La persona debe abrir la versión de producción con conexión, esperar la preparación, descargar las fichas y probar antes de salir. El sistema operativo o el navegador puede desalojar datos. No se promete permanencia ni actualización automática de una instantánea.

## Límites por función

| Función | Sin conexión |
| --- | --- |
| Fichas descargadas y sus fuentes incluidas en el texto | Lectura local |
| Favoritos/preferencias del navegador | Conservación local según permisos |
| MIJIN determinista | Solo las fichas que la UI le entrega como descargadas |
| Clima actual y alertas oficiales actuales | Requieren conexión y fuente; no se inventan |
| IA remota y voz que dependa de proveedor de navegador | Requieren conexión; texto local como alternativa |
| Reservas nuevas, pagos y disponibilidad | Requieren backend e internet; nunca se confirman offline |
| Revisión de comerciantes o visitas verificadas | Requieren autorización de servidor y conexión |
| Videos, Spotify y otros contenidos externos | Requieren internet y permiso aplicable |

La caché del shell es pública. Borrar la biblioteca elimina las fichas seleccionadas de IndexedDB; no cierra una sesión de Supabase ni elimina datos ajenos a la biblioteca. Para un dispositivo compartido se debe cerrar sesión también. El pasaporte y el prototipo anterior conservan sus propias reglas de demostración.

## API de integración

`src/features/offline/index.ts` exporta:

```ts
saveExperienceOffline(experience): Promise<void>
readOfflineLibrary(): Promise<{ experiences, downloadedAt, bytes, discardedRecords }>
deleteOfflineExperience(id): Promise<void>
clearOfflineLibrary(): Promise<void>
registerOfflineSupport(): void
supportsOfflineStartup(): boolean
DownloadsPanel({ onClose, onOpenExperience, onChanged? })
```

Para lectura offline, la UI y MIJIN deben utilizar las `experiences` devueltas por IndexedDB, conservando su versión y fecha. No deben sustituirlas por el catálogo actual y anunciar que es una descarga previa.

El guardado de IndexedDB termina antes de la preparación de caché del shell, que continúa en segundo plano. Una ficha guardada no demuestra por sí sola que toda la aplicación terminó de prepararse para reabrirla sin conexión.

## Validación automatizada

```sh
npm test -- tests/unit/offline.test.ts tests/unit/offline-worker.test.ts
node --check public/sw.js
```

Ocho pruebas verifican almacenamiento y lectura, moneda EUR, idempotencia, borrado, datos dañados, IDs fuera del catálogo, almacenamiento no disponible, exclusiones de caché y fallback público para navegación raíz. Las pruebas del service worker se ejecutan con un entorno controlado, no equivalen a una prueba en modo avión de cada navegador.

## Prueba manual en producción local

1. Ejecutar `npm run build` y `npm run preview -- --host 127.0.0.1`.
2. Abrir la URL indicada y descargar una ficha de cada catálogo. Comprobar versión y fecha en Descargas.
3. Esperar la activación del service worker. Pasar a modo sin red en las herramientas del navegador y recargar la raíz.
4. Comprobar lectura únicamente de los snapshots descargados, negativa explícita de clima/IA remota/operaciones privadas y ausencia de peticiones de pago exitosas.
5. Borrar una ficha, recargar, comprobar que no reaparece como descargada; borrar el resto.
6. Volver a conectar y descargar de nuevo de forma explícita. Revisar conflictos de versión; una descarga previa no se actualiza en silencio.

Pendiente de evidencia por dispositivo: instalación, recarga en modo avión, recursos de carga diferida, espacio limitado y comportamiento de desalojo. No se afirma cobertura GPS, mapas de carretera ni sincronización privada offline.

## 3.1 · Descargas reales, enlaces profundos y planificador (14-11-2026)

### Archivo al dispositivo
`downloadExperienceFile(experience)` (en `src/features/offline/experienceFile.ts`, también exportado desde `index.ts`) hace dos cosas:
1. Baja `chulla-vida-<slug>.html`: documento autónomo (sin scripts, CSP `default-src 'none'`), foto local `-640.webp` incrustada en base64 con su crédito y licencia, descripción, qué incluye / no incluye, precio con su rótulo referencial y aviso, cómo llegar si hay datos, programa, avisos históricos, política de mascotas tal como está en la fuente, emergencias **911 (ECU 911)**, fecha de descarga y QR hacia la ficha online (`https://chulla-vida.vercel.app/experiencias/<id>`). Se abre sin internet y se imprime como PDF.
2. Guarda la ficha en la biblioteca IndexedDB. Si eso falla, el archivo igual se descarga y el mensaje lo dice.

Devuelve `{ fileName, savedOffline, message }`; el mensaje normal es «Listo: se descargó chulla-vida-<slug>.html y la ficha quedó guardada para usarla sin señal».

En «Sin señal» (`DownloadsPanel`), **Descargar mi viaje** baja `chulla-vida-mi-viaje.html` con el itinerario de «Mi viaje» (borrador local) y todas las fichas guardadas; cada ficha guardada tiene además «Bajar archivo». El planificador ofrece «Descargar mi viaje (HTML)» junto al borrador en texto.

Todo texto se escapa; solo se incrustan fotos propias bajo `/images/` validadas como `data:image/(webp|jpeg|png);base64`, y solo SVG de QR sin scripts, eventos ni enlaces.

### Enlaces profundos
`src/features/routing/` (`useUrlRouting`, `pathForExperience`, `parsePath`): History API sin router. Rutas: `/experiencias/<id|slug>`, `/cultura-viva`, `/pasaporte`, `/mi-viaje`, `/billetera`, `/mijin`, `/sin-senal`, `/cuenta`, `/anfitriones`, `/privacidad`, `/legal/<slug>` (emite `cv3:legal` con `detail.slug`), `/reservas`, `/avisos`, `/derechos-de-datos`. Al cerrar se reemplaza la entrada por `/` (Atrás no reabre); «Atrás» cierra panel o ficha y emite `cv3:home`. `/cuenta` y `/reservas` conservan `?query#hash` de Supabase y PayPhone.

### Service worker
Navegaciones de la SPA (cualquier ruta sin extensión, sin parámetros, fuera de `/api`, `/auth`, `/rest`, `/storage`, `/functions`) van red primero y, sin red, reciben el shell guardado. Solo la raíz actualiza el shell. Los recursos públicos se buscan con `ignoreVary` (el servidor de preview envía `Vary: Origin`, que impedía abrir sin conexión). Caché `chulla-vida-public-v3-20261114`.

Comprobado con Playwright (Chromium headless) sobre `vite build` + `vite preview`: tras una visita, en modo sin red, `/experiencias/gen-02-quilotoa-shalala` abre la app con la ficha descargada; la caché no contiene `/api` ni `/auth`.
