# Idiomas de CHULLA VIDA

`translate(language, SpanishLiteral, variables?)` es una función pura. La interfaz llama a `useApp().t(...)`, conserva los valores internos del dominio en español y cambia solo sus etiquetas visibles. La elección se guarda con el validador de almacenamiento y establece `document.documentElement.lang`. Nombres propios, contenido escrito por usuarios y relatos de la ficha conservan su fuente española. No hay traducción automática ni llamadas externas.

Español, inglés, francés, portugués y chino simplificado cubren la navegación y los controles principales, el planificador, las tarjetas, pestañas de detalle, música, solicitudes, simulación de pagos y panel de negocios. `offline.ts` contiene el vocabulario del documento descargable; `payments.ts`, `host.ts`, `wallet.ts` y `premium.ts` amplían el diccionario de interfaz.

## Kichwa ecuatoriano

Las dos elecciones regionales, Sierra (`ki`) y Amazonía (`ki-amz`), cambian la navegación, bienvenida, filtros de catálogo, los ocho pasos del planificador, acciones principales, ayuda, música y toda la ruta descargable. `kichwa.ts` contiene una base común de más de 500 frases de interfaz y vocabulario de cobros, retiros, planes y pasaporte. No existe una llamada a traducción automática ni depende de red.

Ambas usan la etiqueta lingüística `qu-EC` y la misma base editorial unificada. **No son dos dialectos validados.** El aviso visible «Kichwa unificado · Borrador · Revisión regional pendiente» explica esta distinción tanto en la bienvenida como junto al selector. Las fuentes fundamentan el léxico y la ortografía; las frases de producto son composiciones editoriales nuevas, no traducciones certificadas por esas instituciones. Es necesaria una revisión de hablantes Sierra y Amazonía para corregir gramática, terminología informática y preferencias locales antes de presentar esta traducción como definitiva.

Los nombres de lugares, CHULLA VIDA, Spotify, GPS y relatos del catálogo no se traducen. Las frases no cubiertas del panel de publicación y checkout conservan el español de origen. Esto evita inventar equivalencias, pero significa que la cobertura Kichwa aún no es integral en esas pantallas.

Fuentes primarias consultadas el 23 de octubre de 2026:

- [Diccionario Kichwa-Castellano del Ministerio de Educación](https://www.educacion.gob.ec/wp-content/uploads/downloads/2013/03/RK_diccionario_kichwa_castellano.pdf), referencia del kichwa ecuatoriano.
- [Diccionarios de lenguas originarias de SEIBE](https://educacionbilingue.gob.ec/?page_id=14267), enlaza el [Diccionario ilustrado Kichwa amazónico, DINEIB / UNICEF / Universidad de Cuenca](https://educacionbilingue.gob.ec/wp-content/uploads/2025/05/Diccionario-ilustrado-Kichwa_compressed.pdf). Verifica la existencia de una fuente propia de la Amazonía; no implica que la interfaz sea una adaptación dialectal ya revisada.
- [Diseño y planificación de senderos, Ministerio del Ambiente](https://www.ambiente.gob.ec/wp-content/uploads/downloads/2014/07/Dise%C3%B1o-y-Planificaci%C3%B3n-de-Senderos.pdf), identifica Yaku (agua) y Ñan (camino).
- [Wirakuchakunamanta Shimi, Universidad Intercultural de las Nacionalidades y Pueblos Indígenas Amawtay Wasi](https://editorial.uaw.edu.ec/wp-content/uploads/2024/06/WIRAKUCHAKUNAMANTA-SHIMI-DIGITAL.pdf), presenta Imanalla (hola), Mashi (amigo) y el saludo Alli puncha mashi.

El PDF antiguo del Ministerio devolvió timeout durante esta revisión. Se verificaron los recursos de SEIBE y el libro de Amawtay Wasi, cuya sección de variación dialectal confirma que no se debe llamar regionalmente validada a una sola base común.

No se inventan diferencias entre Sierra y Amazonía. Una traducción ausente vuelve a español y nunca expone la clave técnica. `node scripts/verify-i18n.mjs` verifica cambios reales en ambas opciones Kichwa, etiquetas críticas de los seis idiomas alternativos, conservación de variables, todas las claves offline y de cobros/retiros. Esta prueba verifica cobertura y composición; no certifica corrección lingüística.
