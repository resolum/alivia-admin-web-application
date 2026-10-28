import { Injectable } from '@angular/core';
import { ACCESS_TOKEN_KEY, API_BASE_URL, currentBusinessId } from '../../shared/infrastructure/api.config';

export class HcmApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); this.name = 'HcmApiError'; }
}

/** What every HCM resource API shares: the session token, the user's business and the error messages. */
@Injectable({ providedIn: 'root' })
export class HcmHttpClient {
  /** Absolute API URL of a path such as `/employees/4/contracts`. */
  url(path: string, params?: URLSearchParams): string {
    const query = params?.toString();
    return `${API_BASE_URL}${path}${query ? `?${query}` : ''}`;
  }

  /**
   * Query parameters scoped to the signed-in user's business. When the session carries no business,
   * the parameter is left out and the backend uses its default business.
   */
  params(values: Record<string, string> = {}): URLSearchParams {
    const params = new URLSearchParams(values);
    const businessId = currentBusinessId();
    if (businessId !== null) params.set('businessId', String(businessId));
    return params;
  }

  /** Body of a create request, with the user's business when the session carries one. */
  withBusiness<T extends object>(body: T): T & { businessId?: number } {
    return { ...body, businessId: currentBusinessId() ?? undefined };
  }

  async request<T>(url: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set('Accept', 'application/json');
    if (init.body) headers.set('Content-Type', 'application/json');
    const token = this.accessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    let response: Response;
    try { response = await fetch(url, { ...init, headers }); }
    catch { throw new HcmApiError('No se pudo conectar con el servicio de capital humano.', 0); }
    if (!response.ok) throw new HcmApiError(await this.errorMessage(response), response.status);
    return await response.json() as T;
  }

  private accessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return window.sessionStorage.getItem(ACCESS_TOKEN_KEY) ?? window.localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  private async errorMessage(response: Response): Promise<string> {
    if (response.status === 401) return 'Debes iniciar sesión para consultar capital humano.';
    if (response.status === 403) return 'Tu usuario no tiene permiso para gestionar capital humano.';
    if (response.status === 404) return 'El servicio de capital humano no está disponible en el backend actual.';
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('json')) {
      const problem = await response.json() as { detail?: string; message?: string; title?: string };
      return problem.detail ?? problem.message ?? problem.title ?? 'No se pudo completar la solicitud.';
    }
    return `No se pudo completar la solicitud al backend (${response.status}).`;
  }
}
