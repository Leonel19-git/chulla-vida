import { LanguageSelector } from './components/chulla/LanguageSelector';
import { lazy, Suspense, useEffect, useState } from 'react';
import { ArrowUpRight, Bell, Bookmark, CalendarDays, Check, CircleHelp, Compass, CreditCard, Map, Menu, MessageCircle, Mic, PlayCircle, Store, Sun, UserRound, Wallet, WifiOff, X } from 'lucide-react';
import { MembershipProvider, useMembership } from './context/MembershipContext';
const MembershipPlans = lazy(() => import('./components/chulla/MembershipPlans').then(m => ({ default: m.MembershipPlans })));
const PassportView = lazy(() => import('./components/chulla/PassportView').then(m => ({ default: m.PassportView })));
import { translatePremium } from './i18n/premium';
import { Crown, BookOpen, LockKeyhole } from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
import { msg, useT } from './i18n/v3';
import type { AppTab } from './types';
const HostPortal = lazy(() => import('./components/host/HostPortal').then(m => ({ default: m.HostPortal })));
const OnboardingModal = lazy(() => import('./components/onboarding/OnboardingModal').then(m => ({ default: m.OnboardingModal })));
import { Explore, SavedView, TripPlan } from './components/chulla/Explore';
import { CommunityView, FestivalsView, HelpView } from './components/chulla/JourneyViews';
const BookingDialog = lazy(() => import('./components/chulla/CheckoutDialog').then(m => ({ default: m.BookingDialog })));
import { PlaceDetails } from './components/chulla/PlaceDetails';
const RequestsView = lazy(() => import('./components/chulla/RequestsView').then(m => ({ default: m.RequestsView })));
import { BrandIntro } from './components/chulla/BrandIntro';
import { AnimatedLogo } from './components/chulla/AnimatedLogo';
const OfflineRoute = lazy(() => import('./components/chulla/OfflineRoute').then(m => ({ default: m.OfflineRoute })));
import { REGION_LABELS } from './domain/catalog';
import { CatalogProvider } from './features/catalog/CatalogContext';
import { ConsentProvider } from './features/privacy/ConsentContext';
import { PrivacyControls } from './features/privacy/PrivacyControls';
import { V3Workspace, V3Toolbar, V3Footer } from './features/workspace/V3Workspace';
import { AccountButton, openAccount } from './features/workspace/AccountButton';
import { optionalLazy } from './features/workspace/optionalModule';
import { NoteChip } from './features/catalog/Rail';
import { RoleSwitch, useRole } from './features/roles';
import './App.css';
import './components/chulla/ui.css';
import './components/chulla/responsive.css';
import './components/chulla/andes-theme.css';
import './components/chulla/music.css';
import './components/chulla/brand-motion.css';
import './components/chulla/checkout.css';
import './components/chulla/payments-view.css';
import './components/chulla/finish-theme.css';
import './components/chulla/youth-ui.css';
import './components/chulla/polish.css';
import './components/chulla/mobile-ios.css';
import './features/workspace/shell.css';

const touristNav = [
  { tab: 'feed' as AppTab, label: msg('Explorar Ecuador'), icon: Compass },
  { tab: 'plan' as const, label: msg('Mi viaje'), icon: Map },
  { tab: 'saved' as AppTab, label: msg('Mis guardados'), icon: Bookmark },
  { tab: 'wallet' as const, label: msg('Mi billetera'), icon: Wallet },
  { tab: 'payments' as const, label: msg('Reservas y pagos'), icon: CreditCard },
  { tab: 'offline' as const, label: msg('Sin señal'), icon: WifiOff },
  { tab: 'vouchers' as AppTab, label: msg('Mis viajes'), icon: CalendarDays },
  { tab: 'raymis' as AppTab, label: msg('Cultura Viva'), icon: Sun },
  { tab: 'chat' as AppTab, label: msg('Comunidad wambra'), icon: MessageCircle },
  { tab: 'alerts' as const, label: msg('Mis avisos'), icon: Bell },
];
type NavTarget = AppTab | 'plan' | 'offline' | 'wallet' | 'payments' | 'alerts';
const titleByTab: Record<string, string> = { feed: msg('Ecuador, a tu manera'), saved: msg('Mis guardados'), vouchers: msg('Mis viajes'), raymis: msg('Cultura Viva'), chat: msg('Comunidad wambra'), help: msg('Preguntas frecuentes'), host: msg('Mi negocio'), gad: 'Mi negocio' };
const signal = (name: string) => window.dispatchEvent(new Event(`cv3:${name}`));
/** Lista de revisión de transferencias del frente de pagos. Mientras no exista, el panel de negocio sigue sin ella. */
const TransferReviewList = optionalLazy<object>(import.meta.glob('./features/payments/TransferReviewList.tsx'), 'TransferReviewList', () => null);

function MainContent({ onReplayIntro }: { onReplayIntro: () => void }) {
  const t = useT();
  const { language, role, setRole, activeTab, setActiveTab, notifications, dismissNotification, savedPlaceIds, setSelectedRegion } = useApp();
  const { hasAccess, plan, isActive } = useMembership();
  const access = useRole();
  /** Modo negocio solo si el rol lo dice (servidor o elección explícita). Invitados y viajeros ven el modo viajero. */
  const business = access.isHost;
  const guest = access.role === 'guest';
  const traveler = !business;
  const pt = (source: string) => translatePremium(language, source);
  const [membershipFeature, setMembershipFeature] = useState<'plans' | 'offline' | 'community' | 'premium-passport' | null>(null);
  const [passport, setPassport] = useState(false);
  const openOffline = () => { if (hasAccess('offline')) setOfflineRoute(true); else setMembershipFeature('offline'); };
  const [mobileNav, setMobileNav] = useState(false);
  const [notices, setNotices] = useState(false);
  const [tripPlan, setTripPlan] = useState(false);
  const [offlineRoute, setOfflineRoute] = useState(false);
  // El perfil de demostración (AppContext) sigue al rol real: nadie cae en el panel de negocio por una preferencia vieja.
  useEffect(() => {
    if (business && role === 'turista') setRole('local');
    else if (!business && role !== 'turista') setRole('turista');
  }, [business, role, setRole]);
  useEffect(() => {
    const openPassport = () => { setPassport(true); setMobileNav(false); };
    const openCulture = () => { setActiveTab('raymis'); setMobileNav(false); window.scrollTo({ top: 0, behavior: 'instant' }); };
    window.addEventListener('cv3:passport', openPassport);
    window.addEventListener('cv3:culture', openCulture);
    return () => { window.removeEventListener('cv3:passport', openPassport); window.removeEventListener('cv3:culture', openCulture); };
  }, []);
  useEffect(() => { const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') { setMobileNav(false); setNotices(false); } }; window.addEventListener('keydown', fn); return () => window.removeEventListener('keydown', fn); }, []);
  useEffect(() => { setMobileNav(false); setNotices(false); setTripPlan(false); setOfflineRoute(false); setMembershipFeature(null); setPassport(false); }, [business]);
  const navTo = (tab: NavTarget) => {
    setMobileNav(false);
    if (tab === 'wallet') signal('wallet');
    else if (tab === 'plan') signal('plan');
    else if (tab === 'offline') signal('downloads');
    else if (tab === 'payments') signal('payments');
    else if (tab === 'alerts') signal('alerts');
    else if (tab === 'chat' && !hasAccess('community')) setMembershipFeature('community');
    else { setActiveTab(tab); window.scrollTo({ top: 0, behavior: 'instant' }); }
  };
  const toTraveler = () => { if (access.role === 'both') access.setMode('traveler'); else access.requestTraveler(); };
  const toHost = () => { if (access.role === 'both') access.setMode('host'); else signal('host'); };
  return <div className={`app-shell ${business ? 'is-business' : 'is-traveler'}`}>
    <a className="skip-link" href="#main-content">{t("Saltar al contenido")}</a>
    {mobileNav && <button className="nav-scrim" onClick={() => setMobileNav(false)} aria-label={t("Cerrar menú")} />}
    <aside className={'sidebar ' + (mobileNav ? 'sidebar-open' : '')} aria-label={t("Menú principal")}>
      <div className="sidebar-brand"><button onClick={() => navTo(traveler ? 'feed' : 'host')} aria-label={t('CHULLA VIDA · Inicio')}><AnimatedLogo variant="compact" /></button><button className="icon-button sidebar-close" onClick={() => setMobileNav(false)} aria-label={t("Cerrar menú")}><X size={20} /></button></div>
      <div className="sidebar-mode"><span className="mode-dot" />{t(traveler ? 'Para almas viajeras' : 'Para quienes reciben')}</div>
      <RoleSwitch />
      <nav className="main-navigation">{traveler
        ? <>{touristNav.map(({ tab, label, icon: Icon }) => <button key={tab} onClick={() => navTo(tab)} className={activeTab === tab ? 'active' : ''} aria-current={activeTab === tab ? 'page' : undefined}><Icon size={19} /><span>{t(label)}</span>{tab === 'saved' && savedPlaceIds.length > 0 && <span className="nav-count">{savedPlaceIds.length}</span>}{activeTab === tab && <span className="nav-active-dot" />}</button>)}<button className="passport-nav" onClick={() => { setMobileNav(false); setPassport(true); }}><BookOpen size={19} /><span>{pt('Mi pasaporte')}</span>{plan?.id === 'annual' && isActive && <Crown size={14} />}</button><button className="membership-nav" onClick={() => { setMobileNav(false); setMembershipFeature('plans'); }}><Crown size={19} /><span>{pt('Planes y suscripción')}</span>{isActive && <Check size={14} />}</button><button onClick={() => { setMobileNav(false); signal('tour'); }}><Compass size={19} /><span>{t('Recorrido guiado')}</span></button></>
        : <><button className={activeTab === 'host' ? 'active' : ''} onClick={() => navTo('host')} aria-current={activeTab === 'host' ? 'page' : undefined}><Store size={19} />{t("Mi negocio")}</button>{access.role !== 'both' && <button onClick={() => { setMobileNav(false); toTraveler(); }}><Compass size={19} /><span>{t('Modo viajero')}</span></button>}</>}</nav>
      <div className="sidebar-bottom"><button className="replay-intro" onClick={() => { setMobileNav(false); onReplayIntro(); }}><PlayCircle size={17} />{t("Ver la intro")}</button><button className={'sidebar-help ' + (activeTab === 'help' ? 'active' : '')} onClick={() => navTo('help')}><CircleHelp size={18} />{t("Preguntas frecuentes")}<ArrowUpRight size={15} /></button><div className="sidebar-country"><span className="ecuador-flag"><i /><i /><i /></span>{t("Hecho para descubrir Ecuador")}</div></div>
    </aside>
    <div className="app-workspace">
      <header className="topbar cv-topbar"><div className="topbar-left"><button className="icon-button mobile-menu" aria-label={t("Abrir menú")} aria-expanded={mobileNav} onClick={() => setMobileNav(!mobileNav)}><Menu size={22} /></button><button className="mobile-brand-name" onClick={() => navTo(traveler ? 'feed' : 'host')} aria-label={t('CHULLA VIDA · Inicio')}>CHULLA VIDA</button><span className="topbar-title">{t(titleByTab[activeTab] || titleByTab.feed)}</span></div>
        <div className="topbar-actions"><AccountButton /><LanguageSelector /><button className="header-intro" onClick={onReplayIntro} aria-label={t("Ver animación de CHULLA VIDA")}><PlayCircle size={17} /><span>{t("Ver intro")}</span></button>
          {business && <button className="business-switch" onClick={toTraveler}><Compass size={16} /><span>{t('Modo viajero')}</span></button>}
          {!business && access.role === 'both' && <button className="business-switch" onClick={toHost}><Store size={16} /><span>{t('Modo negocio')}</span></button>}
          <div className="popover-wrap"><button className="icon-button notification-button" aria-label={t("Ver notificaciones")} aria-expanded={notices} onClick={() => setNotices(!notices)}><Bell size={19} />{notifications.length > 0 && <i />}</button>{notices && <><button className="popover-dismiss" tabIndex={-1} aria-label={t("Cerrar notificaciones")} onClick={() => setNotices(false)} /><section className="header-popover notifications-popover"><h2>{t("Tus novedades")}</h2>{notifications.length ? notifications.map(n => <div className="notification-item" key={n.id}><div><strong>{n.titulo}</strong><p>{n.mensaje}</p></div><button className="icon-button" aria-label={t('Descartar {title}', { title: n.titulo })} onClick={() => dismissNotification(n.id)}><X size={15} /></button></div>) : <p>{t("Por ahora, todo está al día.")}</p>}<small>{t("Actividad de esta demostración local.")}</small></section></>}</div>
        </div></header>
      {traveler && <V3Toolbar />}
      <main id="main-content" className="main-content" key={(business ? 'b' : 't') + activeTab} tabIndex={-1}><Suspense fallback={<p className="vivo-panel-loading" role="status">{t('Cargando…')}</p>}>
        {traveler
          ? <>{activeTab === 'feed' && <Explore onPlan={() => setTripPlan(true)} onIntro={onReplayIntro} onOffline={openOffline} />}{activeTab === 'saved' && <SavedView />}{activeTab === 'vouchers' && <RequestsView />}{activeTab === 'raymis' && <FestivalsView />}{activeTab === 'chat' && (hasAccess('community') ? <CommunityView /> : <section className="membership-locked"><LockKeyhole size={30} /><h1>{pt('Acceso con suscripción')}</h1><button className="button button-primary" onClick={() => setMembershipFeature('community')}>{pt('Ver planes')}</button></section>)}{activeTab === 'help' && <HelpView />}</>
          : activeTab === 'help' ? <HelpView /> : <><NoteChip label={t('Panel de prueba')}><p>{t('Publicaciones, cobros y revisiones de este panel son locales y ficticios.')}</p><p>{t('Para tu cuenta conectada abre «Mi cuenta».')}</p></NoteChip><Suspense fallback={null}><TransferReviewList /></Suspense><HostPortal /></>}</Suspense>
      </main>
      {traveler && <nav className="mobile-bottom-nav cv-bottom-nav" aria-label={t("Navegación móvil")}>
        <button className={activeTab === 'feed' ? 'active' : ''} aria-current={activeTab === 'feed' ? 'page' : undefined} onClick={() => navTo('feed')}><Compass size={21} aria-hidden="true" /><span>{t('Explorar')}</span></button>
        <button data-tour="plan" onClick={() => navTo('plan')}><Map size={21} aria-hidden="true" /><span>{t('Mi viaje')}</span></button>
        <button className="cv-bottom-mijin" data-tour="mijin" aria-label={t('Habla con MIJIN')} onClick={() => signal('mijin')}><span className="cv-bottom-mijin-mark"><Mic size={22} aria-hidden="true" /></span><span>MIJIN</span></button>
        <button data-tour="wallet" onClick={() => navTo('wallet')}><Wallet size={21} aria-hidden="true" /><span>{t('Billetera')}</span></button>
        <button onClick={() => openAccount()}><UserRound size={21} aria-hidden="true" /><span>{t('Cuenta')}</span></button>
      </nav>}
      <V3Footer mode={business ? 'business' : guest ? 'guest' : 'traveler'} onReplayIntro={onReplayIntro} onHelp={() => navTo('help')} onRegion={id => { setSelectedRegion(REGION_LABELS[id]); if (activeTab !== 'feed') setActiveTab('feed'); }} />
    </div>
    {traveler && <Suspense fallback={null}><OnboardingModal /><PlaceDetails /><BookingDialog />{tripPlan && <TripPlan onClose={() => setTripPlan(false)} />}{offlineRoute && hasAccess('offline') && <OfflineRoute onClose={() => setOfflineRoute(false)} />}{passport && <PassportView onClose={() => setPassport(false)} onChoosePlans={() => { setPassport(false); setMembershipFeature('premium-passport'); }} />}{membershipFeature && <MembershipPlans feature={membershipFeature === 'plans' ? undefined : membershipFeature} onClose={() => setMembershipFeature(null)} onActivated={() => { if (membershipFeature === 'offline') setOfflineRoute(true); else if (membershipFeature === 'community') setActiveTab('chat'); else if (membershipFeature === 'premium-passport') setPassport(true); setMembershipFeature(null); }} />}</Suspense>}
  </div>;
}
const INTRO_KEY = 'chullavida:v3:intro';
export function App() {
  const [intro, setIntro] = useState(() => {
    if (new URLSearchParams(window.location.search).get('intro') === '1') return true;
    try { return localStorage.getItem(INTRO_KEY) !== 'seen'; } catch { return true; }
  });
  const closeIntro = () => {
    setIntro(false);
    try { localStorage.setItem(INTRO_KEY, 'seen'); } catch { /* almacenamiento bloqueado: la intro volverá a mostrarse */ }
    window.dispatchEvent(new Event('cv3:intro-closed'));
  };
  return <AppProvider><ConsentProvider><CatalogProvider><MembershipProvider><MainContent onReplayIntro={() => setIntro(true)} /><V3Workspace /><PrivacyControls />{intro && <BrandIntro onClose={closeIntro} />}</MembershipProvider></CatalogProvider></ConsentProvider></AppProvider>;
}
export default App;

