import { TestBed } from '@angular/core/testing';
import { order } from '../domain/technical-order.fixtures';
import { TechnicalOrdersApi } from '../infrastructure/technical-orders.api';
import { TechnicalOrdersStore } from './technical-orders.store';

describe('TechnicalOrdersStore', () => {
  const api = { listOrders: vi.fn(), getOrder: vi.fn() };
  let store: TechnicalOrdersStore;
  const orders = [
    order({ id: 1, serviceType: 'EVALUATION' }),
    order({ id: 2, serviceType: 'INSTALLATION', technicianId: null, technicianName: null }),
    order({ id: 3, serviceType: 'MAINTENANCE', startedAt: '2026-11-05T13:00:00Z', technicianName: 'Ana Torres' }),
    order({ id: 4, serviceType: 'EVALUATION', status: 'COMPLETED' }),
  ];

  beforeEach(() => {
    api.listOrders.mockReset(); api.getOrder.mockReset();
    TestBed.configureTestingModule({ providers: [{ provide: TechnicalOrdersApi, useValue: api }] });
    store = TestBed.inject(TechnicalOrdersStore);
  });

  it('counts each stage and filters by tab, type and search', async () => {
    api.listOrders.mockResolvedValue(orders);
    await store.load();

    expect(store.counts()).toMatchObject({ ALL: 4, PENDING: 1, ASSIGNED: 1, IN_PROGRESS: 1, COMPLETED: 1, EVALUATION: 2, INSTALLATION: 1, MAINTENANCE: 1 });
    store.setTab('IN_PROGRESS');
    expect(store.visible().map(item => item.id)).toEqual([3]);
    store.setTab('ALL');
    store.setType('EVALUATION');
    expect(store.visible().map(item => item.id)).toEqual([1, 4]);
    store.setType('EVALUATION');
    expect(store.type()).toBe('ALL');
    store.setSearch('ana torres');
    expect(store.visible().map(item => item.id)).toEqual([3]);
    expect(store.days()[0].orders.map(item => item.id)).toEqual([3]);
  });

  it('pages the orders ten at a time', async () => {
    api.listOrders.mockResolvedValue(Array.from({ length: 12 }, (_, index) => order({ id: index + 1 })));
    await store.load();

    expect(store.totalPages()).toBe(2);
    expect(store.days().flatMap(day => day.orders)).toHaveLength(10);
    store.goToPage(1);
    expect(store.days().flatMap(day => day.orders)).toHaveLength(2);
    store.goToPage(5);
    expect(store.page()).toBe(1);
  });

  it('reads the detail and reports failures', async () => {
    api.getOrder.mockResolvedValue(order({ id: 7 }));
    await store.select(7);
    expect(store.selected()?.id).toBe(7);

    api.getOrder.mockRejectedValue(new Error('No encontramos la orden técnica.'));
    await store.select(8);
    expect(store.error()).toBe('No encontramos la orden técnica.');
    api.listOrders.mockRejectedValue('boom');
    await store.load();
    expect(store.error()).toBe('No se pudo consultar las órdenes técnicas.');
    api.getOrder.mockRejectedValue('boom');
    await store.select(9);
    expect(store.error()).toBe('No se pudo consultar la orden técnica.');
  });
});
