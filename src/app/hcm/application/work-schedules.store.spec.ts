import { TestBed } from '@angular/core/testing';
import { HcmApi, HcmApiError } from '../infrastructure/hcm.api';
import { WorkSchedulesStore } from './work-schedules.store';

describe('WorkSchedulesStore', () => {
  const api = {
    listWorkSchedules: vi.fn(), getWorkScheduleSummary: vi.fn(), getWorkSchedule: vi.fn(), listContracts: vi.fn(), createWorkSchedule: vi.fn(), updateWorkSchedule: vi.fn(), deactivateWorkSchedule: vi.fn(),
  };
  let store: WorkSchedulesStore;

  beforeEach(() => {
    Object.values(api).forEach(mock => mock.mockReset());
    TestBed.configureTestingModule({ providers: [{ provide: HcmApi, useValue: api }] });
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
});
