import { TestBed } from '@angular/core/testing';
import { WorkSchedulesApi } from '../infrastructure/work-schedules.api';
import { ContractsApi } from '../infrastructure/contracts.api';
import { HcmApiError } from '../infrastructure/hcm-http.client';
import { WorkSchedulesStore } from './work-schedules.store';

describe('WorkSchedulesStore', () => {
  const api = {
    listWorkSchedules: vi.fn(), getWorkScheduleSummary: vi.fn(), getWorkSchedule: vi.fn(), listContracts: vi.fn(), listContractWorkSchedules: vi.fn(), createWorkSchedule: vi.fn(), updateWorkSchedule: vi.fn(), deactivateWorkSchedule: vi.fn(),
  };
  let store: WorkSchedulesStore;

  beforeEach(() => {
    Object.values(api).forEach(mock => mock.mockReset());
    TestBed.configureTestingModule({ providers: [{ provide: WorkSchedulesApi, useValue: api }, { provide: ContractsApi, useValue: api }] });
    store = TestBed.inject(WorkSchedulesStore);
  });

  it('loads the page and the summary together', async () => {
    api.listWorkSchedules.mockResolvedValue({ content: [{ id: 1 }], page: 0, size: 8, totalElements: 1, totalPages: 1 });
    api.getWorkScheduleSummary.mockResolvedValue({ totalSchedules: 1, employeesWithSchedule: 1, averageWeeklyHours: 40 });

    await store.loadSchedules();

    expect(store.schedules()).toHaveLength(1);
    expect(store.summary().averageWeeklyHours).toBe(40);
    expect(store.loading()).toBe(false);
  });

  it('treats a missing endpoint as an empty list and other failures as errors', async () => {
    api.listWorkSchedules.mockRejectedValueOnce(new HcmApiError('missing', 404));
    api.getWorkScheduleSummary.mockResolvedValue({ totalSchedules: 0, employeesWithSchedule: 0, averageWeeklyHours: 0 });
    await store.loadSchedules();
    expect(store.error()).toBeNull();

    api.listWorkSchedules.mockRejectedValueOnce(new HcmApiError('boom', 500));
    await store.loadSchedules();
    expect(store.error()).toBe('boom');
  });

  it('resets the page when filters change and tracks active filters', () => {
    api.listWorkSchedules.mockResolvedValue({ content: [], page: 0, size: 8, totalElements: 0, totalPages: 0 });
    api.getWorkScheduleSummary.mockResolvedValue({ totalSchedules: 0, employeesWithSchedule: 0, averageWeeklyHours: 0 });

    store.setFilters({ role: 'TECH' });
    expect(store.filters()).toMatchObject({ role: 'TECH', page: 0 });
    expect(store.hasActiveFilters()).toBe(true);

    store.clearFilters();
    expect(store.hasActiveFilters()).toBe(false);
  });

  it('opens and closes the detail drawer', () => {
    store.showDetail({ id: 3 } as never);
    expect(store.selected()?.id).toBe(3);
    store.closeDetail();
    expect(store.selected()).toBeNull();
  });

  it('offers only pending and active contracts to configure a schedule', async () => {
    api.listContracts.mockResolvedValue({ content: [{ id: 1, status: 'ACTIVE' }, { id: 2, status: 'PENDING' }, { id: 3, status: 'EXPIRED' }, { id: 4, status: 'TERMINATED' }] });
    await store.loadOpenContracts();
    expect(store.openContracts().map(contract => contract.id)).toEqual([1, 2]);

    api.listContracts.mockRejectedValue(new Error('down'));
    await store.loadOpenContracts();
    expect(store.openContracts()).toEqual([]);
    expect(store.error()).toBe('down');
  });

  it('selects a schedule and reports when it cannot be read', async () => {
    api.getWorkSchedule.mockResolvedValueOnce({ id: 12 });
    await store.selectSchedule(3, 12);
    expect(store.selected()?.id).toBe(12);

    api.getWorkSchedule.mockRejectedValueOnce(new Error('gone'));
    await store.selectSchedule(3, 13);
    expect(store.error()).toBe('gone');
  });

  it('loads the schedules of a contract and keeps an empty list on failure', async () => {
    api.listContractWorkSchedules.mockResolvedValueOnce([{ id: 1 }]);
    await store.loadContractSchedules(5);
    expect(store.contractSchedules()).toHaveLength(1);

    api.listContractWorkSchedules.mockRejectedValueOnce(new Error('down'));
    await store.loadContractSchedules(5);
    expect(store.contractSchedules()).toEqual([]);
  });

  it('moves between pages only inside the range', async () => {
    api.listWorkSchedules.mockResolvedValue({ content: [], page: 0, size: 8, totalElements: 20, totalPages: 3 });
    api.getWorkScheduleSummary.mockResolvedValue({ totalSchedules: 0, employeesWithSchedule: 0, averageWeeklyHours: 0 });
    await store.loadSchedules();

    store.goToPage(2);
    expect(store.filters().page).toBe(2);
    store.goToPage(3);
    store.goToPage(-1);
    expect(store.filters().page).toBe(2);
  });

  it('delegates create, update and deactivate to the API', async () => {
    const input = { name: 'Turno', startDate: '2026-01-01', endDate: null, shifts: [], draft: false };
    await store.createSchedule(3, 5, input);
    await store.updateSchedule(3, 12, input);
    await store.deactivateSchedule(3, 12);
    expect(api.createWorkSchedule).toHaveBeenCalledWith(3, 5, input);
    expect(api.updateWorkSchedule).toHaveBeenCalledWith(3, 12, input);
    expect(api.deactivateWorkSchedule).toHaveBeenCalledWith(3, 12);
  });
});
