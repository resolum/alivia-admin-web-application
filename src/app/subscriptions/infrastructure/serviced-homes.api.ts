import { Injectable } from '@angular/core';
import { ACCESS_TOKEN_KEY, API_BASE_URL, API_PATHS } from '../../shared/infrastructure/api.config';
import { ServicedHome } from '../domain/serviced-home.entity';

/** Homes in service: every home for the administration, the ones a technician served for the technician. */
@Injectable({ providedIn: 'root' })
export class ServicedHomesApi {
  listHomes(scope: 'all' | 'mine'): Promise<ServicedHome[]> {
    return this.request<ServicedHome[]>(`${API_BASE_URL}${API_PATHS.servicedHomes}${scope === 'mine' ? '/mine' : ''}`);
  }

  getHome(id: string): Promise<ServicedHome> {
    return this.request<ServicedHome>(`${API_BASE_URL}${API_PATHS.servicedHomes}/${encodeURIComponent(id)}`);
  }

  private async request<T>(url: string): Promise<T> {
    const headers = new Headers({ Accept: 'application/json' });
    const token = window.sessionStorage.getItem(ACCESS_TOKEN_KEY) ?? window.localStorage.getItem(ACCESS_TOKEN_KEY);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    let response: Response;
    try { response = await fetch(url, { headers }); }
    catch { throw new Error('No se pudo conectar con el servicio de hogares.'); }
    if (response.status === 401) throw new Error('Tu sesión venció. Vuelve a iniciar sesión.');
    if (response.status === 403) throw new Error('Tu usuario no tiene permiso para ver estos hogares.');
    if (response.status === 404) throw new Error('No encontramos este hogar.');
    if (!response.ok) throw new Error(`No se pudieron cargar los hogares (${response.status}).`);
    return await response.json() as T;
  }
}
