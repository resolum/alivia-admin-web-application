import { computed, inject, Injectable, signal } from '@angular/core';
import { groupByDay, matches, stageOf, StageTab, TechnicalOrder, TypeFilter } from '../domain/technical-order.entity';
import { TechnicalOrdersApi } from '../infrastructure/technical-orders.api';

/** Every technical order with its stage, for the general administration (read only). */
@Injectable({ providedIn: 'root' })
export class TechnicalOrdersStore {
  private readonly api = inject(TechnicalOrdersApi);
  private readonly ordersState = signal<TechnicalOrder[]>([]);
  private readonly selectedState = signal<TechnicalOrder | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly tab = signal<StageTab>('ALL');
  readonly type = signal<TypeFilter>('ALL');
  readonly search = signal('');
  readonly orders = this.ordersState.asReadonly();
  readonly selected = this.selectedState.asReadonly();

  /** How many orders each stage tab and each type filter holds. */
  readonly counts = computed(() => {
    const orders = this.ordersState();
    const byStage = (stage: StageTab) => orders.filter(order => stage === 'ALL' || stageOf(order) === stage).length;
    const inTab = orders.filter(order => this.tab() === 'ALL' || stageOf(order) === this.tab());
    return {
      ALL: byStage('ALL'), PENDING: byStage('PENDING'), ASSIGNED: byStage('ASSIGNED'), IN_PROGRESS: byStage('IN_PROGRESS'),
      COMPLETED: byStage('COMPLETED'), CANCELED: byStage('CANCELED'),
      EVALUATION: inTab.filter(order => order.serviceType === 'EVALUATION').length,
      INSTALLATION: inTab.filter(order => order.serviceType === 'INSTALLATION').length,
      MAINTENANCE: inTab.filter(order => order.serviceType === 'MAINTENANCE').length,
    };
  });

  readonly visible = computed(() => this.ordersState().filter(order =>
    (this.tab() === 'ALL' || stageOf(order) === this.tab())
    && (this.type() === 'ALL' || order.serviceType === this.type())
    && matches(order, this.search())));

  readonly page = signal(0);
  readonly pageSize = 10;
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.visible().length / this.pageSize)));
  /** Days of the current page; a day split across pages shows on both. */
  readonly days = computed(() => {
    const start = this.page() * this.pageSize;
    return groupByDay(this.visible())
      .flatMap(group => group.orders.map(order => ({ group, order })))
      .slice(start, start + this.pageSize)
      .reduce<{ key: string; title: string; total: number; orders: TechnicalOrder[] }[]>((pages, { group, order }) => {
        const last = pages.at(-1);
        if (last?.key === group.key) last.orders.push(order);
        else pages.push({ key: group.key, title: group.title, total: group.orders.length, orders: [order] });
        return pages;
      }, []);
  });

  setTab(tab: StageTab): void { this.tab.set(tab); this.page.set(0); }
  setType(type: TypeFilter): void { this.type.set(this.type() === type ? 'ALL' : type); this.page.set(0); }
  setSearch(search: string): void { this.search.set(search); this.page.set(0); }
  goToPage(page: number): void { if (page >= 0 && page < this.totalPages()) this.page.set(page); }

  async load(): Promise<void> {
    this.loading.set(true); this.error.set(null);
    try { this.ordersState.set(await this.api.listOrders()); }
    catch (error) { this.error.set(error instanceof Error ? error.message : 'No se pudo consultar las órdenes técnicas.'); }
    finally { this.loading.set(false); }
  }

  async select(orderId: number): Promise<void> {
    this.selectedState.set(this.ordersState().find(order => order.id === orderId) ?? null);
    this.loading.set(true); this.error.set(null);
    try { this.selectedState.set(await this.api.getOrder(orderId)); }
    catch (error) { this.error.set(error instanceof Error ? error.message : 'No se pudo consultar la orden técnica.'); }
    finally { this.loading.set(false); }
  }
}
