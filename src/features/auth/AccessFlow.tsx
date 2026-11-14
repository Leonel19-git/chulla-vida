import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowLeft, Check, Eye, EyeOff, KeyRound, LogIn, Mail, MailCheck, RefreshCw, ShieldCheck, Sparkles, UserPlus, X } from 'lucide-react';
import {
  DEMO_CODE, LEGAL_IS_DRAFT, MAX_LOCAL_ATTEMPTS, MAX_RESENDS, OTP_LENGTH, PASSWORD_MAX, PASSWORD_MIN, RESEND_COOLDOWN_SECONDS, TERMS_LABEL,
  isEmail, isStrongPassword, passwordRules, translateAuthError, type AuthAction,
} from './auth-flow';
import type { AuthGateway, CodePurpose, GatewayResult } from './auth-gateway';
import { OtpInput } from './OtpInput';

type Tab = 'login' | 'signup' | 'recovery';
type Step = { kind: 'form' } | { kind: 'code'; purpose: CodePurpose } | { kind: 'new-password' } | { kind: 'done'; title: string; text: string };
type Notice = { tone: 'info' | 'error' | 'success'; text: string } | null;

export interface AccessFlowProps {
  gateway: AuthGateway;
  /** Opens directly on "choose a new password" (recovery link or PASSWORD_RECOVERY event). */
  startWithNewPassword?: boolean;
  onRecoveryVerified?: () => void;
  onPasswordUpdated?: () => void;
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

const tabLabels: Record<Tab, string> = { login: 'Entrar', signup: 'Crear cuenta', recovery: 'Recuperar acceso' };
const codeCopy: Record<CodePurpose, { title: string; lead: string }> = {
  signup: { title: 'Te enviamos un código a tu correo', lead: 'Escríbelo para activar tu cuenta. Así comprobamos que el correo es tuyo.' },
  login: { title: 'Te enviamos un código para entrar', lead: 'Si el correo tiene una cuenta, te llegó un código de un solo uso.' },
  recovery: { title: 'Te enviamos un código para recuperar tu acceso', lead: 'Si el correo tiene una cuenta, te llegó un código. Después eliges una contraseña nueva.' },
};

export function AccessFlow({ gateway, startWithNewPassword, onRecoveryVerified, onPasswordUpdated }: AccessFlowProps) {
  const ids = useId();
  const [tab, setTab] = useState<Tab>('login');
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
    if (!emailOk) { setNotice({ tone: 'error', text: 'Escribe un correo válido, por ejemplo nombre@correo.com.' }); return; }
    if (tab === 'signup') {
      if (!strong) { setNotice({ tone: 'error', text: 'La contraseña todavía no cumple todas las reglas de la lista.' }); return; }
      if (!terms) { setNotice({ tone: 'error', text: 'Para crear la cuenta necesitas aceptar los Términos y la Política de privacidad.' }); return; }
      void run('signup', () => gateway.signUp({ email, password, displayName: name, marketing }), result => {
        if (result.signedIn) { void gateway.recordMarketingChoice(marketing); setPassword(''); return; }
        toCode('signup', 'Si este correo ya tenía cuenta no llegará un código: en ese caso entra o recupera tu acceso.');
      });
    } else if (tab === 'recovery') {
      void run('recovery', () => gateway.requestRecoveryCode(email), () => toCode('recovery'));
    } else if (gateway.demo) {
      setNotice({ tone: 'info', text: 'En la demostración no existen cuentas. Prueba «Crear cuenta» o «Entrar con un código» para ver el paso del código.' });
    } else {
      void run('login', () => gateway.signInWithPassword(email, password), () => { setPassword(''); setNotice({ tone: 'success', text: 'Sesión iniciada. Tus permisos se comprueban en el servidor.' }); });
    }
  }
  function requestLoginCode() {
    if (!emailOk) { setNotice({ tone: 'error', text: 'Primero escribe tu correo para enviarte el código.' }); return; }
    void run('login-code', () => gateway.requestLoginCode(email), () => toCode('login'));
  }
  function verify(token = code) {
    if (step.kind !== 'code' || busy) return;
    if (token.length !== OTP_LENGTH) { setNotice({ tone: 'error', text: `El código tiene ${OTP_LENGTH} números. Te faltan ${OTP_LENGTH - token.length}.` }); return; }
    if (attempts >= MAX_LOCAL_ATTEMPTS) { setNotice({ tone: 'error', text: 'Demasiados intentos con este código. Pide uno nuevo con «Reenviar código».' }); return; }
    const purpose = step.purpose;
    void (async () => {
      if (inFlight.current) return;
      inFlight.current = true; setBusy(true); setNotice(null);
      try {
        const result = await gateway.verifyCode(email, token, purpose);
        if (result.error) {
          const used = attempts + 1; setAttempts(used); setCode('');
          const base = translateAuthError(result.error, 'verify', { sentAt });
          setNotice({ tone: 'error', text: used >= MAX_LOCAL_ATTEMPTS ? 'Demasiados intentos con este código. Pide uno nuevo con «Reenviar código».' : base });
          return;
        }
        if (purpose === 'recovery') { onRecoveryVerified?.(); setPassword(''); setStep({ kind: 'new-password' }); setNotice({ tone: 'success', text: 'Código correcto. Ahora elige tu contraseña nueva.' }); return; }
        if (purpose === 'signup') void gateway.recordMarketingChoice(marketing);
        if (gateway.demo) {
          setStep({ kind: 'done', title: purpose === 'signup' ? '¡Así se activa tu cuenta!' : '¡Así entras con un código!',
            text: 'Esto fue una demostración: no se creó ninguna cuenta, no se envió ningún correo y tu contraseña no se guardó. Cuando el servidor esté conectado, este mismo paso abrirá tu sesión de verdad.' });
          return;
        }
        setNotice({ tone: 'success', text: purpose === 'signup' ? '¡Listo! Tu correo quedó confirmado y tu cuenta está activa.' : 'Sesión iniciada con tu código.' });
      } finally { inFlight.current = false; setBusy(false); }
    })();
  }
  function resend() {
    if (step.kind !== 'code' || countdown.remaining > 0) return;
    if (resends >= MAX_RESENDS) { setNotice({ tone: 'error', text: 'Ya pediste varios códigos. Espera unos minutos o revisa que el correo esté bien escrito.' }); return; }
    const purpose = step.purpose;
    void run('resend', () => gateway.resendCode(email, purpose), () => {
      setResends(value => value + 1); setAttempts(0); setCode(''); setSentAt(Date.now()); countdown.start();
      setNotice({ tone: 'info', text: 'Te enviamos un código nuevo. Usa el más reciente: los anteriores dejan de valer.' });
    });
  }
  function savePassword(event: FormEvent) {
    event.preventDefault();
    if (!strong) { setNotice({ tone: 'error', text: 'La contraseña todavía no cumple todas las reglas de la lista.' }); return; }
    void run('update-password', () => gateway.updatePassword(password), () => {
      setPassword('');
      if (gateway.demo) { setStep({ kind: 'done', title: '¡Así recuperas tu acceso!', text: 'Demostración terminada: no se cambió ninguna contraseña real.' }); return; }
      setStep({ kind: 'form' }); setTab('login'); onPasswordUpdated?.();
      setNotice({ tone: 'success', text: 'Contraseña actualizada. Ya puedes usar tu cuenta.' });
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
      <button type="button" className="auth-eye" onClick={() => setShowPassword(value => !value)} aria-pressed={showPassword} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
    </div>
    {withRules && <ul id={`${ids}-rules`} className="auth-rules" aria-label="Reglas de la contraseña">{rules.map(rule => <li key={rule.id} className={rule.ok ? 'is-ok' : ''}>
      <span aria-hidden="true">{rule.ok ? <Check size={14} /> : <X size={14} />}</span>{rule.label}<span className="sr-only">{rule.ok ? ': cumplida' : ': pendiente'}</span></li>)}</ul>}
  </div>;

  let body: ReactNode;
  if (step.kind === 'code') {
    const copy = codeCopy[step.purpose];
    body = <div className="auth-code-step">
      <span className="auth-code-icon" aria-hidden="true"><MailCheck size={30} /></span>
      <h3 id={`${ids}-code-title`} ref={heading} tabIndex={-1}>{copy.title}</h3>
      <p id={`${ids}-code-help`}>{copy.lead} Lo enviamos a <strong>{email.trim()}</strong>.</p>
      {gateway.demo && <p className="auth-demo-hint"><Sparkles size={16} aria-hidden="true" /><span>Demostración: el código es <strong>{DEMO_CODE}</strong>. No se envió ningún correo.</span></p>}
      <form onSubmit={event => { event.preventDefault(); verify(); }} className="auth-form">
        <OtpInput value={code} onChange={value => { setCode(value); if (notice?.tone === 'error') setNotice(null); }} onComplete={value => verify(value)} disabled={busy}
          invalid={notice?.tone === 'error'} labelledBy={`${ids}-code-title`} describedBy={`${ids}-code-help`} />
        <button className="button button-primary" disabled={busy || code.length !== OTP_LENGTH}><ShieldCheck size={16} />{busy ? 'Comprobando…' : 'Comprobar código'}</button>
      </form>
      <div className="auth-code-actions">
        <button type="button" className="text-button" onClick={resend} disabled={busy || countdown.remaining > 0}><RefreshCw size={15} />{countdown.remaining > 0 ? `Reenviar código en ${countdown.remaining} s` : 'Reenviar código'}</button>
        <button type="button" className="text-button" onClick={back}><ArrowLeft size={15} />Cambiar correo</button>
      </div>
      <p className="auth-fine">El código vale una sola vez y vence en 60 minutos. Nunca te lo pediremos por teléfono ni por chat.</p>
    </div>;
  } else if (step.kind === 'new-password') {
    body = <form onSubmit={savePassword} className="auth-form">
      <h3 ref={heading} tabIndex={-1}><KeyRound size={20} />Elige tu contraseña nueva</h3>
      {passwordField('Nueva contraseña', 'new-password', true)}
      <button className="button button-primary" disabled={busy || !strong}><KeyRound size={16} />{busy ? 'Guardando…' : 'Guardar contraseña'}</button>
    </form>;
  } else if (step.kind === 'done') {
    body = <div className="auth-done">
      <span className="auth-code-icon is-done" aria-hidden="true"><Check size={30} /></span>
      <h3 ref={heading} tabIndex={-1}>{step.title}</h3><p>{step.text}</p>
      <button type="button" className="button button-secondary" onClick={restart}>Repetir el recorrido</button>
    </div>;
  } else {
    body = <>
      <div className="auth-tabs" role="group" aria-label="Acceso a cuenta">{(Object.keys(tabLabels) as Tab[]).map(value => <button key={value} type="button" aria-pressed={tab === value}
        onClick={() => { setTab(value); setPassword(''); setNotice(null); }}>{tabLabels[value]}</button>)}</div>
      <form onSubmit={submitForm} className="auth-form" noValidate>
        {tab === 'signup' && <div className="auth-field"><label htmlFor={`${ids}-name`}>Cómo te llamas</label><input id={`${ids}-name`} className="field" autoComplete="name" maxLength={100} value={name} onChange={event => setName(event.target.value)} required /></div>}
        <div className="auth-field"><label htmlFor={`${ids}-email`}>Correo electrónico</label><input id={`${ids}-email`} className="field" type="email" inputMode="email" autoComplete="email" maxLength={254} value={email} onChange={event => setEmail(event.target.value)} required aria-invalid={email.length > 4 && !emailOk ? true : undefined} /></div>
        {tab !== 'recovery' && passwordField('Contraseña', tab === 'login' ? 'current-password' : 'new-password', tab === 'signup')}
        {tab === 'signup' && <fieldset className="auth-consents"><legend className="sr-only">Acuerdos</legend>
          <label className="auth-check"><input type="checkbox" checked={terms} onChange={event => setTerms(event.target.checked)} required />
            <span>Acepto los <strong>Términos y condiciones</strong> y la <strong>Política de privacidad</strong> de CHULLA VIDA (versión {TERMS_LABEL}).{LEGAL_IS_DRAFT ? ' Son borradores en revisión legal; te avisaremos si cambian.' : ''}</span></label>
          <details className="auth-terms-summary"><summary>Resumen en 20 segundos</summary><ul>
            <li>Usamos tu correo para tu cuenta, tus consultas y avisos de seguridad.</li>
            <li>No vendemos tus datos. Puedes pedir acceso, corrección o eliminación cuando quieras (LOPDP).</li>
            <li>Los precios son referenciales y por ahora no hay cobros reales.</li>
            <li>El texto completo está en «Términos y privacidad», al pie de la página.</li></ul></details>
          <label className="auth-check"><input type="checkbox" checked={marketing} onChange={event => setMarketing(event.target.checked)} />
            <span>Opcional: quiero recibir novedades, fiestas y ofertas por correo. Puedes darte de baja cuando quieras.</span></label>
        </fieldset>}
        <button className="button button-primary" disabled={busy || (tab === 'signup' && (!terms || !strong || !emailOk))}>
          {tab === 'signup' ? <UserPlus size={16} /> : tab === 'recovery' ? <Mail size={16} /> : <LogIn size={16} />}
          {busy ? 'Un momento…' : tab === 'signup' ? 'Crear cuenta y recibir código' : tab === 'recovery' ? 'Enviarme un código' : 'Iniciar sesión'}</button>
        {tab === 'login' && <button type="button" className="button button-secondary" disabled={busy} onClick={requestLoginCode}><Mail size={16} />Entrar con un código</button>}
      </form>
    </>;
  }
  return <div className={`auth-flow${gateway.demo ? ' is-demo' : ''}`} aria-busy={busy}>
    {body}
    {noticeView}
  </div>;
}
