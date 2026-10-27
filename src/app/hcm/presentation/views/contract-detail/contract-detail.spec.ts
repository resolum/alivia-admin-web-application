import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { HcmStore } from '../../../application/hcm.store';
import { WorkSchedulesStore } from '../../../application/work-schedules.store';
import { ContractDetail } from './contract-detail';

describe('ContractDetail', () => {
  it('loads the contract identified by the route', () => {
    const store = { selectContract: vi.fn() };
    const schedules = { loadContractSchedules: vi.fn() };
    const route = { snapshot: { paramMap: { get: (key: string) => key === 'employeeId' ? '3' : '7' } } };
    TestBed.configureTestingModule({ providers: [
      { provide: HcmStore, useValue: store },
      { provide: WorkSchedulesStore, useValue: schedules },
      { provide: ActivatedRoute, useValue: route },
    ] });

    const component = TestBed.runInInjectionContext(() => new ContractDetail());
    component.ngOnInit();

    expect(store.selectContract).toHaveBeenCalledWith(3, 7);
    expect(schedules.loadContractSchedules).toHaveBeenCalledWith(7);
  });
});
