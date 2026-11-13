import { LanguageSelector } from './components/chulla/LanguageSelector';
import { lazy, Suspense, useEffect, useState } from 'react';
import { ArrowUpRight, Bell, Bookmark, CalendarDays, Check, ChevronDown, CircleHelp, Compass, Heart, Leaf, Map, Menu, MessageCircle, PlayCircle, Store, Sun, UserRound, WifiOff, X } from 'lucide-react';
import { MembershipProvider, useMembership } from './context/MembershipContext';
const MembershipPlans = lazy(() => import('./components/chulla/MembershipPlans').then(m => ({ default: m.MembershipPlans })));
const PassportView = lazy(() => import('./components/chulla/PassportView').then(m => ({ default: m.PassportView })));
import { translatePremium } from './i18n/premium';
import { Crown, BookOpen, LockKeyhole } from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
import type { AppTab } from './types';
const HostPortal = lazy(() => import('./components/host/HostPortal').then(m => ({ default: m.HostPortal })));
const OnboardingModal = lazy(() => import('./components/onboarding/OnboardingModal').then(m => ({ default: m.OnboardingModal })));
import { Explore, SavedView, TripPlan } from './components/chulla/Explore';
import { CommunityView, FestivalsView, HelpView, MusicPanel } from './components/chulla/JourneyViews';
const BookingDialog = lazy(() => import('./components/chulla/CheckoutDialog').then(m => ({ default: m.BookingDialog })));
import { PlaceDetails } from './components/chulla/PlaceDetails';
const RequestsView = lazy(() => import('./components/chulla/RequestsView').then(m => ({ default: m.RequestsView })));
import { BrandIntro } from './components/chulla/BrandIntro';
import { AnimatedLogo } from './components/chulla/AnimatedLogo';
const OfflineRoute = lazy(() => import('./components/chulla/OfflineRoute').then(m => ({ default: m.OfflineRoute })));
import { SocialButtons } from './components/chulla/SocialButtons';
import { CatalogProvider } from './features/catalog/CatalogContext';
import { ConsentProvider } from './features/privacy/ConsentContext';
import { PrivacyControls } from './features/privacy/PrivacyControls';
import { V3Workspace, V3Toolbar, V3Footer } from './features/workspace/V3Workspace';
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

const touristNav = [
  { tab: 'feed' as AppTab, label: 'Explorar Ecuador', icon: Compass },
  { tab: 'plan' as const, label: 'Planificar mi viaje', icon: Map },
  { tab: 'offline' as const, label: 'Ruta sin internet', icon: WifiOff },
  { tab: 'saved' as AppTab, label: 'Mis guardados', icon: Bookmark },
  { tab: 'vouchers' as AppTab, label: 'Mis viajes y pagos', icon: CalendarDays },
  { tab: 'raymis' as AppTab, label: 'Cultura Viva', icon: Sun },
  { tab: 'chat' as AppTab, label: 'Comunidad wambra', icon: MessageCircle },
];
const titleByTab: Record<string, string> = { feed: 'Ecuador, a tu manera', saved: 'Mis guardados', vouchers: 'Mis viajes y pagos', raymis: 'Cultura Viva', chat: 'Comunidad wambra', help: 'Preguntas frecuentes', host: 'Espacio de negocios', gad: 'Espacio de negocios' };

function MainContent({ onReplayIntro }: { onReplayIntro: () => void }) {
  const { t, language, role, setRole, activeTab, setActiveTab, setIsOnboardingOpen, notifications, dismissNotification, savedPlaceIds } = useApp();
  const { hasAccess, plan, isActive } = useMembership();
  const pt = (source: string) => translatePremium(language, source);
  const [membershipFeature, setMembershipFeature] = useState<'plans' | 'offline' | 'community' | 'premium-passport' | null>(null);
  const [passport, setPassport] = useState(false);
  const openOffline = () => { if (hasAccess('offline')) setOfflineRoute(true); else setMembershipFeature('offline'); };
  const [mobileNav, setMobileNav] = useState(false);
  const [profile, setProfile] = useState(false);
  const [notices, setNotices] = useState(false);
  const [tripPlan, setTripPlan] = useState(false);
  const [offlineRoute, setOfflineRoute] = useState(false);
  useEffect(() => {
    const openPassport = () => { setPassport(true); setMobileNav(false); };
    const openCulture = () => { setActiveTab('raymis'); setMobileNav(false); };
    window.addEventListener('cv3:passport', openPassport);
    window.addEventListener('cv3:culture', openCulture);
    return () => { window.removeEventListener('cv3:passport', openPassport); window.removeEventListener('cv3:culture', openCulture); };
  }, []);
  const traveler = role === 'turista';
  useEffect(() => { const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') { setMobileNav(false); setProfile(false); setNotices(false); } }; window.addEventListener('keydown', fn); return () => window.removeEventListener('keydown', fn); }, []);
  useEffect(() => { setMobileNav(false); setProfile(false); setNotices(false); setTripPlan(false); setOfflineRoute(false); setMembershipFeature(null); setPassport(false); }, [role]);
  const navTo = (tab: AppTab | 'plan' | 'offline') => { setMobileNav(false); if (tab === 'plan') window.dispatchEvent(new Event('cv3:plan')); else if (tab === 'offline') window.dispatchEvent(new Event('cv3:downloads')); else if (tab === 'chat' && !hasAccess('community')) setMembershipFeature('community'); else { setActiveTab(tab); window.scrollTo({ top: 0, behavior: 'instant' }); } };
  return <div className="app-shell">
    <a className="skip-link" href="#main-content">{t("Saltar al contenido")}</a>
    {mobileNav && <button className="nav-scrim" onClick={() => setMobileNav(false)} aria-label={t("Cerrar menú")} />}
    <aside className={'sidebar ' + (mobileNav ? 'sidebar-open' : '')} aria-label={t("Menú principal")}>
      <div className="sidebar-brand"><button onClick={() => navTo(traveler ? 'feed' : 'host')} aria-label="CHULLA VIDA · Inicio"><AnimatedLogo variant="compact" /></button><button className="icon-button sidebar-close" onClick={() => setMobileNav(false)} aria-label={t("Cerrar menú")}><X size={20} /></button></div>
      <div className="sidebar-mode"><span className="mode-dot" />{t(traveler ? 'Para almas viajeras' : 'Para quienes reciben')}</div>
      <nav className="main-navigation">{traveler ? touristNav.map(({ tab, label, icon: Icon }) => <button key={tab} onClick={() => navTo(tab)} className={activeTab === tab ? 'active' : ''} aria-current={activeTab === tab ? 'page' : undefined}><Icon size={19} /><span>{t(label)}</span>{tab === 'saved' && savedPlaceIds.length > 0 && <span className="nav-count">{savedPlaceIds.length}</span>}{activeTab === tab && <span className="nav-active-dot" />}</button>) : <><button className={activeTab === 'host' ? 'active' : ''} onClick={() => navTo('host')} aria-current={activeTab === 'host' ? 'page' : undefined}><Store size={19} />{t("Mi negocio")}</button></>}{traveler && <><button className="membership-nav" onClick={() => { setMobileNav(false); setMembershipFeature('plans'); }}><Crown size={19} /><span>{pt('Planes y suscripción')}</span>{isActive && <Check size={14} />}</button><button className="passport-nav" onClick={() => { setMobileNav(false); setPassport(true); }}><BookOpen size={19} /><span>{pt('Mi pasaporte')}</span>{plan?.id === 'annual' && isActive && <Crown size={14} />}</button></>}</nav>
      <div className="sidebar-bottom"><button className="replay-intro" onClick={onReplayIntro}><PlayCircle size={17} />{t("Volver a ver la intro")}</button><div className="sidebar-ethos"><Leaf size={24} /><h3>{t("Viajar también")}<br />{t("es cuidar.")}</h3><p>{t("Conecta con lo local.")}<br />{t("Deja una buena huella.")}</p><span className="ethos-line" /></div><button className={'sidebar-help ' + (activeTab === 'help' ? 'active' : '')} onClick={() => navTo('help')}><CircleHelp size={18} />{t("Preguntas frecuentes")}<ArrowUpRight size={15} /></button><div className="sidebar-country"><span className="ecuador-flag"><i /><i /><i /></span>{t("Hecho para descubrir Ecuador")}</div></div>
    </aside>
    <div className="app-workspace">
      <header className="topbar"><div className="topbar-left"><button className="icon-button mobile-menu" aria-label={t("Abrir menú")} aria-expanded={mobileNav} onClick={() => setMobileNav(!mobileNav)}><Menu size={22} /></button><span className="mobile-brand-name">CHULLA VIDA</span><span className="topbar-title">{t(titleByTab[activeTab] || titleByTab.feed)}</span><span className="topbar-divider" /><span className="topbar-greeting">{t(traveler ? '¡Qué más, wambra!' : 'Tu comunidad empieza aquí')}</span></div><div className="topbar-actions"><LanguageSelector /><button className="header-intro" onClick={onReplayIntro} aria-label={t("Ver animación de CHULLA VIDA")}><PlayCircle size={17} /><span>{t("Ver intro")}</span></button><button className="business-switch" aria-label={t(traveler ? "Tengo un negocio" : "Modo viajero")} onClick={() => setRole(traveler ? 'local' : 'turista')}>{traveler ? <Store size={16} /> : <Compass size={16} />}<span>{t(traveler ? 'Tengo un negocio' : 'Modo viajero')}</span><ArrowUpRight size={14} /></button><div className="popover-wrap"><button className="icon-button notification-button" aria-label={t("Ver notificaciones")} aria-expanded={notices} onClick={() => { setNotices(!notices); setProfile(false); }}><Bell size={19} />{notifications.length > 0 && <i />}</button>{notices && <><button className="popover-dismiss" tabIndex={-1} aria-label={t("Cerrar notificaciones")} onClick={() => setNotices(false)} /><section className="header-popover notifications-popover"><h2>{t("Tus novedades")}</h2>{notifications.length ? notifications.map(n => <div className="notification-item" key={n.id}><div><strong>{n.titulo}</strong><p>{n.mensaje}</p></div><button className="icon-button" aria-label={'Descartar ' + n.titulo} onClick={() => dismissNotification(n.id)}><X size={15} /></button></div>) : <p>{t("Por ahora, todo está al día.")}</p>}<small>{t("Actividad de esta demostración local.")}</small></section></>}</div><div className="popover-wrap"><button className="profile-button" aria-label={t("Cambiar perfil de demostración")} aria-expanded={profile} onClick={() => { setProfile(!profile); setNotices(false); }}><span className="profile-avatar"><UserRound size={18} /></span><ChevronDown size={13} /></button>{profile && <><button className="popover-dismiss" tabIndex={-1} aria-label={t("Cerrar perfiles")} onClick={() => setProfile(false)} /><section className="header-popover profile-popover"><h2>{t("¿Cómo quieres vivir Ecuador?")}</h2><button onClick={() => { setRole('turista'); setProfile(false); }}><Compass size={20} /><span><strong>{t("Soy viajero")}</strong><small>{t("Explora, planifica y guarda")}</small></span>{traveler && <Check size={16} />}</button><button onClick={() => { setRole('local'); setProfile(false); }}><Store size={20} /><span><strong>{t("Tengo un negocio")}</strong><small>{t("Publica y gestiona solicitudes")}</small></span>{!traveler && <Check size={16} />}</button><p>{t("Perfiles de prueba, sin inicio de sesión.")}</p></section></>}</div></div></header>
      <V3Toolbar />
      {!traveler && <div className="v3-catalog-note"><p><strong>Panel de negocio de demostración.</strong> Las publicaciones, cobros y revisiones de este espacio son locales y ficticios. Para una cuenta conectada y solicitar revisión, abre «Cuenta y negocio».</p></div>}
      <main id="main-content" className="main-content" key={role + activeTab} tabIndex={-1}><Suspense fallback={<p className="vivo-panel-loading" role="status">Cargando…</p>}>
        {traveler ? <>{activeTab === 'feed' && <><Explore onPlan={() => setTripPlan(true)} onIntro={onReplayIntro} onOffline={openOffline} /><MusicPanel /><section className="community-invite"><div><Leaf size={25} /><h2>{t("Viaja bacán.")}<br />{t("Cuida lo nuestro.")}</h2><p>{t("Conecta con la gente del lugar.")}</p></div><button className="button button-secondary" onClick={() => navTo('raymis')}>{t("Conoce la cultura local")}<ArrowUpRight size={17} /></button></section></>}{activeTab === 'saved' && <SavedView />}{activeTab === 'vouchers' && <RequestsView />}{activeTab === 'raymis' && <FestivalsView />}{activeTab === 'chat' && (hasAccess('community') ? <CommunityView /> : <section className="membership-locked"><LockKeyhole size={30} /><h1>{pt('Acceso con suscripción')}</h1><button className="button button-primary" onClick={() => setMembershipFeature('community')}>{pt('Ver planes')}</button></section>)}{activeTab === 'help' && <HelpView />}</> : activeTab === 'help' ? <HelpView /> : <HostPortal />}</Suspense>
      </main>
      <footer className="app-footer"><div><strong>CHULLA VIDA</strong><span>{t("Ecuador a tu ritmo.")}</span></div><SocialButtons /><div className="footer-links"><button onClick={onReplayIntro}>{t("Ver bienvenida")}</button><button onClick={() => navTo('help')}>{t("Ayuda")}</button><a href="/images/CREDITS.md" target="_blank" rel="noreferrer">{t("Créditos de imágenes")}</a></div></footer>
      {traveler && <nav className="mobile-bottom-nav" aria-label={t("Navegación móvil")}>{[{ tab: 'feed' as AppTab, label: 'Explorar', icon: Compass }, { tab: 'plan' as const, label: 'Mi viaje', icon: Map }, { tab: 'saved' as AppTab, label: 'Guardados', icon: Heart }, { tab: 'vouchers' as AppTab, label: 'Mis viajes', icon: CalendarDays }].map(({ tab, label, icon: Icon }) => <button key={tab} className={activeTab === tab ? 'active' : ''} onClick={() => navTo(tab)} aria-current={activeTab === tab ? 'page' : undefined}><Icon size={20} /><span>{t(label)}</span></button>)}</nav>}
      <V3Footer />
    </div>
    {traveler && <Suspense fallback={null}><OnboardingModal /><PlaceDetails /><BookingDialog />{tripPlan && <TripPlan onClose={() => setTripPlan(false)} />}{offlineRoute && hasAccess('offline') && <OfflineRoute onClose={() => setOfflineRoute(false)} />}{passport && <PassportView onClose={() => setPassport(false)} onChoosePlans={() => { setPassport(false); setMembershipFeature('premium-passport'); }} />}{membershipFeature && <MembershipPlans feature={membershipFeature === 'plans' ? undefined : membershipFeature} onClose={() => setMembershipFeature(null)} onActivated={() => { if (membershipFeature === 'offline') setOfflineRoute(true); else if (membershipFeature === 'community') setActiveTab('chat'); else if (membershipFeature === 'premium-passport') setPassport(true); setMembershipFeature(null); }} />}</Suspense>}
  </div>;
}
const INTRO_KEY = 'chullavida:v3:intro';
export function App() {
  const [intro, setIntro] = useState(() => { try { return localStorage.getItem(INTRO_KEY) !== 'seen'; } catch { return true; } });
  const closeIntro = () => {
    setIntro(false);
    try { localStorage.setItem(INTRO_KEY, 'seen'); } catch { /* almacenamiento bloqueado: la intro volverá a mostrarse */ }
    window.dispatchEvent(new Event('cv3:intro-closed'));
  };
  return <AppProvider><ConsentProvider><CatalogProvider><MembershipProvider><MainContent onReplayIntro={() => setIntro(true)} /><V3Workspace /><PrivacyControls />{intro && <BrandIntro onClose={closeIntro} />}</MembershipProvider></CatalogProvider></ConsentProvider></AppProvider>;
}
export default App;

