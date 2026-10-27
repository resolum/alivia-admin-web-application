import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { WorkSchedulesStore } from '../../../application/work-schedules.store';
import { WorkSchedule } from '../../../domain/work-schedule.entity';
import { WorkSchedulesList } from './work-schedules-list';

type ListInternals = {
  search(event: Event): void; role(event: Event): void; status(event: Event): void;
  toggleMenu(id: number): void; openMenu(): number | null;
  showDetail(schedule: WorkSchedule): void; edit(schedule: WorkSchedule): void;
  worksOn(schedule: WorkSchedule, day: string): boolean; isOverloaded(schedule: WorkSchedule): boolean;
  roleFilterLabel(): string; statusFilterLabel(): string;
};

describe('WorkSchedulesList', () => {
  const filters = { search: '', role: 'ALL', status: 'ALL', page: 0, size: 8 };
  const store = {
    filters: vi.fn(() => filters), loadSchedules: vi.fn(), setFilters: vi.fn(), showDetail: vi.fn(), closeDetail: vi.fn(),
  };
  const router = { navigate: vi.fn() };
  const schedule = { id: 12, employeeId: 3, workingDays: ['MONDAY'], exceedsLegalLimit: false, compliance: 'COMPLIANT' } as unknown as WorkSchedule;
  let component: WorkSchedulesList;
  let view: ListInternals;

  beforeEach(() => {
    Object.values(store).forEach(mock => mock.mockClear());
    TestBed.configureTestingModule({ providers: [{ provide: WorkSchedulesStore, useValue: store }, { provide: Router, useValue: router }] });
    component = TestBed.runInInjectionContext(() => new WorkSchedulesList());
    view = component as unknown as ListInternals;
  });

  it('loads on init, forwards filters and clears the detail on destroy', () => {
    component.ngOnInit();
    view.search({ target: { value: 'turno' } } as unknown as Event);
    view.role({ target: { value: 'TECH' } } as unknown as Event);
    view.status({ target: { value: 'ACTIVE' } } as unknown as Event);
    component.ngOnDestroy();

    expect(store.loadSchedules).toHaveBeenCalledOnce();
    expect(store.setFilters.mock.calls).toEqual([[{ search: 'turno' }], [{ role: 'TECH' }], [{ status: 'ACTIVE' }]]);
    expect(store.closeDetail).toHaveBeenCalled();
  });

  it('labels the applied filters', () => {
    expect(view.roleFilterLabel()).toBe('');
    filters.role = 'TECH'; filters.status = 'SCHEDULED';
    const fresh = TestBed.runInInjectionContext(() => new WorkSchedulesList()) as unknown as ListInternals;
    expect(fresh.roleFilterLabel()).toBe('Soporte técnico');
    expect(fresh.statusFilterLabel()).toBe('Programado');
    filters.role = 'ALL'; filters.status = 'ALL';
  });

  it('opens the row menu, the detail and the edit form', () => {
    view.toggleMenu(12);
    expect(view.openMenu()).toBe(12);
    view.toggleMenu(12);
    expect(view.openMenu()).toBeNull();

    view.showDetail(schedule);
    expect(store.showDetail).toHaveBeenCalledWith(schedule);
    view.edit(schedule);
    expect(router.navigate).toHaveBeenCalledWith(['/hcm/work-schedules', 3, 12, 'edit']);
  });

  it('marks working days and overloaded schedules', () => {
    expect(view.worksOn(schedule, 'MONDAY')).toBe(true);
    expect(view.worksOn(schedule, 'SUNDAY')).toBe(false);
    expect(view.isOverloaded(schedule)).toBe(false);
    expect(view.isOverloaded({ ...schedule, compliance: 'OVER' })).toBe(true);
    expect(view.isOverloaded({ ...schedule, exceedsLegalLimit: true })).toBe(true);
  });
});
