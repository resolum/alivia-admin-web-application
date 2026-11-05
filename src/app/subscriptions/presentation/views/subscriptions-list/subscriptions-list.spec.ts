import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { SubscriptionsStore } from '../../../application/subscriptions.store';
import { hiringRequest } from '../../../domain/hiring-request.fixtures';
import { toSubscription } from '../../../domain/subscription.entity';
import { SubscriptionsList } from './subscriptions-list';

describe('SubscriptionsList', () => {
  const store = { load: vi.fn(), setSearch: vi.fn(), page: signal(0), pageSize: 10, visible: signal(Array.from({ length: 4 }, () => ({}))) };

  it('loads, searches and labels the subscriptions', () => {
    TestBed.configureTestingModule({ providers: [{ provide: SubscriptionsStore, useValue: store }] });
    const component = TestBed.runInInjectionContext(() => new SubscriptionsList());
    const view = component as unknown as { onSearch(event: Event): void; range(): string; status(item: unknown): string };
    component.ngOnInit();
    view.onSearch({ target: { value: 'sub' } } as unknown as Event);

    expect(store.load).toHaveBeenCalled();
    expect(store.setSearch).toHaveBeenCalledWith('sub');
    expect(view.range()).toBe('1–4');
    expect(view.status(toSubscription(hiringRequest({ paymentStatus: 'FAILED' }), undefined))).toBe('attention');
  });
});
