import { inject, Injectable } from '@angular/core';
import { ACCESS_TOKEN_KEY, API_BASE_URL, API_PATHS } from '../../shared/infrastructure/api.config';
import { InstallationInfo, Subscription, toSubscription } from '../domain/subscription.entity';
import { HiringRequestsApi } from './hiring-requests.api';

interface InstallationOrderResponse {
  draftId: string; status: string; installationResult: string | null; contactName: string | null; contactPhone: string | null;
  directions: string | null; technicianName: string | null; completedAt: string | null; installedDevices: unknown[] | null;
}

/** Homes in service: completed contracting requests with the data of their approved installation. */
@Injectable({ providedIn: 'root' })
export class SubscriptionsApi {
  private readonly hiring = inject(HiringRequestsApi);

  async listSubscriptions(today = new Date()): Promise<Subscription[]> {
    const [requests, installations] = await Promise.all([this.hiring.listHiringRequests(), this.installations()]);
    const byDraft = new Map(installations.map(item => [item.draftId, item]));
    return requests
      .filter(request => request.stage === 'COMPLETED')
      .map(request => toSubscription(request, byDraft.get(request.id), today))
      .sort((a, b) => b.activatedAt.localeCompare(a.activatedAt));
  }

  /** Approved installations; without access to the orders the subscriptions still list, without their home. */
  private async installations(): Promise<InstallationInfo[]> {
    const headers = new Headers({ Accept: 'application/json' });
    const token = window.sessionStorage.getItem(ACCESS_TOKEN_KEY) ?? window.localStorage.getItem(ACCESS_TOKEN_KEY);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    try {
      const response = await fetch(`${API_BASE_URL}${API_PATHS.technicalOrders}?serviceType=INSTALLATION`, { headers });
      if (!response.ok) return [];
      const orders = await response.json() as InstallationOrderResponse[];
      return orders
        .filter(order => order.status === 'COMPLETED' && order.installationResult === 'APPROVED')
        .map(order => ({
          draftId: order.draftId, contactName: order.contactName, contactPhone: order.contactPhone, directions: order.directions,
          technicianName: order.technicianName, completedAt: order.completedAt, installedDevices: order.installedDevices?.length ?? 0,
        }));
    } catch {
      return [];
    }
  }
}
