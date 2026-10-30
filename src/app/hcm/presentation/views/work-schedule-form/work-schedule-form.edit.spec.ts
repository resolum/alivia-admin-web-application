import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { WorkSchedulesStore } from '../../../application/work-schedules.store';
import { HcmApiError } from '../../../infrastructure/hcm-http.client';
import { WorkScheduleForm } from './work-schedule-form';

type FormInternals = {
  form: { patchValue(value: object): void; getRawValue(): { name: string; endDate: string; indefinite: boolean } };
  days: () => { day: string; enabled: boolean; blocks: { startTime: string; endTime: string }[] }[];
  editing: () => unknown; applicationStatus: () => string; bindingContract: () => { code: string } | null;
  hasBlockErrors: () => boolean; message: () => string; conflict: () => boolean;
  save(draft: boolean): Promise<void>; deactivate(): Promise<void>; changeContract(): void;
  setTime(day: string, index: number, field: string, event: Event): void; setIndefinite(event: Event): void;
};

const schedule = {
  id: 12, code: 'HOR-2026-0012', employeeId: 3, employeeName: 'Santiago Vega', name: 'Turno A', status: 'ACTIVE',
  startDate: '2026-01-01', endDate: '2026-06-30', updatedAt: '2026-01-15T00:00:00',
  shifts: [{ day: 'MONDAY', startTime: '08:00:00', endTime: '12:00:00' }],
  contract: { id: 5, code: 'CTR-ALV-2026-0005', modality: 'HOURLY', weeklyHours: 40, startDate: '2026-01-01', endDate: '2026-12-31', status: 'ACTIVE' },
};

describe('WorkScheduleForm editing', () => {
  const store = {
    openContracts: signal([]), selected: signal<unknown>(schedule),
    loadOpenContracts: vi.fn(), selectSchedule: vi.fn(), createSchedule: vi.fn(), updateSchedule: vi.fn(), deactivateSchedule: vi.fn(),
  };
  const router = { navigate: vi.fn() };
  let component: FormInternals;

  beforeEach(async () => {
    [store.updateSchedule, store.deactivateSchedule, router.navigate].forEach(mock => mock.mockReset());
    store.selected.set(schedule);
    TestBed.configureTestingModule({ providers: [
      { provide: WorkSchedulesStore, useValue: store }, { provide: Router, useValue: router },
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: (key: string) => key === 'employeeId' ? '3' : '12' }, queryParamMap: { get: () => null } } } },
    ] });
    const form = TestBed.runInInjectionContext(() => new WorkScheduleForm());
    form.ngOnInit();
    for (let tick = 0; tick < 5; tick++) await Promise.resolve();
    component = form as unknown as FormInternals;
  });

  it('loads the schedule with its contract and blocks', () => {
    expect(store.selectSchedule).toHaveBeenCalledWith(3, 12);
    expect(component.editing()).toBeTruthy();
    expect(component.bindingContract()?.code).toBe('CTR-ALV-2026-0005');
    expect(component.form.getRawValue()).toMatchObject({ name: 'Turno A', endDate: '2026-06-30', indefinite: false });
    expect(component.days().find(day => day.day === 'MONDAY')?.blocks).toEqual([{ startTime: '08:00', endTime: '12:00' }]);
    expect(component.days().find(day => day.day === 'TUESDAY')?.enabled).toBe(false);
    expect(['ACTIVE', 'SCHEDULED']).toContain(component.applicationStatus());
    component.changeContract();
    expect(component.bindingContract()?.code).toBe('CTR-ALV-2026-0005');
  });

  it('edits times and the open end', () => {
    component.setTime('MONDAY', 0, 'endTime', { target: { value: '07:00' } } as unknown as Event);
    expect(component.hasBlockErrors()).toBe(true);
    component.setIndefinite({ target: { checked: true } } as unknown as Event);
    expect(component.form.getRawValue()).toMatchObject({ indefinite: true, endDate: '' });
  });

  it('validates blocks and dates against the contract before saving', async () => {
    component.setTime('MONDAY', 0, 'endTime', { target: { value: '07:00' } } as unknown as Event);
    await component.save(false);
    expect(component.message()).toContain('bloques horarios');

    component.setTime('MONDAY', 0, 'endTime', { target: { value: '12:00' } } as unknown as Event);
    component.form.patchValue({ endDate: '2025-12-31' });
    await component.save(false);
    expect(component.message()).toContain('anterior a la de inicio');

    component.form.patchValue({ endDate: '2027-03-31' });
    await component.save(false);
    expect(component.message()).toContain('dentro del contrato CTR-ALV-2026-0005');
    expect(store.updateSchedule).not.toHaveBeenCalled();
  });

  it('updates the schedule and explains a conflict', async () => {
    await component.save(false);
    expect(store.updateSchedule).toHaveBeenCalledWith(3, 12, expect.objectContaining({ name: 'Turno A', endDate: '2026-06-30' }));
    expect(router.navigate).toHaveBeenCalledWith(['/hcm/work-schedules']);

    store.updateSchedule.mockRejectedValueOnce(new HcmApiError('Overlap', 409));
    await component.save(false);
    expect(component.conflict()).toBe(true);
    expect(component.message()).toBe('Overlap');
  });

  it('deactivates only after confirmation', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true).mockReturnValueOnce(true);
    await component.deactivate();
    expect(store.deactivateSchedule).not.toHaveBeenCalled();

    await component.deactivate();
    expect(store.deactivateSchedule).toHaveBeenCalledWith(3, 12);

    store.deactivateSchedule.mockRejectedValueOnce(new Error('No se pudo'));
    await component.deactivate();
    expect(component.message()).toBe('No se pudo');
    confirm.mockRestore();
  });
});
