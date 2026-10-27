export interface SignInCommand { email: string; password: string; }

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
