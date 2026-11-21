import { computed, inject, Injectable, signal } from '@angular/core';
import { isRenewingSoon, matchesSubscription, Subscription, SubscriptionTab } from '../domain/subscription.entity';
import { SubscriptionsApi } from '../infrastructure/subscriptions.api';

/** Subscriptions of the homes in service, for the general administration (read only). */
@Injectable({ providedIn: 'root' })
export class SubscriptionsStore {
  private readonly api = inject(SubscriptionsApi);
  private readonly state = signal<Subscription[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly tab = signal<SubscriptionTab>('ALL');
  readonly search = signal('');
  readonly page = signal(0);
  readonly pageSize = 10;
  readonly subscriptions = this.state.asReadonly();

  readonly counts = computed(() => {
    const all = this.state();
    return {
      ALL: all.length,
      ACTIVE: all.filter(item => item.status === 'ACTIVE').length,
      ATTENTION: all.filter(item => item.status === 'ATTENTION').length,
      CANCELED: all.filter(item => item.status === 'CANCELED').length,
      RENEWING: all.filter(item => isRenewingSoon(item)).length,
    };
  });

  /** Share of the subscriptions that are active, e.g. "94.6%". */
  readonly activeShare = computed(() => {
    const { ALL, ACTIVE } = this.counts();
    return ALL === 0 ? null : `${(ACTIVE * 100 / ALL).toFixed(1).replace(/\.0$/, '')}%`;
  });

  readonly visible = computed(() => this.state().filter(item =>
    (this.tab() === 'ALL' || (this.tab() === 'RENEWING' ? isRenewingSoon(item) : item.status === this.tab()))
    && matchesSubscription(item, this.search())));

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.visible().length / this.pageSize)));
  readonly pageItems = computed(() => this.visible().slice(this.page() * this.pageSize, (this.page() + 1) * this.pageSize));

  find(id: string): Subscription | null { return this.state().find(item => item.id === id) ?? null; }

  async load(): Promise<void> {
    this.loading.set(true); this.error.set(null);
    try { this.state.set(await this.api.listSubscriptions()); }
    catch (error) { this.error.set(error instanceof Error ? error.message : 'No se pudo consultar las suscripciones.'); }
    finally { this.loading.set(false); }
  }

  setTab(tab: SubscriptionTab): void { this.tab.set(tab); this.page.set(0); }
  setSearch(search: string): void { this.search.set(search); this.page.set(0); }
  goToPage(page: number): void { if (page >= 0 && page < this.totalPages()) this.page.set(page); }
}
