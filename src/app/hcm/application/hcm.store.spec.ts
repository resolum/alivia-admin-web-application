import { TestBed } from '@angular/core/testing';
import { HcmApi, HcmApiError } from '../infrastructure/hcm.api';
import { HcmStore } from './hcm.store';

const contract = {
  id: 1, code: 'CTR-ALV-2026-000001', employeeId: 2, employeeName: 'Ana Pérez', businessId: 1,
  position: 'Técnico de dispositivos', modality: 'HOURLY' as const, weeklyHours: 40,
  startDate: '2026-01-01', endDate: '2026-12-31', status: 'ACTIVE' as const,
  eligible: true, notes: '', createdAt: '', updatedAt: '',
};

describe('HcmStore', () => {
  const api = {
    listContracts: vi.fn(), getContract: vi.fn(), listEmployees: vi.fn(),
    createContract: vi.fn(), updateContract: vi.fn(),
  };
  let store: HcmStore;

  beforeEach(() => {
    Object.values(api).forEach(mock => mock.mockReset());
    TestBed.configureTestingModule({ providers: [HcmStore, { provide: HcmApi, useValue: api }] });
    store = TestBed.inject(HcmStore);
  });

  it('loads, summarizes, filters and paginates contracts', async () => {
    api.listContracts.mockResolvedValue({ content: [contract], totalElements: 1, totalPages: 2 });
    await store.loadContracts();
    expect(store.summary()).toEqual({ total: 1, active: 1, pending: 0, expired: 0 });
    store.setFilters({ search: 'ana' });
    expect(store.hasActiveFilters()).toBe(true);
    store.goToPage(1);
    expect(store.filters().page).toBe(1);
    store.goToPage(5);
    expect(store.filters().page).toBe(1);
  });

  it('treats a missing contracts endpoint as an empty result and exposes other errors', async () => {
    api.listContracts.mockRejectedValueOnce(new HcmApiError('missing', 404));
    await store.loadContracts();
    expect(store.contracts()).toEqual([]);
    api.listContracts.mockRejectedValueOnce(new Error('backend unavailable'));
    await store.loadContracts();
    expect(store.error()).toBe('backend unavailable');
  });

  it('loads contracts and employees and delegates writes', async () => {
    api.getContract.mockResolvedValueOnce(contract).mockRejectedValueOnce('failure');
    await store.selectContract(2, 1);
    expect(store.selected()).toEqual(contract);
    await store.selectContract(2, 1);
    expect(store.error()).toBe('No se pudo consultar el contrato');

    const employees = [{ id: 2, firstName: 'Ana', lastName: 'Pérez' }];
    api.listEmployees.mockResolvedValueOnce(employees).mockRejectedValueOnce(new Error('employees failed'));
    await store.loadEmployees();
    expect(store.employees()).toEqual(employees);
    await store.loadEmployees();
    expect(store.error()).toBe('employees failed');

    api.createContract.mockResolvedValue(contract);
    api.updateContract.mockResolvedValue(contract);
    expect(await store.saveContract({ ...contract, initialStatus: 'ACTIVE' })).toEqual(contract);
    expect(await store.updateContract(2, 1, contract)).toEqual(contract);
  });
});
