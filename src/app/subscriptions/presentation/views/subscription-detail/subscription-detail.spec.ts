import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { signal } from '@angular/core';
import { SubscriptionsStore } from '../../../application/subscriptions.store';
import { SubscriptionDetail } from './subscription-detail';

describe('SubscriptionDetail', () => {
  it('reads the subscriptions once and finds the one of the route', () => {
    const store = { load: vi.fn(), subscriptions: signal<unknown[]>([]), find: vi.fn().mockReturnValue({ id: 'd1' }) };
    TestBed.configureTestingModule({ providers: [
      { provide: SubscriptionsStore, useValue: store },
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ subscriptionId: 'd1' }) } } },
    ] });
    const component = TestBed.runInInjectionContext(() => new SubscriptionDetail());
    component.ngOnInit();
    expect(store.load).toHaveBeenCalledOnce();
    expect((component as unknown as { subscription(): unknown }).subscription()).toEqual({ id: 'd1' });
    expect(store.find).toHaveBeenCalledWith('d1');

    store.subscriptions.set([{}]);
    component.ngOnInit();
    expect(store.load).toHaveBeenCalledOnce();
  });
});
