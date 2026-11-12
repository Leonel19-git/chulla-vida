import { useState } from 'react';
import { Check, CalendarDays, CreditCard, Crown, Globe2, ShieldCheck, Users, WifiOff } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useMembership } from '../../context/MembershipContext';
import { MEMBERSHIP_PLANS, type PremiumFeature } from '../../lib/membership';
import { membershipLocale, translatePremium } from '../../i18n/premium';
import { Dialog } from './Dialog';
import './premium.css';

export function MembershipPlans({ onClose, feature, onActivated }: { onClose: () => void; feature?: PremiumFeature; onActivated?: () => void }) {
  const { language } = useApp();
  const { subscription, isActive, plan, activateDemoPlan, cancelRenewal, storageError } = useMembership();
  const [notice, setNotice] = useState('');
  const t = (source: string) => translatePremium(language, source);
  const money = (amount: number) => new Intl.NumberFormat(membershipLocale[language], { style: 'currency', currency: 'USD' }).format(amount);
  const date = (value: string) => new Intl.DateTimeFormat(membershipLocale[language], { dateStyle: 'medium', timeZone: 'America/Guayaquil' }).format(new Date(value));
  return <Dialog title={t('Planes CHULLA VIDA')} onClose={onClose} wide>
    <div className="membership-plans">
      <div className="membership-lead"><Globe2 size={35} aria-hidden="true" /><h3>{t('Un plan, más caminos.')}</h3><p>{t(feature ? 'Elige un plan para abrir esta función.' : 'Viaja a tu ritmo.')}</p></div>
      <div className="membership-periods">
        {MEMBERSHIP_PLANS.map(item => {
          const active = isActive && subscription?.planId === item.id;
          const unavailable = feature === 'premium-passport' && item.id !== 'annual';
          return <article className={`membership-period ${item.id === 'annual' ? 'annual' : ''} ${active ? 'is-current' : ''}`} key={item.id}>
            <div className="membership-period-heading">{item.id === 'annual' ? <Crown size={25} /> : <CalendarDays size={25} />}<h4>{t(item.label)}</h4></div>
            <p className="membership-price">{money(item.price)}<span>/ {t(item.period)}</span></p>
            <ul><li><Check size={16} /><WifiOff size={16} />{t('Ruta sin internet')}</li><li><Check size={16} /><Users size={16} />{t('Comunidad wambra')}</li><li><Check size={16} /><ShieldCheck size={16} />{t(item.id === 'annual' ? 'Pasaporte premium' : 'Pasaporte básico')}</li></ul>
            {item.id === 'annual' && <p className="membership-annual-note">{t('Solo en el plan anual')}</p>}
            <button className={`button ${item.id === 'annual' ? 'membership-gold-button' : 'button-primary'}`} disabled={active || unavailable} aria-label={`${t(unavailable ? 'Solo en el plan anual' : active ? 'Plan actual' : 'Activar plan de prueba')} · ${t(item.label)} · ${money(item.price)}`} onClick={() => { if (activateDemoPlan(item.id)) { setNotice('Plan activado en este navegador.'); if (feature) (onActivated || onClose)(); } }}>
              {active ? <Check size={16} /> : <CreditCard size={16} />}{t(unavailable ? 'Solo en el plan anual' : active ? 'Plan actual' : 'Activar plan de prueba')}
            </button>
          </article>;
        })}
      </div>
      <p className="membership-basic-note">{t('Todos los viajeros tienen pasaporte básico. El premium es exclusivo del plan anual.')}</p>
      <p className="membership-demo"><ShieldCheck size={19} />{t('Demostración local: sin cobros ni renovación automática. Al cambiar de plan, el nuevo periodo empieza hoy.')}</p>
      {subscription && <section className="membership-account" aria-label={t('Historial de prueba')}>
        <div><strong>{t(isActive ? 'Plan actual' : 'Tu plan ha vencido.')}{isActive && plan ? ` · ${t(plan.label)}` : ''}</strong><span>{t('Acceso hasta')} {date(subscription.expiresAt)}</span><span>{subscription.renewalEnabled && isActive ? `${t('Próxima renovación simulada')}: ${date(subscription.expiresAt)}` : t('Sin renovación')}</span></div>
        {isActive && subscription.renewalEnabled && <button className="button button-outline" onClick={() => { cancelRenewal(); setNotice('Renovación cancelada. Conservas el acceso hasta su vencimiento.'); }}>{t('Cancelar renovación de prueba')}</button>}
      </section>}
      <p className="membership-notice" role="status">{t(storageError ? 'No se pudo guardar. Tu plan estará disponible solo durante esta sesión.' : notice)}</p>
      {(language === 'ki' || language === 'ki-amz') && <p className="membership-language-note">{t('Traducción Kichwa de trabajo, pendiente de revisión comunitaria.')}</p>}
    </div>
  </Dialog>;
}
