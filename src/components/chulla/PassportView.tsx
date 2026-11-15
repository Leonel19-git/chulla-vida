import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode, type TouchEvent } from 'react';
import { ArrowDownToLine, ArrowRight, Award, BookOpen, Check, ChevronLeft, ChevronRight, Compass, Crown, Fish, Heart, Leaf, Lock, Mountain, PenLine, Plus, QrCode, ShieldCheck, ShoppingBag, Stamp, Trash2, Waves } from 'lucide-react';
import { useApp, CURRENT_TRAVELER_EMAIL } from '../../context/AppContext';
import { useMembership } from '../../context/MembershipContext';
import { collectVerifiedStamps } from '../../lib/membership';
import { membershipLocale } from '../../i18n/premium';
import { regionalSceneSvg } from '../../lib/offline-route';
import { Dialog } from './Dialog';
import { useCatalog } from '../../features/catalog/CatalogContext';
import { REGION_LABELS, type Experience, type RegionId } from '../../domain/catalog';
import { PASSPORT_PAGES, addJournalEntry, nextPassportPage, passportExportHtml, passportProgress, readPassportBook, savePassportBook, toggleVirtualExploration, type PassportBookState } from '../../domain/passport/book';
import { STAMP_META, collectStamps, freshStampKeys, passportAchievements, readDemoValidations, readSeenStamps, regionProgress, saveDemoValidations, saveSeenStamps, validateDemoReceipt, verifiedVisitCount, type CollectedStamp, type DemoValidation, type ServerStampRow, type StampSource } from '../../domain/passport/stamps';
import { isJourney, JOURNEY_KEY } from '../../domain/itinerary';
import { useWallet } from '../../features/wallet/store';
import { getSupabase } from '../../lib/supabase';
import { loadVerifiedStamps } from '../../features/traveler/profile';
import '../../features/passport/passport-book.css';

const regionDetails = {
  sierra: { icon: Mountain, phrase: 'Entre montañas, empieza otra historia.', invitation: 'Haz espacio para escuchar a quienes viven aquí.', challenge: 'Pregunta antes de fotografiar a una persona o una ceremonia.' },
  costa: { icon: Waves, phrase: 'El camino también tiene ritmo de mar.', invitation: 'Conoce las historias detrás de cada sabor y cada oficio.', challenge: 'Lleva tus residuos contigo y respeta los espacios de trabajo locales.' },
  amazonia: { icon: Leaf, phrase: 'Baja el ritmo. El bosque tiene mucho que contar.', invitation: 'Recorre con guías autorizados y consentimiento de la comunidad.', challenge: 'Observa la fauna a distancia: no alimentes ni manipules animales.' },
  galapagos: { icon: Fish, phrase: 'Islas distintas. Una huella más ligera.', invitation: 'Confirma las reglas de acceso con la autoridad y el operador.', challenge: 'Permanece en senderos autorizados y respeta la distancia a la fauna.' },
};
const regionIds = Object.keys(regionDetails) as RegionId[];
const regionByLabel = (label: string): RegionId | null => regionIds.find(id => REGION_LABELS[id] === label) ?? null;
function readTripStops(): string[] {
  try { const value: unknown = JSON.parse(localStorage.getItem(JOURNEY_KEY) || 'null'); return isJourney(value) ? value.stops : []; } catch { return []; }
}
const SOURCE_ICON: Record<StampSource, typeof Stamp> = { verified_visit: ShieldCheck, demo_validated: QrCode, purchased: ShoppingBag, planned: Heart, explored: Compass };
function reducedMotion() { return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }

export function PassportView({ onClose, onChoosePlans }: { onClose: () => void; onChoosePlans: () => void }) {
  const { places, reservations, language, setActiveTab } = useApp();
  const { records, saved, toggle, select, online } = useCatalog();
  const { hasAccess } = useMembership();
  const premium = hasAccess('premium-passport');
  const [book, setBook] = useState(readPassportBook);
  const [page, setPage] = useState(0);
  const [linear, setLinear] = useState(reducedMotion);
  const [turn, setTurn] = useState<'next' | 'previous' | null>(null);
  const wallet = useWallet();
  const [tripIds] = useState(readTripStops);
  const [demoValidations, setDemoValidations] = useState<DemoValidation[]>(readDemoValidations);
  const [serverStamps, setServerStamps] = useState<ServerStampRow[]>([]);
  const [account, setAccount] = useState<'none' | 'loading' | 'connected' | 'error'>(() => getSupabase() ? 'loading' : 'none');
  const [receiptCode, setReceiptCode] = useState('');
  // Sellos vistos al abrir: lo nuevo desde entonces recibe el «golpe de sello» durante esta visita.
  const [seenAtOpen] = useState(readSeenStamps);
  const [notice, setNotice] = useState('');
  const [journalTitle, setJournalTitle] = useState('');
  const [journalText, setJournalText] = useState('');
  const [journalDestination, setJournalDestination] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const validatedDemo = useMemo(() => collectVerifiedStamps(reservations, places, CURRENT_TRAVELER_EMAIL), [reservations, places]);
  const availableIds = records.map(record => record.id);
  const progress = passportProgress(book, saved, availableIds, validatedDemo.map(stamp => stamp.placeId));
  const regionOf = (experienceId: string) => records.find(record => record.id === experienceId)?.localizedRegion ?? null;
  // Llegadas validadas por el anfitrión del prototipo: siempre demostración, nunca visita verificada.
  const prototypeDemo = useMemo<DemoValidation[]>(() => validatedDemo.map(stamp => ({ code: 'PROTOTIPO', experienceId: stamp.placeId, title: stamp.title, region: regionByLabel(stamp.region), validatedAt: stamp.date, mode: 'demo' as const })), [validatedDemo]);
  const walletInput = useMemo(() => wallet.map(record => ({ experienceId: record.experienceId, title: record.title, code: record.code, kind: record.kind, status: record.status, updatedAt: record.updatedAt })), [wallet]);
  const stamps = useMemo(() => collectStamps({ destinations: records, serverStamps, demoValidations: [...demoValidations, ...prototypeDemo], wallet: walletInput, savedIds: saved, tripIds, exploredIds: book.exploredIds }),
    [records, serverStamps, demoValidations, prototypeDemo, walletInput, saved, tripIds, book.exploredIds]);
  const verifiedVisits = verifiedVisitCount(stamps);
  const byRegion = regionProgress(stamps, records);
  const achievements = passportAchievements(stamps);
  const count = (source: StampSource) => stamps.filter(stamp => stamp.source === source).length;
  useEffect(() => {
    const client = getSupabase();
    if (!client) return;
    let active = true;
    client.auth.getSession().then(async ({ data }) => {
      const userId = data.session?.user.id;
      if (!userId) { if (active) setAccount('none'); return; }
      const rows = await loadVerifiedStamps(client, userId);
      if (active) { setServerStamps(rows); setAccount('connected'); }
    }).catch(() => { if (active) setAccount('error'); });
    return () => { active = false; };
  }, []);
  const fresh = useMemo(() => freshStampKeys(stamps, seenAtOpen), [stamps, seenAtOpen]);
  const newestStamp = stamps.find(stamp => fresh.includes(stamp.key) && stamp.source !== 'planned');
  useEffect(() => { if (fresh.length) saveSeenStamps([...readSeenStamps(), ...fresh]); }, [fresh]);
  const formatDate = (value: string) => new Intl.DateTimeFormat(membershipLocale[language], { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Guayaquil' }).format(new Date(value));
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => { if (media.matches) setLinear(true); };
    media.addEventListener('change', update);
    return () => { media.removeEventListener('change', update); };
  }, []);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const commit = (next: PassportBookState, message?: string) => {
    setBook(next);
    if (!savePassportBook(next)) setNotice('No se pudo guardar en este navegador. Tu cambio estará disponible solo durante esta sesión.');
    else if (message) setNotice(message);
  };
  const go = (target: number) => {
    const next = Math.min(PASSPORT_PAGES.length - 1, Math.max(0, target));
    if (next === page || turn) return;
    if (!linear && !reducedMotion()) {
      setTurn(next > page ? 'next' : 'previous');
      timer.current = setTimeout(() => { setTurn(null); timer.current = null; }, 620);
    }
    setPage(next);
  };
  const openExperience = (id: string) => { onClose(); select(id); };
  const markExplored = (id: string) => commit(toggleVirtualExploration(book, id, availableIds), 'Exploración virtual actualizada. No acredita una visita al lugar.');
  const download = () => {
    const html = passportExportHtml(book, records.map(record => ({ id: record.id, title: record.title, region: REGION_LABELS[record.localizedRegion] })), saved);
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'mi-pasaporte-guambra.html'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice('Pasaporte descargado con tu diario. El archivo es privado y se puede leer sin internet; cuídalo en dispositivos compartidos.');
  };
  const addMemory = (event: FormEvent) => {
    event.preventDefault();
    const next = addJournalEntry(book, { title: journalTitle, text: journalText, destinationId: journalDestination });
    if (next === book) { setNotice('Escribe un título y una historia antes de guardar.'); return; }
    commit(next, 'Historia guardada en el diario de este navegador.'); setJournalTitle(''); setJournalText(''); setJournalDestination('');
  };
  const validateReceipt = (event: FormEvent) => {
    event.preventDefault();
    const result = validateDemoReceipt(receiptCode, walletInput, demoValidations, regionOf);
    if (!result.ok) { setNotice(result.message); return; }
    setDemoValidations(result.list); setReceiptCode('');
    setNotice(saveDemoValidations(result.list) ? result.message : `${result.message} El navegador no permitió guardarlo: durará esta sesión.`);
  };
  const stampCard = (stamp: CollectedStamp) => {
    const Icon = SOURCE_ICON[stamp.source];
    const isFresh = fresh.includes(stamp.key) && stamp.source !== 'explored';
    return <li key={stamp.key} className={`pg-stamp pg-stamp-${stamp.source}${isFresh ? ' pg-stamp-new' : ''}`}>
      <span className="pg-stamp-ink" aria-hidden="true"><Icon size={26} /></span>
      <strong>{stamp.title}</strong>
      <span className="pg-stamp-label">{STAMP_META[stamp.source].label}</span>
      {stamp.date && <small>{formatDate(stamp.date)}</small>}
      {stamp.source === 'demo_validated' && <small className="pg-stamp-demo">Demostración · no acredita visita</small>}
    </li>;
  };
  const touchEnd = (event: TouchEvent<HTMLElement>) => {
    if (!touch.current || linear) return;
    const dx = event.changedTouches[0].clientX - touch.current.x;
    const dy = event.changedTouches[0].clientY - touch.current.y;
    touch.current = null;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.4) go(nextPassportPage(page, dx < 0 ? 1 : -1));
  };

  const cover = <div className="pg-cover-spread"><div className="pg-cover"><div className="pg-cover-stitch" /><img src="/chulla-vida-logo.png" alt="CHULLA VIDA" width="120" height="120" /><h3>Pasaporte<br /><strong>Guambra</strong></h3><p>Colecciona historias,<br />no solo sellos.</p><div className="pg-cover-regions" aria-hidden="true"><Mountain /><Waves /><Leaf /><Fish /></div><span>{book.nickname || 'Tu nombre, tu próxima historia'}</span><small>ECUADOR · {premium ? 'EDICIÓN PREMIUM DEMO' : 'EDICIÓN VIAJERA'}</small></div><div className="pg-cover-note"><Compass size={36} /><h3>El país se abre<br />cuando tú te mueves.</h3><p>Guarda ideas, descubre sus historias y escribe las tuyas. Cada página tiene un camino distinto.</p><button className="button button-primary" onClick={() => go(1)}>Abrir mi pasaporte<ArrowRight size={17} /></button><p className="pg-note">Personal y local. Tus notas no se publican ni se sincronizan con una cuenta.</p></div></div>;
  const profile = <><Page title="Este viaje lleva tu nombre" number="02"><div className="pg-profile-seal"><Compass size={36} /><span>ECUADOR</span></div><label>¿Cómo te llamas?<input value={book.nickname} maxLength={64} placeholder="Tu nombre o apodo" onChange={event => commit({ ...book, nickname: event.target.value })} /></label><label>Tu punto de partida<input value={book.origin} maxLength={80} placeholder="Ciudad o comunidad" onChange={event => commit({ ...book, origin: event.target.value })} /></label><dl className="pg-progress"><div><dt>Ideas planeadas</dt><dd>{progress.planned}</dd></div><div><dt>Exploradas virtualmente</dt><dd>{progress.explored}</dd></div><div><dt>Compradas · por visitar</dt><dd>{count('purchased')}</dd></div><div><dt>Validadas en demostración</dt><dd>{count('demo_validated')}</dd></div><div className="pg-progress-verified"><dt>Visitas reales verificadas</dt><dd>{verifiedVisits}</dd></div></dl><p className="pg-note">{account === 'connected' ? 'Tus visitas verificadas llegan de tu cuenta: solo el servidor o el anfitrión pueden emitirlas.' : account === 'error' ? 'No pudimos leer tus sellos verificados ahora. Revisa tu conexión.' : 'Entra a tu cuenta para ver tus visitas verificadas.'} Guardar, comprar o explorar una ficha no certifica una visita.</p>{account !== 'connected' && account !== 'loading' && <button type="button" className="text-button" onClick={() => { onClose(); window.dispatchEvent(new Event('cv3:account')); }}>Entrar / Crear cuenta<ArrowRight size={16} /></button>}</Page><Page title="Cuatro regiones. Tu propia colección." number="03"><EcuadorMap /><p className="pg-note">Ilustración esquemática, sin GPS ni rutas por carretera.</p><div className="pg-map-links">{regionIds.map((id, index) => { const Icon = regionDetails[id].icon; return <button key={id} className={`pg-${id}`} onClick={() => go(index + 2)}><Icon size={18} />{REGION_LABELS[id]}<ArrowRight size={16} /></button>; })}</div></Page></>;
  const regionSpread = (id: RegionId) => {
    const details = regionDetails[id]; const Icon = details.icon;
    const destinations = records.filter(record => record.localizedRegion === id);
    const explored = destinations.filter(record => book.exploredIds.includes(record.id));
    const planned = destinations.filter(record => saved.includes(record.id));
    const regionStamps = stamps.filter(stamp => stamp.region === id);
    const regionCount = byRegion.find(item => item.region === id);
    return <><Page title={REGION_LABELS[id]} number={String(regionIds.indexOf(id) * 2 + 4).padStart(2, '0')} className={`pg-region-page pg-${id}`}><svg className="pg-regional-scene" viewBox="0 0 680 285" aria-label={`Ilustración de ${REGION_LABELS[id]}`} role="img"><g dangerouslySetInnerHTML={{ __html: regionalSceneSvg(REGION_LABELS[id]) }} /></svg><Icon className="pg-region-icon" size={34} /><h4 className="pg-region-phrase">{details.phrase}</h4><p>{details.invitation}</p><div className="pg-region-progress"><span><Heart size={15} />{planned.length} planeadas</span><span><Compass size={15} />{explored.length} virtuales</span></div><progress max={Math.max(1, destinations.length)} value={explored.length} aria-label={`Exploración virtual de ${REGION_LABELS[id]}`} /><p className="pg-note">{explored.length} de {destinations.length} fichas disponibles en este contexto.</p><div className="pg-respect"><Leaf size={19} /><div><strong>Una buena huella</strong><p>{details.challenge}</p></div></div><button className="text-button" onClick={() => { onClose(); setActiveTab('raymis'); }}>Conocer Cultura Viva<ArrowRight size={16} /></button></Page><Page title="Lugares por vivir" number={String(regionIds.indexOf(id) * 2 + 5).padStart(2, '0')} className={`pg-${id}`}><p className="pg-note">Marca una ficha como explorada virtualmente o guárdala en tu viaje.</p><div className="pg-destinations">{destinations.slice(0, 3).map(record => <Destination key={record.id} record={record} saved={saved.includes(record.id)} explored={book.exploredIds.includes(record.id)} onOpen={() => openExperience(record.id)} onSave={() => toggle(record.id)} onExplore={() => markExplored(record.id)} />)}{destinations.length > 3 && <details><summary>{destinations.length - 3} ideas más de {REGION_LABELS[id]}</summary>{destinations.slice(3).map(record => <Destination key={record.id} record={record} saved={saved.includes(record.id)} explored={book.exploredIds.includes(record.id)} onOpen={() => openExperience(record.id)} onSave={() => toggle(record.id)} onExplore={() => markExplored(record.id)} />)}</details>}{!destinations.length && <p>{online ? 'No hay fichas disponibles en esta región.' : 'Descarga fichas de esta región mientras tengas internet para consultarlas aquí.'}</p>}</div><h4 className="pg-stamps-title"><Stamp size={18} />Sellos de {REGION_LABELS[id]}</h4>{regionStamps.length ? <ul className="pg-stamps" aria-label={`Sellos de ${REGION_LABELS[id]}`}>{regionStamps.slice(0, 9).map(stampCard)}</ul> : <p className="pg-stamps-empty">Esta página espera su primer sello. Guarda, compra o explora una ficha de {REGION_LABELS[id]} para empezar.</p>}{regionStamps.length > 9 && <details><summary>{regionStamps.length - 9} sellos más</summary><ul className="pg-stamps">{regionStamps.slice(9).map(stampCard)}</ul></details>}{regionCount && <p className="pg-note">{regionCount.verified} verificadas · {regionCount.demo} demo · {regionCount.purchased} por visitar · {regionCount.planned} planeadas · {regionCount.explored} virtuales</p>}</Page></>;
  };
  const journal = <><Page title="Las historias que te llevas" number="12"><PenLine size={36} className="pg-page-symbol" /><p>Algo que aprendiste. Un sabor. Un encuentro. Este espacio es tuyo.</p><form className="pg-journal-form" onSubmit={addMemory}><label>Título<input value={journalTitle} required maxLength={100} placeholder="Una historia para recordar" onChange={event => setJournalTitle(event.target.value)} /></label><label>Destino, si quieres<select value={journalDestination} onChange={event => setJournalDestination(event.target.value)}><option value="">Sin destino asociado</option>{records.map(record => <option value={record.id} key={record.id}>{record.title}</option>)}</select></label><label>Tu historia<textarea value={journalText} rows={6} required maxLength={5000} placeholder="¿Qué te dejó este viaje?" onChange={event => setJournalText(event.target.value)} /></label><span className="pg-note">{journalText.length}/5000 caracteres</span><button type="submit" className="button button-primary"><Plus size={17} />Guardar historia</button></form><p className="pg-note">Se guarda en este navegador, sin sincronización ni cifrado. Evita datos sensibles en dispositivos compartidos. Puedes exportar y borrar tus entradas.</p></Page><Page title="Mi diario" number="13"><div className="pg-journal-entries">{book.journal.length ? book.journal.map(entry => <article key={entry.id}><p className="pg-entry-date">{formatDate(entry.createdAt)}</p><h4>{entry.title}</h4>{entry.destinationId && <span className="pg-note">{records.find(record => record.id === entry.destinationId)?.title || 'Destino guardado'}</span>}<p className="pg-journal-text">{entry.text}</p>{deleteId === entry.id ? <div className="pg-delete"><span>¿Borrar esta historia de este navegador?</span><button onClick={() => { commit({ ...book, journal: book.journal.filter(item => item.id !== entry.id) }, 'Historia borrada del diario local.'); setDeleteId(null); }}>Sí, borrar</button><button onClick={() => setDeleteId(null)}>Conservar</button></div> : <button className="text-button" onClick={() => setDeleteId(entry.id)} aria-label={`Borrar historia ${entry.title}`}><Trash2 size={15} />Borrar historia</button>}</article>) : <div className="pg-journal-empty"><PenLine size={38} /><h4>La primera página espera por ti.</h4><p>No necesitas ir lejos para encontrar algo que merezca recordarse.</p></div>}</div></Page></>;
  const back = <><Page title="Cada historia deja una huella" number="14"><BookOpen size={36} className="pg-page-symbol" /><p>Lo planeado no es lo visitado. Una ficha explorada no es una visita verificada. Tu colección distingue cada etapa.</p><ul className="pg-meaning"><li><Heart size={19} /><span><strong>Planeado</strong>Guardado como idea en tu viaje.</span></li><li><Compass size={19} /><span><strong>Explorado virtualmente</strong>Lo marcaste de forma explícita al conocer la ficha.</span></li><li><ShoppingBag size={19} /><span><strong>{STAMP_META.purchased.label}</strong>{STAMP_META.purchased.description}</span></li><li><QrCode size={19} /><span><strong>{STAMP_META.demo_validated.label}</strong>{STAMP_META.demo_validated.description}</span></li><li><ShieldCheck size={19} /><span><strong>{STAMP_META.verified_visit.label}</strong>{STAMP_META.verified_visit.description}</span></li></ul><button className="button button-primary" onClick={download}><ArrowDownToLine size={18} />Descargar mi pasaporte</button></Page><Page title="Tu próxima historia" number="15"><div className="pg-back-emblem"><Mountain /><Waves /><Leaf /><Fish /></div><h4 className="pg-region-phrase">Viajar también<br />es cuidar.</h4><p>Respeta los ritmos locales, pide permiso para compartir recuerdos y confirma condiciones antes de salir.</p><button className="button button-secondary" onClick={() => { onClose(); window.dispatchEvent(new Event('cv3:plan')); }}>Preparar otro viaje<ArrowRight size={17} /></button><section className="pg-achievements" aria-labelledby="pg-achievements-title"><h4 id="pg-achievements-title"><Award size={18} />Logros</h4><ul>{achievements.map(item => <li key={item.id} className={`${item.earned ? 'is-earned' : ''} pg-basis-${item.basis}`}><span aria-hidden="true">{item.earned ? <Award size={18} /> : <Lock size={16} />}</span><div><strong>{item.title}</strong><small>{item.description}</small></div><em>{item.earned ? 'Logrado' : `${item.progress}/${item.goal}`}</em></li>)}</ul></section><form className="pg-test-stamp" onSubmit={validateReceipt}><h4><QrCode size={18} />Anfitrión de demostración</h4><p className="pg-note">Escribe el código del comprobante de prueba (está bajo el QR, por ejemplo PRB-ABC123). Simula que el anfitrión lo escanea al llegar: el sello queda como demostración, nunca como visita verificada.</p><label>Código del comprobante<input value={receiptCode} maxLength={12} autoComplete="off" spellCheck={false} placeholder="PRB-ABC123" onChange={event => setReceiptCode(event.target.value.toUpperCase())} /></label><button type="submit" className="button button-secondary" disabled={!receiptCode.trim()}><Stamp size={17} />Validar en demostración</button>{!wallet.some(record => record.kind === 'test_purchase') && <p className="pg-note">Aún no tienes compras de prueba en tu billetera. Haz una desde una ficha para obtener tu código.</p>}</form></Page></>;
  const renderPage = (index: number): ReactNode => index === 0 ? cover : index === 1 ? profile : index >= 2 && index <= 5 ? regionSpread(regionIds[index - 2]) : index === 6 ? journal : back;
  return <Dialog title="Pasaporte Guambra" onClose={onClose} wide><div className={`pg-passport ${premium ? 'pg-premium' : ''} ${linear ? 'pg-linear' : ''}`}><div className="pg-toolbar"><p>Colecciona historias, no solo sellos.</p><button className="text-button" onClick={() => { setLinear(!linear); setTurn(null); if (timer.current) clearTimeout(timer.current); }}><BookOpen size={17} />{linear ? 'Ver como libro' : 'Vista de lectura'}</button><button className="text-button" onClick={download}><ArrowDownToLine size={17} />Descargar</button></div><nav className="pg-tabs" aria-label="Páginas del pasaporte">{PASSPORT_PAGES.map((item, index) => <button key={item.id} onClick={() => go(index)} aria-current={!linear && page === index ? 'page' : undefined}>{item.label}</button>)}</nav>{linear ? <div className="pg-linear-pages">{PASSPORT_PAGES.map((item, index) => <section key={item.id} aria-label={item.label} className={`pg-spread ${index === 0 ? 'pg-spread-cover' : ''}`}>{renderPage(index)}</section>)}</div> : <><section className={`pg-book ${page === 0 ? 'pg-closed' : ''}`} tabIndex={0} aria-label={`Libro interactivo: ${PASSPORT_PAGES[page].label}. Usa flechas izquierda y derecha para cambiar página.`} onKeyDown={event => { if ((event.target as HTMLElement).closest('input,textarea,select,[contenteditable=true]')) return; if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); go(nextPassportPage(page, event.key === 'ArrowRight' ? 1 : -1)); } }} onTouchStart={event => { if ((event.target as HTMLElement).closest('input,textarea,select,button,a')) return; touch.current = { x: event.touches[0].clientX, y: event.touches[0].clientY }; }} onTouchEnd={touchEnd}><div className="pg-book-spine" aria-hidden="true">CHULLA VIDA</div><div className={`pg-spread ${page === 0 ? 'pg-spread-cover' : ''}`} key={page}>{renderPage(page)}</div>{turn && <div className={`pg-turn-sheet pg-turn-${turn}`} aria-hidden="true"><div><Compass size={56} /><span>CHULLA VIDA</span><small>Una historia más</small></div></div>}</section><div className="pg-pagination"><button className="button button-secondary" disabled={page === 0 || Boolean(turn)} onClick={() => go(nextPassportPage(page, -1))}><ChevronLeft size={18} /><span>Anterior</span></button><p aria-live="polite">{PASSPORT_PAGES[page].label}<small>{page + 1} de {PASSPORT_PAGES.length} · desliza o usa las flechas</small></p><button className="button button-primary" disabled={page === PASSPORT_PAGES.length - 1 || Boolean(turn)} onClick={() => go(nextPassportPage(page, 1))}><span>Siguiente</span><ChevronRight size={18} /></button></div></>}<p className="pg-storage-notice" role="status">{notice || (newestStamp ? `¡Nuevo sello en tu pasaporte! ${newestStamp.title} · ${STAMP_META[newestStamp.source].label}.` : '')}</p><p className="pg-honesty">Solo los sellos «Visita verificada» acreditan una visita: los emite el servidor cuando el anfitrión la valida. Los sellos demo, planeados, comprados o virtuales viven en este dispositivo. {verifiedVisits > 0 ? `Tienes ${verifiedVisits} ${verifiedVisits === 1 ? 'visita verificada' : 'visitas verificadas'}.` : ''}</p>{!premium && <div className="pg-upgrade"><Crown size={22} /><p>El acabado premium pertenece a la membresía anual de demostración. Tu diario y pasaporte básico siguen siendo gratuitos.</p><button className="text-button" onClick={onChoosePlans}>Ver planes<ArrowRight size={16} /></button></div>}{premium && <p className="pg-premium-label"><Crown size={16} />Acabado premium · membresía anual demo</p>}</div></Dialog>;
}

function Page({ title, number, children, className = '' }: { title: string; number: string; children: ReactNode; className?: string }) {
  return <section className={`pg-page ${className}`}><h3>{title}</h3>{children}<span className="pg-page-number" aria-hidden="true">{number} · CHULLA VIDA</span></section>;
}
function Destination({ record, saved, explored, onOpen, onSave, onExplore }: { record: Experience; saved: boolean; explored: boolean; onOpen: () => void; onSave: () => void; onExplore: () => void }) {
  return <article className="pg-destination"><button className="pg-destination-title" onClick={onOpen}>{record.title}<ArrowRight size={16} /></button><span>{record.province} · {record.duration.label}</span><div><button aria-pressed={saved} onClick={onSave} aria-label={`${saved ? 'Quitar de planeados' : 'Planear'} ${record.title}`}><Heart size={15} fill={saved ? 'currentColor' : 'none'} />{saved ? 'Planeado' : 'Planear'}</button><button aria-pressed={explored} onClick={onExplore} aria-label={`${explored ? 'Quitar exploración virtual de' : 'Marcar explorado virtualmente'} ${record.title}`}>{explored ? <Check size={15} /> : <Compass size={15} />}{explored ? 'Virtual explorado' : 'Explorar virtual'}</button></div></article>;
}
function EcuadorMap() {
  return <svg className="pg-ecuador-map" viewBox="0 0 320 285" role="img" aria-label="Ilustración esquemática de las cuatro regiones de Ecuador"><path className="pg-map-mainland" d="m144 19 35 11 12 27 31 13 18 31-10 32-21 18-3 34-31 15-20 32-21 5-20-26-18-11 5-36-15-31 7-29 18-23 1-31Z" /><path className="pg-map-costa" d="m144 19-1 31-18 23-7 29 15 31-5 36 18 11 10-29-8-39 12-31-5-34Z" /><path className="pg-map-sierra" d="m144 19 11 28 5 34-12 31 8 39-10 29 20 26 9-30 2-39 12-37-12-35-8-25Z" /><path className="pg-map-amazonia" d="m169 40 8 25 12 35-12 37-2 39-9 30 10-6 31-15 3-34 21-18 10-32-18-31-31-13Z" /><g className="pg-map-islands"><ellipse cx="48" cy="194" rx="14" ry="7" transform="rotate(-32 48 194)" /><ellipse cx="75" cy="217" rx="10" ry="7" /><ellipse cx="32" cy="227" rx="6" ry="10" /><circle cx="73" cy="184" r="5" /></g><g className="pg-map-labels"><text x="86" y="118">Costa</text><text x="132" y="94" transform="rotate(-69 132 94)">Sierra</text><text x="190" y="119">Amazonía</text><text x="16" y="259">Galápagos</text></g><path d="M91 207h18" stroke="#c6b894" strokeDasharray="3 5" /><circle cx="158" cy="65" r="4" fill="#103452" /></svg>;
}
