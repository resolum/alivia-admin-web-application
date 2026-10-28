import { computed, inject, Injectable, signal } from '@angular/core';
import { CreateEmployee, Employee, EmployeeRow, toEmployeeRow } from '../domain/employee.entity';
import { EmployeeRole } from '../domain/work-schedule.entity';
import { ContractsApi } from '../infrastructure/contracts.api';
import { EmployeesApi } from '../infrastructure/employees.api';
import { WorkSchedulesApi } from '../infrastructure/work-schedules.api';

export interface EmployeeFilters { search: string; role: EmployeeRole | 'ALL'; page: number; size: number; }

@Injectable({ providedIn: 'root' })
export class EmployeesStore {
  private readonly employeesApi = inject(EmployeesApi);
  private readonly contractsApi = inject(ContractsApi);
  private readonly workSchedulesApi = inject(WorkSchedulesApi);
  private readonly rowsState = signal<EmployeeRow[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly filters = signal<EmployeeFilters>({ search: '', role: 'ALL', page: 0, size: 6 });
  readonly rows = this.rowsState.asReadonly();

  readonly filtered = computed(() => {
    const { search, role } = this.filters();
    const term = search.trim().toLowerCase();
    return this.rowsState().filter(row => (role === 'ALL' || row.employee.role === role) && (!term
      || `${row.employee.firstName} ${row.employee.lastName} ${row.code} ${row.employee.dni}`.toLowerCase().includes(term)));
  });
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.filters().size)));
  readonly page = computed(() => {
    const { page, size } = this.filters();
    return this.filtered().slice(page * size, page * size + size);
  });
  readonly roleCounts = computed(() => {
    const rows = this.rowsState();
    return { ALL: rows.length, TECH: rows.filter(row => row.employee.role === 'TECH').length, SUBSCRIPTION_MANAGER: rows.filter(row => row.employee.role === 'SUBSCRIPTION_MANAGER').length };
  });
  readonly summary = computed(() => {
    const active = this.rowsState().filter(row => row.employee.status === 'ACTIVE');
    const pending = active.filter(row => row.contractState === 'NONE' || row.contractState === 'EXPIRED' || row.scheduleDays === null);
    return {
      total: this.rowsState().length,
      technicians: active.filter(row => row.employee.role === 'TECH').length,
      managers: active.filter(row => row.employee.role === 'SUBSCRIPTION_MANAGER').length,
      available: active.filter(row => row.availability === 'AVAILABLE').length,
      pending: pending.length,
      withoutContract: pending.filter(row => row.contractState === 'NONE' || row.contractState === 'EXPIRED').length,
      withoutSchedule: pending.filter(row => row.scheduleDays === null).length,
      expiring: active.filter(row => row.contractState === 'EXPIRING').length,
    };
  });

  /** Loads employees with their contracts and schedules, which live in other HCM resources. */
  async load(now = new Date()): Promise<void> {
    this.loading.set(true); this.error.set(null);
    try {
      const [employees, contracts, schedules] = await Promise.all([
        this.employeesApi.listAllEmployees(),
        this.contractsApi.listContracts({ search: '', status: 'ALL', modality: 'ALL', page: 0, size: 200 }),
        this.workSchedulesApi.listWorkSchedules({ search: '', role: 'ALL', status: 'ALL', page: 0, size: 200 }),
      ]);
      this.rowsState.set(employees.map(employee => toEmployeeRow(employee, contracts.content, schedules.content, now)));
    }
    catch (error) { this.error.set(error instanceof Error ? error.message : 'No se pudieron consultar los empleados'); }
    finally { this.loading.set(false); }
  }

  setFilters(filters: Partial<EmployeeFilters>): void {
    this.filters.update(current => ({ ...current, ...filters, page: filters.page ?? 0 }));
  }

  goToPage(page: number): void {
    if (page < 0 || page >= this.totalPages()) return;
    this.filters.update(current => ({ ...current, page }));
  }

  create(input: CreateEmployee): Promise<Employee> { return this.employeesApi.createEmployee(input); }
}
