import { inject, Injectable } from '@angular/core';
import { API_PATHS } from '../../shared/infrastructure/api.config';
import { EmployeeOption } from '../domain/contract.entity';
import { SaveWorkSchedule, WorkSchedule, WorkScheduleFilters, WorkSchedulePage, WorkScheduleSummary } from '../domain/work-schedule.entity';
import { contractPath } from './contracts.api';
import { EmployeesApi } from './employees.api';
import { HcmHttpClient } from './hcm-http.client';

type WorkScheduleResponse = Omit<WorkSchedule, 'employeeName' | 'employeeRole'>;

@Injectable({ providedIn: 'root' })
export class WorkSchedulesApi {
  private readonly http = inject(HcmHttpClient);
  private readonly employees = inject(EmployeesApi);

  async listWorkSchedules(filters: WorkScheduleFilters): Promise<WorkSchedulePage> {
    const params = this.http.params({ page: String(filters.page), size: String(filters.size), sort: 'id,desc' });
    if (filters.search.trim()) params.set('search', filters.search.trim());
    if (filters.role !== 'ALL') params.set('role', filters.role);
    if (filters.status !== 'ALL') params.set('status', filters.status);
    const [page, employees] = await Promise.all([
      this.http.request<Omit<WorkSchedulePage, 'content'> & { content: WorkScheduleResponse[] }>(this.http.url(API_PATHS.workSchedules, params)),
      this.employees.listEmployees(),
    ]);
    return { ...page, content: page.content.map(schedule => withEmployee(schedule, employees)) };
  }

  async getWorkScheduleSummary(): Promise<WorkScheduleSummary> {
    return this.http.request<WorkScheduleSummary>(this.http.url(`${API_PATHS.workSchedules}/summary`, this.http.params()));
  }

  async getWorkSchedule(employeeId: number, workScheduleId: number): Promise<WorkSchedule> {
    const [schedule, employees] = await Promise.all([
      this.http.request<WorkScheduleResponse>(this.http.url(schedulePath(employeeId, workScheduleId), this.http.params())),
      this.employees.listEmployees(),
    ]);
    return withEmployee(schedule, employees);
  }

  async listContractWorkSchedules(contractId: number): Promise<WorkSchedule[]> {
    const params = this.http.params({ contractId: String(contractId), page: '0', size: '20', sort: 'startDate,desc' });
    const page = await this.http.request<{ content: WorkScheduleResponse[] }>(this.http.url(API_PATHS.workSchedules, params));
    return page.content.map(schedule => withEmployee(schedule, []));
  }

  /** A schedule is always configured inside one of the employee's contracts. */
  async createWorkSchedule(employeeId: number, contractId: number, input: SaveWorkSchedule): Promise<WorkSchedule> {
    const schedule = await this.http.request<WorkScheduleResponse>(this.http.url(`${contractPath(employeeId, contractId)}${API_PATHS.workSchedules}`), {
      method: 'POST', body: JSON.stringify(this.http.withBusiness(input)),
    });
    return withEmployee(schedule, []);
  }

  async updateWorkSchedule(employeeId: number, workScheduleId: number, input: SaveWorkSchedule): Promise<WorkSchedule> {
    const schedule = await this.http.request<WorkScheduleResponse>(this.http.url(schedulePath(employeeId, workScheduleId), this.http.params()), {
      method: 'PATCH', body: JSON.stringify(input),
    });
    return withEmployee(schedule, []);
  }

  async deactivateWorkSchedule(employeeId: number, workScheduleId: number): Promise<WorkSchedule> {
    const schedule = await this.http.request<WorkScheduleResponse>(
      this.http.url(`${schedulePath(employeeId, workScheduleId)}/deactivation`, this.http.params()), { method: 'POST' });
    return withEmployee(schedule, []);
  }
}

/** `/employees/{employeeId}/work-schedules/{workScheduleId}` */
function schedulePath(employeeId: number, workScheduleId: number): string {
  return `${API_PATHS.employees}/${employeeId}${API_PATHS.workSchedules}/${workScheduleId}`;
}

function withEmployee(schedule: WorkScheduleResponse, employees: EmployeeOption[]): WorkSchedule {
  const employee = employees.find(item => item.id === schedule.employeeId);
  return {
    ...schedule,
    employeeName: employee ? `${employee.firstName} ${employee.lastName}` : `Empleado #${schedule.employeeId}`,
    employeeRole: employee?.role ?? null,
  };
}
