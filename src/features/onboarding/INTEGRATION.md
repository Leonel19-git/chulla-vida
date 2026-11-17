# Tutorial del Álbum y MIJIN

Montar `TourGate` una sola vez. El evento `cv3:tour` conserva su API y reanuda el paso guardado. Para reiniciar: `new CustomEvent('cv3:tour', { detail: { restart: true } })`. Para pedir la ruta de anfitrión: `detail: { path: 'host' }`. Sin ruta explícita se usa el modo activo de roles, incluidos usuarios con ambos roles. La preferencia de vista no acredita permisos del servidor.

El tutorial señala elementos reales y bloquea la página mientras explica. Selecciona el primer objetivo visible, por lo que se puede repetir el atributo en navegación de escritorio y móvil. Omite objetivos ausentes u ocultos; no abre menús, fichas ni pantallas y no simula sus acciones. Añadir estos atributos a las superficies correspondientes queda a cargo de sus responsables:

| `data-tour` | Elemento real |
| --- | --- |
| `album` | Portada del Álbum o acceso al Álbum |
| `regions` | Selector de regiones |
| `search` | Buscador |
| `filters` | Botón que abre filtros |
| `card` | Un cromo visible que abre su ficha |
| `envelope` | Acceso a Mi sobre; se acepta `plan` como respaldo para Mi viaje |
| `mijin` | Botón de MIJIN en navegación |
| `culture` | Acceso a Fiestas |
| `passport` | Acceso al Pasaporte Guambra |
| `account` | Acceso a Yo / cuenta |
| `host` | Acceso o encabezado del panel de anfitrión |
| `host-experiences` | Control de experiencias del anfitrión |
| `host-requests` | Control de solicitudes del anfitrión |

En HostDashboard deben señalarse únicamente controles ya autorizados y visibles según la sesión real. La ruta viajera no incluye negocio. `offline` sigue siendo un acceso válido de la página, pero no forma parte de este recorrido breve.

El avance se guarda por ruta en `chullavida:v3:tour:progress`. Saltar, cerrar y Esc conservan el paso; terminar lo limpia. La clave histórica `chullavida:v3:tour` sigue registrando `done` o `skipped`. Al cerrar se restaura la página, se vuelve arriba y se enfoca `#hero-title` o `main h1`. Si se desmonta sin terminar, se devuelve el foco al control que lo abrió.

MIJIN conserva `cv3:mijin` y las props de `MijinAssistant`. Solo pide micrófono al pulsarlo. Un único control principal cambia entre hablar, terminar, detener permiso y cancelar descarga/transcripción/consulta. Los chips y el formulario funcionan sin micrófono. El saludo hablado ocurre una vez por sesión tras un gesto activo; no inicia escucha.

La voz de salida se elige entre las voces españolas disponibles en el navegador; se recuerda la preferencia y se usa otra disponible si desaparece. No se garantiza una voz natural ni premium. El reconocimiento local es distinto: requiere confirmación antes de descargar unos 90–102 MB (modelo de 76 MB más motor, según plataforma). Muestra progreso y permite cancelar. Cerrar el panel o cancelar termina el worker si tiene trabajo pendiente, detiene sus descargas/cálculo y conserva archivos completos ya guardados. Un worker preparado sin trabajo puede reutilizarse.

Pruebas de comportamiento nuevas: `tests/unit/guide-platform.test.tsx` y `tests/unit/mijin-platform.test.tsx`. Se mantienen las pruebas existentes de permisos, lectura, transcripción, chips, preferencias y descarte de respuestas tardías, adaptadas al botón principal y al contrato de targets actual.
