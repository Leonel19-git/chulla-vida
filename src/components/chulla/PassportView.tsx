import { useEffect, useMemo, useState } from 'react';
import { useApp, CURRENT_TRAVELER_EMAIL } from '../../context/AppContext';
import { useMembership } from '../../context/MembershipContext';
import { collectVerifiedStamps } from '../../lib/membership';
import { Dialog } from './Dialog';
import { useCatalog } from '../../features/catalog/CatalogContext';
import { REGION_LABELS, type RegionId } from '../../domain/catalog';
import { ALBUM_EXPERIENCES } from '../../domain/album';
import { markExplored, passportExportHtml, readPassportBook, savePassportBook, type PassportBookState } from '../../domain/passport/book';
import { passportSlots } from '../../domain/passport/slots';
import { collectStamps, freshStampKeys, passportAchievements, readDemoValidations, readSeenStamps, saveDemoValidations, saveSeenStamps, validateDemoReceipt, type DemoValidation, type ServerStampRow } from '../../domain/passport/stamps';
import { isJourney, JOURNEY_KEY } from '../../domain/itinerary';
import { useWallet } from '../../features/wallet/store';
import { getSupabase } from '../../lib/supabase';
import { loadVerifiedStamps } from '../../features/traveler/profile';
import { PassportExperience } from '../../features/passport/PassportExperience';
import type { AccountState } from '../../features/passport/PassportPages';
import { saveFile } from '../common/download';
import { useT } from '../../i18n/v3';

const REGION_IDS = Object.keys(REGION_LABELS) as RegionId[];
const regionByLabel = (label: string): RegionId | null => REGION_IDS.find(id => REGION_LABELS[id] === label) ?? null;
function readTripStops(): string[] {
  try { const value: unknown = JSON.parse(localStorage.getItem(JOURNEY_KEY) || 'null'); return isJourney(value) ? value.stops : []; } catch { return []; }
}

/**
 * Pasaporte Guambra, tu álbum. Reúne las fuentes honestas de cada cromo y abre el libro dentro del diálogo:
 * - sellos `verified_visit` del servidor (passport_stamps del usuario) → «Pegado», único con brillo;
 * - códigos de comprobantes de prueba validados en la demostración → «Pegado de demostración»;
 * - compras de prueba de la billetera → «Comprado · por vivir · de prueba»;
 * - guardados y paradas de Mi viaje → «En mi sobre»; fichas abiertas → «Visto».
 * El diario, el apodo y la ciudad viven solo en este navegador.
 */
export function PassportView({ onClose, onChoosePlans }: { onClose: () => void; onChoosePlans: () => void }) {
  const t = useT();
  const { places, reservations } = useApp();
  const { records, saved, select } = useCatalog();
  const { hasAccess } = useMembership();
  const premium = hasAccess('premium-passport');
  const wallet = useWallet();
  const [book, setBook] = useState<PassportBookState>(readPassportBook);
  const [tripIds] = useState(readTripStops);
  const [demoValidations, setDemoValidations] = useState<DemoValidation[]>(readDemoValidations);
  const [serverStamps, setServerStamps] = useState<ServerStampRow[]>([]);
  const [account, setAccount] = useState<AccountState>(() => (getSupabase() ? 'loading' : 'none'));
  // Lo que ya se vio al abrir: lo nuevo desde entonces recibe el «golpe de sello» durante esta visita.
  const [seenAtOpen] = useState(readSeenStamps);

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

  // Llegadas validadas por el anfitrión del prototipo: siempre demostración, nunca visita verificada.
  const prototypeDemo = useMemo<DemoValidation[]>(() => collectVerifiedStamps(reservations, places, CURRENT_TRAVELER_EMAIL)
    .map(stamp => ({ code: 'PROTOTIPO', experienceId: stamp.placeId, title: stamp.title, region: regionByLabel(stamp.region), validatedAt: stamp.date, mode: 'demo' as const })), [reservations, places]);
  const walletInput = useMemo(() => wallet.map(record => ({ experienceId: record.experienceId, title: record.title, code: record.code, kind: record.kind, status: record.status, updatedAt: record.updatedAt })), [wallet]);
  const allDemo = useMemo(() => [...demoValidations, ...prototypeDemo], [demoValidations, prototypeDemo]);
  const slots = useMemo(() => passportSlots({ serverStamps, demoValidations: allDemo, wallet: walletInput, savedIds: saved, tripIds, exploredIds: book.exploredIds }),
    [serverStamps, allDemo, walletInput, saved, tripIds, book.exploredIds]);
  // El universo del pasaporte son los 51 cromos del álbum (aunque sin señal el catálogo descargado tenga menos fichas).
  const stamps = useMemo(() => collectStamps({ destinations: ALBUM_EXPERIENCES, serverStamps, demoValidations: allDemo, wallet: walletInput, savedIds: saved, tripIds, exploredIds: book.exploredIds }),
    [serverStamps, allDemo, walletInput, saved, tripIds, book.exploredIds]);
  const achievements = useMemo(() => passportAchievements(stamps), [stamps]);
  const fresh = useMemo(() => freshStampKeys(stamps, seenAtOpen), [stamps, seenAtOpen]);
  useEffect(() => { if (fresh.length) saveSeenStamps([...readSeenStamps(), ...fresh]); }, [fresh]);

  const commit = (next: PassportBookState) => { setBook(next); return savePassportBook(next); };
  // Abrir una ficha desde el pasaporte la marca como «Visto» (nunca más que eso) y la muestra.
  const openExperience = (id: string) => {
    const next = markExplored(book, id, records.map(record => record.id));
    if (next !== book) commit(next);
    onClose(); select(id);
  };
  const regionOf = (experienceId: string) => ALBUM_EXPERIENCES.find(record => record.id === experienceId)?.localizedRegion ?? null;
  const validateCode = (code: string) => {
    const result = validateDemoReceipt(code, walletInput, demoValidations, regionOf);
    if (!result.ok) return { result, saved: true };
    setDemoValidations(result.list);
    return { result, saved: saveDemoValidations(result.list) };
  };
  const download = () => saveFile(passportExportHtml(book, ALBUM_EXPERIENCES.map(record => ({ id: record.id, title: record.title, region: REGION_LABELS[record.localizedRegion] })), saved, new Date(),
    slots.map(slot => ({ label: slot.label, title: slot.title, region: REGION_LABELS[slot.region], regionId: slot.region, estado: slot.estado, fecha: slot.fecha ?? null, prueba: slot.prueba }))),
  'mi-pasaporte-guambra.html', 'text/html;charset=utf-8');

  return <Dialog title={t('Pasaporte Guambra')} onClose={onClose} wide>
    <PassportExperience slots={slots} achievements={achievements} book={book} account={account} premium={premium} fresh={fresh}
      hasTestPurchases={wallet.some(record => record.kind === 'test_purchase')} onBookChange={commit} onOpenExperience={openExperience}
      onValidateCode={validateCode} onDownload={download} onChoosePlans={onChoosePlans}
      onSignIn={() => { onClose(); window.dispatchEvent(new Event('cv3:account')); }} />
  </Dialog>;
}
