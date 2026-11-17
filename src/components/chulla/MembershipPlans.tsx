import { useState } from 'react';
import { Check, CalendarDays, CreditCard, Crown, Globe2, ShieldCheck, Users, WifiOff } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useMembership } from '../../context/MembershipContext';
import { MEMBERSHIP_PLANS, type PremiumFeature } from '../../lib/membership';
import { membershipLocale, translatePremium } from '../../i18n/premium';
import { Dialog } from './Dialog';
import { useT } from '../../i18n/v3';
import './premium.css';

export function MembershipPlans({ onClose, feature, onActivated }: { onClose: () => void; feature?: PremiumFeature; onActivated?: () => void }) {
  const { language } = useApp();
  const { demoAvailable, subscription, isActive, plan, activateDemoPlan, cancelRenewal, storageError } = useMembership();
  const t = useT();
  const [notice, setNotice] = useState('');
  const pt = (source: string) => translatePremium(language, source);
  const money = (amount: number) => new Intl.NumberFormat(membershipLocale[language], { style: 'currency', currency: 'USD' }).format(amount);
  const date = (value: string) => new Intl.DateTimeFormat(membershipLocale[language], { dateStyle: 'medium', timeZone: 'America/Guayaquil' }).format(new Date(value));
  return <Dialog title={pt('Planes CHULLA VIDA')} onClose={onClose} wide>
    <div className="membership-plans">
      <div className="membership-lead"><Globe2 size={35} aria-hidden="true" /><h3>{pt('Un plan, más caminos.')}</h3><p>{pt(feature ? 'Elige un plan para abrir esta función.' : 'Viaja a tu ritmo.')}</p></div>
      {!demoAvailable && <p role="status" className="membership-demo"><ShieldCheck size={19} />{t("Cobros con tarjeta pendientes de activación")}</p>}
      <div className="membership-periods">
        {MEMBERSHIP_PLANS.map(item => {
          const active = isActive && subscription?.planId === item.id;
          const unavailable = feature === 'premium-passport' && item.id !== 'annual';
          return <article className={`membership-period ${item.id === 'annual' ? 'annual' : ''} ${active ? 'is-current' : ''}`} key={item.id}>
            <div className="membership-period-heading">{item.id === 'annual' ? <Crown size={25} /> : <CalendarDays size={25} />}<h4>{pt(item.label)}</h4></div>
            <p className="membership-price">{money(item.price)}<span>/ {pt(item.period)}</span></p>
            <ul><li><Check size={16} /><WifiOff size={16} />{pt('Ruta sin internet')}</li><li><Check size={16} /><Users size={16} />{pt('Comunidad wambra')}</li><li><Check size={16} /><ShieldCheck size={16} />{pt(item.id === 'annual' ? 'Pasaporte premium' : 'Pasaporte básico')}</li></ul>
            {item.id === 'annual' && <p className="membership-annual-note">{pt('Solo en el plan anual')}</p>}
            <button className={`button ${item.id === 'annual' ? 'membership-gold-button' : 'button-primary'}`} disabled={!demoAvailable || active || unavailable} aria-label={`${!demoAvailable ? t('Próximamente') : pt(unavailable ? 'Solo en el plan anual' : active ? 'Plan actual' : 'Activar plan de prueba')} · ${pt(item.label)} · ${money(item.price)}`} onClick={() => { if (activateDemoPlan(item.id)) { setNotice('Plan activado en este navegador.'); if (feature) (onActivated || onClose)(); } }}>
              {active ? <Check size={16} /> : <CreditCard size={16} />}{!demoAvailable ? t('Próximamente') : pt(unavailable ? 'Solo en el plan anual' : active ? 'Plan actual' : 'Activar plan de prueba')}
            </button>
          </article>;
        })}
      </div>
      <p className="membership-basic-note">{pt('Todos los viajeros tienen pasaporte básico. El premium es exclusivo del plan anual.')}</p>
      <p className="membership-demo"><ShieldCheck size={19} />{pt('Demostración local: sin cobros ni renovación automática. Al cambiar de plan, el nuevo periodo empieza hoy.')}</p>
      {subscription && <section className="membership-account" aria-label={pt('Historial de prueba')}>
        <div><strong>{pt(isActive ? 'Plan actual' : 'Tu plan ha vencido.')}{isActive && plan ? ` · ${pt(plan.label)}` : ''}</strong><span>{pt('Acceso hasta')} {date(subscription.expiresAt)}</span><span>{subscription.renewalEnabled && isActive ? `${pt('Próxima renovación simulada')}: ${date(subscription.expiresAt)}` : pt('Sin renovación')}</span></div>
        {isActive && subscription.renewalEnabled && <button className="button button-outline" onClick={() => { cancelRenewal(); setNotice('Renovación cancelada. Conservas el acceso hasta su vencimiento.'); }}>{pt('Cancelar renovación de prueba')}</button>}
      </section>}
      <p className="membership-notice" role="status">{pt(storageError ? 'No se pudo guardar. Tu plan estará disponible solo durante esta sesión.' : notice)}</p>
      {(language === 'ki' || language === 'ki-amz') && <p className="membership-language-note">{pt('Traducción Kichwa de trabajo, pendiente de revisión comunitaria.')}</p>}
    </div>
  </Dialog>;
}
