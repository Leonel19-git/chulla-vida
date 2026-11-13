import { getExperienceById } from '../catalog';
import {
  CULTURAL_EVENTS,
  CULTURE_SOURCE,
  LOJA_FESTIVAL_AGENDA_URL,
  eventStatus,
  eventStatusLabel,
  filterCulturalEvents,
  formatDateRange,
  getEventById,
  getEventsByMonth,
  getEventsByRegion,
  getUpcomingEvents,
} from './index';

/** Mediodía de Ecuador continental (UTC−5) del día indicado. */
const noon = (isoDay: string) => new Date(`${isoDay}T17:00:00Z`);
const ids = (events: readonly { id: string }[]) => events.map(event => event.id);
const byId = (id: string) => {
  const found = getEventById(id);
  if (!found) throw new Error(`No existe ${id}`);
  return found;
};

describe('contenido semilla de Cultura Viva', () => {
  it('trae las diez fiestas de la sección 5, cada una en su región', () => {
    expect(CULTURAL_EVENTS).toHaveLength(10);
    expect(new Set(ids(CULTURAL_EVENTS)).size).toBe(10);
    expect(new Set(CULTURAL_EVENTS.map(event => event.slug)).size).toBe(10);
    expect(ids(getEventsByRegion('sierra'))).toEqual(['inti-raymi', 'mama-negra', 'fruta-flores', 'diablada-pillaro', 'artes-vivas-loja']);
    expect(ids(getEventsByRegion('costa'))).toEqual(['rodeo-montuvio', 'san-pedro-san-pablo', 'kasama']);
    expect(ids(getEventsByRegion('amazonia'))).toEqual(['fiesta-chonta']);
    expect(ids(getEventsByRegion('galapagos'))).toEqual(['provincializacion-galapagos']);
  });

  it('Loja está en la Sierra y Kasama en la Costa', () => {
    expect(byId('artes-vivas-loja')).toMatchObject({
      name: 'Festival Internacional de Artes Vivas de Loja',
      region: 'sierra',
      provinces: ['Loja'],
      localities: ['Loja'],
      category: 'festival_artes',
    });
    expect(byId('kasama')).toMatchObject({
      region: 'costa',
      provinces: ['Santo Domingo de los Tsáchilas'],
      community: 'Pueblo Tsáchila',
      category: 'ceremonia_comunitaria',
    });
    expect(filterCulturalEvents({ query: 'kasama', region: 'sierra' })).toEqual([]);
    expect(filterCulturalEvents({ query: 'artes vivas', region: 'costa' })).toEqual([]);
  });

  it('reserva la categoría «raymi» para el Inti Raymi', () => {
    expect(ids(CULTURAL_EVENTS.filter(event => event.category === 'raymi'))).toEqual(['inti-raymi']);
    expect(byId('inti-raymi')).toMatchObject({ localities: ['Otavalo', 'Cotacachi', 'Ingapirca'], usualMonths: [6] });
    expect(byId('inti-raymi').description).toMatch(/diferencias locales/);
  });

  it('conserva meses y fechas orientativas tal como los da la especificación', () => {
    expect(byId('mama-negra')).toMatchObject({ localities: ['Latacunga'], usualMonths: [9, 11] });
    expect(byId('fruta-flores')).toMatchObject({ localities: ['Ambato'], usualMonths: [2, 3] });
    expect(byId('fruta-flores').dateLabel).toMatch(/móvil/);
    expect(byId('diablada-pillaro')).toMatchObject({ localities: ['Píllaro'], usualMonths: [1], dateLabel: '1–6 de enero' });
    expect(byId('rodeo-montuvio')).toMatchObject({ usualMonths: [10] });
    expect(byId('rodeo-montuvio').dateLabel).toMatch(/12 de octubre.*localidad/);
    expect(byId('san-pedro-san-pablo')).toMatchObject({ provinces: ['Manabí'], usualMonths: [6] });
    expect(byId('fiesta-chonta')).toMatchObject({ localName: 'Uwi', usualMonths: [4, 5], region: 'amazonia' });
    expect(byId('provincializacion-galapagos')).toMatchObject({ usualMonths: [2], category: 'civica' });
  });

  it('solo publica la URL que aporta la especificación', () => {
    expect(LOJA_FESTIVAL_AGENDA_URL).toBe('https://cultura.ec/festival/artes-vivas-loja?vista=agenda');
    for (const event of CULTURAL_EVENTS) {
      const urls = [event.officialUrl, ...event.editions.map(edition => edition.sourceUrl)].filter(Boolean);
      if (event.id === 'artes-vivas-loja') expect(new Set(urls)).toEqual(new Set([LOJA_FESTIVAL_AGENDA_URL]));
      else expect(urls).toEqual([]);
      // Tampoco se cuela ninguna en los textos.
      expect(JSON.stringify({ ...event, officialUrl: null, editions: [] })).not.toMatch(/https?:\/\/|www\./);
    }
  });

  it('solo la edición 2026 de Loja tiene fechas; el resto queda sin fecha inventada', () => {
    expect(byId('artes-vivas-loja').editions).toHaveLength(1);
    expect(byId('artes-vivas-loja').editions[0]).toMatchObject({
      year: 2026,
      startDate: '2026-11-12',
      endDate: '2026-11-22',
      confirmation: 'confirmed_official',
      sourceUrl: LOJA_FESTIVAL_AGENDA_URL,
    });
    expect(byId('artes-vivas-loja').editions[0].provenanceNote).toMatch(/debe revalidarse/);
    for (const event of CULTURAL_EVENTS.filter(item => item.id !== 'artes-vivas-loja')) {
      expect(event.editions.length).toBeGreaterThan(0);
      for (const edition of event.editions) {
        expect(edition.startDate).toBeNull();
        expect(edition.endDate).toBeNull();
        expect(edition.sourceUrl).toBeNull();
        expect(edition.confirmation).not.toBe('confirmed_official');
      }
    }
  });

  it('Kasama no tiene fecha fija y la Chonta no se reduce a espectáculo', () => {
    const kasama = byId('kasama');
    expect(kasama.usualMonths).toEqual([]);
    expect(kasama.sensitive).toBe(true);
    expect(kasama.editions.map(edition => edition.confirmation)).toEqual(['community_defined']);
    expect(kasama.dateLabel).not.toMatch(/\d/);
    expect(kasama.description).not.toMatch(/\b\d{1,2} de [a-z]+/);
    expect(kasama.protocols.join(' ')).toMatch(/invitación o autorización/);

    const chonta = byId('fiesta-chonta');
    expect(chonta.sensitive).toBe(true);
    expect(chonta.editions.map(edition => edition.confirmation)).toEqual(['community_defined']);
    expect(chonta.community).toMatch(/Shuar y Achuar/);
    expect(chonta.description).toMatch(/No es un espectáculo/);
    expect(chonta.dateLabel).toMatch(/referencia estacional: abril o mayo/);
    expect(CULTURAL_EVENTS.filter(event => event.sensitive).map(event => event.id)).toEqual(['kasama', 'fiesta-chonta']);
  });

  it('cada ficha trae sus propios protocolos de respeto, incluido el consentimiento para fotografiar', () => {
    const seen = new Set<string>();
    for (const event of CULTURAL_EVENTS) {
      expect(event.protocols.length).toBeGreaterThanOrEqual(3);
      expect(event.description.length).toBeGreaterThan(80);
      expect(event.lastCheckedAt).toBe('2026-11-12');
      const joined = event.protocols.join(' | ');
      expect(seen.has(joined)).toBe(false);
      seen.add(joined);
    }
    for (const event of CULTURAL_EVENTS.filter(item => item.category !== 'civica')) {
      expect(event.protocols.join(' ')).toMatch(/fotograf/i);
    }
    expect(byId('provincializacion-galapagos').protocols.join(' ')).toMatch(/Parque Nacional Galápagos/);
  });

  it('las experiencias relacionadas existen en el catálogo y comparten provincia', () => {
    for (const event of CULTURAL_EVENTS) {
      for (const experienceId of event.relatedExperienceIds) {
        const experience = getExperienceById(experienceId);
        expect(experience, experienceId).toBeDefined();
        expect(experience!.id).toBe(experienceId);
        expect(event.provinces).toContain(experience!.province);
      }
    }
    expect(byId('artes-vivas-loja').relatedExperienceIds).toContain('gen-12-loja');
    expect(byId('kasama').relatedExperienceIds).toEqual([]);
  });

  it('declara su procedencia editorial', () => {
    expect(CULTURE_SOURCE.originalDocument).toMatch(/SUPERPROMPT_CHULLA_VIDA_3_0_CLAUDE_CODE\.md, sección 5/);
    expect(CULTURE_SOURCE.notice).toMatch(/orientativas/);
  });

  it('el contenido semilla no se puede alterar en tiempo de ejecución', () => {
    const edition = byId('inti-raymi').editions[0] as { startDate: string | null };
    expect(() => {
      edition.startDate = '2027-06-21';
    }).toThrow();
    expect(byId('inti-raymi').editions[0].startDate).toBeNull();
  });
});

describe('getEventsByMonth', () => {
  it('devuelve las fiestas del mes habitual', () => {
    expect(ids(getEventsByMonth(6))).toEqual(['inti-raymi', 'san-pedro-san-pablo']);
    expect(ids(getEventsByMonth(1))).toEqual(['diablada-pillaro']);
    expect(ids(getEventsByMonth(2))).toEqual(['fruta-flores', 'provincializacion-galapagos']);
    expect(ids(getEventsByMonth(11))).toEqual(['mama-negra', 'artes-vivas-loja']);
    expect(ids(getEventsByMonth(4))).toEqual(['fiesta-chonta']);
    expect(getEventsByMonth(7)).toEqual([]);
  });

  it('Kasama no aparece en ningún mes y un mes inválido no devuelve nada', () => {
    for (let month = 1; month <= 12; month += 1) expect(ids(getEventsByMonth(month))).not.toContain('kasama');
    expect(getEventsByMonth(0)).toEqual([]);
    expect(getEventsByMonth(13)).toEqual([]);
    expect(getEventsByMonth(6.5)).toEqual([]);
  });
});

describe('getUpcomingEvents', () => {
  const find = (now: Date, id: string) => getUpcomingEvents(now).find(item => item.event.id === id);

  it('antes del festival de Loja lo muestra programado, con sus fechas y su fuente', () => {
    const upcoming = getUpcomingEvents(noon('2026-11-01'));
    expect(upcoming[0]).toMatchObject({ status: 'scheduled', year: 2026, month: 11 });
    expect(upcoming[0].event.id).toBe('artes-vivas-loja');
    expect(upcoming[0].edition?.sourceUrl).toBe(LOJA_FESTIVAL_AGENDA_URL);
    expect(upcoming[0].label).toBe('Programada: del 12 al 22 de noviembre de 2026. Revalida la programación en la agenda oficial antes de ir.');
  });

  it('durante el festival lo marca en curso, hasta el último día inclusive', () => {
    expect(find(noon('2026-11-12'), 'artes-vivas-loja')?.status).toBe('in_progress');
    expect(find(noon('2026-11-13'), 'artes-vivas-loja')?.label).toMatch(/^En curso: del 12 al 22 de noviembre de 2026/);
    expect(find(noon('2026-11-22'), 'artes-vivas-loja')?.status).toBe('in_progress');
    // 22 de noviembre, 23:30 en Ecuador = 23 de noviembre 04:30 UTC: todavía es el último día.
    expect(find(new Date('2026-11-23T04:30:00Z'), 'artes-vivas-loja')?.status).toBe('in_progress');
  });

  it('una edición confirmada que ya terminó no se presenta como próxima', () => {
    // 23 de noviembre, 00:30 en Ecuador.
    expect(find(new Date('2026-11-23T05:30:00Z'), 'artes-vivas-loja')).toBeUndefined();
    expect(find(noon('2026-11-30'), 'artes-vivas-loja')).toBeUndefined();
    const december = find(noon('2026-12-05'), 'artes-vivas-loja');
    // Vuelve solo como mes habitual del año siguiente, sin fecha y marcado como orientativo.
    expect(december).toMatchObject({ status: 'orientative', edition: null, year: 2027, month: 11 });
    expect(december?.label).toMatch(/la edición 2027 no está confirmada/);
    for (const day of ['2026-11-23', '2026-12-05', '2027-03-01', '2027-11-30']) {
      for (const item of getUpcomingEvents(noon(day))) {
        if (item.edition) expect(item.edition.endDate! >= day).toBe(true);
      }
    }
  });

  it('las fechas orientativas nunca se presentan como confirmadas', () => {
    const upcoming = getUpcomingEvents(noon('2026-11-13'));
    expect(upcoming.map(item => [item.event.id, item.status, item.year, item.month])).toEqual([
      ['artes-vivas-loja', 'in_progress', 2026, 11],
      ['mama-negra', 'orientative', 2026, 11],
      ['diablada-pillaro', 'orientative', 2027, 1],
      ['fruta-flores', 'orientative', 2027, 2],
      ['provincializacion-galapagos', 'orientative', 2027, 2],
      ['inti-raymi', 'orientative', 2027, 6],
      ['san-pedro-san-pablo', 'orientative', 2027, 6],
      ['rodeo-montuvio', 'orientative', 2027, 10],
    ]);
    for (const item of upcoming.filter(entry => entry.status === 'orientative')) {
      expect(item.edition).toBeNull();
      expect(item.label).toMatch(/Fecha orientativa/);
      expect(item.label).toMatch(/no está confirmada/);
      expect(item.label).not.toMatch(/Programada|En curso/);
    }
  });

  it('no anuncia ceremonias de calendario comunitario', () => {
    for (const day of ['2026-01-10', '2026-04-15', '2026-11-13', '2027-05-01']) {
      const listed = getUpcomingEvents(noon(day)).map(item => item.event.id);
      expect(listed).not.toContain('kasama');
      expect(listed).not.toContain('fiesta-chonta');
    }
  });

  it('respeta la ventana de meses pedida', () => {
    expect(getUpcomingEvents(noon('2026-11-13'), { monthsAhead: 0 }).map(item => item.event.id)).toEqual(['artes-vivas-loja', 'mama-negra']);
    expect(getUpcomingEvents(noon('2026-07-10'), { monthsAhead: 1 })).toEqual([]);
    expect(getUpcomingEvents(noon('2026-07-10'), { monthsAhead: 2 }).map(item => [item.event.id, item.status])).toEqual([['mama-negra', 'orientative']]);
    expect(getUpcomingEvents(noon('2026-07-10'), { monthsAhead: 4 }).map(item => item.event.id)).toEqual(['mama-negra', 'rodeo-montuvio', 'artes-vivas-loja']);
  });

  it('usa el día calendario de Ecuador, no el de UTC', () => {
    // 31 de diciembre de 2026, 20:00 en Ecuador = 1 de enero de 2027 en UTC.
    const lateDecember = getUpcomingEvents(new Date('2027-01-01T01:00:00Z'), { monthsAhead: 0 });
    expect(lateDecember).toEqual([]);
    const january = getUpcomingEvents(new Date('2027-01-01T06:00:00Z'), { monthsAhead: 0 });
    expect(january.map(item => [item.event.id, item.year, item.month])).toEqual([['diablada-pillaro', 2027, 1]]);
  });
});

describe('eventStatusLabel', () => {
  const loja = () => byId('artes-vivas-loja');

  it('describe el festival de Loja antes, durante y después', () => {
    expect(eventStatusLabel(loja(), noon('2026-10-20'))).toBe(
      'Programada del 12 al 22 de noviembre de 2026, según la agenda oficial citada. Revalida la programación en la agenda oficial antes de ir.',
    );
    expect(eventStatusLabel(loja(), noon('2026-11-13'))).toMatch(/^En curso: del 12 al 22 de noviembre de 2026/);
    expect(eventStatusLabel(loja(), noon('2026-11-23'))).toBe('Edición 2026 finalizada el 22 de noviembre de 2026. La próxima fecha está por confirmar.');
    expect(eventStatusLabel(loja(), noon('2027-08-01'))).toMatch(/^Edición 2026 finalizada/);
    expect(eventStatusLabel(loja(), noon('2027-08-01'))).not.toMatch(/Programada|En curso|próximamente/i);
  });

  it('en las fechas orientativas dice que la edición no está confirmada, sea cual sea el día', () => {
    for (const day of ['2026-05-30', '2026-06-21', '2026-12-31']) {
      expect(eventStatusLabel(byId('inti-raymi'), noon(day))).toBe('Fecha orientativa: Junio; cada comunidad define sus días. Edición sin confirmar.');
    }
    expect(eventStatusLabel(byId('diablada-pillaro'), noon('2027-01-03'))).toBe('Fecha orientativa: 1–6 de enero. Edición sin confirmar.');
  });

  it('en las ceremonias comunitarias remite a la comunidad', () => {
    expect(eventStatusLabel(byId('kasama'), noon('2026-11-13'))).toBe(
      'Fecha definida por la comunidad. No hay fecha fija. Participación solo con invitación o autorización.',
    );
    expect(eventStatusLabel(byId('fiesta-chonta'), noon('2026-04-20'))).toBe(
      'Fecha definida por la comunidad. Referencia estacional: abril o mayo. Participación solo con invitación o autorización.',
    );
  });

  it('una edición sin fuente o sin confirmar no cuenta como fechada', () => {
    const base = byId('inti-raymi');
    const withoutSource = { ...base, editions: [{ ...base.editions[0], year: 2027, startDate: '2027-06-21', endDate: '2027-06-24', confirmation: 'confirmed_official' as const, sourceUrl: null }] };
    const unconfirmed = { ...base, editions: [{ ...base.editions[0], year: 2027, startDate: '2027-06-21', endDate: '2027-06-24', sourceUrl: LOJA_FESTIVAL_AGENDA_URL }] };
    for (const event of [withoutSource, unconfirmed]) {
      expect(eventStatusLabel(event, noon('2027-06-01'))).toMatch(/^Fecha orientativa/);
      expect(eventStatus(event, noon('2027-06-01')).upcoming).toBe(false);
    }
  });
});

describe('utilidades y compatibilidad', () => {
  it('formatea rangos de fechas en español', () => {
    expect(formatDateRange('2026-11-12', '2026-11-22')).toBe('del 12 al 22 de noviembre de 2026');
    expect(formatDateRange('2027-06-05', '2027-06-05')).toBe('el 5 de junio de 2027');
    expect(formatDateRange('2026-10-30', '2026-11-02')).toBe('del 30 de octubre al 2 de noviembre de 2026');
    expect(formatDateRange('2026-12-28', '2027-01-03')).toBe('del 28 de diciembre de 2026 al 3 de enero de 2027');
  });

  it('eventStatus solo marca «upcoming» una edición fechada que aún no empieza', () => {
    expect(eventStatus(byId('artes-vivas-loja'), noon('2026-11-01')).upcoming).toBe(true);
    expect(eventStatus(byId('artes-vivas-loja'), noon('2026-11-12')).upcoming).toBe(false);
    expect(eventStatus(byId('artes-vivas-loja'), noon('2026-12-01'))).toEqual({
      label: 'Edición 2026 finalizada el 22 de noviembre de 2026. La próxima fecha está por confirmar.',
      upcoming: false,
    });
    for (const event of CULTURAL_EVENTS.filter(item => item.id !== 'artes-vivas-loja')) {
      expect(eventStatus(event, noon('2026-01-01')).upcoming).toBe(false);
      expect(eventStatus(event, noon('2027-06-15')).upcoming).toBe(false);
    }
  });

  it('sin fecha de referencia no afirma si algo ya pasó o está por venir', () => {
    const status = eventStatus(byId('artes-vivas-loja'));
    expect(status.upcoming).toBe(false);
    expect(status.label).toMatch(/^Edición 2026 programada del 12 al 22 de noviembre de 2026/);
    expect(status.label).not.toMatch(/En curso|finalizada/);
    expect(eventStatus(byId('kasama')).label).toMatch(/^Fecha definida por la comunidad/);
  });

  it('filtra por región, mes y texto sin tildes', () => {
    expect(ids(filterCulturalEvents({ query: 'pillaro' }))).toEqual(['diablada-pillaro']);
    expect(ids(filterCulturalEvents({ query: 'tsachila', region: 'costa' }))).toEqual(['kasama']);
    expect(ids(filterCulturalEvents({ region: 'all', month: 10 }))).toEqual(['rodeo-montuvio']);
    expect(filterCulturalEvents()).toHaveLength(10);
  });
});
