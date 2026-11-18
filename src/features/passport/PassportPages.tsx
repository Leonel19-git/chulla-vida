import { ECUADOR_OUTLINE } from './ecuador-outline';
import { useId, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { ArrowDownToLine, ChevronRight, Lock, PenLine, Plus, Stamp, Trash2, UserRound } from 'lucide-react';
import { CROMO_ESTADO_ORDEN, type CromoEstado } from '../../domain/album';
import type { RegionId } from '../../domain/catalog';
import { addJournalEntry, type PassportBookState } from '../../domain/passport/book';
import type { PassportLayout, PassportPageDef } from '../../domain/passport/pages';
import { slotCounts, slotStampKey, slotsInRange, type PassportSlot, type RegionSlots, type SlotCounts } from '../../domain/passport/slots';
import type { Achievement } from '../../domain/passport/stamps';
import type { ExperienceVisual } from '../catalog/experienceArt';
import { isIosDevice } from '../../components/common/download';
import { msg, useT } from '../../i18n/v3';
import { CromoFace, CromoSlot, ESTADO_TEXT, SpecialCromo, useSlotLabel } from './CromoSlot';

export type AccountState = 'none' | 'loading' | 'connected' | 'error';
export interface JournalDraft { title: string; text: string; place: string }

/** Todo lo que necesitan las páginas. Lo arma PassportExperience. */
export interface PageContext {
  layout: PassportLayout;
  slots: PassportSlot[];
  counts: SlotCounts;
  regions: RegionSlots[];
  achievements: Achievement[];
  book: PassportBookState;
  account: AccountState;
  premium: boolean;
  /** Claves con golpe de sello pendiente. */
  fresh: ReadonlySet<string>;
  /** Cromos nuevos al abrir (para la tapa). */
  newCount: number;
  hasTestPurchases: boolean;
  draft: JournalDraft;
  setDraft: (draft: JournalDraft) => void;
  code: string;
  setCode: (code: string) => void;
  codeStatus: string;
  lastDemo: PassportSlot | null;
  visualFor: (experienceId: string) => ExperienceVisual | undefined;
  dateShort: (iso: string) => string;
  dateLong: (iso: string) => string;
  go: (pageId: string) => void;
  pageOfSlot: (slot: PassportSlot) => string;
  onOpen: (experienceId: string) => void;
  onStuck: (slot: PassportSlot) => void;
  onBookChange: (next: PassportBookState) => boolean;
  onValidate: (code: string) => void;
  onDownload: () => boolean;
  onChoosePlans: () => void;
  onSignIn?: () => void;
}

export const REGION_NAME: Readonly<Record<RegionId, string>> = { sierra: msg('Sierra'), costa: msg('Costa'), amazonia: msg('Amazonía'), galapagos: msg('Galápagos') };
export const TAB_NAME: Readonly<Record<string, string>> = {
  tapa: msg('Tapa'), carne: msg('Carné'), ecuador: msg('Mapa'), especiales: msg('Especiales'), diario: msg('Diario'), codigo: msg('Código'), contratapa: msg('Contratapa'),
  ...REGION_NAME,
};
/** Tinta de cada sección (la pestaña y la cabecera de su página comparten color). */
export const SECTION_FIELD: Readonly<Record<string, string>> = { tapa: 'noche', carne: 'portada', ecuador: 'noche', especiales: 'fiesta', diario: 'papel', codigo: 'demo', contratapa: 'noche' };
const LEGEND: Readonly<Record<CromoEstado, [label: string, hint: string]>> = {
  album: [msg('Te falta'), msg('Hueco por llenar')],
  visto: [msg('Visto'), msg('Abriste su ficha')],
  en_sobre: [msg('En mi sobre'), msg('Lo guardaste')],
  comprado: [msg('Comprado'), msg('Falta vivirlo')],
  pegado_demo: [msg('Pegado demo'), msg('Ensayo: no cuenta')],
  pegado: [msg('Pegado'), msg('Lo viviste: verificado')],
};
const two = (value: number) => String(value).padStart(2, '0');
/** Nombre corto impreso bajo la casilla (como en un álbum): «Kicker Rock (León Dormido) y Tour 360°» → «Kicker Rock». */
export function shortPlaceName(title: string): string {
  const short = title.split(/\s*(?::|\(|·|–|—|\s-\s)\s*/)[0]?.trim();
  return short || title;
}

function PageShell({ id, title, field, region, aside, folio, foot, children, bodyClass = '', describedRange }: {
  id: string; title: string; field?: string; region?: RegionId; aside?: ReactNode; folio?: number | null; foot?: ReactNode; children: ReactNode; bodyClass?: string; describedRange?: string;
}) {
  const t = useT();
  const heading = useId();
  return <section className="pg-page" data-page={id} aria-labelledby={describedRange ? `${heading} ${describedRange}` : heading}>
    <header className="pg-head" data-field={field} data-region={region}><h3 id={heading}>{title}</h3>{aside}</header>
    <div className={`pg-body ${bodyClass}`.trim()}>{children}</div>
    <footer className="pg-foot">{foot ? <span className="pg-caption">{foot}</span> : <span />}{folio ? <span className="pg-folio">{t('N.º {n}', { n: two(folio) })}</span> : null}</footer>
  </section>;
}

// ── 0 · Tapa ─────────────────────────────────────────────────────────────────
function CoverPage({ ctx }: { ctx: PageContext }) {
  const t = useT();
  const heading = useId();
  const name = ctx.book.nickname.trim() || t('Viajero/a');
  return <section className={`pg-page pg-cover${ctx.premium ? ' is-pro pg-foil' : ''}`} data-page="tapa" aria-labelledby={heading}>
    <div className="pg-cover-inner" data-field="noche">
      <span className="pg-stitch" aria-hidden="true" />
      <span className="pg-ecuador-flag" role="img" aria-label={t('Bandera del Ecuador')}><img src="/brand/ecuador-flag.svg" alt="" width="900" height="600" /></span>
      <h3 id={heading} className="pg-cover-title">{t('Pasaporte Guambra')}</h3>
      <p className="pg-cover-sub">{t('Tu álbum del Ecuador')}</p>
      <span className="pg-stripes" aria-hidden="true" />
      <p className="pg-cover-name"><span className="pg-sr">{t('Pasaporte de')} </span>{name}</p>
      <div className="pg-cover-foot">
        <p className="pg-cover-count"><strong>{ctx.counts.pegado}</strong><span>/{ctx.counts.total}</span><small>{t('pegados')}</small></p>
        {ctx.newCount > 0 && <span className="pg-cover-new">{ctx.newCount === 1 ? t('1 cromo nuevo') : t('{n} cromos nuevos', { n: ctx.newCount })}</span>}
        <button type="button" className="pg-btn is-maiz" onClick={() => ctx.go('carne')}>{t('Abrir')}<ChevronRight size={20} strokeWidth={2.75} aria-hidden="true" /></button>
      </div>
      {ctx.premium && <span className="pg-pro" aria-label={t('Acabado PRO')}>PRO</span>}
    </div>
  </section>;
}

// ── 1 · Mi carné ─────────────────────────────────────────────────────────────
function CarnePage({ ctx, folio }: { ctx: PageContext; folio: number }) {
  const t = useT();
  const [status, setStatus] = useState('');
  const initial = ctx.book.nickname.trim().charAt(0).toUpperCase();
  const set = (patch: Partial<PassportBookState>) => { if (!ctx.onBookChange({ ...ctx.book, ...patch })) setStatus(t('No se pudo guardar en este navegador. Durará esta sesión.')); };
  const chips: [CromoEstado, number, string][] = [
    ['pegado', ctx.counts.pegado, t('Pegados')], ['pegado_demo', ctx.counts.pegado_demo, t('Demo')], ['comprado', ctx.counts.comprado, t('Comprados')],
    ['en_sobre', ctx.counts.en_sobre, t('En mi sobre')], ['visto', ctx.counts.visto, t('Vistos')], ['album', ctx.counts.album, t('Te faltan')],
  ];
  const account = {
    connected: t('Cuenta conectada: tus pegados vienen del servidor.'),
    loading: t('Revisando tu cuenta…'),
    error: t('No pudimos leer tus pegados. Revisa tu conexión.'),
    none: t('Sin cuenta: tus pegados verificados no aparecen.'),
  }[ctx.account];
  return <PageShell id="carne" field="portada" title={t('Mi carné')} folio={folio} bodyClass="is-carne">
    <div className="pg-carne-id">
      <span className="pg-carne-photo" aria-hidden="true">{initial || <UserRound size={34} strokeWidth={2} />}</span>
      <div className="pg-carne-fields">
        <label className="pg-field"><span>{t('Tu apodo')}</span><input className="pg-input" value={ctx.book.nickname} maxLength={64} placeholder={t('¿Cómo te dicen?')} autoComplete="nickname" onChange={event => set({ nickname: event.target.value })} /></label>
        <label className="pg-field"><span>{t('Sales desde')}</span><input className="pg-input" value={ctx.book.origin} maxLength={80} placeholder={t('Tu ciudad')} autoComplete="address-level2" onChange={event => set({ origin: event.target.value })} /></label>
      </div>
    </div>
    <ul className="pg-chips" aria-label={t('Tu colección')}>
      {chips.map(([estado, value, text]) => <li key={estado} className={`pg-chip is-${estado}`}><strong>{value}</strong><span>{text}</span></li>)}
    </ul>
    <p className={`pg-account is-${ctx.account}`}><span className="pg-account-dot" aria-hidden="true" /><span className="pg-account-text">{account}</span>
      {(ctx.account === 'none' || ctx.account === 'error') && ctx.onSignIn && <button type="button" className="pg-link" onClick={ctx.onSignIn}>{t('Entrar')}</button>}</p>
    {status && <p className="pg-status" role="status">{status}</p>}
  </PageShell>;
}

// ── 2 · Mi Ecuador ───────────────────────────────────────────────────────────
type Point = readonly [number, number];
const MAP_SHAPES: readonly { region: RegionId; polygons: readonly (readonly Point[])[]; circles?: readonly [number, number, number, number][] }[] = [
  { region: 'costa', polygons: [[[150, 20], [160, 21], [156, 60], [150, 100], [152, 140], [158, 180], [165, 215], [170, 246], [155, 232], [140, 214], [128, 198], [116, 190], [104, 170], [110, 148], [98, 128], [104, 104], [118, 86], [128, 62], [138, 40]]] },
  { region: 'sierra', polygons: [[[160, 21], [185, 28], [192, 30], [196, 70], [200, 110], [205, 150], [212, 190], [216, 221], [192, 238], [170, 246], [165, 215], [158, 180], [152, 140], [150, 100], [156, 60]]] },
  { region: 'amazonia', polygons: [[[192, 30], [215, 40], [250, 48], [285, 62], [300, 95], [288, 128], [270, 150], [262, 182], [238, 200], [216, 221], [212, 190], [205, 150], [200, 110], [196, 70]]] },
  { region: 'galapagos', polygons: [[[30, 112], [38, 108], [43, 118], [40, 132], [46, 146], [43, 160], [34, 166], [26, 158], [30, 146], [26, 134], [31, 124]]],
    circles: [[19, 128, 6, 6], [55, 118, 7, 5], [62, 138, 8, 7], [81, 142, 7, 4.5], [72, 160, 4.5, 3], [56, 158, 3.5, 3.5]] },
];
function shapeBounds(shape: (typeof MAP_SHAPES)[number]): [number, number] {
  const ys = [...shape.polygons.flat().map(point => point[1]), ...(shape.circles ?? []).flatMap(([, cy, , ry]) => [cy - ry, cy + ry])];
  return [Math.min(...ys), Math.max(...ys)];
}
function EcuadorMap({ regions }: { regions: RegionSlots[] }) {
  const t = useT();
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const draw = (shape: (typeof MAP_SHAPES)[number]) => <>
    {shape.polygons.map((points, index) => <polygon key={index} points={points.map(point => point.join(',')).join(' ')} />)}
    {shape.circles?.map(([cx, cy, rx, ry], index) => <ellipse key={`c${index}`} cx={cx} cy={cy} rx={rx} ry={ry} />)}
  </>;
  return <svg className="pg-map" viewBox="0 0 310 252" role="img" aria-label={t('Mapa esquemático: cada región se llena con lo que llevas y se pinta con lo que pegaste.')}>
    <defs><clipPath id={`${uid}-country`}><path d={ECUADOR_OUTLINE} /></clipPath></defs><path className="pg-country-base" d={ECUADOR_OUTLINE} /><rect className="pg-map-inset" x="7" y="96" width="88" height="84" rx="10" />
    {MAP_SHAPES.map(shape => {
      const summary = regions.find(region => region.region === shape.region);
      const total = summary?.counts.total || 1;
      const touched = summary ? (total - summary.counts.album) / total : 0;
      const stuck = summary ? summary.counts.pegado / total : 0;
      const [top, bottom] = shapeBounds(shape);
      const level = (fraction: number) => ({ x: 0, y: bottom - (bottom - top) * fraction, width: 310, height: (bottom - top) * fraction + 1 });
      return <g key={shape.region} data-region={shape.region} clipPath={shape.region === 'galapagos' ? undefined : `url(#${uid}-country)`}>
        <clipPath id={`${uid}-${shape.region}-t`}><rect {...level(touched)} /></clipPath>
        <clipPath id={`${uid}-${shape.region}-s`}><rect {...level(stuck)} /></clipPath>
        <g className="pg-map-base">{draw(shape)}</g>
        {touched > 0 && <g className="pg-map-touched" clipPath={`url(#${uid}-${shape.region}-t)`}>{draw(shape)}</g>}
        {stuck > 0 && <g className="pg-map-stuck" clipPath={`url(#${uid}-${shape.region}-s)`}>{draw(shape)}</g>}
        <g className="pg-map-line">{draw(shape)}</g>
      </g>;
    })}
    <path className="pg-country-border" d={ECUADOR_OUTLINE} /><text x="51" y="193" textAnchor="middle" className="pg-map-label">Galápagos</text>
  </svg>;
}
function EcuadorPage({ ctx, folio }: { ctx: PageContext; folio: number }) {
  const t = useT();
  const sampleSlot = ctx.slots.find(slot => ctx.visualFor(slot.experienceId)?.photo) ?? ctx.slots[0];
  const sample = sampleSlot ? ctx.visualFor(sampleSlot.experienceId) : undefined;
  return <PageShell id="ecuador" field="noche" title={t('Mi Ecuador')} folio={folio} bodyClass="is-ecuador">
    <div className="pg-ecuador">
      <EcuadorMap regions={ctx.regions} />
      <ul className="pg-bars">{ctx.regions.map(region => {
        const name = t(REGION_NAME[region.region]);
        const touched = region.counts.total - region.counts.album;
        return <li key={region.region} data-region={region.region}>
          <span className="pg-bar-name">{name}</span>
          <span className="pg-bar" role="img" aria-label={t('{region}: {stuck} pegados y {touched} en camino de {total}', { region: name, stuck: region.counts.pegado, touched: touched - region.counts.pegado, total: region.counts.total })}>
            <i className="is-touched" style={{ '--w': `${(touched / Math.max(1, region.counts.total)) * 100}%` } as CSSProperties} />
            <i className="is-stuck" style={{ '--w': `${(region.counts.pegado / Math.max(1, region.counts.total)) * 100}%` } as CSSProperties} />
          </span>
          <b className="pg-bar-count">{region.counts.pegado}/{region.counts.total}</b>
        </li>;
      })}</ul>
    </div>
    <h4 className="pg-legend-title">{t('Así se llena')}</h4>
    <ul className="pg-legend">{CROMO_ESTADO_ORDEN.map(estado => <li key={estado} data-estado={estado}>
      {sampleSlot && <CromoFace mini slot={{ label: sampleSlot.label, estado, region: sampleSlot.region, prueba: true }} visual={sample} />}
      <span><b>{t(LEGEND[estado][0])}</b><small>{t(LEGEND[estado][1])}</small></span>
    </li>)}</ul>
  </PageShell>;
}

// ── 3–6 · Regiones ───────────────────────────────────────────────────────────
function RegionPage({ ctx, def, folio, active }: { ctx: PageContext; def: PassportPageDef; folio: number; active: boolean }) {
  const t = useT();
  const rangeId = useId();
  const label = useSlotLabel();
  const [peek, setPeek] = useState<PassportSlot | null>(null);
  const region = def.region!;
  const slots = slotsInRange(ctx.slots, def.first ?? 0, def.last ?? 0);
  const counts = slotCounts(slots);
  const cols = ctx.layout === 'phone' ? 4 : 5;
  const rows = Math.max(1, Math.ceil(slots.length / cols));
  const dateFor = (slot: PassportSlot) => (slot.fecha && slot.estado === 'pegado' ? ctx.dateShort(slot.fecha) : undefined);
  const caption = peek ? `${peek.label} · ${peek.title} · ${t(ESTADO_TEXT[peek.estado])}`
    : counts.album ? t('Te faltan {n} de {total}', { n: counts.album, total: counts.total }) : t('¡Sin huecos en esta página!');
  return <PageShell id={def.id} region={region} title={t(REGION_NAME[region])} folio={folio} bodyClass="is-grid" describedRange={rangeId} foot={caption}
    aside={<div className="pg-head-meta"><span id={rangeId} className="pg-head-range">{two(def.first ?? 0)}–{two(def.last ?? 0)}</span>
      <span className="pg-head-count"><span><strong>{counts.pegado}</strong>/{counts.total}</span><small>{t('pegados')}</small></span></div>}>
    <div className="pg-grid">
      <ol data-cols={cols} style={{ '--cols': cols, '--rows': rows } as CSSProperties}>
        {slots.map(slot => {
          const visual = ctx.visualFor(slot.experienceId);
          const date = dateFor(slot);
          const key = slotStampKey(slot);
          return <li key={slot.experienceId}>
            <CromoSlot slot={slot} visual={visual} date={date} label={label(slot, visual, slot.fecha ? ctx.dateLong(slot.fecha) : undefined)}
              name={ctx.layout === 'book' ? shortPlaceName(slot.title) : undefined}
              fresh={active && key !== null && ctx.fresh.has(key)} onOpen={ctx.onOpen} onPeek={setPeek} onStuck={ctx.onStuck} />
          </li>;
        })}
      </ol>
    </div>
  </PageShell>;
}

// ── 7 · Cromos especiales ────────────────────────────────────────────────────
function SpecialsPage({ ctx, folio }: { ctx: PageContext; folio: number }) {
  const t = useT();
  const earned = ctx.achievements.filter(item => item.earned).length;
  const rows = Math.max(1, Math.ceil(ctx.achievements.length / 3));
  return <PageShell id="especiales" field="fiesta" title={t('Cromos especiales')} folio={folio} bodyClass="is-grid"
    aside={<div className="pg-head-meta"><span className="pg-head-count"><span><strong>{earned}</strong>/{ctx.achievements.length}</span><small>{t('logrados')}</small></span></div>}
    foot={t('El brillo es solo para lo verificado.')}>
    <div className="pg-grid is-special"><ol style={{ '--cols': 3, '--rows': rows } as CSSProperties}>
      {ctx.achievements.map(item => <SpecialCromo key={item.id} item={item} />)}
    </ol></div>
  </PageShell>;
}

// ── 8 · Diario ───────────────────────────────────────────────────────────────
function JournalPage({ ctx, folio }: { ctx: PageContext; folio: number }) {
  const t = useT();
  const [writing, setWriting] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const { draft, setDraft, book } = ctx;
  const open = writing || book.journal.length === 0;
  const placeName = (id: string | null) => { const slot = id ? ctx.slots.find(item => item.experienceId === id) : undefined; return slot ? `${slot.label} · ${slot.title}` : null; };
  const save = (event: FormEvent) => {
    event.preventDefault();
    const next = addJournalEntry(book, { title: draft.title, text: draft.text, destinationId: draft.place });
    if (next === book) { setStatus(t('Escribe un título y tu historia.')); return; }
    setStatus(ctx.onBookChange(next) ? t('Nota pegada en tu diario.') : t('No se pudo guardar en este navegador. Durará esta sesión.'));
    setDraft({ title: '', text: '', place: '' }); setWriting(false);
  };
  const remove = (id: string) => {
    setStatus(ctx.onBookChange({ ...book, journal: book.journal.filter(entry => entry.id !== id) }) ? t('Nota borrada de este navegador.') : t('No se pudo guardar en este navegador. Durará esta sesión.'));
    setConfirm(null);
  };
  return <PageShell id="diario" field="papel" title={t('Mi diario')} folio={folio} bodyClass="is-journal"
    aside={<span className="pg-head-lock"><Lock size={15} strokeWidth={2.5} aria-hidden="true" />{t('Privado')}</span>}>
    <p className="pg-line">{t('Vive solo en este navegador. Nadie más lo ve.')}</p>
    {open ? <form className="pg-journal-form" onSubmit={save}>
      <label className="pg-field"><span>{t('Título')}</span><input className="pg-input" value={draft.title} required maxLength={100} placeholder={t('Un momento para recordar')} onChange={event => setDraft({ ...draft, title: event.target.value })} /></label>
      <label className="pg-field"><span>{t('Lugar (opcional)')}</span><select className="pg-input" value={draft.place} onChange={event => setDraft({ ...draft, place: event.target.value })}>
        <option value="">{t('Sin lugar')}</option>
        {ctx.slots.map(slot => <option key={slot.experienceId} value={slot.experienceId}>{slot.label} · {slot.title}</option>)}
      </select></label>
      <label className="pg-field"><span>{t('Tu historia')}</span><textarea className="pg-input" value={draft.text} rows={4} required maxLength={5000} placeholder={t('¿Qué te dejó este viaje?')} onChange={event => setDraft({ ...draft, text: event.target.value })} /></label>
      <div className="pg-form-row"><span className="pg-counter-mini">{draft.text.length}/5000</span>
        {book.journal.length > 0 && <button type="button" className="pg-btn is-secondary is-small" onClick={() => setWriting(false)}>{t('Cancelar')}</button>}
        <button type="submit" className="pg-btn is-small"><PenLine size={17} strokeWidth={2.5} aria-hidden="true" />{t('Pegar nota')}</button></div>
    </form> : <button type="button" className="pg-btn is-secondary" onClick={() => setWriting(true)}><Plus size={18} strokeWidth={2.75} aria-hidden="true" />{t('Nueva nota')}</button>}
    {status && <p className="pg-status" role="status">{status}</p>}
    {book.journal.length > 0 && <ul className="pg-notes" aria-label={t('Tus notas')}>
      {book.journal.map((entry, index) => {
        const place = placeName(entry.destinationId);
        const long = entry.text.length > 180;
        return <li key={entry.id} className="pg-note" style={{ '--tilt': `${index % 2 ? 0.8 : -0.9}deg` } as CSSProperties}>
          <span className="pg-tape" aria-hidden="true" />
          <p className="pg-note-date">{ctx.dateLong(entry.createdAt)}</p>
          <h4>{entry.title}</h4>
          {place && <p className="pg-note-place">{place}</p>}
          <p className={`pg-note-text${long && expanded !== entry.id ? ' is-clamped' : ''}`}>{entry.text}</p>
          <div className="pg-note-actions">
            {long && <button type="button" className="pg-link" aria-expanded={expanded === entry.id} onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}>{expanded === entry.id ? t('Ver menos') : t('Leer todo')}</button>}
            {confirm === entry.id ? <span className="pg-confirm" role="group" aria-label={t('¿Borrar esta nota?')}><span>{t('¿Borrar esta nota?')}</span>
              <button type="button" className="pg-btn is-danger is-small" onClick={() => remove(entry.id)}>{t('Sí, borrar')}</button>
              <button type="button" className="pg-btn is-secondary is-small" onClick={() => setConfirm(null)}>{t('No')}</button></span>
              : <button type="button" className="pg-link is-quiet" aria-label={t('Borrar nota {title}', { title: entry.title })} onClick={() => setConfirm(entry.id)}><Trash2 size={16} strokeWidth={2.25} aria-hidden="true" />{t('Borrar')}</button>}
          </div>
        </li>;
      })}
    </ul>}
  </PageShell>;
}

// ── 9 · Pega con código ──────────────────────────────────────────────────────
function CodePage({ ctx, folio, active }: { ctx: PageContext; folio: number; active: boolean }) {
  const t = useT();
  const last = ctx.lastDemo;
  const lastKey = last ? slotStampKey(last) : null;
  const submit = (event: FormEvent) => { event.preventDefault(); ctx.onValidate(ctx.code); };
  return <PageShell id="codigo" field="demo" title={t('Pega con código')} folio={folio} bodyClass="is-code"
    aside={<span className="pg-rubber is-demo is-head" aria-hidden="true"><b>{t('Demo')}</b></span>}>
    <p className="pg-line">{t('Usa el código de tu compra de prueba. No cuenta como visita.')}</p>
    <div className={`pg-code-slot${active && lastKey && ctx.fresh.has(lastKey) ? ' is-fresh' : ''}`} onAnimationEnd={() => { if (last) ctx.onStuck(last); }}>
      {last ? <CromoFace slot={last} visual={ctx.visualFor(last.experienceId)} />
        : <span className="pg-cromo is-album is-blank" aria-hidden="true"><span className="pg-cromo-window"><span className="pg-cromo-hole"><Stamp size={30} strokeWidth={2} /><span className="pg-cromo-hint">{t('Pega aquí')}</span></span></span></span>}
    </div>
    <form className="pg-code-form" onSubmit={submit}>
      <label className="pg-field"><span>{t('Código del comprobante')}</span><input className="pg-input is-code" value={ctx.code} maxLength={12} autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="PRB-ABC123" onChange={event => ctx.setCode(event.target.value.toUpperCase())} /></label>
      <button type="submit" className="pg-btn" disabled={!ctx.code.trim()}><Stamp size={18} strokeWidth={2.5} aria-hidden="true" />{t('Pegar demo')}</button>
    </form>
    <p className="pg-status" role="status">{ctx.codeStatus}</p>
    {!ctx.hasTestPurchases && <p className="pg-line is-muted">{t('Aún no tienes compras de prueba.')}</p>}
    {last && <button type="button" className="pg-link" onClick={() => ctx.go(ctx.pageOfSlot(last))}>{t('Ver en su página')}<ChevronRight size={17} strokeWidth={2.75} aria-hidden="true" /></button>}
  </PageShell>;
}

// ── 10 · Contratapa ──────────────────────────────────────────────────────────
function BackCoverPage({ ctx }: { ctx: PageContext }) {
  const t = useT();
  const heading = useId();
  const [status, setStatus] = useState('');
  const download = () => setStatus(ctx.onDownload()
    ? `${t('Listo: se descargó. Se abre sin internet.')}${isIosDevice() ? ` ${t('En iPhone: toca Compartir y «Guardar en Archivos».')}` : ''}`
    : t('Tu navegador no permitió la descarga.'));
  return <section className="pg-page pg-endpaper" data-page="contratapa" aria-labelledby={heading}>
    <div className="pg-endpaper-inner" data-field="noche">
      <span className="pg-stripes is-top" aria-hidden="true" />
      <span className="pg-sticker is-small"><img src="/brand/isotipo-160.webp" srcSet="/brand/isotipo-160.webp 160w, /brand/isotipo-512.webp 512w" sizes="96px" width="160" height="160" alt="" decoding="async" draggable={false} /></span>
      <h3 id={heading}>{t('Llévalo contigo')}</h3>
      <button type="button" className="pg-btn is-maiz" onClick={download}><ArrowDownToLine size={19} strokeWidth={2.5} aria-hidden="true" />{t('Descargar mi pasaporte')}</button>
      <p className="pg-status is-on-dark" role="status">{status}</p>
      <p className="pg-endpaper-line"><Lock size={16} strokeWidth={2.5} aria-hidden="true" />{t('Tu diario vive solo en este navegador.')}</p>
      {ctx.premium ? <p className="pg-endpaper-pro"><span className="pg-pro-chip pg-foil" aria-hidden="true" />{t('Acabado PRO activo')}</p>
        : <button type="button" className="pg-link is-on-dark" onClick={ctx.onChoosePlans}>{t('Acabado PRO con brillo')}<ChevronRight size={17} strokeWidth={2.75} aria-hidden="true" /></button>}
      <p className="pg-endpaper-brand">CHULLA VIDA · ECUADOR 2026</p>
    </div>
  </section>;
}

/** Contenido de cada página del libro. `active`: a la vista (las copias de la hoja que gira van inertes). */
export function renderPassportPage(def: PassportPageDef, folio: number, active: boolean, ctx: PageContext): ReactNode {
  if (def.id === 'tapa') return <CoverPage ctx={ctx} />;
  if (def.id === 'carne') return <CarnePage ctx={ctx} folio={folio} />;
  if (def.id === 'ecuador') return <EcuadorPage ctx={ctx} folio={folio} />;
  if (def.region) return <RegionPage ctx={ctx} def={def} folio={folio} active={active} />;
  if (def.id === 'especiales') return <SpecialsPage ctx={ctx} folio={folio} />;
  if (def.id === 'diario') return <JournalPage ctx={ctx} folio={folio} />;
  if (def.id === 'codigo') return <CodePage ctx={ctx} folio={folio} active={active} />;
  return <BackCoverPage ctx={ctx} />;
}
