export interface SignInCommand { email: string; password: string; }

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

interface TokenClaims { exp?: number; businessId?: number | string; }

function claimsOf(token: string): TokenClaims | null {
  try { return JSON.parse(atob(token.split('.')[1]!.replace(/-/g, '+').replace(/_/g, '/'))) as TokenClaims; }
  catch { return null; }
}

/** True while the JWT exists and its "exp" claim is in the future. */
export function isTokenAlive(token: string | null, now = Date.now()): boolean {
  const claims = token ? claimsOf(token) : null;
  return claims !== null && (!claims.exp || claims.exp * 1000 > now);
}

/** The "businessId" claim of the JWT, when the backend includes it. */
export function businessIdOf(token: string): number | null {
  const value = Number(claimsOf(token)?.businessId);
  return Number.isInteger(value) && value > 0 ? value : null;
}
