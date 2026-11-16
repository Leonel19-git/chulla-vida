import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowLeft, Check, Eye, EyeOff, KeyRound, LogIn, Mail, MailCheck, RefreshCw, ShieldCheck, Sparkles, UserPlus, X } from 'lucide-react';
import {
  DEMO_CODE, LEGAL_IS_DRAFT, MAX_LOCAL_ATTEMPTS, MAX_RESENDS, OTP_LENGTH, PASSWORD_MAX, PASSWORD_MIN, RESEND_COOLDOWN_SECONDS, TERMS_LABEL,
  PASSWORD_HINT, isEmail, isStrongPassword, passwordRules, translateAuthError, type AuthAction,
} from './auth-flow';
import type { AuthGateway, CodePurpose, GatewayResult } from './auth-gateway';
import { OtpInput } from './OtpInput';

import { useT, tr, msg } from '../../i18n/v3';
export type AccessTab = 'login' | 'signup' | 'recovery';
type Tab = AccessTab;
type Step = { kind: 'form' } | { kind: 'code'; purpose: CodePurpose } | { kind: 'new-password' } | { kind: 'done'; title: string; text: string };
type Notice = { tone: 'info' | 'error' | 'success'; text: string } | null;

export interface AccessFlowProps {
  gateway: AuthGateway;
  /** Opens directly on "choose a new password" (recovery link or PASSWORD_RECOVERY event). */
  startWithNewPassword?: boolean;
  onRecoveryVerified?: () => void;
  onPasswordUpdated?: () => void;
  /** Pestaña inicial (por ejemplo «Crear cuenta» si la persona tocó ese botón). */
  initialTab?: AccessTab;
  /** Se llama cuando el registro termina con sesión abierta (código correcto o confirmación desactivada). */
  onSignedUp?: (displayName: string) => void;
}

function useCountdown() {
  const [until, setUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (until <= Date.now()) return;
    const timer = window.setInterval(() => { const current = Date.now(); setNow(current); if (current >= until) window.clearInterval(timer); }, 1000);
    return () => window.clearInterval(timer);
  }, [until]);
  const remaining = Math.max(0, Math.ceil((until - now) / 1000));
  return { remaining, start: () => { const current = Date.now(); setNow(current); setUntil(current + RESEND_COOLDOWN_SECONDS * 1000); } };
}

const tabLabels: Record<Tab, string> = { login: msg('Entrar'), signup: msg('Crear cuenta'), recovery: msg('Recuperar acceso') };
const codeCopy: Record<CodePurpose, { title: string; lead: string }> = {
  signup: { title: msg('Te enviamos un código a tu correo'), lead: msg('Escríbelo para activar tu cuenta.') },
  login: { title: msg('Te enviamos un código para entrar'), lead: msg('Si el correo tiene una cuenta, te llegó.') },
  recovery: { title: msg('Te enviamos un código para recuperar tu acceso'), lead: msg('Si el correo tiene una cuenta, te llegó. Luego eliges tu contraseña.') },
};

export function AccessFlow({ gateway, startWithNewPassword, onRecoveryVerified, onPasswordUpdated, initialTab = 'login', onSignedUp }: AccessFlowProps) {
  const t = useT();
  const ids = useId();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [step, setStep] = useState<Step>(startWithNewPassword ? { kind: 'new-password' } : { kind: 'form' });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [terms, setTerms] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [code, setCode] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [resends, setResends] = useState(0);
  const [sentAt, setSentAt] = useState(0);
  const countdown = useCountdown();
  const heading = useRef<HTMLHeadingElement>(null);
  const inFlight = useRef(false);

  // A PASSWORD_RECOVERY event can arrive while the flow is open: adjust the step during render, not in an effect.
  const [recoverySeen, setRecoverySeen] = useState(Boolean(startWithNewPassword));
  if (Boolean(startWithNewPassword) !== recoverySeen) {
    setRecoverySeen(Boolean(startWithNewPassword));
    if (startWithNewPassword && step.kind !== 'new-password') setStep({ kind: 'new-password' });
  }
  useEffect(() => { if (step.kind !== 'form') heading.current?.focus(); }, [step.kind]);

  const rules = passwordRules(password, email);
  const strong = isStrongPassword(password, email);
  const emailOk = isEmail(email);

  async function run(action: AuthAction, task: () => Promise<GatewayResult>, onOk: (result: GatewayResult) => void) {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setNotice(null);
    try {
      const result = await task();
      if (result.error) setNotice({ tone: 'error', text: translateAuthError(result.error, action, { sentAt }) });
      else onOk(result);
    } finally { inFlight.current = false; setBusy(false); }
  }
  const toCode = (purpose: CodePurpose, extra?: string) => {
    setCode(''); setAttempts(0); setResends(0); setSentAt(Date.now()); countdown.start(); setPassword('');
    setStep({ kind: 'code', purpose });
    setNotice({ tone: 'info', text: `Código enviado a ${email.trim()}. Revisa también «No deseado» o «Promociones».${extra ? ` ${extra}` : ''}` });
  };

  function submitForm(event: FormEvent) {
    event.preventDefault();
    if (!emailOk) { setNotice({ tone: 'error', text: tr("Escribe un correo válido, por ejemplo nombre@correo.com.") }); return; }
    if (tab === 'signup') {
      if (!strong) { setNotice({ tone: 'error', text: tr("La contraseña todavía no cumple todas las reglas de la lista.") }); return; }
      if (!terms) { setNotice({ tone: 'error', text: tr("Para crear la cuenta necesitas aceptar los Términos y la Política de privacidad.") }); return; }
      void run('signup', () => gateway.signUp({ email, password, displayName: name, marketing }), result => {
        if (result.signedIn) { void gateway.recordMarketingChoice(marketing); setPassword(''); onSignedUp?.(name.trim()); return; }
        toCode('signup', 'Si este correo ya tenía cuenta no llegará un código: en ese caso entra o recupera tu acceso.');
      });
    } else if (tab === 'recovery') {
      void run('recovery', () => gateway.requestRecoveryCode(email), () => toCode('recovery'));
    } else if (gateway.demo) {
      setNotice({ tone: 'info', text: tr("En la demostración no existen cuentas. Prueba «Crear cuenta» o «Entrar con un código» para ver el paso del código.") });
    } else {
      void run('login', () => gateway.signInWithPassword(email, password), () => { setPassword(''); setNotice({ tone: 'success', text: tr("Sesión iniciada. Tus permisos se comprueban en el servidor.") }); });
    }
  }
  function requestLoginCode() {
    if (!emailOk) { setNotice({ tone: 'error', text: tr("Primero escribe tu correo para enviarte el código.") }); return; }
    void run('login-code', () => gateway.requestLoginCode(email), () => toCode('login'));
  }
  function verify(token = code) {
    if (step.kind !== 'code' || busy) return;
    if (token.length !== OTP_LENGTH) { setNotice({ tone: 'error', text: `El código tiene ${OTP_LENGTH} números. Te faltan ${OTP_LENGTH - token.length}.` }); return; }
    if (attempts >= MAX_LOCAL_ATTEMPTS) { setNotice({ tone: 'error', text: tr("Demasiados intentos con este código. Pide uno nuevo con «Reenviar código».") }); return; }
    const purpose = step.purpose;
    void (async () => {
      if (inFlight.current) return;
      inFlight.current = true; setBusy(true); setNotice(null);
      try {
        const result = await gateway.verifyCode(email, token, purpose);
        if (result.error) {
          const used = attempts + 1; setAttempts(used); setCode('');
          const base = translateAuthError(result.error, 'verify', { sentAt });
          setNotice({ tone: 'error', text: used >= MAX_LOCAL_ATTEMPTS ? tr("Demasiados intentos con este código. Pide uno nuevo con «Reenviar código».") : base });
          return;
        }
        if (purpose === 'recovery') { onRecoveryVerified?.(); setPassword(''); setStep({ kind: 'new-password' }); setNotice({ tone: 'success', text: tr("Código correcto. Ahora elige tu contraseña nueva.") }); return; }
        if (purpose === 'signup') void gateway.recordMarketingChoice(marketing);
        if (gateway.demo) {
          setStep({ kind: 'done', title: purpose === 'signup' ? tr("¡Así se activa tu cuenta!") : tr("¡Así entras con un código!"),
            text: tr("Esto fue una demostración: no se creó ninguna cuenta, no se envió ningún correo y tu contraseña no se guardó. Cuando el servidor esté conectado, este mismo paso abrirá tu sesión de verdad.") });
          return;
        }
        if (purpose === 'signup') onSignedUp?.(name.trim());
        setNotice({ tone: 'success', text: purpose === 'signup' ? tr("¡Listo! Tu correo quedó confirmado y tu cuenta está activa.") : tr("Sesión iniciada con tu código.") });
      } finally { inFlight.current = false; setBusy(false); }
    })();
  }
  function resend() {
    if (step.kind !== 'code' || countdown.remaining > 0) return;
    if (resends >= MAX_RESENDS) { setNotice({ tone: 'error', text: tr("Ya pediste varios códigos. Espera unos minutos o revisa que el correo esté bien escrito.") }); return; }
    const purpose = step.purpose;
    void run('resend', () => gateway.resendCode(email, purpose), () => {
      setResends(value => value + 1); setAttempts(0); setCode(''); setSentAt(Date.now()); countdown.start();
      setNotice({ tone: 'info', text: tr("Te enviamos un código nuevo. Usa el más reciente: los anteriores dejan de valer.") });
    });
  }
  function savePassword(event: FormEvent) {
    event.preventDefault();
    if (!strong) { setNotice({ tone: 'error', text: tr("La contraseña todavía no cumple todas las reglas de la lista.") }); return; }
    void run('update-password', () => gateway.updatePassword(password), () => {
      setPassword('');
      if (gateway.demo) { setStep({ kind: 'done', title: tr("¡Así recuperas tu acceso!"), text: tr("Demostración terminada: no se cambió ninguna contraseña real.") }); return; }
      setStep({ kind: 'form' }); setTab('login'); onPasswordUpdated?.();
      setNotice({ tone: 'success', text: tr("Contraseña actualizada. Ya puedes usar tu cuenta.") });
    });
  }
  const back = () => { setStep({ kind: 'form' }); setCode(''); setNotice(null); };
  const restart = () => { setStep({ kind: 'form' }); setTab('signup'); setEmail(''); setName(''); setPassword(''); setTerms(false); setMarketing(false); setNotice(null); };

  const noticeView = notice && <p className={`auth-notice auth-notice-${notice.tone}`} role={notice.tone === 'error' ? 'alert' : 'status'}>{notice.text}</p>;
  const passwordField = (label: string, autoComplete: string, withRules: boolean) => <div className="auth-field">
    <label htmlFor={`${ids}-password`}>{label}</label>
    <div className="auth-password">
      <input id={`${ids}-password`} className="field" type={showPassword ? 'text' : 'password'} autoComplete={autoComplete} maxLength={PASSWORD_MAX}
        minLength={withRules ? PASSWORD_MIN : undefined} value={password} onChange={event => setPassword(event.target.value)} required
        aria-describedby={withRules ? `${ids}-rules` : undefined} aria-invalid={withRules && password.length > 0 && !strong ? true : undefined} />
      <button type="button" className="auth-eye" onClick={() => setShowPassword(value => !value)} aria-pressed={showPassword} aria-label={showPassword ? t("Ocultar contraseña") : t("Mostrar contraseña")}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
    </div>
    {withRules && <ul id={`${ids}-rules`} className="auth-rules" aria-label={t("Reglas de la contraseña")}>{rules.map(rule => <li key={rule.id} className={rule.ok ? 'is-ok' : ''}>
      <span aria-hidden="true">{rule.ok ? <Check size={14} /> : <X size={14} />}</span>{rule.label}<span className="sr-only">{rule.ok ? t(": cumplida") : t(": pendiente")}</span></li>)}</ul>}
    {withRules && <details className="auth-fine auth-password-hint"><summary>{t("Ver más")}</summary><p>{PASSWORD_HINT}</p></details>}
  </div>;

  let body: ReactNode;
  if (step.kind === 'code') {
    const copy = codeCopy[step.purpose];
    body = <div className="auth-code-step">
      <span className="auth-code-icon" aria-hidden="true"><MailCheck size={30} /></span>
      <h3 id={`${ids}-code-title`} ref={heading} tabIndex={-1}>{t(copy.title)}</h3>
      <p id={`${ids}-code-help`}>{t(copy.lead)} <strong>{email.trim()}</strong></p>
      {gateway.demo && <p className="auth-demo-hint"><Sparkles size={16} aria-hidden="true" /><span>{t("Demo: usa")}{' '}<strong>{DEMO_CODE}</strong>{t(". No se envió correo.")}</span></p>}
      <form onSubmit={event => { event.preventDefault(); verify(); }} className="auth-form">
        <OtpInput value={code} onChange={value => { setCode(value); if (notice?.tone === 'error') setNotice(null); }} onComplete={value => verify(value)} disabled={busy}
          invalid={notice?.tone === 'error'} labelledBy={`${ids}-code-title`} describedBy={`${ids}-code-help`} />
        <button className="button button-primary" disabled={busy || code.length !== OTP_LENGTH}><ShieldCheck size={16} />{busy ? t("Comprobando…") : t("Comprobar código")}</button>
      </form>
      <div className="auth-code-actions">
        <button type="button" className="text-button" onClick={resend} disabled={busy || countdown.remaining > 0}><RefreshCw size={15} />{countdown.remaining > 0 ? t("Reenviar código en {remaining} s", { remaining: countdown.remaining }) : t("Reenviar código")}</button>
        <button type="button" className="text-button" onClick={back}><ArrowLeft size={15} />{t("Cambiar correo")}</button>
      </div>
      <p className="auth-fine">{t("Vale una vez y vence en 60 min. Nunca te lo pediremos por teléfono ni chat.")}</p>
    </div>;
  } else if (step.kind === 'new-password') {
    body = <form onSubmit={savePassword} className="auth-form">
      <h3 ref={heading} tabIndex={-1}><KeyRound size={20} />{t("Elige tu contraseña nueva")}</h3>
      {passwordField('Nueva contraseña', 'new-password', true)}
      <button className="button button-primary" disabled={busy || !strong}><KeyRound size={16} />{busy ? t("Guardando…") : t("Guardar contraseña")}</button>
    </form>;
  } else if (step.kind === 'done') {
    body = <div className="auth-done">
      <span className="auth-code-icon is-done" aria-hidden="true"><Check size={30} /></span>
      <h3 ref={heading} tabIndex={-1}>{step.title}</h3><p>{step.text}</p>
      <button type="button" className="button button-secondary" onClick={restart}>{t("Repetir el recorrido")}</button>
    </div>;
  } else {
    body = <>
      <div className="auth-tabs" role="group" aria-label={t("Acceso a cuenta")}>{(Object.keys(tabLabels) as Tab[]).map(value => <button key={value} type="button" aria-pressed={tab === value}
        onClick={() => { setTab(value); setPassword(''); setNotice(null); }}>{t(tabLabels[value])}</button>)}</div>
      <form onSubmit={submitForm} className="auth-form" noValidate>
        {tab === 'signup' && <div className="auth-field"><label htmlFor={`${ids}-name`}>{t("Cómo te llamas")}</label><input id={`${ids}-name`} className="field" autoComplete="name" maxLength={100} value={name} onChange={event => setName(event.target.value)} required /></div>}
        <div className="auth-field"><label htmlFor={`${ids}-email`}>{t("Correo electrónico")}</label><input id={`${ids}-email`} className="field" type="email" inputMode="email" autoComplete="email" maxLength={254} value={email} onChange={event => setEmail(event.target.value)} required aria-invalid={email.length > 4 && !emailOk ? true : undefined} /></div>
        {tab !== 'recovery' && passwordField('Contraseña', tab === 'login' ? 'current-password' : 'new-password', tab === 'signup')}
        {tab === 'signup' && <fieldset className="auth-consents"><legend className="sr-only">{t("Acuerdos")}</legend>
          <label className="auth-check"><input type="checkbox" checked={terms} onChange={event => setTerms(event.target.checked)} required />
            <span>{t("Acepto los")}{' '}<strong>{t("Términos y condiciones")}</strong>{' '}{t("y la")}{' '}<strong>{t("Política de privacidad")}</strong>{' '}{t("de CHULLA VIDA (versión")}{' '}{TERMS_LABEL}).{LEGAL_IS_DRAFT ? t(" Borrador: te avisamos si cambia.") : ''}</span></label>
          <details className="auth-terms-summary"><summary>{t("Resumen en 20 segundos")}</summary><ul>
            <li>{t("Usamos tu correo para tu cuenta, tus consultas y avisos de seguridad.")}</li>
            <li>{t("No vendemos tus datos. Puedes pedir acceso, corrección o eliminación cuando quieras (LOPDP).")}</li>
            <li>{t("Los precios son referenciales y por ahora no hay cobros reales.")}</li>
            <li>{t("El texto completo está en «Términos y privacidad», al pie de la página.")}</li></ul></details>
          <label className="auth-check"><input type="checkbox" checked={marketing} onChange={event => setMarketing(event.target.checked)} />
            <span>{t("Opcional: novedades y fiestas por correo. Te das de baja cuando quieras.")}</span></label>
        </fieldset>}
        <button className="button button-primary" disabled={busy || (tab === 'signup' && (!terms || !strong || !emailOk))}>
          {tab === 'signup' ? <UserPlus size={16} /> : tab === 'recovery' ? <Mail size={16} /> : <LogIn size={16} />}
          {busy ? t("Un momento…") : tab === 'signup' ? t("Crear cuenta y recibir código") : tab === 'recovery' ? t("Enviarme un código") : t("Iniciar sesión")}</button>
        {tab === 'login' && <button type="button" className="button button-secondary" disabled={busy} onClick={requestLoginCode}><Mail size={16} />{t("Entrar con un código")}</button>}
      </form>
    </>;
  }
  return <div className={`auth-flow${gateway.demo ? ' is-demo' : ''}`} aria-busy={busy}>
    {body}
    {noticeView}
  </div>;
}
