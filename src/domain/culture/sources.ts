/**
 * Fuente consultada y datos cortos de cada carta de Cultura Viva.
 *
 * Las fuentes son páginas reales revisadas el 15 de noviembre de 2026 (búsqueda web): UNESCO cuando existe
 * y, si no, medios nacionales que describen la fiesta. Respaldan la descripción y el mes habitual, NO una
 * fecha confirmada: las ediciones siguen siendo orientativas hasta que su organizador publique la agenda.
 */
export const CULTURE_SOURCES_CHECKED_AT = '2026-11-15';

export type RespectIcon = 'camera' | 'path' | 'trash' | 'invite' | 'calendar' | 'silence' | 'nature' | 'share';

export const RESPECT_LABELS: Readonly<Record<RespectIcon, string>> = {
  camera: 'Pide permiso para fotos',
  path: 'Deja libre el paso',
  trash: 'Llévate tu basura',
  invite: 'Solo con invitación',
  calendar: 'Confirma la fecha',
  silence: 'Silencio y respeto',
  nature: 'Cuida la fauna',
  share: 'Compra local',
};

export interface CultureSource {
  url: string;
  /** Medio o institución, tal como se mostrará («Primicias», «UNESCO»…). */
  publisher: string;
  checkedAt: string;
}

export interface CultureCardInfo {
  /** Qué se celebra, en una línea corta (≤ 90 caracteres). */
  what: string;
  /** Tres gestos de respeto, en orden. */
  respect: [RespectIcon, RespectIcon, RespectIcon];
  source: CultureSource;
}

const src = (url: string, publisher: string): CultureSource => ({ url, publisher, checkedAt: CULTURE_SOURCES_CHECKED_AT });

export const CULTURE_CARDS: Readonly<Record<string, CultureCardInfo>> = {
  /* ── Fiestas de la especificación (sección 5) ── */
  'inti-raymi': {
    what: 'Fiesta del sol y de la cosecha; cada comunidad la baila a su manera.',
    respect: ['invite', 'camera', 'trash'],
    source: src('https://www.elcomercio.com/actualidad/ecuador/otavalo-cotacachi-toma-plazas-covid19/', 'El Comercio'),
  },
  'mama-negra': {
    what: 'Comparsa en honor a la Virgen de la Merced y a Latacunga.',
    respect: ['path', 'camera', 'trash'],
    source: src('https://primicias.ec/sociedad/cholas-champuseros-curiquingues-listos-mama-negra-latacunga-cotopaxi-82466', 'Primicias'),
  },
  'fruta-flores': {
    what: 'Ambato renació tras el terremoto de 1949 con carros de frutas, flores y pan.',
    respect: ['calendar', 'path', 'camera'],
    source: src('https://www.elcomercio.com/tendencias/fiesta-fef-ambato-declaratoria-patrimonio', 'El Comercio'),
  },
  'diablada-pillaro': {
    what: 'Partidas de diablos y personajes recorren Píllaro del 1 al 6 de enero.',
    respect: ['path', 'camera', 'trash'],
    source: src('https://www.eluniverso.com/noticias/ecuador/la-diablada-pillarena-tendra-trece-comparsas-desde-el-1-al-6-de-enero-nota/', 'El Universo'),
  },
  'artes-vivas-loja': {
    what: 'Teatro, danza y circo en salas y calles de Loja.',
    respect: ['calendar', 'camera', 'trash'],
    source: src('https://cultura.ec/festival/artes-vivas-loja?vista=agenda', 'Agenda oficial del festival'),
  },
  'rodeo-montuvio': {
    what: 'Destreza montubia a caballo; Salitre es la capital montubia.',
    respect: ['calendar', 'path', 'camera'],
    source: src('https://www.eluniverso.com/vida-estilo/2014/10/11/nota/4090446/montubios-grupo-vital-ecuador/', 'El Universo'),
  },
  'san-pedro-san-pablo': {
    what: 'Santos patronos de los pescadores, con procesiones en el mar.',
    respect: ['silence', 'camera', 'trash'],
    source: src('https://www.eltelegrafo.com.ec/noticias/regional-manabi/220/manabi-ecuador-santosapostoles', 'El Telégrafo'),
  },
  kasama: {
    what: 'Año nuevo del pueblo Tsáchila: purificación, comida y encuentro.',
    respect: ['invite', 'camera', 'nature'],
    source: src('https://www.elcomercio.com/tendencias/rituales-celebracion-fiesta-tsachilas-kasama/', 'El Comercio'),
  },
  'fiesta-chonta': {
    what: 'Gratitud shuar por la cosecha de la chonta, fruto sagrado.',
    respect: ['invite', 'camera', 'nature'],
    source: src('https://www.elcomercio.com/tendencias/shuar-celebracion-chonta-zamorachinchipe-intercultural/', 'El Comercio'),
  },
  'provincializacion-galapagos': {
    what: 'Galápagos es provincia desde el 18 de febrero de 1973.',
    respect: ['calendar', 'nature', 'trash'],
    source: src('https://www.eldiario.ec/centro/galapagos-tendra-feriados-obligatorios-en-febrero-y-marzo-de-2026-por-cantonizaciones-30012026/', 'El Diario'),
  },

  /* ── Fiestas añadidas ── */
  'carnaval-guaranda': {
    what: 'Coplas, agua y comparsas en el carnaval más cantado del país.',
    respect: ['calendar', 'camera', 'trash'],
    source: src('https://primicias.ec/sociedad/feriado-carnaval-ecuador-actividades-ambato-guaranda-riobamba-esmeraldas-90494', 'Primicias'),
  },
  'corpus-christi-pujili': {
    what: 'El Danzante de Pujilí: espejos, cintas y un tocado alto.',
    respect: ['path', 'camera', 'trash'],
    source: src('https://www.teleamazonas.com/pujili-se-vistio-de-fiesta-color-y-cultura-con-la-fiesta-de-octavas-del-corpus-christi/', 'Teleamazonas'),
  },
  yamor: {
    what: 'Gracias al maíz con la chicha de siete maíces.',
    respect: ['calendar', 'camera', 'share'],
    source: src('https://primicias.ec/entretenimiento/conciertos-bailes-ferias-y-mas-fiestas-yamor-magico-2024-otavalo-77296', 'Primicias'),
  },
  'pase-nino-viajero': {
    what: 'Desfile navideño de fe con personajes de todo el país.',
    respect: ['silence', 'camera', 'path'],
    source: src('https://primicias.ec/noticias/sociedad/pase-nino-viajero-cuenca-tradicion', 'Primicias'),
  },
  'fiestas-quito': {
    what: 'Chivas, canelazo y desfiles por la fundación de Quito.',
    respect: ['calendar', 'path', 'trash'],
    source: src('https://primicias.ec/quito/tradiciones-fiestas-fundacion-capital-canelazo-chivas-6diciembre-84788', 'Primicias'),
  },
  'virgen-del-cisne': {
    what: 'Más de 70 km a pie con la Virgen, de El Cisne a Loja.',
    respect: ['silence', 'camera', 'trash'],
    source: src('https://www.primicias.ec/sociedad/virgen-cisne-loja-procesion-romeria-catamayo-103128/', 'Primicias'),
  },
  'jesus-gran-poder': {
    what: 'Cucuruchos y verónicas en el Viernes Santo quiteño.',
    respect: ['silence', 'camera', 'path'],
    source: src('https://primicias.ec/quito/procesion-jesus-gran-poder-quito-cucuruchos-veronicas-feriado-94258', 'Primicias'),
  },
  'pawkar-raymi': {
    what: 'Florecimiento y Año Nuevo Andino.',
    respect: ['invite', 'camera', 'trash'],
    source: src('https://www.primicias.ec/entretenimiento/ano-nuevo-andino-mushuk-nina-pawkar-raymi-equinoccio-primavera-flores-amarillas-92274', 'Primicias'),
  },
  'kulla-raymi': {
    what: 'Fertilidad de la tierra y preparación de la siembra.',
    respect: ['invite', 'camera', 'nature'],
    source: src('https://www.eluniverso.com/noticias/ecuador/como-se-viven-los-solsticios-y-equinoccios-en-ecuador-nota/', 'El Universo'),
  },
  'kapak-raymi': {
    what: 'Germinación y nuevas generaciones.',
    respect: ['invite', 'camera', 'nature'],
    source: src('https://www.eluniverso.com/noticias/ecuador/como-se-viven-los-solsticios-y-equinoccios-en-ecuador-nota/', 'El Universo'),
  },
  'dia-difuntos': {
    what: 'Colada morada y guaguas de pan para recordar a los nuestros.',
    respect: ['silence', 'camera', 'share'],
    source: src('https://www.primicias.ec/entretenimiento/cultura/feriado-dia-difuntos-ecuatorianos-colada-morada-82266', 'Primicias'),
  },
  'maiz-sangolqui': {
    what: 'Paseo del Chagra a caballo y fiesta del maíz.',
    respect: ['path', 'camera', 'trash'],
    source: src('https://www.extra.ec/noticia/quito/sangolqui-prende-fiestas-maiz-turismo-eventos-vienen-161691.html', 'Extra'),
  },
  'virgen-quinche': {
    what: 'Caminata nocturna de fe hacia el santuario de El Quinche.',
    respect: ['silence', 'camera', 'trash'],
    source: src('https://www.primicias.ec/quito/origen-caminata-virgen-quinche-oyacachi-diego-robles-papa-francisco-110015/', 'Primicias'),
  },
  'fiestas-cuenca': {
    what: 'Desfiles, conciertos y la gran feria de artesanías del CIDAP.',
    respect: ['calendar', 'share', 'trash'],
    source: src('https://www.elcomercio.com/actualidad/ecuador/agenda-fiestas-cuenca-aniversario-independencia/', 'El Comercio'),
  },
  'fundacion-guayaquil': {
    what: 'Desfiles, carros alegóricos y ferias por la fundación del puerto.',
    respect: ['calendar', 'path', 'trash'],
    source: src('https://www.elcomercio.com/actualidad/guayaquil/fiestas-guayaquil-agenda-julio/', 'El Comercio'),
  },
  'independencia-guayaquil': {
    what: 'Aurora Gloriosa y desfiles por la gesta del 9 de octubre de 1820.',
    respect: ['calendar', 'path', 'trash'],
    source: src('https://primicias.ec/noticias/sociedad/desfile-estudiantil-pregon-civico-guayaquil-fiestas-independencia', 'Primicias'),
  },
  'ano-viejo': {
    what: 'Monigotes, viudas y testamentos para despedir el año.',
    respect: ['calendar', 'camera', 'trash'],
    source: src('https://primicias.ec/sociedad/testamentos-tradicion-ecuador-monigotes-ano-viejo-86472', 'Primicias'),
  },
  'marimba-esmeraldas': {
    what: 'Marimba, cantos y bailes afroesmeraldeños. Patrimonio de la Humanidad.',
    respect: ['silence', 'camera', 'share'],
    source: src(
      'https://ich.unesco.org/es/RL/musica-de-marimba-y-cantos-y-bailes-tradicionales-de-la-region-colombiana-del-pacifico-sur-y-de-la-provincia-de-esmeraldas-del-ecuador-01099',
      'UNESCO',
    ),
  },
  'puyo-nacionalidades': {
    what: 'Puyo y las siete nacionalidades de Pastaza.',
    respect: ['calendar', 'camera', 'nature'],
    source: src('https://www.expreso.ec/ocio/cultura/siete-nacionalidades-indigenas-celebran-aniversario-puyo-160236.html', 'Expreso'),
  },
  'nino-jista': {
    what: 'Leña, chicha, tambores y la iglesia adornada con flores.',
    respect: ['invite', 'camera', 'nature'],
    source: src('https://www.elcomercio.com/tendencias/nacionalidad-kichwa-celebracion-nino-jista/', 'El Comercio'),
  },
  'cantonizacion-isabela': {
    what: 'Isabela celebra su cantón en Puerto Villamil.',
    respect: ['calendar', 'nature', 'trash'],
    source: src('https://www.eldiario.ec/centro/galapagos-tendra-feriados-obligatorios-en-febrero-y-marzo-de-2026-por-cantonizaciones-30012026/', 'El Diario'),
  },
};
