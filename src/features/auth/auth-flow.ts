import { legalDocuments } from '../../domain/legal';

/** Pure helpers for the account flow: password rules, OTP handling and error translation. */
export const OTP_LENGTH = 6;
export const RESEND_COOLDOWN_SECONDS = 60;
/** Supabase default "Email OTP Expiration" (3600 s). Keep in sync with docs/SUPABASE_SETUP.md. */
export const OTP_EXPIRY_SECONDS = 3600;
export const MAX_LOCAL_ATTEMPTS = 5;
export const MAX_RESENDS = 5;
export const DEMO_CODE = '123456';
export const PASSWORD_MIN = 10;
/** Supabase/GoTrue rejects passwords longer than 72 characters (bcrypt limit). */
export const PASSWORD_MAX = 72;

const terms = legalDocuments.find(document => document.id === 'terms');
const privacy = legalDocuments.find(document => document.id === 'privacy');
/** Version + content hash prefix of the exact text the person accepted. */
export const TERMS_VERSION = terms ? `terms-${terms.version}-${terms.sha256.slice(0, 12)}` : 'terms-borrador';
export const PRIVACY_VERSION = privacy ? `privacy-${privacy.version}-${privacy.sha256.slice(0, 12)}` : 'privacy-borrador';
/** Human label shown next to the checkbox; the full version + hash above is what gets stored. */
export const TERMS_LABEL = terms ? `${terms.version}, ${terms.date}` : 'borrador';
export const LEGAL_IS_DRAFT = (terms?.pendingFieldCount ?? 1) > 0;

const COMMON = ['1234567890', '0123456789', 'contrasena', 'contraseña', 'password12', 'qwertyuiop', 'chullavida', 'ecuador123', '1111111111', 'aaaaaaaaaa'];

export interface PasswordRule { id: string; label: string; ok: boolean }
export function passwordRules(password: string, email = ''): PasswordRule[] {
  const local = email.split('@')[0]?.toLowerCase() ?? '';
  const lower = password.toLowerCase();
  return [
    { id: 'length', label: `Al menos ${PASSWORD_MIN} caracteres`, ok: password.length >= PASSWORD_MIN && password.length <= PASSWORD_MAX },
    { id: 'letter', label: 'Incluye letras', ok: /\p{L}/u.test(password) },
    { id: 'number', label: 'Incluye al menos un número', ok: /\d/.test(password) },
    { id: 'mixed', label: 'Mezcla mayúsculas y minúsculas, o un símbolo', ok: (/\p{Lu}/u.test(password) && /\p{Ll}/u.test(password)) || /[^\p{L}\d\s]/u.test(password) },
    { id: 'personal', label: 'No es tu correo ni una clave muy común', ok: password.length > 0 && !(local.length >= 3 && lower.includes(local)) && !COMMON.some(common => lower.includes(common)) },
  ];
}
export const isStrongPassword = (password: string, email = '') => passwordRules(password, email).every(rule => rule.ok);

export const normalizeEmail = (email: string) => email.trim().toLowerCase();
export const isEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()) && email.trim().length <= 254;
/** Keeps only digits, at most OTP_LENGTH. Accepts pasted text such as "123 456" or "Código: 123-456". */
export const sanitizeOtp = (value: string) => value.replace(/\D/g, '').slice(0, OTP_LENGTH);

export interface AuthErrorLike { code?: string; status?: number; message?: string; name?: string }
export type AuthAction = 'signup' | 'verify' | 'resend' | 'login' | 'login-code' | 'recovery' | 'update-password';

/** Translates Supabase Auth errors into clear Spanish. Never echoes raw server text. */
export function translateAuthError(error: AuthErrorLike | null | undefined, action: AuthAction, context: { sentAt?: number; now?: number } = {}): string {
  const code = error?.code ?? '';
  const status = error?.status ?? 0;
  const message = (error?.message ?? '').toLowerCase();
  if (code === 'over_email_send_rate_limit') return 'Ya enviamos varios correos seguidos. Espera unos minutos antes de pedir otro código.';
  if (code === 'over_request_rate_limit' || status === 429 || message.includes('rate limit')) return 'Demasiados intentos en poco tiempo. Espera unos minutos y vuelve a probar.';
  if (code === 'otp_expired' || message.includes('expired') || message.includes('invalid otp') || (action === 'verify' && status === 403)) {
    const elapsed = context.sentAt ? ((context.now ?? Date.now()) - context.sentAt) / 1000 : 0;
    return elapsed > OTP_EXPIRY_SECONDS
      ? 'El código venció. Pide uno nuevo con «Reenviar código».'
      : 'Ese código no coincide. Revisa el último correo que te enviamos (los anteriores dejan de valer) o pide uno nuevo.';
  }
  if (code === 'user_already_exists' || code === 'email_exists' || message.includes('already registered')) return 'Este correo ya tiene una cuenta. Entra con tu contraseña o recupera el acceso.';
  if (code === 'weak_password') return `La contraseña es débil. Usa al menos ${PASSWORD_MIN} caracteres con letras y números.`;
  if (code === 'same_password') return 'La nueva contraseña debe ser distinta de la anterior.';
  if (code === 'invalid_credentials') return 'El correo o la contraseña no coinciden. Revisa los datos o entra con un código.';
  if (code === 'email_not_confirmed') return 'Tu correo aún no está confirmado. Escribe el código que te enviamos o pide uno nuevo.';
  if (code === 'email_address_invalid' || code === 'validation_failed') return 'Revisa el correo: no parece una dirección válida.';
  if (code === 'email_address_not_authorized') return 'Por ahora este servidor de correo solo envía a direcciones autorizadas. Falta configurar el SMTP del proyecto.';
  if (code === 'signup_disabled') return 'El registro de cuentas nuevas está pausado en este momento.';
  if (code === 'otp_disabled') return 'El acceso con código no está activado para este correo. Entra con tu contraseña.';
  if (code === 'email_provider_disabled') return 'El acceso por correo no está activado en el servidor.';
  if (error?.name === 'AuthRetryableFetchError' || message.includes('failed to fetch') || message.includes('network')) return 'No pudimos conectar con el servidor. Revisa tu conexión y vuelve a intentarlo.';
  const fallback: Record<AuthAction, string> = {
    signup: 'No se pudo crear la cuenta. Revisa los datos e inténtalo otra vez.',
    verify: 'No se pudo comprobar el código. Inténtalo otra vez.',
    resend: 'No se pudo reenviar el código. Espera un momento e inténtalo de nuevo.',
    login: 'No se pudo iniciar sesión. Revisa tus datos.',
    'login-code': 'No se pudo enviar el código. Inténtalo otra vez.',
    recovery: 'No se pudo iniciar la recuperación. Inténtalo otra vez.',
    'update-password': 'No se pudo guardar la contraseña. Inténtalo otra vez.',
  };
  return fallback[action];
}
