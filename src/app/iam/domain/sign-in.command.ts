export interface SignInCommand { email: string; password: string; }

/** A business administrator registering from the portal; the backend sends a verification link. */
export interface SignUpCommand { firstName: string; lastName: string; email: string; phoneNumber: string; password: string; acceptedTerms: boolean; }

/** Peruvian mobile numbers: 9 digits starting with 9; the backend stores them with the 51 country code. */
export const MOBILE_PATTERN = /^9\d{8}$/;
export function toPhoneNumber(mobile: string): string { return `51${mobile.replace(/\D/g, '')}`; }

/** Who a password reset link belongs to, while it is still valid. */
export interface PasswordReset { email: string; expiresAt: string; }

/** Families and assisted people use the Alivia mobile app; the business portal rejects their accounts. */
export const MOBILE_APP_ROLES: readonly string[] = ['CAREGIVER', 'FAMILIAR', 'RELATIVE', 'ASSISTED_PERSON'];

/** Who an invitation link belongs to, before its owner chooses a password. */
export interface AccountActivation { email: string; fullName: string; expiresAt: string; }

/** Same rules as IAM's PasswordPolicy: 8+ characters with upper and lower case, a digit and one of @$!%*?&#. */
export const PASSWORD_RULES = [
  { label: 'Mínimo 8 caracteres', test: (value: string) => [...value].length >= 8 },
  { label: 'Al menos una letra mayúscula', test: (value: string) => /[A-ZÁÉÍÓÚÑ]/.test(value) },
  { label: 'Al menos una letra minúscula', test: (value: string) => /[a-záéíóúñ]/.test(value) },
  { label: 'Al menos un número', test: (value: string) => /\d/.test(value) },
  { label: 'Un carácter especial (@, $, !, %, *, ?, &, #)', test: (value: string) => /[@$!%*?&#]/.test(value) },
] as const;

export function meetsPasswordPolicy(value: string): boolean { return PASSWORD_RULES.every(rule => rule.test(value)); }

interface TokenClaims { exp?: number; businessId?: number | string; role?: string; email?: string; }

function claimsOf(token: string): TokenClaims | null {
  try { return JSON.parse(atob(token.split('.')[1]!.replace(/-/g, '+').replace(/_/g, '/'))) as TokenClaims; }
  catch { return null; }
}

/** True while the JWT exists and its "exp" claim is in the future. */
export function isTokenAlive(token: string | null, now = Date.now()): boolean {
  const claims = token ? claimsOf(token) : null;
  return claims !== null && (!claims.exp || claims.exp * 1000 > now);
}

/** Field technicians and subscription managers have their own portals; administrators use the general one. */
export const TECHNICIAN_ROLE = 'TECHNICIAN';
export const SUBSCRIPTION_MANAGER_ROLE = 'SUBSCRIPTION_MANAGER';
/** Only business administrators use the administration portal (US-17). */
export const ADMINISTRATOR_ROLES: readonly string[] = ['ADMINISTRATOR', 'ADMIN'];

/** The "role" claim of the JWT (ADMINISTRATOR, TECHNICIAN, ...). */
export function roleOf(token: string | null): string | null {
  return (token ? claimsOf(token)?.role : null) ?? null;
}

/** The "email" claim of the JWT. */
export function emailOf(token: string | null): string | null {
  return (token ? claimsOf(token)?.email : null) ?? null;
}

/** The "businessId" claim of the JWT, when the backend includes it. */
export function businessIdOf(token: string): number | null {
  const value = Number(claimsOf(token)?.businessId);
  return Number.isInteger(value) && value > 0 ? value : null;
}
