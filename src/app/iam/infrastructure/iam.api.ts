import { Injectable } from '@angular/core';
import { ACCESS_TOKEN_KEY, API_BASE_URL, API_PATHS, BUSINESS_ID_KEY } from '../../shared/infrastructure/api.config';
import { AccountActivation, businessIdOf, SignInCommand } from '../domain/sign-in.command';

@Injectable({ providedIn: 'root' })
export class IamApi {
  /** Signs in and keeps the access token for this browser tab, where the other APIs read it. */
  async signIn(command: SignInCommand): Promise<void> {
    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}${API_PATHS.signIn}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(command),
      });
    } catch { throw new Error('No se pudo conectar con el servicio de autenticación.'); }
    if (response.status === 401) throw new Error('Correo o contraseña incorrectos.');
    if (response.status === 403) {
      // An account problem comes as JSON; a plain-text 403 is the backend rejecting this origin (CORS).
      const isAccountProblem = (response.headers.get('content-type') ?? '').includes('json');
      throw new Error(isAccountProblem ? 'La cuenta está bloqueada o inactiva.'
        : 'El backend rechazó este origen (CORS). Agrega esta URL a alivia.cors.allowed-origins.');
    }
    if (!response.ok) throw new Error(`No se pudo iniciar sesión (${response.status}).`);
    const session = await response.json() as { accessToken: string; user?: { businessId?: number | null } };
    window.sessionStorage.setItem(ACCESS_TOKEN_KEY, session.accessToken);
    const businessId = session.user?.businessId ?? businessIdOf(session.accessToken);
    if (businessId) window.sessionStorage.setItem(BUSINESS_ID_KEY, String(businessId));
    else window.sessionStorage.removeItem(BUSINESS_ID_KEY);
  }

  /** Who an invitation link belongs to; fails when the link is unknown, used or expired. */
  async getActivation(token: string): Promise<AccountActivation> {
    const response = await this.send(`${API_BASE_URL}${API_PATHS.activation}?${new URLSearchParams({ token })}`, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(await activationError(response));
    return await response.json() as AccountActivation;
  }

  /** Sets the password chosen by an invited employee and activates the account. */
  async activate(token: string, password: string): Promise<void> {
    const response = await this.send(`${API_BASE_URL}${API_PATHS.activate}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password }),
    });
    if (!response.ok) throw new Error(await activationError(response));
  }

  private async send(url: string, init: RequestInit): Promise<Response> {
    try { return await fetch(url, init); }
    catch { throw new Error('No se pudo conectar con el servicio de autenticación.'); }
  }

  signOut(): void {
    for (const key of [ACCESS_TOKEN_KEY, BUSINESS_ID_KEY]) {
      window.sessionStorage.removeItem(key);
      window.localStorage.removeItem(key);
    }
  }

  accessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return window.sessionStorage.getItem(ACCESS_TOKEN_KEY) ?? window.localStorage.getItem(ACCESS_TOKEN_KEY);
  }
}

async function activationError(response: Response): Promise<string> {
  const problem = (response.headers.get('content-type') ?? '').includes('json')
    ? await response.json() as { code?: string; errors?: { code?: string }[] } : {};
  const codes = [problem.code, ...(problem.errors ?? []).map(error => error.code)];
  if (codes.includes('verification_token_expired')) return 'El enlace de activación venció. Pide al administrador que te registre de nuevo.';
  if (codes.includes('password_weak') || codes.includes('too_long')) return 'La contraseña no cumple los requisitos de seguridad.';
  if (response.status === 400 || response.status === 404) return 'El enlace de activación no es válido o ya fue usado.';
  return `No se pudo activar la cuenta (${response.status}).`;
}
