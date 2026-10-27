import { TestBed } from '@angular/core/testing';
import { HcmStore } from '../../../application/hcm.store';
import { ContractsList } from './contracts-list';

describe('ContractsList', () => {
  const store = { loadContracts: vi.fn(), setFilters: vi.fn() };
  let component: ContractsList;

  beforeEach(() => {
    store.loadContracts.mockReset();
    store.setFilters.mockReset();
    TestBed.configureTestingModule({ providers: [{ provide: HcmStore, useValue: store }] });
    component = TestBed.runInInjectionContext(() => new ContractsList());
  });

  it('loads contracts and forwards all filter events', () => {
    component.ngOnInit();
    (component as unknown as { search(event: Event): void }).search({ target: { value: 'ana' } } as unknown as Event);
    (component as unknown as { status(event: Event): void }).status({ target: { value: 'ACTIVE' } } as unknown as Event);
    (component as unknown as { modality(event: Event): void }).modality({ target: { value: 'HOURLY' } } as unknown as Event);

    expect(store.loadContracts).toHaveBeenCalledOnce();
    expect(store.setFilters).toHaveBeenNthCalledWith(1, { search: 'ana' });
    expect(store.setFilters).toHaveBeenNthCalledWith(2, { status: 'ACTIVE' });
    expect(store.setFilters).toHaveBeenNthCalledWith(3, { modality: 'HOURLY' });
  });
});
