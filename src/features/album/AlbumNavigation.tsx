import { useState } from 'react';
import { BookOpen, Compass, Download, Heart, HelpCircle, Map, Mic, PlayCircle, Sparkles, Store, Ticket, UserRound, Wallet, X } from 'lucide-react';
import { useT } from '../../i18n/v3';
import { useCatalog } from '../catalog/CatalogContext';
import { useRole, RoleSwitch } from '../roles';
import { AccountButton, openAccount } from '../workspace/AccountButton';
import { LanguageSelector } from '../../components/chulla/LanguageSelector';
const signal = (name: string) => window.dispatchEvent(new Event(`cv3:${name}`));

export function AlbumNavigation({ culture, onHome, onCulture, onSaved, onReplay }: { culture: boolean; onHome: () => void; onCulture: () => void; onSaved: () => void; onReplay: () => void }) {
  const t = useT();
  const role = useRole();
  const { saved } = useCatalog();
  const [more, setMore] = useState(false);
  const hostArea = (target: string) => {
    const element = document.querySelector<HTMLElement>(target);
    if (element) element.scrollIntoView({ block: 'start', behavior: 'auto' }); else openAccount();
  };
  const actions = [
    { icon: Map, label: 'Arma tu viaje', event: 'plan' },
    { icon: Wallet, label: 'Mi billetera', event: 'wallet' },
    { icon: Ticket, label: 'Reservas y pagos', event: 'payments' },
    { icon: BookOpen, label: 'Pasaporte Guambra', event: 'passport' },
    { icon: Download, label: 'Sin señal', event: 'downloads' },
    { icon: Compass, label: 'Recorrido guiado', event: 'tour' },
  ];
  return <>
    <header className="al-header">
      <button className="al-brand" aria-label={t('CHULLA VIDA · Inicio')} onClick={onHome}><img src="/brand/wordmark.webp" alt="CHULLA VIDA" width="170" height="41" /></button>
      <nav className="al-desktop-nav" aria-label={t('Menú principal')}>
        {role.isHost ? <button onClick={() => signal('account')}><Store size={18} />{t('Mi negocio')}</button> : <><button aria-current={!culture ? 'page' : undefined} onClick={onHome}>{t('Inicio')}</button><button data-tour="culture" onClick={onCulture} aria-current={culture ? 'page' : undefined}>{t('Cultura Viva')}</button><button className="al-nav-mijin" data-tour="mijin" onClick={() => signal('mijin')}><Mic size={17} />MIJIN</button><button data-tour="envelope" onClick={onSaved}>{t('Mi sobre')}<span className="al-nav-count">{saved.length}</span></button></>}
      </nav>
      <div className="al-header-end"><LanguageSelector /><AccountButton /><button className="al-menu-button" aria-expanded={more} aria-label={t('Más herramientas')} onClick={() => setMore(!more)}>{more ? <X size={20} /> : <HelpCircle size={20} />}</button></div>
    </header>
    {more && <div className="al-menu-panel"><RoleSwitch /><p>{t('Todo para tu próxima salida')}</p><div>{actions.map(({ icon: Icon, label, event }) => <button key={event} onClick={() => { setMore(false); signal(event); }}><Icon size={20} />{t(label)}</button>)}<button onClick={() => { setMore(false); onReplay(); }}><PlayCircle size={20} />{t('Ver la intro')}</button>{role.role === 'guest' && <button onClick={() => { setMore(false); signal('host'); }}><Store size={20} />{t('Soy anfitrión o negocio')}</button>}</div></div>}
    <nav className="al-bottom-nav" aria-label={t('Navegación móvil')}>
      {role.isHost ? <>
        <button data-tour="host-nav" onClick={onHome}><Store size={21} /><span>{t('Mi negocio')}</span></button>
        <button onClick={() => hostArea('.host-experiences')}><BookOpen size={21} /><span>{t('Tus experiencias')}</span></button>
        <button onClick={() => hostArea('.host-dash-transfers')}><Wallet size={21} /><span>{t('Cobros')}</span></button>
        <button onClick={() => signal('tour')}><Compass size={21} /><span>{t('Guía')}</span></button>
        <button onClick={() => openAccount()}><UserRound size={21} /><span>{t('Yo')}</span></button>
      </> : <><button onClick={onHome} aria-current={!culture ? 'page' : undefined}><BookOpen size={21} /><span>{t(role.isHost ? 'Mi negocio' : 'Inicio')}</span></button><button data-tour="culture" onClick={onCulture}><Sparkles size={21} /><span>{t('Cultura Viva')}</span></button><button className="al-bottom-mijin" data-tour="mijin" onClick={() => signal('mijin')}><Mic size={23} /><span>MIJIN</span></button><button data-tour="envelope" onClick={onSaved}><Heart size={21} /><span>{t('Mi sobre')}</span></button><button data-tour="account" onClick={() => openAccount()}><UserRound size={21} /><span>{t('Yo')}</span></button>
</>}
    </nav>
  </>;
}
