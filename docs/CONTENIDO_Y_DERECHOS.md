# Contenido y derechos

Los documentos originales permanecen en `CHULLA_VIDA_3_PAQUETE`. El generador crea 33 fichas con el bloque de origen completo; no convierte tarifas propuestas en ofertas contratadas. Las copias públicas de los tres TXT permiten consultar sus fuentes desde cada ficha.

La fecha de importación identifica trabajo editorial local. No equivale a confirmación externa de precios, acceso, seguridad, servicios, capacidad, mascotas o identidad de un operador. Los avisos históricos de Galápagos conservan su fecha y requieren revalidación.

Las fotos heredadas conservan créditos en `public/images/CREDITS.md`. Cada ficha muestra una fotografía real solo cuando esa foto retrata el lugar concreto o su atractivo principal (`depictsThisPlace: true`; ver «Fotos reales por ficha» más abajo). Si no hay una foto libre y fiable, la ficha conserva su ilustración propia, rotulada como «no es una fotografía del lugar»: mejor una ilustración que una foto de otro sitio. No se presentan imágenes como retratos de un prestador o su servicio. Las variantes WebP sirven para reducir transferencia; no alteran derechos de uso.

Se conserva sin modificar el logo `public/chulla-vida-logo.png`. No se declara aprobado un nuevo concepto de marca. Los archivos de `public/brand` heredados de la sesión anterior no reemplazan automáticamente el logo.

Cultura Viva no confirma ediciones, acceso a ceremonias ni autorización para fotografías. Las narraciones, testimonios, retratos y medios de comunidades requieren validación y consentimiento antes de publicación. No hay nuevas reseñas o testimonios inventados en el catálogo V3.

Spotify se carga solo con permiso para medios y acción de abrir reproductor. Las redes sociales anteriores siguen siendo simuladas. No se incorporó un feed multimedia ni licencias nuevas de video.

<!-- fotos-por-ficha:inicio -->

## Fotos reales por ficha

41 de 51 fichas muestran una fotografía real del lugar o de su atractivo principal, tomada de
Wikimedia Commons y aceptada solo con licencia de dominio público, CC0, CC BY o CC BY-SA, tras revisar
título, descripción y categorías. Cada archivo es una obra derivada (recorte 16:10 centrado, WebP de 640 y
1280 px); las fotos CC BY-SA se comparten bajo la misma licencia. La tarjeta muestra autor y licencia y
enlaza a la página original. Registro completo: `scripts/place-images.json`; regeneración:
`python -I scripts/fetch-place-images.py download` y después `node scripts/build-catalog-seed.mjs`.

Una foto con licencia libre no implica aval del autor ni de las personas o comunidades que aparezcan.

| Ficha | Obra en Commons | Autor | Licencia |
| --- | --- | --- | --- |
| `amz-01-reserva-cuyabeno` | [Macrolobiumbäume in der Laguna Grande, Cuyabeno-Reservat.jpg](https://commons.wikimedia.org/wiki/File:Macrolobiumb%C3%A4ume_in_der_Laguna_Grande,_Cuyabeno-Reservat.jpg) | Fährtenleser | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| `amz-04-puerto-misahualli` | [Puerto Misahuallí.JPG](https://commons.wikimedia.org/wiki/File:Puerto_Misahuall%C3%AD.JPG) | David C. S. | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| `amz-05-cavernas-de-jumandy` | [CAVERNAS DE JUMANDY (19971925995).jpg](https://commons.wikimedia.org/wiki/File:CAVERNAS_DE_JUMANDY_(19971925995).jpg) | Agencia de Noticias ANDES | [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0) |
| `amz-08-parque-nacional-yasuni` | [Estacion Cientifica Yasuni (ECY) Yasuni Research Station.jpg](https://commons.wikimedia.org/wiki/File:Estacion_Cientifica_Yasuni_(ECY)_Yasuni_Research_Station.jpg) | Lauren Whitehurst | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| `amz-10-laguna-anango` | [Dron de la Laguna Añangu.jpg](https://commons.wikimedia.org/wiki/File:Dron_de_la_Laguna_A%C3%B1angu.jpg) | Añangu | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| `amz-12-cascada-hola-vida` | [Cascada Hola Vida.jpg](https://commons.wikimedia.org/wiki/File:Cascada_Hola_Vida.jpg) | David C. S. | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| `amz-14-cueva-de-los-tayos` | [Corredor - Cueva de los Tayos.JPG](https://commons.wikimedia.org/wiki/File:Corredor_-_Cueva_de_los_Tayos.JPG) | MezzoforteF | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) |
| `amz-15-macas-y-cascadas-cercanas` | [Centro y norte de Macas.jpg](https://commons.wikimedia.org/wiki/File:Centro_y_norte_de_Macas.jpg) | David C. S. | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| `amz-17-parque-nacional-podocarpus-bombuscaro` | [Río Bombuscaro - Zamora.jpg](https://commons.wikimedia.org/wiki/File:R%C3%ADo_Bombuscaro_-_Zamora.jpg) | Carlosmedinav77 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| `amz-18-alto-nangaritza` | [Río Nangaritza.JPG](https://commons.wikimedia.org/wiki/File:R%C3%ADo_Nangaritza.JPG) | AndresJM1989 | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) |
| `costa-01-raices-de-manabi` | [Ecuador aguablanca sulfur laguna.jpg](https://commons.wikimedia.org/wiki/File:Ecuador_aguablanca_sulfur_laguna.jpg) | Delphine Ménard (notafish) | [CC BY-SA 2.0 fr](https://creativecommons.org/licenses/by-sa/2.0/fr/deed.en) |
| `costa-02-guayaquil-vivo` | [Malecón 2000 en Guayaquil.jpg](https://commons.wikimedia.org/wiki/File:Malec%C3%B3n_2000_en_Guayaquil.jpg) | Padaguan | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) |
| `costa-03-pacifico-activo` | [Salinas panorama gennaio2010.jpg](https://commons.wikimedia.org/wiki/File:Salinas_panorama_gennaio2010.jpg) | Kirk39 | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) |
| `costa-04-sabores-de-manta` | [Manta Ecuador playa Murciélago 02.jpg](https://commons.wikimedia.org/wiki/File:Manta_Ecuador_playa_Murci%C3%A9lago_02.jpg) | Cayambe | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) |
| `costa-05-aventura-marina` | [Isla Salango1.jpg](https://commons.wikimedia.org/wiki/File:Isla_Salango1.jpg) | Kevinmero | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| `costa-06-expedicion-natural` | [Isla de la Plata Ecuador458.JPG](https://commons.wikimedia.org/wiki/File:Isla_de_la_Plata_Ecuador458.JPG) | Arabsalam | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| `costa-07-ola-y-manglar` | [MOMPICHE ESMERALDAS ECUADOR.JPG](https://commons.wikimedia.org/wiki/File:MOMPICHE_ESMERALDAS_ECUADOR.JPG) | Carlos Echanique | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| `gal-01-bartolome-bahia-sullivan` | [Bartolomé Island Pinnacle Rock.jpg](https://commons.wikimedia.org/wiki/File:Bartolom%C3%A9_Island_Pinnacle_Rock.jpg) | Cayambe | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) |
| `gal-02-seymour-norte-las-bachas` | [Isla Seymour Norte, islas Galápagos, Ecuador, 2015-07-26, DD 92.JPG](https://commons.wikimedia.org/wiki/File:Isla_Seymour_Norte,_islas_Gal%C3%A1pagos,_Ecuador,_2015-07-26,_DD_92.JPG) | Diego Delso | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| `gal-03-plaza-sur-punta-carrion` | [South Plaza Island 03.jpg](https://commons.wikimedia.org/wiki/File:South_Plaza_Island_03.jpg) | Bernard Gagnon | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| `gal-04-kicker-rock-tour-360` | [León Dormido (Kicker Rock).JPG](https://commons.wikimedia.org/wiki/File:Le%C3%B3n_Dormido_(Kicker_Rock).JPG) | Xxchangwoo0120xx | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) |
| `gal-05-san-cristobal-terrestre` | [El Junco, Galapagos.jpg](https://commons.wikimedia.org/wiki/File:El_Junco,_Galapagos.jpg) | Mikko Koponen from Helsinki, Finland | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) |
| `gal-07-sierra-negra-volcan-chico` | [Sierra Negra volcano Isabela Island Galápagos Ecuador DSC00326 ad.JPG](https://commons.wikimedia.org/wiki/File:Sierra_Negra_volcano_Isabela_Island_Gal%C3%A1pagos_Ecuador_DSC00326_ad.JPG) | Adavyd | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| `gal-08-tintoreras-concha-perla` | [Isabela Island, Tintoreras, Galápagos Islands, Ecuador.jpg](https://commons.wikimedia.org/wiki/File:Isabela_Island,_Tintoreras,_Gal%C3%A1pagos_Islands,_Ecuador.jpg) | Charles J. Sharp | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| `gal-09-isabela-4-dias` | [PtoVillamilPlaya1.jpg](https://commons.wikimedia.org/wiki/File:PtoVillamilPlaya1.jpg) | Torbenbrinker | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| `gal-10-galapagos-origins-5-dias` | [Bahía Tortuga, isla Santa Cruz, islas Galápagos, Ecuador, 2015-07-26, DD 26.JPG](https://commons.wikimedia.org/wiki/File:Bah%C3%ADa_Tortuga,_isla_Santa_Cruz,_islas_Gal%C3%A1pagos,_Ecuador,_2015-07-26,_DD_26.JPG) | Diego Delso | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| `gal-11-plan-economico-5-dias` | [Puerto Ayora - Harbour.jpg](https://commons.wikimedia.org/wiki/File:Puerto_Ayora_-_Harbour.jpg) | Victor Gleim | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| `gal-12-plan-normal-5-dias` | [Charles Darwin Research Station.jpg](https://commons.wikimedia.org/wiki/File:Charles_Darwin_Research_Station.jpg) | TriiipleThreat | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) |
| `gen-01-saraguro-ancestral` | [Unterwegs nach Loja Ecuador408.JPG](https://commons.wikimedia.org/wiki/File:Unterwegs_nach_Loja_Ecuador408.JPG) | Arabsalam | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| `gen-02-quilotoa-shalala` | [Quilotoa Laguna Quilotoa seen from Mirador Cristal 1.jpg](https://commons.wikimedia.org/wiki/File:Quilotoa_Laguna_Quilotoa_seen_from_Mirador_Cristal_1.jpg) | Ymblanter | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| `gen-04-salasaca-viva` | [Tiendas artesanales, Salasaca - Pelileo.jpg](https://commons.wikimedia.org/wiki/File:Tiendas_artesanales,_Salasaca_-_Pelileo.jpg) | David C. S. | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| `gen-05-oyacachi` | [Oyacachi.JPG](https://commons.wikimedia.org/wiki/File:Oyacachi.JPG) | Patricio Mena Vásconez | Public domain |
| `gen-06-valle-de-intag` | [Rio Intag Ecuador 979.jpg](https://commons.wikimedia.org/wiki/File:Rio_Intag_Ecuador_979.jpg) | Arabsalam | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| `gen-07-banos-de-agua-santa` | [The base of Pailón del Diablo.jpg](https://commons.wikimedia.org/wiki/File:The_base_of_Pail%C3%B3n_del_Diablo.jpg) | Ronan.js | [CC0](http://creativecommons.org/publicdomain/zero/1.0/deed.en) |
| `gen-08-cuenca` | [Domes of the Catedral de la Immaculada Concepción.jpg](https://commons.wikimedia.org/wiki/File:Domes_of_the_Catedral_de_la_Immaculada_Concepci%C3%B3n.jpg) | Bernard Gagnon | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) |
| `gen-09-parque-nacional-cotopaxi` | [Cotopaxi 01.jpg](https://commons.wikimedia.org/wiki/File:Cotopaxi_01.jpg) | Bernard Gagnon | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) |
| `gen-10-otavalo` | [Otavalo Ecuador 866.jpg](https://commons.wikimedia.org/wiki/File:Otavalo_Ecuador_866.jpg) | Arabsalam | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| `gen-11-quito` | [Quito as from panecillo Basilica.jpg](https://commons.wikimedia.org/wiki/File:Quito_as_from_panecillo_Basilica.jpg) | Cayambe | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) |
| `gen-12-loja` | [LojaCityGates.JPG](https://commons.wikimedia.org/wiki/File:LojaCityGates.JPG) | The lifted lorax at English Wikipedia | Public domain |
| `gen-13-riobamba` | [Catedral Riobamba.jpg](https://commons.wikimedia.org/wiki/File:Catedral_Riobamba.jpg) | Dr. Carlos Costales Terán | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| `gen-14-mindo` | [Mindo-Cloud-Forest-02.jpg](https://commons.wikimedia.org/wiki/File:Mindo-Cloud-Forest-02.jpg) | Ayacop | Public domain |

Fichas sin foto a propósito (siguen con la ilustración propia, rotulada como tal):

- `gen-03-yunguilla`: no hay en Commons una foto libre que muestre con certeza la comunidad de Yunguilla.
- `gal-06-los-tuneles-cabo-rosa`: solo hay fotos de fauna suelta, sin el paisaje de los túneles de lava.
- `amz-02-laguna-de-limoncocha`: sin foto libre fiable de la laguna.
- `amz-03-laguna-panacocha`: sin foto libre fiable de la laguna.
- `amz-06-torre-amani`: la fuente no ubica el lugar; no se puede comprobar ninguna foto.
- `amz-07-cueva-del-duende`: la fuente no ubica el lugar; no se puede comprobar ninguna foto.
- `amz-09-laguna-taracoa`: sin foto libre fiable de la laguna.
- `amz-11-laguna-ila-kucha`: sin foto libre fiable de la laguna.
- `amz-13-mirador-de-shinguipata`: sin foto libre del mirador.
- `amz-16-reserva-biologica-el-quimi`: en Commons solo hay láminas científicas, no paisaje del área.

<!-- fotos-por-ficha:fin -->
