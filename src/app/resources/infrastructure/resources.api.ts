import { Injectable } from '@angular/core';
import { ACCESS_TOKEN_KEY, API_BASE_URL, API_PATHS } from '../../shared/infrastructure/api.config';
import { Device, DeviceType, Edge, EdgeType, InventoryPage } from '../domain/device.entity';

/** Largest page the backend serves; the inventory is small enough to load in one request. */
const PAGE_SIZE = 200;

/** Inventory of the business: the devices (`/api/v1/devices`) and the edges (`/api/v1/edges`). */
@Injectable({ providedIn: 'root' })
export class ResourcesApi {
  async listDevices(): Promise<Device[]> {
    const page = await this.request<InventoryPage<Device>>(`${API_BASE_URL}${API_PATHS.devices}?size=${PAGE_SIZE}`);
    return page.content;
  }

  async listEdges(): Promise<Edge[]> {
    const page = await this.request<InventoryPage<Edge>>(`${API_BASE_URL}${API_PATHS.edges}?size=${PAGE_SIZE}`);
    return page.content.map(edge => ({ ...edge, installationId: edge.installationId ?? null }));
  }

  registerDevice(alias: string, macAddress: string, deviceType: DeviceType): Promise<Device> {
    return this.request<Device>(`${API_BASE_URL}${API_PATHS.devices}`, { alias, macAddress, deviceType });
  }

  registerEdge(macAddress: string, edgeType: EdgeType): Promise<Edge> {
    return this.request<Edge>(`${API_BASE_URL}${API_PATHS.edges}`, { macAddress, edgeType });
  }

  private async request<T>(url: string, body?: unknown): Promise<T> {
    const headers = new Headers({ Accept: 'application/json' });
    const token = window.sessionStorage.getItem(ACCESS_TOKEN_KEY) ?? window.localStorage.getItem(ACCESS_TOKEN_KEY);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (body !== undefined) headers.set('Content-Type', 'application/json');
    let response: Response;
    try { response = await fetch(url, body === undefined ? { headers } : { method: 'POST', headers, body: JSON.stringify(body) }); }
    catch { throw new Error('No se pudo conectar con el servicio de dispositivos.'); }
    if (response.status === 401) throw new Error('Tu sesión venció. Vuelve a iniciar sesión.');
    if (response.status === 403) throw new Error('Tu usuario no tiene permiso para gestionar dispositivos.');
    if (response.status === 409) throw new Error('Esa MAC address ya está registrada en otro dispositivo o edge.');
    if (response.status === 404) throw new Error('El negocio todavía no existe: crea el perfil del negocio antes de registrar dispositivos.');
    if (response.status === 400) throw new Error('Revisa los datos: la MAC address o el tipo no son válidos.');
    if (!response.ok) throw new Error(`No se pudo completar la operación (${response.status}).`);
    return await response.json() as T;
  }
}
