import { inject, Injectable } from '@angular/core';
import { API_PATHS } from '../../shared/infrastructure/api.config';
import { EmployeeOption } from '../domain/contract.entity';
import { CreateEmployee, Employee } from '../domain/employee.entity';
import { HcmHttpClient } from './hcm-http.client';

@Injectable({ providedIn: 'root' })
export class EmployeesApi {
  private readonly http = inject(HcmHttpClient);

  /** Active employees, sorted by surname, to pick one in a form or to show names next to contracts and schedules. */
  async listEmployees(): Promise<EmployeeOption[]> {
    // Names live in the staff profile, not in the employees table, so the backend can only sort by id.
    const params = this.http.params({ status: 'ACTIVE', page: '0', size: '100', sort: 'id,asc' });
    const employees = (await this.http.request<{ content: EmployeeOption[] }>(this.http.url(API_PATHS.employees, params))).content;
    return [...employees].sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'es'));
  }

  /** Every employee of the business, whatever their status, for the employees list. */
  async listAllEmployees(): Promise<Employee[]> {
    const params = this.http.params({ page: '0', size: '200', sort: 'id,desc' });
    return (await this.http.request<{ content: Employee[] }>(this.http.url(API_PATHS.employees, params))).content;
  }

  async createEmployee(input: CreateEmployee): Promise<Employee> {
    return this.http.request<Employee>(this.http.url(API_PATHS.employees), {
      method: 'POST', body: JSON.stringify(this.http.withBusiness(input)),
    });
  }
}
