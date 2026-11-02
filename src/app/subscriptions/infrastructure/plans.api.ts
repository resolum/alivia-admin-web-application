import { Injectable } from '@angular/core';
import { API_BASE_URL, API_PATHS } from '../../shared/infrastructure/api.config';
import { Plan } from '../domain/plan.entity';

/** Public catalog of plans; it needs no session. */
@Injectable({ providedIn: 'root' })
export class PlansApi {
  async listPlans(): Promise<Plan[]> {
    let response: Response;
    try { response = await fetch(`${API_BASE_URL}${API_PATHS.plans}`, { headers: { Accept: 'application/json' } }); }
    catch { throw new Error('No se pudo conectar con el catálogo de planes.'); }
    if (!response.ok) throw new Error(`No se pudo cargar el catálogo de planes (${response.status}).`);
    return await response.json() as Plan[];
  }
}
