import { computed, inject, Injectable, signal } from '@angular/core';
import { matchesHome, ServicedHome, subscriptionStatus } from '../domain/serviced-home.entity';
import { ServicedHomesApi } from '../infrastructure/serviced-homes.api';

/** Homes in service, for the administration (all) or a technician (the ones they served). Read only. */
@Injectable({ providedIn: 'root' })
export class ServicedHomesStore {
  private readonly api = inject(ServicedHomesApi);
  private readonly state = signal<ServicedHome[]>([]);
  private readonly selectedState = signal<ServicedHome | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly search = signal('');
  readonly homes = this.state.asReadonly();
  readonly selected = this.selectedState.asReadonly();
  readonly visible = computed(() => this.state().filter(home => matchesHome(home, this.search())));

  readonly counts = computed(() => {
    const homes = this.state();
    const active = homes.filter(home => subscriptionStatus(home) === 'ACTIVE').length;
    return {
      total: homes.length,
      active,
      activeShare: homes.length ? `${(active * 100 / homes.length).toFixed(1).replace(/\.0$/, '')}%` : null,
      openIncidents: homes.reduce((count, home) => count + home.orders.filter(order => order.serviceType === 'MAINTENANCE' && order.status !== 'COMPLETED').length, 0),
    };
  });

  async load(scope: 'all' | 'mine'): Promise<void> {
    this.loading.set(true); this.error.set(null);
    try { this.state.set(await this.api.listHomes(scope)); }
    catch (error) { this.error.set(error instanceof Error ? error.message : 'No se pudieron cargar los hogares.'); }
    finally { this.loading.set(false); }
  }

  async select(id: string): Promise<void> {
    this.selectedState.set(this.state().find(home => home.id === id) ?? null);
    this.loading.set(true); this.error.set(null);
    try { this.selectedState.set(await this.api.getHome(id)); }
    catch (error) { this.error.set(error instanceof Error ? error.message : 'No se pudo cargar el hogar.'); }
    finally { this.loading.set(false); }
  }
}
