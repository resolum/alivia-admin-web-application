import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { TechnicalOrdersStore } from '../../../application/technical-orders.store';
import { order } from '../../../domain/technical-order.fixtures';
import { TechnicalOrdersList } from './technical-orders-list';

describe('TechnicalOrdersList', () => {
  const store = { load: vi.fn(), setSearch: vi.fn(), page: signal(1), pageSize: 10, visible: signal(Array.from({ length: 14 }, () => order())) };
  let component: TechnicalOrdersList;

  beforeEach(() => {
    store.load.mockReset(); store.setSearch.mockReset();
    TestBed.configureTestingModule({ providers: [{ provide: TechnicalOrdersStore, useValue: store }] });
    component = TestBed.runInInjectionContext(() => new TechnicalOrdersList());
  });

  it('loads the orders, searches and labels each row', () => {
    const view = component as unknown as {
      onSearch(event: Event): void; range(): string; tabLabel(tab: string): string; stage(item: unknown): string; created(item: unknown): string | null;
    };
    component.ngOnInit();
    view.onSearch({ target: { value: 'ord' } } as unknown as Event);

    expect(store.load).toHaveBeenCalledOnce();
    expect(store.setSearch).toHaveBeenCalledWith('ord');
    expect(view.range()).toBe('11–14');
    expect(view.tabLabel('ALL')).toBe('Todas');
    expect(view.tabLabel('IN_PROGRESS')).toBe('En proceso');
    expect(view.tabLabel('PENDING')).toBe('Pendientes');
    expect(view.stage(order({ startedAt: '2026-11-05T13:00:00Z' }))).toBe('in-progress');
    expect(view.created(order())).toMatch(/4 nov/);
    expect(view.created(order({ assignments: [] }))).toBeNull();
  });
});
