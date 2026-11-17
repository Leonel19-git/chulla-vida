import { validateCedula } from './cedula';

export const SIGNUP_IDENTITY_NOTICE = 'Formato válido; identidad por verificar';
export const SIGNUP_IDENTITY_EVENT = 'cv3:signup-identity-saved';

/** Self-declared account detail, never evidence of identity or a server checksum check. */
export interface SignupIdentity { last4: string; status: 'unverified' }

/** The complete number stays in the field; only this reduced value leaves the signup form. */
export function signupIdentity(value: string): SignupIdentity | null {
  const result = validateCedula(value);
  return result.valid ? { last4: result.normalized.slice(-4), status: 'unverified' } : null;
}
