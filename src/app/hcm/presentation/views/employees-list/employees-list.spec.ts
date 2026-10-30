import { TestBed } from '@angular/core/testing';
import { EmployeesStore } from '../../../application/employees.store';
import { EmployeeRow } from '../../../domain/employee.entity';
import { EmployeesList } from './employees-list';

type ListInternals = { search(event: Event): void; role(role: string): void; toggleMenu(id: number): void; openMenu(): number | null; canConfigureSchedule(row: EmployeeRow): boolean };

describe('EmployeesList', () => {
  it('loads, filters and decides which actions to offer', () => {
    const store = { load: vi.fn(), setFilters: vi.fn() };
    TestBed.configureTestingModule({ providers: [{ provide: EmployeesStore, useValue: store }] });
    const component = TestBed.runInInjectionContext(() => new EmployeesList());
    const view = component as unknown as ListInternals;

    component.ngOnInit();
    view.search({ target: { value: 'ana' } } as unknown as Event);
    view.role('TECH');
    view.toggleMenu(3);
    expect(view.openMenu()).toBe(3);
    view.toggleMenu(3);
    expect(view.openMenu()).toBeNull();

    expect(store.load).toHaveBeenCalled();
    expect(store.setFilters.mock.calls).toEqual([[{ search: 'ana' }], [{ role: 'TECH' }]]);
    expect(view.canConfigureSchedule({ contract: { id: 1 }, contractState: 'EXPIRING' } as unknown as EmployeeRow)).toBe(true);
    expect(view.canConfigureSchedule({ contract: { id: 1 }, contractState: 'EXPIRED' } as unknown as EmployeeRow)).toBe(false);
    expect(view.canConfigureSchedule({ contract: null, contractState: 'NONE' } as unknown as EmployeeRow)).toBe(false);
  });
});
