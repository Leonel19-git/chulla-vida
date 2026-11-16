# MIJIN · Tu pana de aventuras

MIJIN está disponible desde el botón flotante en todas las pantallas. El modo entregado en la interfaz es **Catálogo y FAQ**, determinista y sin proveedor generativo conectado. Busca en las fichas del catálogo y devuelve el documento y la fecha de revisión documental. No presenta esa fecha como verificación del operador ni como actualización en tiempo real.

## Probar ahora

1. Abrir «Habla con MIJIN» y **tocar el micrófono**. Ese toque es el gesto de consentimiento: no hay casilla previa. La primera vez de cada sesión aparece debajo un aviso breve (el navegador reconoce la voz y puede enviarla a su proveedor; CHULLA VIDA no guarda audio) y enseguida el navegador pide su permiso. Decir «Quiero conocer Saraguro». Los resultados abren sus fichas.
2. Probar «Salgo de Quito con $20», «Galápagos con $20», «Voy con mi perro» y «¿Cómo funciona el pasaporte?».
3. Permiso explícito (`voice-tools.ts` → `requestMicrophone`): al tocar el micrófono se llama primero a `navigator.mediaDevices.getUserMedia({ audio: true })`, se detienen las pistas en el acto (no se graba ni se guarda nada) y solo con el permiso concedido se crea `SpeechRecognition`. Mientras el navegador muestra su aviso, MIJIN dice «Chrome te pide permiso arriba, junto a la barra de direcciones: pulsa Permitir» (en pantallas táctiles: «en un aviso de la pantalla»). Resultados: concedido → escucha; denegado → pasos numerados (candado → Micrófono → Permitir) y botón **Reintentar**; sin dispositivo, micrófono ocupado por otra app, página sin https o error desconocido → mensaje claro con **Reintentar** y **Mejor escribo**. Dentro de la misma conversación no se vuelve a pedir `getUserMedia`.
4. Reconocimiento del navegador (`VoiceExperience.tsx` + `speech.ts`; Chrome, Edge y Android): idioma `es-EC`; solo ante `language-not-supported` prueba `es-ES` y luego `es-US`. Si en **2,5 s** no llega `start`/`audiostart`, si `start()` lanza excepción o si llega `end` antes de arrancar, el motor se da por mudo (código `engine-silent`) y se pasa a la voz del dispositivo (ver abajo) sin probar más variantes. `interimResults` muestra la transcripción en vivo; `continuous = false`; tope de 15 s y, si el motor no avisa el final 1,5 s después de `stop()`, se cierra el turno. Cada fallo muestra el motivo y el código del navegador («Código del navegador: network (sin conexión con el servicio de voz del navegador)»): `not-allowed` → pasos del candado; `audio-capture` → sin micrófono; `aborted` → micrófono apagado; `language-not-supported` → otra variante; `network`, `service-not-allowed`, `no-speech`, `engine-silent` y «terminó sin texto» → **cambio automático a la voz del dispositivo**. Sin conexión no se usa el servicio del navegador.
   Diagnóstico: en la consola del navegador, `window.__mijinVoiceDebug = true` activa `console.debug("[MIJIN voz] evento", "clave=valor …")` en texto plano (antes salía «error Object»): estado del permiso, getUserMedia, start, audiostart, result, end, `error code=network message=…`, vigilante, cambio a voz local, grabación (motivo, bytes, tipo), milisegundos de transcripción y voz elegida. Nunca registra lo que se dijo.
5. Síntesis: elige una voz en español por preferencia `es-EC` → `es-US` → `es-MX` → `es-419` → `es-ES` → otra variante; dentro de cada variante prefiere voces naturales/en línea («Google español», «… Online (Natural)») y luego las locales de Microsoft (Helena, Laura, Pablo). La voz usada se muestra como «Voz del navegador: …». Se conservan las referencias a cada fragmento (Chrome pierde `onend` si se recolectan) y un temporizador evita quedar en «Te cuento…» si el motor no avisa el final. Botón «Callar» mientras habla. Espera `voiceschanged` (máximo 1,2 s) cuando las voces aún no cargaron. Trocea respuestas largas por frases (≤ 200 caracteres) para evitar cortes; «Velocidad» ofrece Pausada, Normal y Ágil; «Detener» cancela captura y lectura. «Respuesta con voz» solo lee automáticamente las preguntas hechas con el micrófono; las respuestas escritas tienen un botón «Escuchar respuesta».
6. La conversación vive solo en memoria y puede borrarse; no guardamos audio bruto. Al cerrar o esconder la página se detiene la voz. Los permisos del navegador se revocan desde su configuración. No se garantiza reconocimiento sin red ni exactitud en lenguas indígenas.

Verificación anterior (14-11-2026, solo reconocimiento del navegador): pruebas con getUserMedia y SpeechRecognition simulados; en Chromium sin interfaz el vigilante probaba tres variantes (~7,5 s) antes de rendirse. Desde el 15-11-2026 se pasa a la voz del dispositivo a los 2,5 s (ver abajo).

## Voz en el dispositivo (Whisper, sin servidores de terceros)

Es el reconocimiento principal en iPhone/iPad (todo navegador iOS es WebKit), Safari de escritorio y Firefox, y el respaldo automático en Chrome/Edge cuando su servicio falla. El audio **no sale del dispositivo**: la interfaz lo dice («Tu voz se procesa en este dispositivo. No se envía ni se guarda.»).

- Modelo: `onnx-community/whisper-base` (Whisper base multilingüe, ONNX cuantizado q8), revisión fijada `27a07b4b52b3a4c5886134bb4320e93e1a4bbc7c`, `language: 'spanish'`, `task: 'transcribe'`, con `@huggingface/transformers` 4.3.2 en un Web Worker (`asr.worker.ts`). Se eligió base y no tiny: en pruebas con frases del catálogo tiny transcribía «Abre mi pasaporte» como «Ahora, mi pasaste»; base las acierta. Licencias: pesos Apache-2.0 (OpenAI Whisper; conversión ONNX de onnx-community), onnxruntime-web MIT, transformers.js Apache-2.0.
- Autoalojado: `node scripts/fetch-voice-model.mjs` descarga los archivos a `public/models/onnx-community/whisper-base/` y copia los `.wasm` de `onnxruntime-web` a `public/ort/`; `--check` verifica SHA-256 contra `manifest.json`. En el worker: `env.allowRemoteModels = false`, `env.localModelPath = '/models/'`, `wasmPaths` en `/ort/`, un hilo, sin proxy. Encaja en la CSP actual (`script-src 'self' 'wasm-unsafe-eval'`, `worker-src 'self'`, `connect-src 'self'`); no hizo falta cambiar `vercel.json`.
- Peso de la primera descarga: **~102 MB** (codificador 22,1 MB + decodificador 51,2 MB + tokenizador 2,7 MB + motor WASM 25,6 MB); **~90 MB** en Safari < 26, que usa el motor básico (13,6 MB). En el repositorio ocupan 115 MB (ambos motores). Se descarga **solo cuando la persona elige hablar**: MIJIN pide confirmación con el peso («Descargar y hablar» / «Mejor escribo») y muestra la barra «Preparando voz en tu dispositivo… (102 MB, solo la primera vez)» con los MB reales. Se guarda en Cache Storage (`chulla-vida-voz-27a07b4b`); después funciona sin internet.
- Flujo (`recorder.ts`): getUserMedia (cancelación de eco, supresión de ruido) → MediaRecorder (`audio/mp4` en iOS; `audio/webm;codecs=opus` en el resto) → AnalyserNode: el orbe y la barra se mueven con el volumen real; la frase termina tras ~1,2 s de silencio, tope 15 s, «no te escuché» si en 8 s no hubo voz, y botón **«Listo, ya terminé»** para cortar → AudioContext decodifica y remuestrea a 16 kHz mono → worker. Estados visibles: Escuchando, Transcribiendo, Pensando, Hablando. Menos de 0,5 s de audio o una sola letra transcrita no se envían como pregunta (Whisper inventa «y» con un respiro); también se descartan sus alucinaciones típicas («Subtítulos realizados por…»). Los nombres de lugares se corrigen por sonido («cuya veno» → Cuyabeno).
- Acciones sensibles: lo transcrito en el dispositivo nunca navega ni abre fichas solo; deja el botón para confirmar, y «Corregir lo que entendí» copia el texto al campo para editarlo.
- iPhone: el toque desbloquea `speechSynthesis` con un enunciado silencioso y reanuda el AudioContext dentro del gesto; voz preferida es-* (Paulina, Mónica, Jorge…; nunca voces de novedad como Eddy o Grandma); si iOS se traga la primera lectura se reintenta una vez; al ocultar la página se cortan micrófono y lectura.

## Botones de voz

Fuera del panel hay una sola entrada, «Habla con MIJIN» (flotante; las fichas abren el mismo panel con `cv3:mijin`). Dentro, el **orbe grande** es el único botón de micrófono: hablar → (escuchando con voz local) «Listo» → (otros estados) detener; mientras MIJIN habla, tocarlo interrumpe y vuelve a escuchar. «Detener» solo aparece cuando hay algo que detener; «Reintentar» y «Mejor escribo» acompañan cada error; «Respuesta con voz» activa o desactiva la lectura y lo confirma en pantalla; en Chrome/Edge un enlace permite elegir «Procesar mi voz en este dispositivo» o el reconocimiento del navegador. Si el navegador no puede grabar ni reconocer, el panel lo dice y enfoca el campo de texto (sin prometer lectura en voz alta si tampoco existe).

Verificación 15-11-2026 (voz en el dispositivo): build de producción servido con las cabeceras de `vercel.json` (CSP incluida) en un puerto local. **Chromium** (Playwright con `--use-fake-device-for-media-stream --use-file-for-fake-audio-capture` y un WAV en español generado con la voz SAPI «Microsoft Helena» de Windows): el servicio del navegador no arranca (`engine-silent` a los 2,5 s), MIJIN muestra el código y ofrece la descarga; tras «Descargar y hablar» descarga 102 MB, graba, corta sola por silencio, transcribe «Quiero conocer Cuyabeno.» en ~2,5 s y responde en voz alta; el segundo turno va directo a la voz local (~6,6 s del toque a la respuesta). **WebKit** (iPhone 13 emulado): el WebKit de Playwright en Windows no trae micrófono, Web Audio, MediaRecorder ni speechSynthesis, así que el panel explica que no puede usar el micrófono y enfoca el campo de texto (no se cuelga); el worker de transcripción sí se probó en WebKit con la CSP: «Abre mi pasaporte.» en 8,4 s incluida la carga (motor asyncify) y 7,3 s con agente de iOS 18 (motor básico); la segunda frase, ~3 s. **No se probó en un iPhone real**: micrófono, MediaRecorder mp4, memoria y lectura en voz alta de iOS quedan pendientes de prueba manual.

La aplicación también puede abrir MIJIN mediante `window.dispatchEvent(new Event('cv3:mijin'))`. `MijinAssistant` recibe opcionalmente `onOpenExperience`, `downloadedExperiences`, `downloadedAt` y `onOpenPrivacy`.

## Clima

La consulta está separada del texto de FAQ y requiere una acción explícita. Primero se busca una localidad ecuatoriana en Open-Meteo/GeoNames, luego el usuario escoge nombre y provincia. No se adivinan coordenadas de las fichas y no se solicita geolocalización personal. La consulta usa una referencia aproximada de localidad, no el punto de encuentro ni la ruta de viaje.

El informe diferencia hora del modelo y hora de consulta, muestra zona horaria, fuente, temperatura, sensación, precipitación, viento y pronóstico diario/horario. Rechaza datos incompletos, unidades inesperadas y respuestas con más de tres horas de antigüedad. La caché dura diez minutos y conserva la hora original. Sin conexión, error o timeout muestra indisponibilidad; no fabrica una respuesta. El pronóstico no prueba accesos abiertos ni sustituye alertas oficiales.

En desarrollo la interfaz consulta los endpoints públicos de Open-Meteo directamente solo tras la acción del usuario. Antes de un lanzamiento comercial debe revisarse y contratarse la modalidad de uso adecuada; se puede adaptar el transporte al proxy `api/weather.ts`. El proxy permanece apagado salvo `WEATHER_ENABLED=true`. No existe un feed de alertas INAMHI, carreteras o cierres de parques conectado.

Fuentes técnicas: [Forecast API](https://open-meteo.com/en/docs), [Geocoding API](https://open-meteo.com/en/docs/geocoding-api), [licencias y planes](https://open-meteo.com/en/pricing), [SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition).

## Adaptador de IA remota preparado

`api/assistant.ts` es un endpoint para Vercel, separado del frontend. Está desactivado por defecto; no se ha ejecutado una consulta facturable ni validado una cuenta externa. La interfaz sigue usando FAQ y no cambia automáticamente a IA.

Variables solo de servidor:

```text
ASSISTANT_ENABLED=true
ANTHROPIC_API_KEY=<secreto de servidor>
ANTHROPIC_MODEL=<modelo habilitado en la cuenta>
SUPABASE_URL=<proyecto real>
SUPABASE_PUBLISHABLE_KEY=<clave pública del mismo proyecto>
```

También se admite `SUPABASE_ANON_KEY` en lugar de la clave publicable. Nunca usar `VITE_ANTHROPIC_API_KEY` ni enviar secretos al navegador.

El endpoint exige POST, sesión Supabase validada mediante `getUser`, pregunta de hasta 1.000 caracteres y `consentRemote: true` independiente de los demás permisos. No acepta contexto privado arbitrario. Recupera exclusivamente fichas publicadas de Supabase y limita el contexto a tres resultados. Si no hay fuentes, falla. Los temas de reservas, clima, mascotas y privacidad conservan respuesta determinista.

Límites implementados: 450 tokens de salida, timeout de 15 segundos, sin reintentos automáticos, seis solicitudes por minuto y 50 por día por usuario e instancia. **La cuota de memoria no es una garantía global en un hosting con múltiples instancias.** Antes de habilitar públicamente se requiere un contador compartido, límite de gasto de cuenta y prueba de permisos/costos. Las respuestas generativas requieren revisión contra las fichas canónicas; no ejecutan pagos ni cambian reservas.

Contrato de consulta preparada:

```json
{"question":"Quiero conocer Saraguro","consentRemote":true}
```

Debe acompañarse de `Authorization: Bearer <access_token>`. Esta versión no incorpora un control de uso remoto en la interfaz; no anuncia que exista IA generativa operativa. Para incorporarlo, añadir consentimiento informado de envío al proveedor y conectar este contrato después de validar las credenciales y las cuotas compartidas.

Documentación oficial: [Messages API](https://platform.claude.com/docs/en/api/messages). Los costos dependen del modelo y de las condiciones vigentes de la cuenta; no se publica una tarifa inventada.

## Verificación

Las pruebas unitarias cubren recuperación y citas, aislamiento offline, restricciones de precios/mascotas/reservas, rechazo de contexto privado, validación de consentimiento remoto, cuota y proveedor apagado. Las pruebas meteorológicas usan respuestas controladas y no certifican disponibilidad del servicio externo. Voz y permisos reales requieren un navegador compatible y autorización manual del usuario; no se han grabado audios en pruebas.
