/**
 * Página de muestra SOLO de desarrollo del Pasaporte Guambra (no se importa desde la app ni entra en el build).
 * Monta los componentes reales con datos de ejemplo de los seis estados, un «pegado» verificado SIMULADO
 * y un cromo especial con brillo, para revisar el diseño sin crear cuentas.
 *
 *   /src/features/passport/__fixtures__/pasaporte-estados.html            → hoja de estados
 *   …?libro=1[&pagina=sierra][&formato=phone|book][&pro=1][&vacio=1]     → el libro completo en su diálogo
 */
import { StrictMode, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../../index.css';
import '../../../components/chulla/regional-theme.css';
import '../../../styles/album/tokens.css';
import '../../../styles/album/platform.css';
import '../../../App.css';
import '../../../components/chulla/ui.css';
import '../../../components/chulla/responsive.css';
import '../../../components/chulla/andes-theme.css';
import '../../../components/chulla/finish-theme.css';
import '../../../components/chulla/polish.css';
import '../../../components/chulla/mobile-ios.css';
import './pasaporte-estados.css';
import { AppProvider } from '../../../context/AppContext';
import { Dialog } from '../../../components/chulla/Dialog';
import { ALBUM_EXPERIENCES, experienceByAlbumNumber } from '../../../domain/album';
import { addJournalEntry, emptyPassportBook, type PassportBookState } from '../../../domain/passport/book';
import type { PassportLayout } from '../../../domain/passport/pages';
import { passportSlots, type PassportSlot, type SlotSources } from '../../../domain/passport/slots';
import { collectStamps, passportAchievements, validateDemoReceipt, type Achievement, type DemoValidation } from '../../../domain/passport/stamps';
import { experienceVisual } from '../../catalog/experienceArt';
import { CromoFace, CromoSlot, SpecialCromo, useSlotLabel } from '../CromoSlot';
import { PassportExperience } from '../PassportExperience';
import '../passport-book.css';
import '../cromo-slot.css';

const params = new URLSearchParams(window.location.search);
const cromo = (number: number) => experienceByAlbumNumber(number)!;
const NOW = '2026-11-14T15:00:00.000Z';
const purchase = (number: number, code: string, status = 'test_approved') => ({ experienceId: cromo(number).id, title: cromo(number).title, code, kind: 'test_purchase', status, updatedAt: NOW });
/** Fuentes de ejemplo. Los sellos «verified_visit» son SIMULADOS: en la app solo llegan del servidor. */
const SAMPLE: SlotSources = params.has('vacio') ? {} : {
  serverStamps: [
    { id: 'demo-s1', experience_id: cromo(2).id, region_id: 'sierra', stamp_type: 'verified_visit', awarded_at: '2026-11-08T16:00:00Z' },
    { id: 'demo-s2', experience_id: cromo(6).id, region_id: 'sierra', stamp_type: 'verified_visit', awarded_at: '2026-10-21T16:00:00Z' },
    { id: 'demo-s3', experience_id: cromo(42).id, region_id: 'galapagos', stamp_type: 'verified_visit', awarded_at: '2026-09-02T16:00:00Z' },
  ],
  demoValidations: [{ code: 'PRB-ABC234', experienceId: cromo(15).id, title: cromo(15).title, region: 'costa', validatedAt: NOW, mode: 'demo' }],
  wallet: [purchase(4, 'PRB-K7Q2MX'), purchase(15, 'PRB-ABC234'), purchase(23, 'PRB-TR4NSF', 'test_transfer_review'), purchase(10, 'PRB-PRUEBA')],
  savedIds: [cromo(1).id, cromo(8).id, cromo(16).id, cromo(44).id, cromo(45).id, cromo(30).id],
  tripIds: [cromo(27).id],
  exploredIds: [3, 9, 12, 18, 25, 33, 37, 47, 50].map(number => cromo(number).id),
};
const FRESH = params.has('vacio') ? [] : [`${cromo(4).id}:purchased`, `${cromo(2).id}:verified_visit`, `${cromo(1).id}:planned`];
const visualOf = (id: string) => { const experience = ALBUM_EXPERIENCES.find(item => item.id === id); return experience ? experienceVisual(experience) : undefined; };

function sampleBook(): PassportBookState {
  if (params.has('vacio')) return emptyPassportBook();
  const first = addJournalEntry({ ...emptyPassportBook(), nickname: 'Nayra', origin: 'Cuenca' }, { title: 'Quilotoa al amanecer', text: 'Bajamos al cráter con frío y subimos con risas. La laguna cambia de color cada hora. Volver con los panas en carnaval.', destinationId: cromo(2).id }, new Date('2026-11-08T22:00:00Z'), 'nota-1');
  return addJournalEntry(first, { title: 'Encebollado en la playa', text: 'El mejor desayuno del viaje: limón, chifles y conversa con la señora del puesto.', destinationId: cromo(15).id }, new Date('2026-11-12T14:30:00Z'), 'nota-2');
}

/** Hoja con cada estado de casilla y cada acabado de cromo especial. */
function StatesSheet() {
  const label = useSlotLabel();
  const slots = useMemo(() => passportSlots(SAMPLE), []);
  const pick = (number: number) => slots.find(slot => slot.number === number)!;
  const examples: [string, PassportSlot, boolean?][] = [
    ['Hueco · te falta', pick(5)], ['Visto · ficha abierta', pick(3)], ['En mi sobre · guardado', pick(8)], ['Comprado · por vivir (prueba)', pick(4)],
    ['Comprado · transferencia en revisión', pick(23)], ['Pegado de demostración (DEMO, sin brillo)', pick(15)], ['Pegado · visita verificada SIMULADA', pick(2)],
    ['En mi sobre · cromo ilustrado', pick(45)], ['Golpe de sello (nuevo)', pick(4), true],
  ];
  const achievements: Achievement[] = [
    { id: 'huella-real', title: 'Huella real', description: '', basis: 'verified', earned: true, progress: 1, goal: 1 },
    { id: 'primera-idea', title: 'Primera idea', description: '', basis: 'activity', earned: true, progress: 1, goal: 1 },
    { id: 'ensayo-general', title: 'Ensayo general', description: '', basis: 'demo', earned: true, progress: 1, goal: 1 },
    { id: 'ecuador-completo', title: 'Ecuador completo', description: '', basis: 'verified', earned: false, progress: 2, goal: 4 },
  ];
  const [replay, setReplay] = useState(0);
  return <main className="fx-sheet" data-fixture="pasaporte">
    <header className="fx-head">
      <h1>Pasaporte Guambra · estados</h1>
      <p>Solo desarrollo. Componentes reales con datos de ejemplo; el «pegado» verificado es simulado.</p>
      <nav className="fx-links"><a href="?libro=1">Libro (computador)</a><a href="?libro=1&amp;formato=phone">Libro (celular)</a><a href="?libro=1&amp;pagina=sierra">Sierra</a><a href="?libro=1&amp;pro=1">Tapa PRO</a><button type="button" onClick={() => setReplay(value => value + 1)}>Repetir golpe de sello</button></nav>
    </header>
    <section className="pg-passport fx-panel" aria-labelledby="fx-casillas">
      <h2 id="fx-casillas">Casillas del álbum</h2>
      <ol className="fx-grid">{examples.map(([text, slot, fresh]) => {
        const visual = visualOf(slot.experienceId);
        return <li key={`${text}-${fresh ? replay : ''}`}>
          <CromoSlot slot={slot} visual={visual} fresh={fresh} date={slot.fecha ? new Intl.DateTimeFormat('es-EC', { day: 'numeric', month: 'short', timeZone: 'America/Guayaquil' }).format(new Date(slot.fecha)) : undefined}
            label={label(slot, visual, slot.fecha)} onOpen={id => console.info('abrir ficha', id)} />
          <span>{text}</span>
        </li>;
      })}</ol>
      <h2>Miniaturas de la leyenda</h2>
      <ol className="fx-minis">{(['album', 'visto', 'en_sobre', 'comprado', 'pegado_demo', 'pegado'] as const).map(estado => <li key={estado}><CromoFace mini slot={{ label: '02', estado, region: 'sierra', prueba: true }} visual={visualOf(cromo(2).id)} /><span>{estado}</span></li>)}</ol>
      <h2>Cromos especiales</h2>
      <ol className="fx-grid is-special">{achievements.map(item => <SpecialCromo key={item.id} item={item} />)}</ol>
    </section>
  </main>;
}

/** El libro completo dentro del diálogo real, con estado en memoria. */
function SampleBook() {
  const [open, setOpen] = useState(true);
  const [book, setBook] = useState(sampleBook);
  const [demo, setDemo] = useState<DemoValidation[]>(SAMPLE.demoValidations ? [...SAMPLE.demoValidations] : []);
  const sources = { ...SAMPLE, demoValidations: demo, exploredIds: [...(SAMPLE.exploredIds ?? []), ...book.exploredIds] };
  const slots = useMemo(() => passportSlots(sources), [demo, book.exploredIds]); // eslint-disable-line react-hooks/exhaustive-deps
  const achievements = useMemo(() => passportAchievements(collectStamps({ destinations: ALBUM_EXPERIENCES, ...sources })), [demo, book.exploredIds]); // eslint-disable-line react-hooks/exhaustive-deps
  const layout = params.get('formato') === 'phone' || params.get('formato') === 'book' ? params.get('formato') as PassportLayout : undefined;
  if (!open) return <main className="fx-sheet" data-fixture="pasaporte"><button type="button" className="pg-btn" onClick={() => setOpen(true)}>Abrir el pasaporte de muestra</button></main>;
  return <Dialog title="Pasaporte Guambra" onClose={() => setOpen(false)} wide>
    <PassportExperience slots={slots} achievements={achievements} book={book} account="connected" premium={params.has('pro')} fresh={FRESH}
      hasTestPurchases initialPage={params.get('pagina') ?? undefined} layout={layout}
      onBookChange={next => { setBook(next); return true; }} onOpenExperience={id => console.info('abrir ficha', id)}
      onValidateCode={code => {
        const result = validateDemoReceipt(code, SAMPLE.wallet ?? [], demo, id => ALBUM_EXPERIENCES.find(item => item.id === id)?.localizedRegion ?? null);
        if (result.ok) setDemo(result.list);
        return { result, saved: true };
      }}
      onDownload={() => true} onChoosePlans={() => console.info('planes')} />
  </Dialog>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><AppProvider>{params.has('libro') ? <SampleBook /> : <StatesSheet />}</AppProvider></StrictMode>);
