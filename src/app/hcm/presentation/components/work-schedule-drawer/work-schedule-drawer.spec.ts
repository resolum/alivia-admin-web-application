import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { WorkSchedule } from '../../../domain/work-schedule.entity';
import { WorkScheduleDrawer } from './work-schedule-drawer';

const schedule = {
  id: 12, code: 'HOR-2026-0012', employeeId: 3, employeeName: 'Santiago Vega', employeeRole: 'TECH', businessId: 1,
  name: 'Turno Rotativo A', startDate: '2026-01-01', endDate: null, status: 'ACTIVE',
  shifts: [{ day: 'MONDAY', startTime: '08:00:00', endTime: '12:00:00' }, { day: 'MONDAY', startTime: '13:00:00', endTime: '17:00:00' }],
  workingDays: ['MONDAY'], weeklyHours: 8,
  contract: { id: 5, code: 'CTR-ALV-2026-0005', modality: 'HOURLY', weeklyHours: 8, startDate: '2026-01-01', endDate: '2026-12-31', status: 'ACTIVE' },
  compliance: 'COMPLIANT', exceedsLegalLimit: false, lastModifiedBy: 1, createdAt: '', updatedAt: '',
} as unknown as WorkSchedule;

describe('WorkScheduleDrawer', () => {
  it('shows the blocks per day, the rest days and the contract', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(WorkScheduleDrawer);
    fixture.componentRef.setInput('schedule', schedule);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('08:00 - 12:00');
    expect(text).toContain('DESCANSO');
    expect(text).toContain('CTR-ALV-2026-0005');
    expect(text).toContain('En cumplimiento');
  });

  it('emits close and edit', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(WorkScheduleDrawer);
    fixture.componentRef.setInput('schedule', schedule);
    const closed = vi.fn(); const edit = vi.fn();
    fixture.componentInstance.closed.subscribe(closed);
    fixture.componentInstance.edit.subscribe(edit);
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.drawer-close')!.click();
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.drawer-actions .primary')!.click();
    expect(closed).toHaveBeenCalled();
    expect(edit).toHaveBeenCalledWith(schedule);
  });
});
