import { TestBed } from '@angular/core/testing';
import { HcmApi } from '../infrastructure/hcm.api';
import { EmployeesStore } from './employees.store';

const employee = (id: number, role: string, status = 'ACTIVE', firstName = 'Ana') =>
  ({ id, role, status, firstName, lastName: 'Pérez', dni: `7000000${id}` });

describe('EmployeesStore', () => {
  const api = { listAllEmployees: vi.fn(), listContracts: vi.fn(), listWorkSchedules: vi.fn(), createEmployee: vi.fn() };
  let store: EmployeesStore;

  beforeEach(() => {
    Object.values(api).forEach(mock => mock.mockReset());
    api.listAllEmployees.mockResolvedValue([employee(1, 'TECH'), employee(2, 'TECH', 'ACTIVE', 'Luis'), employee(3, 'SUBSCRIPTION_MANAGER'), employee(4, 'TECH', 'TERMINATED')]);
    api.listContracts.mockResolvedValue({ content: [{ id: 9, employeeId: 1, status: 'ACTIVE', startDate: '2026-01-01', endDate: '2027-12-31' }] });
    api.listWorkSchedules.mockResolvedValue({ content: [] });
    TestBed.configureTestingModule({ providers: [{ provide: HcmApi, useValue: api }] });
    store = TestBed.inject(EmployeesStore);
  });

  it('loads employees with their contracts and summarizes them', async () => {
    await store.load(new Date(2026, 9, 26, 10, 0));

    expect(store.rows()).toHaveLength(4);
    expect(store.summary()).toMatchObject({ total: 4, technicians: 2, managers: 1, pending: 3, withoutContract: 2, withoutSchedule: 3 });
    expect(store.roleCounts()).toEqual({ ALL: 4, TECH: 3, SUBSCRIPTION_MANAGER: 1 });
  });

  it('filters by role and text and paginates on the client', async () => {
    await store.load();
    store.setFilters({ role: 'TECH' });
    expect(store.filtered()).toHaveLength(3);
    store.setFilters({ search: 'luis' });
    expect(store.filtered().map(row => row.employee.id)).toEqual([2]);

    store.setFilters({ search: '', role: 'ALL', size: 3 } as never);
    expect(store.totalPages()).toBe(2);
    store.goToPage(1);
    expect(store.page()).toHaveLength(1);
    store.goToPage(5);
    expect(store.filters().page).toBe(1);
  });

  it('reports load errors and delegates creation', async () => {
    api.listAllEmployees.mockRejectedValueOnce(new Error('down'));
    await store.load();
    expect(store.error()).toBe('down');

    await store.create({ corporateEmail: 'a@alivia.pe', phoneNumber: '51987654321', firstName: 'Ana', lastName: 'Pérez Ruiz', dni: '12345678', birthDate: '1990-01-01', role: 'TECH' });
    expect(api.createEmployee).toHaveBeenCalled();
  });
});
