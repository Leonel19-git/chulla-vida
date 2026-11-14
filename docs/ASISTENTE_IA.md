# MIJIN · Tu pana de aventuras

MIJIN está disponible desde el botón flotante en todas las pantallas. El modo entregado en la interfaz es **Catálogo y FAQ**, determinista y sin proveedor generativo conectado. Busca en las fichas del catálogo y devuelve el documento y la fecha de revisión documental. No presenta esa fecha como verificación del operador ni como actualización en tiempo real.

## Probar ahora

1. Abrir «Habla con MIJIN» y **tocar el micrófono**. Ese toque es el gesto de consentimiento: no hay casilla previa. La primera vez de cada sesión aparece debajo un aviso breve (el navegador reconoce la voz y puede enviarla a su proveedor; CHULLA VIDA no guarda audio) y enseguida el navegador pide su permiso. Decir «Quiero conocer Saraguro». Los resultados abren sus fichas.
2. Probar «Salgo de Quito con $20», «Galápagos con $20», «Voy con mi perro» y «¿Cómo funciona el pasaporte?».
3. Reconocimiento (`src/features/assistant/VoiceExperience.tsx` + `speech.ts`): idioma `es-EC`, y si el navegador responde `language-not-supported` se reintenta con `es-ES`. `interimResults` muestra subtítulos en vivo; `continuous = false` termina solo con el silencio y hay un tope de seguridad de 15 s. Si el motor termina sin marcar la frase como final, se usa el último subtítulo. Volver a tocar el micrófono durante la escucha la detiene; tocarlo mientras MIJIN habla la interrumpe y vuelve a escuchar (reinicio seguro: la instancia anterior se desconecta antes de abortarse).
4. Errores explicados: `not-allowed` / `service-not-allowed` → cómo habilitar el micrófono en el candado del navegador; `network` → el reconocimiento del navegador necesita internet; `no-speech` → «No te escuché, toca de nuevo»; `audio-capture` → no hay micrófono; Firefox y Safari antiguos (sin `SpeechRecognition`) → aviso y foco en el campo de texto, que responde igual. Sin conexión, tocar el micrófono no inicia la captura y explica la limitación.
5. Síntesis: elige una voz en español por preferencia `es-EC` → `es-419` → `es-MX` → `es-US` → `es-ES` → otra variante de español, esperando `voiceschanged` (máximo 1,2 s) cuando las voces aún no cargaron. Trocea respuestas largas por frases (≤ 200 caracteres) para evitar cortes; «Velocidad» ofrece Pausada, Normal y Ágil; «Detener» cancela captura y lectura. «Respuesta con voz» solo lee automáticamente las preguntas hechas con el micrófono; las respuestas escritas tienen un botón «Escuchar respuesta».
6. La conversación vive solo en memoria y puede borrarse; no guardamos audio bruto. Al cerrar o esconder la página se detiene la voz. Los permisos del navegador se revocan desde su configuración. No se garantiza reconocimiento sin red ni exactitud en lenguas indígenas.

Verificación de esta versión: pruebas en `tests/unit/assistant-ui.test.tsx` y `tests/unit/voice-speech.test.ts` (sin grabar audio real). En Chromium sin interfaz (Playwright, sin micrófono) el botón inicia la escucha sin errores de consola y, al no llegar voz, el tope de 15 s la cierra con «No te escuché». No se probó con un micrófono real.

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
