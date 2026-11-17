import { useEffect, useId, useMemo, useState, type FormEvent } from 'react';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { ArrowRight, BookOpen, Compass, Crown, CreditCard, DownloadCloud, IdCard, LogOut, PartyPopper, Save, ShoppingBag, Users, Wallet } from 'lucide-react';
import { readTravelPreferences } from '../onboarding/WelcomeFlow';
import { CedulaField, documentValidity, type DocumentValue } from '../payments/CedulaField';
import { useWallet } from '../wallet/store';
import { experiences } from '../../domain/catalog';
import { PRIVACY_VERSION } from '../auth/auth-flow';
import { useMembership } from '../../context/MembershipContext';
import { SIGNUP_IDENTITY_EVENT } from '../../domain/identity';
import {
  BOOKING_STATUS, INTEREST_IDS, INTEREST_LABELS, PAYMENT_STATUS, PROFILE_LIMITS, cardLabel, closeContainingDialog, emptyPreferences, formatMoney,
  loadPurchases, loadTravelerDocument, loadTravelerProfile, loadVerifiedStamps, preferencesFromOnboarding, profileProblems, saveMarketingChoice, saveTravelerDocument,
  saveTravelerProfile, type BookingRow, type PaymentRow, type TravelerPreferences, type TravelerProfile as Profile,
} from './profile';
import './traveler.css';

import { useT, tr } from '../../i18n/v3';
const COUNTRIES = ['Ecuador', 'Colombia', 'Perú', 'Venezuela', 'Chile', 'Argentina', 'México', 'Estados Unidos', 'Canadá', 'España', 'Alemania', 'Francia', 'Italia', 'Reino Unido', 'Países Bajos', 'Brasil'];
type Load = 'loading' | 'ready' | 'error';
/** La membresía es opcional aquí: fuera de MembershipProvider (pruebas, vistas sueltas) el perfil se ve sin PRO. */
function useOptionalMembership() {
  // El hook se llama siempre y en el mismo orden; el try solo atrapa el error de «falta el proveedor».
  // eslint-disable-next-line react-hooks/rules-of-hooks
  try { return useMembership(); } catch { return null; }
}

export interface TravelerProfileProps {
  client: SupabaseClient;
  session: Session;
  /** Nombre que escribió al registrarse: muestra la bienvenida. */
  welcomeName?: string | null;
  onSignOut: () => void;
  busy?: boolean;
}

export function TravelerProfile({ client, session, welcomeName, onSignOut, busy: parentBusy = false }: TravelerProfileProps) {
  const t = useT();
  const ids = useId();
  const userId = session.user.id;
  const email = session.user.email ?? '';
  const metadataName = typeof session.user.user_metadata?.display_name === 'string' ? session.user.user_metadata.display_name as string : '';
  const onboarding = useMemo(() => readTravelPreferences(), []);
  const wallet = useWallet();
  const membership = useOptionalMembership();
  const pro = Boolean(membership?.isActive);
  const benefits = pro && membership ? [
    { id: 'offline', icon: DownloadCloud, label: t("Sin conexión"), on: membership.hasAccess('offline') },
    { id: 'community', icon: Users, label: t("Comunidad"), on: membership.hasAccess('community') },
    { id: 'premium-passport', icon: BookOpen, label: t("Pasaporte premium"), on: membership.hasAccess('premium-passport') },
  ].filter(item => item.on) : [];
  const [load, setLoad] = useState<Load>('loading');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [preferences, setPreferences] = useState<TravelerPreferences>(emptyPreferences);
  const [documentValue, setDocumentValue] = useState<DocumentValue>({ type: 'cedula', number: '' });
  const [editingDocument, setEditingDocument] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [noticeScope, setNoticeScope] = useState<'profile' | 'document' | 'marketing'>('profile');
  const [purchases, setPurchases] = useState<{ bookings: BookingRow[]; payments: PaymentRow[] } | null>(null);
  const [purchaseError, setPurchaseError] = useState(false);
  const [verifiedCount, setVerifiedCount] = useState<number | null>(null);
  const [loadRevision, setLoadRevision] = useState(0);

  useEffect(() => {
    let active = true;
    loadTravelerProfile(client, userId, metadataName).then(value => {
      if (!active) return;
      const fromOnboarding = preferencesFromOnboarding(onboarding);
      const hasServerPreferences = value.preferences.interests.length > 0 || value.preferences.budgetTotalUsd !== null || value.preferences.travelers > 1 || value.preferences.pet;
      setProfile(value); setName(value.displayName); setCountry(value.homeCountry); setCity(value.homeCity || (onboarding?.origin ?? '').slice(0, PROFILE_LIMITS.homeCity));
      setPreferences(hasServerPreferences ? value.preferences : fromOnboarding); setMarketing(value.marketing); setEditingDocument(!value.document); setLoad('ready');
    }).catch(() => { if (active) setLoad('error'); });
    loadPurchases(client).then(value => { if (active) setPurchases(value); }).catch(() => { if (active) setPurchaseError(true); });
    loadVerifiedStamps(client, userId).then(rows => { if (active) setVerifiedCount(rows.length); }).catch(() => { if (active) setVerifiedCount(null); });
    return () => { active = false; };
  }, [client, userId, metadataName, onboarding, loadRevision]);

  useEffect(() => {
    let active = true;
    const update = (event: Event) => {
      if (!(event as CustomEvent<{ saved: boolean }>).detail?.saved) {
        setNoticeScope('document');
        setNotice({ tone: 'info', text: tr('Tu cuenta está activa. No se guardó la cédula; puedes añadirla aquí.') });
        return;
      }
      void loadTravelerDocument(client, userId).then(document => {
        if (!active || !document) return;
        setProfile(value => value ? { ...value, document } : value); setEditingDocument(false);
      }).catch(() => undefined);
    };
    window.addEventListener(SIGNUP_IDENTITY_EVENT, update);
    return () => { active = false; window.removeEventListener(SIGNUP_IDENTITY_EVENT, update); };
  }, [client, userId]);

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (busy || parentBusy) return;
    setNoticeScope('profile');
    const problems = profileProblems({ displayName: name, homeCountry: country, homeCity: city });
    if (problems.length) { setNotice({ tone: 'error', text: problems.join(' ') }); return; }
    setBusy(true); setNotice(null);
    try {
      const outcome = await saveTravelerProfile(client, userId, { displayName: name, homeCountry: country, homeCity: city, preferences });
      setNotice(outcome === 'saved' ? { tone: 'success', text: tr("¡Listo! Tu perfil quedó guardado en tu cuenta.") }
        : { tone: 'info', text: tr("Guardamos tu nombre. País, ciudad y preferencias se guardarán cuando el servidor tenga la última actualización.") });
    } catch { setNotice({ tone: 'error', text: tr("No se pudo guardar tu perfil. Revisa tu conexión y vuelve a intentarlo.") }); }
    finally { setBusy(false); }
  }
  async function saveDocument() {
    if (busy || parentBusy) return;
    setNoticeScope('document');
    const validity = documentValidity(documentValue);
    if (!validity.valid) { setNotice({ tone: 'error', text: tr("Revisa el documento: el formato todavía no es válido.") }); return; }
    setBusy(true); setNotice(null);
    try {
      const saved = await saveTravelerDocument(client, documentValue.type, documentValue.number);
      setProfile(value => value ? { ...value, document: saved } : value);
      setDocumentValue({ type: documentValue.type, number: '' }); setEditingDocument(false);
      setNotice({ tone: 'success', text: tr("Documento guardado. Solo conservamos los últimos 4: {last4}.", { last4: saved.last4 }) });
    } catch { setDocumentValue(value => ({ ...value, number: '' })); setNotice({ tone: 'error', text: tr("No se pudo guardar el documento. Escríbelo de nuevo cuando tengas conexión.") }); }
    finally { setBusy(false); }
  }
  async function toggleMarketing(next: boolean) {
    if (busy || parentBusy) return;
    setNoticeScope('marketing');
    setBusy(true); setNotice(null);
    try { await saveMarketingChoice(client, next, PRIVACY_VERSION); setMarketing(next); setNotice({ tone: 'success', text: next ? tr("Te escribiremos con novedades, fiestas y ofertas. Puedes darte de baja cuando quieras.") : tr("Listo: ya no te enviaremos novedades ni ofertas por correo.") }); }
    catch { setNotice({ tone: 'error', text: tr("No se pudo guardar tu preferencia de correos. Vuelve a intentarlo.") }); }
    finally { setBusy(false); }
  }
  const toggleInterest = (id: (typeof INTEREST_IDS)[number]) => setPreferences(value => ({ ...value, interests: value.interests.includes(id) ? value.interests.filter(item => item !== id) : [...value.interests, id] }));
  const openFromAccount = (target: HTMLElement, event: 'passport' | 'wallet') => {
    // La billetera reemplaza el panel; el pasaporte vive en otra capa, así que primero cerramos la cuenta.
    if (event === 'passport') closeContainingDialog(target);
    window.dispatchEvent(new Event(`cv3:${event}`));
  };
  const explore = (target: HTMLElement) => {
    closeContainingDialog(target);
    setTimeout(() => document.getElementById('experiencias')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }), 60);
  };

  const testPurchases = wallet.filter(record => record.kind === 'test_purchase' && record.status !== 'cancelled');
  const requests = wallet.filter(record => record.kind === 'request' && record.status === 'requested');
  const shownName = name.trim() || metadataName || email.split('@')[0] || 'Viajero';
  const working = busy || parentBusy;
  const noticeView = notice && <p className={`auth-notice auth-notice-${notice.tone}`} role={notice.tone === 'error' ? 'alert' : 'status'}>{notice.text}</p>;

  return <div className="traveler" aria-busy={working}>
    {welcomeName !== undefined && welcomeName !== null && <div className="traveler-welcome" role="status"><PartyPopper size={26} aria-hidden="true" /><div>
      <strong>{t("¡Qué bacán tenerte aquí")}{welcomeName ? `, ${welcomeName}` : ''}!</strong>
      <p>{t("Tu cuenta ya está activa.")}</p></div></div>}
    <header className={`traveler-card${pro ? ' is-pro' : ''}`}>
      <span className="traveler-avatar" aria-hidden="true">{shownName.slice(0, 1).toUpperCase()}</span>
      <div><h3>{shownName}{pro && <span className="traveler-pro" aria-label={t("Plan PRO activo")}><Crown size={13} aria-hidden="true" />PRO</span>}</h3><p>{email}</p>
        <span className="traveler-badge"><Compass size={14} aria-hidden="true" />{t("Cuenta de viajero")}{pro && membership?.plan ? t(" · {label} de prueba", { label: membership.plan.label }) : ''}</span></div>
      <button type="button" className="button button-secondary traveler-signout" disabled={working} onClick={onSignOut}><LogOut size={16} />{t("Cerrar sesión")}</button>
      {benefits.length > 0 && <ul className="traveler-benefits" aria-label={t("Beneficios PRO")}>{benefits.map(({ id, icon: Icon, label }) => <li key={id}><Icon size={18} aria-hidden="true" />{label}</li>)}</ul>}
    </header>

    <nav className="traveler-shortcuts" aria-label={t("Accesos de tu cuenta")}>
      <button type="button" onClick={() => document.getElementById(`${ids}-purchases`)?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })}><ShoppingBag size={20} aria-hidden="true" /><span><strong>{t("Mis compras y reservas")}</strong><small>{purchases ? t("{v} registradas", { v: purchases.bookings.length + testPurchases.length }) : t("Cargando…")}</small></span></button>
      <button type="button" onClick={event => openFromAccount(event.currentTarget, 'passport')}><BookOpen size={20} aria-hidden="true" /><span><strong>{t("Mi pasaporte")}</strong><small>{verifiedCount === null ? t("Tus sellos y logros") : `${verifiedCount} ${verifiedCount === 1 ? 'visita verificada' : 'visitas verificadas'}`}</small></span></button>
      <button type="button" onClick={event => openFromAccount(event.currentTarget, 'wallet')}><Wallet size={20} aria-hidden="true" /><span><strong>{t("Mi billetera")}</strong><small>{wallet.length ? t("{length} en este dispositivo", { length: wallet.length }) : t("Comprobantes y QR")}</small></span></button>
    </nav>

    {load === 'loading' && <p className="traveler-loading" role="status"><span className="cv-skeleton" />{t("Cargando tu perfil…")}</p>}
    {load === 'error' && <div className="auth-notice auth-notice-error" role="alert"><p>{t('No pudimos cargar tu perfil. Tu sesión sigue abierta.')}</p><button type="button" className="button button-secondary" onClick={() => { setLoad('loading'); setLoadRevision(value => value + 1); }}>{t('Volver a cargar')}</button></div>}
    {load === 'ready' && profile && <>
      <form className="traveler-section auth-form" onSubmit={saveProfile} aria-labelledby={`${ids}-profile`}>
        <h3 id={`${ids}-profile`}>{t("Tu perfil viajero")}</h3>
        <fieldset className="traveler-edit" disabled={working}><legend className="sr-only">{t('Datos y preferencias')}</legend>
        <div className="auth-field"><label htmlFor={`${ids}-name`}>{t("Nombre visible")}</label><input id={`${ids}-name`} className="field" autoComplete="nickname" maxLength={PROFILE_LIMITS.displayName} value={name} onChange={event => setName(event.target.value)} required /></div>
        <div className="traveler-two">
          <div className="auth-field"><label htmlFor={`${ids}-country`}>{t("País de origen")}</label><input id={`${ids}-country`} className="field" list={`${ids}-countries`} autoComplete="country-name" maxLength={PROFILE_LIMITS.homeCountry} value={country} onChange={event => setCountry(event.target.value)} placeholder={t("Ecuador")} /><datalist id={`${ids}-countries`}>{COUNTRIES.map(item => <option key={item} value={item} />)}</datalist></div>
          <div className="auth-field"><label htmlFor={`${ids}-city`}>{t("Ciudad de origen")}</label><input id={`${ids}-city`} className="field" autoComplete="address-level2" maxLength={PROFILE_LIMITS.homeCity} value={city} onChange={event => setCity(event.target.value)} placeholder={t("Quito, Guayaquil, Cuenca…")} /></div>
        </div>
        <fieldset className="traveler-prefs"><legend>{t("¿Qué te mueve al viajar?")}</legend>
          <div className="traveler-chips">{INTEREST_IDS.map(id => <label key={id} className={preferences.interests.includes(id) ? 'is-on' : ''}><input type="checkbox" checked={preferences.interests.includes(id)} onChange={() => toggleInterest(id)} />{INTEREST_LABELS[id]}</label>)}</div>
          <div className="traveler-two">
            <div className="auth-field"><label htmlFor={`${ids}-people`}>{t("¿Cuántas personas suelen viajar?")}</label><input id={`${ids}-people`} className="field" type="number" inputMode="numeric" min={1} max={30} value={preferences.travelers} onChange={event => setPreferences(value => ({ ...value, travelers: Math.min(30, Math.max(1, Math.round(Number(event.target.value) || 1))) }))} /></div>
            <div className="auth-field"><label htmlFor={`${ids}-budget`}>{t("Presupuesto total por viaje (USD, opcional)")}</label><input id={`${ids}-budget`} className="field" type="number" inputMode="numeric" min={1} max={100000} value={preferences.budgetTotalUsd ?? ''} onChange={event => { const value = Math.round(Number(event.target.value)); setPreferences(current => ({ ...current, budgetTotalUsd: Number.isFinite(value) && value > 0 ? Math.min(100000, value) : null })); }} /></div>
          </div>
          <label className="auth-check"><input type="checkbox" checked={preferences.pet} onChange={event => setPreferences(value => ({ ...value, pet: event.target.checked }))} /><span>{t("Viajo con mascota")}</span></label>
          {onboarding?.completed && <p className="auth-fine">{t("Precargado desde la bienvenida.")}</p>}
        </fieldset>
        <button className="button button-primary" disabled={working}><Save size={16} />{busy ? t("Guardando…") : t("Guardar mi perfil")}</button>
        </fieldset>
        {noticeScope === 'profile' && noticeView}
      </form>

      <section className="traveler-section" aria-labelledby={`${ids}-doc`}>
        <h3 id={`${ids}-doc`}><IdCard size={20} aria-hidden="true" />{t("Cédula o pasaporte")}</h3>
        <p className="auth-fine">{t('Identidad por verificar. Solo conservamos los últimos cuatro.')}</p>
        {profile.document && !editingDocument ? <div className="traveler-doc"><span>{profile.document.type === 'cedula' ? t("Cédula") : t("Pasaporte")} <strong>•••• {profile.document.last4}</strong></span><button type="button" className="text-button" disabled={working} onClick={() => setEditingDocument(true)}>{t("Cambiar")}</button></div>
          : <><CedulaField value={documentValue} onChange={setDocumentValue} disabled={working} />
            <div className="auth-actions"><button type="button" className="button button-secondary" disabled={working || !documentValidity(documentValue).valid} onClick={() => void saveDocument()}>{t("Guardar documento")}</button>
              {profile.document && <button type="button" className="text-button" disabled={working} onClick={() => { setEditingDocument(false); setDocumentValue({ type: 'cedula', number: '' }); }}>{t("Cancelar")}</button>}</div></>}
        {noticeScope === 'document' && noticeView}
      </section>

      <section className="traveler-section" aria-labelledby={`${ids}-mail`}>
        <h3 id={`${ids}-mail`}>{t("Correos de novedades")}</h3>
        <label className="auth-check"><input type="checkbox" checked={marketing} disabled={working} onChange={event => void toggleMarketing(event.target.checked)} /><span>{t("Quiero recibir novedades, fiestas y ofertas por correo. Opcional.")}</span></label>
        {noticeScope === 'marketing' && noticeView}
      </section>
    </>}

    <section className="traveler-section" id={`${ids}-purchases`} aria-labelledby={`${ids}-purchases-title`}>
      <h3 id={`${ids}-purchases-title`}><ShoppingBag size={20} aria-hidden="true" />{t("Mis compras y reservas")}</h3>
      {purchaseError && <p className="auth-notice auth-notice-error" role="alert">{t("No pudimos cargar tus reservas en línea. Las compras de prueba de este dispositivo siguen abajo.")}</p>}
      {!purchases && !purchaseError && <p className="traveler-loading" role="status"><span className="cv-skeleton" />{t("Buscando tus reservas…")}</p>}
      {purchases && purchases.bookings.length > 0 && <ul className="traveler-list">{purchases.bookings.map(booking => {
        const payment = purchases.payments.find(item => item.booking_id === booking.id);
        const card = payment ? cardLabel(payment.card_brand, payment.card_last4) : null;
        return <li key={booking.id}><div><strong>{experiences.find(item => item.id === booking.experience_id)?.title ?? booking.experience_id}</strong><small>{t("Reserva")}{' '}{booking.code} · {booking.participants} {booking.participants === 1 ? 'persona' : 'personas'}</small></div>
          <div className="traveler-list-meta"><span className="traveler-pill">{BOOKING_STATUS[booking.status] ?? booking.status}</span><span>{formatMoney(booking.total_amount, booking.currency)}</span>
            {payment && <small>{PAYMENT_STATUS[payment.status] ?? payment.status}{card ? <> · <CreditCard size={13} aria-hidden="true" /> {card}</> : null}{payment.environment === 'sandbox' ? t(" · entorno de pruebas") : ''}</small>}</div></li>;
      })}</ul>}
      {testPurchases.length > 0 && <><h4 className="traveler-subtitle">{t("Compras de prueba en este dispositivo")}</h4><ul className="traveler-list">{testPurchases.slice(0, 20).map(record => <li key={record.id}><div><strong>{record.title}</strong><small>{record.code} · {record.date || 'fecha por elegir'}</small></div><div className="traveler-list-meta"><span className="traveler-pill is-test">{t("Prueba · sin cobro")}</span>{record.totalCents !== null && <span>{formatMoney(record.totalCents / 100, record.currency)}</span>}</div></li>)}</ul></>}
      {requests.length > 0 && <p className="auth-fine">{requests.length} {requests.length === 1 ? t("solicitud de cotización enviada") : t("solicitudes de cotización enviadas")}{' '}{t("desde este dispositivo.")}</p>}
      {purchases && purchases.bookings.length === 0 && testPurchases.length === 0 && <div className="traveler-empty"><ShoppingBag size={34} aria-hidden="true" /><p><strong>{t("Todavía no tienes compras ni reservas.")}</strong></p>
        <button type="button" className="button button-primary" onClick={event => explore(event.currentTarget)}>{t("Explorar experiencias")}<ArrowRight size={16} /></button></div>}
    </section>
  </div>;
}
