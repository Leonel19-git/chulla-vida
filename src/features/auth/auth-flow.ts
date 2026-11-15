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

/**
 * Política del proyecto Supabase (supabase/config.toml): minimum_password_length = 10 y
 * password_requirements = "lower_upper_letters_digits". GoTrue la comprueba así:
 *   - longitud en BYTES UTF-8 (Go `len`), mínimo 10 y máximo 72 (límite de bcrypt);
 *   - al menos un carácter de cada conjunto ASCII: a-z, A-Z y 0-9 (la «ñ» o las tildes no cuentan).
 * `serverAcceptsPassword` replica exactamente esa regla; el cliente nunca acepta algo que el servidor rechace.
 */
export const PASSWORD_REQUIREMENTS = 'lower_upper_letters_digits' as const;
export const utf8Length = (value: string) => new TextEncoder().encode(value).length;
export function serverAcceptsPassword(password: string): boolean {
  const bytes = utf8Length(password);
  return bytes >= PASSWORD_MIN && bytes <= PASSWORD_MAX && /[a-z]/.test(password) && /[A-Z]/.test(password) && /[0-9]/.test(password);
}

export interface PasswordRule { id: string; label: string; ok: boolean; /** true: la regla la exige el servidor; false: consejo extra del cliente. */ server: boolean }
export function passwordRules(password: string, email = ''): PasswordRule[] {
  const local = email.split('@')[0]?.toLowerCase() ?? '';
  const lower = password.toLowerCase();
  // Con caracteres de 2 bytes (ñ, tildes) GoTrue cuenta bytes: exigimos también 10 caracteres visibles para no confundir.
  const length = [...password].length >= PASSWORD_MIN && utf8Length(password) <= PASSWORD_MAX;
  return [
    { id: 'length', label: `Al menos ${PASSWORD_MIN} caracteres`, ok: length, server: true },
    { id: 'lower', label: 'Una letra minúscula (a-z)', ok: /[a-z]/.test(password), server: true },
    { id: 'upper', label: 'Una letra mayúscula (A-Z)', ok: /[A-Z]/.test(password), server: true },
    { id: 'number', label: 'Un número (0-9)', ok: /[0-9]/.test(password), server: true },
    { id: 'personal', label: 'No es tu correo ni una clave muy común', ok: password.length > 0 && !(local.length >= 3 && lower.includes(local)) && !COMMON.some(common => lower.includes(common)), server: false },
  ];
}
export const isStrongPassword = (password: string, email = '') => serverAcceptsPassword(password) && passwordRules(password, email).every(rule => rule.ok);
export const PASSWORD_HINT = `Mínimo ${PASSWORD_MIN} caracteres, con al menos una minúscula, una mayúscula y un número. La ñ y las tildes valen, pero no cuentan como minúscula ni mayúscula.`;

export const normalizeEmail = (email: string) => email.trim().toLowerCase();
export const isEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()) && email.trim().length <= 254;
/** Keeps only digits, at most OTP_LENGTH. Accepts pasted text such as "123 456" or "Código: 123-456". */
export const sanitizeOtp = (value: string) => value.replace(/\D/g, '').slice(0, OTP_LENGTH);

export interface AuthErrorLike { code?: string; status?: number; message?: string; name?: string; reasons?: string[] }
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
  if (code === 'weak_password') {
    const reasons = error?.reasons ?? [];
    if (reasons.includes('pwned')) return 'Esa contraseña aparece en filtraciones conocidas. Elige otra que no uses en ningún otro sitio.';
    if (reasons.includes('length')) return `La contraseña es muy corta. Usa al menos ${PASSWORD_MIN} caracteres, con minúsculas, mayúsculas y números.`;
    return `La contraseña es débil. Necesita al menos ${PASSWORD_MIN} caracteres, una minúscula (a-z), una mayúscula (A-Z) y un número (0-9).`;
  }
  if (code === 'same_password') return 'La nueva contraseña debe ser distinta de la anterior.';
  if (code === 'invalid_credentials') return 'El correo o la contraseña no coinciden. Revisa los datos o entra con un código.';
  if (code === 'email_not_confirmed') return 'Tu correo aún no está confirmado. Escribe el código que te enviamos o pide uno nuevo.';
  if (code === 'email_address_invalid') return 'No podemos enviar el código a ese correo: revisa que esté bien escrito o usa otra dirección (algunos dominios de prueba o temporales no se aceptan).';
  if (code === 'validation_failed') return 'Revisa el correo: no parece una dirección válida.';
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
