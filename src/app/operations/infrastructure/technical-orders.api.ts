import { Injectable } from '@angular/core';
import { ACCESS_TOKEN_KEY, API_BASE_URL, API_PATHS } from '../../shared/infrastructure/api.config';
import { TechnicalOrder, WorkingDay } from '../domain/technical-order.entity';

export class OperationsApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); this.name = 'OperationsApiError'; }
}

/** Technical orders of every contracting request and incident, for the general administration. */
@Injectable({ providedIn: 'root' })
export class TechnicalOrdersApi {
  listOrders(): Promise<TechnicalOrder[]> {
    return this.request<TechnicalOrder[]>(`${API_BASE_URL}${API_PATHS.technicalOrders}`);
  }

  /** Orders of the signed-in technician. */
  listMine(): Promise<TechnicalOrder[]> {
    return this.request<TechnicalOrder[]>(`${API_BASE_URL}${API_PATHS.technicalOrders}/mine`);
  }

  /** Shifts of the signed-in technician's work schedule between two dates (both included). */
  listMySchedule(from: string, to: string): Promise<WorkingDay[]> {
    return this.request<WorkingDay[]>(`${API_BASE_URL}${API_PATHS.technicalOrders}/mine/schedule?from=${from}&to=${to}`);
  }

  getOrder(orderId: number): Promise<TechnicalOrder> {
    return this.request<TechnicalOrder>(`${API_BASE_URL}${API_PATHS.technicalOrders}/${orderId}`);
  }

  /** The technician must work the whole block and have no other visit in it; the backend answers 409 otherwise. */
  assignTechnician(orderId: number, technicianId: number, note: string): Promise<TechnicalOrder> {
    return this.request<TechnicalOrder>(`${API_BASE_URL}${API_PATHS.technicalOrders}/${orderId}/technician`,
      { method: 'PUT', body: JSON.stringify({ technicianId, note: note || null }) });
  }

  /** The backend picks another eligible technician, or moves the order to the closest block with capacity. */
  reassign(orderId: number, reason: string): Promise<TechnicalOrder> {
    return this.request<TechnicalOrder>(`${API_BASE_URL}${API_PATHS.technicalOrders}/${orderId}/reassignment`,
      { method: 'POST', body: JSON.stringify({ reason }) });
  }

  private async request<T>(url: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers({ Accept: 'application/json' });
    if (init.body) headers.set('Content-Type', 'application/json');
    const token = typeof window === 'undefined' ? null
      : window.sessionStorage.getItem(ACCESS_TOKEN_KEY) ?? window.localStorage.getItem(ACCESS_TOKEN_KEY);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    let response: Response;
    try { response = await fetch(url, { ...init, headers }); }
    catch { throw new OperationsApiError('No se pudo conectar con el servicio de operaciones técnicas.', 0); }
    if (!response.ok) throw new OperationsApiError(init.method ? changeMessageOf(response.status, init.method) : messageOf(response.status), response.status);
    return await response.json() as T;
  }
}

function messageOf(status: number): string {
  if (status === 401) return 'Debes iniciar sesión para consultar las órdenes técnicas.';
  if (status === 403) return 'Tu usuario no tiene permiso para consultar las órdenes técnicas.';
  if (status === 404) return 'No encontramos la orden técnica.';
  return `No se pudo consultar las órdenes técnicas (${status}).`;
}

// The backend's problem `detail` is English, so each status gets its own Spanish text.
function changeMessageOf(status: number, method: string): string {
  if (status === 401) return 'Tu sesión terminó. Vuelve a iniciar sesión.';
  if (status === 403) return 'Tu usuario no tiene permiso para asignar técnicos.';
  if (status === 404) return 'No encontramos la orden técnica o el técnico elegido.';
  if (status === 409 && method === 'PUT') return 'No se pudo asignar: el técnico debe trabajar todo el bloque y no tener otra visita en él, y la orden debe seguir programada.';
  if (status === 409) return 'Ningún técnico puede tomar la orden en su bloque ni en los bloques cercanos con capacidad.';
  if (status === 400) return 'Revisa los datos: el motivo es obligatorio y admite hasta 300 caracteres.';
  return `No se pudo actualizar la orden técnica (${status}).`;
}
