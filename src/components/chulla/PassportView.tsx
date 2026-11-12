import { useMemo, useState } from 'react';
import { Check, ChevronRight, Crown, Fish, Flower2, Leaf, Mountain, Plus, ShieldCheck, Stamp, Waves } from 'lucide-react';
import { useApp, CURRENT_TRAVELER_EMAIL } from '../../context/AppContext';
import { useMembership } from '../../context/MembershipContext';
import { collectVerifiedStamps, type PassportStamp } from '../../lib/membership';
import { membershipLocale, translatePremium } from '../../i18n/premium';
import { Dialog } from './Dialog';
import type { Region } from '../../types';
import './premium.css';

const regionIcons = { Sierra: Mountain, Costa: Waves, Amazonía: Leaf, Galápagos: Fish };
const regions: Region[] = ['Sierra', 'Costa', 'Amazonía', 'Galápagos'];
const JOURNAL_KEY = 'chullavida:passport-demo:v1';
function readDemo(): PassportStamp[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(JOURNAL_KEY) || '[]');
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is PassportStamp => Boolean(item && typeof item === 'object' && typeof item.placeId === 'string' && typeof item.title === 'string' && regions.includes(item.region) && typeof item.date === 'string' && Number.isFinite(Date.parse(item.date)) && item.verified === false)).slice(0, 100);
  } catch { return []; }
}
export function PassportView({ onClose, onChoosePlans }: { onClose: () => void; onChoosePlans: () => void }) {
  const { places, reservations, language, role } = useApp();
  const { hasAccess } = useMembership();
  const premium = hasAccess('premium-passport');
  const [region, setRegion] = useState<Region>('Sierra');
  const [demoStamps, setDemoStamps] = useState(readDemo);
  const [selected, setSelected] = useState(places[0]?.id || '');
  const [latest, setLatest] = useState('');
  const [notice, setNotice] = useState('');
  const t = (source: string) => translatePremium(language, source);
  const verified = useMemo(() => collectVerifiedStamps(reservations, places, CURRENT_TRAVELER_EMAIL), [reservations, places]);
  const visibleDemo = demoStamps.filter(stamp => places.some(place => place.id === stamp.placeId) && !verified.some(actual => actual.placeId === stamp.placeId));
  const stamps = [...verified, ...visibleDemo];
  const regionStamps = stamps.filter(stamp => stamp.region === region);
  const RegionIcon = regionIcons[region];
  const tryStamp = () => {
    if (role !== 'turista') return;
    const place = places.find(place => place.id === selected);
    if (!place) return;
    setRegion(place.region); setLatest(place.id);
    const next = [...demoStamps.filter(stamp => stamp.placeId !== place.id), { placeId: place.id, title: place.titulo, region: place.region, date: new Date().toISOString(), verified: false }];
    setDemoStamps(next);
    try { localStorage.setItem(JOURNAL_KEY, JSON.stringify(next)); setNotice('Sello añadido a tu colección de prueba.'); } catch { setNotice('No se pudo guardar. Tu plan estará disponible solo durante esta sesión.'); }
  };
  const formatDate = (value: string) => new Intl.DateTimeFormat(membershipLocale[language], { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Guayaquil' }).format(new Date(value));
  return <Dialog title={t('Tu pasaporte de Ecuador')} onClose={onClose} wide>
    <div className={`passport-view ${premium ? 'is-premium' : ''}`}>
      <div className="passport-opening">
        <div className="passport-cover"><Flower2 size={40} aria-hidden="true" /><strong>CHULLA VIDA</strong><span>{t(premium ? 'Pasaporte premium' : 'Pasaporte básico')}</span><div className="passport-cover-landscape" aria-hidden="true"><Mountain /><Waves /><Leaf /><Fish /></div><small>ECUADOR</small>{premium && <Crown className="passport-cover-crown" size={23} aria-hidden="true" />}</div>
        <div className="passport-intro"><h3>{t('El país se llena de historias.')}</h3><p>{t('Un sello por cada lugar visitado.')}</p><div className="passport-counters"><span><ShieldCheck size={19} /><b>{verified.length}</b><small>{t('Visitas verificadas')}</small></span><span><Stamp size={19} /><b>{visibleDemo.length}</b><small>{t('Sellos de prueba')}</small></span></div><p className="passport-explainer">{t('Los sellos verificados aparecen al validar tu visita con el negocio.')}</p></div>
      </div>
      <div className="passport-region-picker" aria-label={t('Cuatro regiones. Tu propia colección.')}>{regions.map(item => { const Icon = regionIcons[item]; return <button key={item} className={`passport-region-${regions.indexOf(item)}`} aria-pressed={item === region} onClick={() => { setRegion(item); setLatest(''); }}><Icon size={19} /><span>{t(item)}</span><b>{stamps.filter(stamp => stamp.region === item).length}</b></button>; })}</div>
      <section className={`passport-pages passport-region-${regions.indexOf(region)}`} aria-label={t(region)}>
        <div className="passport-page-head"><RegionIcon size={29} /><h4>{t(region)}</h4>{premium && <span><Crown size={15} />{t('Colección regional premium')}</span>}</div>
        <div className="passport-stamps">{regionStamps.map(stamp => <article className={`passport-stamp ${stamp.verified ? 'verified' : 'demo'} ${latest === stamp.placeId ? 'is-new' : ''}`} key={`${stamp.placeId}-${latest === stamp.placeId ? stamp.date : 'saved'}`}>
          <div className="passport-stamp-seal"><RegionIcon size={31} aria-hidden="true" /><strong>{stamp.title}</strong><span>{formatDate(stamp.date)}</span></div><p>{stamp.verified ? <ShieldCheck size={14} /> : <Stamp size={14} />}{t(stamp.verified ? 'Verificado' : 'Sello de prueba')}</p>
        </article>)}{regionStamps.length === 0 && <div className="passport-empty"><Stamp size={42} /><strong>{t('Por descubrir')}</strong><p>{t('Tu próxima historia empieza aquí.')}</p></div>}</div>
      </section>
      <section className="passport-try"><h4><Stamp size={20} />{t('Probar sello')}</h4><div><label className="field-label" htmlFor="passport-place">{t('Elegir destino')}</label><select className="field" id="passport-place" value={selected} onChange={event => setSelected(event.target.value)}>{places.map(place => <option key={place.id} value={place.id} disabled={verified.some(stamp => stamp.placeId === place.id)}>{place.titulo}</option>)}</select><button className="button button-primary" disabled={!selected || verified.some(stamp => stamp.placeId === selected)} onClick={tryStamp}><Plus size={17} />{t('Probar sello')}</button></div><p>{t('La prueba no acredita una visita real ni entrega premios.')}</p></section>
      {!premium && <div className="passport-upgrade"><Crown size={27} /><div><strong>{t('Pasaporte premium')}</strong><p>{t('Con el plan anual, abre tu pasaporte premium y la colección por regiones.')}</p></div><button className="button button-outline" onClick={onChoosePlans}>{t('Ver planes')}<ChevronRight size={16} /></button></div>}
      {premium && <p className="passport-premium-note"><Check size={17} />{t('Solo en el plan anual')}</p>}
      <p role="status" className="membership-notice">{t(notice)}</p>
      {(language === 'ki' || language === 'ki-amz') && <p className="membership-language-note">{t('Traducción Kichwa de trabajo, pendiente de revisión comunitaria.')}</p>}
    </div>
  </Dialog>;
}
