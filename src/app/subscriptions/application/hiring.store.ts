import { computed, inject, Injectable, signal } from '@angular/core';
import { HiringRequest, HiringStage, matchesSearch, needsAttention } from '../domain/hiring-request.entity';
import { HiringRequestsApi } from '../infrastructure/hiring-requests.api';

export interface HiringFilters { search: string; stage: HiringStage | 'ALL'; attention: 'ALL' | 'ONLY'; }

@Injectable({ providedIn: 'root' })
export class HiringStore {
  private readonly api = inject(HiringRequestsApi);
  private readonly requestsState = signal<HiringRequest[]>([]);
  readonly requests = this.requestsState.asReadonly();
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly filters = signal<HiringFilters>({ search: '', stage: 'ALL', attention: 'ALL' });

  readonly filtered = computed(() => {
    const { search, stage, attention } = this.filters();
    return this.requestsState().filter(request => matchesSearch(request, search)
      && (stage === 'ALL' || request.stage === stage)
      && (attention === 'ALL' || needsAttention(request)));
  });
  readonly summary = computed(() => {
    const requests = this.requestsState();
    return {
      newRequests: requests.filter(request => request.stage === 'REQUEST_AND_PAYMENT').length,
      preauthorized: requests.filter(request => request.paymentStatus === 'PREAUTHORIZED').length,
      attention: requests.filter(needsAttention).length,
    };
  });

  async load(): Promise<void> {
    this.loading.set(true); this.error.set(null);
    try { this.requestsState.set(await this.api.listHiringRequests()); }
    catch (error) { this.error.set(error instanceof Error ? error.message : 'No se pudieron cargar las contrataciones.'); }
    finally { this.loading.set(false); }
  }

  setFilters(changes: Partial<HiringFilters>): void { this.filters.update(current => ({ ...current, ...changes })); }
  clearFilters(): void { this.filters.set({ search: '', stage: 'ALL', attention: 'ALL' }); }
  inStage(stage: HiringStage): HiringRequest[] { return this.filtered().filter(request => request.stage === stage); }
}
