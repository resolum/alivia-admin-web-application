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

  it('activates a pending contract and reports failures', async () => {
    const store = { selectContract: vi.fn(), activateContract: vi.fn().mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('Contrato vencido')) };
    TestBed.configureTestingModule({ providers: [
      { provide: HcmStore, useValue: store },
      { provide: WorkSchedulesStore, useValue: { loadContractSchedules: vi.fn() } },
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '7' } } } },
    ] });
    const component = TestBed.runInInjectionContext(() => new ContractDetail()) as unknown as {
      activate(employeeId: number, contractId: number): Promise<void>; message(): string; activating(): boolean;
    };

    await component.activate(3, 7);
    expect(store.activateContract).toHaveBeenCalledWith(3, 7);
    expect(component.message()).toBe('');
    await component.activate(3, 7);
    expect(component.message()).toBe('Contrato vencido');
    expect(component.activating()).toBe(false);
  });

  it('renews only past the current end, terminates after confirming and lists the history newest first', async () => {
    const contract = { id: 7, employeeId: 3, code: 'CT-7', startDate: '2026-01-01', endDate: '2026-12-31' };
    const store = {
      selectContract: vi.fn(), renewContract: vi.fn().mockResolvedValue(contract), terminateContract: vi.fn().mockResolvedValue(contract),
      contractHistory: vi.fn().mockResolvedValue([{ version: 1, action: 'CREATED' }, { version: 2, action: 'RENEWED' }]),
    };
    TestBed.configureTestingModule({ providers: [
      { provide: HcmStore, useValue: store },
      { provide: WorkSchedulesStore, useValue: { loadContractSchedules: vi.fn() } },
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: (key: string) => key === 'employeeId' ? '3' : '7' } } } },
    ] });
    const component = TestBed.runInInjectionContext(() => new ContractDetail()) as unknown as {
      ngOnInit(): void; openRenewal(contract: object): void; setRenewal(field: string, event: Event): void;
      renew(contract: object, event: Event): Promise<void>; terminate(contract: object): Promise<void>;
      message(): string; renewal(): object | null; history(): { version: number }[] | null;
    };
    const typed = (value: string) => ({ target: { value } }) as unknown as Event;
    const submit = { preventDefault: vi.fn() } as unknown as Event;

    component.ngOnInit();
    await vi.waitFor(() => expect(component.history()?.map(item => item.version)).toEqual([2, 1]));

    component.openRenewal(contract);
    component.setRenewal('endDate', typed('2026-06-30'));
    await component.renew(contract, submit);
    expect(store.renewContract).not.toHaveBeenCalled();
    expect(component.message()).toContain('posterior al 2026-12-31');

    component.setRenewal('endDate', typed('2027-12-31'));
    await component.renew(contract, submit);
    expect(store.renewContract).toHaveBeenCalledWith(3, 7, { startDate: '2026-01-01', endDate: '2027-12-31' });
    expect(component.renewal()).toBeNull();

    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    await component.terminate(contract);
    expect(store.terminateContract).not.toHaveBeenCalled();
    await component.terminate(contract);
    expect(store.terminateContract).toHaveBeenCalledWith(3, 7);
    confirm.mockRestore();
  });
});
