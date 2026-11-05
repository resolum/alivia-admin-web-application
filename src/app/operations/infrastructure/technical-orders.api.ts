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

  private async request<T>(url: string): Promise<T> {
    const headers = new Headers({ Accept: 'application/json' });
    const token = typeof window === 'undefined' ? null
      : window.sessionStorage.getItem(ACCESS_TOKEN_KEY) ?? window.localStorage.getItem(ACCESS_TOKEN_KEY);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    let response: Response;
    try { response = await fetch(url, { headers }); }
    catch { throw new OperationsApiError('No se pudo conectar con el servicio de operaciones técnicas.', 0); }
    if (!response.ok) throw new OperationsApiError(messageOf(response.status), response.status);
    return await response.json() as T;
  }
}

function messageOf(status: number): string {
  if (status === 401) return 'Debes iniciar sesión para consultar las órdenes técnicas.';
  if (status === 403) return 'Tu usuario no tiene permiso para consultar las órdenes técnicas.';
  if (status === 404) return 'No encontramos la orden técnica.';
  return `No se pudo consultar las órdenes técnicas (${status}).`;
}
