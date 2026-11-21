import { Injectable } from '@angular/core';
import { ACCESS_TOKEN_KEY, API_BASE_URL, API_PATHS } from '../../shared/infrastructure/api.config';
import { HiringRequest } from '../domain/hiring-request.entity';

@Injectable({ providedIn: 'root' })
export class HiringRequestsApi {
  async listHiringRequests(): Promise<HiringRequest[]> {
    const headers = new Headers({ Accept: 'application/json' });
    const token = window.sessionStorage.getItem(ACCESS_TOKEN_KEY) ?? window.localStorage.getItem(ACCESS_TOKEN_KEY);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    let response: Response;
    try { response = await fetch(`${API_BASE_URL}${API_PATHS.hiringRequests}`, { headers }); }
    catch { throw new Error('No se pudo conectar con el servicio de contrataciones.'); }
    if (response.status === 401) throw new Error('Tu sesión venció. Vuelve a iniciar sesión.');
    if (response.status === 403) throw new Error('Tu usuario no tiene permiso para ver las contrataciones.');
    if (!response.ok) throw new Error(`No se pudieron cargar las contrataciones (${response.status}).`);
    return await response.json() as HiringRequest[];
  }
}
