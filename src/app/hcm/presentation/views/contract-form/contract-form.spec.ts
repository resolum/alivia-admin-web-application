import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { HcmStore } from '../../../application/hcm.store';
import { HcmApiError } from '../../../infrastructure/hcm-http.client';
import { ContractForm } from './contract-form';

const contract = {
  id: 7, code: 'CTR-ALV-2026-000007', employeeId: 3, employeeName: 'Ana Pérez', businessId: 1,
  position: 'Técnico de dispositivos', modality: 'HOURLY' as const, weeklyHours: 40,
  startDate: '2026-01-01', endDate: '2026-12-31', status: 'ACTIVE' as const,
  eligible: true, notes: 'Contrato vigente', createdAt: '', updatedAt: '',
};

describe('ContractForm', () => {
  const store = {
    loadEmployees: vi.fn(), employees: vi.fn(), selectContract: vi.fn(), selected: vi.fn(),
    saveContract: vi.fn(), updateContract: vi.fn(),
  };
  const router = { navigate: vi.fn() };

  function create(employeeId: string | null = null, contractId: string | null = null): ContractForm {
    const route = { snapshot: { paramMap: { get: (key: string) => key === 'employeeId' ? employeeId : contractId } } };
    TestBed.configureTestingModule({ providers: [
      { provide: HcmStore, useValue: store },
      { provide: Router, useValue: router },
      { provide: ActivatedRoute, useValue: route },
    ] });
    return TestBed.runInInjectionContext(() => new ContractForm());
  }

  beforeEach(() => {
    Object.values(store).forEach(mock => mock.mockReset());
    router.navigate.mockReset();
    store.loadEmployees.mockResolvedValue(undefined);
    store.employees.mockReturnValue([{ id: 3, firstName: 'Ana', lastName: 'Pérez' }]);
    router.navigate.mockResolvedValue(true);
  });

  it('initializes a new contract, generates its code and submits it', async () => {
    const component = create();
    await (component as unknown as { initialize(): Promise<void> }).initialize();
    const form = (component as unknown as { form: { controls: { code: { value: string }, employeeId: { value: number } } } }).form;
    expect(form.controls.code.value).toMatch(/^CTR-ALV-\d{4}-\d{6}$/);
    expect(form.controls.employeeId.value).toBe(3);

    await (component as unknown as { submit(): Promise<void> }).submit();
    expect(store.saveContract).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/hcm/contracts']);
  });

  it('loads and updates an existing contract', async () => {
    store.selected.mockReturnValue(contract);
    const component = create('3', '7');
    await (component as unknown as { initialize(): Promise<void> }).initialize();
    await (component as unknown as { submit(): Promise<void> }).submit();

    expect(store.selectContract).toHaveBeenCalledWith(3, 7);
    expect(store.updateContract).toHaveBeenCalledWith(3, 7, expect.objectContaining({ position: contract.position }));
  });

  it('marks invalid forms and presents backend conflicts', async () => {
    const component = create();
    const internal = component as unknown as {
      initialize(): Promise<void>; submit(): Promise<void>;
      form: { controls: { code: { setValue(value: string): void } } };
      conflict(): boolean; message(): string;
    };
    await internal.initialize();
    internal.form.controls.code.setValue('invalid');
    await internal.submit();
    expect(store.saveContract).not.toHaveBeenCalled();

    internal.form.controls.code.setValue('CTR-ALV-2026-000099');
    store.saveContract.mockRejectedValue(new HcmApiError('Contrato incompatible', 409));
    await internal.submit();
    expect(internal.conflict()).toBe(true);
    expect(internal.message()).toBe('Contrato incompatible');
  });
});
