import type { SupabaseClient } from '@supabase/supabase-js';
import { DEMO_CODE, PRIVACY_VERSION, TERMS_VERSION, normalizeEmail, type AuthErrorLike } from './auth-flow';

export type CodePurpose = 'signup' | 'login' | 'recovery';
export interface GatewayResult { error: AuthErrorLike | null; signedIn?: boolean }
export interface SignUpInput { email: string; password: string; displayName: string; marketing: boolean }

/** Small surface the access flow needs. The real one wraps supabase-js v2; the demo one never leaves the browser. */
export interface AuthGateway {
  readonly demo: boolean;
  signUp(input: SignUpInput): Promise<GatewayResult>;
  verifyCode(email: string, token: string, purpose: CodePurpose): Promise<GatewayResult>;
  resendCode(email: string, purpose: CodePurpose): Promise<GatewayResult>;
  signInWithPassword(email: string, password: string): Promise<GatewayResult>;
  requestLoginCode(email: string): Promise<GatewayResult>;
  requestRecoveryCode(email: string): Promise<GatewayResult>;
  updatePassword(password: string): Promise<GatewayResult>;
  /** Best effort: stores the separate marketing choice as consent evidence once a session exists. */
  recordMarketingChoice(granted: boolean): Promise<void>;
}

const redirect = () => `${location.origin}${location.pathname}#cuenta`;
const toError = (error: unknown): AuthErrorLike | null => {
  if (!error) return null;
  if (typeof error === 'object') { const value = error as AuthErrorLike; return { code: value.code, status: value.status, message: value.message, name: value.name }; }
  return { message: String(error) };
};
async function guard(run: () => Promise<GatewayResult>): Promise<GatewayResult> {
  try { return await run(); } catch (error) { return { error: toError(error) ?? { message: 'network' } }; }
}

export function supabaseGateway(client: SupabaseClient): AuthGateway {
  return {
    demo: false,
    signUp: ({ email, password, displayName, marketing }) => guard(async () => {
      const { data, error } = await client.auth.signUp({ email: normalizeEmail(email), password, options: {
        emailRedirectTo: redirect(),
        data: { display_name: displayName.trim().slice(0, 100), terms_version: TERMS_VERSION, privacy_version: PRIVACY_VERSION,
          terms_accepted_at: new Date().toISOString(), marketing_opt_in: marketing, draft_terms_acknowledged: true },
      } });
      return { error: toError(error), signedIn: Boolean(data?.session) };
    }),
    verifyCode: (email, token, purpose) => guard(async () => {
      const type = purpose === 'signup' ? 'signup' : purpose === 'recovery' ? 'recovery' : 'email';
      const { data, error } = await client.auth.verifyOtp({ email: normalizeEmail(email), token, type });
      return { error: toError(error), signedIn: Boolean(data?.session) };
    }),
    resendCode: (email, purpose) => guard(async () => {
      const address = normalizeEmail(email);
      if (purpose === 'signup') { const { error } = await client.auth.resend({ type: 'signup', email: address, options: { emailRedirectTo: redirect() } }); return { error: toError(error) }; }
      if (purpose === 'recovery') { const { error } = await client.auth.resetPasswordForEmail(address, { redirectTo: redirect() }); return { error: toError(error) }; }
      const { error } = await client.auth.signInWithOtp({ email: address, options: { shouldCreateUser: false } }); return { error: toError(error) };
    }),
    signInWithPassword: (email, password) => guard(async () => {
      const { data, error } = await client.auth.signInWithPassword({ email: normalizeEmail(email), password });
      return { error: toError(error), signedIn: Boolean(data?.session) };
    }),
    // shouldCreateUser: false keeps the code login from creating accounts that skipped the Terms step.
    requestLoginCode: email => guard(async () => { const { error } = await client.auth.signInWithOtp({ email: normalizeEmail(email), options: { shouldCreateUser: false } }); return { error: toError(error) }; }),
    requestRecoveryCode: email => guard(async () => { const { error } = await client.auth.resetPasswordForEmail(normalizeEmail(email), { redirectTo: redirect() }); return { error: toError(error) }; }),
    updatePassword: password => guard(async () => { const { error } = await client.auth.updateUser({ password }); return { error: toError(error) }; }),
    recordMarketingChoice: async granted => {
      try {
        await client.rpc('record_consent', { p_category: 'email_marketing', p_granted: granted, p_purpose: 'Novedades y ofertas de CHULLA VIDA por correo',
          p_policy_version: PRIVACY_VERSION, p_method: 'signup' });
      } catch { /* the choice also lives in the signup metadata; failure must not block the account */ }
    },
  };
}

/** Guided demo: simulates the code step so people can see the experience. Creates nothing, sends nothing, stores nothing. */
export function demoGateway(): AuthGateway {
  const wait = () => new Promise<void>(resolve => setTimeout(resolve, 350));
  const ok = async (): Promise<GatewayResult> => { await wait(); return { error: null }; };
  return {
    demo: true,
    signUp: ok,
    verifyCode: async (_email, token) => { await wait(); return token === DEMO_CODE ? { error: null, signedIn: true } : { error: { code: 'otp_expired', status: 403 } }; },
    resendCode: ok,
    signInWithPassword: async () => { await wait(); return { error: { code: 'invalid_credentials', status: 400 } }; },
    requestLoginCode: ok,
    requestRecoveryCode: ok,
    updatePassword: ok,
    recordMarketingChoice: async () => undefined,
  };
}
