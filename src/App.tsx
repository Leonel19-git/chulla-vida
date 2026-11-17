import { AccountRequired } from './features/workspace/AccountRequired';
import { lazy, Suspense, useEffect, useState } from 'react';
import { BookOpen, Map, Wallet } from 'lucide-react';
import { MembershipProvider } from './context/MembershipContext';
import { AppProvider, useApp } from './context/AppContext';
import { useT } from './i18n/v3';
import { BrandIntro } from './components/chulla/BrandIntro';
import { REGION_LABELS } from './domain/catalog';
import { CatalogProvider, useCatalog } from './features/catalog/CatalogContext';
import { ConsentProvider } from './features/privacy/ConsentContext';
import { PrivacyControls } from './features/privacy/PrivacyControls';
import { V3Workspace, V3Footer } from './features/workspace/V3Workspace';
import { AlbumNavigation } from './features/album/AlbumNavigation';
import { CatalogExplorer, CatalogSaved } from './features/catalog/CatalogExplorer';
import { CultureView } from './features/catalog/CultureView';
import { useRole } from './features/roles';
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
const AuthPanel = lazy(() => import('./features/auth/AuthPanel').then(m => ({ default: m.AuthPanel })));
const MembershipPlans = lazy(() => import('./components/chulla/MembershipPlans').then(m => ({ default: m.MembershipPlans })));
const PassportView = lazy(() => import('./components/chulla/PassportView').then(m => ({ default: m.PassportView })));
const signal = (name: string) => window.dispatchEvent(new Event(`cv3:${name}`));

function MainContent({ onReplayIntro }: { onReplayIntro: () => void }) {
  const t = useT();
  const { activeTab, setActiveTab, setSelectedRegion } = useApp();
  const access = useRole();
  const { select } = useCatalog();
  const [passport, setPassport] = useState(false);
  const [plans, setPlans] = useState(false);
  const home = () => { select(null); setActiveTab('feed'); window.dispatchEvent(new Event('cv3:home')); window.scrollTo({ top: 0, behavior: 'instant' }); };
  useEffect(() => {
    const openPassport = () => setPassport(true);
    const culture = () => { setActiveTab('raymis'); window.scrollTo({ top: 0, behavior: 'instant' }); };
    const toHome = () => setActiveTab('feed');
    window.addEventListener('cv3:passport', openPassport);
    window.addEventListener('cv3:culture', culture);
    window.addEventListener('cv3:home', toHome);
    return () => { window.removeEventListener('cv3:passport', openPassport); window.removeEventListener('cv3:culture', culture); window.removeEventListener('cv3:home', toHome); };
  }, [setActiveTab]);
  const goCulture = () => { select(null); signal('culture'); };
  return <div className={`al-app ${access.isHost ? 'al-business' : ''}`}>
    <a className="skip-link" href="#main-content">{t('Saltar al contenido')}</a>
    <AlbumNavigation culture={activeTab === 'raymis'} onHome={home} onCulture={goCulture} onSaved={() => setActiveTab('saved')} onReplay={onReplayIntro} />
    <main id="main-content" className="al-main" tabIndex={-1}>
      <Suspense fallback={<p className="al-loading" role="status">{t('Cargando…')}</p>}>
        {access.isHost ? <section className="al-host-page"><h1>{t('Mi negocio')}</h1><p>{t('Tus experiencias, tus viajeros y tus próximos pasos.')}</p><AuthPanel /></section>
          : activeTab === 'raymis' ? <CultureView />
          : activeTab === 'saved' ? <><div className="al-pocket-head"><span>CHULLA FLEX</span><h1>{t('Mi sobre')}</h1><p>{t('Aquí empieza tu próxima salida.')}</p><div><button className="al-button" data-tour="plan" onClick={() => signal('plan')}><Map size={18} />{t('Arma tu viaje')}</button><button className="al-button al-button-secondary" data-tour="wallet" onClick={() => signal('wallet')}><Wallet size={18} />{t('Mi billetera')}</button><button className="al-text-link" onClick={() => signal('passport')}><BookOpen size={18} />{t('Pasaporte Guambra')}</button></div></div><CatalogSaved /></>
          : <CatalogExplorer onPlan={() => signal('plan')} onDownloads={() => signal('downloads')} onDemo={() => {}} />}
      </Suspense>
    </main>
    <V3Footer mode={access.isHost ? 'business' : access.role === 'guest' ? 'guest' : 'traveler'} onReplayIntro={onReplayIntro} onHelp={() => signal('tour')} onRegion={id => { setSelectedRegion(REGION_LABELS[id]); home(); }} />
    <Suspense fallback={null}>{passport && <AccountRequired onClose={() => setPassport(false)}><PassportView onClose={() => setPassport(false)} onChoosePlans={() => { setPassport(false); setPlans(true); }} /></AccountRequired>}{plans && <MembershipPlans onClose={() => setPlans(false)} onActivated={() => setPlans(false)} />}</Suspense>
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

