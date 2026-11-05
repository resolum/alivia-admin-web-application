import { inject, Injectable } from '@angular/core';
import { API_BASE_URL, API_PATHS, currentBusinessId } from '../../shared/infrastructure/api.config';
import { UserAccount, UserRole } from '../domain/user-role.entity';
import { IamApi } from './iam.api';

/** Users of the business and the responsibilities granted to each one. */
@Injectable({ providedIn: 'root' })
export class UsersApi {
  private readonly iam = inject(IamApi);

  async listUsers(): Promise<UserAccount[]> {
    const params = new URLSearchParams({ page: '0', size: '200' });
    const businessId = currentBusinessId();
    if (businessId !== null) params.set('businessId', String(businessId));
    return (await this.request<{ content: UserAccount[] }>(`${API_BASE_URL}${API_PATHS.users}?${params}`)).content;
  }

  /** Idempotent: granting a role the user already has changes nothing. */
  assignRole(userId: string, role: UserRole): Promise<UserAccount> {
    return this.request<UserAccount>(this.roleUrl(userId, role), { method: 'PUT' });
  }

  /** Withdraws one role; the others stay as they are. */
  withdrawRole(userId: string, role: UserRole): Promise<UserAccount> {
    return this.request<UserAccount>(this.roleUrl(userId, role), { method: 'DELETE' });
  }

  private roleUrl(userId: string, role: UserRole): string {
    return `${API_BASE_URL}${API_PATHS.users}/${encodeURIComponent(userId)}/roles/${role}`;
  }

  private async request<T>(url: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers({ Accept: 'application/json' });
    const token = this.iam.accessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    let response: Response;
    try { response = await fetch(url, { ...init, headers }); }
    catch { throw new Error('No se pudo conectar con el servicio de usuarios.'); }
    if (!response.ok) throw new Error(await errorMessage(response));
    return await response.json() as T;
  }
}

async function errorMessage(response: Response): Promise<string> {
  if (response.status === 401) return 'Tu sesión terminó. Vuelve a iniciar sesión.';
  if (response.status === 403) return 'No tienes permiso para gestionar responsabilidades. El intento quedó registrado.';
  if (response.status === 404) return 'El usuario ya no existe o el servicio de usuarios no está disponible.';
  const problem = (response.headers.get('content-type') ?? '').includes('json') ? await response.json() as { detail?: string; title?: string } : {};
  if (response.status === 409) return problem.detail ?? 'La combinación de responsabilidades no está permitida.';
  return problem.detail ?? problem.title ?? `No se pudo completar la solicitud (${response.status}).`;
}
