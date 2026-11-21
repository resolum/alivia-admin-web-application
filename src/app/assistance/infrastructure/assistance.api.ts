import { Injectable } from '@angular/core';
import { ACCESS_TOKEN_KEY, API_BASE_URL, API_PATHS } from '../../shared/infrastructure/api.config';
import { AutonomyMetrics, toAction, uniqueActions } from '../domain/autonomy-metrics.entity';
import { userIdOf } from '../../iam/domain/sign-in.command';
import { AgendaItem, CareNotification, CareShift, MedicationAdministration, OutcomeResult } from '../domain/care.entity';

export class AssistanceApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); this.name = 'AssistanceApiError'; }
}

/** Care agenda, medication outcomes, notifications and autonomy metrics of the signed-in caregiver or relative. */
@Injectable({ providedIn: 'root' })
export class AssistanceApi {
  /** Without filters the backend resolves the agenda of the signed-in user (relative or caregiver). */
  agenda(from: string, to: string): Promise<AgendaItem[]> {
    return this.request(`${API_PATHS.careAgenda}?from=${from}&to=${to}`, 'la agenda');
  }

  /** Shifts of the user's assisted person between Lima midnights; the backend takes UTC instants. */
  shifts(from: string, to: string): Promise<CareShift[]> {
    const start = new Date(`${from}T00:00:00-05:00`).toISOString();
    const end = new Date(`${to}T23:59:59-05:00`).toISOString();
    return this.request(`${API_PATHS.careShifts}?from=${encodeURIComponent(start)}&to=${encodeURIComponent(end)}`, 'los turnos');
  }

  /** Caregiver records of the signed-in user; empty for a relative. */
  async myCaregiverIds(): Promise<number[]> {
    const userId = userIdOf(this.token());
    if (userId === null) return [];
    const caregivers = await this.request<{ id: number }[]>(`${API_PATHS.caregivers}/user/${userId}`, 'tu perfil de cuidador');
    return caregivers.map(caregiver => caregiver.id);
  }

  administration(id: string): Promise<MedicationAdministration> {
    return this.request(`${API_PATHS.medicationAdministrations}/${encodeURIComponent(id)}`, 'la administración');
  }

  /** 409 when the dose already has a final outcome; 403 when the user may not record it. */
  recordOutcome(id: string, result: OutcomeResult, reason: string | null): Promise<MedicationAdministration> {
    return this.request(`${API_PATHS.medicationAdministrations}/${encodeURIComponent(id)}/outcomes`, 'el resultado',
      { method: 'POST', body: JSON.stringify({ result, reason }) });
  }

  notifications(): Promise<CareNotification[]> {
    return this.request(API_PATHS.notifications, 'tus avisos');
  }

  async autonomyMetrics(from: string, to: string): Promise<AutonomyMetrics> {
    const metrics = await this.request<AutonomyMetrics>(`${API_PATHS.autonomyMetrics}?from=${from}&to=${to}`, 'las métricas de autonomía');
    return { ...metrics, actions: uniqueActions((metrics.actions ?? []).map(toAction)) };
  }

  private async request<T>(path: string, what: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers({ Accept: 'application/json' });
    if (init.body) headers.set('Content-Type', 'application/json');
    const token = this.token();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    let response: Response;
    try { response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers }); }
    catch { throw new AssistanceApiError('Sin conexión con Alivia. Revisa tu red; lo intentaremos de nuevo al reconectar.', 0); }
    if (!response.ok) throw new AssistanceApiError(messageOf(response.status, what, !!init.method), response.status);
    return await response.json() as T;
  }

  private token(): string | null {
    return typeof window === 'undefined' ? null : window.sessionStorage.getItem(ACCESS_TOKEN_KEY) ?? window.localStorage.getItem(ACCESS_TOKEN_KEY);
  }
}

// The backend's problem `detail` is English, so each status gets its own Spanish text.
function messageOf(status: number, what: string, change: boolean): string {
  if (status === 401) return 'Tu sesión terminó. Vuelve a iniciar sesión.';
  if (status === 403) return change ? 'No tienes permiso para registrar esta administración. El historial no cambió.' : `No tienes permiso para consultar ${what}.`;
  if (status === 404) return `No encontramos ${what}.`;
  if (status === 409) return 'Esta administración ya tiene un resultado registrado.';
  return `No se pudo ${change ? 'guardar' : 'consultar'} ${what} (${status}).`;
}
