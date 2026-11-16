import { lazy, Suspense, useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { ChevronDown, Compass, Store, Bell, BookOpen, CircleHelp, CreditCard, Download, FilePenLine, FileText, Image as ImageIcon, Map, Mic, MoreHorizontal, PlayCircle, ShieldCheck, UserRound, Wallet } from 'lucide-react';
import { REGION_LABELS, type RegionId } from '../../domain/catalog';
import { SocialButtons } from '../../components/chulla/SocialButtons';
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

import { useT, msg } from '../../i18n/v3';
const PlannerDialog = lazy(() => import('../planner/PlannerDialog').then(module => ({ default: module.PlannerDialog })));
const LegalCenter = lazy(() => import('../legal/LegalCenter').then(module => ({ default: module.LegalCenter })));
const AuthPanel = lazy(() => import('../auth/AuthPanel').then(module => ({ default: module.AuthPanel })));
const MijinAssistant = lazy(() => import('../assistant/MijinAssistant').then(module => ({ default: module.MijinAssistant })));
const DownloadsPanel = lazy(() => import('../offline/DownloadsPanel').then(module => ({ default: module.DownloadsPanel })));
const EditorialPanel = lazy(() => import('../cms/EditorialPanel').then(module => ({ default: module.EditorialPanel })));
const NotificationCenter = lazy(() => import('../notifications/NotificationCenter').then(module => ({ default: module.NotificationCenter })));
const HostHub = lazy(() => import('../host/HostHub').then(module => ({ default: module.HostHub })));
const WelcomeGate = lazy(() => import('../onboarding/WelcomeFlow').then(module => ({ default: module.WelcomeGate })));
const TourGate = lazy(() => import('../onboarding/GuidedTour').then(module => ({ default: module.TourGate })));
const PaymentsPanel = lazy(() => import('../payments/PaymentsPanel').then(module => ({ default: module.PaymentsPanel })));
const signal = (name: string) => window.dispatchEvent(new Event(`cv3:${name}`));
export const LEGAL_PDF_NOTICE = '/legal/aviso-proteccion-datos-chulla-vida.pdf';
export const LEGAL_PDF_RIGHTS = '/legal/formulario-derechos-datos-chulla-vida.pdf';

/** Rutas con URL propia: /experiencias/<id>, /pasaporte, /mi-viaje… (ver src/features/routing). */
interface RoutingProps { panel: string; closePanel: () => void }
const UrlRouting = lazy(async () => {
  const { useUrlRouting } = await import('../routing/useUrlRouting');
  function UrlRoutingBridge(props: RoutingProps) { useUrlRouting(props); return null; }
  return { default: UrlRoutingBridge };
});
/** «Descargar ficha»: baja un archivo .html real al dispositivo y además la guarda en la biblioteca sin señal. */
async function downloadExperience(experience: Experience): Promise<string> {
  const { downloadExperienceFile } = await import('../offline/experienceFile');
  return (await downloadExperienceFile(experience)).message;
}
const WalletPanel = lazy(() => import('../wallet/WalletPanel').then(module => ({ default: module.WalletPanel })));
const RightsRequestForm = lazy(() => import('../privacy-rights/RightsRequestForm').then(module => ({ default: module.RightsRequestForm })));

function isAuthReturn() {
  const hash = new URLSearchParams(window.location.hash.slice(1));
  return window.location.hash === '#cuenta' || hash.has('access_token') || hash.has('error_description')
    || hash.get('type') === 'recovery' || new URLSearchParams(window.location.search).has('code');
}
const MORE_TOOLS = [
  { name: 'downloads', label: msg('Sin señal'), hint: msg('Fichas sin internet'), icon: Download },
  { name: 'passport', label: msg('Pasaporte Guambra'), hint: msg('Tus sellos'), icon: BookOpen },
  { name: 'alerts', label: msg('Mis avisos'), hint: msg('Qué te llega y cuándo'), icon: Bell },
  { name: 'account', label: msg('Mi cuenta'), hint: msg('Entra o crea tu cuenta'), icon: UserRound },
  { name: 'tour', label: msg('Recorrido guiado'), hint: msg('Te mostramos la página'), icon: Compass },
] as const;

/** Barra de herramientas: lo más usado a la vista y el resto en «Más». En móvil, iconos con etiqueta corta. */
export function V3Toolbar() {
  const t = useT();
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
  return <nav className="v3-toolbar vivo-toolbar cv-toolbar" aria-label={t("Herramientas de CHULLA VIDA")}>
    <span className="cv-toolbar-tag">ECUADOR <strong>{t("A TU RITMO")}</strong></span>
    <div className="cv-toolbar-main">
      <button className="cv-tool cv-tool-mijin" data-tour="mijin" aria-label={t("Habla con MIJIN")} onClick={() => signal('mijin')}><span className="cv-pulse"><Mic size={16} /></span><span><span className="cv-long">{t("Habla con MIJIN")}</span><span className="cv-short" aria-hidden="true">MIJIN</span></span></button>
      <button className="cv-tool" data-tour="plan" onClick={() => signal('plan')}><Map size={16} /><span>{t("Mi viaje")}</span></button>
      <button className="cv-tool" data-tour="wallet" aria-label={t("Mi billetera")} onClick={() => signal('wallet')}><Wallet size={16} /><span><span className="cv-long">{t("Mi billetera")}</span><span className="cv-short" aria-hidden="true">{t("Billetera")}</span></span></button>
      <button className="cv-tool" aria-label={t("Reservas y pagos")} onClick={() => signal('payments')}><CreditCard size={16} /><span><span className="cv-long">{t("Reservas y pagos")}</span><span className="cv-short" aria-hidden="true">{t("Reservas")}</span></span></button>
      <div className="cv-more" ref={wrapRef} data-tour="more">
        <button ref={buttonRef} className="cv-tool" aria-label={t("Más herramientas")} aria-haspopup="menu" aria-expanded={open} aria-controls={menuId} onClick={() => setOpen(value => !value)}><MoreHorizontal size={16} /><span>{t("Más")}</span></button>
        {open && <div className="cv-more-menu" id={menuId} role="menu" aria-label={t("Más herramientas")} onKeyDown={onMenuKey}>{MORE_TOOLS.map(({ name, label, hint, icon: Icon }) => <button key={name} role="menuitem" onClick={() => { setOpen(false); signal(name); }}><Icon size={18} /><span><strong>{t(label)}</strong><small>{t(hint)}</small></span></button>)}</div>}
      </div>
    </div>
  </nav>;
}
export function V3Workspace() {
  return <ToolBoundary><WorkspaceContent /></ToolBoundary>;
}
function WorkspaceContent() {
  const t = useT();
  const { places, setBookingPlace, setRole } = useApp();
  const { select, records } = useCatalog();
  const { open: openPrivacy } = useConsent();
  const [panel, setPanel] = useState(() => isAuthReturn() ? 'account' : paymentReference(window.location.search) ? 'payments' : '');
  const [inquiry, setInquiry] = useState<string>();
  const [accountTab, setAccountTab] = useState<'signup' | 'login'>();
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
      const handle = (event: Event) => {
        select(null); setPanel(name);
        if (name === 'account') { setInquiry(undefined); const tab = (event as CustomEvent<{ tab?: string } | undefined>).detail?.tab; setAccountTab(tab === 'signup' || tab === 'login' ? tab : undefined); }
      };
      window.addEventListener(`cv3:${name}`, handle); return { name, handle };
    });
    return () => { handlers.forEach(({ name, handle }) => window.removeEventListener(`cv3:${name}`, handle)); window.removeEventListener('hashchange', openAccount); };
  }, []);
  const loading = <div className="vivo-panel-loading cv-panel-loading" role="status"><span className="cv-skeleton" /><span className="cv-skeleton" /><span>{t("Preparando tu espacio…")}</span></div>;
  return <>
    <Suspense fallback={null}><UrlRouting panel={panel} closePanel={() => setPanel('')} /></Suspense>
    <CatalogDetail onDownload={async experience => { const message = await downloadExperience(experience); await refreshLibrary(); return message; }} onAsk={() => signal('mijin')} onInquiry={id => { setInquiry(id); setPanel('account'); }} />
    {panel === 'plan' && <Suspense fallback={loading}><PlannerDialog onClose={() => setPanel('')} onSelect={id => { setPanel(''); select(id); }} /></Suspense>}
    {panel === 'legal' && <Suspense fallback={loading}><LegalCenter onClose={() => setPanel('')} onPrivacy={openPrivacy} /></Suspense>}
    {panel === 'account' && <Dialog title={t("Tu cuenta en CHULLA VIDA")} onClose={() => setPanel('')} wide><div className="dialog-content"><Suspense fallback={loading}><AuthPanel experienceId={inquiry} initialTab={inquiry ? undefined : accountTab} /></Suspense></div></Dialog>}
    {panel === 'editorial' && <Dialog title={t("Estudio de contenido")} onClose={() => setPanel('')} wide><div className="dialog-content"><Suspense fallback={loading}><EditorialPanel onPublished={() => window.dispatchEvent(new Event('cv3:catalog-updated'))} /></Suspense></div></Dialog>}
    {panel === 'alerts' && <Dialog title={t("Tus avisos, a tu manera")} onClose={() => setPanel('')} wide><div className="dialog-content"><Suspense fallback={loading}><NotificationCenter /></Suspense></div></Dialog>}
    {panel === 'host' && <Suspense fallback={loading}><HostHub onClose={() => setPanel('')} /></Suspense>}
    {panel === 'wallet' && <Suspense fallback={loading}><WalletPanel onClose={() => setPanel('')} onOpenExperience={id => { setPanel(''); select(id); }} /></Suspense>}
    {panel === 'privacy-rights' && <Suspense fallback={loading}><RightsRequestForm onClose={() => setPanel('')} /></Suspense>}
    <Suspense fallback={null}><WelcomeGate /></Suspense>
    <Suspense fallback={null}><TourGate /></Suspense>
    {panel === 'payments' && <Dialog title={t("Reservas y pagos")} onClose={() => setPanel('')} wide><div className="dialog-content"><Suspense fallback={loading}><PaymentsPanel reference={paymentReference(window.location.search)} onAccount={() => { setInquiry(undefined); setPanel('account'); }} onDemo={() => { const place = places[0]; if (place) { setPanel(''); setRole('turista'); setBookingPlace(place); } }} /></Suspense></div></Dialog>}
    {panel === 'downloads' && <Suspense fallback={loading}><DownloadsPanel onClose={() => setPanel('')} onOpenExperience={id => { setPanel(''); select(id); }} onChanged={refreshLibrary} /></Suspense>}
    <Suspense fallback={null}><MijinAssistant publicExperiences={records} onOpenExperience={id => { setPanel(''); select(id); }} downloadedExperiences={library.experiences} downloadedAt={library.downloadedAt} onOpenPrivacy={openPrivacy} /></Suspense>
  </>;
}
/** Grupo del pie: en el celular se pliega (solo el título a la vista); en pantallas anchas empieza abierto. */
function FooterGroup({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(() => { try { return !window.matchMedia('(max-width: 760px)').matches; } catch { return true; } });
  return <details className="cv-footer-group" open={open} onToggle={event => setOpen((event.currentTarget as HTMLDetailsElement).open)}><summary><h2>{title}</h2><ChevronDown size={16} aria-hidden="true" /></summary><ul>{children}</ul></details>;
}
export type FooterMode = 'guest' | 'traveler' | 'business';
/**
 * Pie compacto. Viajero e invitado: explorar, viajar, legal y ayuda; el invitado ve además un único acceso
 * discreto «Soy anfitrión». Negocio: legal, ayuda y la edición de contenido, sin herramientas de viajero.
 */
export function V3Footer({ onReplayIntro, onHelp, onRegion, onHost, mode = 'guest' }: { onReplayIntro?: () => void; onHelp?: () => void; onRegion?: (region: RegionId) => void; onHost?: () => void; mode?: FooterMode } = {}) {
  const t = useT();
  const { open } = useConsent();
  const region = (id: RegionId) => () => { onRegion?.(id); document.getElementById('experiencias')?.scrollIntoView({ block: 'start' }); };
  const business = mode === 'business';
  return <footer className="v3-footer vivo-footer cv-footer cv-footer-compact" aria-label={t("Pie de página")}>
    <div className="cv-footer-brand"><strong>CHULLA VIDA</strong><p>{t("Turismo joven y consciente en Ecuador.")}</p><SocialButtons /></div>
    <nav className="cv-footer-cols" aria-label={t("Enlaces del sitio")}>
      {!business && <FooterGroup title={t("Explora")}>{(['sierra', 'costa', 'amazonia', 'galapagos'] as RegionId[]).map(id => <li key={id}><button onClick={region(id)}>{REGION_LABELS[id]}</button></li>)}<li><button onClick={() => signal('culture')}>{t("Cultura Viva")}</button></li></FooterGroup>}
      {!business && <FooterGroup title={t("Viaja")}><li><button onClick={() => signal('plan')}><Map size={15} />{t("Mi viaje")}</button></li><li><button onClick={() => signal('wallet')}><Wallet size={15} />{t("Mi billetera")}</button></li><li><button onClick={() => signal('payments')}><CreditCard size={15} />{t("Reservas y pagos")}</button></li><li><button onClick={() => signal('downloads')}><Download size={15} />{t("Fichas sin señal")}</button></li><li><button onClick={() => signal('passport')}><BookOpen size={15} />{t("Pasaporte Guambra")}</button></li></FooterGroup>}
      {business && <FooterGroup title={t("Tu negocio")}><li><button onClick={() => signal('host')}><Store size={15} />{t("Solicitud de anfitrión")}</button></li><li><button onClick={() => signal('editorial')}><FilePenLine size={15} />{t("Editar contenido")}</button></li><li><button onClick={() => signal('account')}><UserRound size={15} />{t("Mi cuenta")}</button></li></FooterGroup>}
      <FooterGroup title={t("Legal y privacidad")}><li><button onClick={() => signal('legal')}><ShieldCheck size={15} />{t("Términos y privacidad")}</button></li><li><button onClick={open} data-tour="privacy"><ShieldCheck size={15} />{t("Privacidad y cookies")}</button></li><li><button onClick={() => signal('privacy-rights')}>{t("Ejercer mis derechos de datos")}</button></li><li><a href={LEGAL_PDF_NOTICE} download><FileText size={15} />{t("Aviso de protección de datos (PDF)")}</a></li><li><a href={LEGAL_PDF_RIGHTS} download><Download size={15} />{t("Formulario de derechos (PDF)")}</a></li></FooterGroup>
      <FooterGroup title={t("Ayuda")}><li><button onClick={() => signal('mijin')}><Mic size={15} />{t("Habla con MIJIN")}</button></li>{onHelp && <li><button onClick={onHelp}><CircleHelp size={15} />{t("Preguntas frecuentes")}</button></li>}<li><button onClick={() => signal('alerts')}><Bell size={15} />{t("Preferencias de avisos")}</button></li><li><button onClick={() => signal('welcome')}><Compass size={15} />{t("Ver la bienvenida")}</button></li><li><button onClick={() => signal('tour')}><Compass size={15} />{t("Recorrido guiado")}</button></li>{onReplayIntro && <li><button onClick={onReplayIntro}><PlayCircle size={15} />{t("Ver la intro")}</button></li>}<li><a href="/images/CREDITS.md" target="_blank" rel="noreferrer"><ImageIcon size={15} />{t("Créditos de imágenes")}</a></li></FooterGroup>
    </nav>
    <div className="cv-footer-bottom">
      <p className="cv-footer-note">{t("Precios referenciales · compras de prueba, sin cobro.")}</p>
      {mode === 'guest' && <button className="cv-footer-host" data-tour="host" onClick={() => (onHost ? onHost() : signal('host'))}><Store size={15} aria-hidden="true" />{t("Soy anfitrión")}</button>}
    </div>
  </footer>;
}
