import { lazy, Suspense, useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Compass, Store, Bell, BookOpen, CircleHelp, CreditCard, Download, FilePenLine, FileText, Image as ImageIcon, Map, Mic, MoreHorizontal, PlayCircle, ShieldCheck, UserRound, Wallet } from 'lucide-react';
import { REGION_LABELS, type RegionId } from '../../domain/catalog';
import { SocialButtons } from '../../components/chulla/SocialButtons';
import { optionalLazy } from './optionalModule';
import { useApp } from '../../context/AppContext';
import { Dialog } from '../../components/chulla/Dialog';
import { CatalogDetail } from '../catalog/CatalogExplorer';
import { useCatalog } from '../catalog/CatalogContext';
import { useConsent } from '../privacy/ConsentContext';
import type { Experience } from '../../domain/catalog';
import './workspace.css';
import './vivo-shell.css';
import './ecuador-vivo.css';
import { ToolBoundary } from './ToolBoundary';
import { paymentReference } from '../payments/reference';

const PlannerDialog = lazy(() => import('../planner/PlannerDialog').then(module => ({ default: module.PlannerDialog })));
const LegalCenter = lazy(() => import('../legal/LegalCenter').then(module => ({ default: module.LegalCenter })));
const AuthPanel = lazy(() => import('../auth/AuthPanel').then(module => ({ default: module.AuthPanel })));
const MijinAssistant = lazy(() => import('../assistant/MijinAssistant').then(module => ({ default: module.MijinAssistant })));
const DownloadsPanel = lazy(() => import('../offline/DownloadsPanel').then(module => ({ default: module.DownloadsPanel })));
const EditorialPanel = lazy(() => import('../cms/EditorialPanel').then(module => ({ default: module.EditorialPanel })));
const NotificationCenter = lazy(() => import('../notifications/NotificationCenter').then(module => ({ default: module.NotificationCenter })));
const HostHub = lazy(() => import('../host/HostHub').then(module => ({ default: module.HostHub })));
const WelcomeGate = lazy(() => import('../onboarding/WelcomeFlow').then(module => ({ default: module.WelcomeGate })));
const PaymentsPanel = lazy(() => import('../payments/PaymentsPanel').then(module => ({ default: module.PaymentsPanel })));
const signal = (name: string) => window.dispatchEvent(new Event(`cv3:${name}`));
export const LEGAL_PDF_NOTICE = '/legal/aviso-proteccion-datos-chulla-vida.pdf';
export const LEGAL_PDF_RIGHTS = '/legal/formulario-derechos-datos-chulla-vida.pdf';

/* Paneles que entregan otros frentes. Si el archivo aún no existe, el build sigue y se ve un respaldo honesto. */
function WalletFallback({ onClose }: { onClose: () => void }) {
  return <Dialog title="Mi billetera" onClose={onClose}><div className="dialog-content cv-fallback-panel"><Wallet size={30} /><p>Tu billetera reunirá tus compras de prueba, comprobantes y lo que gastas en «Mi viaje». Todavía se está preparando en esta versión.</p><p>Mientras tanto, tus solicitudes y pagos de prueba están en «Reservas y pagos».</p><button className="button button-primary" onClick={() => { onClose(); signal('payments'); }}>Abrir Reservas y pagos</button></div></Dialog>;
}
function RightsFallback({ onClose }: { onClose: () => void }) {
  return <Dialog title="Ejercer mis derechos de datos" onClose={onClose}><div className="dialog-content cv-fallback-panel"><ShieldCheck size={30} /><p>Puedes pedir acceso, rectificación, eliminación, oposición o portabilidad de tus datos personales, según la LOPDP. Descarga el formulario, complétalo y envíalo al canal de contacto indicado en el aviso.</p><a className="button button-secondary" href={LEGAL_PDF_NOTICE} download><FileText size={17} />Descargar aviso de protección de datos</a><a className="button button-primary" href={LEGAL_PDF_RIGHTS} download><Download size={17} />Descargar formulario de derechos</a></div></Dialog>;
}
const WalletPanel = optionalLazy<{ onClose: () => void; onOpenExperience?: (id: string) => void }>(import.meta.glob('../wallet/WalletPanel.tsx'), 'WalletPanel', WalletFallback);
const RightsRequestForm = optionalLazy<{ onClose: () => void }>(import.meta.glob('../privacy-rights/RightsRequestForm.tsx'), 'RightsRequestForm', RightsFallback);

function isAuthReturn() {
  const hash = new URLSearchParams(window.location.hash.slice(1));
  return window.location.hash === '#cuenta' || hash.has('access_token') || hash.has('error_description')
    || hash.get('type') === 'recovery' || new URLSearchParams(window.location.search).has('code');
}
const MORE_TOOLS = [
  { name: 'downloads', label: 'Sin señal', hint: 'Fichas para leer sin internet', icon: Download },
  { name: 'alerts', label: 'Mis avisos', hint: 'Elige qué te llega y cuándo', icon: Bell },
  { name: 'host', label: 'Anfitriones', hint: 'Publica tu experiencia', icon: Store },
  { name: 'account', label: 'Cuenta y negocio', hint: 'Entra o crea tu cuenta', icon: UserRound },
] as const;

/** Barra de herramientas: lo más usado a la vista y el resto en «Más». En móvil, iconos con etiqueta corta. */
export function V3Toolbar() {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    wrapRef.current?.querySelector<HTMLButtonElement>('[role="menu"] button')?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); buttonRef.current?.focus(); } };
    const onPointer = (event: PointerEvent) => { if (!wrapRef.current?.contains(event.target as Node)) setOpen(false); };
    window.addEventListener('keydown', onKey); document.addEventListener('pointerdown', onPointer);
    return () => { window.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onPointer); };
  }, [open]);
  const onMenuKey = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const items = [...(event.currentTarget.querySelectorAll<HTMLButtonElement>('button'))];
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (current + (event.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length;
    items[next]?.focus();
  };
  return <nav className="v3-toolbar vivo-toolbar cv-toolbar" aria-label="Herramientas de CHULLA VIDA">
    <span className="cv-toolbar-tag">ECUADOR <strong>A TU RITMO</strong></span>
    <div className="cv-toolbar-main">
      <button className="cv-tool cv-tool-mijin" aria-label="Habla con MIJIN" onClick={() => signal('mijin')}><span className="cv-pulse"><Mic size={16} /></span><span><span className="cv-long">Habla con </span>MIJIN</span></button>
      <button className="cv-tool" onClick={() => signal('plan')}><Map size={16} /><span>Mi viaje</span></button>
      <button className="cv-tool" aria-label="Mi billetera" onClick={() => signal('wallet')}><Wallet size={16} /><span><span className="cv-long">Mi </span>billetera</span></button>
      <button className="cv-tool" aria-label="Reservas y pagos" onClick={() => signal('payments')}><CreditCard size={16} /><span>Reservas<span className="cv-long"> y pagos</span></span></button>
      <div className="cv-more" ref={wrapRef}>
        <button ref={buttonRef} className="cv-tool" aria-label="Más herramientas" aria-haspopup="menu" aria-expanded={open} aria-controls={menuId} onClick={() => setOpen(value => !value)}><MoreHorizontal size={16} /><span>Más</span></button>
        {open && <div className="cv-more-menu" id={menuId} role="menu" aria-label="Más herramientas" onKeyDown={onMenuKey}>{MORE_TOOLS.map(({ name, label, hint, icon: Icon }) => <button key={name} role="menuitem" onClick={() => { setOpen(false); signal(name); }}><Icon size={18} /><span><strong>{label}</strong><small>{hint}</small></span></button>)}</div>}
      </div>
    </div>
  </nav>;
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
    const handlers = ['plan', 'downloads', 'account', 'legal', 'editorial', 'alerts', 'payments', 'host', 'wallet', 'privacy-rights'].map(name => {
      const handle = () => { select(null); setPanel(name); if (name === 'account') setInquiry(undefined); };
      window.addEventListener(`cv3:${name}`, handle); return { name, handle };
    });
    return () => { handlers.forEach(({ name, handle }) => window.removeEventListener(`cv3:${name}`, handle)); window.removeEventListener('hashchange', openAccount); };
  }, []);
  const loading = <div className="vivo-panel-loading cv-panel-loading" role="status"><span className="cv-skeleton" /><span className="cv-skeleton" /><span>Preparando tu espacio…</span></div>;
  return <>
    <CatalogDetail onDownload={async experience => { const module = await import('../offline/library'); await module.saveExperienceOffline(experience); await refreshLibrary(); }} onAsk={() => signal('mijin')} onInquiry={id => { setInquiry(id); setPanel('account'); }} />
    {panel === 'plan' && <Suspense fallback={loading}><PlannerDialog onClose={() => setPanel('')} onSelect={id => { setPanel(''); select(id); }} /></Suspense>}
    {panel === 'legal' && <Suspense fallback={loading}><LegalCenter onClose={() => setPanel('')} onPrivacy={openPrivacy} /></Suspense>}
    {panel === 'account' && <Dialog title="Tu cuenta en CHULLA VIDA" onClose={() => setPanel('')} wide><div className="dialog-content"><Suspense fallback={loading}><AuthPanel experienceId={inquiry} /></Suspense></div></Dialog>}
    {panel === 'editorial' && <Dialog title="Estudio de contenido" onClose={() => setPanel('')} wide><div className="dialog-content"><Suspense fallback={loading}><EditorialPanel onPublished={() => window.dispatchEvent(new Event('cv3:catalog-updated'))} /></Suspense></div></Dialog>}
    {panel === 'alerts' && <Dialog title="Tus avisos, a tu manera" onClose={() => setPanel('')} wide><div className="dialog-content"><Suspense fallback={loading}><NotificationCenter /></Suspense></div></Dialog>}
    {panel === 'host' && <Suspense fallback={loading}><HostHub onClose={() => setPanel('')} /></Suspense>}
    {panel === 'wallet' && <Suspense fallback={loading}><WalletPanel onClose={() => setPanel('')} onOpenExperience={id => { setPanel(''); select(id); }} /></Suspense>}
    {panel === 'privacy-rights' && <Suspense fallback={loading}><RightsRequestForm onClose={() => setPanel('')} /></Suspense>}
    <Suspense fallback={null}><WelcomeGate /></Suspense>
    {panel === 'payments' && <Dialog title="Reservas y pagos" onClose={() => setPanel('')} wide><div className="dialog-content"><Suspense fallback={loading}><PaymentsPanel reference={paymentReference(window.location.search)} onAccount={() => { setInquiry(undefined); setPanel('account'); }} onDemo={() => { const place = places[0]; if (place) { setPanel(''); setRole('turista'); setBookingPlace(place); } }} /></Suspense></div></Dialog>}
    {panel === 'downloads' && <Suspense fallback={loading}><DownloadsPanel onClose={() => setPanel('')} onOpenExperience={id => { setPanel(''); select(id); }} onChanged={refreshLibrary} /></Suspense>}
    <Suspense fallback={null}><MijinAssistant publicExperiences={records} onOpenExperience={id => { setPanel(''); select(id); }} downloadedExperiences={library.experiences} downloadedAt={library.downloadedAt} onOpenPrivacy={openPrivacy} /></Suspense>
  </>;
}
/** Pie con columnas: explorar, viajar, anfitriones, legal y privacidad, ayuda. */
export function V3Footer({ onReplayIntro, onHelp, onRegion }: { onReplayIntro?: () => void; onHelp?: () => void; onRegion?: (region: RegionId) => void } = {}) {
  const { open } = useConsent();
  const region = (id: RegionId) => () => { onRegion?.(id); document.getElementById('experiencias')?.scrollIntoView({ block: 'start' }); };
  return <footer className="v3-footer vivo-footer cv-footer" aria-label="Pie de página">
    <div className="cv-footer-brand"><strong>CHULLA VIDA</strong><p>Turismo joven, sostenible y consciente en las cuatro regiones del Ecuador.</p><SocialButtons /></div>
    <nav className="cv-footer-cols" aria-label="Enlaces del sitio">
      <section><h2>Explora</h2><ul>{(['sierra', 'costa', 'amazonia', 'galapagos'] as RegionId[]).map(id => <li key={id}><button onClick={region(id)}>{REGION_LABELS[id]}</button></li>)}<li><button onClick={() => signal('culture')}>Cultura Viva</button></li></ul></section>
      <section><h2>Viaja</h2><ul><li><button onClick={() => signal('plan')}><Map size={15} />Mi viaje</button></li><li><button onClick={() => signal('wallet')}><Wallet size={15} />Mi billetera</button></li><li><button onClick={() => signal('payments')}><CreditCard size={15} />Reservas y pagos</button></li><li><button onClick={() => signal('downloads')}><Download size={15} />Fichas sin señal</button></li><li><button onClick={() => signal('passport')}><BookOpen size={15} />Pasaporte Guambra</button></li></ul></section>
      <section><h2>Anfitriones</h2><ul><li><button onClick={() => signal('host')}><Store size={15} />Publica tu experiencia</button></li><li><button onClick={() => signal('account')}><UserRound size={15} />Cuenta y negocio</button></li><li><button onClick={() => signal('editorial')}><FilePenLine size={15} />Editar contenido</button></li></ul></section>
      <section><h2>Legal y privacidad</h2><ul><li><button onClick={() => signal('legal')}><ShieldCheck size={15} />Términos y privacidad</button></li><li><button onClick={open}>Privacidad y cookies</button></li><li><button onClick={() => signal('privacy-rights')}>Ejercer mis derechos de datos</button></li><li><a href={LEGAL_PDF_NOTICE} download><FileText size={15} />Aviso de protección de datos (PDF)</a></li><li><a href={LEGAL_PDF_RIGHTS} download><Download size={15} />Formulario de derechos (PDF)</a></li></ul></section>
      <section><h2>Ayuda</h2><ul><li><button onClick={() => signal('mijin')}><Mic size={15} />Habla con MIJIN</button></li>{onHelp && <li><button onClick={onHelp}><CircleHelp size={15} />Preguntas frecuentes</button></li>}<li><button onClick={() => signal('alerts')}><Bell size={15} />Preferencias de avisos</button></li><li><button onClick={() => signal('welcome')}><Compass size={15} />Volver a ver tutorial</button></li>{onReplayIntro && <li><button onClick={onReplayIntro}><PlayCircle size={15} />Ver bienvenida</button></li>}<li><a href="/images/CREDITS.md" target="_blank" rel="noreferrer"><ImageIcon size={15} />Créditos de imágenes</a></li></ul></section>
    </nav>
    <p className="cv-footer-note">Información de origen · Precios referenciales · Viajes con respeto. Mientras los pagos no estén activos, toda compra es de prueba y no cobra nada.</p>
  </footer>;
}
