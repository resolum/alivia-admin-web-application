import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { ServicedHomesStore } from '../../../application/serviced-homes.store';
import { servicedHome } from '../../../domain/serviced-home.fixtures';
import { HomesList } from './homes-list';

describe('HomesList', () => {
  it('loads the homes of its scope and searches them', () => {
    const store = { load: vi.fn(), search: { set: vi.fn() } };
    TestBed.configureTestingModule({ providers: [
      { provide: ServicedHomesStore, useValue: store },
      { provide: ActivatedRoute, useValue: { snapshot: { data: { scope: 'mine' } } } },
    ] });
    const component = TestBed.runInInjectionContext(() => new HomesList());
    const view = component as unknown as { onSearch(event: Event): void; tone(home: unknown): string };
    component.ngOnInit();
    view.onSearch({ target: { value: 'maría' } } as unknown as Event);
    expect(store.load).toHaveBeenCalledWith('mine');
    expect(store.search.set).toHaveBeenCalledWith('maría');
    expect(view.tone(servicedHome({ paymentStatus: 'REFUNDED' }))).toBe('canceled');
  });
});
