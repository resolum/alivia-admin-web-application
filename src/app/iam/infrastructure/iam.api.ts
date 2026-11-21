import { Injectable } from '@angular/core';
import { ACCESS_TOKEN_KEY, API_BASE_URL, API_PATHS, BUSINESS_ID_KEY, PROFILE_ID_KEY, REFRESH_TOKEN_KEY } from '../../shared/infrastructure/api.config';
import { AccountActivation, businessIdOf, MOBILE_APP_ROLES, roleOf, SignInCommand, SignUpCommand } from '../domain/sign-in.command';

/** The email already has an account: the page offers to sign in or recover access instead. */
export class EmailAlreadyRegistered extends Error {}

interface Session { accessToken: string; refreshToken?: string; user?: { role?: string; status?: string; businessId?: number | null; profileId?: number | null } }

const SESSION_KEYS = [ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, BUSINESS_ID_KEY, PROFILE_ID_KEY];
const PENDING_ACCOUNT = 'Tu cuenta está pendiente de validación. Abre el enlace que enviamos a tu correo o pide a tu administrador que te reenvíe la invitación.';
const SUSPENDED_ACCOUNT = 'Tu cuenta está suspendida o desactivada. Comunícate con el administrador de tu negocio para reactivarla.';
const MOBILE_ACCOUNT = 'Esta cuenta es de la app móvil de Alivia. Ingresa desde la app o escribe a soporte@alivia.pe.';

@Injectable({ providedIn: 'root' })
export class IamApi {
  /**
   * Signs in and keeps the session where the other APIs read it: this tab only, or this browser
   * when the user asked to be remembered.
   */
  async signIn(command: SignInCommand, remember = false): Promise<void> {
    const response = await this.send(`${API_BASE_URL}${API_PATHS.signIn}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(command),
    });
    if (response.status === 401) throw new Error('Correo o contraseña incorrectos.');
    if (response.status === 403) {
      // An account problem comes as JSON; a plain-text 403 is the backend rejecting this origin (CORS).
      if (!isJson(response)) throw new Error('El backend rechazó este origen (CORS). Agrega esta URL a alivia.cors.allowed-origins.');
      throw new Error(accountProblem(await response.text()));
    }
    if (response.status === 429) throw new Error('Demasiados intentos seguidos. Espera unos minutos antes de volver a intentarlo.');
    if (response.status >= 500) throw new Error('El servicio de autenticación no está disponible. Intenta de nuevo en unos minutos.');
    if (!response.ok) throw new Error(`No se pudo iniciar sesión (${response.status}).`);
    const session = await response.json() as Session;
    const role = session.user?.role ?? roleOf(session.accessToken);
    const rejection = role && MOBILE_APP_ROLES.includes(role) ? MOBILE_ACCOUNT
      : session.user?.status && session.user.status !== 'ACTIVE' ? accountProblem(session.user.status) : null;
    if (rejection) {
      // IAM lets pending accounts sign in (mobile app offline use); revoke the session it just opened.
      if (session.refreshToken) this.revoke(session.refreshToken);
      throw new Error(rejection);
    }
    this.clear();
    this.save(remember ? window.localStorage : window.sessionStorage, session);
  }

  /** Creates an administrator account pending email verification; resolves to the masked address. */
  async signUp(command: SignUpCommand): Promise<string> {
    const form = new FormData();
    for (const [field, value] of Object.entries({ ...command, email: command.email.toLowerCase(), role: 'ADMINISTRATOR' })) form.append(field, String(value));
    const response = await this.send(`${API_BASE_URL}${API_PATHS.signUp}`, { method: 'POST', headers: { Accept: 'application/json' }, body: form });
    if (response.status === 409) throw new EmailAlreadyRegistered('Ese correo ya tiene una cuenta en Alivia.');
    if (response.status === 400) throw new Error(await problemDetail(response) ?? 'Revisa los datos del formulario.');
    // The backend answers 503 when it cannot deliver the verification email (registration_unavailable).
    if (response.status === 503) throw new Error('No pudimos enviar el correo de verificación. Intenta de nuevo en unos minutos.');
    if (!response.ok) throw new Error(`No se pudo crear la cuenta (${response.status}).`);
    return (await response.json() as { maskedEmail: string }).maskedEmail;
  }

  /** Sends a new verification link; the backend answers 202 even for unknown addresses. */
  async resendVerification(email: string): Promise<void> {
    const response = await this.send(`${API_BASE_URL}${API_PATHS.resendVerification}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.toLowerCase() }),
    });
    if (response.status === 409) throw new Error('Tu correo ya fue verificado. Ya puedes iniciar sesión.');
    if (response.status === 429) throw new Error('Ya enviamos un enlace hace poco. Espera unos minutos antes de pedir otro.');
    if (!response.ok) throw new Error(`No se pudo reenviar el enlace (${response.status}).`);
  }

  /** Swaps the refresh token for a new session; false when there is none or the backend rejects it. */
  async refresh(): Promise<boolean> {
    const storage = this.storage();
    const refreshToken = storage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) return false;
    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}${API_PATHS.refresh}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ refreshToken }),
      });
    } catch { return false; }
    if (!response.ok) { this.clear(); return false; }
    this.save(storage, await response.json() as Session);
    return true;
  }

  /** Who an invitation link belongs to; fails when the link is unknown, used or expired. */
  async getActivation(token: string): Promise<AccountActivation> {
    const response = await this.send(`${API_BASE_URL}${API_PATHS.activation}?${new URLSearchParams({ token })}`, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(await linkError(response, ACTIVATION_LINK));
    return await response.json() as AccountActivation;
  }

  /** Sets the password chosen by an invited employee and activates the account. */
  async activate(token: string, password: string): Promise<void> {
    const response = await this.send(`${API_BASE_URL}${API_PATHS.activate}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password }),
    });
    if (!response.ok) throw new Error(await linkError(response, ACTIVATION_LINK));
  }

  /**
   * Emails a temporary 6-digit code to choose a new password. IAM answers 202 whether or not the
   * address has an active account, so nobody learns who is registered.
   */
  async requestPasswordRecovery(email: string): Promise<void> {
    const response = await this.send(`${API_BASE_URL}${API_PATHS.passwordRecovery}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }),
    });
    if (!response.ok) throw new Error(`No se pudo enviar el código de recuperación (${response.status}).`);
  }

  /** Sets a new password with the emailed code; fails when the code is wrong, used up or expired. */
  async resetPassword(email: string, code: string, password: string): Promise<void> {
    const response = await this.send(`${API_BASE_URL}${API_PATHS.passwordReset}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, code, password }),
    });
    if (!response.ok) throw new Error(await linkError(response, RESET_CODE));
  }

  private async send(url: string, init: RequestInit): Promise<Response> {
    try { return await fetch(url, init); }
    catch { throw new Error('No se pudo conectar con el servicio de autenticación.'); }
  }

  /** Ends the session here and asks the backend to revoke the refresh token. */
  signOut(): void {
    const refreshToken = this.storage().getItem(REFRESH_TOKEN_KEY);
    if (refreshToken) this.revoke(refreshToken);
    this.clear();
  }

  private revoke(refreshToken: string): void {
    void fetch(`${API_BASE_URL}${API_PATHS.logout}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken }) }).catch(() => undefined);
  }

  /** Full name of the signed-in staff member, or null when the account has no staff profile. */
  async staffName(): Promise<string | null> {
    const profileId = this.storage().getItem(PROFILE_ID_KEY);
    const token = this.accessToken();
    if (!profileId || !token) return null;
    try {
      const response = await fetch(`${API_BASE_URL}${API_PATHS.staffProfiles}/${encodeURIComponent(profileId)}`, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return null;
      const profile = await response.json() as { firstName?: string; lastName?: string };
      const name = `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim();
      return name || null;
    } catch { return null; }
  }

  accessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return window.sessionStorage.getItem(ACCESS_TOKEN_KEY) ?? window.localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  /** The storage that holds the current session: localStorage only for remembered sessions. */
  private storage(): Storage {
    return window.sessionStorage.getItem(ACCESS_TOKEN_KEY) === null && window.localStorage.getItem(ACCESS_TOKEN_KEY) !== null
      ? window.localStorage : window.sessionStorage;
  }

  private save(storage: Storage, session: Session): void {
    storage.setItem(ACCESS_TOKEN_KEY, session.accessToken);
    if (session.refreshToken) storage.setItem(REFRESH_TOKEN_KEY, session.refreshToken);
    if (session.user?.profileId) storage.setItem(PROFILE_ID_KEY, String(session.user.profileId));
    const businessId = session.user?.businessId ?? businessIdOf(session.accessToken);
    if (businessId) storage.setItem(BUSINESS_ID_KEY, String(businessId));
  }

  private clear(): void {
    for (const key of SESSION_KEYS) {
      window.sessionStorage.removeItem(key);
      window.localStorage.removeItem(key);
    }
  }
}

function isJson(response: Response): boolean { return (response.headers.get('content-type') ?? '').includes('json'); }

async function problemDetail(response: Response): Promise<string | null> {
  return isJson(response) ? (await response.json() as { detail?: string }).detail ?? null : null;
}

/**
 * Pending accounts come back as user.status; IAM answers 403 account_not_active for BLOCKED and
 * INACTIVE without saying which, so both read as suspended.
 */
function accountProblem(text: string): string {
  return /PENDING|VERIF|pendiente/i.test(text) ? PENDING_ACCOUNT : SUSPENDED_ACCOUNT;
}

interface LinkMessages { expired: string; invalid: string; failed: string; }
const ACTIVATION_LINK: LinkMessages = {
  expired: 'El enlace de activación venció. Pide al administrador que te registre de nuevo.',
  invalid: 'El enlace de activación no es válido o ya fue usado.',
  failed: 'No se pudo activar la cuenta',
};
const RESET_CODE: LinkMessages = {
  expired: 'El código venció. Solicita uno nuevo para cambiar tu contraseña.',
  // IAM gives the same answer after 5 wrong codes, so the message also points to a new one.
  invalid: 'El código no es correcto o ya no se puede usar. Revísalo o solicita uno nuevo.',
  failed: 'No se pudo cambiar la contraseña',
};

async function linkError(response: Response, messages: LinkMessages): Promise<string> {
  const problem = isJson(response) ? await response.json() as { code?: string; errors?: { code?: string }[] } : {};
  const codes = [problem.code, ...(problem.errors ?? []).map(error => error.code)];
  if (response.status === 410 || codes.some(code => code?.endsWith('_token_expired'))) return messages.expired;
  if (codes.includes('password_weak') || codes.includes('too_long')) return 'La contraseña no cumple los requisitos de seguridad.';
  if (response.status === 400 || response.status === 404) return messages.invalid;
  return `${messages.failed} (${response.status}).`;
}
