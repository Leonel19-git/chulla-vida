import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Crown, FlaskConical, Users, WifiOff } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useMembership } from '../../context/MembershipContext';
import { MEMBERSHIP_PLANS, type PlanId, type PremiumFeature } from '../../lib/membership';
import { membershipLocale, translatePremium } from '../../i18n/premium';
import { Dialog } from './Dialog';
import { msg, useT } from '../../i18n/v3';
import { MembershipPaymentDemo } from '../../features/payments/MembershipPaymentDemo';
import './premium.css';
import './membership-checkout.css';

const PLAN_HINT: Record<PlanId, string> = {
  weekly: msg('Para una escapada.'), monthly: msg('Para seguir armando planes.'), annual: msg('Todo un año. También con pasaporte premium.'),
};
export function MembershipPlans({ onClose, feature, onActivated }: { onClose: () => void; feature?: PremiumFeature; onActivated?: () => void }) {
  const { language } = useApp();
  const { demoAvailable, subscription, isActive, plan, activateDemoPlan, cancelRenewal, storageError } = useMembership();
  const t = useT();
  const pt = (source: string) => translatePremium(language, source);
  const [selected, setSelected] = useState<PlanId>(() => plan?.id ?? (feature === 'premium-passport' ? 'annual' : 'monthly'));
  const [reviewing, setReviewing] = useState(false), [notice, setNotice] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const item = MEMBERSHIP_PLANS.find(value => value.id === selected)!;
  const unavailable = feature === 'premium-passport' && selected !== 'annual';
  const money = (amount: number) => new Intl.NumberFormat(membershipLocale[language], { style: 'currency', currency: 'USD' }).format(amount);
  const date = (value: string) => new Intl.DateTimeFormat(membershipLocale[language], { dateStyle: 'medium', timeZone: 'America/Guayaquil' }).format(new Date(value));
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [reviewing]);
  const select = (id: PlanId) => { setSelected(id); setNotice(''); };
  return <Dialog title={pt('Planes CHULLA VIDA')} onClose={onClose} wide>
    <div className={`membership-plans membership-commerce${reviewing ? ' is-reviewing' : ''}`}>
      <header className="plans-header">
        {reviewing && <button type="button" className="plans-back" onClick={() => setReviewing(false)}><ArrowLeft size={18}/>{t('Cambiar de plan')}</button>}
        <h3 ref={heading} tabIndex={-1}>{reviewing ? t('Revisa tu plan.') : pt('Un plan, más caminos.')}</h3>
        <p>{reviewing ? t('El importe y lo que incluye, antes de confirmar.') : t('Elige el tiempo. El destino lo pones tú.')}</p>
      </header>
      <div className="plans-layout">
        <section className="plans-options">
          {!reviewing ? <fieldset className="plans-picker"><legend>{t('Duración del plan')}</legend>{MEMBERSHIP_PLANS.map(option => {
            const active = isActive && subscription?.planId === option.id;
            return <label className={`plan-option${selected === option.id ? ' is-selected' : ''}`} key={option.id}>
              <input type="radio" name="membership-plan" value={option.id} checked={selected === option.id} onChange={() => select(option.id)}/>
              <span className="plan-option-copy"><span className="plan-option-name">{pt(option.label)}{option.id === 'annual' && <span className="plan-pro">PRO</span>}{active && <small>{pt('Plan actual')}</small>}</span><small>{t(PLAN_HINT[option.id])}</small></span>
              <span className="plan-option-price"><strong>{money(option.price)}</strong><small>{pt(option.period)}</small></span>
            </label>;
          })}</fieldset> : <MembershipPaymentDemo key={selected} planId={selected} amountCents={Math.round(item.price*100)} amountLabel={money(item.price)} onApproved={()=>{if(demoAvailable && !unavailable)activateDemoPlan(selected);}} onContinue={demoAvailable && feature ? onActivated ?? onClose : onClose}/>}
          {unavailable && <p role="status" className="plans-feature-note">{pt('Solo en el plan anual')}</p>}
        </section>
        <aside className="plan-order" aria-label={t('Resumen de tu plan')}>
          <div className="plan-order-heading"><h4>{t('Tu elección')}</h4><span>{pt(item.label)}</span></div>
          <ul className="plan-benefits">
            <li><WifiOff size={20} aria-hidden="true"/><span>{pt('Ruta sin internet')}<small>{t('Solo los datos que descargaste.')}</small></span><Check size={16} aria-hidden="true"/></li>
            <li><Users size={20} aria-hidden="true"/><span>{pt('Comunidad wambra')}</span><Check size={16} aria-hidden="true"/></li>
            <li><Crown size={20} aria-hidden="true"/><span>{pt(selected === 'annual' ? 'Pasaporte premium' : 'Pasaporte básico')}{selected === 'annual' && <small>{pt('Solo en el plan anual')}</small>}</span><Check size={16} aria-hidden="true"/></li>
          </ul>
          <dl className="plan-order-lines"><div><dt>{t('Duración')}</dt><dd>{pt(item.period)}</dd></div><div><dt>{t('Moneda')}</dt><dd>USD</dd></div></dl>
          <div className="plan-order-total"><span>{t('Total del periodo')}</span><strong>{money(item.price)}</strong></div>
          {reviewing ? <p className="plan-order-caption">{t('El pago se simula en el formulario. No se mueve dinero real.')}</p> : <><button className="plan-primary" onClick={() => { setReviewing(true); setNotice(''); }}>{t('Revisar este plan')}<ArrowRight size={18}/></button><small className="plan-order-caption">{t('Elegir un plan todavía no realiza un cobro.')}</small></>}
        </aside>
      </div>
      {!reviewing && <div className="plans-free"><Check size={19}/><p>{pt('Todos los viajeros tienen pasaporte básico. El premium es exclusivo del plan anual.')}</p></div>}
      {demoAvailable && subscription && <section className="membership-account" aria-label={pt('Historial de prueba')}>
        <div><strong>{pt(isActive ? 'Plan actual' : 'Tu plan ha vencido.')}{isActive && plan ? ` · ${pt(plan.label)}` : ''}</strong><span>{pt('Acceso hasta')} {date(subscription.expiresAt)}</span></div>
        {isActive && subscription.renewalEnabled && <button className="plans-back" onClick={() => { cancelRenewal(); setNotice('Renovación cancelada. Conservas el acceso hasta su vencimiento.'); }}>{pt('Cancelar renovación de prueba')}</button>}
      </section>}
      <p className="membership-notice" role="status">{pt(storageError ? 'No se pudo guardar. Tu plan estará disponible solo durante esta sesión.' : notice)}</p>
      <footer className="plans-footer">{!reviewing && <span><FlaskConical size={15}/>{t('Modo prueba · sin cobro real')}</span>}<button className="plans-back" onClick={onClose}>{t('Seguir explorando sin plan')}<ArrowRight size={16}/></button></footer>
      {(language === 'ki' || language === 'ki-amz') && <p className="membership-language-note">{pt('Traducción Kichwa de trabajo, pendiente de revisión comunitaria.')}</p>}
    </div>
  </Dialog>;
}
