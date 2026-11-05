import { TestBed } from '@angular/core/testing';
import { hiringRequest } from '../domain/hiring-request.fixtures';
import { toSubscription } from '../domain/subscription.entity';
import { SubscriptionsApi } from '../infrastructure/subscriptions.api';
import { SubscriptionsStore } from './subscriptions.store';

describe('SubscriptionsStore', () => {
  const api = { listSubscriptions: vi.fn() };
  let store: SubscriptionsStore;
  const now = new Date();
  const active = (id: string, completedAt: string) => toSubscription(hiringRequest({ id, paymentStatus: 'SUCCEEDED' }),
    { draftId: id, contactName: id, contactPhone: null, directions: null, technicianName: null, completedAt, installedDevices: 2 }, now);

  beforeEach(() => {
    api.listSubscriptions.mockReset();
    TestBed.configureTestingModule({ providers: [{ provide: SubscriptionsApi, useValue: api }] });
    store = TestBed.inject(SubscriptionsStore);
  });

  it('counts, filters and pages the subscriptions', async () => {
    const inFiveDays = new Date(now.getTime() + 5 * 86_400_000);
    inFiveDays.setUTCMonth(inFiveDays.getUTCMonth() - 1);
    api.listSubscriptions.mockResolvedValue([
      active('a', inFiveDays.toISOString()),
      active('b', new Date(now.getTime() - 2 * 86_400_000).toISOString()),
      toSubscription(hiringRequest({ id: 'c', paymentStatus: 'FAILED' }), undefined, now),
      ...Array.from({ length: 9 }, (_, index) => active(`x${index}`, new Date(now.getTime() - 3 * 86_400_000).toISOString())),
    ]);
    await store.load();

    expect(store.counts()).toMatchObject({ ALL: 12, ACTIVE: 11, ATTENTION: 1, CANCELED: 0, RENEWING: 1 });
    expect(store.activeShare()).toBe('91.7%');
    expect(store.totalPages()).toBe(2);
    store.goToPage(1);
    expect(store.pageItems()).toHaveLength(2);
    store.goToPage(9);
    expect(store.page()).toBe(1);
    store.setTab('RENEWING');
    expect(store.visible().map(item => item.id)).toEqual(['a']);
    store.setTab('ATTENTION');
    expect(store.visible().map(item => item.id)).toEqual(['c']);
    store.setTab('ALL');
    store.setSearch('hogar de b');
    expect(store.visible().map(item => item.id)).toEqual(['b']);
    expect(store.find('b')?.id).toBe('b');
    expect(store.find('nope')).toBeNull();
  });

  it('reports why the subscriptions could not be read', async () => {
    expect(store.activeShare()).toBeNull();
    api.listSubscriptions.mockRejectedValue(new Error('Tu sesión venció. Vuelve a iniciar sesión.'));
    await store.load();
    expect(store.error()).toBe('Tu sesión venció. Vuelve a iniciar sesión.');
    api.listSubscriptions.mockRejectedValue('boom');
    await store.load();
    expect(store.error()).toBe('No se pudo consultar las suscripciones.');
  });
});
