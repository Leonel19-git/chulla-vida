import { useEffect, useMemo, useRef, useState, type UIEvent } from 'react';
import { BookOpen, Rows3 } from 'lucide-react';
import { ALBUM_EXPERIENCES } from '../../domain/album';
import type { PassportBookState } from '../../domain/passport/book';
import { PASSPORT_TABS, pageIndexForId, passportPages, type PassportLayout, type PassportPageDef } from '../../domain/passport/pages';
import { slotCounts, slotStampKey, slotsByRegion, type PassportSlot } from '../../domain/passport/slots';
import type { Achievement, DemoValidationResult } from '../../domain/passport/stamps';
import { experienceVisual, type ExperienceVisual } from '../catalog/experienceArt';
import { useT, useV3Language } from '../../i18n/v3';
import { PassportBook, type BookPage, type BookTab } from './PassportBook';
import { REGION_NAME, SECTION_FIELD, TAB_NAME, renderPassportPage, type AccountState, type JournalDraft, type PageContext } from './PassportPages';
import { ESTADO_TEXT } from './CromoSlot';
import { PASSPORT_PHONE_QUERY, REDUCED_MOTION_QUERY, foilShift, useMediaQuery } from './motion';
import './passport-book.css';
import './cromo-slot.css';

export interface PassportExperienceProps {
  slots: PassportSlot[];
  achievements: Achievement[];
  book: PassportBookState;
  account: AccountState;
  premium: boolean;
  /** Claves (`<id>:<fuente>`) de lo nuevo desde la última visita: reciben el golpe de sello. */
  fresh: readonly string[];
  hasTestPurchases: boolean;
  /** Guarda el libro; devuelve false si el navegador no lo permitió. */
  onBookChange: (next: PassportBookState) => boolean;
  onOpenExperience: (experienceId: string) => void;
  /** Valida el código de un comprobante de prueba (siempre demostración). `saved`: si quedó guardado en el navegador. */
  onValidateCode: (code: string) => { result: DemoValidationResult; saved: boolean };
  onDownload: () => boolean;
  onChoosePlans: () => void;
  onSignIn?: () => void;
  /** Página inicial (por defecto, la tapa cerrada). */
  initialPage?: string;
  /** Fuerza el formato; por defecto depende del ancho (900 px). */
  layout?: PassportLayout;
}

const LOCALE: Readonly<Record<string, string>> = { es: 'es-EC', en: 'en-US', fr: 'fr-FR', pt: 'pt-BR', zh: 'zh-CN', ki: 'es-EC', 'ki-amz': 'es-EC' };
const byId = new Map(ALBUM_EXPERIENCES.map(experience => [experience.id, experience]));
const visuals = new Map<string, ExperienceVisual>();
function visualFor(experienceId: string): ExperienceVisual | undefined {
  const cached = visuals.get(experienceId);
  if (cached) return cached;
  const experience = byId.get(experienceId);
  if (!experience) return undefined;
  const visual = experienceVisual(experience);
  visuals.set(experienceId, visual);
  return visual;
}
function pageLabel(def: PassportPageDef, t: (source: string, vars?: Record<string, string | number>) => string): string {
  if (def.region) return def.part ? t('{region} {first}–{last}', { region: t(REGION_NAME[def.region]), first: String(def.first).padStart(2, '0'), last: String(def.last).padStart(2, '0') }) : t(REGION_NAME[def.region]);
  return t(TAB_NAME[def.id] ?? def.id);
}

/**
 * Pasaporte Guambra como libro-álbum: tapa, carné, mapa, una página por región con los huecos 01–51,
 * cromos especiales, diario, pega con código y contratapa. Recibe datos ya calculados: así lo usa la app
 * (PassportView) y la página de muestra de desarrollo.
 */
export function PassportExperience(props: PassportExperienceProps) {
  const t = useT();
  const language = useV3Language();
  const phone = useMediaQuery(PASSPORT_PHONE_QUERY);
  const reduced = useMediaQuery(REDUCED_MOTION_QUERY);
  const layout: PassportLayout = props.layout ?? (phone ? 'phone' : 'book');
  const [reading, setReading] = useState(false);
  const [currentId, setCurrentId] = useState(props.initialPage ?? 'tapa');
  const [played, setPlayed] = useState<ReadonlySet<string>>(() => new Set());
  const [draft, setDraft] = useState<JournalDraft>({ title: '', text: '', place: '' });
  const [code, setCode] = useState('');
  const [codeStatus, setCodeStatus] = useState('');
  const [lastDemoId, setLastDemoId] = useState<string | null>(null);
  const [newsAnnouncement, setNewsAnnouncement] = useState('');

  const defs = useMemo(() => passportPages(reading ? 'book' : layout), [reading, layout]);
  const counts = useMemo(() => slotCounts(props.slots), [props.slots]);
  const regions = useMemo(() => slotsByRegion(props.slots), [props.slots]);
  const fresh = useMemo(() => new Set(props.fresh.filter(key => !played.has(key))), [props.fresh, played]);
  const index = pageIndexForId(defs, currentId);
  const dates = useMemo(() => {
    const locale = LOCALE[language] ?? 'es-EC';
    const short = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: 'America/Guayaquil' });
    const long = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Guayaquil' });
    const safe = (format: Intl.DateTimeFormat) => (iso: string) => { const date = new Date(iso); return Number.isFinite(date.getTime()) ? format.format(date) : ''; };
    return { short: safe(short), long: safe(long) };
  }, [language]);

  // El cromo nuevo más fuerte se anuncia una vez al abrir (además del golpe de sello al verlo).
  const firstNews = useRef(props.fresh);
  useEffect(() => {
    const keys = firstNews.current;
    if (!keys.length) return;
    const newest = props.slots.find(slot => { const key = slotStampKey(slot); return key !== null && keys.includes(key); });
    if (!newest) return;
    const timer = window.setTimeout(() => setNewsAnnouncement(t('¡Cromo nuevo! {label} · {title} · {state}', { label: newest.label, title: newest.title, state: t(ESTADO_TEXT[newest.estado]) })), 700);
    return () => window.clearTimeout(timer);
    // Solo al abrir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lastDemo = lastDemoId ? props.slots.find(slot => slot.experienceId === lastDemoId) ?? null : null;
  const go = (pageId: string) => { setReading(false); setCurrentId(pageId); };
  const validate = (value: string) => {
    const { result, saved } = props.onValidateCode(value);
    const messages: Record<DemoValidationResult['reason'], string> = {
      ok: t('¡Pegado de demostración! {titles}. No cuenta como visita.', { titles: result.ok ? result.added.map(item => item.title).join(', ') : '' }),
      format: t('El código tiene este formato: PRB-ABC123.'),
      not_found: t('No encontramos {code} en tu billetera.', { code: result.code }),
      rejected: t('Ese comprobante fue rechazado o cancelado.'),
      pending: t('Esa compra de prueba aún no está aprobada.'),
      duplicate: t('Ese código ya está pegado.'),
    };
    const message = messages[result.reason];
    setCodeStatus(result.ok && !saved ? `${message} ${t('No se pudo guardar: durará esta sesión.')}` : message);
    if (result.ok) { setCode(''); setLastDemoId(result.added[0]?.experienceId ?? null); }
  };
  const pageOfSlot = (slot: PassportSlot) => defs.find(def => def.first !== undefined && def.last !== undefined && slot.number >= def.first && slot.number <= def.last)?.id ?? 'tapa';

  const ctx: PageContext = {
    layout: reading ? 'book' : layout, slots: props.slots, counts, regions, achievements: props.achievements, book: props.book, account: props.account, premium: props.premium,
    fresh, newCount: props.fresh.length, hasTestPurchases: props.hasTestPurchases, draft, setDraft, code, setCode, codeStatus, lastDemo,
    visualFor, dateShort: dates.short, dateLong: dates.long, go, pageOfSlot,
    onOpen: props.onOpenExperience,
    onStuck: slot => { const key = slotStampKey(slot); if (key) setPlayed(previous => new Set(previous).add(key)); },
    onBookChange: props.onBookChange, onValidate: validate,
    onDownload: props.onDownload,
    onChoosePlans: props.onChoosePlans, onSignIn: props.onSignIn,
  };
  const pages: BookPage[] = defs.map((def, position) => ({ id: def.id, tab: def.tab, label: pageLabel(def, t), render: active => renderPassportPage(def, position, active, ctx) }));
  const tabs: BookTab[] = PASSPORT_TABS.map(id => ({ id, label: t(TAB_NAME[id] ?? id), ...(id in REGION_NAME ? { region: id as keyof typeof REGION_NAME } : { field: SECTION_FIELD[id] }) }));
  const toggle = <button type="button" className="pg-tool" aria-pressed={reading} onClick={() => setReading(value => !value)}>
    {reading ? <BookOpen size={18} strokeWidth={2.5} aria-hidden="true" /> : <Rows3 size={18} strokeWidth={2.5} aria-hidden="true" />}<span>{reading ? t('Ver como libro') : t('Vista de lectura')}</span>
  </button>;
  const scrollFoil = (event: UIEvent<HTMLDivElement>) => { if (!reduced) foilShift(event.currentTarget, event.currentTarget.scrollTop * 0.35); };

  return <div className={`pg-passport${props.premium ? ' is-pro' : ''}`} data-layout={reading ? 'reading' : layout} data-motion={reduced ? 'reduced' : 'full'}>
    {reading ? <div className="pg-ui is-reading">
      <div className="pg-topbar">{toggle}</div>
      <div className="pg-reading" onScroll={scrollFoil}>
        {pages.map(page => <div key={page.id} className="pg-reading-page">{page.render(true)}</div>)}
      </div>
    </div>
      : <PassportBook layout={layout} pages={pages} tabs={tabs} index={index} reduced={reduced} tools={toggle}
        label={t('Libro del pasaporte. Usa las flechas para pasar de página.')} onGo={target => setCurrentId(defs[Math.max(0, Math.min(defs.length - 1, target))]!.id)} />}
    <p className="pg-sr" aria-live="polite">{newsAnnouncement}</p>
  </div>;
}
