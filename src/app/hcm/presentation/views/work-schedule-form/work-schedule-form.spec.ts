import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { WorkSchedulesStore } from '../../../application/work-schedules.store';
import { WorkScheduleForm } from './work-schedule-form';

type FormInternals = {
  form: {
    patchValue(value: object): void;
    getRawValue(): { endDate: string; indefinite: boolean };
    controls: { contractId: { value: number; disabled: boolean }; endDate: { value: string } };
  };
  setIndefinite(event: Event): void;
  days: () => { day: string; enabled: boolean; blocks: { startTime: string; endTime: string }[] }[];
  configuredHours: () => number;
  save(draft: boolean): Promise<void>;
  message: () => string;
  toggleDay(day: string): void;
  addBlock(day: string): void;
  copyMondayToWeekdays(): void;
  removeBlock(day: string, index: number): void;
};

describe('WorkScheduleForm', () => {
  const store = {
    openContracts: signal([
      { id: 5, code: 'CTR-ALV-2026-0005', employeeId: 3, employeeName: 'Santiago Vega', status: 'ACTIVE', startDate: '2000-01-01', endDate: '2999-12-31', weeklyHours: 40, modality: 'HOURLY' },
      { id: 6, code: 'CTR-ALV-2026-0006', employeeId: 4, employeeName: 'Valeria Ramos', status: 'PENDING', startDate: '2000-01-01', endDate: '2999-12-31', weeklyHours: 48, modality: 'HOURLY' },
    ]),
    selected: signal(null),
    loadOpenContracts: vi.fn(), selectSchedule: vi.fn(),
    createSchedule: vi.fn(), updateSchedule: vi.fn(), deactivateSchedule: vi.fn(),
  };
  const router = { navigate: vi.fn() };
  let component: FormInternals;

  const route = { snapshot: { paramMap: { get: () => null }, queryParamMap: { get: (_key: string): string | null => null } } };

  async function create(): Promise<FormInternals> {
    const form = TestBed.runInInjectionContext(() => new WorkScheduleForm());
    form.ngOnInit();
    for (let tick = 0; tick < 5; tick++) await Promise.resolve();
    return form as unknown as FormInternals;
  }

  beforeEach(async () => {
    route.snapshot.queryParamMap.get = () => null;
    Object.values(store).forEach(value => typeof value === 'function' && 'mockReset' in value && value.mockReset());
    router.navigate.mockReset();
    TestBed.configureTestingModule({ providers: [
      { provide: WorkSchedulesStore, useValue: store },
      { provide: Router, useValue: router },
      { provide: ActivatedRoute, useValue: route },
    ] });
    component = await create();
  });

  it('starts with a split 40 h weekday plan inside the first open contract', () => {
    expect(store.loadOpenContracts).toHaveBeenCalled();
    expect(component.form.controls.contractId.value).toBe(5);
    expect(component.configuredHours()).toBe(40);
  });

  it('locks the contract when it is opened from it', async () => {
    route.snapshot.queryParamMap.get = (key: string) => key === 'contractId' ? '6' : null;
    const fromContract = await create();
    expect(fromContract.form.controls.contractId.value).toBe(6);
    expect(fromContract.form.controls.contractId.disabled).toBe(true);
  });

  it('ends the schedule with the contract by default', () => {
    expect(component.form.getRawValue()).toMatchObject({ endDate: '2999-12-31', indefinite: false });
    component.setIndefinite({ target: { checked: true } } as unknown as Event);
    expect(component.form.controls.endDate.value).toBe('');
    component.setIndefinite({ target: { checked: false } } as unknown as Event);
    expect(component.form.controls.endDate.value).toBe('2999-12-31');
  });

  it('edits the weekly plan', () => {
    component.toggleDay('SATURDAY');
    expect(component.configuredHours()).toBe(44);
    component.addBlock('SATURDAY');
    expect(component.days().find(day => day.day === 'SATURDAY')!.blocks).toHaveLength(2);
    component.removeBlock('MONDAY', 1);
    component.copyMondayToWeekdays();
    expect(component.days().filter(day => day.blocks.length === 1).map(day => day.day)).toEqual(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']);
  });

  it('requires a name and sends the shifts of enabled days', async () => {
    await component.save(false);
    expect(component.message()).toBe('Completa: el nombre del horario.');
    expect(store.createSchedule).not.toHaveBeenCalled();

    component.form.patchValue({ name: 'Jornada Ordinaria Diurna' });
    await component.save(false);
    const [employeeId, contractId, input] = store.createSchedule.mock.calls[0]!;
    expect(employeeId).toBe(3);
    expect(contractId).toBe(5);
    expect(input).toMatchObject({ name: 'Jornada Ordinaria Diurna', endDate: '2999-12-31', draft: false });
    expect(input.shifts).toHaveLength(10);
    expect(router.navigate).toHaveBeenCalledWith(['/hcm/work-schedules']);
  });

  it('allows an empty draft but not an empty published schedule', async () => {
    component.form.patchValue({ name: 'Borrador' });
    ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].forEach(day => component.toggleDay(day));
    await component.save(false);
    expect(component.message()).toContain('al menos un bloque');
    await component.save(true);
    expect(store.createSchedule).toHaveBeenCalledWith(3, 5, expect.objectContaining({ draft: true, shifts: [] }));
  });
});
