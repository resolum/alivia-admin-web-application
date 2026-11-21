import { inject, Injectable } from '@angular/core';
import { API_BASE_URL, API_PATHS, currentBusinessId } from '../../shared/infrastructure/api.config';
import { ROLE_CATALOG, UserAccount, UserRole } from '../domain/user-role.entity';
import { IamApi } from './iam.api';

/** Users of the business and the responsibilities granted to each one. */
@Injectable({ providedIn: 'root' })
export class UsersApi {
  private readonly iam = inject(IamApi);

  async listUsers(): Promise<UserAccount[]> {
    const params = businessParams();
    params.set('page', '0');
    params.set('size', '200');
    const page = await this.request<{ content: ApiUserAccount[] }>(`${API_BASE_URL}${API_PATHS.users}?${params}`);
    return page.content.map(toUserAccount);
  }

  /** Idempotent: granting a role the user already has changes nothing. */
  async assignRole(userId: string, role: UserRole): Promise<UserAccount> {
    return toUserAccount(await this.request<ApiUserAccount>(this.roleUrl(userId, role), { method: 'PUT' }, role));
  }

  /** Withdraws one role; the others stay as they are. */
  async withdrawRole(userId: string, role: UserRole): Promise<UserAccount> {
    return toUserAccount(await this.request<ApiUserAccount>(this.roleUrl(userId, role), { method: 'DELETE' }, role));
  }

  // The backend looks the user up among the accounts of `businessId` (its default business when absent),
  // so role changes must name the same business the list came from.
  private roleUrl(userId: string, role: UserRole): string {
    const query = businessParams().toString();
    return `${API_BASE_URL}${API_PATHS.users}/${encodeURIComponent(userId)}/roles/${role}${query ? `?${query}` : ''}`;
  }

  private async request<T>(url: string, init: RequestInit = {}, role?: UserRole): Promise<T> {
    const headers = new Headers({ Accept: 'application/json' });
    const token = this.iam.accessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    let response: Response;
    try { response = await fetch(url, { ...init, headers }); }
    catch { throw new Error('No se pudo conectar con el servicio de usuarios.'); }
    if (!response.ok) throw new Error(errorMessage(response, role));
    return await response.json() as T;
  }
}

/** `fullName` is null for accounts without a profile; the page then names them by email. */
type ApiUserAccount = Omit<UserAccount, 'fullName'> & { fullName: string | null };

function toUserAccount(user: ApiUserAccount): UserAccount {
  return { ...user, fullName: user.fullName?.trim() || user.email };
}

function businessParams(): URLSearchParams {
  const businessId = currentBusinessId();
  return new URLSearchParams(businessId === null ? {} : { businessId: String(businessId) });
}

// The backend's problem `detail` is English, so the page shows its own Spanish text per status.
function errorMessage(response: Response, role?: UserRole): string {
  if (response.status === 401) return 'Tu sesión terminó. Vuelve a iniciar sesión.';
  if (response.status === 403) return 'No tienes permiso para gestionar responsabilidades. El intento quedó registrado.';
  if (response.status === 404) return 'El usuario ya no existe o el servicio de usuarios no está disponible.';
  if (response.status === 409) {
    return role ? `${ROLE_CATALOG[role].label} no es compatible con las responsabilidades actuales de este usuario.`
      : 'La combinación de responsabilidades no está permitida.';
  }
  return `No se pudo completar la solicitud (${response.status}).`;
}
