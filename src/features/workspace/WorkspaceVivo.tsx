import { lazy, Suspense, useEffect, useState } from 'react';
import { Compass, Store, Bell, CreditCard, Download, FilePenLine, Map, Mic, ShieldCheck, UserRound } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Dialog } from '../../components/chulla/Dialog';
import { CatalogDetail } from '../catalog/CatalogExplorer';
import { useCatalog } from '../catalog/CatalogContext';
import { useConsent } from '../privacy/ConsentContext';
import { PlannerDialog } from '../planner/PlannerDialog';
import { LegalCenter } from '../legal/LegalCenter';
import type { Experience } from '../../domain/catalog';
import './workspace.css';
import './vivo-shell.css';
import { ToolBoundary } from './ToolBoundary';
import { paymentReference } from '../payments/reference';

const AuthPanel = lazy(() => import('../auth/AuthPanel').then(module => ({ default: module.AuthPanel })));
const MijinAssistant = lazy(() => import('../assistant/MijinAssistant').then(module => ({ default: module.MijinAssistant })));
const DownloadsPanel = lazy(() => import('../offline/DownloadsPanel').then(module => ({ default: module.DownloadsPanel })));
const EditorialPanel = lazy(() => import('../cms/EditorialPanel').then(module => ({ default: module.EditorialPanel })));
const NotificationCenter = lazy(() => import('../notifications/NotificationCenter').then(module => ({ default: module.NotificationCenter })));
const HostHub = lazy(() => import('../host/HostHub').then(module => ({ default: module.HostHub })));
const WelcomeGate = lazy(() => import('../onboarding/WelcomeFlow').then(module => ({ default: module.WelcomeGate })));
const PaymentsPanel = lazy(() => import('../payments/PaymentsPanel').then(module => ({ default: module.PaymentsPanel })));
const signal = (name: string) => window.dispatchEvent(new Event(`cv3:${name}`));

function isAuthReturn() {
  const hash = new URLSearchParams(window.location.hash.slice(1));
  return window.location.hash === '#cuenta' || hash.has('access_token') || hash.has('error_description')
    || hash.get('type') === 'recovery' || new URLSearchParams(window.location.search).has('code');
}
export function V3Toolbar() {
  return <nav className="v3-toolbar vivo-toolbar" aria-label="Herramientas de CHULLA VIDA 3.0"><span>ECUADOR <strong>A TU RITMO</strong></span><button onClick={() => signal('mijin')}><Mic size={16} />Habla con MIJIN</button><button onClick={() => signal('plan')}><Map size={16} />Mi viaje</button><button onClick={() => signal('payments')}><CreditCard size={16} />Reservas y pagos</button><button onClick={() => signal('downloads')}><Download size={16} />Sin señal</button><button onClick={() => signal('alerts')}><Bell size={16} />Mis avisos</button><button onClick={() => signal('host')}><Store size={16} />Anfitriones</button><button onClick={() => signal('account')}><UserRound size={16} />Cuenta y negocio</button></nav>;
}
export function V3Workspace() {
  return <ToolBoundary><WorkspaceContent /></ToolBoundary>;
}
function WorkspaceContent() {
  const { places, setBookingPlace, setRole } = useApp();
  const { select, records } = useCatalog();
  const { open: openPrivacy } = useConsent();
  const [panel, setPanel] = useState(() => isAuthReturn() ? 'account' : paymentReference(window.location.search) ? 'payments' : '');
  const [inquiry, setInquiry] = useState<string>();
  const [library, setLibrary] = useState<{ experiences: Experience[]; downloadedAt?: string }>({ experiences: [] });
  const refreshLibrary = async () => {
    try { const module = await import('../offline/library'); setLibrary(await module.readOfflineLibrary()); window.dispatchEvent(new Event('cv3:library')); }
    catch { setLibrary({ experiences: [] }); }
  };
  useEffect(() => {
    void refreshLibrary();
    const openAccount = () => { if (isAuthReturn()) setPanel('account'); };
    window.addEventListener('hashchange', openAccount);
    const handlers = ['plan', 'downloads', 'account', 'legal', 'editorial', 'alerts', 'payments', 'host'].map(name => {
      const handle = () => { select(null); setPanel(name); if (name === 'account') setInquiry(undefined); };
      window.addEventListener(`cv3:${name}`, handle); return { name, handle };
    });
    return () => { handlers.forEach(({ name, handle }) => window.removeEventListener(`cv3:${name}`, handle)); window.removeEventListener('hashchange', openAccount); };
  }, []);
  const loading = <p className="vivo-panel-loading" role="status">Preparando tu espacio…</p>;
  return <>
    <CatalogDetail onDownload={async experience => { const module = await import('../offline/library'); await module.saveExperienceOffline(experience); await refreshLibrary(); }} onAsk={() => signal('mijin')} onInquiry={id => { setInquiry(id); setPanel('account'); }} />
    {panel === 'plan' && <PlannerDialog onClose={() => setPanel('')} onSelect={id => { setPanel(''); select(id); }} />}
    {panel === 'legal' && <LegalCenter onClose={() => setPanel('')} onPrivacy={openPrivacy} />}
    {panel === 'account' && <Dialog title="Tu cuenta en CHULLA VIDA" onClose={() => setPanel('')} wide><div className="dialog-content"><Suspense fallback={loading}><AuthPanel experienceId={inquiry} /></Suspense></div></Dialog>}
    {panel === 'editorial' && <Dialog title="Estudio de contenido" onClose={() => setPanel('')} wide><div className="dialog-content"><Suspense fallback={loading}><EditorialPanel onPublished={() => window.dispatchEvent(new Event('cv3:catalog-updated'))} /></Suspense></div></Dialog>}
    {panel === 'alerts' && <Dialog title="Tus avisos, a tu manera" onClose={() => setPanel('')} wide><div className="dialog-content"><Suspense fallback={loading}><NotificationCenter /></Suspense></div></Dialog>}
    {panel === 'host' && <Suspense fallback={loading}><HostHub onClose={() => setPanel('')} /></Suspense>}
    <Suspense fallback={null}><WelcomeGate /></Suspense>
    {panel === 'payments' && <Dialog title="Reservas y pagos" onClose={() => setPanel('')} wide><div className="dialog-content"><Suspense fallback={loading}><PaymentsPanel reference={paymentReference(window.location.search)} onAccount={() => { setInquiry(undefined); setPanel('account'); }} onDemo={() => { const place = places[0]; if (place) { setPanel(''); setRole('turista'); setBookingPlace(place); } }} /></Suspense></div></Dialog>}
    {panel === 'downloads' && <Suspense fallback={loading}><DownloadsPanel onClose={() => setPanel('')} onOpenExperience={id => { setPanel(''); select(id); }} onChanged={refreshLibrary} /></Suspense>}
    <Suspense fallback={null}><MijinAssistant publicExperiences={records} onOpenExperience={id => { setPanel(''); select(id); }} downloadedExperiences={library.experiences} downloadedAt={library.downloadedAt} onOpenPrivacy={openPrivacy} /></Suspense>
  </>;
}
export function V3Footer() {
  const { open } = useConsent();
  return <nav className="v3-footer vivo-footer" aria-label="Documentos y privacidad"><button onClick={() => signal('legal')}><ShieldCheck size={15} />Términos y privacidad</button><button onClick={open}>Privacidad y cookies</button><button onClick={() => signal('editorial')}><FilePenLine size={15} />Editar contenido</button><button onClick={() => signal('alerts')}><Bell size={15} />Preferencias de avisos</button><button onClick={() => signal('welcome')}><Compass size={15} />Volver a ver tutorial</button><span>Información de origen · Viajes con respeto · Ecuador, a tu ritmo.</span></nav>;
}
